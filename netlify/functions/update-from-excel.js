 const xlsx = require('xlsx');

      exports.handler = async (event, context) => {
        try {
          const { createClient } = require('@supabase/supabase-js');
          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
          if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Variabili d\'ambiente mancanti' }) };
          }
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

          const TABLE = 'TaleviTurchi';
          const SHEET = 'Foglio1 (4)';

          if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Metodo non consentito' }) };
          }

          const { file: base64File } = JSON.parse(event.body || '{}');
          if (!base64File) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Nessun file ricevuto' }) };
          }

          const fileBuffer = Buffer.from(base64File, 'base64');
          const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
          const worksheet = workbook.Sheets[SHEET];
          if (!worksheet) {
            return { statusCode: 400, body: JSON.stringify({ error: `Foglio di lavoro "${SHEET}" non trovato` }) };
          }

          const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
          const headerIdx = rows.findIndex(r => Array.isArray(r) && r.includes('PROG'));
          if (headerIdx === -1) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Intestazioni non trovate (manca PROG)' }) };
          }

          const bodyRows = rows.slice(headerIdx + 2);
          const payload = bodyRows
            .filter(arr => arr && arr[0] != null)
            .map(arr => ({
              prog: arr[0],
              motrice: arr[1],
              rimorchio: arr[2],
              cliente: arr[3],
              trasportatore: arr[4],
              aci: Math.ceil(parseFloat(arr[6]) / 5) * 5 || null,
              sigillo: arr[9],
              note: arr[12] || null,
              completato: false,
            }));

          if (payload.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Nessun dato valido trovato nel file' }) };
          }

          // Sostituisce tutto il contenuto
          await supabase.from(TABLE).delete().neq('id', -1);
          const { error } = await supabase.from(TABLE).insert(payload);
          if (error) {
            return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
          }

          return { statusCode: 200, body: JSON.stringify({ message: `Dati aggiornati. ${payload.length} righe inserite.` }) };
        } catch (e) {
          return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
        }
      };