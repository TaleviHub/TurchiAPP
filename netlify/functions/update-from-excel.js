// Versione Definitiva: Lettura manuale per massima affidabilità

const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- CONFIGURAZIONE SPECIFICA PER IL TUO FILE ---
const NOME_FOGLIO = "Foglio1 (4)";
// Mettiamo qui i nomi ESATTI delle colonne che vogliamo, così come sono scritte nel file Excel
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
      throw new Error(`Foglio di lavoro "${NOME_FOGLIO}" non trovato.`);
    }

    // --- NUOVA LOGICA DI LETTURA MANUALE ---
    // Convertiamo tutto il foglio in un array di array (una griglia)
    const righeRaw = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Troviamo l'indice della riga che contiene le nostre intestazioni (es. 'PROG')
    const indiceIntestazioni = righeRaw.findIndex(riga => riga.includes('PROG'));
    if (indiceIntestazioni === -1) {
      throw new Error("Riga delle intestazioni non trovata. Assicurati che la colonna 'PROG' esista.");
    }

    // Estraiamo le intestazioni e le puliamo da spazi bianchi
    const intestazioni = righeRaw[indiceIntestazioni].map(h => typeof h === 'string' ? h.trim() : h);
    
    // I dati iniziano due righe dopo le intestazioni (saltando la riga vuota)
    const datiRaw = righeRaw.slice(indiceIntestazioni + 2);

    // Convertiamo le righe di dati in oggetti JSON
    const jsonData = datiRaw
      .filter(rigaArray => rigaArray.length > 0 && rigaArray[0] !== undefined) // Filtra righe completamente vuote
      .map(rigaArray => {
        const obj = {};
        intestazioni.forEach((intestazione, i) => {
          if (intestazione) { // Ignora colonne senza intestazione
            obj[intestazione] = rigaArray[i];
          }
        });
        return obj;
    });
    // --- FINE NUOVA LOGICA ---

    if (jsonData.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: `Nessun dato trovato dopo le intestazioni.` }) };
    }
    
    const datiFiltrati = jsonData.map(riga => {
        const nuovaRiga = {};
        COLONNE_DESIDERATE.forEach(nomeColonnaExcel => {
            const nomeColonnaSupabase = nomeColonnaExcel.replace(/ /g, '_').toLowerCase();
            // Usiamo il nome originale (con maiuscole) per leggere dalla riga
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
