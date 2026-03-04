'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

// ─── 类型 ─────────────────────────────────────────────────────────────────────
type DraftType   = 'template' | 'rule' | 'pricing_band';
type DraftAction = 'create' | 'update' | 'delete';
type DraftStatus = 'pending' | 'approved' | 'rejected';

interface Draft {
  draftId: string;
  type: DraftType;
  action: DraftAction;
  authorName: string;
  submittedAt: string;
  status: DraftStatus;
  reviewedAt?: string;
  reviewerNote?: string;
  payload: Record<string, unknown>;
  targetId?: string;
}

// ─── 状态徽章 ─────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: DraftStatus }) {
  const map: Record<DraftStatus, string> = {
    pending:  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approved: 'bg-green-500/20  text-green-400  border-green-500/30',
    rejected: 'bg-red-500/20    text-red-400    border-red-500/30',
  };
  const label: Record<DraftStatus, string> = {
    pending: '⏳ 审核中', approved: '✅ 已通过', rejected: '❌ 已拒绝',
  };
  return (
    <span className={`text-xs border px-2 py-0.5 rounded-full font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function TypeLabel({ type }: { type: DraftType }) {
  const map: Record<DraftType, string> = {
    template: '📋 配置模板', rule: '🔧 兼容规则', pricing_band: '💰 定价区间',
  };
  return <span className="text-slate-400 text-xs">{map[type]}</span>;
}

// ─── 模板提交表单 ─────────────────────────────────────────────────────────────
function TemplateForm({ token, onSuccess }: { token: string; onSuccess: () => void }) {
  const [json, setJson] = useState('{\n  "templateId": "",\n  "name": "",\n  "category": "road",\n  "budgetMin": 4000,\n  "budgetMax": 8000,\n  "description": "",\n  "components": {}\n}');
  const [action, setAction] = useState<DraftAction>('create');
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(json); }
    catch { setError('JSON 格式有误，请检查'); return; }

    setLoading(true);
    const res = await fetch(`${API_BASE}/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: 'template', action, targetId: targetId || undefined, payload }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? '提交失败'); return; }
    onSuccess();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">操作类型</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as DraftAction)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="create">新增模板</option>
            <option value="update">修改模板</option>
            <option value="delete">删除模板</option>
          </select>
        </div>
        {action !== 'create' && (
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">目标模板 ID</label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="例：R1-ENTRY-ROAD-4K-7K"
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        )}
      </div>

      {action !== 'delete' && (
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">模板 JSON 内容</label>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={14}
            spellCheck={false}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-green-400 text-xs font-mono focus:outline-none focus:border-orange-500 resize-y"
          />
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg text-sm transition"
      >
        {loading ? '提交中…' : '提交审核'}
      </button>
    </form>
  );
}

