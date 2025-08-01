// Versione Definitiva: con diagnostica avanzata per massima affidabilità

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
      throw new Error(`Foglio di lavoro "${NOME_FOGLIO}" non trovato.`);
    }

    // --- LOGICA DI LETTURA MANUALE ---
    const righeRaw = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const indiceIntestazioni = righeRaw.findIndex(riga => riga.includes('PROG'));
    if (indiceIntestazioni === -1) {
      throw new Error("Riga delle intestazioni con 'PROG' non trovata.");
    }
    const intestazioni = righeRaw[indiceIntestazioni].map(h => typeof h === 'string' ? h.trim() : h);
    const datiRaw = righeRaw.slice(indiceIntestazioni + 2);
    const jsonData = datiRaw.map(rigaArray => {
      const obj = {};
      intestazioni.forEach((intestazione, i) => {
        if (intestazione) { obj[intestazione] = rigaArray[i]; }
      });
      return obj;
    });
    // --- FINE LOGICA ---

    // --- DIAGNOSTICA AVANZATA ---
    console.log("--- INIZIO DIAGNOSTICA FILE ---");
    console.log("Intestazioni lette e pulite:", intestazioni);
    if (jsonData.length > 0) {
      console.log("Contenuto della prima riga di dati elaborata:", jsonData[0]);
    } else {
      console.log("Nessuna riga di dati trovata dopo le intestazioni.");
    }
    console.log("--- FINE DIAGNOSTICA FILE ---");
    // -----------------------------

    if (jsonData.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: `Nessun dato trovato dopo le intestazioni.` }) };
    }
    
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
