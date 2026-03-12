// src/components/UserProfile/UserProfile.jsx
// ONJO Reviews — full dashboard for admin/team, simple profile for users
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

/* ─────────────────────────────────────────────────────
   THEMES
───────────────────────────────────────────────────── */
const THEMES = {
  dark: {
    id: 'dark', label: '🌑 Dark',
    bg: '#060c1a',
    bgGradient: 'radial-gradient(ellipse at 20% 0%,rgba(6,182,212,0.07) 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(139,92,246,0.07) 0%,transparent 50%)',
    surface: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', borderHover: 'rgba(255,255,255,0.18)',
    text: '#f1f5f9', textMuted: '#64748b', textSub: '#94a3b8',
    tabActive: 'rgba(255,255,255,0.12)', tabText: '#fff', tabInactive: '#64748b',
    inputBg: 'rgba(255,255,255,0.06)', inputBorder: 'rgba(255,255,255,0.12)',
    accent: '#06b6d4', accentGrad: 'linear-gradient(135deg,#06b6d4,#0891b2)',
    rowHover: 'rgba(255,255,255,0.02)', headerRow: 'rgba(255,255,255,0.04)',
    overlay: 'rgba(0,0,0,0.78)', shadow: '0 32px 80px rgba(0,0,0,0.55)',
    closeColor: '#64748b', themeBtnBg: 'rgba(255,255,255,0.06)', themeBtnBorder: 'rgba(255,255,255,0.1)',
    tooltipBg: '#0f172a',
    statCardBg: 'rgba(255,255,255,0.03)', statCardBorder: 'rgba(255,255,255,0.08)',
  },
  white: {
    id: 'white', label: '☀️ Light',
    bg: '#f8fafc',
    bgGradient: 'radial-gradient(ellipse at 20% 0%,rgba(6,182,212,0.05) 0%,transparent 50%)',
    surface: 'rgba(0,0,0,0.03)', border: 'rgba(0,0,0,0.08)', borderHover: 'rgba(0,0,0,0.2)',
    text: '#0f172a', textMuted: '#94a3b8', textSub: '#64748b',
    tabActive: 'rgba(0,0,0,0.08)', tabText: '#0f172a', tabInactive: '#94a3b8',
    inputBg: '#fff', inputBorder: 'rgba(0,0,0,0.15)',
    accent: '#0891b2', accentGrad: 'linear-gradient(135deg,#06b6d4,#0284c7)',
    rowHover: 'rgba(0,0,0,0.02)', headerRow: 'rgba(0,0,0,0.04)',
    overlay: 'rgba(0,0,0,0.5)', shadow: '0 32px 80px rgba(0,0,0,0.18)',
    closeColor: '#94a3b8', themeBtnBg: 'rgba(0,0,0,0.04)', themeBtnBorder: 'rgba(0,0,0,0.1)',
    tooltipBg: '#1e293b',
    statCardBg: '#fff', statCardBorder: '#e5e7eb',
  },
  green: {
    id: 'green', label: '🌿 Premium',
    bg: '#071410',
    bgGradient: 'radial-gradient(ellipse at 20% 0%,rgba(16,185,129,0.1) 0%,transparent 55%),radial-gradient(ellipse at 80% 100%,rgba(5,150,105,0.08) 0%,transparent 50%)',
    surface: 'rgba(16,185,129,0.04)', border: 'rgba(16,185,129,0.12)', borderHover: 'rgba(16,185,129,0.3)',
    text: '#ecfdf5', textMuted: '#4b7c6a', textSub: '#6ee7b7',
    tabActive: 'rgba(16,185,129,0.15)', tabText: '#ecfdf5', tabInactive: '#4b7c6a',
    inputBg: 'rgba(16,185,129,0.06)', inputBorder: 'rgba(16,185,129,0.2)',
    accent: '#10b981', accentGrad: 'linear-gradient(135deg,#10b981,#059669)',
    rowHover: 'rgba(16,185,129,0.03)', headerRow: 'rgba(16,185,129,0.07)',
    overlay: 'rgba(0,0,0,0.82)', shadow: '0 32px 80px rgba(0,0,0,0.6)',
    closeColor: '#4b7c6a', themeBtnBg: 'rgba(16,185,129,0.08)', themeBtnBorder: 'rgba(16,185,129,0.18)',
    tooltipBg: '#022c22',
    statCardBg: 'rgba(16,185,129,0.04)', statCardBorder: 'rgba(16,185,129,0.12)',
  },
};

/* ─────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────── */
const ROLES = { USER: 'user', TEAM: 'team', ADMIN: 'admin' };
const ROLE_LABELS  = { user: 'User', team: 'Team', admin: 'Admin' };
const ROLE_COLOURS = { user: '#64748b', team: '#06b6d4', admin: '#8b5cf6' };

const canSeeDashboard = (r) => r === ROLES.ADMIN || r === ROLES.TEAM;
const canManageRoles  = (r) => r === ROLES.ADMIN;

