'use client';
import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:3001/v1';

// ─── 类型 ─────────────────────────────────────────────────────────────────────

type Tab = 'templates' | 'rules' | 'prompts' | 'pricing' | 'sync' | 'review' | 'accounts';

interface Template {
  _filename?: string;
  template_id: string;
  name: string;
  category: string;
  budget: { min: number; max: number; currency: string };
  frame_logic: Record<string, unknown>;
  drivetrain_logic: Record<string, unknown>;
  wheel_logic: Record<string, unknown>;
  brake_logic: Record<string, unknown>;
}

interface Rule {
  rule_id: string;
  description?: string;
  type?: string;
  message?: string;
  suggestion?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

interface PricingBand {
  band_id: string;
  component: string;
  level: string;
  price: { min: number; max: number; currency: string };
  source?: string;
  last_verified_at?: string;
}

// ─── 共用样式 ─────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--border)',
  borderRadius: 12, padding: '16px 18px',
  boxShadow: 'var(--shadow-sm)',
};

const primaryBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
};

const dangerBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8, fontSize: 13,
  background: '#fff', color: 'var(--foreground)',
  border: '1px solid var(--border)', cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
  border: '1px solid var(--border)', outline: 'none', background: '#f8fafc',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--muted)', marginBottom: 4,
};

