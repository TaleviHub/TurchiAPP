// Versione FINALE con grafica e layout aggiornati

import React, { useState, useEffect, useCallback } from 'react';

// --- CONFIGURAZIONE SUPABASE ---
// Assicurati che questi valori siano corretti!
const SUPABASE_URL = 'https://vxbmwulmzmqmymqoxzjj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Ym13dWxtem1xbXltcW94empqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NzQ3MzksImV4cCI6MjA2OTU1MDczOX0.9fU10_IpN0cNcjHmX9OQ1HLtdU1da-8nJ-LgvRWk7N4';
const NOME_TABELLA = 'TaleviTurchi'; // Nuovo nome della tabella

// Definiamo l'ordine e i nomi delle colonne da visualizzare
const COLONNE_DA_VISUALIZZARE = [
  { key: 'prog', label: 'Prog' },
  { key: 'motrice', label: 'Motrice' },
  { key: 'rimorchio', label: 'Rimorchio' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'trasportatore', label: 'Trasportatore' },
  { key: 'aci', label: 'ACI' },
  { key: 'sigillo', label: 'Sigillo' },
  { key: 'note', label: 'Note' },
];

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [isUpdateUIVisible, setIsUpdateUIVisible] = useState(false);

  const fetchData = useCallback(async (client) => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const { data: tableData, error } = await client.from(NOME_TABELLA).select('*').order('prog', { ascending: true });
      if (error) throw error;
      setData(tableData || []);
    } catch (err) {
      console.error("Errore nel caricamento dati:", err);
      setError('Impossibile caricare i dati dal database.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCellUpdate = async (id, column, value) => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient.from(NOME_TABELLA).update({ [column]: value }).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Errore nell'aggiornamento della cella:", err);
    }
  };
  
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpdateFromFile = async () => {
    if (!selectedFile) {
      setError('Per favore, seleziona un file Excel.');
      return;
    }
    setIsUpdating(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64File = reader.result.split(',')[1];
        const response = await fetch('/.netlify/functions/update-from-excel', {
          method: 'POST',
          body: JSON.stringify({ file: base64File }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Errore sconosciuto dal server.');
        setSelectedFile(null); 
        setIsUpdateUIVisible(false);
        setIsUpdating(false);
      };
      reader.onerror = () => { throw new Error("Errore nella lettura del file."); };
    } catch (err) {
      console.error("Errore durante l'aggiornamento da Excel:", err);
      setError(`Errore: ${err.message}`);
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    script.onload = () => {
      if (window.supabase) {
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setSupabaseClient(client);
      } else { setError("Libreria caricata, ma 'supabase' non trovato."); }
    };
    script.onerror = () => { setError("Impossibile caricare la libreria del database."); };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); }
  }, []);

  useEffect(() => {
    if (supabaseClient) {
      fetchData(supabaseClient);
      const channel = supabaseClient.channel(`realtime:${NOME_TABELLA}`).on('postgres_changes', { event: '*', schema: 'public', table: NOME_TABELLA }, () => { fetchData(supabaseClient); }).subscribe();
      return () => { supabaseClient.removeChannel(channel); };
    }
  }, [supabaseClient, fetchData]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-start gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Talevi & Turchi Dashboard</h1>
            <p className="text-gray-400 mt-2">Dati aggiornati in tempo reale. Clicca il pulsante per sincronizzare da un file Excel.</p>
          </div>
          {!isUpdateUIVisible && (
             <button onClick={() => setIsUpdateUIVisible(true)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center gap-2 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V4a1 1 0 011-1zm10.899 10.899a7.002 7.002 0 01-11.601-2.566 1 1 0 111.885-.666A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101z" clipRule="evenodd" /></svg>
                Aggiorna Dati
              </button>
          )}
        </header>
        {isUpdateUIVisible && (
          <div className="bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-700 shadow-lg animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Aggiorna Dati da File Excel</h2>
              <button onClick={() => setIsUpdateUIVisible(false)} className="text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <input type="file" onChange={handleFileChange} accept=".xlsx, .xls" className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 text-gray-400" />
              <button onClick={handleUpdateFromFile} disabled={isUpdating || !selectedFile} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-md transition duration-300 ease-in-out flex items-center justify-center disabled:bg-indigo-800 disabled:cursor-not-allowed">
                {isUpdating ? (<>...</>) : 'Sincronizza'}
              </button>
            </div>
            {error && <p className="text-red-400 mt-4">{error}</p>}
          </div>
        )}
        <div className="overflow-x-auto bg-gray-800/50 rounded-lg border border-gray-700 shadow-lg">
          {loading ? (<p className="p-8 text-center text-gray-400">Inizializzazione database...</p>) : (
            <table className="min-w-full text-base text-left text-gray-300">
              <thead className="bg-gray-700/50 text-sm text-gray-200 uppercase tracking-wider">
                <tr>
                  {COLONNE_DA_VISUALIZZARE.map(col => (
                    <th key={col.key} scope="col" className={`px-6 py-4 font-semibold ${col.key === 'note' ? 'w-1/3' : ''}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={row.id} className={`border-b border-gray-700 transition ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-800/20'} hover:bg-gray-700/50`}>
                    {COLONNE_DA_VISUALIZZARE.map(col => (
                      <td key={`${row.id}-${col.key}`} className={`px-6 py-4 whitespace-nowrap ${col.key === 'note' ? 'whitespace-normal' : ''}`} contentEditable suppressContentEditableWarning={true} onBlur={(e) => {if (e.currentTarget.textContent !== String(row[col.key] || '')) {handleCellUpdate(row.id, col.key, e.currentTarget.textContent);}}}>
                        {String(row[col.key] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
           {data.length === 0 && !loading && (<p className="p-8 text-center text-gray-400">Nessun dato da visualizzare. Prova ad aggiornare i dati da un file Excel.</p>)}
        </div>
        <footer className="text-center text-gray-500 mt-8 text-sm"><p>Realizzato con React, Netlify & Supabase</p></footer>
      </div>
    </div>
  );
}