// ─── 兼容规则提交表单 ─────────────────────────────────────────────────────────
function RuleForm({ token, onSuccess }: { token: string; onSuccess: () => void }) {
  const [json, setJson] = useState('{\n  "ruleId": "",\n  "description": "",\n  "condition": {},\n  "effect": "BLOCK"\n}');
  const [action, setAction] = useState<DraftAction>('create');
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(json); }
    catch { setError('JSON 格式有误，请检查'); return; }
    setLoading(true);
    const res = await fetch(`${API_BASE}/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: 'rule', action, targetId: targetId || undefined, payload }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? '提交失败'); return; }
    onSuccess();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">操作类型</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as DraftAction)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="create">新增规则</option>
            <option value="update">修改规则</option>
            <option value="delete">删除规则</option>
          </select>
        </div>
        {action !== 'create' && (
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">目标规则 ID</label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="例：RULE-001"
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        )}
      </div>
      {action !== 'delete' && (
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">规则 JSON 内容</label>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-green-400 text-xs font-mono focus:outline-none focus:border-orange-500 resize-y"
          />
        </div>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg text-sm transition"
      >
        {loading ? '提交中…' : '提交审核'}
      </button>
    </form>
  );
}

// ─── 定价区间提交表单 ─────────────────────────────────────────────────────────
function PricingForm({ token, onSuccess }: { token: string; onSuccess: () => void }) {
  const [bandId, setBandId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('drivetrain');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [description, setDescription] = useState('');
  const [action, setAction] = useState<DraftAction>('create');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const payload: Record<string, unknown> = {
      bandId, name, category,
      priceRange: { min: Number(priceMin), max: Number(priceMax) },
      description,
    };
    setLoading(true);
    const res = await fetch(`${API_BASE}/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        type: 'pricing_band', action,
        targetId: action !== 'create' ? bandId : undefined,
        payload,
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? '提交失败'); return; }
    onSuccess();
  }

  const inputCls = "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-300 mb-1.5">操作类型</label>
        <select value={action} onChange={(e) => setAction(e.target.value as DraftAction)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
          <option value="create">新增定价区间</option>
          <option value="update">修改定价区间</option>
          <option value="delete">删除定价区间</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">区间 ID（bandId）</label>
          <input type="text" value={bandId} onChange={(e) => setBandId(e.target.value)} placeholder="例：FRAME-CARBON-RACE" required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">部件类别</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
            {['frame','drivetrain','wheelset','brakes','saddle','handlebar','fork','pedals','other'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      {action !== 'delete' && (
        <>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：碳纤维竞赛车架" required className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">最低价（元）</label>
              <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="5000" required min={0} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">最高价（元）</label>
              <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="15000" required min={0} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">描述</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="简单说明该配件的特性和适用场景" className={`${inputCls} resize-none`} />
          </div>
        </>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg text-sm transition">
        {loading ? '提交中…' : '提交审核'}
      </button>
    </form>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function AdvisorPage() {
  const { user, token, loading } = useRequireAuth('advisor');
  const [mainTab, setMainTab] = useState<'submit' | 'history'>('submit');
  const [submitType, setSubmitType] = useState<DraftType>('template');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 加载提交历史
  async function loadDrafts() {
    if (!token) return;
    setHistoryLoading(true);
    const res = await fetch(`${API_BASE}/drafts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setDrafts(await res.json());
    setHistoryLoading(false);
  }

  useEffect(() => {
    if (mainTab === 'history' && token) loadDrafts();
  }, [mainTab, token]); // eslint-disable-line

  // 撤回草稿
  async function withdraw(draftId: string) {
    if (!token || !confirm('确认撤回该草稿？')) return;
    const res = await fetch(`${API_BASE}/drafts/${draftId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setDrafts((d) => d.filter((x) => x.draftId !== draftId));
  }

  function onSubmitSuccess() {
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 3000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">加载中…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 顶部导航 */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-orange-500 text-xl">🚴</span>
          <span className="font-bold">AI 自行车配置</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 text-sm">顾问控制台</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300 text-sm">
            👤 {user?.displayName}
            {user?.approved ? (
              <span className="ml-2 text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">已认证</span>
            ) : (
              <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">待审批</span>
            )}
          </span>
          <a href="/login" onClick={() => localStorage.removeItem('auth_token')}
            className="text-slate-500 hover:text-slate-300 text-sm transition">退出</a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 待审批提示 */}
        {user && !user.approved && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-5 py-4 mb-6 text-yellow-300 text-sm">
            ⚠️ 您的顾问账号尚未通过管理员审批，暂时无法提交数据。请等待管理员审核。
          </div>
        )}

        {/* 主 Tab */}
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 mb-6 w-fit">
          {[
            { key: 'submit',  label: '📤 提交数据' },
            { key: 'history', label: '📋 我的提交' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMainTab(key as 'submit' | 'history')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                mainTab === key
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── 提交数据 Tab ───────────────────────────────────── */}
        {mainTab === 'submit' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">提交知识库数据</h2>

            {submitSuccess && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 text-sm mb-4">
                ✅ 提交成功！等待管理员审核后将正式生效。
              </div>
            )}

            {/* 数据类型选择 */}
            <div className="flex gap-2 mb-6">
              {[
                { key: 'template',     label: '📋 配置模板' },
                { key: 'rule',         label: '🔧 兼容规则' },
                { key: 'pricing_band', label: '💰 定价区间' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSubmitType(key as DraftType)}
                  className={`px-4 py-1.5 rounded-lg text-sm transition ${
                    submitType === key
                      ? 'bg-slate-600 text-white border border-slate-500'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 说明文字 */}
            <div className="bg-slate-900/50 rounded-lg px-4 py-3 text-slate-400 text-xs mb-5 leading-relaxed">
              {submitType === 'template' && '配置模板定义了特定场景（如公路入门、山地硬尾）下的整车配置方案，包含各部件的推荐品牌和型号。'}
              {submitType === 'rule'     && '兼容规则描述组件间的兼容性约束，例如变速系统与飞轮速数的搭配要求。'}
              {submitType === 'pricing_band' && '定价区间为各类配件在不同价位下建立参考价格段，用于智能推荐的预算匹配。'}
            </div>

            {token && (
              <>
                {submitType === 'template'     && <TemplateForm token={token} onSuccess={onSubmitSuccess} />}
                {submitType === 'rule'         && <RuleForm     token={token} onSuccess={onSubmitSuccess} />}
                {submitType === 'pricing_band' && <PricingForm  token={token} onSuccess={onSubmitSuccess} />}
              </>
            )}
          </div>
        )}

        {/* ── 提交历史 Tab ───────────────────────────────────── */}
        {mainTab === 'history' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">我的提交记录</h2>
              <button
                onClick={loadDrafts}
                className="text-slate-400 hover:text-white text-sm transition"
              >
                🔄 刷新
              </button>
            </div>

            {historyLoading && <p className="text-slate-400 text-sm animate-pulse">加载中…</p>}
            {!historyLoading && drafts.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <div className="text-4xl mb-3">📭</div>
                <p>还没有提交记录</p>
              </div>
            )}

            <div className="space-y-3">
              {drafts.map((d) => (
                <div key={d.draftId} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <StatusBadge status={d.status} />
                        <TypeLabel type={d.type} />
                        <span className="text-slate-500 text-xs">
                          {d.action === 'create' ? '新增' : d.action === 'update' ? '修改' : '删除'}
                        </span>
                        {d.targetId && (
                          <span className="text-slate-600 text-xs font-mono">{d.targetId}</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs">
                        提交于 {new Date(d.submittedAt).toLocaleString('zh-CN')}
                      </p>
                      {d.reviewerNote && (
                        <div className="mt-2 bg-slate-800 rounded px-3 py-2 text-xs text-slate-300">
                          💬 审核意见：{d.reviewerNote}
                        </div>
                      )}
                    </div>

                    {d.status === 'pending' && token && (
                      <button
                        onClick={() => withdraw(d.draftId)}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1 rounded-lg transition flex-shrink-0"
                      >
                        撤回
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
