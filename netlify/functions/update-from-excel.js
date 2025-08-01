// Versione robusta con metodo di download diretto e logging avanzato

const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// MODIFICA QUI: Metti i nomi delle colonne che vuoi importare
const colonneDesiderate = ['Nome', 'Quantità', 'Prezzo_Unitario', 'Stato']; // Esempio

exports.handler = async (event, context) => {
  console.log("--- Funzione 'update-from-excel' invocata (v2 - Download Diretto) ---");

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Metodo non consentito' }) };
  }

  // Import dinamico di node-fetch per massima compatibilità
  const fetch = (await import('node-fetch')).default;
  console.log("Libreria node-fetch importata.");

  try {
    const { oneDriveLink } = JSON.parse(event.body);
    if (!oneDriveLink) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Link di OneDrive mancante' }) };
    }
    console.log("Link ricevuto:", oneDriveLink);

    // --- NUOVA LOGICA DI DOWNLOAD ---
    // Tentiamo di creare un link di download diretto aggiungendo &download=1
    // Questo è spesso più affidabile dell'API Graph per link pubblici.
    const directDownloadLink = `${oneDriveLink}&download=1`;
    console.log("Tento il download diretto da:", directDownloadLink);
    
    const fileResponse = await fetch(directDownloadLink);
    console.log("Risposta dal server di download. Status:", fileResponse.status);

    if (!fileResponse.ok) {
      throw new Error(`Impossibile scaricare il file da OneDrive. Status: ${fileResponse.statusText}. Assicurati che il link sia pubblico e corretto.`);
    }
    const fileBuffer = await fileResponse.buffer();
    console.log("File scaricato. Dimensione:", fileBuffer.byteLength);

    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    console.log(jsonData.length, "righe trovate nel file Excel.");

    if (jsonData.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Il file Excel sembra essere vuoto.' }) };
    }
    
    const datiFiltrati = jsonData.map(riga => {
        const nuovaRiga = {};
        colonneDesiderate.forEach(nomeColonna => {
            if (riga[nomeColonna] !== undefined) {
                const nomeColonnaSupabase = nomeColonna.replace(/ /g, '_');
                nuovaRiga[nomeColonnaSupabase] = riga[nomeColonna];
            }
        });
        return nuovaRiga;
    });

    console.log("Cancellazione dei vecchi dati...");
    const { error: deleteError } = await supabase.from('dati_tabella').delete().neq('id', -1); 
    if (deleteError) throw deleteError;
    console.log("Vecchi dati cancellati.");

    console.log("Inserimento dei nuovi dati...");
    const { error: insertError } = await supabase.from('dati_tabella').insert(datiFiltrati);
    if (insertError) throw insertError;
    console.log("Nuovi dati inseriti.");

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Dati aggiornati con successo. ${datiFiltrati.length} righe inserite.` }),
    };

  } catch (error) {
    console.error('--- ERRORE CRITICO NELLA FUNZIONE ---:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