// ─── 小工具 ──────────────────────────────────────────────────────────────────

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, React.CSSProperties> = {
    purple: { background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd' },
    blue:   { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    green:  { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' },
    amber:  { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
    red:    { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
    gray:   { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' },
  };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, ...colors[color] }}>
      {children}
    </span>
  );
}

function StatusBar({ msg, onClose }: { msg: { type: 'ok' | 'err'; text: string } | null; onClose?: () => void }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
      background: msg.type === 'ok' ? '#ecfdf5' : '#fef2f2',
      color: msg.type === 'ok' ? '#065f46' : '#dc2626',
      border: `1px solid ${msg.type === 'ok' ? '#a7f3d0' : '#fecaca'}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span>{msg.type === 'ok' ? '✅' : '❌'} {msg.text}</span>
      {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit' }}>×</button>}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─── 模板 Tab ─────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'road', label: '🛣️ 公路' },
  { value: 'mountain', label: '⛰️ 山地' },
  { value: 'commute', label: '🏙️ 通勤' },
  { value: 'gravel', label: '🌿 砾石' },
];

const CATEGORY_LABELS: Record<string, string> = {
  road: '🛣️ 公路', mountain: '⛰️ 山地', commute: '🏙️ 通勤', gravel: '🌿 砾石',
};

const EMPTY_TEMPLATE: Partial<Template> = {
  template_id: '', name: '', category: 'road',
  budget: { min: 3000, max: 6000, currency: 'CNY' },
  frame_logic: { type: 'race_road', material: ['Al'] },
  drivetrain_logic: { level: ['Shimano Claris'], config: ['2x8'] },
  wheel_logic: { rim: 'Al', tire_width: '23C-28C' },
  brake_logic: { type: ['rim_brake'] },
};

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [view, setView] = useState<'list' | 'edit' | 'new'>('list');
  const [selected, setSelected] = useState<Template | null>(null);
  const [editing, setEditing] = useState('');
  const [newForm, setNewForm] = useState({ ...EMPTY_TEMPLATE });
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/templates`);
      if (!res.ok) throw new Error('需要启动 API 服务');
      setTemplates(await res.json());
    } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveEdit() {
    if (!selected) return;
    try {
      const body = JSON.parse(editing);
      const res = await fetch(`${API}/admin/templates/${selected.template_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus({ type: 'ok', text: `模板「${selected.name}」已保存` });
      setView('list'); load();
    } catch (e: any) { setStatus({ type: 'err', text: `保存失败：${e.message}` }); }
  }

  async function deleteTemplate(t: Template) {
    if (!confirm(`确定删除模板「${t.name}」？`)) return;
    try {
      const res = await fetch(`${API}/admin/templates/${t.template_id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus({ type: 'ok', text: `已删除模板「${t.name}」` });
      load();
    } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
  }

  async function createTemplate() {
    try {
      if (!newForm.template_id || !newForm.name) throw new Error('template_id 和名称不能为空');
      const res = await fetch(`${API}/admin/templates/${newForm.template_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus({ type: 'ok', text: `模板「${newForm.name}」已创建` });
      setNewForm({ ...EMPTY_TEMPLATE }); setView('list'); load();
    } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>加载中…</div>;

  if (view === 'edit' && selected) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setView('list')} style={ghostBtn}>← 返回</button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>编辑：{selected.name}</h3>
      </div>
      <StatusBar msg={status} onClose={() => setStatus(null)} />
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--muted)' }}>直接编辑 JSON，保存后立即影响推荐结果</p>
      <textarea value={editing} onChange={e => setEditing(e.target.value)} style={{ ...inputStyle, minHeight: 440, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={saveEdit} style={primaryBtn}>💾 保存</button>
        <button onClick={() => setView('list')} style={ghostBtn}>取消</button>
      </div>
    </div>
  );

  if (view === 'new') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView('list')} style={ghostBtn}>← 返回</button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>新建配置模板</h3>
      </div>
      <StatusBar msg={status} onClose={() => setStatus(null)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <FormField label="模板 ID（英文+数字+连字符）">
          <input style={inputStyle} placeholder="如 R3-SPORTIVE-6K-10K" value={newForm.template_id as string}
            onChange={e => setNewForm(f => ({ ...f, template_id: e.target.value }))} />
        </FormField>
        <FormField label="中文名称">
          <input style={inputStyle} placeholder="如 运动竞技公路（6k-10k）" value={newForm.name as string}
            onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
        </FormField>
        <FormField label="车型分类">
          <select style={inputStyle} value={newForm.category as string}
            onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
        <div />
        <FormField label="预算下限（CNY）">
          <input style={inputStyle} type="number" value={(newForm.budget as any)?.min}
            onChange={e => setNewForm(f => ({ ...f, budget: { ...(f.budget as any), min: +e.target.value } }))} />
        </FormField>
        <FormField label="预算上限（CNY）">
          <input style={inputStyle} type="number" value={(newForm.budget as any)?.max}
            onChange={e => setNewForm(f => ({ ...f, budget: { ...(f.budget as any), max: +e.target.value } }))} />
        </FormField>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <FormField label="车架配置（JSON）">
          <textarea style={{ ...inputStyle, minHeight: 80, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
            value={JSON.stringify(newForm.frame_logic, null, 2)}
            onChange={e => { try { setNewForm(f => ({ ...f, frame_logic: JSON.parse(e.target.value) })); } catch { } }} />
        </FormField>
        <FormField label="传动配置（JSON）">
          <textarea style={{ ...inputStyle, minHeight: 80, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
            value={JSON.stringify(newForm.drivetrain_logic, null, 2)}
            onChange={e => { try { setNewForm(f => ({ ...f, drivetrain_logic: JSON.parse(e.target.value) })); } catch { } }} />
        </FormField>
        <FormField label="轮组配置（JSON）">
          <textarea style={{ ...inputStyle, minHeight: 80, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
            value={JSON.stringify(newForm.wheel_logic, null, 2)}
            onChange={e => { try { setNewForm(f => ({ ...f, wheel_logic: JSON.parse(e.target.value) })); } catch { } }} />
        </FormField>
        <FormField label="刹车配置（JSON）">
          <textarea style={{ ...inputStyle, minHeight: 80, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
            value={JSON.stringify(newForm.brake_logic, null, 2)}
            onChange={e => { try { setNewForm(f => ({ ...f, brake_logic: JSON.parse(e.target.value) })); } catch { } }} />
        </FormField>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={createTemplate} style={primaryBtn}>✅ 创建模板</button>
        <button onClick={() => setView('list')} style={ghostBtn}>取消</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>共 {templates.length} 个配置模板</div>
        <button onClick={() => { setView('new'); setStatus(null); }} style={primaryBtn}>＋ 新建模板</button>
      </div>
      <StatusBar msg={status} onClose={() => setStatus(null)} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {templates.map(t => (
          <div key={t.template_id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--muted)' }}>{t.template_id}</p>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t.name}</h4>
              </div>
              <Badge color="purple">{CATEGORY_LABELS[t.category] || t.category}</Badge>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>💰 ¥{t.budget?.min?.toLocaleString()} – ¥{t.budget?.max?.toLocaleString()}</div>
              <div>🚲 {JSON.stringify(t.frame_logic?.type ?? t.frame_logic)}</div>
              <div>⚙️ {JSON.stringify((t.drivetrain_logic as any)?.level ?? t.drivetrain_logic)}</div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button onClick={() => { setSelected(t); setEditing(JSON.stringify(t, null, 2)); setView('edit'); setStatus(null); }} style={primaryBtn}>✏️ 编辑</button>
              <button onClick={() => deleteTemplate(t)} style={dangerBtn}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 兼容规则 Tab ─────────────────────────────────────────────────────────────

const EMPTY_RULE: Partial<Rule> = {
  rule_id: '', type: 'warning', description: '',
  condition: {}, message: '', suggestion: '', enabled: true,
};

function RulesTab() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [view, setView] = useState<'list' | 'edit' | 'new'>('list');
  const [selected, setSelected] = useState<Rule | null>(null);
  const [editing, setEditing] = useState('');
  const [newForm, setNewForm] = useState<Partial<Rule>>({ ...EMPTY_RULE });
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/rules`);
      if (!res.ok) throw new Error('需要启动 API 服务');
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveEdit() {
    if (!selected) return;
    try {
      const body = JSON.parse(editing);
      const res = await fetch(`${API}/admin/rules/${selected.rule_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus({ type: 'ok', text: `规则 ${selected.rule_id} 已保存` });
      setView('list'); load();
    } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
  }

  async function toggleEnabled(r: Rule) {
    try {
      const res = await fetch(`${API}/admin/rules/${r.rule_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...r, enabled: !r.enabled }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      load();
    } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
  }

  async function deleteRule(r: Rule) {
    if (!confirm(`确定删除规则「${r.rule_id}」？`)) return;
    try {
      const res = await fetch(`${API}/admin/rules/${r.rule_id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus({ type: 'ok', text: `已删除规则 ${r.rule_id}` });
      load();
    } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
  }

  async function createRule() {
    try {
      if (!newForm.rule_id) throw new Error('rule_id 不能为空');
      const res = await fetch(`${API}/admin/rules`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus({ type: 'ok', text: `规则 ${newForm.rule_id} 已创建` });
      setNewForm({ ...EMPTY_RULE }); setView('list'); load();
    } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>加载中…</div>;

  if (view === 'edit' && selected) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setView('list')} style={ghostBtn}>← 返回</button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>编辑规则：{selected.rule_id}</h3>
      </div>
      <StatusBar msg={status} onClose={() => setStatus(null)} />
      <textarea value={editing} onChange={e => setEditing(e.target.value)}
        style={{ ...inputStyle, minHeight: 360, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={saveEdit} style={primaryBtn}>💾 保存</button>
        <button onClick={() => setView('list')} style={ghostBtn}>取消</button>
      </div>
    </div>
  );

  if (view === 'new') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView('list')} style={ghostBtn}>← 返回</button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>新建兼容规则</h3>
      </div>
      <StatusBar msg={status} onClose={() => setStatus(null)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <FormField label="规则 ID（英文+数字+连字符）">
          <input style={inputStyle} placeholder="如 BRAKE-DISC-ONLY-001" value={newForm.rule_id as string}
            onChange={e => setNewForm(f => ({ ...f, rule_id: e.target.value }))} />
        </FormField>
        <FormField label="规则类型">
          <select style={inputStyle} value={newForm.type as string}
            onChange={e => setNewForm(f => ({ ...f, type: e.target.value }))}>
            <option value="warning">⚠️ warning（警告，可忽略）</option>
            <option value="hard_error">🚫 hard_error（严重，阻止配置）</option>
          </select>
        </FormField>
      </div>
      <FormField label="规则描述">
        <input style={inputStyle} placeholder="一句话描述此规则的作用" value={newForm.description as string}
          onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
      </FormField>
      <FormField label="触发消息（用户看到的提示）">
        <input style={inputStyle} placeholder="配置存在兼容性问题……" value={newForm.message as string}
          onChange={e => setNewForm(f => ({ ...f, message: e.target.value }))} />
      </FormField>
      <FormField label="建议操作">
        <input style={inputStyle} placeholder="建议更换为……" value={newForm.suggestion as string}
          onChange={e => setNewForm(f => ({ ...f, suggestion: e.target.value }))} />
      </FormField>
      <FormField label="触发条件（JSON）">
        <textarea style={{ ...inputStyle, minHeight: 80, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
          placeholder={'{\n  "rim_internal_width_mm": { "lte": 19 },\n  "tire_width_c": { "gte": 45 }\n}'}
          onChange={e => { try { setNewForm(f => ({ ...f, condition: JSON.parse(e.target.value) })); } catch { } }} />
      </FormField>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={createRule} style={primaryBtn}>✅ 创建规则</button>
        <button onClick={() => setView('list')} style={ghostBtn}>取消</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>共 {rules.length} 条规则</div>
        <button onClick={() => { setView('new'); setStatus(null); }} style={primaryBtn}>＋ 新建规则</button>
      </div>
      <StatusBar msg={status} onClose={() => setStatus(null)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rules.map(r => (
          <div key={r.rule_id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <code style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{r.rule_id}</code>
                <Badge color={r.type === 'hard_error' ? 'red' : 'amber'}>{r.type}</Badge>
                <Badge color={r.enabled !== false ? 'green' : 'gray'}>{r.enabled !== false ? '启用' : '禁用'}</Badge>
              </div>
              {r.description && <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--foreground)' }}>{r.description}</p>}
              {r.message && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>提示：{r.message}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => toggleEnabled(r)} style={{ ...ghostBtn, fontSize: 12 }}>
                {r.enabled !== false ? '禁用' : '启用'}
              </button>
              <button onClick={() => { setSelected(r); setEditing(JSON.stringify(r, null, 2)); setView('edit'); setStatus(null); }} style={primaryBtn}>✏️</button>
              <button onClick={() => deleteRule(r)} style={dangerBtn}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Prompt Tab ────────────────────────────────────────────────────────────

function PromptsTab() {
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/admin/prompts`);
        if (!res.ok) throw new Error('需要启动 API 服务');
        const { content: c } = await res.json();
        setContent(c); setOriginal(c);
      } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
      finally { setLoading(false); }
    })();
  }, []);

  async function save() {
    try {
      const res = await fetch(`${API}/admin/prompts`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setOriginal(content);
      setStatus({ type: 'ok', text: 'System Prompt 已保存，新的对话将使用更新后的提示词' });
    } catch (e: any) { setStatus({ type: 'err', text: `保存失败：${e.message}` }); }
  }

  const isDirty = content !== original;
  if (loading) return <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>加载中…</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>AI 顾问 System Prompt</h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          决定 AI 顾问的回答风格、专业程度和推荐逻辑，修改后对新对话立即生效。
        </p>
      </div>
      <StatusBar msg={status} onClose={() => setStatus(null)} />
      <div style={{ position: 'relative' }}>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          style={{ ...inputStyle, minHeight: 480, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7,
            borderColor: isDirty ? 'var(--primary)' : 'var(--border)', resize: 'vertical', transition: 'border-color .2s' }} />
        {isDirty && (
          <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 11, fontWeight: 600,
            color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 6 }}>
            未保存
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={save} disabled={!isDirty} style={{ ...primaryBtn, opacity: isDirty ? 1 : 0.5 }}>💾 保存</button>
        <button onClick={() => setContent(original)} disabled={!isDirty} style={{ ...ghostBtn, opacity: isDirty ? 1 : 0.5 }}>撤销</button>
      </div>
    </div>
  );
}

// ─── 零件定价 Tab ─────────────────────────────────────────────────────────────

const COMPONENT_LABELS: Record<string, string> = {
  frame: '🚲 车架', drivetrain: '⚙️ 传动', wheelset: '🔄 轮组',
  brake: '🛑 刹车', saddle: '🪑 坐垫', handlebar: '🤲 车把', fork: '🔧 前叉',
};

const EMPTY_BAND: Partial<PricingBand> = {
  band_id: '', component: 'drivetrain', level: '',
  price: { min: 0, max: 0, currency: 'CNY' },
  source: 'manual', last_verified_at: new Date().toISOString().slice(0, 10),
};

function PricingTab() {
  const [bands, setBands] = useState<PricingBand[]>([]);
  const [view, setView] = useState<'table' | 'new' | 'edit'>('table');
  const [selected, setSelected] = useState<PricingBand | null>(null);
  const [newForm, setNewForm] = useState<Partial<PricingBand>>({ ...EMPTY_BAND });
  const [editForm, setEditForm] = useState<Partial<PricingBand>>({});
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterComp, setFilterComp] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/pricing`);
      if (!res.ok) throw new Error('需要启动 API 服务');
      setBands(await res.json());
    } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createBand() {
    try {
      if (!newForm.band_id || !newForm.level) throw new Error('band_id 和级别描述不能为空');
      const res = await fetch(`${API}/admin/pricing`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus({ type: 'ok', text: `已添加 ${newForm.band_id}` });
      setNewForm({ ...EMPTY_BAND }); setView('table'); load();
    } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
  }

  async function saveBand() {
    if (!selected) return;
    try {
      const res = await fetch(`${API}/admin/pricing/${selected.band_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus({ type: 'ok', text: `已更新 ${selected.band_id}` });
      setView('table'); load();
    } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
  }

  async function deleteBand(b: PricingBand) {
    if (!confirm(`确定删除「${b.level}」？`)) return;
    try {
      const res = await fetch(`${API}/admin/pricing/${b.band_id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus({ type: 'ok', text: `已删除 ${b.band_id}` });
      load();
    } catch (e: any) { setStatus({ type: 'err', text: e.message }); }
  }

  function openEdit(b: PricingBand) {
    setSelected(b); setEditForm({ ...b }); setView('edit'); setStatus(null);
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>加载中…</div>;

  const BandForm = ({ form, onChange, onSubmit, submitLabel, onCancel }: {
    form: Partial<PricingBand>;
    onChange: (f: Partial<PricingBand>) => void;
    onSubmit: () => void;
    submitLabel: string;
    onCancel: () => void;
  }) => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <FormField label="Band ID（英文+数字+连字符）">
          <input style={inputStyle} placeholder="如 DRV-105-DI2" value={form.band_id ?? ''}
            onChange={e => onChange({ ...form, band_id: e.target.value })} />
        </FormField>
        <FormField label="零件类别">
          <select style={inputStyle} value={form.component ?? 'drivetrain'}
            onChange={e => onChange({ ...form, component: e.target.value })}>
            {Object.entries(COMPONENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="级别描述（完整名称）">
        <input style={inputStyle} placeholder="如 Shimano 105 R7100 Di2 2×12速电变" value={form.level ?? ''}
          onChange={e => onChange({ ...form, level: e.target.value })} />
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        <FormField label="最低价（CNY）">
          <input style={inputStyle} type="number" value={form.price?.min ?? 0}
            onChange={e => onChange({ ...form, price: { ...(form.price as any), min: +e.target.value, currency: 'CNY' } })} />
        </FormField>
        <FormField label="最高价（CNY）">
          <input style={inputStyle} type="number" value={form.price?.max ?? 0}
            onChange={e => onChange({ ...form, price: { ...(form.price as any), max: +e.target.value, currency: 'CNY' } })} />
        </FormField>
        <FormField label="数据来源">
          <input style={inputStyle} placeholder="如 shimano-cn-2024" value={form.source ?? ''}
            onChange={e => onChange({ ...form, source: e.target.value })} />
        </FormField>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onSubmit} style={primaryBtn}>{submitLabel}</button>
        <button onClick={onCancel} style={ghostBtn}>取消</button>
      </div>
    </div>
  );

  if (view === 'new') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView('table')} style={ghostBtn}>← 返回</button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>新增定价区间</h3>
      </div>
      <StatusBar msg={status} onClose={() => setStatus(null)} />
      <BandForm form={newForm} onChange={setNewForm} onSubmit={createBand} submitLabel="✅ 添加" onCancel={() => setView('table')} />
    </div>
  );

  if (view === 'edit' && selected) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView('table')} style={ghostBtn}>← 返回</button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>编辑：{selected.band_id}</h3>
      </div>
      <StatusBar msg={status} onClose={() => setStatus(null)} />
      <BandForm form={editForm} onChange={setEditForm} onSubmit={saveBand} submitLabel="💾 保存" onCancel={() => setView('table')} />
    </div>
  );

  const comps = [...new Set(bands.map(b => b.component))];
  const filtered = filterComp ? bands.filter(b => b.component === filterComp) : bands;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>共 {bands.length} 条</span>
          <button onClick={() => setFilterComp('')} style={{ ...ghostBtn, fontSize: 12, opacity: filterComp ? 1 : 0.5 }}>全部</button>
          {comps.map(c => (
            <button key={c} onClick={() => setFilterComp(c === filterComp ? '' : c)} style={{
              ...ghostBtn, fontSize: 12,
              borderColor: filterComp === c ? 'var(--primary)' : 'var(--border)',
              color: filterComp === c ? 'var(--primary)' : 'var(--foreground)',
            }}>
              {COMPONENT_LABELS[c] || c}
            </button>
          ))}
        </div>
        <button onClick={() => { setView('new'); setStatus(null); }} style={primaryBtn}>＋ 新增</button>
      </div>
      <StatusBar msg={status} onClose={() => setStatus(null)} />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
              {['Band ID', '类别', '级别描述', '价格区间（CNY）', '来源', '更新日期', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.band_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px' }}><code style={{ fontSize: 12, color: 'var(--primary)' }}>{b.band_id}</code></td>
                <td style={{ padding: '10px 12px' }}><Badge color="blue">{COMPONENT_LABELS[b.component] || b.component}</Badge></td>
                <td style={{ padding: '10px 12px', maxWidth: 240 }}>{b.level}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  ¥{b.price.min.toLocaleString()} – ¥{b.price.max.toLocaleString()}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>{b.source}</td>
                <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>{b.last_verified_at}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(b)} style={{ ...primaryBtn, padding: '4px 10px', fontSize: 12 }}>✏️</button>
                    <button onClick={() => deleteBand(b)} style={{ ...dangerBtn, padding: '4px 10px', fontSize: 12 }}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 外部数据同步 Tab ─────────────────────────────────────────────────────────

const SYNC_EXAMPLES = [
  {
    label: '示例 1：合并公开定价数据',
    url: 'https://your-pricing-api.com/api/bands',
    type: 'pricing' as const,
    mode: 'merge' as const,
    desc: '从外部定价系统拉取新品报价，与本地数据合并（已有的不覆盖）',
  },
  {
    label: '示例 2：替换兼容规则库',
    url: 'https://your-rules-repo.com/compat-rules.json',
    type: 'rules' as const,
    mode: 'replace' as const,
    desc: '从 Git 仓库的最新 JSON 文件完整替换本地兼容规则（谨慎操作）',
  },
  {
    label: '示例 3：同步配置模板',
    url: 'https://api.example.com/bike-templates',
    type: 'templates' as const,
    mode: 'merge' as const,
    desc: '从品牌厂商 API 同步最新车型模板，不覆盖本地自定义模板',
  },
];

interface SyncResult { imported: number; skipped: number; message: string; }

function SyncTab() {
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'templates' | 'rules' | 'pricing'>('pricing');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [history, setHistory] = useState<Array<{ time: string; url: string; type: string; mode: string; result: SyncResult }>>([]);

  async function doSync() {
    if (!url.trim()) { setStatus({ type: 'err', text: 'URL 不能为空' }); return; }
    setLoading(true); setStatus(null); setResult(null);
    try {
      const res = await fetch(`${API}/admin/sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), type, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStatus({ type: 'ok', text: data.message });
      setHistory(h => [{ time: new Date().toLocaleTimeString('zh-CN'), url: url.trim(), type, mode, result: data }, ...h.slice(0, 9)]);
    } catch (e: any) {
      setStatus({ type: 'err', text: `同步失败：${e.message}` });
    } finally { setLoading(false); }
  }

  function applyExample(ex: typeof SYNC_EXAMPLES[0]) {
    setUrl(ex.url); setType(ex.type); setMode(ex.mode);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>外部数据源同步</h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          从外部 API 或 JSON 文件 URL 拉取数据，合并或替换本地知识库。适用于对接 ERP、供应链 API、行业数据库等场景。
        </p>
      </div>

      {/* 示例场景 */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 10 }}>📌 常见对接场景</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {SYNC_EXAMPLES.map(ex => (
            <div key={ex.label} style={{ ...cardStyle, cursor: 'pointer', transition: 'border-color .15s' }}
              onClick={() => applyExample(ex)}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{ex.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{ex.desc}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Badge color="blue">{ex.type}</Badge>
                <Badge color={ex.mode === 'merge' ? 'green' : 'amber'}>{ex.mode}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 配置区 */}
      <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <FormField label="外部数据 URL（必须返回 JSON）">
          <input style={inputStyle} placeholder="https://api.example.com/pricing/latest"
            value={url} onChange={e => setUrl(e.target.value)} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <FormField label="数据类型">
            <select style={inputStyle} value={type} onChange={e => setType(e.target.value as any)}>
              <option value="pricing">💰 定价区间（pricing）</option>
              <option value="rules">🔧 兼容规则（rules）</option>
              <option value="templates">🚲 配置模板（templates）</option>
            </select>
          </FormField>
          <FormField label="同步模式">
            <select style={inputStyle} value={mode} onChange={e => setMode(e.target.value as any)}>
              <option value="merge">🔀 合并（Merge）— 仅新增，不覆盖已有数据</option>
              <option value="replace">♻️ 替换（Replace）— 完全替换本地数据（谨慎！）</option>
            </select>
          </FormField>
        </div>

        {mode === 'replace' && (
          <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e', marginTop: 4 }}>
            ⚠️ <strong>替换模式</strong>：将<strong>完全清除</strong>本地所有{type === 'pricing' ? '定价区间' : type === 'rules' ? '兼容规则' : '配置模板'}数据，并用外部数据取代。建议先备份。
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={doSync} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? '⏳ 同步中…' : '🔄 执行同步'}
          </button>
          {result && (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              导入 <strong>{result.imported}</strong> 条，跳过 <strong>{result.skipped}</strong> 条
            </div>
          )}
        </div>
      </div>

      <StatusBar msg={status} onClose={() => setStatus(null)} />

      {/* 同步历史 */}
      {history.length > 0 && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 10 }}>📋 本次会话同步记录</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((h, i) => (
              <div key={i} style={{ ...cardStyle, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{h.time}</span>
                <Badge color="blue">{h.type}</Badge>
                <Badge color={h.mode === 'merge' ? 'green' : 'amber'}>{h.mode}</Badge>
                <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.url}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', flexShrink: 0 }}>
                  +{h.result.imported} / skip {h.result.skipped}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 审核草稿 Tab ─────────────────────────────────────────────────────────────

type DraftStatus = 'pending' | 'approved' | 'rejected';
type DraftType   = 'template' | 'rule' | 'pricing_band';
type DraftAction = 'create' | 'update' | 'delete';

interface Draft {
  draftId: string;
  type: DraftType;
  action: DraftAction;
  authorId: string;
  authorName: string;
  submittedAt: string;
  status: DraftStatus;
  reviewedAt?: string;
  reviewerNote?: string;
  payload: Record<string, unknown>;
  targetId?: string;
}

function ReviewTab() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filter, setFilter] = useState<DraftStatus | 'all'>('pending');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') ?? '' : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`${API}/drafts/admin/all${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('获取草稿失败，请确认已登录管理员账号');
      setDrafts(await res.json());
    } catch (e: unknown) {
      setStatus({ type: 'err', text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [filter, token]);

  useEffect(() => { load(); }, [load]);

  async function approve(d: Draft) {
    const res = await fetch(`${API}/drafts/${d.draftId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ note }),
    });
    const data = await res.json();
    if (!res.ok) { setStatus({ type: 'err', text: data.error ?? '操作失败' }); return; }
    setStatus({ type: 'ok', text: '✅ 已通过，知识库已更新' });
    setSelected(null); setNote('');
    load();
  }

  async function reject(d: Draft) {
    if (!note.trim()) { alert('请填写拒绝理由'); return; }
    const res = await fetch(`${API}/drafts/${d.draftId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ note }),
    });
    const data = await res.json();
    if (!res.ok) { setStatus({ type: 'err', text: data.error ?? '操作失败' }); return; }
    setStatus({ type: 'ok', text: '已拒绝该草稿' });
    setSelected(null); setNote('');
    load();
  }

  const typeLabel: Record<DraftType, string> = {
    template: '配置模板', rule: '兼容规则', pricing_band: '定价区间',
  };
  const actionLabel: Record<DraftAction, string> = {
    create: '新增', update: '修改', delete: '删除',
  };
  const statusColors: Record<DraftStatus, string> = {
    pending: 'amber', approved: 'green', rejected: 'red',
  };
  const statusLabel: Record<DraftStatus, string> = {
    pending: '待审核', approved: '已通过', rejected: '已拒绝',
  };

  return (
    <div>
      <StatusBar msg={status} onClose={() => setStatus(null)} />

      {/* 筛选 + 刷新 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: filter === f ? 700 : 400,
            border: `1.5px solid ${filter === f ? 'var(--primary)' : 'var(--border)'}`,
            background: filter === f ? 'var(--primary-light)' : '#fff',
            color: filter === f ? 'var(--primary)' : 'var(--foreground)', cursor: 'pointer',
          }}>
            {f === 'all' ? '全部' : statusLabel[f]}
          </button>
        ))}
        <button onClick={load} style={{ ...ghostBtn, marginLeft: 'auto', padding: '5px 14px', fontSize: 12 }}>🔄 刷新</button>
      </div>

      {loading && <p style={{ color: 'var(--muted)', fontSize: 13 }}>加载中…</p>}
      {!loading && drafts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
          <p style={{ fontSize: 14 }}>{filter === 'pending' ? '暂无待审核草稿' : '暂无数据'}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {drafts.map(d => (
          <div key={d.draftId} style={{
            ...cardStyle, display: 'flex', gap: 16, alignItems: 'flex-start',
            cursor: 'pointer',
            borderColor: selected?.draftId === d.draftId ? 'var(--primary)' : undefined,
          }} onClick={() => { setSelected(d === selected ? null : d); setNote(''); }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <Badge color={statusColors[d.status]}>{statusLabel[d.status]}</Badge>
                <Badge color="blue">{typeLabel[d.type]}</Badge>
                <Badge color="gray">{actionLabel[d.action]}</Badge>
                {d.targetId && <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{d.targetId}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                👤 {d.authorName} &nbsp;·&nbsp; {new Date(d.submittedAt).toLocaleString('zh-CN')}
              </div>
              {d.reviewerNote && d.status !== 'pending' && (
                <div style={{ marginTop: 6, fontSize: 12, background: '#f8fafc', borderRadius: 6, padding: '4px 8px', color: '#475569' }}>
                  💬 {d.reviewerNote}
                </div>
              )}
            </div>
            <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
              {selected?.draftId === d.draftId ? '▲ 收起' : '▼ 展开'}
            </span>
          </div>
        ))}
      </div>

      {/* 详情面板 */}
      {selected && (
        <div style={{ marginTop: 16, ...cardStyle, background: '#f8fafc', border: '1.5px solid var(--primary)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>📄 草稿内容</h3>
          <pre style={{
            background: '#1e1e1e', color: '#d4d4d4', borderRadius: 8, padding: 16,
            fontSize: 12, overflow: 'auto', maxHeight: 300, lineHeight: 1.6,
          }}>
            {JSON.stringify(selected.payload, null, 2)}
          </pre>

          {selected.status === 'pending' && (
            <div style={{ marginTop: 16 }}>
              <FormField label="审核备注（通过时可选，拒绝时必填）">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="例：数据格式正确，已核实价格区间…"
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </FormField>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => approve(selected)} style={primaryBtn}>✅ 通过并写入知识库</button>
                <button onClick={() => reject(selected)} style={dangerBtn}>❌ 拒绝</button>
                <button onClick={() => { setSelected(null); setNote(''); }} style={ghostBtn}>取消</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 账号管理 Tab ─────────────────────────────────────────────────────────────

interface UserRecord {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  role: 'visitor' | 'advisor' | 'admin';
  approved: boolean;
  createdAt: string;
}

function AccountsTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') ?? '' : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('获取用户列表失败，请确认已登录管理员账号');
      setUsers(await res.json());
    } catch (e: unknown) {
      setStatus({ type: 'err', text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function approveUser(userId: string) {
    const res = await fetch(`${API}/auth/users/${userId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { setStatus({ type: 'err', text: '操作失败' }); return; }
    setStatus({ type: 'ok', text: '账号已审批通过' });
    load();
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`确认删除账号 "${name}"？此操作不可撤销。`)) return;
    const res = await fetch(`${API}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { setStatus({ type: 'err', text: '删除失败' }); return; }
    setStatus({ type: 'ok', text: `账号 ${name} 已删除` });
    load();
  }

  const roleColors: Record<string, string> = { admin: 'purple', advisor: 'blue', visitor: 'gray' };

  const pending  = users.filter(u => u.role === 'advisor' && !u.approved);
  const approved = users.filter(u => u.role !== 'advisor' || u.approved);

  return (
    <div>
      <StatusBar msg={status} onClose={() => setStatus(null)} />

      {/* 待审批列表 */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#92400e' }}>
            ⏳ 待审批顾问（{pending.length}）
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(u => (
              <div key={u.userId} style={{
                ...cardStyle, display: 'flex', alignItems: 'center', gap: 14,
                background: '#fffbeb', borderColor: '#fde68a',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{u.displayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    @{u.username} &nbsp;·&nbsp; {u.email} &nbsp;·&nbsp;
                    注册于 {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <button onClick={() => approveUser(u.userId)} style={primaryBtn}>✅ 批准</button>
                <button onClick={() => deleteUser(u.userId, u.displayName)} style={dangerBtn}>拒绝删除</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 全部用户列表 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>所有账号（{users.length}）</h3>
          <button onClick={load} style={{ ...ghostBtn, padding: '5px 14px', fontSize: 12 }}>🔄 刷新</button>
        </div>
        {loading && <p style={{ color: 'var(--muted)', fontSize: 13 }}>加载中…</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {approved.map(u => (
            <div key={u.userId} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <Badge color={roleColors[u.role]}>{u.role}</Badge>
                  {u.role === 'advisor' && (
                    <Badge color={u.approved ? 'green' : 'amber'}>{u.approved ? '已认证' : '待审批'}</Badge>
                  )}
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{u.displayName}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  @{u.username} &nbsp;·&nbsp; {u.email} &nbsp;·&nbsp;
                  {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
              {u.role !== 'admin' && (
                <button onClick={() => deleteUser(u.userId, u.displayName)} style={{ ...dangerBtn, background: '#fff', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 12px', fontSize: 12 }}>
                  删除
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; desc: string }[] = [
  { key: 'templates', label: '🚲 配置模板', desc: '管理推荐方案模板' },
  { key: 'rules',     label: '🔧 兼容规则', desc: '零件兼容性校验规则' },
  { key: 'prompts',   label: '🤖 AI 提示词', desc: 'AI 顾问回答风格' },
  { key: 'pricing',   label: '💰 零件定价', desc: '参考价格区间' },
  { key: 'sync',      label: '🔄 外部同步', desc: '对接外部 API 数据源' },
  { key: 'review',    label: '📝 审核草稿', desc: '顾问提交内容审核' },
  { key: 'accounts',  label: '👥 账号管理', desc: '顾问注册审批' },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('templates');

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 64px' }}>
      {/* 顶栏 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/" style={{ fontSize: 22, textDecoration: 'none', color: 'var(--foreground)' }}>←</a>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>顾问知识库管理</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--muted)' }}>配置 AI 推荐所需的基础知识：车型模板、兼容规则、提示词、定价、外部数据同步</p>
          </div>
        </div>
        <a href="/chat" style={{
          padding: '8px 18px', borderRadius: 10, fontSize: 14, textDecoration: 'none',
          background: 'var(--primary)', color: '#fff', fontWeight: 600, alignSelf: 'center',
        }}>
          💬 进入对话模式
        </a>
      </div>

      {/* Tab 导航 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: tab === t.key ? 700 : 400,
            border: `1.5px solid ${tab === t.key ? 'var(--primary)' : 'var(--border)'}`,
            background: tab === t.key ? 'var(--primary-light)' : '#fff',
            color: tab === t.key ? 'var(--primary)' : 'var(--foreground)',
            cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div style={{
        background: '#fff', border: '1px solid var(--border)',
        borderRadius: 14, padding: '28px 32px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'rules'     && <RulesTab />}
        {tab === 'prompts'   && <PromptsTab />}
        {tab === 'pricing'   && <PricingTab />}
        {tab === 'sync'      && <SyncTab />}
        {tab === 'review'    && <ReviewTab />}
        {tab === 'accounts'  && <AccountsTab />}
      </div>
    </div>
  );
}
