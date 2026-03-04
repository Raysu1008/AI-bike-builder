/**
 * /v1/drafts  — 顾问提交知识库数据草稿，管理员审核后发布
 */
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { requireAuth, requireAdvisor } from '../middleware/auth';
import * as svc from '../services/admin.service';

const r = Router();
r.use(requireAuth, requireAdvisor);

const DRAFTS_FILE = path.resolve(__dirname, '../../../../../data/drafts.json');

// ─── 数据类型 ─────────────────────────────────────────────────────────────────

type DraftType = 'template' | 'rule' | 'pricing_band';
type DraftStatus = 'pending' | 'approved' | 'rejected';

interface Draft {
  draftId: string;
  type: DraftType;
  action: 'create' | 'update' | 'delete';
  authorId: string;
  authorName: string;
  submittedAt: string;
  status: DraftStatus;
  reviewedAt?: string;
  reviewerNote?: string;
  payload: Record<string, unknown>;   // 提交的数据
  targetId?: string;                  // 如果是 update/delete，目标 ID
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

async function readDrafts(): Promise<Draft[]> {
  try { return JSON.parse(await fs.readFile(DRAFTS_FILE, 'utf8')); }
  catch { return []; }
}

async function writeDrafts(drafts: Draft[]): Promise<void> {
  await fs.writeFile(DRAFTS_FILE, JSON.stringify(drafts, null, 2), 'utf8');
}

// ─── 顾问接口 ─────────────────────────────────────────────────────────────────

/** GET /v1/drafts  — 顾问查看自己提交的草稿 */
r.get('/', async (req: any, res) => {
  const drafts = await readDrafts();
  res.json(drafts.filter(d => d.authorId === req.user.userId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
});

/** POST /v1/drafts  — 顾问提交草稿 */
r.post('/', async (req: any, res) => {
  const { type, action = 'create', payload, targetId } = req.body as {
    type: DraftType;
    action?: Draft['action'];
    payload: Record<string, unknown>;
    targetId?: string;
  };

  if (!type || !payload) {
    res.status(400).json({ error: '缺少 type 或 payload 字段' }); return;
  }
  const validTypes: DraftType[] = ['template', 'rule', 'pricing_band'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `type 只允许: ${validTypes.join(', ')}` }); return;
  }

  const draft: Draft = {
    draftId: crypto.randomUUID(),
    type, action,
    authorId: req.user.userId,
    authorName: req.user.username,
    submittedAt: new Date().toISOString(),
    status: 'pending',
    payload,
    targetId,
  };

  const drafts = await readDrafts();
  drafts.push(draft);
  await writeDrafts(drafts);

  res.status(201).json({ draftId: draft.draftId, message: '已提交，等待管理员审核' });
});

/** DELETE /v1/drafts/:id  — 顾问撤回待审核草稿 */
r.delete('/:id', async (req: any, res) => {
  const drafts = await readDrafts();
  const draft = drafts.find(d => d.draftId === req.params.id);
  if (!draft) { res.status(404).json({ error: '草稿不存在' }); return; }
  if (draft.authorId !== req.user.userId && req.user.role !== 'admin') {
    res.status(403).json({ error: '无权限撤回他人草稿' }); return;
  }
  if (draft.status !== 'pending') {
    res.status(400).json({ error: '只能撤回待审核的草稿' }); return;
  }
  await writeDrafts(drafts.filter(d => d.draftId !== req.params.id));
  res.json({ ok: true });
});

// ─── 管理员接口 ──────────────────────────────────────────────────────────────

/** GET /v1/drafts/admin/all  — 管理员查看所有草稿 */
r.get('/admin/all', async (req: any, res) => {
  if (req.user.role !== 'admin') { res.status(403).json({ error: '无权限' }); return; }
  const { status } = req.query as { status?: DraftStatus };
  const drafts = await readDrafts();
  const filtered = status ? drafts.filter(d => d.status === status) : drafts;
  res.json(filtered.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
});

/** POST /v1/drafts/:id/approve  — 管理员审批通过，自动写入知识库 */
r.post('/:id/approve', async (req: any, res) => {
  if (req.user.role !== 'admin') { res.status(403).json({ error: '无权限' }); return; }

  const drafts = await readDrafts();
  const draft = drafts.find(d => d.draftId === req.params.id);
  if (!draft) { res.status(404).json({ error: '草稿不存在' }); return; }
  if (draft.status !== 'pending') {
    res.status(400).json({ error: '该草稿已审核，不能重复操作' }); return;
  }

  // ── 自动写入知识库 ────────────────────────────────────────────────────────
  try {
    if (draft.type === 'template') {
      const t = draft.payload as any;
      if (draft.action === 'delete' && draft.targetId) {
        await svc.deleteTemplate(draft.targetId);
      } else {
        await svc.saveTemplate(t.template_id, t);
      }
    } else if (draft.type === 'rule') {
      const rule = draft.payload as any;
      if (draft.action === 'create') {
        await svc.addRule(rule);
      } else if (draft.action === 'update' && draft.targetId) {
        await svc.updateRule(draft.targetId, rule);
      } else if (draft.action === 'delete' && draft.targetId) {
        await svc.deleteRule(draft.targetId);
      }
    } else if (draft.type === 'pricing_band') {
      const band = draft.payload as any;
      if (draft.action === 'create') {
        await svc.addPricingBand(band);
      } else if (draft.action === 'update' && draft.targetId) {
        await svc.updatePricingBand(draft.targetId, band);
      } else if (draft.action === 'delete' && draft.targetId) {
        await svc.deletePricingBand(draft.targetId);
      }
    }
  } catch (e: any) {
    res.status(400).json({ error: `写入知识库失败: ${e.message}` }); return;
  }

  draft.status = 'approved';
  draft.reviewedAt = new Date().toISOString();
  draft.reviewerNote = (req.body as any).note || '';
  await writeDrafts(drafts);

  res.json({ message: `草稿已审批通过，数据已写入知识库` });
});

/** POST /v1/drafts/:id/reject  — 管理员拒绝草稿 */
r.post('/:id/reject', async (req: any, res) => {
  if (req.user.role !== 'admin') { res.status(403).json({ error: '无权限' }); return; }

  const drafts = await readDrafts();
  const draft = drafts.find(d => d.draftId === req.params.id);
  if (!draft) { res.status(404).json({ error: '草稿不存在' }); return; }
  if (draft.status !== 'pending') {
    res.status(400).json({ error: '该草稿已审核' }); return;
  }

  draft.status = 'rejected';
  draft.reviewedAt = new Date().toISOString();
  draft.reviewerNote = (req.body as any).note || '不符合要求';
  await writeDrafts(drafts);

  res.json({ message: '草稿已拒绝' });
});

export default r;
