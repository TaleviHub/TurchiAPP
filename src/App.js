// Versione FINALE con vista mobile avanzata, modal e arrotondamento

import React, { useState, useEffect, useCallback } from 'react';

// --- CONFIGURAZIONE SUPABASE ---
const SUPABASE_URL = 'https://vxbmwulmzmqmymqoxzjj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Ym13dWxtem1xbXltcW94empqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NzQ3MzksImV4cCI6MjA2OTU1MDczOX0.9fU10_IpN0cNcjHmX9OQ1HLtdU1da-8nJ-LgvRWk7N4';
const NOME_TABELLA = 'TaleviTurchi';

const COLONNE_DA_VISUALIZZARE = [
  { key: 'prog', label: 'Prog', minWidth: '5rem', editable: false }, 
  { key: 'motrice', label: 'Motrice', minWidth: '10rem', editable: false },
  { key: 'rimorchio', label: 'Rimorchio', minWidth: '10rem', editable: false }, 
  { key: 'cliente', label: 'Cliente', minWidth: '12rem', editable: true },
  { key: 'trasportatore', label: 'Trasportatore', minWidth: '10rem', editable: true }, 
  { key: 'aci', label: 'ACI', minWidth: '6rem', editable: true },
  { key: 'sigillo', label: 'Sigillo', minWidth: '10rem', editable: true }, 
  { key: 'note', label: 'Note', minWidth: '20rem', editable: true },
];

// Componente per la finestra Modale
const DetailModal = ({ rowData, onClose }) => {
  if (!rowData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Dettaglio Camion: Prog {rowData.prog}</h2>
          <div className="space-y-4">
            {COLONNE_DA_VISUALIZZARE.map(col => (
              <div key={col.key} className="border-b border-gray-700 pb-2">
                <p className="text-sm text-gray-400 uppercase tracking-wider">{col.label}</p>
                <p className="text-lg text-white font-medium">{String(rowData[col.key] || 'N/D')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [isUpdateUIVisible, setIsUpdateUIVisible] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(
    COLONNE_DA_VISUALIZZARE.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );
  const [selectedRow, setSelectedRow] = useState(null); // Stato per la riga selezionata nel modal

  const handleColumnVisibilityChange = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchData = useCallback(async (client) => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const { data: tableData, error } = await client.from(NOME_TABELLA).select('*').order('prog', { ascending: true });
      if (error) throw error;
      setData(tableData || []);
    } catch (err) {
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
    
    const getBase64 = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });

    try {
      const base64File = await getBase64(selectedFile);
      const response = await fetch('/.netlify/functions/update-from-excel', {
        method: 'POST',
        body: JSON.stringify({ file: base64File }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Errore sconosciuto dal server.');
      document.getElementById('file-input').value = "";
      setSelectedFile(null); 
      setIsUpdateUIVisible(false);
    } catch (err) {
      setError(`Errore: ${err.message}`);
    } finally {
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

  const getStickyClass = (index) => {
    if (index === 0) return 'sticky left-0 z-10';
    if (index === 1) return 'sticky left-[5rem] z-10';
    if (index === 2) return 'sticky left-[15rem] z-10';
    return '';
  };

  return (
    <>
      <DetailModal rowData={selectedRow} onClose={() => setSelectedRow(null)} />
      <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 flex justify-between items-start gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">Talevi & Turchi Dashboard</h1>
              <p className="text-gray-400 mt-2">Dati aggiornati in tempo reale.</p>
            </div>
            {!isUpdateUIVisible && (
              <button onClick={() => setIsUpdateUIVisible(true)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center gap-2 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V4a1 1 0 011-1zm10.899 10.899a7.002 7.002 0 01-11.601-2.566 1 1 0 111.885-.666A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101z" clipRule="evenodd" /></svg>
                  Aggiorna Dati
              </button>
            )}
          </header>

          <div className="sm:hidden mb-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <p className="font-semibold mb-2 text-white">Mostra/Nascondi Colonne:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {COLONNE_DA_VISUALIZZARE.map(col => (
                <label key={col.key} className="flex items-center space-x-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={visibleColumns[col.key]} onChange={() => handleColumnVisibilityChange(col.key)} className="form-checkbox h-4 w-4 rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"/>
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* --- CODICE CORRETTO PER LA UI DI AGGIORNAMENTO --- */}
          {isUpdateUIVisible && (
            <div className="bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-700 shadow-lg animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Aggiorna Dati da File Excel</h2>
                <button onClick={() => setIsUpdateUIVisible(false)} className="text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <input id="file-input" type="file" onChange={handleFileChange} accept=".xlsx, .xls" className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 text-gray-400" />
                <button onClick={handleUpdateFromFile} disabled={isUpdating || !selectedFile} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-md transition duration-300 ease-in-out flex items-center justify-center disabled:bg-indigo-800 disabled:cursor-not-allowed">
                  {isUpdating ? 'Sincronizzando...' : 'Sincronizza'}
                </button>
              </div>
              {error && <p className="text-red-400 mt-4">{error}</p>}
            </div>
          )}
          
          <div className="overflow-x-auto rounded-lg border border-gray-700 shadow-lg snap-x snap-mandatory">
            {loading ? (<p className="p-8 text-center text-gray-400">Inizializzazione database...</p>) : (
              <table className="min-w-full text-base text-left text-gray-300">
                <thead className="text-sm text-gray-200 uppercase tracking-wider">
                  <tr>
                    {COLONNE_DA_VISUALIZZARE.map((col, index) => {
                      const isVisible = visibleColumns[col.key];
                      const bgHeaderClass = index < 3 ? 'bg-gray-800' : 'bg-gray-700/50';
                      return (
                        <th key={col.key} scope="col" className={`px-6 py-4 font-semibold snap-start ${getStickyClass(index)} ${bgHeaderClass} ${!isVisible ? 'hidden' : ''} sm:table-cell`} style={{minWidth: col.minWidth}}>
                          <div className="flex items-center gap-2">
                            {col.label}
                            {!col.editable && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIndex) => (
                    <tr key={row.id} className={`transition hover:bg-gray-700/40`}>
                      {COLONNE_DA_VISUALIZZARE.map((col, colIndex) => {
                        const isVisible = visibleColumns[col.key];
                        const bgCellClass = colIndex < 3 ? (rowIndex % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/80') : (rowIndex % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-800/20');
                        const isClickable = (col.key === 'motrice' || col.key === 'rimorchio');
                        
                        return (
                          <td key={`${row.id}-${col.key}`} 
                              className={`px-6 py-4 border-b border-gray-700 whitespace-nowrap snap-start ${getStickyClass(colIndex)} ${bgCellClass} ${!isVisible ? 'hidden' : ''} sm:table-cell ${isClickable ? 'cursor-pointer hover:text-indigo-400' : ''}`} 
                              contentEditable={col.editable} 
                              suppressContentEditableWarning={true} 
                              onClick={() => isClickable && setSelectedRow(row)}
                              onBlur={(e) => {if (col.editable && e.currentTarget.textContent !== String(row[col.key] || '')) {handleCellUpdate(row.id, col.key, e.currentTarget.textContent);}}}>
                            {String(row[col.key] || '')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
             {data.length === 0 && !loading && (<p className="p-8 text-center text-gray-400">Nessun dato da visualizzare.</p>)}
          </div>
          <footer className="text-center text-gray-500 mt-8 text-sm"><p>Realizzato con React, Netlify & Supabase</p></footer>
        </div>
      </div>
    </>
  );
}
