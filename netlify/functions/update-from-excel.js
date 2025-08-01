// Versione Definitiva: Lettura manuale per posizione esatta delle colonne

const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- CONFIGURAZIONE SPECIFICA PER IL TUO FILE ---
const NOME_FOGLIO = "Foglio1 (4)";
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
      throw new Error(`Foglio di lavoro "${NOME_FOGLIO}" non trovato.`);
    }

    // --- NUOVA LOGICA DI LETTURA PER POSIZIONE ---
    const righeRaw = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    const indiceIntestazioni = righeRaw.findIndex(riga => riga && riga.includes('PROG'));
    if (indiceIntestazioni === -1) {
      throw new Error("Riga delle intestazioni con 'PROG' non trovata.");
    }
    
    // I dati iniziano due righe dopo le intestazioni
    const datiRaw = righeRaw.slice(indiceIntestazioni + 2);

    const datiFiltrati = datiRaw
      // Filtriamo le righe che non hanno un valore nella prima colonna ('PROG')
      .filter(rigaArray => rigaArray && rigaArray[0] !== undefined && rigaArray[0] !== null)
      .map(rigaArray => {
        // Leggiamo i dati in base alla loro posizione esatta nella riga
        return {
          prog: rigaArray[0],          // Colonna 1
          motrice: rigaArray[1],       // Colonna 2
          rimorchio: rigaArray[2],     // Colonna 3
          cliente: rigaArray[3],       // Colonna 4
          trasportatore: rigaArray[4], // Colonna 5
          aci: rigaArray[6],           // Colonna 7
          sigillo: rigaArray[9],       // Colonna 10
          note: rigaArray[12] || null  // Colonna 13, se è vuota mettiamo null
        };
    });
    // --- FINE NUOVA LOGICA ---

    if (datiFiltrati.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: `Nessun dato valido trovato nel file.` }) };
    }

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
