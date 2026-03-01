/**
 * validate-data.mjs
 * 在 CI 中自动校验所有知识库 JSON 文件的结构完整性
 * 运行方式: node scripts/validate-data.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let errors = 0;

function fail(msg) {
  console.error(`  ❌ ${msg}`);
  errors++;
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

// ── 工具函数 ─────────────────────────────────────────────────────────────────

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    fail(`${filePath} 解析失败: ${e.message}`);
    return null;
  }
}

function requireFields(obj, fields, context) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null || obj[f] === '') {
      fail(`${context} 缺少必填字段: "${f}"`);
    }
  }
}

// ── 校验定价区间 bands.json ───────────────────────────────────────────────────

console.log('\n📦 校验 data/pricing/bands.json ...');
const bands = readJSON(path.join(ROOT, 'data/pricing/bands.json'));
if (bands) {
  if (!Array.isArray(bands)) {
    fail('bands.json 根节点必须是数组');
  } else {
    const ids = new Set();
    for (const b of bands) {
      requireFields(b, ['band_id', 'component', 'level', 'price'], `Band[${b.band_id}]`);
      if (b.price) {
        if (typeof b.price.min !== 'number') fail(`Band[${b.band_id}].price.min 必须是数字`);
        if (typeof b.price.max !== 'number') fail(`Band[${b.band_id}].price.max 必须是数字`);
        if (b.price.min > b.price.max) fail(`Band[${b.band_id}] price.min(${b.price.min}) > price.max(${b.price.max})`);
      }
      if (ids.has(b.band_id)) fail(`band_id 重复: "${b.band_id}"`);
      ids.add(b.band_id);
    }
    ok(`${bands.length} 条定价区间，格式正确`);
  }
}

// ── 校验兼容规则 compat-rules.json ────────────────────────────────────────────

console.log('\n🔧 校验 data/rules/compat-rules.json ...');
const rules = readJSON(path.join(ROOT, 'data/rules/compat-rules.json'));
if (rules) {
  if (!Array.isArray(rules)) {
    fail('compat-rules.json 根节点必须是数组');
  } else {
    const ids = new Set();
    const validTypes = new Set(['warning', 'hard_error']);
    for (const r of rules) {
      requireFields(r, ['rule_id', 'type', 'description'], `Rule[${r.rule_id}]`);
      if (r.type && !validTypes.has(r.type)) {
        fail(`Rule[${r.rule_id}].type 值 "${r.type}" 无效（只允许: warning, hard_error）`);
      }
      if (ids.has(r.rule_id)) fail(`rule_id 重复: "${r.rule_id}"`);
      ids.add(r.rule_id);
    }
    ok(`${rules.length} 条兼容规则，格式正确`);
  }
}

// ── 校验配置模板 ──────────────────────────────────────────────────────────────

console.log('\n🚲 校验 data/templates/*.json ...');
const templatesDir = path.join(ROOT, 'data/templates');
const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
const validCategories = new Set(['road', 'mountain', 'mtb', 'commute', 'city', 'gravel']);

for (const file of templateFiles) {
  const t = readJSON(path.join(templatesDir, file));
  if (!t) continue;
  requireFields(t, ['template_id', 'name', 'category', 'budget'], `Template[${file}]`);
  if (t.category && !validCategories.has(t.category)) {
    fail(`Template[${file}].category 值 "${t.category}" 无效（允许: ${[...validCategories].join(', ')}）`);
  }
  if (t.budget) {
    if (typeof t.budget.min !== 'number') fail(`Template[${file}].budget.min 必须是数字`);
    if (typeof t.budget.max !== 'number') fail(`Template[${file}].budget.max 必须是数字`);
  }
  // 文件名应与 template_id 一致
  const expectedFile = `${t.template_id}.json`;
  if (file !== expectedFile) {
    fail(`Template 文件名 "${file}" 与 template_id "${t.template_id}" 不一致（应为 ${expectedFile}）`);
  }
}
ok(`${templateFiles.length} 个配置模板，格式正确`);

// ── 校验 AI Prompt ────────────────────────────────────────────────────────────

console.log('\n🤖 校验 data/prompts/recommend-system.md ...');
const promptFile = path.join(ROOT, 'data/prompts/recommend-system.md');
if (!fs.existsSync(promptFile)) {
  fail('recommend-system.md 文件不存在');
} else {
  const content = fs.readFileSync(promptFile, 'utf8');
  if (content.trim().length < 100) {
    fail('recommend-system.md 内容过短（少于100字符），请检查');
  } else {
    ok(`Prompt 文件存在，长度 ${content.length} 字符`);
  }
}

// ── 汇总结果 ──────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(50));
if (errors > 0) {
  console.error(`\n❌ 校验失败，共 ${errors} 个错误。请修复后重新提交。\n`);
  process.exit(1);
} else {
  console.log('\n✅ 所有知识库数据校验通过！\n');
}