const PERIODS  = ['Today', 'Week', 'Month', 'Year'];
const periodMs = { Today: 864e5, Week: 6048e5, Month: 2592e6, Year: 3154e7 };
const periodTrunc = { Today: 'hour', Week: 'day', Month: 'day', Year: 'month' };

const METRICS = [
  { id: 'views',    label: 'Views',     icon: '👁',  color: '#06b6d4' },
  { id: 'likes',    label: 'Likes',     icon: '❤️',  color: '#f97316' },
  { id: 'ratings',  label: 'Ratings',   icon: '⭐',  color: '#10b981' },
  { id: 'newUsers', label: 'New Users', icon: '👤',  color: '#f59e0b' },
];

const CAT_COLOURS = [
  '#06b6d4','#f97316','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#ec4899','#14b8a6','#a855f7','#3b82f6',
];

const VERDICT_COLOURS = {
  recommended:     '#16a34a',
  not_recommended: '#dc2626',
  neutral:         '#6b7280',
};

/* ─────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────── */
const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n ?? 0);
const pct = (a, b) => b ? +((a - b) / b * 100).toFixed(1) : 0;
const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

/* ─────────────────────────────────────────────────────
   THEME SWITCHER
───────────────────────────────────────────────────── */
const ThemeSwitcher = ({ theme, setTheme }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {Object.values(THEMES).map(t => (
      <button key={t.id} onClick={() => setTheme(t)} style={{
        padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
        background: theme.id === t.id ? t.accent + '22' : t.themeBtnBg,
        border: `1px solid ${theme.id === t.id ? t.accent : t.themeBtnBorder}`,
        color: theme.id === t.id ? t.accent : theme.textMuted,
        transition: 'all 0.15s',
      }}>{t.label}</button>
    ))}
  </div>
);

