import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

/*************************************
 * CONFIG
 *************************************/
const SUPABASE_URL = "https://vxbmwulmzmqmymqoxzjj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Ym13dWxtem1xbXltcW94empqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NzQ3MzksImV4cCI6MjA2OTU1MDczOX0.9fU10_IpN0cNcjHmX9OQ1HLtdU1da-8nJ-LgvRWk7N4";
const TABLE_NAME = "TaleviTurchi";

// Colonne disponibili e quali sono modificabili dal modal
const ALL_COLUMNS = [
  { key: "prog", label: "Prog", editable: false },
  { key: "motrice", label: "Motrice", editable: false },
  { key: "rimorchio", label: "Rimorchio", editable: false },
  { key: "cliente", label: "Cliente", editable: true },
  { key: "trasportatore", label: "Trasportatore", editable: true },
  { key: "aci", label: "ACI", editable: true },
  { key: "sigillo", label: "Sigillo", editable: true },
  { key: "note", label: "Note", editable: true },
];

/*************************************
 * UI – Componenti
 *************************************/
const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-800 text-gray-200 border border-gray-700">
    {children}
  </span>
);

const PillButton = ({ children, className = "", ...props }) => (
  <button
    className={
      "rounded-2xl px-3 py-1.5 text-sm font-semibold shadow-sm transition active:scale-[.98] " +
      className
    }
    {...props}
  >
    {children}
  </button>
);

const IconButton = ({ title, children, className = "", ...props }) => (
  <button
    title={title}
    className={
      "h-9 w-9 inline-flex items-center justify-center rounded-xl border border-gray-700 bg-gray-800/60 hover:bg-gray-700/60 transition " +
      className
    }
    {...props}
  >
    {children}
  </button>
);

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

/*************************************
 * Modal – Dettaglio riga con modifica NOTE
 *************************************/
