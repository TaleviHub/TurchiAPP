// Versione FINALE: Riceve il file come stringa Base64

const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const colonneDesiderate = ['Nome', 'Quantità', 'Prezzo_Unitario', 'Stato']; // Esempio

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Metodo non consentito' }) };
  }

  try {
    const { file: base64File } = JSON.parse(event.body);
    if (!base64File) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Nessun file ricevuto.' }) };
    }

    // Converte la stringa Base64 in un buffer (dati grezzi)
    const fileBuffer = Buffer.from(base64File, 'base64');

    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

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

    await supabase.from('dati_tabella').delete().neq('id', -1); 
    await supabase.from('dati_tabella').insert(datiFiltrati);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Dati aggiornati con successo.` }),
    };

  } catch (error) {
    console.error('ERRORE NELLA FUNZIONE:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
