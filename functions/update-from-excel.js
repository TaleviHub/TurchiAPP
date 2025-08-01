// Questo file va salvato nella cartella `netlify/functions/update-from-excel.js`
// Devi installare le dipendenze: npm install node-fetch xlsx @supabase/supabase-js

const fetch = require('node-fetch');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Carica le variabili d'ambiente (da impostare nella UI di Netlify)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- MODIFICA QUI ---
// Inserisci in questa lista i nomi esatti delle colonne che vuoi importare.
// I nomi devono corrispondere alle intestazioni del tuo file Excel.
const colonneDesiderate = ['Nome', 'Quantità', 'Prezzo_Unitario', 'Stato']; // Esempio

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Metodo non consentito' }) };
  }

  try {
    const { oneDriveLink } = JSON.parse(event.body);
    if (!oneDriveLink) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Link di OneDrive mancante' }) };
    }

    const base64Url = Buffer.from(oneDriveLink, 'utf-8').toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const apiUrl = `https://graph.microsoft.com/v1.0/shares/u!${base64Url}/driveItem/content`;

    const fileResponse = await fetch(apiUrl);
    if (!fileResponse.ok) {
      throw new Error(`Impossibile scaricare il file da OneDrive. Status: ${fileResponse.statusText}`);
    }
    const fileBuffer = await fileResponse.buffer();

    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Il file Excel sembra essere vuoto.' }) };
    }
    
    // --- NUOVA LOGICA PER FILTRARE LE COLONNE ---
    const datiFiltrati = jsonData.map(riga => {
        const nuovaRiga = {};
        colonneDesiderate.forEach(nomeColonna => {
            if (riga[nomeColonna] !== undefined) {
                // Sostituisce gli spazi nei nomi delle colonne con underscore per Supabase
                const nomeColonnaSupabase = nomeColonna.replace(/ /g, '_');
                nuovaRiga[nomeColonnaSupabase] = riga[nomeColonna];
            }
        });
        return nuovaRiga;
    });


    const { error: deleteError } = await supabase
      .from('dati_tabella')
      .delete()
      .neq('id', -1); 

    if (deleteError) throw deleteError;

    // Inserisce i dati filtrati
    const { error: insertError } = await supabase
      .from('dati_tabella')
      .insert(datiFiltrati);

    if (insertError) throw insertError;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Dati aggiornati con successo. ${datiFiltrati.length} righe inserite.` }),
    };

  } catch (error) {
    console.error('Errore nella funzione Netlify:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
