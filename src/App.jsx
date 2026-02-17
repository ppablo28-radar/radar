import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Zap, Shield, PieChart, BarChart3, Search, AlertCircle, Globe, DollarSign, Activity } from 'lucide-react';

const RAW_DATA = [
  { ticker: 'AAPL', name: 'Apple Inc', pais: 'Estados Unidos', precioArs: 18950, nivelCompra: 'E', nivelVenta: '', precioUsd: 266.13, alerta: '1', yield: 0.41, divGrowth: 5.1, salesGrowth: 9.99, qualityCo: 'AA+', qualityDiv: 99 },
  { ticker: 'ACN', name: 'Accenture Plc', pais: 'Irlanda', precioArs: 4420, nivelCompra: 'Nivel 8', nivelVenta: '', precioUsd: 220.52, alerta: '4', yield: 2.91, divGrowth: 13.7, salesGrowth: 9.33, qualityCo: 'AA-', qualityDiv: 92 },
  { ticker: 'ADP', name: 'Automatic Data Processing', pais: 'Estados Unidos', precioArs: 52225, nivelCompra: 'Nivel 8', nivelVenta: '', precioUsd: 212.34, alerta: '', yield: 3.21, divGrowth: 11.3, salesGrowth: 10.51, qualityCo: 'AA-', qualityDiv: 90 },
  { ticker: 'AMAT', name: 'Applied Materials Inc', pais: 'Estados Unidos', precioArs: 105125, nivelCompra: 'E', nivelVenta: 'N3 Venta total', precioUsd: 360.42, alerta: '', yield: 0.52, divGrowth: 15.4, salesGrowth: 13.81, qualityCo: 'A', qualityDiv: 86 },
  { ticker: 'AMX', name: 'America Movil SAB de CV', pais: 'México', precioArs: 34860, nivelCompra: 'E', nivelVenta: 'N3 Venta total', precioUsd: 24.27, alerta: '', yield: 0, divGrowth: 0, salesGrowth: 4, qualityCo: '', qualityDiv: 0 },
  { ticker: 'ASML', name: 'ASML Holding NV', pais: 'Países Bajos', precioArs: 14250, nivelCompra: 'E', nivelVenta: 'N3 Venta total', precioUsd: 1423.82, alerta: '1', yield: 0.54, divGrowth: 22.2, salesGrowth: 0, qualityCo: '', qualityDiv: 82 },
  { ticker: 'ATO', name: 'Atmos Energy Corp', pais: 'Estados Unidos', precioArs: 0, nivelCompra: 'E', nivelVenta: 'N2 Vender mitad', precioUsd: 180.44, alerta: '', yield: 2.23, divGrowth: 8.6, salesGrowth: 0, qualityCo: 'A-', qualityDiv: 97 },
  { ticker: 'AVGO', name: 'Broadcom Inc', pais: 'Estados Unidos', precioArs: 12290, nivelCompra: 'E', nivelVenta: '', precioUsd: 332.52, alerta: '', yield: 0.8, divGrowth: 12.6, salesGrowth: 19.85, qualityCo: 'A-', qualityDiv: 67 },
  { ticker: 'COST', name: 'Costco Wholesale Corp', pais: 'Estados Unidos', precioArs: 31180, nivelCompra: 'Nivel 2', nivelVenta: '', precioUsd: 1015.02, alerta: '', yield: 0.51, divGrowth: 12.8, salesGrowth: 12.15, qualityCo: 'AA', qualityDiv: 99 },
  { ticker: 'CVX', name: 'Chevron Corp', pais: 'Estados Unidos', precioArs: 16680, nivelCompra: 'E', nivelVenta: 'N1 Posible venta', precioUsd: 180.4, alerta: '', yield: 3.88, divGrowth: 5.8, salesGrowth: 0, qualityCo: 'AA-', qualityDiv: 90 },
  { ticker: 'DEO', name: 'Diageo PLC', pais: 'Reino Unido', precioArs: 24440, nivelCompra: 'E', nivelVenta: '', precioUsd: 96.9, alerta: '', yield: 4.1, divGrowth: 8.2, salesGrowth: 6.83, qualityCo: 'A-', qualityDiv: 90 },
  { ticker: 'FXI', name: 'iShares China Large-Cap ETF', pais: 'Estados Unidos', precioArs: 11270, nivelCompra: 'E', nivelVenta: 'N1 Posible venta', precioUsd: 38.63, alerta: '', yield: 0, divGrowth: 0, salesGrowth: 0, qualityCo: '', qualityDiv: 0 },
  { ticker: 'GOOGL', name: 'Alphabet Inc Class A', pais: 'Estados Unidos', precioArs: 7770, nivelCompra: 'E', nivelVenta: 'N2 Vender mitad', precioUsd: 302.64, alerta: '', yield: 0.27, divGrowth: 0, salesGrowth: 0, qualityCo: 'AA+', qualityDiv: 80 },
  { ticker: 'HD', name: 'Home Depot Inc', pais: 'Estados Unidos', precioArs: 17990, nivelCompra: 'Nivel 3', nivelVenta: '', precioUsd: 381.72, alerta: '', yield: 2.35, divGrowth: 10.2, salesGrowth: 0, qualityCo: 'A', qualityDiv: 87 },
  { ticker: 'HSY', name: 'Hershey Co', pais: 'Estados Unidos', precioArs: 8190, nivelCompra: 'E', nivelVenta: '', precioUsd: 215.54, alerta: '', yield: 2.61, divGrowth: 11.7, salesGrowth: 0, qualityCo: 'A', qualityDiv: 80 },
  { ticker: 'IBB', name: 'iShares Biotechnology ETF', pais: 'Estados Unidos', precioArs: 9420, nivelCompra: 'E', nivelVenta: 'N2 Vender mitad', precioUsd: 174.43, alerta: '1', yield: 0, divGrowth: 0, salesGrowth: 0, qualityCo: '', qualityDiv: 0 },
  { ticker: 'IBIT', name: 'iShares Bitcoin Trust ETF', pais: 'Estados Unidos', precioArs: 5770, nivelCompra: 'Nivel 8', nivelVenta: '', precioUsd: 38.6, alerta: '', yield: 0, divGrowth: 0, salesGrowth: 0, qualityCo: '', qualityDiv: 0 },
  { ticker: 'IEUR', name: 'iShares Core MSCI Europe ETF', pais: 'Estados Unidos', precioArs: 10050, nivelCompra: 'E', nivelVenta: 'N3 Venta total', precioUsd: 75.63, alerta: '1', yield: 0, divGrowth: 0, salesGrowth: 0, qualityCo: '', qualityDiv: 0 },
  { ticker: 'IVE', name: 'iShares S&P 500 Value ETF', pais: 'Estados Unidos', precioArs: 8090, nivelCompra: 'E', nivelVenta: 'N2 Vender mitad', precioUsd: 220.4, alerta: '', yield: 0, divGrowth: 0, salesGrowth: 0, qualityCo: '', qualityDiv: 0 },
  { ticker: 'KO', name: 'Coca-Cola Co', pais: 'Estados Unidos', precioArs: 23190, nivelCompra: 'E', nivelVenta: 'N2 Vender mitad', precioUsd: 79.24, alerta: '', yield: 2.59, divGrowth: 4.5, salesGrowth: 0, qualityCo: 'A+', qualityDiv: 80 },
  { ticker: 'LLY', name: 'Eli Lilly And Co', pais: 'Estados Unidos', precioArs: 23100, nivelCompra: 'E', nivelVenta: '', precioUsd: 1045.29, alerta: '3', yield: 0.67, divGrowth: 15.2, salesGrowth: 26.55, qualityCo: 'A+', qualityDiv: 96 },
  { ticker: 'LMT', name: 'Lockheed Martin Corp', pais: 'Estados Unidos', precioArs: 47980, nivelCompra: 'E', nivelVenta: 'N2 Vender mitad', precioUsd: 653.45, alerta: '', yield: 2.11, divGrowth: 6.4, salesGrowth: 0, qualityCo: 'A-', qualityDiv: 80 },
  { ticker: 'MA', name: 'Mastercard Inc', pais: 'Estados Unidos', precioArs: 23190, nivelCompra: 'Nivel 6', nivelVenta: '', precioUsd: 523.09, alerta: '', yield: 0.67, divGrowth: 13.9, salesGrowth: 15.45, qualityCo: 'A+', qualityDiv: 99 },
  { ticker: 'MCD', name: "McDonald's Corp", pais: 'Estados Unidos', precioArs: 20080, nivelCompra: 'E', nivelVenta: 'N1 Posible venta', precioUsd: 326.17, alerta: '', yield: 2.27, divGrowth: 7.3, salesGrowth: 0, qualityCo: '', qualityDiv: 77 },
  { ticker: 'MELI', name: 'MercadoLibre Inc', pais: 'UR', precioArs: 24190, nivelCompra: 'Nivel 5', nivelVenta: '', precioUsd: 1966.45, alerta: '', yield: 0, divGrowth: 0, salesGrowth: 0, qualityCo: '', qualityDiv: 0 },
  { ticker: 'MRSH', name: 'Marsh & McLennan Companies', pais: 'Estados Unidos', precioArs: 16030, nivelCompra: 'Nivel 8', nivelVenta: '', precioUsd: 176, alerta: '', yield: 2.07, divGrowth: 13.7, salesGrowth: 11.39, qualityCo: 'A-', qualityDiv: 80 },
  { ticker: 'MSFT', name: 'Microsoft Corp', pais: 'Estados Unidos', precioArs: 19700, nivelCompra: 'Nivel 7', nivelVenta: '', precioUsd: 396.95, alerta: '', yield: 0.91, divGrowth: 10.2, salesGrowth: 16.22, qualityCo: 'AAA', qualityDiv: 99 },
  { ticker: 'MSI', name: 'Motorola Solutions Inc', pais: 'Estados Unidos', precioArs: 33680, nivelCompra: 'Nivel 2', nivelVenta: '', precioUsd: 464.48, alerta: '', yield: 1.05, divGrowth: 11.2, salesGrowth: 9.77, qualityCo: '', qualityDiv: 61 },
  { ticker: 'NKE', name: 'Nike Inc', pais: 'Estados Unidos', precioArs: 7710, nivelCompra: 'E', nivelVenta: '', precioUsd: 64.44, alerta: '', yield: 2.6, divGrowth: 10.5, salesGrowth: 9.35, qualityCo: 'A+', qualityDiv: 70 },
  { ticker: 'NVDA', name: 'NVIDIA Corp', pais: 'Estados Unidos', precioArs: 11230, nivelCompra: 'E', nivelVenta: '', precioUsd: 185.46, alerta: '', yield: 0.02, divGrowth: 16.3, salesGrowth: 73.64, qualityCo: 'AA-', qualityDiv: 89 },
  { ticker: 'ORCL', name: 'Oracle Corp', pais: 'Estados Unidos', precioArs: 78900, nivelCompra: 'Nivel 6', nivelVenta: '', precioUsd: 154.65, alerta: '', yield: 1.25, divGrowth: 13.4, salesGrowth: 9.41, qualityCo: '', qualityDiv: 50 },
  { ticker: 'PCAR', name: 'PACCAR Inc', pais: 'Estados Unidos', precioArs: 61950, nivelCompra: 'E', nivelVenta: '', precioUsd: 127.13, alerta: '', yield: 1.04, divGrowth: 9.2, salesGrowth: 10.67, qualityCo: 'A+', qualityDiv: 81 },
  { ticker: 'PG', name: 'Procter & Gamble Co', pais: 'Estados Unidos', precioArs: 15740, nivelCompra: 'Nivel 1', nivelVenta: '', precioUsd: 159.63, alerta: '', yield: 2.64, divGrowth: 6.1, salesGrowth: 4.88, qualityCo: 'AA-', qualityDiv: 99 },
  { ticker: 'QCOM', name: 'Qualcomm Inc', pais: 'Estados Unidos', precioArs: 18880, nivelCompra: 'Nivel 6', nivelVenta: '', precioUsd: 142.99, alerta: '', yield: 2.53, divGrowth: 6.5, salesGrowth: 0, qualityCo: 'A', qualityDiv: 80 },
  { ticker: 'SNA', name: 'Snap-On Inc', pais: 'Estados Unidos', precioArs: 94250, nivelCompra: 'E', nivelVenta: '', precioUsd: 381.65, alerta: '', yield: 2.54, divGrowth: 14.7, salesGrowth: 0, qualityCo: 'A-', qualityDiv: 99 },
  { ticker: 'TJX', name: 'TJX Companies Inc', pais: 'Estados Unidos', precioArs: 10260, nivelCompra: 'E', nivelVenta: 'N1 Posible venta', precioUsd: 154.83, alerta: '', yield: 1.1, divGrowth: 10.3, salesGrowth: 0, qualityCo: 'A', qualityDiv: 80 },
  { ticker: 'UNH', name: 'UnitedHealth Group Inc', pais: 'Estados Unidos', precioArs: 11175, nivelCompra: 'Nivel 4', nivelVenta: '', precioUsd: 291.11, alerta: '', yield: 3.02, divGrowth: 12.6, salesGrowth: 15, qualityCo: 'A+', qualityDiv: 80 },
  { ticker: 'V', name: 'Visa Inc', pais: 'Estados Unidos', precioArs: 25700, nivelCompra: 'Nivel 5', nivelVenta: '', precioUsd: 319.75, alerta: '', yield: 0.85, divGrowth: 14.9, salesGrowth: 12.96, qualityCo: 'AA-', qualityDiv: 99 },
  { ticker: 'VALE', name: 'Vale SA', pais: 'Brasil', precioArs: 12200, nivelCompra: 'E', nivelVenta: 'N2 Vender mitad', precioUsd: 15.72, alerta: '', yield: 0, divGrowth: 0, salesGrowth: 1.74, qualityCo: '', qualityDiv: 0 },
  { ticker: 'XLY', name: 'State Street Cons Disc Sel Sect SPDR', pais: 'Estados Unidos', precioArs: 3965, nivelCompra: 'Nivel 1', nivelVenta: '', precioUsd: 116, alerta: '', yield: 0, divGrowth: 0, salesGrowth: 0, qualityCo: '', qualityDiv: 0 },
  { ticker: 'AMP', name: 'Ameriprise Financial Inc', pais: 'Estados Unidos', precioArs: 0, nivelCompra: 'Nivel 4', nivelVenta: '', precioUsd: 474.76, alerta: '', yield: 1.35, divGrowth: 8.7, salesGrowth: 0, qualityCo: 'A-', qualityDiv: 90 },
  { ticker: 'TXN', name: 'Texas Instruments Inc', pais: 'Estados Unidos', precioArs: 66600, nivelCompra: 'E', nivelVenta: 'N3 Venta total', precioUsd: 0, alerta: '1', yield: 2.51, divGrowth: 8.1, salesGrowth: 0, qualityCo: 'A+', qualityDiv: 80 },
  { ticker: 'MO', name: 'Altria Group Inc', pais: 'Estados Unidos', precioArs: 22710, nivelCompra: 'E', nivelVenta: 'N2 Vender mitad', precioUsd: 66.47, alerta: '', yield: 6.3, divGrowth: 4.1, salesGrowth: 0, qualityCo: '', qualityDiv: 55 },
  { ticker: 'ABBV', name: 'AbbVie Common Stock', pais: 'Estados Unidos', precioArs: 34000, nivelCompra: 'E', nivelVenta: '', precioUsd: 233.4, alerta: '4', yield: 2.99, divGrowth: 6.6, salesGrowth: 7.68, qualityCo: 'A-', qualityDiv: 80 },
  { ticker: 'GILD', name: 'Gilead Sciences Inc', pais: 'Estados Unidos', precioArs: 57600, nivelCompra: 'E', nivelVenta: 'N3 Venta total', precioUsd: 155.04, alerta: '', yield: 2.12, divGrowth: 3, salesGrowth: 4.43, qualityCo: 'A-', qualityDiv: 70 },
  { ticker: 'MDLZ', name: 'Mondelez International', pais: 'Estados Unidos', precioArs: 6150, nivelCompra: 'Nivel 3', nivelVenta: '', precioUsd: 59.62, alerta: '7', yield: 3.2, divGrowth: 10.1, salesGrowth: 0, qualityCo: '', qualityDiv: 66 },
  { ticker: 'SNY', name: 'Sanofi SA', pais: 'Francia', precioArs: 0, nivelCompra: 'Nivel 3', nivelVenta: '', precioUsd: 46.75, alerta: '', yield: 4.81, divGrowth: 5.2, salesGrowth: 0, qualityCo: 'AA', qualityDiv: 90 },
  { ticker: 'RHHBY', name: 'Roche Holdings AG Basel ADR', pais: 'Suiza', precioArs: 0, nivelCompra: 'E', nivelVenta: 'N3 Venta total', precioUsd: 60.19, alerta: '', yield: 2.35, divGrowth: 1.5, salesGrowth: 0, qualityCo: 'AA', qualityDiv: 99 },
];

