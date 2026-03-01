'use client';
import { useState, useEffect } from 'react';
import BikeCover from './components/BikeCover';

// ─── 常量 ────────────────────────────────────────────────────────────────────

const USAGE_OPTIONS = [
  { value: 'commute',           label: '🏙️ 城市通勤' },
  { value: 'endurance_weekend', label: '🛣️ 周末耐力' },
  { value: 'mtb_trail',        label: '⛰️ 山地越野' },
  { value: 'gravel',           label: '🌿 砾石探险' },
  { value: 'racing',           label: '🏁 竞速赛事' },
];

const PRIORITY_OPTIONS = [
  { value: 'comfort',      label: '😌 舒适性' },
  { value: 'performance',  label: '⚡ 性能' },
  { value: 'weight',       label: '🪶 轻量化' },
  { value: 'durability',   label: '🔩 耐用性' },
  { value: 'value',        label: '💰 性价比' },
];

const API = 'http://localhost:3001/v1';

// ─── 类型 ────────────────────────────────────────────────────────────────────

interface Card {
  rec_id: string;
  summary: string;
  components: {
    frame?: { type?: string };
    drivetrain?: { level?: string };
    wheelset?: { tire?: string };
    brake?: { type?: string };
  };
  price_estimate: { min: number; max: number; currency?: string };
  compatibility?: { hard_errors: any[]; warnings: any[] };
  explanations?: string[];
  visual?: { img?: string };
}

interface CardState {
  compatResult?: string;
  priceResult?: string;
  pdfUrl?: string;
  loadingCompat?: boolean;
  loadingPrice?: boolean;
  loadingPdf?: boolean;
}

// ─── 子组件 ─────────────────────────────────────────────────────────────────

function TagSelector({
  options, selected, onChange,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <div className="tag-group">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`tag${selected.includes(o.value) ? ' active' : ''}`}
          onClick={() => toggle(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="skeleton" style={{ height: 160, borderRadius: 8 }} />
      <div className="skeleton" style={{ height: 22, width: '70%' }} />
      <div className="skeleton" style={{ height: 16, width: '45%' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ height: 34, flex: 1, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 34, flex: 1, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 34, flex: 1, borderRadius: 8 }} />
      </div>
    </div>
  );
}

function ComponentBadge({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12,
      background: '#f8fafc', border: '1px solid var(--border)',
      borderRadius: 6, padding: '3px 8px', color: 'var(--muted)' }}>
      <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{label}</span>
      {value}
    </span>
  );
}

