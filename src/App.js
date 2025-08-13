import React, { useState, useEffect, useCallback } from 'react';

// --- CONFIGURAZIONE ---
// SOSTITUISCI CON I TUOI VALORI REALI
const SUPABASE_URL = 'https://vxbmwulmzmqmymqoxzjj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Ym13dWxtem1xbXltcW94empqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NzQ3MzksImV4cCI6MjA2OTU1MDczOX0.9fU10_IpN0cNcjHmX9OQ1HLtdU1da-8nJ-LgvRWk7N4';
const NOME_TABELLA = 'TaleviTurchi';

const ALL_COLUMNS = [
  { key: 'prog', label: 'Prog', editable: false },
  { key: 'motrice', label: 'Motrice', editable: false },
  { key: 'rimorchio', label: 'Rimorchio', editable: false },
  { key: 'cliente', label: 'Cliente', editable: true },
  { key: 'trasportatore', label: 'Trasportatore', editable: true },
  { key: 'aci', label: 'ACI', editable: true },
  { key: 'sigillo', label: 'Sigillo', editable: true },
  { key: 'note', label: 'Note', editable: true },
];

// --- COMPONENTE MODAL (FINESTRA DI DETTAGLIO) ---
// Questo componente è corretto e non necessita di modifiche.
const DetailModal = ({ rowData, onClose, onSave }) => {
  if (!rowData) return null;

  const [formData, setFormData] = useState(rowData);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(rowData);
  }, [rowData]);

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Filtra solo i campi che sono cambiati per non inviare dati inutili
    const changes = Object.keys(formData).reduce((acc, key) => {
        if (formData[key] !== rowData[key]) {
            acc[key] = formData[key];
        }
        return acc;
    }, {});

    if (Object.keys(changes).length > 0) {
        await onSave(rowData.id, changes);
    }
    setIsSaving(false);
    onClose();
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(rowData);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg flex flex-col" style={{maxHeight: '90vh'}}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Modifica Prog: {rowData.prog}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="space-y-4">
            {ALL_COLUMNS.map(col => (
              <div key={col.key}>
                <label className="text-sm text-gray-400 uppercase tracking-wider">{col.label}</label>
                {col.editable ? (
                  col.key === 'note' ? (
                    <textarea value={formData[col.key] || ''} onChange={(e) => handleInputChange(col.key, e.target.value)} rows="4" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1 text-white" />
                  ) : (
                    <input type="text" value={formData[col.key] || ''} onChange={(e) => handleInputChange(col.key, e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1 text-white" />
                  )
                ) : (
                  <p className="text-lg text-white font-medium bg-gray-900/50 p-2 rounded-md mt-1">{String(formData[col.key] || 'N/D')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 mt-auto border-t border-gray-700 bg-gray-800/50 flex justify-end gap-3">
           <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition">Annulla</button>
           <button onClick={handleSave} disabled={!hasChanges || isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-md transition disabled:bg-gray-500 disabled:cursor-not-allowed">
            {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
           </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPALE ---
export default function App() {
  const [data, setData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supabaseClient, setSupabaseClient] = useState(null);

  // Inizializza il client Supabase con gestione degli errori migliorata
  useEffect(() => {
    const initSupabase = () => {
        try {
            if (SUPABASE_URL === 'IL_TUO_URL_SUPABASE' || SUPABASE_ANON_KEY === 'LA_TUA_CHIAVE_ANON_SUPABASE') {
                throw new Error("Per favore, inserisci le tue credenziali Supabase (URL e Chiave Anon) nel codice.");
            }
            const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            setSupabaseClient(client);
        } catch (e) {
            setError(e.message || "Errore durante l'inizializzazione di Supabase. Controlla che le credenziali siano corrette.");
            console.error("Errore di inizializzazione Supabase:", e);
        }
    };

    if (window.supabase) {
        initSupabase();
    } else {
        const scriptId = 'supabase-sdk';
        if (document.getElementById(scriptId)) return;

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.async = true;
        script.onload = initSupabase;
        script.onerror = () => {
            setError("Impossibile caricare la libreria del database. Controlla la connessione internet.");
        };
        document.body.appendChild(script);
    }
  }, []);

  // Funzione per caricare i dati
  const fetchData = useCallback(async (client) => {
    setLoading(true);
    setError(null);
    try {
      const { data: tableData, error } = await client.from(NOME_TABELLA).select('*').order('prog', { ascending: true });
      if (error) throw error;
      setData(tableData || []);
    } catch (err) {
      setError('Impossibile caricare i dati. Controlla le policy RLS e il nome della tabella in Supabase.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carica i dati e si iscrive ai cambiamenti quando il client è pronto
  useEffect(() => {
    if (supabaseClient) {
      fetchData(supabaseClient);
      const channel = supabaseClient
        .channel(`realtime:${NOME_TABELLA}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: NOME_TABELLA }, () => {
          fetchData(supabaseClient);
        })
        .subscribe();

      return () => {
        supabaseClient.removeChannel(channel);
      };
    }
  }, [supabaseClient, fetchData]);

  // Funzione per aggiornare i dati su Supabase
  const handleUpdate = async (id, updates) => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient.from(NOME_TABELLA).update(updates).eq('id', id);
      if (error) throw error;
    } catch (err) {
      setError('Errore durante il salvataggio dei dati.');
      console.error(err);
    }
  };

  // Funzione per barrare/ripristinare una riga
  const handleToggleComplete = (rowToToggle) => {
      handleUpdate(rowToToggle.id, { completato: !rowToToggle.completato });
  };

  return (
    <>
      <style>{`body { background-color: #111827; color: #f3f4f6; }`}</style>
      <DetailModal rowData={selectedRow} onClose={() => setSelectedRow(null)} onSave={handleUpdate} />
      <div className="min-h-screen p-4 sm:p-8 font-sans">
        <h1 className="text-4xl font-bold mb-8">Dashboard Talevi & Turchi</h1>
        {loading && !error && <p className="text-center text-lg">Caricamento dati in corso...</p>}
        {error && <p className="text-center text-lg text-red-400 bg-red-900/50 p-4 rounded-md">{error}</p>}
        {!loading && !error && (
            <div className="overflow-x-auto rounded-lg border border-gray-700 shadow-lg">
            <table className="min-w-full text-base text-left">
                <thead className="text-sm uppercase bg-gray-800">
                <tr>
                    <th scope="col" className="px-4 py-4" style={{minWidth: '8rem'}}>Azione</th>
                    {ALL_COLUMNS.map((col) => (
                    <th key={col.key} scope="col" className="px-6 py-4">{col.label}</th>
                    ))}
                </tr>
                </thead>
                <tbody className="bg-gray-900">
                {data.map((row) => (
                    <tr key={row.id} className={`border-t border-gray-700 ${row.completato ? 'bg-gray-800/50 text-gray-500' : ''} hover:bg-gray-700/40`}>
                    <td className="px-4 py-4">
                        <button onClick={() => handleToggleComplete(row)} className={`w-full text-sm font-bold py-1 px-2 rounded-md transition ${row.completato ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'}`}>
                        {row.completato ? 'Ripristina' : 'Barra'}
                        </button>
                    </td>
                    {ALL_COLUMNS.map((col) => (
                        <td key={`${row.id}-${col.key}`} className={`px-6 py-4 whitespace-nowrap cursor-pointer ${row.completato ? 'line-through' : ''}`} onClick={() => setSelectedRow(row)}>
                        {String(row[col.key] || '')}
                        </td>
                    ))}
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}
      </div>
    </>
  );
}