function DetailModal({ rowData, onClose, onSave }) {
  const [formData, setFormData] = useState(rowData ?? {});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(rowData ?? {});
  }, [rowData]);

  if (!rowData) return null;

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const changes = Object.keys(formData).reduce((acc, k) => {
      if (formData[k] !== rowData[k]) acc[k] = formData[k];
      return acc;
    }, {});

    if (Object.keys(changes).length > 0) {
      await onSave(rowData.id, changes);
    }
    setIsSaving(false);
    onClose();
  };

  const hasChanges = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(rowData),
    [formData, rowData]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-700 p-4">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Modifica Prog: <span className="text-indigo-400">{rowData.prog}</span>
          </h2>
          <IconButton title="Chiudi" onClick={onClose}>
            <span className="text-gray-300">✕</span>
          </IconButton>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-4">
          {ALL_COLUMNS.map((col) => (
            <div key={col.key}>
              <label className="text-xs uppercase tracking-wider text-gray-400">
                {col.label}
              </label>
              {col.editable ? (
                col.key === "note" ? (
                  <textarea
                    rows={4}
                    value={formData[col.key] ?? ""}
                    onChange={(e) => handleInputChange(col.key, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-white"
                  />
                ) : (
                  <input
                    type="text"
                    value={formData[col.key] ?? ""}
                    onChange={(e) => handleInputChange(col.key, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-white"
                  />
                )
              ) : (
                <p className="mt-1 rounded-lg bg-gray-800/60 p-2 text-white">
                  {String(formData[col.key] ?? "N/D")}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-700 p-4 bg-gray-900/70">
          <PillButton className="bg-gray-700 text-white hover:bg-gray-600" onClick={onClose}>
            Annulla
          </PillButton>
          <PillButton
            className={classNames(
              "bg-indigo-600 text-white hover:bg-indigo-500",
              (!hasChanges || isSaving) && "opacity-60 cursor-not-allowed"
            )}
            disabled={!hasChanges || isSaving}
            onClick={handleSave}
          >
            {isSaving ? "Salvataggio…" : "Salva"}
          </PillButton>
        </div>
      </div>
    </div>
  );
}

/*************************************
 * Skeleton Loader
 *************************************/
function SkeletonRow() {
  return (
    <tr>
      <td className="px-3 py-3">
        <div className="h-6 w-24 animate-pulse rounded bg-gray-700" />
      </td>
      {ALL_COLUMNS.map((c) => (
        <td key={c.key} className="px-3 py-3">
          <div className="h-6 w-28 animate-pulse rounded bg-gray-700" />
        </td>
      ))}
    </tr>
  );
}

/*************************************
 * Vista MOBILE – Card list con colonna Focus
 *************************************/
function MobileCard({ row, focusKey, onToggle, onOpen }) {
  return (
    <div
      className={classNames(
        "rounded-2xl border p-3 shadow-sm transition bg-gray-900 border-gray-700",
        row.completato && "opacity-60 line-through"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-white">
          {ALL_COLUMNS.find((c) => c.key === focusKey)?.label}: {row[focusKey] ?? ""}
        </div>
        <PillButton
          onClick={() => onToggle(row)}
          className={classNames(
            row.completato
              ? "bg-yellow-600 hover:bg-yellow-500 text-white"
              : "bg-green-600 hover:bg-green-500 text-white"
          )}
        >
          {row.completato ? "Ripristina" : "Completato"}
        </PillButton>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-300">
        <Badge>Prog: {row.prog}</Badge>
        {row.motrice && <Badge>Motrice: {row.motrice}</Badge>}
        {row.rimorchio && <Badge>Rimorchio: {row.rimorchio}</Badge>}
        {row.cliente && <Badge>Cliente: {row.cliente}</Badge>}
        {row.trasportatore && <Badge>Trasp.: {row.trasportatore}</Badge>}
        {row.aci && <Badge>ACI: {row.aci}</Badge>}
        {row.sigillo && <Badge>Sigillo: {row.sigillo}</Badge>}
      </div>

      <div className="mt-2 text-sm text-gray-300 line-clamp-3">
        {row.note}
      </div>

      <div className="mt-3 flex justify-end">
        <PillButton onClick={() => onOpen(row)} className="bg-gray-700 hover:bg-gray-600 text-white">
          Apri Dettaglio / Modifica
        </PillButton>
      </div>
    </div>
  );
}

/*************************************
 * APP PRINCIPALE
 *************************************/
export default function App() {
  const [sb, setSb] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [query, setQuery] = useState("");
  const [focusKey, setFocusKey] = useState("motrice"); // colonna in evidenza su mobile
  const [isSyncing, setIsSyncing] = useState(false);

  // Init Supabase
  useEffect(() => {
    try {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      setSb(client);
    } catch (e) {
      setError("Errore inizializzazione database: " + e.message);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!sb) return;
    setLoading(true);
    setError("");
    const { data, error } = await sb
      .from(TABLE_NAME)
      .select("*")
      .order("prog", { ascending: true });
    if (error) setError("Impossibile caricare i dati: " + error.message);
    setRows(data || []);
    setLoading(false);
  }, [sb]);

  // Prima lettura + realtime
  useEffect(() => {
    if (!sb) return;
    fetchData();
    const channel = sb
      .channel(`realtime:${TABLE_NAME}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE_NAME },
        () => fetchData()
      )
      .subscribe();
    return () => sb.removeChannel(channel);
  }, [sb, fetchData]);

  // Aggiornamento riga
  const handleUpdate = async (id, updates) => {
    if (!sb) return;
    const prev = rows;
    // Optimistic UI
    setRows((old) => old.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    const { error } = await sb.from(TABLE_NAME).update(updates).eq("id", id);
    if (error) {
      setError("Errore salvataggio: " + error.message);
      setRows(prev); // rollback
    }
  };

  const handleToggleComplete = (row) => {
    handleUpdate(row.id, { completato: !row.completato });
  };

  // Filtri ricerca
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.prog,
        r.motrice,
        r.rimorchio,
        r.cliente,
        r.trasportatore,
        r.aci,
        r.sigillo,
        r.note,
      ]
        .map((x) => (x == null ? "" : String(x).toLowerCase()))
        .some((v) => v.includes(q))
    );
  }, [rows, query]);

  // Upload Excel → Netlify Function
  const handleExcelUpload = async (file) => {
    if (!file) return;
    setIsSyncing(true);
    try {
      const buf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const res = await fetch("/.netlify/functions/update-from-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore aggiornamento");
    } catch (e) {
      setError("Sync Excel fallita: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Dashboard <span className="text-indigo-400">Talevi & Turchi</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cerca per targa, cliente, trasportatore…"
                  className="w-64 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Colonna focus</span>
                <select
                  value={focusKey}
                  onChange={(e) => setFocusKey(e.target.value)}
                  className="rounded-xl border border-gray-700 bg-gray-900 px-2 py-1 text-sm"
                >
                  {ALL_COLUMNS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleExcelUpload(e.target.files?.[0])}
                />
                <PillButton className="bg-indigo-600 text-white hover:bg-indigo-500">
                  {isSyncing ? "Import in corso…" : "Importa Excel"}
                </PillButton>
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Messaggi di stato */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-4">
        {error && (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-900/30 p-3 text-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Contenuto */}
      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {/* MOBILE: cards a 1 colonna */}
        <section className="mt-4 grid grid-cols-1 gap-3 sm:hidden">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-800" />
            ))
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center text-gray-400">
              Nessun risultato.
            </div>
          ) : (
            filtered.map((r) => (
              <MobileCard
                key={r.id}
                row={r}
                focusKey={focusKey}
                onToggle={handleToggleComplete}
                onOpen={setSelectedRow}
              />)
            ))
          )}
        </section>

        {/* DESKTOP: tabella completa */}
        <section className="mt-6 hidden overflow-x-auto rounded-2xl border border-gray-800 shadow-lg sm:block">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900/70 text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left">Azione</th>
                {ALL_COLUMNS.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-left">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-gray-950/40">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={ALL_COLUMNS.length + 1} className="px-4 py-6 text-center text-gray-400">
                    Nessun risultato.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={classNames(
                      "hover:bg-gray-900/40",
                      r.completato && "bg-gray-900/30 text-gray-500"
                    )}
                  >
                    <td className="px-4 py-3 align-top">
                      <PillButton
                        onClick={() => handleToggleComplete(r)}
                        className={classNames(
                          r.completato
                            ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                            : "bg-green-600 hover:bg-green-500 text-white"
                        )}
                      >
                        {r.completato ? "Ripristina" : "Completato"}
                      </PillButton>
                    </td>
                    {ALL_COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        className={classNames(
                          "px-4 py-3 whitespace-nowrap align-top cursor-pointer",
                          r.completato && "line-through"
                        )}
                        onClick={() => setSelectedRow(r)}
                        title="Apri dettaglio"
                      >
                        {String(r[c.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>

      {/* Modal dettaglio */}
      <DetailModal rowData={selectedRow} onClose={() => setSelectedRow(null)} onSave={handleUpdate} />

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-4 pb-10 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} CSD Talevi — UI responsive ottimizzata per mobile & desktop
      </footer>

      {/* === Netlify Function (salvare come: netlify/functions/update-from-excel.js) ===
      // Versione definitiva con campo 'completato' e pulizia tabella prima dell'inserimento

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
      */}
    </div>
  );
}