function RecommendCard({
  card, state, onCompat, onPrice, onPdf,
}: {
  card: Card;
  state: CardState;
  onCompat: () => void;
  onPrice: () => void;
  onPdf: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const c = card.components;

  return (
    <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* 封面图 */}
      <div style={{ position: 'relative', background: '#f1f5f9' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {card.visual?.img && !card.visual.img.includes('placehold.co') ? (
          <img
            src={card.visual.img}
            alt={card.summary}
            style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <BikeCover
            summary={card.summary}
            frameType={c.frame?.type}
            height={180}
          />
        )}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          borderRadius: 8, padding: '4px 10px',
          fontSize: 13, fontWeight: 700, color: 'var(--primary)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          ¥{card.price_estimate?.min?.toLocaleString()} – ¥{card.price_estimate?.max?.toLocaleString()}
        </div>
      </div>

      {/* 卡片内容 */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>
            {card.summary}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            {card.rec_id}
          </p>
        </div>

        {/* 组件标签 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <ComponentBadge label="车架" value={c.frame?.type} />
          <ComponentBadge label="传动" value={c.drivetrain?.level} />
          <ComponentBadge label="车轮" value={c.wheelset?.tire} />
          <ComponentBadge label="刹车" value={c.brake?.type} />
        </div>

        {/* 说明文字（可折叠） */}
        {card.explanations && card.explanations.length > 0 && (
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)',
              overflow: 'hidden', maxHeight: expanded ? 'none' : 40, lineHeight: '20px' }}>
              {card.explanations[0]}
            </p>
            {card.explanations[0].length > 60 && (
              <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 12, marginTop: 4 }}
                onClick={() => setExpanded(v => !v)}>
                {expanded ? '收起' : '展开'}
              </button>
            )}
          </div>
        )}

        <div className="divider" style={{ margin: '4px 0' }} />

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }}
            onClick={onCompat} disabled={state.loadingCompat}>
            {state.loadingCompat ? <><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'rgba(79,70,229,0.2)' }} /> 校验中</> : '🔧 兼容校验'}
          </button>
          <button className="btn btn-ghost" style={{ flex: 1 }}
            onClick={onPrice} disabled={state.loadingPrice}>
            {state.loadingPrice ? <><span className="spinner" style={{ borderTopColor: '#334155', borderColor: 'rgba(51,65,85,0.2)' }} /> 估算中</> : '💰 价格估算'}
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={onPdf} disabled={state.loadingPdf}>
            {state.loadingPdf ? <><span className="spinner" /> 生成中</> : '📄 导出 PDF'}
          </button>
        </div>

        {/* 操作结果 */}
        {(state.compatResult || state.priceResult || state.pdfUrl) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {state.compatResult && (
              <div style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8,
                background: state.compatResult.includes('✅') ? '#ecfdf5' : '#fef2f2',
                color: state.compatResult.includes('✅') ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${state.compatResult.includes('✅') ? '#a7f3d0' : '#fecaca'}` }}>
                {state.compatResult}
              </div>
            )}
            {state.priceResult && (
              <div style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8,
                background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                {state.priceResult}
              </div>
            )}
            {state.pdfUrl && (
              <a href={state.pdfUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8,
                  background: 'var(--primary-light)', color: 'var(--primary)',
                  border: '1px solid #c7d2fe', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                📎 查看 PDF →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────

export default function Home() {
  // 表单状态
  const [budgetMin, setBudgetMin] = useState(8000);
  const [budgetMax, setBudgetMax] = useState(12000);
  const [usage, setUsage]         = useState<string[]>(['commute']);
  const [priority, setPriority]   = useState<string[]>(['comfort']);

  // 结果状态
  const [cards, setCards]       = useState<Card[]>([]);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [loading, setLoading]   = useState(false);
  const [globalMsg, setGlobalMsg] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  // 收藏状态（localStorage 持久化）
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bike-favorites');
      if (saved) setFavorites(JSON.parse(saved));
    } catch {}
  }, []);

  function toggleFavorite(id: string) {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('bike-favorites', JSON.stringify(next));
      return next;
    });
  }

  function setCardState(id: string, patch: Partial<CardState>) {
    setCardStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  // ── 生成推荐 ──
  async function getRecommend() {
    if (budgetMin >= budgetMax) {
      setGlobalMsg({ type: 'error', text: '预算最小值必须小于最大值' });
      return;
    }
    if (usage.length === 0) {
      setGlobalMsg({ type: 'error', text: '请至少选择一种骑行场景' });
      return;
    }
    setLoading(true);
    setGlobalMsg(null);
    setCards([]);
    setCardStates({});
    try {
      const res = await fetch(`${API}/bikes/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: { min: budgetMin, max: budgetMax, currency: 'CNY' },
          usage,
          priority,
        }),
      });
      if (!res.ok) throw new Error(`服务器错误 ${res.status}`);
      const data = await res.json();
      setCards(data.cards || []);
      if ((data.cards || []).length === 0) {
        setGlobalMsg({ type: 'info', text: '暂无符合条件的方案，请调整预算或骑行场景后重试' });
      }
    } catch (e: any) {
      setGlobalMsg({ type: 'error', text: `请求失败：${e.message}` });
    } finally {
      setLoading(false);
    }
  }

  // ── 兼容校验 ──
  async function checkCompat(card: Card) {
    setCardState(card.rec_id, { loadingCompat: true, compatResult: undefined });
    try {
      const res = await fetch(`${API}/compat/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wheelset: { rim_internal_width_mm: 19 },
          tire: { width: card?.components?.wheelset?.tire || '32C' },
        }),
      });
      const data = await res.json();
      const errors = data.hard_errors?.length ?? 0;
      const warns  = data.warnings?.length ?? 0;
      setCardState(card.rec_id, {
        compatResult: errors === 0
          ? `✅ 兼容性通过（${warns} 条提示）`
          : `❌ ${errors} 个硬错误，${warns} 条警告`,
      });
    } catch {
      setCardState(card.rec_id, { compatResult: '❌ 校验请求失败' });
    } finally {
      setCardState(card.rec_id, { loadingCompat: false });
    }
  }

  // ── 价格估算 ──
  async function estimatePrice(card: Card) {
    setCardState(card.rec_id, { loadingPrice: true, priceResult: undefined });
    try {
      const res = await fetch(`${API}/pricing/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          components: {
            drivetrain: { level: card?.components?.drivetrain?.level || 'Shimano 105/mech' },
            wheelset:   { level: 'Aluminum-durable' },
          },
        }),
      });
      const data = await res.json();
      setCardState(card.rec_id, {
        priceResult: `💰 参考价：¥${data.min?.toLocaleString()} – ¥${data.max?.toLocaleString()}`,
      });
    } catch {
      setCardState(card.rec_id, { priceResult: '估算请求失败' });
    } finally {
      setCardState(card.rec_id, { loadingPrice: false });
    }
  }

  // ── 导出 PDF ──
  async function exportPdf(card: Card) {
    setCardState(card.rec_id, { loadingPdf: true, pdfUrl: undefined });
    try {
      const res = await fetch(`${API}/export/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rec_id: card.rec_id, card }),
      });
      const data = await res.json();
      setCardState(card.rec_id, { pdfUrl: data.url });
    } catch {
      setCardState(card.rec_id, { pdfUrl: '' });
    } finally {
      setCardState(card.rec_id, { loadingPdf: false });
    }
  }

  // ─── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 64px' }}>

      {/* ── 全局导航 ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 36, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>🚲</span>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
            AI BikeBuilder
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/chat" style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 14, textDecoration: 'none',
            background: 'var(--primary)', color: '#fff', fontWeight: 600,
            boxShadow: 'var(--shadow-sm)',
          }}>
            💬 AI 对话配车
          </a>
          <a href="/admin" style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 14, textDecoration: 'none',
            background: '#fff', color: 'var(--foreground)', fontWeight: 600,
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
          }}>
            ⚙️ 顾问后台
          </a>
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{
          fontSize: 'clamp(24px, 4vw, 40px)',
          fontWeight: 800,
          margin: '0 0 10px',
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          找到最适合你的自行车配置
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 16, margin: 0 }}>
          输入预算和骑行偏好，AI 为你精准推荐最优方案
        </p>
      </div>

      {/* ── 输入表单 ── */}
      <div className="card" style={{ padding: '28px 32px', marginBottom: 32 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 24,
        }}>

          {/* 预算区间 */}
          <div>
            <label className="form-label">预算区间（CNY）</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <input
                  className="form-input"
                  type="number"
                  min={1000}
                  max={budgetMax - 1}
                  step={500}
                  value={budgetMin}
                  onChange={e => setBudgetMin(Number(e.target.value))}
                  placeholder="最低"
                />
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 14, flexShrink: 0 }}>—</span>
              <div style={{ flex: 1 }}>
                <input
                  className="form-input"
                  type="number"
                  min={budgetMin + 1}
                  max={200000}
                  step={500}
                  value={budgetMax}
                  onChange={e => setBudgetMax(Number(e.target.value))}
                  placeholder="最高"
                />
              </div>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              当前区间：¥{budgetMin.toLocaleString()} – ¥{budgetMax.toLocaleString()}
            </p>
          </div>

          {/* 骑行场景 */}
          <div>
            <label className="form-label">骑行场景（可多选）</label>
            <TagSelector options={USAGE_OPTIONS} selected={usage} onChange={setUsage} />
          </div>

          {/* 优先考量 */}
          <div>
            <label className="form-label">优先考量（可多选）</label>
            <TagSelector options={PRIORITY_OPTIONS} selected={priority} onChange={setPriority} />
          </div>
        </div>

        {/* 表单底部 */}
        <div className="divider" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            已选：{usage.length} 个场景 · {priority.length} 个优先项
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: '11px 32px', fontSize: 15 }}
            onClick={getRecommend}
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" /> AI 推荐生成中…</>
              : '✨ 生成推荐方案'}
          </button>
        </div>
      </div>

      {/* ── 全局消息 ── */}
      {globalMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          marginBottom: 24,
          fontSize: 14,
          background: globalMsg.type === 'error' ? '#fef2f2' : '#eff6ff',
          color: globalMsg.type === 'error' ? 'var(--danger)' : '#1d4ed8',
          border: `1px solid ${globalMsg.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {globalMsg.type === 'error' ? '⚠️' : 'ℹ️'} {globalMsg.text}
        </div>
      )}

      {/* ── 骨架屏（加载中） ── */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          <SkeletonCard /><SkeletonCard />
        </div>
      )}

      {/* ── 结果卡片 ── */}
      {!loading && cards.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              推荐方案
              <span className="badge badge-purple" style={{ marginLeft: 10, verticalAlign: 'middle' }}>
                {cards.length} 个
              </span>
            </h2>
            {favorites.length > 0 && (
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                ⭐ 已收藏 {favorites.length} 个
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {cards.map(c => (
              <div key={c.rec_id} style={{ position: 'relative' }}>
                <button
                  onClick={() => toggleFavorite(c.rec_id)}
                  title={favorites.includes(c.rec_id) ? '取消收藏' : '收藏此方案'}
                  style={{
                    position: 'absolute', top: 10, left: 10, zIndex: 10,
                    background: favorites.includes(c.rec_id) ? '#fef3c7' : 'rgba(255,255,255,0.9)',
                    border: `1px solid ${favorites.includes(c.rec_id) ? '#fde68a' : 'var(--border)'}`,
                    borderRadius: 8, padding: '4px 8px', fontSize: 14, cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                  }}>
                  {favorites.includes(c.rec_id) ? '⭐' : '☆'}
                </button>
                <RecommendCard
                  card={c}
                  state={cardStates[c.rec_id] || {}}
                  onCompat={() => checkCompat(c)}
                  onPrice={() => estimatePrice(c)}
                  onPdf={() => exportPdf(c)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 空状态 ── */}
      {!loading && cards.length === 0 && !globalMsg && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🚲</div>
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--foreground)' }}>
            还没有推荐方案
          </p>
          <p style={{ fontSize: 14, margin: 0 }}>
            设置好预算和骑行偏好，点击「生成推荐方案」开始吧
          </p>
        </div>
      )}
    </div>
  );
}

