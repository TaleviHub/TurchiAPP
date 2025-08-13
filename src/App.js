// Versione con Checkbox "Completato", Modal Interattivo e Vista Unica Ottimizzata

import React, { useState, useEffect, useCallback } from 'react';

// --- CONFIGURAZIONE ---
const SUPABASE_URL = 'https://vxbmwulmzmqmymqoxzjj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Ym13dWxtem1xbXltcW94empqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NzQ3MzksImV4cCI6MjA2OTU1MDczOX0.9fU10_IpN0cNcjHmX9OQ1HLtdU1da-8nJ-LgvRWk7N4';
const NOME_TABELLA = 'TaleviTurchi';

const ALL_COLUMNS = [
  { key: 'prog', label: 'Prog', minWidth: '5rem', editable: false }, 
  { key: 'motrice', label: 'Motrice', minWidth: '10rem', editable: false },
  { key: 'rimorchio', label: 'Rimorchio', minWidth: '10rem', editable: false }, 
  { key: 'cliente', label: 'Cliente', minWidth: '12rem', editable: true },
  { key: 'trasportatore', label: 'Trasportatore', minWidth: '10rem', editable: true }, 
  { key: 'aci', label: 'ACI', minWidth: '6rem', editable: true },
  { key: 'sigillo', label: 'Sigillo', minWidth: '10rem', editable: true }, 
  { key: 'note', label: 'Note', minWidth: '20rem', editable: true },
];

