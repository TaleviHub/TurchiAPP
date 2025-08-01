// Versione robusta con import dinamico e logging avanzato

const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const colonneDesiderate = ['prog', 'Motrice', 'Rimorchio', 'Cliente','Trasportatore','ACI','Sigillo','Note']; // Esempio

exports.handler = async (event, context) => {
  console.log("--- Funzione 'update-from-excel' invocata ---");

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

    const base64Url = Buffer.from(oneDriveLink, 'utf-8').toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const apiUrl = `https://graph.microsoft.com/v1.0/shares/u!${base64Url}/driveItem/content`;
    
    const fileResponse = await fetch(apiUrl);
    console.log("Risposta da API Graph. Status:", fileResponse.status);
    if (!fileResponse.ok) {
      throw new Error(`Impossibile scaricare il file da OneDrive. Status: ${fileResponse.statusText}`);
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
