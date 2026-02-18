import { useState, useMemo, useEffect } from "react";
import { Search, RefreshCw, Wifi, WifiOff } from "lucide-react";

// ============================================================
// 🔧 CONFIGURACIÓN — SOLO TOCÁ ESTAS DOS LÍNEAS
// ============================================================
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQA-GSEGsVQ1yRtwSEIThbsitKF5Mz-ghiDEogLTuo66uaQ0W7aa-s7XkdV1jh3XT-ovAppzoO-6r3O/pub?gid=1126347347&single=true&output=csv";
const REFRESH_MINUTES = 15;
// ============================================================

const parseCSV = (text) => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));

  return lines.slice(1).map(line => {
    // Manejo básico de comas dentro de comillas
    const cols = [];
    let current = "";
    let inQuotes = false;
    for (let ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    cols.push(current.trim());

    const get = (keyword) => {
      const i = headers.findIndex(h => h.includes(keyword));
      return i >= 0 ? (cols[i] || "").trim() : "";
    };

    const ticker = get("ticker").toUpperCase().replace(/"/g, "");
    if (!ticker || ticker === "#N/A" || ticker === "") return null;

    const nivelCompra = get("nivel compra");
    const nivelVenta  = get("nivel venta");

    // Determinar acción
    const v = nivelVenta.toUpperCase();
    const c = nivelCompra.toUpperCase();
    let actionType = "NEUTRAL";
    if (v.includes("N3") || v.includes("VENTA TOTAL"))   actionType = "SELL_STRONG";
    else if (v.includes("N2") || v.includes("N1") || v.includes("POSIBLE")) actionType = "SELL_SOFT";
    else if (c.startsWith("NIVEL"))                        actionType = "BUY";

    return {
      ticker,
      name:        get("nombre"),
      pais:        get("pais"),
      precioArs:   parseFloat(get("precio ars"))            || 0,
      precioUsd:   parseFloat(get("precio usd"))            || 0,
      nivelCompra,
      nivelVenta,
      actionType,
      yld:         parseFloat(get("yield"))                 || 0,
      divGrowth:   parseFloat(get("5-year dividend"))       || 0,
      salesGrowth: parseFloat(get("5-year sales"))          || 0,
      qualityCo:   get("calidad empresa"),
      qualityDiv:  parseFloat(get("calidad dividendo"))     || 0,
    };
  }).filter(Boolean);
};

const formatArs = (v) => {
  if (!v || v <= 0) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(v);
};
const formatUsd = (v) => {
  if (!v || v <= 0) return "—";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const qualityColor = (q) => {
  if (!q) return "#6b7280";
  if (q.startsWith("AAA")) return "#059669";
  if (q.startsWith("AA"))  return "#10b981";
  if (q.startsWith("A"))   return "#3b82f6";
  return "#8b5cf6";
};

const ACTION_CONFIG = {
  BUY:        { bg: "linear-gradient(135deg,#052e16,#064e3b)", border: "#10b981", badge: "#10b981", label: "COMPRAR",     textColor: "#6ee7b7" },
  SELL_STRONG:{ bg: "linear-gradient(135deg,#1c0a0a,#450a0a)", border: "#ef4444", badge: "#ef4444", label: "VENTA TOTAL", textColor: "#fca5a5" },
  SELL_SOFT:  { bg: "linear-gradient(135deg,#1c1206,#451a03)", border: "#f97316", badge: "#f97316", label: "REDUCIR",     textColor: "#fdba74" },
  NEUTRAL:    { bg: "linear-gradient(135deg,#0f172a,#1e293b)", border: "#334155", badge: "#64748b", label: "ESPERAR",     textColor: "#94a3b8" },
};

function Metric({ label, value, color }) {
  return (
    <div style={{ background: "#ffffff05", borderRadius: 6, padding: "7px 10px" }}>
      <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em", marginBottom: 3, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

export default function App() {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [filter, setFilter]       = useState("ALL");
  const [search, setSearch]       = useState("");
  const [sortBy, setSortBy]       = useState("ticker");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch(SHEET_URL + "&t=" + Date.now()); // evita caché
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      const parsed = parseCSV(text);
      setData(parsed);
      setLastUpdate(new Date());
      setError(false);
    } catch (e) {
      console.error("Error al cargar datos:", e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), REFRESH_MINUTES * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    let list = data.filter(item => {
      const q = search.toLowerCase();
      return (
        item.ticker.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.pais.toLowerCase().includes(q)
      );
    });
    if (filter === "BUY")     list = list.filter(i => i.actionType === "BUY");
    if (filter === "SELL")    list = list.filter(i => i.actionType === "SELL_STRONG" || i.actionType === "SELL_SOFT");
    if (filter === "NEUTRAL") list = list.filter(i => i.actionType === "NEUTRAL");

    return [...list].sort((a, b) => {
      if (sortBy === "ticker")      return a.ticker.localeCompare(b.ticker);
      if (sortBy === "precioArs")   return b.precioArs - a.precioArs;
      if (sortBy === "yld")         return b.yld - a.yld;
      if (sortBy === "salesGrowth") return b.salesGrowth - a.salesGrowth;
      return 0;
    });
  }, [data, filter, search, sortBy]);

  const stats = useMemo(() => ({
    buy:        data.filter(i => i.actionType === "BUY").length,
    sellStrong: data.filter(i => i.actionType === "SELL_STRONG").length,
    sellSoft:   data.filter(i => i.actionType === "SELL_SOFT").length,
    neutral:    data.filter(i => i.actionType === "NEUTRAL").length,
  }), [data]);

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#e2e8f0", fontFamily: "'DM Mono','Courier New',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Space+Grotesk:wght@400;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
        .card{transition:transform .2s,box-shadow .2s}
        .card:hover{transform:translateY(-3px)}
        .badge-pill{font-size:10px;font-weight:700;letter-spacing:.1em;padding:3px 10px;border-radius:20px;text-transform:uppercase}
        .btn{border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:12px;letter-spacing:.08em;padding:8px 18px;border-radius:6px;transition:all .15s;text-transform:uppercase}
        input,select{font-family:inherit}
        .stat-card{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:16px 24px}
        .grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
        @media(max-width:600px){.grid-cards{grid-template-columns:1fr}.top-bar{flex-direction:column!important}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{animation:spin 1s linear infinite}
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ color: "#10b981" }}>CEDEAR</span>
            <span style={{ color: "#e2e8f0" }}>PRO</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: "#475569", marginLeft: 12, fontFamily: "DM Mono", letterSpacing: "0.1em" }}>v2.1</span>
          </div>
          <div style={{ color: "#475569", fontSize: 11, letterSpacing: "0.15em", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <span>TABLERO DE DECISIONES · {data.length} ACTIVOS</span>
            {error
              ? <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}><WifiOff size={12} /> SIN CONEXIÓN</span>
              : lastUpdate && <span style={{ color: "#334155", display: "flex", alignItems: "center", gap: 4 }}><Wifi size={12} style={{ color: "#10b981" }} /> {lastUpdate.toLocaleTimeString("es-AR")}</span>
            }
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Botón refresh manual */}
          <button className="btn" onClick={() => fetchData(true)}
            style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#64748b", padding: "10px 14px" }}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} />
          </button>

          <div className="stat-card" style={{ textAlign: "center" }}><div style={{ color: "#10b981", fontSize: 22, fontWeight: 700 }}>{stats.buy}</div><div style={{ color: "#475569", fontSize: 10, letterSpacing: "0.12em" }}>COMPRAR</div></div>
          <div className="stat-card" style={{ textAlign: "center" }}><div style={{ color: "#ef4444", fontSize: 22, fontWeight: 700 }}>{stats.sellStrong}</div><div style={{ color: "#475569", fontSize: 10, letterSpacing: "0.12em" }}>VENTA TOTAL</div></div>
          <div className="stat-card" style={{ textAlign: "center" }}><div style={{ color: "#f97316", fontSize: 22, fontWeight: 700 }}>{stats.sellSoft}</div><div style={{ color: "#475569", fontSize: 10, letterSpacing: "0.12em" }}>REDUCIR</div></div>
          <div className="stat-card" style={{ textAlign: "center" }}><div style={{ color: "#64748b", fontSize: 22, fontWeight: 700 }}>{stats.neutral}</div><div style={{ color: "#475569", fontSize: 10, letterSpacing: "0.12em" }}>ESPERAR</div></div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{ padding: "16px 32px", background: "#030712", borderBottom: "1px solid #0f172a", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }} className="top-bar">
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ticker, nombre, país..."
            style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "9px 12px 9px 38px", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#475569" }} />
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {[
            { id: "ALL",     label: "Todos",      color: "#64748b" },
            { id: "BUY",     label: "▲ Comprar",  color: "#10b981" },
            { id: "SELL",    label: "▼ Vender",   color: "#ef4444" },
            { id: "NEUTRAL", label: "◈ Esperar",  color: "#64748b" },
          ].map(f => (
            <button key={f.id} className="btn" onClick={() => setFilter(f.id)}
              style={{ background: filter === f.id ? f.color : "#0f172a", color: filter === f.id ? "#fff" : "#64748b", border: `1px solid ${filter === f.id ? f.color : "#1e293b"}` }}>
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#475569", fontSize: 11, letterSpacing: "0.1em" }}>ORDENAR:</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, color: "#94a3b8", padding: "6px 10px", fontSize: 12, fontFamily: "inherit", outline: "none" }}>
            <option value="ticker">Ticker A-Z</option>
            <option value="precioArs">Precio ARS ↓</option>
            <option value="yld">Yield ↓</option>
            <option value="salesGrowth">Crecimiento ↓</option>
          </select>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ padding: "24px 32px" }}>

        {/* Estado de carga */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.15em" }}>CARGANDO DATOS DESDE GOOGLE SHEETS...</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#ef4444", background: "#1c0a0a", borderRadius: 12, border: "1px solid #7f1d1d" }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>⚠ No se pudo conectar con Google Sheets</div>
            <div style={{ fontSize: 11, color: "#9a3412" }}>Verificá que el link CSV sea correcto y esté publicado</div>
            <button className="btn" onClick={() => fetchData(true)} style={{ marginTop: 16, background: "#7f1d1d", color: "#fca5a5", border: "none" }}>
              Reintentar
            </button>
          </div>
        )}

        {/* Cards */}
        {!loading && !error && (
          <>
            <div style={{ marginBottom: 12, color: "#475569", fontSize: 11, letterSpacing: "0.1em" }}>
              {filtered.length} ACTIVOS · ACTUALIZA CADA {REFRESH_MINUTES} MIN
            </div>
            <div className="grid-cards">
              {filtered.map(item => {
                const cfg = ACTION_CONFIG[item.actionType];
                const qColor = qualityColor(item.qualityCo);
                return (
                  <div key={item.ticker} className="card"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}33`, borderLeft: `3px solid ${cfg.border}`, borderRadius: 12, padding: "18px 20px", boxShadow: `0 0 20px ${cfg.border}0d` }}>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "#f8fafc" }}>{item.ticker}</div>
                        <div style={{ color: "#64748b", fontSize: 11, marginTop: 2, maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{formatArs(item.precioArs)}</div>
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{formatUsd(item.precioUsd)} USD</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                      <span className="badge-pill" style={{ background: cfg.badge + "22", color: cfg.textColor, border: `1px solid ${cfg.badge}55` }}>
                        {cfg.label}
                      </span>
                      {item.nivelCompra && item.nivelCompra !== "E" && item.nivelCompra !== "#N/A" && (
                        <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.08em" }}>{item.nivelCompra}</span>
                      )}
                      {item.nivelVenta && item.nivelVenta !== "#N/A" && (
                        <span style={{ fontSize: 10, color: cfg.textColor, opacity: 0.7 }}>{item.nivelVenta}</span>
                      )}
                    </div>

                    <div style={{ height: 1, background: "#ffffff0d", marginBottom: 12 }} />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {item.yld > 0         && <Metric label="Yield"          value={`${item.yld}%`}           color="#a78bfa" />}
                      {item.divGrowth > 0   && <Metric label="Crec. Div 5A"   value={`${item.divGrowth}%`}     color="#60a5fa" />}
                      {item.salesGrowth > 0 && <Metric label="Crec. Ventas 5A" value={`${item.salesGrowth}%`} color="#34d399" />}
                      {item.qualityCo       && <Metric label="Calidad Cía"     value={item.qualityCo}           color={qColor}  />}
                      {item.qualityDiv > 0  && <Metric label="Score Div"       value={`${item.qualityDiv}/100`} color="#fb923c" />}
                      {item.pais && item.pais !== "No encontrado" && <Metric label="País" value={item.pais} color="#94a3b8" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#334155", fontSize: 14, letterSpacing: "0.1em" }}>
                SIN RESULTADOS PARA ESA BÚSQUEDA
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
