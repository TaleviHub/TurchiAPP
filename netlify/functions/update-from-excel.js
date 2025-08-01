// Versione Definitiva: con nome tabella corretto e diagnostica

const xlsx = require('xlsx');

exports.handler = async (event, context) => {
  console.log("--- Funzione invocata (v. con Nome Tabella Corretto) ---");

  try {
    const { createClient } = require('@supabase/supabase-js');
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Variabili d'ambiente Supabase non trovate.");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log("Client Supabase inizializzato.");

    // --- NOME TABELLA CORRETTO ---
    const NOME_TABELLA = "TaleviTurchi";
    // -----------------------------

    const NOME_FOGLIO = "Foglio1 (4)";
    
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Metodo non consentito' }) };
    }

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

    const righeRaw = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const indiceIntestazioni = righeRaw.findIndex(riga => riga && riga.includes('PROG'));
    if (indiceIntestazioni === -1) {
      throw new Error("Riga delle intestazioni con 'PROG' non trovata.");
    }
    
    const datiRaw = righeRaw.slice(indiceIntestazioni + 2);

    const datiFiltrati = datiRaw
      .filter(rigaArray => rigaArray && rigaArray[0] !== undefined && rigaArray[0] !== null)
      .map(rigaArray => ({
          prog: rigaArray[0], motrice: rigaArray[1], rimorchio: rigaArray[2],
          cliente: rigaArray[3], trasportatore: rigaArray[4], aci: rigaArray[6],
          sigillo: rigaArray[9], note: rigaArray[12] || null
      }));

    if (datiFiltrati.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: `Nessun dato valido trovato nel file.` }) };
    }

    console.log("Dati pronti per essere inseriti:", datiFiltrati[0]);

    // Usiamo il nome corretto della tabella
    await supabase.from(NOME_TABELLA).delete().neq('id', -1);
    console.log(`Cancellazione completata dalla tabella: ${NOME_TABELLA}`);

    // Usiamo il nome corretto della tabella
    const { error: insertError } = await supabase.from(NOME_TABELLA).insert(datiFiltrati);
    if (insertError) throw insertError;
    console.log(`Inserimento completato nella tabella: ${NOME_TABELLA}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Dati aggiornati con successo. ${datiFiltrati.length} righe inserite.` }),
    };

  } catch (error) {
    console.error('ERRORE CRITICO NELLA FUNZIONE:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
