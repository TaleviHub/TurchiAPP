// Versione Definitiva: con diagnostica e inizializzazione sicura DENTRO l'handler

const xlsx = require('xlsx');

// NOTA: Non inizializziamo più Supabase qui fuori per massima sicurezza

exports.handler = async (event, context) => {
  // Questo è il primo log in assoluto. Se non vediamo questo, il problema è gravissimo.
  console.log("--- Funzione invocata (versione con init ultra-sicuro) ---");

  try {
    // Spostiamo TUTTO qui dentro per massima sicurezza
    const { createClient } = require('@supabase/supabase-js');

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("ERRORE: Variabili d'ambiente SUPABASE_URL o SUPABASE_SERVICE_KEY non trovate!");
      throw new Error("Configurazione del server incompleta.");
    }
    console.log("Variabili d'ambiente lette correttamente.");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log("Client Supabase inizializzato con successo.");

    // --- CONFIGURAZIONE SPECIFICA PER IL TUO FILE ---
    const NOME_FOGLIO = "Foglio1 (4)";
    const COLONNE_DESIDERATE = [
      'PROG', 'MOTRICE', 'RIMORCHIO', 'CLIENTE', 
      'TRASPORTATORE', 'ACI', 'Sigillo', 'NOTE'
    ];
    // ----------------------------------------------------

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
    const intestazioni = righeRaw[indiceIntestazioni].map(h => typeof h === 'string' ? h.trim() : h);
    
    const columnIndexMap = {};
    COLONNE_DESIDERATE.forEach(nomeColonna => {
      const index = intestazioni.findIndex(h => h === nomeColonna);
      if (index !== -1) {
        columnIndexMap[nomeColonna] = index;
      }
    });
    
    const datiRaw = righeRaw.slice(indiceIntestazioni + 2);
    const datiFiltrati = datiRaw
      .filter(rigaArray => rigaArray && rigaArray[columnIndexMap['PROG']] !== undefined && rigaArray[columnIndexMap['PROG']] !== null)
      .map(rigaArray => {
        const nuovaRiga = {};
        COLONNE_DESIDERATE.forEach(nomeColonnaExcel => {
            const nomeColonnaSupabase = nomeColonnaExcel.replace(/ /g, '_').toLowerCase();
            const colIndex = columnIndexMap[nomeColonnaExcel];
            
            if (colIndex !== undefined) {
              nuovaRiga[nomeColonnaSupabase] = rigaArray[colIndex] !== undefined ? rigaArray[colIndex] : null;
            } else {
              nuovaRiga[nomeColonnaSupabase] = null;
            }
        });
        return nuovaRiga;
    });

    // --- DIAGNOSTICA AVANZATA ---
    console.log("--- INIZIO DIAGNOSTICA FILE ---");
    console.log("Intestazioni lette e pulite:", intestazioni);
    console.log("Mappa degli indici delle colonne creata:", columnIndexMap);
    if (datiFiltrati.length > 0) {
      console.log("Contenuto della prima riga di dati elaborata:", datiFiltrati[0]);
    } else {
      console.log("Nessuna riga di dati valida trovata dopo le intestazioni.");
    }
    console.log("--- FINE DIAGNOSTICA FILE ---");

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
    console.error('ERRORE CRITICO NELLA FUNZIONE:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
