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

    // --- DIAGNOSTICA AVANZATA ---
    console.log("--- INIZIO DIAGNOSTICA FILE ---");
    console.log("Fogli trovati nel file:", workbook.SheetNames);
    
    const worksheet = workbook.Sheets[NOME_FOGLIO];
    if (!worksheet) {
      throw new Error(`Foglio di lavoro "${NOME_FOGLIO}" non trovato. Fogli disponibili: [${workbook.SheetNames.join(", ")}]`);
    }
    console.log(`Foglio "${NOME_FOGLIO}" trovato correttamente.`);

    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: `Il foglio "${NOME_FOGLIO}" sembra essere vuoto.` }) };
    }
    
    console.log("Intestazioni trovate nella prima riga:", Object.keys(jsonData[0]));
    console.log("Contenuto della prima riga di dati:", jsonData[0]);
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