/* ─────────────────────────────────────────────────────
   SHARED UI COMPONENTS
───────────────────────────────────────────────────── */
const StatCard = ({ label, value, delta, accent, icon, theme: T }) => (
  <div style={{
    background: T.statCardBg, border: `1px solid ${T.statCardBorder}`, borderRadius: 12,
    padding: '14px 16px', position: 'relative', overflow: 'hidden',
    flex: '1 1 0', minWidth: 80, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }}>
    <div style={{ position: 'absolute', top: 0, right: 0, width: 50, height: 50,
      background: `radial-gradient(circle at 100% 0%,${accent}30,transparent 70%)` }} />
    <div style={{ fontSize: 18, marginBottom: 5 }}>{icon}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: -0.5 }}>{fmt(value)}</div>
    <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{label}</div>
    {delta !== undefined && (
      <div style={{ fontSize: 11, marginTop: 6, color: delta >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs prev period
      </div>
    )}
  </div>
);

const DashTooltip = ({ active, payload, label, theme: T }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.tooltipBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: T.textMuted, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <b>{(p.value ?? 0).toLocaleString()}</b></div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   ANALYTICS DASHBOARD
───────────────────────────────────────────────────── */
const AnalyticsDashboard = ({ theme: T }) => {
  const [period, setPeriod]       = useState('Week');
  const [activeMetric, setMetric] = useState('views');
  const [stats, setStats]         = useState({ views: 0, likes: 0, ratings: 0, newUsers: 0 });
  const [prev, setPrev]           = useState({ views: 0, likes: 0, ratings: 0, newUsers: 0 });
  const [chartData, setChart]     = useState([]);
  const [topContent, setTop]      = useState([]);
  const [catData, setCat]         = useState([]);
  const [verdictData, setVerdict] = useState([]);
  const [comments, setComments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAll, setShowAll]     = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [rawViews, setRawViews]   = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setShowAll(false);
    setSelectedDay(null);
    try {
      const now   = Date.now();
      const curMs = periodMs[period];
      const sinceA = new Date(now - curMs).toISOString();
      const sinceB = new Date(now - curMs * 2).toISOString();
      const trunc  = periodTrunc[period];

      const [vA, lA, rA, uA, vB, lB, rB, uB] = await Promise.all([
        supabase.from('views').select('id', { count: 'exact', head: true }).gte('created_at', sinceA),
        supabase.from('likes').select('id', { count: 'exact', head: true }).gte('created_at', sinceA),
        supabase.from('ratings').select('id', { count: 'exact', head: true }).gte('created_at', sinceA),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sinceA),
        supabase.from('views').select('id', { count: 'exact', head: true }).gte('created_at', sinceB).lt('created_at', sinceA),
        supabase.from('likes').select('id', { count: 'exact', head: true }).gte('created_at', sinceB).lt('created_at', sinceA),
        supabase.from('ratings').select('id', { count: 'exact', head: true }).gte('created_at', sinceB).lt('created_at', sinceA),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sinceB).lt('created_at', sinceA),
      ]);

      setStats({ views: vA.count ?? 0, likes: lA.count ?? 0, ratings: rA.count ?? 0, newUsers: uA.count ?? 0 });
      setPrev ({ views: vB.count ?? 0, likes: lB.count ?? 0, ratings: rB.count ?? 0, newUsers: uB.count ?? 0 });

      const bucketKey = (iso) => {
        const d = new Date(iso);
        if (trunc === 'hour')  return `${String(d.getHours()).padStart(2, '0')}:00`;
        if (trunc === 'month') return d.toLocaleDateString('en-US', { month: 'short' });
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };

      const [{ data: rv }, { data: rl }, { data: rr }] = await Promise.all([
        supabase.from('views').select('created_at').gte('created_at', sinceA),
        supabase.from('likes').select('created_at').gte('created_at', sinceA),
        supabase.from('ratings').select('created_at').gte('created_at', sinceA),
      ]);

      const bkt = { views: {}, likes: {}, ratings: {} };
      (rv || []).forEach(r => { const k = bucketKey(r.created_at); bkt.views[k] = (bkt.views[k] || 0) + 1; });
      (rl || []).forEach(r => { const k = bucketKey(r.created_at); bkt.likes[k] = (bkt.likes[k] || 0) + 1; });
      (rr || []).forEach(r => { const k = bucketKey(r.created_at); bkt.ratings[k] = (bkt.ratings[k] || 0) + 1; });

      const allKeys = [...new Set([...Object.keys(bkt.views), ...Object.keys(bkt.likes), ...Object.keys(bkt.ratings)])].sort();
      setChart(allKeys.map(k => ({ date: k, views: bkt.views[k] || 0, likes: bkt.likes[k] || 0, ratings: bkt.ratings[k] || 0 })));

      const { data: periodViews } = await supabase
        .from('views').select('post_id,created_at').gte('created_at', sinceA).not('post_id', 'is', null);
      setRawViews(periodViews || []);

      if (periodViews?.length) {
        const viewCounts = {};
        periodViews.forEach(r => { viewCounts[r.post_id] = (viewCounts[r.post_id] || 0) + 1; });
        const topIds = Object.entries(viewCounts).sort((a, b) => b[1] - a[1]).map(([id]) => id);
        const { data: details } = await supabase
          .from('book_summaries')
          .select('id,title,category,views_count,likes_count,avg_rating,verdict,editor_score')
          .in('id', topIds);
        setTop((details || []).map(c => ({ ...c, period_views: viewCounts[c.id] || 0 }))
          .sort((a, b) => b.period_views - a.period_views));
      } else {
        setTop([]);
      }

      const { data: cats } = await supabase
        .from('book_summaries').select('category,views_count').not('category', 'is', null);
      const catMap = {};
      (cats || []).forEach(r => {
        const c = r.category || 'Other';
        catMap[c] = (catMap[c] || 0) + (r.views_count || 0);
      });
      const total = Object.values(catMap).reduce((s, v) => s + v, 0) || 1;
      setCat(
        Object.entries(catMap).sort((a, b) => b[1] - a[1])
          .map(([name, value], i) => ({ name, value: Math.round(value / total * 100), color: CAT_COLOURS[i % CAT_COLOURS.length] }))
      );

      const { data: verdicts } = await supabase
        .from('book_summaries').select('verdict').not('verdict', 'is', null);
      const vMap = {};
      (verdicts || []).forEach(r => {
        if (r.verdict) vMap[r.verdict] = (vMap[r.verdict] || 0) + 1;
      });
      setVerdict(Object.entries(vMap).map(([name, value]) => ({ name, value, color: VERDICT_COLOURS[name] || '#9ca3af' })));

      const { data: comms } = await supabase
        .from('comments')
        .select('id,content,created_at,profiles(username),book_summaries(title)')
        .gte('created_at', sinceA)
        .order('created_at', { ascending: false })
        .limit(5);
      setComments(comms || []);

    } catch (err) {
      console.error('Dashboard error', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const activeMetricObj = METRICS.find(m => m.id === activeMetric) || METRICS[0];

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysWithViews = [...new Set(rawViews.map(r => new Date(r.created_at).getDay()))].sort((a, b) => a - b);

  const getDrillContent = () => {
    if (period === 'Week' && selectedDay !== null) {
      const dayCounts = {};
      rawViews.forEach(r => {
        if (new Date(r.created_at).getDay() === selectedDay) {
          dayCounts[r.post_id] = (dayCounts[r.post_id] || 0) + 1;
        }
      });
      const ids = new Set(Object.keys(dayCounts));
      return topContent.filter(c => ids.has(c.id))
        .map(c => ({ ...c, period_views: dayCounts[c.id] || 0 }))
        .sort((a, b) => b.period_views - a.period_views);
    }
    return topContent;
  };

  const drillContent   = getDrillContent();
  const visibleContent = showAll ? drillContent : drillContent.slice(0, 8);
  const filteredCats   = catSearch.trim()
    ? catData.filter(c => c.name.toLowerCase().includes(catSearch.trim().toLowerCase()))
    : catData;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, color: T.textMuted, fontSize: 13 }}>
      Loading analytics…
    </div>
  );

  return (
    <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4, paddingBottom: 8 }}>
      {/* Period controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: T.textMuted }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={load} title="Refresh" style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 15 }}>↻</button>
          <div style={{ display: 'flex', gap: 3, background: T.surface, borderRadius: 8, padding: 3, border: `1px solid ${T.border}` }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                background: period === p ? T.tabActive : 'transparent', border: 'none',
                color: period === p ? T.tabText : T.tabInactive,
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
              }}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {METRICS.map(m => (
          <StatCard key={m.id} label={m.label} icon={m.icon}
            value={stats[m.id] ?? 0} delta={pct(stats[m.id] ?? 0, prev[m.id] ?? 0)}
            accent={m.color} theme={T} />
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: T.textSub }}>
            {activeMetricObj.label} — {period}
          </span>
          <div style={{ display: 'flex', gap: 5 }}>
            {METRICS.filter(m => m.id !== 'newUsers').map(m => (
              <button key={m.id} onClick={() => setMetric(m.id)} style={{
                background: activeMetric === m.id ? m.color + '22' : 'transparent',
                border: `1px solid ${activeMetric === m.id ? m.color : T.border}`,
                color: activeMetric === m.id ? m.color : T.textMuted,
                padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
              }}>{m.icon} {m.label}</button>
            ))}
          </div>
        </div>
        {chartData.length === 0
          ? <div style={{ textAlign: 'center', color: T.textMuted, fontSize: 12, padding: '28px 0' }}>No activity in this period</div>
          : <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={activeMetricObj.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={activeMetricObj.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="date" tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DashTooltip theme={T} />} />
                <Area type="monotone" dataKey={activeMetric} stroke={activeMetricObj.color}
                  strokeWidth={2} fill="url(#dg)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
        }
      </div>

      {/* Top content + breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 230px', gap: 10, marginBottom: 12 }}>

        {/* Top content */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: T.textSub }}>
              Top Reviews — {period}
            </span>
            {drillContent.length > 8 && (
              <button onClick={() => setShowAll(v => !v)} style={{
                background: 'none', border: `1px solid ${T.border}`, borderRadius: 20,
                color: T.accent, fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: '2px 10px',
              }}>
                {showAll ? '▲ Show less' : `View all ${drillContent.length} →`}
              </button>
            )}
          </div>

          {period === 'Week' && daysWithViews.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedDay(null)} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: selectedDay === null ? T.accent : T.surface,
                color: selectedDay === null ? '#fff' : T.textMuted, border: `1px solid ${T.border}`,
              }}>All days</button>
              {daysWithViews.map(d => (
                <button key={d} onClick={() => setSelectedDay(d)} style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: selectedDay === d ? T.accent : T.surface,
                  color: selectedDay === d ? '#fff' : T.textMuted, border: `1px solid ${T.border}`,
                }}>{DAY_NAMES[d].slice(0, 3)}</button>
              ))}
            </div>
          )}

          {drillContent.length === 0
            ? <div style={{ color: T.textMuted, fontSize: 12, padding: '16px 0', textAlign: 'center' }}>No views recorded yet</div>
            : visibleContent.map((c, i) => {
              const verdictIcon = { recommended: '✅', not_recommended: '❌', neutral: '➖' }[c.verdict] || '';
              return (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 0', borderBottom: i < visibleContent.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, width: 20, flexShrink: 0 }}>#{i + 1}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.text, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 210 }}>
                        {verdictIcon && <span style={{ marginRight: 4 }}>{verdictIcon}</span>}
                        {c.title}
                      </div>
                      <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>{c.category || 'Uncategorized'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexShrink: 0, fontSize: 11 }}>
                    <span style={{ color: '#06b6d4', fontWeight: 600 }}>{fmt(c.period_views)}</span>
                    <span style={{ color: '#f97316' }}>{fmt(c.likes_count)}</span>
                    <span style={{ color: '#f59e0b' }}>★{c.avg_rating ?? '—'}</span>
                  </div>
                </div>
              );
            })
          }
        </div>

        {/* Category + verdict breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Category */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
            padding: '14px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: T.textSub, marginBottom: 8 }}>
              Categories ({catData.length})
            </div>
            {catData.length > 6 && (
              <input value={catSearch} onChange={e => setCatSearch(e.target.value)}
                placeholder="Filter…"
                style={{ width: '100%', padding: '5px 8px', marginBottom: 8, background: T.inputBg,
                  border: `1px solid ${T.inputBorder}`, borderRadius: 6, color: T.text, fontSize: 11,
                  outline: 'none', boxSizing: 'border-box' }} />
            )}
            <ResponsiveContainer width="100%" height={80}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={18} outerRadius={36}
                  dataKey="value" paddingAngle={2} stroke="none">
                  {catData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={v => `${v}%`} contentStyle={{ background: T.tooltipBg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ overflowY: 'auto', flex: 1, marginTop: 6, maxHeight: 200 }}>
              {filteredCats.map(c => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: T.textSub, whiteSpace: 'nowrap', overflow: 'hidden',
                      textOverflow: 'ellipsis', maxWidth: 110 }} title={c.name}>{c.name}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.text }}>{c.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verdict breakdown */}
          {verdictData.length > 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: T.textSub, marginBottom: 10 }}>
                Verdicts
              </div>
              {verdictData.map(v => {
                const total = verdictData.reduce((s, x) => s + x.value, 0) || 1;
                const barW  = Math.round(v.value / total * 100);
                const label = { recommended: '✅ Recommended', not_recommended: '❌ Not Rec.', neutral: '➖ Neutral' }[v.name] || v.name;
                return (
                  <div key={v.name} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: T.textSub }}>{label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: v.color }}>{v.value}</span>
                    </div>
                    <div style={{ height: 5, background: T.surface, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                      <div style={{ height: '100%', width: `${barW}%`, background: v.color, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent comments */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: T.textSub, marginBottom: 10 }}>
          Recent Comments — {period}
        </div>
        {comments.length === 0
          ? <div style={{ color: T.textMuted, fontSize: 12, textAlign: 'center', padding: '16px 0' }}>No comments in this period</div>
          : comments.map((c, i) => {
            const user   = c.profiles?.username || 'Anonymous';
            const post   = c.book_summaries?.title || 'Unknown';
            const letter = user[0]?.toUpperCase() || 'A';
            return (
              <div key={c.id} style={{ display: 'flex', gap: 10, padding: '8px 0',
                borderBottom: i < comments.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: `hsl(${letter.charCodeAt(0) * 37 % 360},50%,38%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff' }}>{letter}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>@{user}</span>
                    <span style={{ fontSize: 10, color: T.textMuted }}>{ago(c.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.4, whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.content}</div>
                  <span style={{ fontSize: 10, color: T.textMuted, background: T.surface,
                    border: `1px solid ${T.border}`, padding: '1px 6px', borderRadius: 4,
                    marginTop: 3, display: 'inline-block' }}>on: {post}</span>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   AI ADVISER
───────────────────────────────────────────────────── */
const AI_TABS = [
  { id: 'chat',            label: '💬 Ask',          desc: 'Ask anything about writing better reviews' },
  { id: 'trending',        label: '🔥 Trending',     desc: 'What products/topics are hot right now' },
  { id: 'recommendations', label: '💡 Ideas',        desc: 'Review ideas based on your content gaps' },
  { id: 'seo',             label: '🔍 SEO Tips',     desc: 'SEO advice tailored to product reviews' },
  { id: 'news',            label: '📰 News',         desc: 'Latest product and consumer news to cover' },
];

const SUGGESTED_PROMPTS = {
  chat: [
    'How do I write a compelling review intro?',
    'What makes a verdict section trustworthy?',
    'How long should a product review be?',
    'How do I compare two competing products fairly?',
    'What\'s the best way to structure pros and cons?',
    'How do I add affiliate links without sounding salesy?',
  ],
  trending: [
    'What tech products are trending this week?',
    'What home appliances are people searching for?',
    'What AI tools should I review next?',
    'What\'s trending in fitness equipment?',
  ],
  recommendations: [
    'What review categories am I missing?',
    'Suggest 5 products I should review based on what\'s popular',
    'What are content gaps in the Electronics category?',
    'What products are underreviewed but high-demand?',
  ],
  seo: [
    'How should I title a product review for Google?',
    'What schema markup should a review page have?',
    'How do I rank for "best X" keywords?',
    'How do I optimize my review for featured snippets?',
    'What\'s the ideal meta description for a review page?',
  ],
  news: [
    'What new products launched this week worth reviewing?',
    'What consumer tech news should I cover?',
    'What product recalls or controversies are trending?',
    'What\'s happening in the smartphone market right now?',
  ],
};

const AIAdviser = ({ theme: T }) => {
  const [activeAiTab, setActiveAiTab]     = useState('chat');
  const [chatInput, setChatInput]         = useState('');
  const [chatHistory, setChatHistory]     = useState([]);
  const [tabContent, setTabContent]       = useState({ trending: null, recommendations: null, seo: null, news: null });
  const [tabLoading, setTabLoading]       = useState({});
  const [customTopics, setCustomTopics]   = useState({ trending: '', recommendations: '', seo: '' });
  const [chatLoading, setChatLoading]     = useState(false);
  const [suggestIdx, setSuggestIdx]       = useState(0);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  const callAdviser = useCallback(async (mode, userMessage = '', customTopic = '') => {
    try {
      const res = await fetch('/api/review-adviser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, message: userMessage, customTopic }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.result || data.content || data.text || 'No response.';
    } catch (err) {
      console.error('AI Adviser error', err);
      return `⚠️ Could not reach the AI adviser. Check that the \`review-adviser\` Netlify function is deployed.\n\nError: ${err.message}`;
    }
  }, []);

  const sendChat = useCallback(async (text) => {
    const msg = (text || chatInput).trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    const reply = await callAdviser('chat', msg);
    setChatHistory(prev => [...prev, { role: 'assistant', text: reply }]);
    setChatLoading(false);
  }, [chatInput, chatLoading, callAdviser]);

  const loadTab = useCallback(async (tabId, customTopic = '') => {
    if (tabId === 'chat') return;
    setTabLoading(prev => ({ ...prev, [tabId]: true }));
    const result = await callAdviser(tabId, '', customTopic);
    setTabContent(prev => ({ ...prev, [tabId]: result }));
    setTabLoading(prev => ({ ...prev, [tabId]: false }));
  }, [callAdviser]);

  useEffect(() => {
    if (activeAiTab !== 'chat' && tabContent[activeAiTab] === null) {
      loadTab(activeAiTab);
    }
  }, [activeAiTab, tabContent, loadTab]);

  const cyclePrompts = () => {
    setSuggestIdx(prev => (prev + 3) % SUGGESTED_PROMPTS[activeAiTab].length);
  };

  const visiblePrompts = SUGGESTED_PROMPTS[activeAiTab].slice(suggestIdx, suggestIdx + 3);

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: '12px 0 4px' }}>{line.slice(3)}</h3>;
      if (line.startsWith('# '))  return <h2 key={i} style={{ fontSize: 14, fontWeight: 800, color: T.text, margin: '14px 0 6px' }}>{line.slice(2)}</h2>;
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 4 }}>
          <span style={{ color: T.accent, flexShrink: 0 }}>•</span>
          <span style={{ fontSize: 12, color: T.textSub, lineHeight: 1.5 }}>{line.slice(2)}</span>
        </div>;
      }
      if (/^\d+\./.test(line)) {
        return <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 4 }}>
          <span style={{ color: '#8b5cf6', fontWeight: 700, flexShrink: 0, fontSize: 11 }}>{line.match(/^\d+/)[0]}.</span>
          <span style={{ fontSize: 12, color: T.textSub, lineHeight: 1.5 }}>{line.replace(/^\d+\.\s*/, '')}</span>
        </div>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: '6px 0 2px' }}>{line.slice(2, -2)}</p>;
      }
      if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
      return <p key={i} style={{ fontSize: 12, color: T.textSub, margin: '2px 0', lineHeight: 1.6 }}>{line}</p>;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: 10 }}>
      {/* AI sub-tabs */}
      <div style={{ display: 'flex', gap: 4, background: T.surface, borderRadius: 10, padding: 4, flexShrink: 0, border: `1px solid ${T.border}` }}>
        {AI_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveAiTab(t.id)} style={{
            flex: 1, padding: '7px 6px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: activeAiTab === t.id ? T.tabActive : 'transparent',
            color: activeAiTab === t.id ? T.tabText : T.tabInactive,
            fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
          }} title={t.desc}>
            {t.label}
          </button>
        ))}
      </div>

      {/* CHAT TAB */}
      {activeAiTab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
            {visiblePrompts.map((p, i) => (
              <button key={i} onClick={() => sendChat(p)} style={{
                background: T.surface, border: `1px solid ${T.border}`, color: T.textSub,
                padding: '5px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                fontWeight: 500, transition: 'all 0.12s', maxWidth: 220,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }} title={p}>{p}</button>
            ))}
            <button onClick={cyclePrompts} style={{
              background: 'none', border: `1px solid ${T.border}`, color: T.textMuted,
              padding: '5px 8px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
            }} title="More prompts">↻</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4, marginBottom: 8 }}>
            {chatHistory.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: T.textMuted }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🤖</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: T.textSub }}>
                  Your AI Review Adviser
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: T.textMuted }}>
                  Ask anything about writing better product reviews,<br/>
                  improving SEO, crafting compelling verdicts, or<br/>
                  deciding what to review next.
                </div>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginRight: 8, marginTop: 2,
                    background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: '#fff', fontWeight: 700 }}>A</div>
                )}
                <div style={{
                  maxWidth: '78%', padding: '9px 13px', borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                  background: msg.role === 'user' ? T.accent : T.surface,
                  color: msg.role === 'user' ? '#fff' : T.text,
                  border: `1px solid ${msg.role === 'user' ? 'transparent' : T.border}`,
                  fontSize: 12, lineHeight: 1.6,
                }}>
                  {msg.role === 'user'
                    ? <span>{msg.text}</span>
                    : <div>{renderMarkdown(msg.text)}</div>
                  }
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>A</div>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '12px 12px 12px 3px',
                  padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(d => (
                    <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent,
                      animation: 'ai-pulse 1.2s ease-in-out infinite', animationDelay: `${d * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
              placeholder="Ask about review writing, SEO, product ideas…"
              disabled={chatLoading}
              style={{ flex: 1, padding: '9px 14px', background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                borderRadius: 10, color: T.text, fontSize: 12, outline: 'none',
                opacity: chatLoading ? 0.6 : 1 }} />
            <button onClick={() => sendChat()} disabled={!chatInput.trim() || chatLoading} style={{
              background: chatInput.trim() && !chatLoading ? T.accentGrad : T.surface,
              border: 'none', borderRadius: 10, padding: '9px 16px',
              cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'not-allowed',
              color: chatInput.trim() && !chatLoading ? '#fff' : T.textMuted,
              fontSize: 16, fontWeight: 700, transition: 'all 0.15s',
            }}>↑</button>
          </div>
        </div>
      )}

      {/* TRENDING / IDEAS / SEO TABS */}
      {activeAiTab !== 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexShrink: 0 }}>
            <input
              value={customTopics[activeAiTab] || ''}
              onChange={e => setCustomTopics(prev => ({ ...prev, [activeAiTab]: e.target.value }))}
              placeholder={
                activeAiTab === 'trending'        ? 'Focus on a niche, e.g. "smart home"…' :
                activeAiTab === 'recommendations' ? 'Your site focus, e.g. "budget tech"…' :
                activeAiTab === 'news'            ? 'Product category, e.g. "smartphones"…' :
                'Your category, e.g. "fitness gear"…'
              }
              style={{ flex: 1, padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                borderRadius: 9, color: T.text, fontSize: 12, outline: 'none' }}
              onKeyDown={e => e.key === 'Enter' && loadTab(activeAiTab, customTopics[activeAiTab])}
            />
            <button onClick={() => loadTab(activeAiTab, customTopics[activeAiTab])}
              disabled={tabLoading[activeAiTab]}
              style={{ background: T.accentGrad, color: '#fff', border: 'none', borderRadius: 9,
                padding: '8px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                opacity: tabLoading[activeAiTab] ? 0.6 : 1 }}>
              {tabLoading[activeAiTab] ? '…' : '↻ Refresh'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap', flexShrink: 0 }}>
            {SUGGESTED_PROMPTS[activeAiTab].slice(0, 3).map((p, i) => (
              <button key={i}
                onClick={() => { setCustomTopics(prev => ({ ...prev, [activeAiTab]: p })); loadTab(activeAiTab, p); }}
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textSub,
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                  fontWeight: 500, transition: 'all 0.12s',
                }} title={p}>{p.length > 36 ? p.slice(0, 36) + '…' : p}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: '16px 18px' }}>
            {tabLoading[activeAiTab] ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: 160, gap: 12, color: T.textMuted }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[0, 1, 2].map(d => (
                    <div key={d} style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent,
                      animation: 'ai-pulse 1.2s ease-in-out infinite', animationDelay: `${d * 0.2}s` }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: T.textMuted }}>AI is thinking…</span>
              </div>
            ) : tabContent[activeAiTab] ? (
              <div>{renderMarkdown(tabContent[activeAiTab])}</div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: T.textMuted, fontSize: 12 }}>
                Hit Refresh to load {AI_TABS.find(t => t.id === activeAiTab)?.label} insights
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes ai-pulse {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   TEAM MANAGER (admin only)
───────────────────────────────────────────────────── */
const TeamManager = ({ theme: T }) => {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles')
        .select('id,username,role,created_at').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) { console.error('TeamManager error', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const changeRole = async (userId, newRole) => {
    setSaving(userId);
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) { alert('Could not update role. Check RLS policies.'); }
    finally { setSaving(null); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: T.textMuted }}>Loading team…</div>;

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Team & Role Management</div>
        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
          User = no dashboard · Team = view dashboard · Admin = full access
        </div>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 180px', gap: 12,
          padding: '10px 16px', background: T.headerRow, borderBottom: `1px solid ${T.border}` }}>
          {['User', 'Role', 'Change Role'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.textMuted }}>{h}</span>
          ))}
        </div>
        {users.map((u, i) => {
          const letter = (u.username || 'U')[0]?.toUpperCase();
          const isSaving = saving === u.id;
          return (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 180px', gap: 12,
              padding: '12px 16px', alignItems: 'center', borderBottom: i < users.length - 1 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: `hsl(${letter?.charCodeAt(0) * 37 % 360},50%,35%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff' }}>{letter}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>@{u.username || 'unnamed'}</div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 12, color: ROLE_COLOURS[u.role], fontWeight: 600 }}>
                {ROLE_LABELS[u.role]}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {Object.values(ROLES).map(r => (
                  <button key={r} onClick={() => changeRole(u.id, r)} disabled={u.role === r || isSaving} style={{
                    padding: '4px 10px', borderRadius: 6, cursor: u.role === r ? 'default' : 'pointer',
                    fontSize: 10, fontWeight: 600, transition: 'all 0.15s',
                    background: u.role === r ? ROLE_COLOURS[r] + '22' : T.surface,
                    border: `1px solid ${u.role === r ? ROLE_COLOURS[r] : T.border}`,
                    color: u.role === r ? ROLE_COLOURS[r] : T.textMuted,
                    opacity: isSaving ? 0.5 : 1,
                  }}>
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   PROFILE EDIT
───────────────────────────────────────────────────── */
const ProfileEdit = ({ profile, onSaved, theme: T }) => {
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState(profile?.username || '');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    const newUsername = input.trim();
    if (!newUsername) { alert('Username cannot be empty.'); return; }
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { alert('Not logged in.'); return; }
      const { data, error } = await supabase.from('profiles')
        .upsert({ id: user.id, username: newUsername }, { onConflict: 'id' }).select();
      if (error) {
        if (error.code === '23505') { alert('Username already taken.'); return; }
        alert('Could not update username.');
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      setEditing(false);
      if (typeof onSaved === 'function') onSaved(row?.username || newUsername);
    } catch (err) { alert('Could not update username.'); }
    finally { setLoading(false); }
  };

  return !editing ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Username</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{profile?.username || '—'}</div>
      </div>
      <button onClick={() => { setEditing(true); setInput(profile?.username || ''); }}
        style={{ background: T.accent + '18', border: `1px solid ${T.accent}44`,
          color: T.accent, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
        Edit Username
      </button>
    </div>
  ) : (
    <div>
      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>New Username</div>
      <input value={input} onChange={e => setInput(e.target.value)} placeholder="Enter username"
        style={{ width: '100%', padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.inputBorder}`,
          borderRadius: 8, color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={loading}
          style={{ background: T.accentGrad, border: 'none', color: '#fff', padding: '7px 18px',
            borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          {loading ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)}
          style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textSub,
            padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
          Cancel
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────── */
const UserProfile = ({ onClose, onUpdated }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab]   = useState('profile');
  const [theme, setTheme]     = useState(THEMES.dark);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) { if (mounted) setLoading(false); return; }
        const { data, error } = await supabase.from('profiles')
          .select('id,username,avatar_url,role,can_add_summary').eq('id', user.id).maybeSingle();
        if (!mounted) return;
        if (error || !data) {
          const { data: upserted } = await supabase.from('profiles')
            .upsert({ id: user.id, username: '', role: 'user' }, { onConflict: 'id' }).select();
          const row = Array.isArray(upserted) ? upserted[0] : upserted;
          if (mounted) setProfile(row || { id: user.id, username: '', role: 'user' });
        } else {
          if (mounted) setProfile(data);
        }
      } catch (err) { console.error('Profile load error', err); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSaved = (newUsername) => {
    setProfile(p => ({ ...p, username: newUsername }));
    if (typeof onUpdated === 'function') onUpdated({ username: newUsername });
  };

  const role      = profile?.role || 'user';
  const showDash  = canSeeDashboard(role);
  const showTeam  = canManageRoles(role);
  const avatarLetter = (profile?.username || 'U')[0]?.toUpperCase() || 'U';
  const T = theme;

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400 }}>
      <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</div>
    </div>
  );

  /* ── DASHBOARD LAYOUT (team / admin) ─────────────────── */
  if (showDash) {
    const tabs = [
      { id: 'profile',   label: '👤 Profile' },
      { id: 'dashboard', label: '📊 Dashboard' },
      { id: 'ai',        label: '🤖 AI Adviser' },
      ...(showTeam ? [{ id: 'team', label: '👥 Team' }] : []),
    ];

    return (
      <div style={{ position: 'fixed', inset: 0, background: T.overlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400, padding: '3%', boxSizing: 'border-box' }}
        role="dialog" aria-modal="true">
        <div style={{
          background: T.bg, backgroundImage: T.bgGradient,
          width: '100%', height: '100%', borderRadius: 16,
          border: `1px solid ${T.border}`, boxShadow: T.shadow,
          padding: '20px 24px', position: 'relative', display: 'flex', flexDirection: 'column',
          fontFamily: "'DM Sans', sans-serif", overflow: 'hidden',
        }}>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

          <button onClick={onClose} style={{ position: 'absolute', right: 16, top: 12,
            background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer',
            color: T.closeColor, zIndex: 10, lineHeight: 1 }}>&times;</button>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingRight: 36, flexShrink: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg,${T.accent},${T.accent}99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, fontWeight: 800, color: '#fff' }}>{avatarLetter}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{profile?.username || 'User'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ background: ROLE_COLOURS[role] + '22', color: ROLE_COLOURS[role],
                  padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  letterSpacing: 0.5, textTransform: 'uppercase' }}>{ROLE_LABELS[role]}</span>
                <span style={{ fontSize: 11, color: T.textMuted }}>ONJO Reviews</span>
              </div>
            </div>
            <div style={{ flex: 1 }} />
            {/* Theme switcher */}
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 3, background: T.surface, borderRadius: 8,
              padding: 3, border: `1px solid ${T.border}` }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  background: activeTab === t.id ? T.tabActive : 'transparent', border: 'none',
                  color: activeTab === t.id ? T.tabText : T.tabInactive,
                  padding: '5px 14px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {activeTab === 'profile' && (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
                <ProfileEdit profile={profile} onSaved={handleSaved} theme={T} />
              </div>
            )}
            {activeTab === 'dashboard' && <AnalyticsDashboard theme={T} />}
            {activeTab === 'ai'        && <AIAdviser theme={T} />}
            {activeTab === 'team' && showTeam && <TeamManager theme={T} />}
          </div>
        </div>
      </div>
    );
  }

  /* ── SIMPLE LAYOUT (regular users) ─────────────────── */
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="User profile">
      <div className="modal-panel">
        <button className="modal-close" onClick={onClose} aria-label="Close profile">&times;</button>
        <div className="profile-modal-body">
          <div className="profile-modal-avatar">
            <span className="letter-avatar-large">{avatarLetter}</span>
          </div>
          <div className="profile-modal-info">
            <h2 className="profile-modal-name">{profile?.username || 'User'}</h2>
            <ProfileEdit profile={profile} onSaved={handleSaved} theme={THEMES.white} />
            <div className="profile-modal-actions" style={{ marginTop: 8 }}>
              <button className="btn btn-outline" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;