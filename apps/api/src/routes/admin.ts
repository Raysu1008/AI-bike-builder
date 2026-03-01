import { Router } from 'express';
import { requireAuth, requireAdvisor } from '../middleware/auth';
import * as svc from '../services/admin.service';

const r = Router();

// 开发模式下跳过认证（NODE_ENV !== production 时自动绕过）
const devBypass = (req: any, _res: any, next: any) => {
  if (process.env.NODE_ENV !== 'production') {
    req.user = { userId: 'dev', username: 'dev-advisor', role: 'admin' };
    return next();
  }
  next();
};

r.use(devBypass, (req: any, res: any, next: any) => {
  if (req.user) return next();
  requireAuth(req, res, () => requireAdvisor(req, res, next));
});

// ── 兼容规则 CRUD ─────────────────────────────────────────────────────────────

/** GET  /v1/admin/rules          列出所有规则 */
r.get('/rules', async (_req, res) => {
  try { res.json(await svc.getRules()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

/** POST /v1/admin/rules          新增规则 */
r.post('/rules', async (req, res) => {
  try { res.status(201).json(await svc.addRule(req.body)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

/** PUT  /v1/admin/rules/:id      更新规则 */
r.put('/rules/:id', async (req, res) => {
  try { res.json(await svc.updateRule(req.params.id, req.body)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

/** DELETE /v1/admin/rules/:id   删除规则 */
r.delete('/rules/:id', async (req, res) => {
  try { await svc.deleteRule(req.params.id); res.json({ ok: true }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── 推荐模板 CRUD ─────────────────────────────────────────────────────────────

/** GET  /v1/admin/templates      列出所有模板 */
r.get('/templates', async (_req, res) => {
  try { res.json(await svc.getTemplates()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

/** POST /v1/admin/templates      新建 / 覆盖保存模板 */
r.post('/templates', async (req, res) => {
  try {
    const { template_id } = req.body;
    if (!template_id) { res.status(400).json({ error: '缺少 template_id' }); return; }
    res.status(201).json(await svc.saveTemplate(template_id, req.body));
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

/** PUT  /v1/admin/templates/:id  更新模板 */
r.put('/templates/:id', async (req, res) => {
  try { res.json(await svc.saveTemplate(req.params.id, { ...req.body, template_id: req.params.id })); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

/** DELETE /v1/admin/templates/:id 删除模板 */
r.delete('/templates/:id', async (req, res) => {
  try { await svc.deleteTemplate(req.params.id); res.json({ ok: true }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── AI Prompt ─────────────────────────────────────────────────────────────────

/** GET /v1/admin/prompts         获取当前 system prompt */
r.get('/prompts', async (_req, res) => {
  try { res.json({ content: await svc.getPrompt() }); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

/** PUT /v1/admin/prompts         保存 system prompt */
r.put('/prompts', async (req, res) => {
  try {
    const { content } = req.body as { content?: string };
    if (typeof content !== 'string') { res.status(400).json({ error: '缺少 content 字段' }); return; }
    await svc.savePrompt(content);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── 定价区间 CRUD ─────────────────────────────────────────────────────────────

/** GET  /v1/admin/pricing        获取所有定价区间 */
r.get('/pricing', async (_req, res) => {
  try { res.json(await svc.getPricingBands()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

/** POST /v1/admin/pricing        新增定价区间 */
r.post('/pricing', async (req, res) => {
  try { res.status(201).json(await svc.addPricingBand(req.body)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

/** PUT  /v1/admin/pricing/:id    更新定价区间 */
r.put('/pricing/:id', async (req, res) => {
  try { res.json(await svc.updatePricingBand(req.params.id, req.body)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

/** DELETE /v1/admin/pricing/:id  删除定价区间 */
r.delete('/pricing/:id', async (req, res) => {
  try { await svc.deletePricingBand(req.params.id); res.json({ ok: true }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── 外部数据源同步 ────────────────────────────────────────────────────────────

/**
 * POST /v1/admin/sync
 * Body: { url: string, type: 'templates' | 'rules' | 'pricing', mode: 'replace' | 'merge' }
 * 从外部 API URL 拉取 JSON 数据并同步到本地
 */
r.post('/sync', async (req, res) => {
  try {
    const { url, type, mode = 'merge' } = req.body as {
      url: string; type: 'templates' | 'rules' | 'pricing'; mode?: 'replace' | 'merge';
    };
    if (!url || !type) { res.status(400).json({ error: '缺少 url 或 type 参数' }); return; }
    const result = await svc.syncFromExternal(url, type, mode);
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default r;
