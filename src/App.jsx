import { useState, useEffect } from "react";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQA-GSEGsVQ1yRtwSEIThbsitKF5Mz-ghiDEogLTuo66uaQ0W7aa-s7XkdV1jh3XT-ovAppzoO-6r3O/pub?gid=1126347347&single=true&output=csv";
const REFRESH_MINUTES = 15;

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
    const get = (kw) => { const idx = headers.findIndex(h => h.includes(kw)); return idx >= 0 ? (cols[idx] || "").trim().replace(/"/g, "") : ""; };
    const ticker = get("ticker").toUpperCase();
    if (!ticker || ticker === "#N/A" || ticker === "") continue;
    const nombre = get("nombre");
    if (!nombre || nombre === "#N/A") continue;
    const rawPais = get("pais");
    const pais = (!rawPais || rawPais === "No encontrado") ? "" : rawPais;
    const nivelCompra = get("nivel compra");
    const ncVal = nivelCompra.toLowerCase().trim();
    const hasNivel = ncVal !== "" && ncVal !== "#n/a";
    // actionType basado en nivelCompra
    let actionType = "UNKNOWN";
    if (hasNivel) {
      if (ncVal === "v3")          actionType = "SELL_STRONG";
      else if (ncVal === "v2")     actionType = "SELL_SOFT";
      else if (ncVal === "v1")     actionType = "SELL_SOFT";
      else if (ncVal === "precio justo") actionType = "NEUTRAL";
      else if (ncVal.startsWith("c")) actionType = "BUY";
      else                         actionType = "NEUTRAL";
    }
    const rawQCo = get("calidad empresa");
    const qualityCo = (!rawQCo || rawQCo === "No encontrado" || rawQCo === "#N/A") ? "" : rawQCo;
    results.push({
      ticker, name: nombre, pais, actionType, hasNivel, nivelCompra, qualityCo,
      precioArs:   parseFloat(get("precio ars"))        || 0,
      precioUsd:   parseFloat(get("precio usd"))        || 0,
      yld:         parseFloat(get("yield"))             || 0,
      divGrowth:   parseFloat(get("5-year dividend"))   || 0,
      salesGrowth: parseFloat(get("5-year sales"))      || 0,
      qualityDiv:  parseFloat(get("calidad dividendo")) || 0,
      hasDivGro:   get("divgro").toUpperCase() === "SI",
    });
  }
  return results;
};