// --- COMPONENTE MODAL ---
const DetailModal = ({ rowData, onClose, onSaveNote }) => {
  if (!rowData) return null;
  const [note, setNote] = useState(rowData.note || '');
  const handleSave = () => {
    if (note !== (rowData.note || '')) {
      onSaveNote(rowData.id, 'note', note);
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Dettaglio Camion: Prog {rowData.prog}</h2>
          <div className="space-y-4">
            {ALL_COLUMNS.filter(c => c.key !== 'note').map(col => (
              <div key={col.key} className="border-b border-gray-700 pb-2">
                <p className="text-sm text-gray-400 uppercase tracking-wider">{col.label}</p>
                <p className="text-lg text-white font-medium">{String(rowData[col.key] || 'N/D')}</p>
              </div>
            ))}
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">Note</p>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={handleSave} rows="4" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition" placeholder="Aggiungi una nota..."></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPALE ---
export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [isUpdateUIVisible, setIsUpdateUIVisible] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const fetchData = useCallback(async (client) => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const { data: tableData, error } = await client.from(NOME_TABELLA).select('*').order('prog', { ascending: true });
      if (error) throw error;
      setData(tableData || []);
    } catch (err) { setError('Impossibile caricare i dati.'); } 
    finally { setLoading(false); }
  }, []);

  const handleUpdate = async (id, column, value) => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient.from(NOME_TABELLA).update({ [column]: value }).eq('id', id);
      if (error) throw error;
    } catch (err) { console.error(`Errore aggiornando ${column}:`, err); }
  };
  
  const handleFileChange = (event) => { setSelectedFile(event.target.files[0]); };

  const handleUpdateFromFile = async () => {
    if (!selectedFile) { setError('Per favore, seleziona un file Excel.'); return; }
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
      const response = await fetch('/.netlify/functions/update-from-excel', { method: 'POST', body: JSON.stringify({ file: base64File }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Errore sconosciuto.');
      document.getElementById('file-input').value = "";
      setSelectedFile(null); 
      setIsUpdateUIVisible(false);
    } catch (err) { setError(`Errore: ${err.message}`); } 
    finally { setIsUpdating(false); }
  };

  useEffect(() => {
    if (supabaseClient) return;
    const scriptId = 'supabase-sdk';
    if (document.getElementById(scriptId)) {
      if (window.supabase) setSupabaseClient(window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    script.onload = () => {
      if (window.supabase) setSupabaseClient(window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
      else setError("Libreria DB non trovata.");
    };
    script.onerror = () => { setError("Impossibile caricare libreria DB."); };
    document.body.appendChild(script);
  }, [supabaseClient]);

  useEffect(() => {
    if (supabaseClient) {
      fetchData(supabaseClient);
      const channel = supabaseClient.channel(`realtime:${NOME_TABELLA}`).on('postgres_changes', { event: '*', schema: 'public', table: NOME_TABELLA }, () => fetchData(supabaseClient)).subscribe();
      return () => { supabaseClient.removeChannel(channel); };
    }
  }, [supabaseClient, fetchData]);
  
  const getStickyClass = (key) => {
    const stickyClasses = {
      checkbox: 'sticky left-0 z-20',
      prog: 'sticky left-[3.5rem] z-20',
      motrice: 'sticky left-[8.5rem] z-10',
      rimorchio: 'sticky left-[18.5rem] z-10',
    };
    return stickyClasses[key] || '';
  };

  return (
    <>
      <DetailModal rowData={selectedRow} onClose={() => setSelectedRow(null)} onSaveNote={handleUpdate} />
      <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">Talevi & Turchi Dashboard</h1>
                <p className="text-gray-400 mt-2">Dati aggiornati in tempo reale.</p>
              </div>
              {!isUpdateUIVisible && (
                <button onClick={() => setIsUpdateUIVisible(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                  Aggiorna Dati
                </button>
              )}
            </div>
          </header>

          {isUpdateUIVisible && (
            <div className="bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-700 shadow-lg animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Aggiorna Dati da File Excel</h2>
                <button onClick={() => setIsUpdateUIVisible(false)} className="text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <input id="file-input" type="file" onChange={handleFileChange} accept=".xlsx, .xls" className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 text-gray-400" />
                <button onClick={handleUpdateFromFile} disabled={isUpdating || !selectedFile} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-md transition disabled:bg-indigo-800 disabled:cursor-not-allowed">
                  {isUpdating ? 'Sincronizzando...' : 'Sincronizza'}
                </button>
              </div>
              {error && <p className="text-red-400 mt-4">{error}</p>}
            </div>
          )}
          
          <div className="overflow-x-auto rounded-lg border border-gray-700 shadow-lg snap-x snap-mandatory">
            {loading ? (<p className="p-8 text-center text-gray-400">Caricamento dati...</p>) : (
              <table className="min-w-full text-base text-left text-gray-300">
                <thead className="text-sm text-gray-200 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className={`px-4 py-4 font-semibold snap-start ${getStickyClass('checkbox')} bg-gray-800`} style={{minWidth: '3.5rem'}}>Fatto</th>
                    {ALL_COLUMNS.map((col) => {
                      const bgHeaderClass = ['prog', 'motrice', 'rimorchio'].includes(col.key) ? 'bg-gray-800' : 'bg-gray-700/50';
                      return (
                        <th key={col.key} scope="col" className={`px-6 py-4 font-semibold snap-start ${getStickyClass(col.key)} ${bgHeaderClass}`} style={{minWidth: col.minWidth}}>
                          {col.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIndex) => (
                    <tr key={row.id} className={`transition ${row.completato ? 'bg-gray-800/50 text-gray-500' : ''} hover:bg-gray-700/40`}>
                      <td className={`px-4 py-4 border-b border-gray-700 snap-start ${getStickyClass('checkbox')} ${row.completato ? 'bg-gray-800/80' : 'bg-gray-800'}`}>
                        <input type="checkbox" checked={!!row.completato} onChange={() => handleUpdate(row.id, 'completato', !row.completato)} className="form-checkbox h-5 w-5 rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500" />
                      </td>
                      {ALL_COLUMNS.map((col) => {
                        const bgCellClass = ['prog', 'motrice', 'rimorchio'].includes(col.key) ? (row.completato ? 'bg-gray-800/80' : 'bg-gray-800') : (rowIndex % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-800/20');
                        const isClickable = (col.key === 'motrice' || col.key === 'rimorchio');
                        return (
                          <td key={`${row.id}-${col.key}`} 
                              className={`px-6 py-4 border-b border-gray-700 whitespace-nowrap snap-start ${getStickyClass(col.key)} ${bgCellClass} ${isClickable ? 'cursor-pointer hover:text-indigo-400' : ''} ${row.completato ? 'line-through' : ''}`}
                              onClick={() => isClickable && setSelectedRow(row)}>
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