// Determinar tipo de acción
const getActionType = (item) => {
  const venta = (item.nivelVenta || '').toUpperCase();
  const compra = (item.nivelCompra || '').toUpperCase();
  
  if (venta.includes('VENTA TOTAL') || venta.includes('N3')) return 'SELL_STRONG';
  if (venta.includes('N2') || venta.includes('POSIBLE VENTA') || venta.includes('N1')) return 'SELL_SOFT';
  if (compra.startsWith('NIVEL')) return 'BUY';
  return 'NEUTRAL';
};

// Formatear precio ARS
const formatArs = (val) => {
  if (!val || val <= 0) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(val);
};

const formatUsd = (val) => {
  if (!val || val <= 0) return '—';
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const qualityColor = (q) => {
  if (!q || q === '') return '#6b7280';
  if (q.startsWith('AAA')) return '#059669';
  if (q.startsWith('AA')) return '#10b981';
  if (q.startsWith('A+') || q.startsWith('A-') || q === 'A') return '#3b82f6';
  return '#8b5cf6';
};

const ACTION_CONFIG = {
  BUY: { bg: 'linear-gradient(135deg, #052e16, #064e3b)', border: '#10b981', badge: '#10b981', label: 'COMPRAR', labelBg: '#065f46', textColor: '#6ee7b7' },
  SELL_STRONG: { bg: 'linear-gradient(135deg, #1c0a0a, #450a0a)', border: '#ef4444', badge: '#ef4444', label: 'VENTA TOTAL', labelBg: '#7f1d1d', textColor: '#fca5a5' },
  SELL_SOFT: { bg: 'linear-gradient(135deg, #1c1206, #451a03)', border: '#f97316', badge: '#f97316', label: 'REDUCIR', labelBg: '#7c2d12', textColor: '#fdba74' },
  NEUTRAL: { bg: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '#334155', badge: '#64748b', label: 'ESPERAR', labelBg: '#1e293b', textColor: '#94a3b8' },
};

export default function App() {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('ticker');

  const items = useMemo(() => RAW_DATA.map(d => ({ ...d, actionType: getActionType(d) })), []);

  const filtered = useMemo(() => {
    let list = items.filter(item => {
      const q = search.toLowerCase();
      return item.ticker.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.pais.toLowerCase().includes(q);
    });
    if (filter === 'BUY') list = list.filter(i => i.actionType === 'BUY');
    if (filter === 'SELL') list = list.filter(i => i.actionType === 'SELL_STRONG' || i.actionType === 'SELL_SOFT');
    if (filter === 'NEUTRAL') list = list.filter(i => i.actionType === 'NEUTRAL');

    return [...list].sort((a, b) => {
      if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);
      if (sortBy === 'precioArs') return b.precioArs - a.precioArs;
      if (sortBy === 'yield') return b.yield - a.yield;
      if (sortBy === 'salesGrowth') return b.salesGrowth - a.salesGrowth;
      return 0;
    });
  }, [items, filter, search, sortBy]);

  const stats = useMemo(() => ({
    buy: items.filter(i => i.actionType === 'BUY').length,
    sellStrong: items.filter(i => i.actionType === 'SELL_STRONG').length,
    sellSoft: items.filter(i => i.actionType === 'SELL_SOFT').length,
    neutral: items.filter(i => i.actionType === 'NEUTRAL').length,
  }), [items]);

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: '#e2e8f0', fontFamily: "'DM Mono', 'Courier New', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Space+Grotesk:wght@400;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        .card { transition: transform 0.2s, box-shadow 0.2s; cursor: default; }
        .card:hover { transform: translateY(-3px); }
        .badge-pill { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; }
        .btn { border: none; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 12px; letter-spacing: 0.08em; padding: 8px 18px; border-radius: 6px; transition: all 0.15s; text-transform: uppercase; }
        input { font-family: inherit; }
        .stat-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 16px 24px; }
        .grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        @media (max-width: 600px) { .grid-cards { grid-template-columns: 1fr; } .top-bar { flex-direction: column !important; } }
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: '1px solid #1e293b', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ color: '#10b981' }}>CEDEAR</span>
            <span style={{ color: '#e2e8f0' }}>PRO</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: '#475569', marginLeft: 12, fontFamily: 'DM Mono', letterSpacing: '0.1em' }}>v2.0</span>
          </div>
          <div style={{ color: '#475569', fontSize: 11, letterSpacing: '0.15em', marginTop: 4 }}>TABLERO DE DECISIONES · {items.length} ACTIVOS</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ color: '#10b981', fontSize: 22, fontWeight: 700 }}>{stats.buy}</div>
            <div style={{ color: '#475569', fontSize: 10, letterSpacing: '0.12em' }}>COMPRAR</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ color: '#ef4444', fontSize: 22, fontWeight: 700 }}>{stats.sellStrong}</div>
            <div style={{ color: '#475569', fontSize: 10, letterSpacing: '0.12em' }}>VENTA TOTAL</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ color: '#f97316', fontSize: 22, fontWeight: 700 }}>{stats.sellSoft}</div>
            <div style={{ color: '#475569', fontSize: 10, letterSpacing: '0.12em' }}>REDUCIR</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ color: '#64748b', fontSize: 22, fontWeight: 700 }}>{stats.neutral}</div>
            <div style={{ color: '#475569', fontSize: 10, letterSpacing: '0.12em' }}>ESPERAR</div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{ padding: '16px 32px', background: '#030712', borderBottom: '1px solid #0f172a', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }} className="top-bar">
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ticker, nombre, país..."
            style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '9px 12px 9px 38px', color: '#e2e8f0', fontSize: 13, outline: 'none' }}
          />
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'ALL', label: 'Todos', color: '#64748b' },
            { id: 'BUY', label: '▲ Comprar', color: '#10b981' },
            { id: 'SELL', label: '▼ Vender', color: '#ef4444' },
            { id: 'NEUTRAL', label: '◈ Esperar', color: '#64748b' },
          ].map(f => (
            <button key={f.id} className="btn" onClick={() => setFilter(f.id)}
              style={{ background: filter === f.id ? f.color : '#0f172a', color: filter === f.id ? '#fff' : '#64748b', border: `1px solid ${filter === f.id ? f.color : '#1e293b'}` }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#475569', fontSize: 11, letterSpacing: '0.1em' }}>ORDENAR:</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, color: '#94a3b8', padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}>
            <option value="ticker">Ticker A-Z</option>
            <option value="precioArs">Precio ARS ↓</option>
            <option value="yield">Yield ↓</option>
            <option value="salesGrowth">Crecimiento ↓</option>
          </select>
        </div>
      </div>

      {/* CARDS */}
      <div style={{ padding: '24px 32px' }}>
        <div style={{ marginBottom: 12, color: '#475569', fontSize: 11, letterSpacing: '0.1em' }}>
          {filtered.length} ACTIVOS · {filter !== 'ALL' ? filter : 'TODOS LOS FILTROS'}
        </div>
        <div className="grid-cards">
          {filtered.map((item) => {
            const cfg = ACTION_CONFIG[item.actionType];
            const qColor = qualityColor(item.qualityCo);
            return (
              <div key={item.ticker} className="card"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}33`, borderLeft: `3px solid ${cfg.border}`, borderRadius: 12, padding: '18px 20px', boxShadow: `0 0 20px ${cfg.border}0d` }}>

                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>{item.ticker}</div>
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 2, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{formatArs(item.precioArs)}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{formatUsd(item.precioUsd)} USD</div>
                  </div>
                </div>

                {/* Action badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span className="badge-pill" style={{ background: cfg.badge + '22', color: cfg.textColor, border: `1px solid ${cfg.badge}55` }}>
                    {cfg.label}
                  </span>
                  {item.nivelCompra && item.nivelCompra !== 'E' && item.nivelCompra !== '#N/A' && (
                    <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.08em' }}>{item.nivelCompra}</span>
                  )}
                  {item.nivelVenta && item.nivelVenta !== '#N/A' && (
                    <span style={{ fontSize: 10, color: cfg.textColor, opacity: 0.7 }}>{item.nivelVenta}</span>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#ffffff0d', marginBottom: 12 }} />

                {/* Metrics grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {item.yield > 0 && (
                    <Metric label="Yield" value={`${item.yield}%`} color="#a78bfa" />
                  )}
                  {item.divGrowth > 0 && (
                    <Metric label="Crec. Div 5A" value={`${item.divGrowth}%`} color="#60a5fa" />
                  )}
                  {item.salesGrowth > 0 && (
                    <Metric label="Crec. Ventas 5A" value={`${item.salesGrowth}%`} color="#34d399" />
                  )}
                  {item.qualityCo && (
                    <Metric label="Calidad Cía" value={item.qualityCo} color={qColor} />
                  )}
                  {item.qualityDiv > 0 && (
                    <Metric label="Score Div" value={`${item.qualityDiv}/100`} color="#fb923c" />
                  )}
                  {item.pais && item.pais !== 'No encontrado' && (
                    <Metric label="País" value={item.pais} color="#94a3b8" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#334155', fontSize: 14, letterSpacing: '0.1em' }}>
            SIN RESULTADOS PARA ESA BÚSQUEDA
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div style={{ background: '#ffffff05', borderRadius: 6, padding: '7px 10px' }}>
      <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.12em', marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}
