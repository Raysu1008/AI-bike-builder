import fs from 'fs/promises';
import path from 'path';

const DATA_ROOT = path.resolve(__dirname, '../../../../data');
const RULES_FILE     = path.join(DATA_ROOT, 'rules', 'compat-rules.json');
const TEMPLATES_DIR  = path.join(DATA_ROOT, 'templates');
const PROMPTS_FILE   = path.join(DATA_ROOT, 'prompts', 'recommend-system.md');

// ── 兼容规则 ─────────────────────────────────────────────────────────────────

export async function getRules() {
  const raw = await fs.readFile(RULES_FILE, 'utf8');
  return JSON.parse(raw);
}

export async function saveRules(rules: any[]) {
  await fs.writeFile(RULES_FILE, JSON.stringify(rules, null, 2), 'utf8');
}

export async function addRule(rule: any) {
  const rules = await getRules();
  if (rules.find((r: any) => r.rule_id === rule.rule_id)) {
    throw new Error(`rule_id "${rule.rule_id}" 已存在`);
  }
  rules.push(rule);
  await saveRules(rules);
  return rule;
}

export async function updateRule(rule_id: string, patch: any) {
  const rules = await getRules();
  const idx = rules.findIndex((r: any) => r.rule_id === rule_id);
  if (idx === -1) throw new Error(`规则 "${rule_id}" 不存在`);
  rules[idx] = { ...rules[idx], ...patch, rule_id };
  await saveRules(rules);
  return rules[idx];
}

export async function deleteRule(rule_id: string) {
  const rules = await getRules();
  const filtered = rules.filter((r: any) => r.rule_id !== rule_id);
  if (filtered.length === rules.length) throw new Error(`规则 "${rule_id}" 不存在`);
  await saveRules(filtered);
}

// ── 推荐模板 ─────────────────────────────────────────────────────────────────

export async function getTemplates() {
  const files = await fs.readdir(TEMPLATES_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  return Promise.all(
    jsonFiles.map(async f => {
      const raw = await fs.readFile(path.join(TEMPLATES_DIR, f), 'utf8');
      return { _filename: f, ...JSON.parse(raw) };
    })
  );
}

export async function saveTemplate(template_id: string, data: any) {
  const filename = `${template_id}.json`;
  const { _filename, ...clean } = data;
  await fs.writeFile(path.join(TEMPLATES_DIR, filename), JSON.stringify(clean, null, 2), 'utf8');
  return { _filename: filename, ...clean };
}

export async function deleteTemplate(template_id: string) {
  const filepath = path.join(TEMPLATES_DIR, `${template_id}.json`);
  try {
    await fs.unlink(filepath);
  } catch {
    throw new Error(`模板文件 "${template_id}.json" 不存在`);
  }
}

// ── AI Prompt ────────────────────────────────────────────────────────────────

export async function getPrompt(): Promise<string> {
  return fs.readFile(PROMPTS_FILE, 'utf8');
}

export async function savePrompt(content: string): Promise<void> {
  await fs.writeFile(PROMPTS_FILE, content, 'utf8');
}

// ── 定价区间 CRUD ─────────────────────────────────────────────────────────────

const BANDS_FILE = path.join(DATA_ROOT, 'pricing', 'bands.json');

interface PricingBand {
  band_id: string;
  component: string;
  level: string;
  price: { min: number; max: number; currency: string };
  source?: string;
  last_verified_at?: string;
}

async function readBands(): Promise<PricingBand[]> {
  try {
    const raw = await fs.readFile(BANDS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeBands(bands: PricingBand[]): Promise<void> {
  await fs.writeFile(BANDS_FILE, JSON.stringify(bands, null, 2), 'utf8');
}

export async function getPricingBands(): Promise<PricingBand[]> {
  return readBands();
}

export async function addPricingBand(band: PricingBand): Promise<PricingBand> {
  const bands = await readBands();
  if (bands.find(b => b.band_id === band.band_id)) {
    throw new Error(`band_id "${band.band_id}" 已存在`);
  }
  band.last_verified_at = band.last_verified_at || new Date().toISOString().slice(0, 10);
  bands.push(band);
  await writeBands(bands);
  return band;
}

export async function updatePricingBand(band_id: string, patch: Partial<PricingBand>): Promise<PricingBand> {
  const bands = await readBands();
  const idx = bands.findIndex(b => b.band_id === band_id);
  if (idx === -1) throw new Error(`定价区间 "${band_id}" 不存在`);
  bands[idx] = { ...bands[idx], ...patch, band_id };
  await writeBands(bands);
  return bands[idx];
}

export async function deletePricingBand(band_id: string): Promise<void> {
  const bands = await readBands();
  const filtered = bands.filter(b => b.band_id !== band_id);
  if (filtered.length === bands.length) throw new Error(`定价区间 "${band_id}" 不存在`);
  await writeBands(filtered);
}

// ── 外部数据源同步 ────────────────────────────────────────────────────────────

export async function syncFromExternal(
  url: string,
  type: 'templates' | 'rules' | 'pricing',
  mode: 'replace' | 'merge'
): Promise<{ imported: number; skipped: number; message: string }> {
  // 拉取外部数据
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`外部请求失败: ${resp.status} ${resp.statusText}`);
  const raw = await resp.json() as any;

  // 统一为数组
  const items: any[] = Array.isArray(raw) ? raw : raw.data ?? raw.items ?? raw.records ?? [];
  if (!items.length) return { imported: 0, skipped: 0, message: '外部数据为空或格式不匹配' };

  let imported = 0;
  let skipped = 0;

  if (type === 'pricing') {
    const existing = await readBands();
    if (mode === 'replace') {
      await writeBands(items as PricingBand[]);
      imported = items.length;
    } else {
      for (const item of items) {
        if (!existing.find(b => b.band_id === item.band_id)) {
          existing.push(item);
          imported++;
        } else {
          skipped++;
        }
      }
      await writeBands(existing);
    }
  } else if (type === 'rules') {
    const existing = await getRules();
    if (mode === 'replace') {
      await saveRules(items);
      imported = items.length;
    } else {
      for (const item of items) {
        if (!existing.find((r: any) => r.rule_id === item.rule_id)) {
          existing.push(item);
          imported++;
        } else {
          skipped++;
        }
      }
      await saveRules(existing);
    }
  } else if (type === 'templates') {
    if (mode === 'replace') {
      // 清空模板目录已有文件
      const files = await fs.readdir(TEMPLATES_DIR);
      await Promise.all(files.filter(f => f.endsWith('.json')).map(f => fs.unlink(path.join(TEMPLATES_DIR, f))));
    }
    for (const item of items) {
      const tid = item.template_id;
      if (!tid) { skipped++; continue; }
      const tpath = path.join(TEMPLATES_DIR, `${tid}.json`);
      if (mode === 'merge') {
        try { await fs.access(tpath); skipped++; continue; } catch { /* 不存在才写入 */ }
      }
      await fs.writeFile(tpath, JSON.stringify(item, null, 2), 'utf8');
      imported++;
    }
  }

  return {
    imported,
    skipped,
    message: `同步完成：导入 ${imported} 条，跳过 ${skipped} 条（模式: ${mode}）`,
  };
}
