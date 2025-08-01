// Questo codice funziona importando le librerie da un CDN in modo dinamico.
// Non è necessaria un'installazione manuale con npm.

import React, { useState, useEffect, useCallback } from 'react';

// --- CONFIGURAZIONE SUPABASE ---
// Questi valori li trovi nella dashboard del tuo progetto Supabase
// in "Project Settings" > "API".
const SUPABASE_URL = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Ym13dWxtem1xbXltcW94empqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NzQ3MzksImV4cCI6MjA2OTU1MDczOX0.9fU10_IpN0cNcjHmX9OQ1HLtdU1da-8nJ-LgvRWk7N4;
const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Ym13dWxtem1xbXltcW94empqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzk3NDczOSwiZXhwIjoyMDY5NTUwNzM5fQ.2KUA-iertK-U-5nmrmg-Rf5-q4nPQ6B3wLHpKW8TksE;

// --- COMPONENTE PRINCIPALE DELL'APP ---
export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [link, setLink] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [isUpdateUIVisible, setIsUpdateUIVisible] = useState(false); // Nuovo stato per controllare la visibilità della UI di aggiornamento

  // Funzione per caricare i dati iniziali dal database
  const fetchData = useCallback(async (client) => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const { data: tableData, error } = await client
        .from('dati_tabella') // Il nome della tua tabella su Supabase
        .select('*')
        .order('id', { ascending: true }); // Ordiniamo per ID

      if (error) throw error;
      setData(tableData || []);
    } catch (err) {
      console.error("Errore nel caricamento dati:", err);
      setError('Impossibile caricare i dati dal database.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Funzione per gestire l'aggiornamento di una cella
  const handleCellUpdate = async (id, column, value) => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient
        .from('dati_tabella')
        .update({ [column]: value })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error("Errore nell'aggiornamento della cella:", err);
    }
  };
  
  // Funzione per avviare l'aggiornamento dal link Excel
  const handleUpdateFromExcel = async () => {
    if (!link) {
      setError('Per favore, inserisci un link di condivisione di OneDrive.');
      return;
    }
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/update-from-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oneDriveLink: link }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore sconosciuto dal server.');
      }
      
      setLink(''); 
      setIsUpdateUIVisible(false); // Nasconde la UI dopo l'aggiornamento
    } catch (err) {
      console.error("Errore durante l'aggiornamento da Excel:", err);
      setError(`Errore: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // useEffect per inizializzare Supabase dinamicamente
  useEffect(() => {
    import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')
      .then(({ createClient }) => {
        const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setSupabaseClient(client);
      })
      .catch(err => {
        console.error("Errore nell'import dinamico di Supabase:", err);
        setError("Impossibile caricare la libreria del database.");
      });
  }, []);

  // useEffect per caricare i dati e ascoltare gli aggiornamenti
  useEffect(() => {
    if (supabaseClient) {
      fetchData(supabaseClient);

      const channel = supabaseClient
        .channel('dati_tabella_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'dati_tabella' },
          (payload) => {
            fetchData(supabaseClient);
          }
        )
        .subscribe();

      return () => {
        supabaseClient.removeChannel(channel);
      };
    }
  }, [supabaseClient, fetchData]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* --- INTESTAZIONE --- */}
        <header className="mb-8 flex justify-between items-start gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Dashboard Dati Dinamica</h1>
            <p className="text-gray-400 mt-2">Dati aggiornati in tempo reale. Clicca il pulsante per sincronizzare da un file Excel.</p>
          </div>
          {!isUpdateUIVisible && (
             <button
                onClick={() => setIsUpdateUIVisible(true)}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center gap-2 shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V4a1 1 0 011-1zm10.899 10.899a7.002 7.002 0 01-11.601-2.566 1 1 0 111.885-.666A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101z" clipRule="evenodd" />
                </svg>
                Aggiorna Dati
              </button>
          )}
        </header>

        {/* --- SEZIONE DI AGGIORNAMENTO (VISIBILE CONDIZIONALMENTE) --- */}
        {isUpdateUIVisible && (
          <div className="bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-700 shadow-lg animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Aggiorna Dati da Excel</h2>
              <button onClick={() => setIsUpdateUIVisible(false)} className="text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Incolla qui il link di condivisione di OneDrive..."
                className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                disabled={isUpdating}
              />
              <button
                onClick={handleUpdateFromExcel}
                disabled={isUpdating || !supabaseClient}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-md transition duration-300 ease-in-out flex items-center justify-center disabled:bg-indigo-800 disabled:cursor-not-allowed"
              >
                {isUpdating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sincronizzando...
                  </>
                ) : 'Sincronizza'}
              </button>
            </div>
            {error && <p className="text-red-400 mt-4">{error}</p>}
          </div>
        )}

        {/* --- TABELLA DEI DATI --- */}
        <div className="overflow-x-auto bg-gray-800/50 rounded-lg border border-gray-700 shadow-lg">
          {loading ? (
            <p className="p-6 text-center text-gray-400">Caricamento dati in corso...</p>
          ) : (
            <table className="min-w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-700/50 text-xs text-gray-300 uppercase tracking-wider">
                <tr>
                  {data.length > 0 && Object.keys(data[0]).map(key => (
                    <th key={key} scope="col" className="px-6 py-3 font-medium">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition">
                    {Object.entries(row).map(([key, value]) => (
                      <td 
                        key={`${row.id}-${key}`}
                        className="px-6 py-4 whitespace-nowrap"
                        contentEditable={key !== 'id'}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => {
                          if (e.currentTarget.textContent !== String(value)) {
                            handleCellUpdate(row.id, key, e.currentTarget.textContent);
                          }
                        }}
                      >
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
           {data.length === 0 && !loading && (
              <p className="p-6 text-center text-gray-400">Nessun dato da visualizzare. Prova ad aggiornare i dati da un file Excel.</p>
           )}
        </div>
        
        {/* --- PIÈ DI PAGINA --- */}
        <footer className="text-center text-gray-500 mt-8 text-sm">
          <p>Realizzato con React, Netlify & Supabase</p>
        </footer>
      </div>
    </div>
  );
}
