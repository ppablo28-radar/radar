import { useState, useMemo, useEffect } from "react";
import { Search, RefreshCw, Wifi, WifiOff, ChevronDown, X } from "lucide-react";

// ============================================================
// 🔧 CONFIGURACIÓN
// ============================================================
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQA-GSEGsVQ1yRtwSEIThbsitKF5Mz-ghiDEogLTuo66uaQ0W7aa-s7XkdV1jh3XT-ovAppzoO-6r3O/pub?gid=1126347347&single=true&output=csv";
const REFRESH_MINUTES = 15;
// ============================================================

// ─── Parser CSV ──────────────────────────────────────────────
const parseCSV = (text) => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));

  return lines.slice(1).map(line => {
    const cols = [];
    let cur = "", inQ = false;
    for (let ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());

    const get = (kw) => {
      const i = headers.findIndex(h => h.includes(kw));
      return i >= 0 ? (cols[i] || "").trim().replace(/"/g, "") : "";
    };

    const ticker = get("ticker").toUpperCase();
    if (!ticker || ticker === "#N/A" || ticker === "") return null;

    const nivelCompra = get("nivel compra");
    const nivelVenta  = get("nivel venta");
    const rawPais     = get("pais");
    const pais        = (!rawPais || rawPais === "No encontrado") ? "" : rawPais;

    // Detectar si realmente hay nivel definido
    const hasNivel = (nivelCompra && nivelCompra !== "#N/A" && nivelCompra !== "") ||
                     (nivelVenta  && nivelVenta  !== "#N/A" && nivelVenta  !== "");

    const v = nivelVenta.toUpperCase();
    const c = nivelCompra.toUpperCase();
    let actionType = hasNivel ? "NEUTRAL" : "UNKNOWN";
    if (v.includes("N3") || v.includes("VENTA TOTAL"))                   actionType = "SELL_STRONG";
    else if (v.includes("N2") || v.includes("N1") || v.includes("POSIBLE")) actionType = "SELL_SOFT";
    else if (c.startsWith("NIVEL"))                                       actionType = "BUY";

    const rawQCo  = get("calidad empresa");
    const qualityCo = (!rawQCo || rawQCo === "No encontrado" || rawQCo === "#N/A") ? "" : rawQCo;
    const rawQDiv   = get("calidad dividendo");
    const qualityDiv = parseFloat(rawQDiv) || 0;

    // divgro: nueva columna
    const rawDivGro = get("divgro");
    const divGro    = parseFloat(rawDivGro) || 0;

    return {
      ticker,
      name:        get("nombre"),
      pais,
      precioArs:   parseFloat(get("precio ars"))       || 0,
      precioUsd:   parseFloat(get("precio usd"))       || 0,
      nivelCompra,
      nivelVenta,
      actionType,
      hasNivel,
      yld:         parseFloat(get("yield"))            || 0,
      divGrowth:   parseFloat(get("5-year dividend"))  || 0,
      salesGrowth: parseFloat(get("5-year sales"))     || 0,
      divGro,
      qualityCo,
      qualityDiv,
    };
  }).filter(Boolean);
};

// ─── Escala de niveles ───────────────────────────────────────
const SCALE = [
  { label: "Venta Total",   color: "#ef4444", dimColor: "#2d0a0a" },
  { label: "Vender Mitad",  color: "#f87171", dimColor: "#2d0a0a" },
  { label: "Posible Venta", color: "#fca5a5", dimColor: "#2d0a0a" },
  { label: "Esperar",       color: "#94a3b8", dimColor: "#1e293b" },
  { label: "Nivel 1",       color: "#d1fae5", dimColor: "#052e16" },
  { label: "Nivel 2",       color: "#a7f3d0", dimColor: "#052e16" },
  { label: "Nivel 3",       color: "#6ee7b7", dimColor: "#052e16" },
  { label: "Nivel 4",       color: "#34d399", dimColor: "#052e16" },
  { label: "Nivel 5",       color: "#10b981", dimColor: "#052e16" },
  { label: "Nivel 6",       color: "#059669", dimColor: "#052e16" },
  { label: "Nivel 7",       color: "#047857", dimColor: "#052e16" },
  { label: "Nivel 8",       color: "#065f46", dimColor: "#022c22" },
];

