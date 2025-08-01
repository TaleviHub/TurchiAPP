// Versione FINALE: Legge un foglio specifico e colonne specifiche

const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- CONFIGURAZIONE SPECIFICA PER IL TUO FILE ---
// 1. Inserisci qui il nome esatto del foglio Excel da leggere
const NOME_FOGLIO = "Foglio 1(4)"; // Lasciamo questo per ora, lo correggeremo se necessario

// 2. Inserisci qui i nomi esatti delle colonne che vuoi importare
const COLONNE_DESIDERATE = [
  'Prog',
  'Motrice',
  'Rimorchio',
  'Cliente',
  'Trasportatore',
  'ACI',
  'Sigillo',
  'Note'
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

    // --- NUOVO CODICE DI DEBUG ---
    // Stampiamo nei log tutti i nomi dei fogli trovati nel file
    console.log("Fogli trovati nel file:", workbook.SheetNames);
    // -----------------------------

    // Cerca il foglio specifico per nome
    const worksheet = workbook.Sheets[NOME_FOGLIO];
    if (!worksheet) {
      // Restituiamo un errore più dettagliato
      throw new Error(`Foglio di lavoro "${NOME_FOGLIO}" non trovato. Fogli disponibili: [${workbook.SheetNames.join(", ")}]`);
    }

    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: `Il foglio "${NOME_FOGLIO}" sembra essere vuoto.` }) };
    }
    
    // Filtra i dati per includere solo le colonne desiderate
    const datiFiltrati = jsonData.map(riga => {
        const nuovaRiga = {};
        COLONNE_DESIDERATE.forEach(nomeColonna => {
            const nomeColonnaSupabase = nomeColonna.replace(/ /g, '_');
            nuovaRiga[nomeColonnaSupabase] = riga[nomeColonna] !== undefined ? riga[nomeColonna] : null;
        });
        return nuovaRiga;
    });

    // Svuota la tabella prima di inserire i nuovi dati
    const { error: deleteError } = await supabase.from('dati_tabella').delete().neq('id', -1);
    if (deleteError) throw deleteError;

    // Inserisce i nuovi dati filtrati
    const { error: insertError } = await supabase.from('dati_tabella').insert(datiFiltrati);
    if (insertError) throw insertError;

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
