// Versione FINALE: con diagnostica avanzata per loggare il contenuto del file

const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- CONFIGURAZIONE SPECIFICA PER IL TUO FILE ---
const NOME_FOGLIO = "Foglio1 (4)";
const COLONNE_DESIDERATE = [
  'PROG', 'MOTRICE', 'RIMORCHIO', 'CLIENTE', 
  'TRASPORTATORE', 'ACI', 'Sigillo', 'NOTE'
];
// ----------------------------------------------------

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Metodo non consentito' }) };
  }

  try {
    const { file: base64File } = JSON.parse(event.body);
    if (!base64File) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Nessun file ricevuto.' }) };
    }

    const fileBuffer = Buffer.from(base64File, 'base64');
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    
    const worksheet = workbook.Sheets[NOME_FOGLIO];
    if (!worksheet) {
      throw new Error(`Foglio di lavoro "${NOME_FOGLIO}" non trovato. Fogli disponibili: [${workbook.SheetNames.join(", ")}]`);
    }

    // Aggiungiamo l'opzione { range: 1 } per saltare la prima riga
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { range: 1 });

    if (jsonData.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: `Il foglio "${NOME_FOGLIO}" sembra essere vuoto o non contiene dati validi.` }) };
    }
    
    // --- DIAGNOSTICA AVANZATA ---
    // Questo ci mostrerà i nomi esatti delle colonne che la libreria sta leggendo
    console.log("--- INIZIO DIAGNOSTICA FILE ---");
    console.log("Intestazioni trovate (dopo aver saltato la prima riga):", Object.keys(jsonData[0]));
    console.log("Contenuto della prima riga di dati letta:", jsonData[0]);
    console.log("--- FINE DIAGNOSTICA FILE ---");
    // -----------------------------
    
    const datiFiltrati = jsonData.map(riga => {
        const nuovaRiga = {};
        COLONNE_DESIDERATE.forEach(nomeColonnaExcel => {
            const nomeColonnaSupabase = nomeColonnaExcel.replace(/ /g, '_').toLowerCase();
            nuovaRiga[nomeColonnaSupabase] = riga[nomeColonnaExcel] !== undefined ? riga[nomeColonnaExcel] : null;
        });
        return nuovaRiga;
    });

    await supabase.from('dati_tabella').delete().neq('id', -1);
    await supabase.from('dati_tabella').insert(datiFiltrati);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Dati aggiornati con successo. ${datiFiltrati.length} righe inserite.` }),
    };

  } catch (error) {
    console.error('ERRORE NELLA FUNZIONE:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