const applyFilters = (data, search, filterAccion, filterPais, filterQCo, filterDivGro, sortField, sortDir) => {
  const q = search.toLowerCase().trim();
  const list = data.filter(item => {
    if (q && !item.ticker.toLowerCase().includes(q) && !item.name.toLowerCase().includes(q) && !item.pais.toLowerCase().includes(q)) return false;
    if (filterAccion.length && !filterAccion.includes(item.actionType)) return false;
    if (filterPais.length   && !filterPais.includes(item.pais))         return false;
    if (filterQCo.length    && !filterQCo.includes(item.qualityCo))     return false;
    if (filterDivGro === "si" && !item.hasDivGro) return false;
    if (filterDivGro === "no" &&  item.hasDivGro) return false;
    return true;
  });
  return [...list].sort((a, b) => {
    let va = a[sortField] ?? "";
    let vb = b[sortField] ?? "";
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
};

// Escala de arriba (venta) a abajo (mejor compra)
const SCALE = [
  { key: "v3",           label: "Venta Total",    color: "#ef4444", dimColor: "#1a0404", zone: "sell" },
  { key: "v2",           label: "Vender Mitad",   color: "#f97316", dimColor: "#1a0a02", zone: "sell" },
  { key: "v1",           label: "Posible Venta",  color: "#fbbf24", dimColor: "#1a1202", zone: "sell" },
  { key: "precio justo", label: "Precio Justo",   color: "#94a3b8", dimColor: "#0f172a", zone: "fair" },
  { key: "c1",           label: "C1",             color: "#86efac", dimColor: "#052e16", zone: "buy"  },
  { key: "c2",           label: "C2",             color: "#4ade80", dimColor: "#052e16", zone: "buy"  },
  { key: "c3",           label: "C3",             color: "#22c55e", dimColor: "#052e16", zone: "buy"  },
  { key: "c4",           label: "C4",             color: "#16a34a", dimColor: "#052e16", zone: "buy"  },
  { key: "c5",           label: "C5",             color: "#15803d", dimColor: "#052e16", zone: "buy"  },
  { key: "c6",           label: "C6",             color: "#166534", dimColor: "#052e16", zone: "buy"  },
  { key: "c7",           label: "C7",             color: "#14532d", dimColor: "#022c22", zone: "buy"  },
  { key: "c8",           label: "C8 Op. Única",   color: "#10b981", dimColor: "#022c22", zone: "buy"  },
];

const parseActiveIndex = (nivelCompra) => {
  const val = (nivelCompra || "").toLowerCase().trim();
  const idx = SCALE.findIndex(s => s.key === val);
  return idx;
};

const ACTION_CONFIG = {
  BUY:         { bg: "linear-gradient(135deg,#052e16,#064e3b)", border: "#10b981" },
  SELL_STRONG: { bg: "linear-gradient(135deg,#1c0a0a,#450a0a)", border: "#ef4444" },
  SELL_SOFT:   { bg: "linear-gradient(135deg,#1c1206,#451a03)", border: "#f97316" },
  NEUTRAL:     { bg: "linear-gradient(135deg,#0f172a,#1e293b)", border: "#475569" },
  UNKNOWN:     { bg: "linear-gradient(135deg,#0a0a0f,#111827)", border: "#1e293b" },
};

const qualityColor = (q) => {
  if (!q) return "#6b7280";
  if (q.startsWith("AAA")) return "#059669";
  if (q.startsWith("AA"))  return "#10b981";
  if (q.startsWith("A"))   return "#3b82f6";
  return "#8b5cf6";
};

const fmt  = (v) => (!v || v <= 0) ? "—" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(v);
const fmtU = (v) => (!v || v <= 0) ? "—" : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

function LevelBar({ nivelCompra, hasNivel }) {
  if (!hasNivel) return <div style={{ fontSize: 10, color: "#334155", padding: "4px 0" }}>SIN DATOS DE NIVEL</div>;
  const ai = parseActiveIndex(nivelCompra);
  const active = ai >= 0 ? SCALE[ai] : null;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
        <span style={{ fontSize: 7, color: "#ef444440", marginBottom: 1 }}>▲</span>
        {SCALE.map((step, idx) => {
          const isActive = idx === ai;
          return (
            <div key={idx} title={step.label} style={{
              width: isActive ? 18 : 12,
              height: isActive ? 18 : 10,
              borderRadius: 3,
              background: isActive ? step.color : step.dimColor,
              border: isActive ? "1.5px solid " + step.color : "1px solid " + step.color + "25",
              boxShadow: isActive ? "0 0 8px " + step.color + "bb, 0 0 16px " + step.color + "44" : "none",
              transition: "all 0.2s",
              flexShrink: 0,
            }} />
          );
        })}
        <span style={{ fontSize: 7, color: "#10b98140", marginTop: 1 }}>▼</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, flex: 1 }}>
        {active ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: active.color, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: active.color, display: "inline-block", boxShadow: "0 0 6px " + active.color }} />
              {active.label}
            </div>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.06em" }}>
              {active.zone === "sell" && "ZONA DE VENTA"}
              {active.zone === "fair" && "PRECIO JUSTO"}
              {active.zone === "buy"  && "ZONA DE COMPRA"}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 10, color: "#334155" }}>SIN DATOS</div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div style={{ background: "#ffffff05", borderRadius: 6, padding: "6px 9px" }}>
      <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 2, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function FiltroBtn({ label, active, onClick, color = "#64748b", count }) {
  return (
    <button onClick={onClick} style={{
      background: active ? color + "33" : "#0f172a",
      border: `1px solid ${active ? color : "#1e293b"}`,
      color: active ? color : "#64748b",
      borderRadius: 6, padding: "6px 12px", cursor: "pointer",
      fontSize: 11, fontFamily: "inherit", fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {label}{count !== undefined ? ` (${count})` : ""}
    </button>
  );
}

function FiltroSection({ titulo, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "inline-block", position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: "#0f172a", border: "1px solid #1e293b", color: "#64748b",
        borderRadius: 6, padding: "7px 12px", cursor: "pointer",
        fontSize: 11, fontFamily: "inherit", fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {titulo} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: "#0f172a", border: "1px solid #334155", borderRadius: 8,
          padding: "10px", minWidth: 220, boxShadow: "0 8px 32px #000d",
          display: "flex", flexWrap: "wrap", gap: 6,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

const SORT_FIELDS = [
  { value: "ticker",      label: "Ticker"       },
  { value: "precioArs",   label: "Precio ARS"   },
  { value: "yld",         label: "Yield"         },
  { value: "salesGrowth", label: "Crec. Ventas" },
  { value: "divGrowth",   label: "Crec. Div"    },
  { value: "qualityDiv",  label: "Score Div"    },
];

export default function App() {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch]             = useState("");
  const [filterAccion, setFilterAccion] = useState([]);
  const [filterPais, setFilterPais]     = useState([]);
  const [filterQCo, setFilterQCo]       = useState([]);
  const [filterDivGro, setFilterDivGro] = useState(null);
  const [sortField, setSortField]       = useState("ticker");
  const [sortDir, setSortDir]           = useState("asc");

  // ── CLAVE: filtered es estado normal, no useMemo ──────────
  const [filtered, setFiltered] = useState([]);
  const [paisOptions, setPaisOptions]   = useState([]);
  const [qCoOptions,  setQCoOptions]    = useState([]);
  const [stats, setStats] = useState({ buy: 0, sellStrong: 0, sellSoft: 0, neutral: 0 });

  // LOG
  const [log, setLog]       = useState([]);
  const [showLog, setShowLog] = useState(false);
  const addLog = (msg) => setLog(prev => [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev.slice(0, 30)]);

  // Recalcular filtered cada vez que cambia cualquier filtro o los datos
  useEffect(() => {
    const result = applyFilters(data, search, filterAccion, filterPais, filterQCo, filterDivGro, sortField, sortDir);
    addLog(`[FILTER] data:${data.length} → filtered:${result.length} | search:"${search}" accion:[${filterAccion}] pais:[${filterPais}] qco:[${filterQCo}] divgro:${filterDivGro} sort:${sortField} ${sortDir}`);
    setFiltered(result);
  }, [data, search, filterAccion, filterPais, filterQCo, filterDivGro, sortField, sortDir]);

  // Recalcular opciones y stats cuando cambia data
  useEffect(() => {
    setPaisOptions([...new Set(data.map(d => d.pais).filter(Boolean))].sort());
    setQCoOptions([...new Set(data.map(d => d.qualityCo).filter(Boolean))].sort());
    setStats({
      buy:        data.filter(i => i.actionType === "BUY").length,
      sellStrong: data.filter(i => i.actionType === "SELL_STRONG").length,
      sellSoft:   data.filter(i => i.actionType === "SELL_SOFT").length,
      neutral:    data.filter(i => i.actionType === "NEUTRAL").length,
    });
  }, [data]);

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true);
    addLog("Fetch iniciado...");
    try {
      const res = await fetch(SHEET_URL + "&t=" + Date.now(), { cache: "no-store" });
      addLog(`Fetch OK status=${res.status}`);
      const text = await res.text();
      const parsed = parseCSV(text);
      addLog(`Parseados ${parsed.length} activos`);
      setData(parsed);
      setLastUpdate(new Date());
      setError(false);
    } catch (e) {
      addLog(`ERROR: ${e.message}`);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(() => fetchData(), REFRESH_MINUTES * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const toggleArr = (arr, setArr, val) => {
    const next = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
    addLog(`Toggle "${val}" → [${next.join(",")}]`);
    setArr(next);
  };

  const clearAll = () => {
    setSearch(""); setFilterAccion([]); setFilterPais([]);
    setFilterQCo([]); setFilterDivGro(null);
    addLog("Filtros limpiados");
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => { const nd = d === "asc" ? "desc" : "asc"; addLog(`Sort dir → ${nd}`); return nd; });
    } else {
      addLog(`Sort field → ${field}`);
      setSortField(field);
      setSortDir("desc");
    }
  };

  const totalActive = filterAccion.length + filterPais.length + filterQCo.length + (filterDivGro ? 1 : 0) + (search ? 1 : 0);

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#e2e8f0", fontFamily: "'DM Mono','Courier New',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Space+Grotesk:wght@400;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
        .card{transition:transform .2s}
        .card:hover{transform:translateY(-3px)}
        .grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{animation:spin 1s linear infinite}
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em" }}>
            <span style={{ color: "#10b981" }}>CEDEAR</span><span style={{ color: "#e2e8f0" }}>PRO</span>
            <span style={{ fontSize: 10, color: "#334155", marginLeft: 10 }}>v5.0</span>
          </div>
          <div style={{ color: "#475569", fontSize: 10, marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{data.length} ACTIVOS · MOSTRANDO {filtered.length}</span>
            {error      && <span style={{ color: "#ef4444" }}>⚠ SIN CONEXIÓN</span>}
            {lastUpdate && <span style={{ color: "#334155" }}>🕐 {lastUpdate.toLocaleTimeString("es-AR")}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setShowLog(s => !s)} style={{
            background: showLog ? "#fbbf2422" : "#0f172a",
            border: `1px solid ${showLog ? "#fbbf24" : "#1e293b"}`,
            color: showLog ? "#fbbf24" : "#475569",
            borderRadius: 6, padding: "7px 12px", cursor: "pointer",
            fontSize: 10, fontFamily: "inherit", fontWeight: 700,
          }}>
            LOG {showLog ? "▲" : "▼"}
          </button>
          <button onClick={() => fetchData(true)} style={{
            background: "#0f172a", border: "1px solid #1e293b",
            borderRadius: 6, color: "#64748b", padding: "8px 11px", cursor: "pointer",
          }}>
            <span style={{ display: "inline-block" }} className={refreshing ? "spin" : ""}>↻</span>
          </button>
          {[
            { v: stats.buy,        c: "#10b981", l: "COMPRAR"     },
            { v: stats.sellStrong, c: "#ef4444", l: "VENTA TOTAL" },
            { v: stats.sellSoft,   c: "#f97316", l: "REDUCIR"     },
            { v: stats.neutral,    c: "#64748b", l: "ESPERAR"     },
          ].map(s => (
            <div key={s.l} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "10px 16px", textAlign: "center" }}>
              <div style={{ color: s.c, fontSize: 18, fontWeight: 700 }}>{s.v}</div>
              <div style={{ color: "#475569", fontSize: 9, letterSpacing: "0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* LOG */}
      {showLog && (
        <div style={{ background: "#000", borderBottom: "1px solid #1e293b", padding: "10px 24px", maxHeight: 160, overflowY: "auto" }}>
          {log.map((l, i) => <div key={i} style={{ fontSize: 10, color: "#4ade80", fontFamily: "monospace" }}>{l}</div>)}
        </div>
      )}

      {/* FILTROS */}
      <div style={{ padding: "10px 24px", borderBottom: "1px solid #0f172a", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar ticker o nombre..."
          style={{
            background: "#0f172a", border: "1px solid #1e293b", borderRadius: 7,
            padding: "7px 12px", color: "#e2e8f0", fontSize: 12,
            outline: "none", width: 200, fontFamily: "inherit",
          }}
        />

        <FiltroSection titulo="Acción">
          {[
            { v: "BUY",         l: "▲ Comprar",    c: "#10b981" },
            { v: "SELL_STRONG", l: "▼ Venta Total", c: "#ef4444" },
            { v: "SELL_SOFT",   l: "▽ Reducir",     c: "#f97316" },
            { v: "NEUTRAL",     l: "◈ Esperar",     c: "#64748b" },
          ].map(o => (
            <FiltroBtn key={o.v} label={o.l} color={o.c}
              active={filterAccion.includes(o.v)}
              count={data.filter(d => d.actionType === o.v).length}
              onClick={() => toggleArr(filterAccion, setFilterAccion, o.v)} />
          ))}
        </FiltroSection>

        <FiltroSection titulo="País">
          {paisOptions.map(p => (
            <FiltroBtn key={p} label={p} color="#60a5fa"
              active={filterPais.includes(p)}
              count={data.filter(d => d.pais === p).length}
              onClick={() => toggleArr(filterPais, setFilterPais, p)} />
          ))}
        </FiltroSection>

        <FiltroSection titulo="Calidad Cía">
          {qCoOptions.map(q => (
            <FiltroBtn key={q} label={q} color="#a78bfa"
              active={filterQCo.includes(q)}
              count={data.filter(d => d.qualityCo === q).length}
              onClick={() => toggleArr(filterQCo, setFilterQCo, q)} />
          ))}
        </FiltroSection>

        <FiltroSection titulo="DivGro">
          <FiltroBtn label="✓ Con DivGro" color="#34d399"
            active={filterDivGro === "si"}
            count={data.filter(d => d.hasDivGro).length}
            onClick={() => setFilterDivGro(filterDivGro === "si" ? null : "si")} />
          <FiltroBtn label="✗ Sin DivGro" color="#94a3b8"
            active={filterDivGro === "no"}
            count={data.filter(d => !d.hasDivGro).length}
            onClick={() => setFilterDivGro(filterDivGro === "no" ? null : "no")} />
        </FiltroSection>

        {totalActive > 0 && (
          <button onClick={clearAll} style={{
            background: "#ef444422", border: "1px solid #ef444455", color: "#f87171",
            borderRadius: 6, padding: "7px 12px", cursor: "pointer",
            fontSize: 11, fontFamily: "inherit", fontWeight: 700,
          }}>
            ✕ Limpiar ({totalActive})
          </button>
        )}
      </div>

      {/* ORDEN */}
      <div style={{ padding: "8px 24px", borderBottom: "1px solid #0a0f1a", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "#334155", letterSpacing: "0.1em", marginRight: 4 }}>ORDENAR:</span>
        {SORT_FIELDS.map(opt => {
          const isActive = sortField === opt.value;
          return (
            <button key={opt.value} onClick={() => handleSort(opt.value)} style={{
              background: isActive ? "#3b82f622" : "#1e293b",
              border: `1px solid ${isActive ? "#3b82f6" : "#334155"}`,
              color: isActive ? "#93c5fd" : "#94a3b8",
              borderRadius: 20, padding: "4px 12px", cursor: "pointer",
              fontSize: 10, fontFamily: "inherit", letterSpacing: "0.06em",
            }}>
              {opt.label} {isActive ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
          );
        })}
      </div>

      {/* CONTENIDO */}
      <div style={{ padding: "18px 24px" }}>
        {loading && <div style={{ textAlign: "center", padding: "60px 0", color: "#334155", fontSize: 12 }}>CARGANDO DATOS...</div>}

        {!loading && error && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#ef4444", background: "#1c0a0a", borderRadius: 10, border: "1px solid #7f1d1d" }}>
            <div>⚠ No se pudo conectar con Google Sheets</div>
            <button onClick={() => fetchData(true)} style={{ marginTop: 12, background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>Reintentar</button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid-cards">
              {filtered.map(item => {
                const cfg    = ACTION_CONFIG[item.actionType] || ACTION_CONFIG.UNKNOWN;
                const qColor = qualityColor(item.qualityCo);
                return (
                  <div key={item.ticker} className="card" style={{
                    background: cfg.bg, border: `1px solid ${cfg.border}33`,
                    borderLeft: `3px solid ${cfg.border}`, borderRadius: 11,
                    padding: "15px 16px", boxShadow: `0 0 18px ${cfg.border}0d`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "#f8fafc" }}>{item.ticker}</div>
                        <div style={{ color: "#64748b", fontSize: 10, marginTop: 2, maxWidth: 150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                        {item.pais && <div style={{ color: "#334155", fontSize: 9, marginTop: 2 }}>{item.pais}</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{fmt(item.precioArs)}</div>
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{fmtU(item.precioUsd)} USD</div>
                        {item.hasDivGro && <div style={{ fontSize: 9, color: "#34d399", marginTop: 3 }}>● DIVGRO</div>}
                      </div>
                    </div>

                    <div style={{ background: "#00000033", borderRadius: 7, padding: "8px 10px", marginBottom: 10 }}>
                      <LevelBar nivelCompra={item.nivelCompra} hasNivel={item.hasNivel} />
                    </div>

                    <div style={{ height: 1, background: "#ffffff0d", marginBottom: 9 }} />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {item.yld > 0         && <Metric label="Yield"           value={`${item.yld}%`}           color="#a78bfa" />}
                      {item.divGrowth > 0   && <Metric label="Crec. Div 5A"    value={`${item.divGrowth}%`}     color="#60a5fa" />}
                      {item.salesGrowth > 0 && <Metric label="Crec. Ventas 5A" value={`${item.salesGrowth}%`}  color="#7dd3fc" />}
                      {item.qualityCo       && <Metric label="Calidad Cía"      value={item.qualityCo}           color={qColor}  />}
                      {item.qualityDiv > 0  && <Metric label="Score Div"        value={`${item.qualityDiv}/100`} color="#fb923c" />}
                    </div>
                  </div>
                );
              })}
            </div>
            {filtered.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#1e293b", fontSize: 13 }}>
                SIN RESULTADOS · PROBÁ AJUSTAR LOS FILTROS
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