const parseActiveIndex = (nivelCompra, nivelVenta) => {
  const v = (nivelVenta  || "").toUpperCase();
  const c = (nivelCompra || "").toUpperCase();
  if (v.includes("N3") || v.includes("VENTA TOTAL"))      return 0;
  if (v.includes("N2"))                                    return 1;
  if (v.includes("N1") || v.includes("POSIBLE"))           return 2;
  const m = c.match(/NIVEL\s*(\d+)/);
  if (m) { const n = parseInt(m[1]); if (n >= 1 && n <= 8) return 3 + n; }
  return 3;
};

function LevelBar({ nivelCompra, nivelVenta, hasNivel }) {
  if (!hasNivel) return (
    <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.1em", padding: "6px 0" }}>
      SIN DATOS DE NIVEL
    </div>
  );

  const activeIdx = parseActiveIndex(nivelCompra, nivelVenta);
  const active    = SCALE[activeIdx];

  return (
    <div>
      <div style={{ fontSize: 10, color: active.color, letterSpacing: "0.1em", marginBottom: 7, fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: active.color, display: "inline-block", boxShadow: `0 0 6px ${active.color}` }} />
        {active.label}
      </div>
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        {SCALE.map((step, idx) => {
          const isActive = idx === activeIdx;
          const gapLeft  = (idx === 3 || idx === 4) ? 8 : 0;
          return (
            <div key={idx} title={step.label} style={{
              marginLeft: gapLeft,
              width:  isActive ? 20 : 13,
              height: isActive ? 24 : 14,
              borderRadius: isActive ? 5 : 3,
              background: isActive ? step.color : step.dimColor,
              border: isActive ? `1.5px solid ${step.color}` : `1px solid ${step.color}30`,
              boxShadow: isActive ? `0 0 10px ${step.color}cc, 0 0 20px ${step.color}55` : "none",
              flexShrink: 0, transition: "all 0.2s",
            }} />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: 8, color: "#ef444450", letterSpacing: "0.08em" }}>◀ VENTA</span>
        <span style={{ fontSize: 8, color: "#10b98150", letterSpacing: "0.08em" }}>MEJOR COMPRA ▶</span>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────
const formatArs = (v) => (!v || v <= 0) ? "—" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(v);
const formatUsd = (v) => (!v || v <= 0) ? "—" : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qualityColor = (q) => {
  if (!q) return "#6b7280";
  if (q.startsWith("AAA")) return "#059669";
  if (q.startsWith("AA"))  return "#10b981";
  if (q.startsWith("A"))   return "#3b82f6";
  return "#8b5cf6";
};

const ACTION_CONFIG = {
  BUY:         { bg: "linear-gradient(135deg,#052e16,#064e3b)", border: "#10b981", label: "COMPRAR",     textColor: "#6ee7b7" },
  SELL_STRONG: { bg: "linear-gradient(135deg,#1c0a0a,#450a0a)", border: "#ef4444", label: "VENTA TOTAL", textColor: "#fca5a5" },
  SELL_SOFT:   { bg: "linear-gradient(135deg,#1c1206,#451a03)", border: "#f97316", label: "REDUCIR",     textColor: "#fdba74" },
  NEUTRAL:     { bg: "linear-gradient(135deg,#0f172a,#1e293b)", border: "#475569", label: "ESPERAR",     textColor: "#94a3b8" },
  UNKNOWN:     { bg: "linear-gradient(135deg,#0a0a0f,#111827)", border: "#1e293b", label: "",            textColor: "#334155" },
};

function Metric({ label, value, color }) {
  return (
    <div style={{ background: "#ffffff05", borderRadius: 6, padding: "7px 10px" }}>
      <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em", marginBottom: 3, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

// ─── Componente FilterDropdown ────────────────────────────────
function FilterDropdown({ label, options, selected, onChange, color = "#64748b" }) {
  const [open, setOpen] = useState(false);
  const hasActive = selected.length > 0;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: hasActive ? color + "22" : "#0f172a",
          border: `1px solid ${hasActive ? color : "#1e293b"}`,
          borderRadius: 6, padding: "7px 12px", cursor: "pointer",
          color: hasActive ? color : "#64748b", fontSize: 11,
          fontFamily: "inherit", fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", whiteSpace: "nowrap",
        }}
      >
        {label}{hasActive ? ` (${selected.length})` : ""}
        <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
          background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8,
          padding: "6px", minWidth: 180, boxShadow: "0 8px 32px #000a",
        }}>
          {options.map(opt => {
            const isOn = selected.includes(opt.value);
            return (
              <div key={opt.value}
                onClick={() => {
                  onChange(isOn ? selected.filter(x => x !== opt.value) : [...selected, opt.value]);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: 5, cursor: "pointer",
                  background: isOn ? color + "22" : "transparent",
                  color: isOn ? color : "#94a3b8", fontSize: 12,
                  transition: "background 0.15s",
                }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${isOn ? color : "#334155"}`,
                  background: isOn ? color : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isOn && <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>✓</span>}
                </span>
                {opt.label}
              </div>
            );
          })}
          {selected.length > 0 && (
            <div onClick={() => onChange([])}
              style={{ padding: "6px 10px", marginTop: 4, borderTop: "1px solid #1e293b", cursor: "pointer", color: "#ef4444", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
              <X size={11} /> Limpiar filtro
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SortRow ─────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "ticker",      label: "Ticker A-Z"       },
  { value: "precioArs",   label: "Precio ARS ↓"     },
  { value: "yld",         label: "Yield ↓"           },
  { value: "salesGrowth", label: "Crec. Ventas ↓"   },
  { value: "divGrowth",   label: "Crec. Div ↓"      },
  { value: "divGro",      label: "DivGro ↓"         },
  { value: "qualityDiv",  label: "Score Div ↓"      },
];

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [search, setSearch]           = useState("");
  const [filterAccion, setFilterAccion] = useState([]);   // BUY / SELL_STRONG / SELL_SOFT / NEUTRAL
  const [filterPais, setFilterPais]   = useState([]);
  const [filterQCo, setFilterQCo]     = useState([]);
  const [filterQDiv, setFilterQDiv]   = useState([]);     // rangos: "90-100", "70-89", "50-69", "<50"
  const [filterDivGro, setFilterDivGro] = useState([]);   // rangos numéricos

  // Ordenamiento múltiple: array de { field, dir }
  const [sorts, setSorts] = useState([{ field: "ticker", dir: "asc" }]);

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch(SHEET_URL + "&t=" + Date.now());
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      setData(parseCSV(text));
      setLastUpdate(new Date());
      setError(false);
    } catch (e) {
      console.error(e);
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

  // Opciones dinámicas de filtros
  const paisOptions = useMemo(() =>
    [...new Set(data.map(d => d.pais).filter(Boolean))].sort()
      .map(p => ({ value: p, label: p })), [data]);

  const qCoOptions = useMemo(() =>
    [...new Set(data.map(d => d.qualityCo).filter(Boolean))].sort()
      .map(q => ({ value: q, label: q })), [data]);

  const qDivRanges = [
    { value: "90-100", label: "90 – 100" },
    { value: "70-89",  label: "70 – 89"  },
    { value: "50-69",  label: "50 – 69"  },
    { value: "<50",    label: "< 50"     },
  ];
  const divGroRanges = [
    { value: ">15",   label: "> 15%"    },
    { value: "10-15", label: "10 – 15%" },
    { value: "5-9",   label: "5 – 9%"  },
    { value: "<5",    label: "< 5%"    },
  ];

  const inQDivRange = (val, ranges) => ranges.some(r => {
    if (r === "90-100") return val >= 90;
    if (r === "70-89")  return val >= 70 && val < 90;
    if (r === "50-69")  return val >= 50 && val < 70;
    if (r === "<50")    return val > 0 && val < 50;
    return false;
  });

  const inDivGroRange = (val, ranges) => ranges.some(r => {
    if (r === ">15")   return val > 15;
    if (r === "10-15") return val >= 10 && val <= 15;
    if (r === "5-9")   return val >= 5 && val < 10;
    if (r === "<5")    return val > 0 && val < 5;
    return false;
  });

  // Comparador multi-sort
  const multiSort = (a, b) => {
    for (const s of sorts) {
      let va = a[s.field], vb = b[s.field];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return s.dir === "asc" ? -1 : 1;
      if (va > vb) return s.dir === "asc" ? 1 : -1;
    }
    return 0;
  };

  const filtered = useMemo(() => {
    let list = data.filter(item => {
      const q = search.toLowerCase();
      if (q && !item.ticker.toLowerCase().includes(q) && !item.name.toLowerCase().includes(q) && !item.pais.toLowerCase().includes(q)) return false;
      if (filterAccion.length  && !filterAccion.includes(item.actionType)) return false;
      if (filterPais.length    && !filterPais.includes(item.pais))         return false;
      if (filterQCo.length     && !filterQCo.includes(item.qualityCo))     return false;
      if (filterQDiv.length    && !inQDivRange(item.qualityDiv, filterQDiv))   return false;
      if (filterDivGro.length  && !inDivGroRange(item.divGro, filterDivGro))   return false;
      return true;
    });
    return list.sort(multiSort);
  }, [data, search, filterAccion, filterPais, filterQCo, filterQDiv, filterDivGro, sorts]);

  const stats = useMemo(() => ({
    buy:        data.filter(i => i.actionType === "BUY").length,
    sellStrong: data.filter(i => i.actionType === "SELL_STRONG").length,
    sellSoft:   data.filter(i => i.actionType === "SELL_SOFT").length,
    neutral:    data.filter(i => i.actionType === "NEUTRAL").length,
  }), [data]);

  const totalActiveFilters = filterAccion.length + filterPais.length + filterQCo.length + filterQDiv.length + filterDivGro.length;

  // Manejar sort: click en campo → si ya existe cambia dir, si no agrega
  const handleSort = (field) => {
    setSorts(prev => {
      const existing = prev.find(s => s.field === field);
      if (existing) {
        if (existing.dir === "asc") return prev.map(s => s.field === field ? { ...s, dir: "desc" } : s);
        return prev.filter(s => s.field !== field); // tercer click = quitar
      }
      return [...prev, { field, dir: "desc" }];
    });
  };

  const clearAllFilters = () => {
    setFilterAccion([]); setFilterPais([]); setFilterQCo([]);
    setFilterQDiv([]); setFilterDivGro([]); setSearch("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#e2e8f0", fontFamily: "'DM Mono','Courier New',monospace" }}
      onClick={() => {}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Space+Grotesk:wght@400;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
        .card{transition:transform .2s,box-shadow .2s}
        .card:hover{transform:translateY(-3px)}
        .btn{border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:11px;letter-spacing:.08em;padding:7px 14px;border-radius:6px;transition:all .15s;text-transform:uppercase}
        input,select{font-family:inherit}
        .stat-card{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:12px 18px}
        .grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
        @media(max-width:768px){.grid-cards{grid-template-columns:1fr}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{animation:spin 1s linear infinite}
        .sort-chip{display:inline-flex;align-items:center;gap:4px;background:#1e293b;border:1px solid #334155;border-radius:20px;padding:4px 10px;font-size:10px;color:#94a3b8;cursor:pointer;transition:all .15s;letter-spacing:.06em}
        .sort-chip:hover{border-color:#475569;color:#e2e8f0}
        .sort-chip.active{background:#3b82f622;border-color:#3b82f6;color:#93c5fd}
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: "-0.04em", display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ color: "#10b981" }}>CEDEAR</span><span style={{ color: "#e2e8f0" }}>PRO</span>
            <span style={{ fontSize: 10, fontWeight: 400, color: "#475569", marginLeft: 10, letterSpacing: "0.1em" }}>v3.0</span>
          </div>
          <div style={{ color: "#475569", fontSize: 10, letterSpacing: "0.15em", marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
            <span>TABLERO · {data.length} ACTIVOS</span>
            {error
              ? <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}><WifiOff size={11}/> SIN CONEXIÓN</span>
              : lastUpdate && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Wifi size={11} style={{ color: "#10b981" }}/>{lastUpdate.toLocaleTimeString("es-AR")}</span>
            }
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={() => fetchData(true)} style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#64748b", padding: "9px 12px" }}>
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
          </button>
          {[
            { v: stats.buy,        c: "#10b981", l: "COMPRAR"     },
            { v: stats.sellStrong, c: "#ef4444", l: "VENTA TOTAL" },
            { v: stats.sellSoft,   c: "#f97316", l: "REDUCIR"     },
            { v: stats.neutral,    c: "#64748b", l: "ESPERAR"     },
          ].map(s => (
            <div key={s.l} className="stat-card" style={{ textAlign: "center" }}>
              <div style={{ color: s.c, fontSize: 20, fontWeight: 700 }}>{s.v}</div>
              <div style={{ color: "#475569", fontSize: 9, letterSpacing: "0.12em" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={{ padding: "14px 28px", borderBottom: "1px solid #0f172a", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>

        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 280 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ticker, nombre, país..."
            style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 7, padding: "8px 12px 8px 34px", color: "#e2e8f0", fontSize: 12, outline: "none" }} />
          <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#475569" }} />
        </div>

        {/* Filtro Acción */}
        <FilterDropdown
          label="Acción"
          color="#10b981"
          options={[
            { value: "BUY",         label: "▲ Comprar"     },
            { value: "SELL_STRONG", label: "▼ Venta Total" },
            { value: "SELL_SOFT",   label: "▽ Reducir"     },
            { value: "NEUTRAL",     label: "◈ Esperar"     },
          ]}
          selected={filterAccion}
          onChange={setFilterAccion}
        />

        {/* Filtro País */}
        <FilterDropdown
          label="País"
          color="#60a5fa"
          options={paisOptions}
          selected={filterPais}
          onChange={setFilterPais}
        />

        {/* Filtro Calidad Cía */}
        <FilterDropdown
          label="Calidad Cía"
          color="#a78bfa"
          options={qCoOptions}
          selected={filterQCo}
          onChange={setFilterQCo}
        />

        {/* Filtro Score Div */}
        <FilterDropdown
          label="Score Div"
          color="#fb923c"
          options={qDivRanges}
          selected={filterQDiv}
          onChange={setFilterQDiv}
        />

        {/* Filtro DivGro */}
        <FilterDropdown
          label="DivGro"
          color="#34d399"
          options={divGroRanges}
          selected={filterDivGro}
          onChange={setFilterDivGro}
        />

        {/* Limpiar todo */}
        {totalActiveFilters > 0 && (
          <button className="btn" onClick={clearAllFilters}
            style={{ background: "#ef444422", border: "1px solid #ef444455", color: "#f87171", display: "flex", alignItems: "center", gap: 5 }}>
            <X size={11}/> Limpiar ({totalActiveFilters})
          </button>
        )}
      </div>

      {/* BARRA DE ORDEN */}
      <div style={{ padding: "10px 28px", borderBottom: "1px solid #0a0f1a", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "#334155", letterSpacing: "0.12em", marginRight: 4 }}>ORDENAR POR:</span>
        {SORT_OPTIONS.map(opt => {
          const sortEntry = sorts.find(s => s.field === opt.value);
          const isActive  = !!sortEntry;
          const priority  = sorts.findIndex(s => s.field === opt.value) + 1;
          return (
            <div key={opt.value}
              className={`sort-chip ${isActive ? "active" : ""}`}
              onClick={() => handleSort(opt.value)}
            >
              {opt.label}
              {isActive && <>
                <span style={{ fontSize: 9, opacity: 0.7 }}>{sortEntry.dir === "asc" ? "↑" : "↓"}</span>
                {sorts.length > 1 && <span style={{ fontSize: 8, background: "#3b82f6", color: "#fff", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{priority}</span>}
              </>}
            </div>
          );
        })}
        {sorts.length > 0 && (
          <div className="sort-chip" onClick={() => setSorts([{ field: "ticker", dir: "asc" }])}
            style={{ color: "#475569" }}>
            <X size={10}/> Reset orden
          </div>
        )}
      </div>

      {/* CONTENIDO */}
      <div style={{ padding: "20px 28px" }}>
        {loading && <div style={{ textAlign: "center", padding: "80px 0", color: "#334155", fontSize: 12, letterSpacing: "0.15em" }}>CARGANDO DATOS DESDE GOOGLE SHEETS...</div>}

        {!loading && error && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#ef4444", background: "#1c0a0a", borderRadius: 12, border: "1px solid #7f1d1d" }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>⚠ No se pudo conectar con Google Sheets</div>
            <div style={{ fontSize: 11, color: "#9a3412" }}>Verificá que el link CSV sea correcto y esté publicado</div>
            <button className="btn" onClick={() => fetchData(true)} style={{ marginTop: 16, background: "#7f1d1d", color: "#fca5a5", border: "none" }}>Reintentar</button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div style={{ marginBottom: 12, color: "#334155", fontSize: 10, letterSpacing: "0.1em" }}>
              {filtered.length} de {data.length} ACTIVOS · ACTUALIZA CADA {REFRESH_MINUTES} MIN
            </div>
            <div className="grid-cards">
              {filtered.map(item => {
                const cfg    = ACTION_CONFIG[item.actionType] || ACTION_CONFIG.UNKNOWN;
                const qColor = qualityColor(item.qualityCo);
                return (
                  <div key={item.ticker} className="card"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}33`, borderLeft: `3px solid ${cfg.border}`, borderRadius: 12, padding: "16px 18px", boxShadow: `0 0 20px ${cfg.border}0d` }}>

                    {/* Ticker + precio */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", color: "#f8fafc" }}>{item.ticker}</div>
                        <div style={{ color: "#64748b", fontSize: 10, marginTop: 2, maxWidth: 155, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                        {item.pais && <div style={{ color: "#334155", fontSize: 9, marginTop: 2, letterSpacing: "0.06em" }}>{item.pais}</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{formatArs(item.precioArs)}</div>
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{formatUsd(item.precioUsd)} USD</div>
                      </div>
                    </div>

                    {/* Barra de niveles */}
                    <div style={{ background: "#00000033", borderRadius: 8, padding: "9px 11px", marginBottom: 11 }}>
                      <LevelBar nivelCompra={item.nivelCompra} nivelVenta={item.nivelVenta} hasNivel={item.hasNivel} />
                    </div>

                    <div style={{ height: 1, background: "#ffffff0d", marginBottom: 10 }} />

                    {/* Métricas */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                      {item.yld > 0         && <Metric label="Yield"            value={`${item.yld}%`}           color="#a78bfa" />}
                      {item.divGrowth > 0   && <Metric label="Crec. Div 5A"     value={`${item.divGrowth}%`}     color="#60a5fa" />}
                      {item.divGro > 0      && <Metric label="DivGro"           value={`${item.divGro}%`}        color="#34d399" />}
                      {item.salesGrowth > 0 && <Metric label="Crec. Ventas 5A"  value={`${item.salesGrowth}%`}  color="#7dd3fc" />}
                      {item.qualityCo       && <Metric label="Calidad Cía"       value={item.qualityCo}           color={qColor}  />}
                      {item.qualityDiv > 0  && <Metric label="Score Div"         value={`${item.qualityDiv}/100`} color="#fb923c" />}
                    </div>
                  </div>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#1e293b", fontSize: 13, letterSpacing: "0.1em" }}>
                SIN RESULTADOS · PROBÁ AJUSTAR LOS FILTROS
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
