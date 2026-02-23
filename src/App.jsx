import { useState, useMemo, useEffect } from "react";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQA-GSEGsVQ1yRtwSEIThbsitKF5Mz-ghiDEogLTuo66uaQ0W7aa-s7XkdV1jh3XT-ovAppzoO-6r3O/pub?gid=1126347347&single=true&output=csv";

const parseCSV = (text) => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].replace(/^\uFEFF/, "").split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = [];
    let cur = "", inQ = false;
    for (let ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    const get = (kw) => {
      const idx = headers.findIndex(h => h.includes(kw));
      return idx >= 0 ? (cols[idx] || "").trim().replace(/"/g, "") : "";
    };
    const ticker = get("ticker").toUpperCase();
    if (!ticker || ticker === "#N/A" || ticker === "") continue;
    const nombre = get("nombre");
    if (!nombre || nombre === "#N/A") continue;
    const rawPais = get("pais");
    const pais = (!rawPais || rawPais === "No encontrado") ? "" : rawPais;
    const nivelCompra = get("nivel compra");
    const nivelVenta  = get("nivel venta");
    const hasNivel = (nivelCompra && nivelCompra !== "#N/A") || (nivelVenta && nivelVenta !== "#N/A");
    const v = nivelVenta.toUpperCase();
    const c = nivelCompra.toUpperCase();
    let actionType = hasNivel ? "NEUTRAL" : "UNKNOWN";
    if (v.includes("N3") || v.includes("VENTA TOTAL")) actionType = "SELL_STRONG";
    else if (v.includes("N2") || v.includes("N1") || v.includes("POSIBLE")) actionType = "SELL_SOFT";
    else if (c.startsWith("NIVEL")) actionType = "BUY";
    const rawQCo = get("calidad empresa");
    const qualityCo = (!rawQCo || rawQCo === "No encontrado" || rawQCo === "#N/A") ? "" : rawQCo;
    results.push({
      ticker, name: nombre, pais, actionType, qualityCo,
      nivelCompra, nivelVenta, hasNivel,
      precioArs: parseFloat(get("precio ars")) || 0,
      precioUsd: parseFloat(get("precio usd")) || 0,
      yld: parseFloat(get("yield")) || 0,
      divGrowth: parseFloat(get("5-year dividend")) || 0,
      salesGrowth: parseFloat(get("5-year sales")) || 0,
      qualityDiv: parseFloat(get("calidad dividendo")) || 0,
      hasDivGro: get("divgro").toUpperCase() === "SI",
    });
  }
  return results;
};

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filterAccion, setFilterAccion] = useState([]);
  const [filterPais, setFilterPais] = useState([]);
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${msg}`]);

  useEffect(() => {
    addLog("Iniciando fetch...");
    fetch(SHEET_URL + "&t=" + Date.now(), { cache: "no-store" })
      .then(r => { addLog(`Fetch OK, status: ${r.status}`); return r.text(); })
      .then(text => {
        addLog(`CSV recibido, largo: ${text.length} chars`);
        const parsed = parseCSV(text);
        addLog(`Parseados: ${parsed.length} activos`);
        if (parsed.length > 0) addLog(`Primero: ${JSON.stringify(parsed[0]).slice(0, 100)}`);
        setData(parsed);
        setLoading(false);
      })
      .catch(e => {
        addLog(`ERROR: ${e.message}`);
        setErrorMsg(e.message);
        setLoading(false);
      });
  }, []);

  // Log cada vez que cambia search
  useEffect(() => {
    addLog(`Search cambió a: "${search}" — data.length: ${data.length}`);
  }, [search, data.length]);

  // Log cada vez que cambia filterAccion
  useEffect(() => {
    addLog(`filterAccion cambió a: ${JSON.stringify(filterAccion)}`);
  }, [filterAccion]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const result = data.filter(item => {
      if (q) {
        const hit = item.ticker.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (filterAccion.length && !filterAccion.includes(item.actionType)) return false;
      if (filterPais.length && !filterPais.includes(item.pais)) return false;
      return true;
    });
    addLog(`useMemo recalculó: ${result.length} resultados (search="${q}", filterAccion=${JSON.stringify(filterAccion)})`);
    return result;
  }, [data, search, filterAccion, filterPais]);

  const paisOptions = useMemo(() =>
    [...new Set(data.map(d => d.pais).filter(Boolean))].sort()
  , [data]);

  const toggleAccion = (val) => {
    addLog(`toggleAccion llamado con: ${val}`);
    setFilterAccion(prev => {
      const next = prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val];
      addLog(`filterAccion nuevo valor: ${JSON.stringify(next)}`);
      return next;
    });
  };

  const togglePais = (val) => {
    setFilterPais(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const s = { // estilos base
    page:    { minHeight: "100vh", background: "#030712", color: "#e2e8f0", fontFamily: "monospace", padding: 20 },
    box:     { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 16, marginBottom: 12 },
    label:   { fontSize: 11, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" },
    input:   { background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#e2e8f0", fontSize: 13, width: "100%", fontFamily: "monospace", outline: "none" },
    btn:     (active, color = "#10b981") => ({ background: active ? color + "33" : "#1e293b", border: `1px solid ${active ? color : "#334155"}`, color: active ? color : "#64748b", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "monospace", margin: "0 4px 4px 0" }),
    logBox:  { background: "#000", border: "1px solid #1e293b", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 10, color: "#4ade80", maxHeight: 200, overflowY: "auto", whiteSpace: "pre-wrap" },
    card:    (border) => ({ background: "#0f172a", borderLeft: `3px solid ${border}`, borderRadius: 8, padding: "12px 16px", marginBottom: 8 }),
    grid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 },
  };

  return (
    <div style={s.page}>
      <h1 style={{ fontFamily: "monospace", color: "#10b981", marginBottom: 16, fontSize: 20 }}>
        CEDEAR DEBUG v1.0
      </h1>

      {/* STATUS */}
      <div style={s.box}>
        <span style={s.label}>Estado del sistema</span>
        <div style={{ fontSize: 12, lineHeight: 2 }}>
          <span style={{ marginRight: 20 }}>📦 Data cargada: <strong style={{ color: "#10b981" }}>{data.length}</strong></span>
          <span style={{ marginRight: 20 }}>🔍 Filtrados: <strong style={{ color: "#60a5fa" }}>{filtered.length}</strong></span>
          <span style={{ marginRight: 20 }}>🔎 Search: "<strong style={{ color: "#fbbf24" }}>{search}</strong>"</span>
          <span style={{ marginRight: 20 }}>🎯 Acción: <strong style={{ color: "#f87171" }}>{JSON.stringify(filterAccion)}</strong></span>
          <span>🌍 País: <strong style={{ color: "#a78bfa" }}>{JSON.stringify(filterPais)}</strong></span>
        </div>
        {errorMsg && <div style={{ color: "#ef4444", marginTop: 8 }}>❌ Error: {errorMsg}</div>}
        {loading  && <div style={{ color: "#fbbf24", marginTop: 8 }}>⏳ Cargando...</div>}
      </div>

      {/* LOG EN TIEMPO REAL */}
      <div style={s.box}>
        <span style={s.label}>Log en tiempo real</span>
        <div style={s.logBox}>
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>

      {/* BUSCADOR */}
      <div style={s.box}>
        <span style={s.label}>Buscador de texto</span>
        <input
          style={s.input}
          value={search}
          onChange={e => { addLog(`onChange disparado, valor: "${e.target.value}"`); setSearch(e.target.value); }}
          placeholder="Escribí AAPL, Apple, etc..."
        />
        <div style={{ fontSize: 10, color: "#334155", marginTop: 6 }}>
          Valor actual del state: "{search}" | Resultados: {filtered.length}
        </div>
      </div>

      {/* FILTRO ACCIÓN — botones simples sin dropdown */}
      <div style={s.box}>
        <span style={s.label}>Filtro por Acción (botones directos, sin dropdown)</span>
        <div>
          {["BUY", "SELL_STRONG", "SELL_SOFT", "NEUTRAL", "UNKNOWN"].map(val => (
            <button
              key={val}
              style={s.btn(filterAccion.includes(val))}
              onClick={() => toggleAccion(val)}
            >
              {val} ({data.filter(d => d.actionType === val).length})
            </button>
          ))}
          {filterAccion.length > 0 && (
            <button style={s.btn(false, "#ef4444")} onClick={() => { addLog("Limpiando filterAccion"); setFilterAccion([]); }}>
              ✕ Limpiar
            </button>
          )}
        </div>
        <div style={{ fontSize: 10, color: "#334155", marginTop: 6 }}>
          filterAccion state: {JSON.stringify(filterAccion)}
        </div>
      </div>

      {/* FILTRO PAÍS */}
      <div style={s.box}>
        <span style={s.label}>Filtro por País (botones directos)</span>
        <div style={{ maxHeight: 100, overflowY: "auto" }}>
          {paisOptions.map(p => (
            <button key={p} style={s.btn(filterPais.includes(p), "#60a5fa")} onClick={() => togglePais(p)}>
              {p || "(sin país)"} ({data.filter(d => d.pais === p).length})
            </button>
          ))}
        </div>
        {filterPais.length > 0 && (
          <button style={{ ...s.btn(false, "#ef4444"), marginTop: 6 }} onClick={() => setFilterPais([])}>
            ✕ Limpiar país
          </button>
        )}
      </div>

      {/* RESULTADOS */}
      <div style={s.box}>
        <span style={s.label}>Resultados ({filtered.length} de {data.length})</span>
        {loading && <div style={{ color: "#fbbf24" }}>Cargando datos...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ color: "#ef4444", padding: "20px 0" }}>
            ⚠ Sin resultados.{" "}
            {data.length === 0 ? "El array data está vacío." : `El array data tiene ${data.length} items pero ninguno pasa los filtros.`}
          </div>
        )}
        <div style={s.grid}>
          {filtered.slice(0, 20).map(item => {
            const borderColor = item.actionType === "BUY" ? "#10b981" : item.actionType === "SELL_STRONG" ? "#ef4444" : item.actionType === "SELL_SOFT" ? "#f97316" : "#475569";
            return (
              <div key={item.ticker} style={s.card(borderColor)}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#f8fafc", marginBottom: 4 }}>{item.ticker}</div>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>{item.name}</div>
                <div style={{ fontSize: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  <span style={{ color: "#475569" }}>Acción: <span style={{ color: "#e2e8f0" }}>{item.actionType}</span></span>
                  <span style={{ color: "#475569" }}>País: <span style={{ color: "#e2e8f0" }}>{item.pais || "—"}</span></span>
                  <span style={{ color: "#475569" }}>ARS: <span style={{ color: "#e2e8f0" }}>{item.precioArs || "—"}</span></span>
                  <span style={{ color: "#475569" }}>USD: <span style={{ color: "#e2e8f0" }}>{item.precioUsd || "—"}</span></span>
                  <span style={{ color: "#475569" }}>Calidad: <span style={{ color: "#e2e8f0" }}>{item.qualityCo || "—"}</span></span>
                  <span style={{ color: "#475569" }}>ScoreDiv: <span style={{ color: "#e2e8f0" }}>{item.qualityDiv || "—"}</span></span>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length > 20 && (
          <div style={{ color: "#475569", fontSize: 11, marginTop: 12, textAlign: "center" }}>
            Mostrando 20 de {filtered.length} resultados
          </div>
        )}
      </div>
    </div>
  );
}
