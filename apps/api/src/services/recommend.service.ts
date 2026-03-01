import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import { compatCheck } from '../utils/compatCheck';

const DATA_ROOT   = path.resolve(__dirname, '../../../../data');
const PROMPTS_FILE = path.join(DATA_ROOT, 'prompts', 'recommend-system.md');

// OpenAI 客户端：无 key 时不报错，调用时自动 fallback
let openaiClient: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** 从 data/prompts/recommend-system.md 加载顾问可编辑的 system prompt */
async function loadSystemPrompt(): Promise<string> {
  try {
    return await fs.readFile(PROMPTS_FILE, 'utf8');
  } catch {
    return '你是专业的自行车配置顾问，请根据用户需求提供简洁的推荐理由（2-3句话）。';
  }
}

/** 调用 OpenAI 为单个方案生成个性化解释；失败或无 key 时返回 fallback 文本 */
async function generateExplanation(
  systemPrompt: string,
  template: any,
  input: any
): Promise<string> {
  if (!openaiClient) {
    return `${template.name}适合预算 ¥${input.budget?.min}–¥${input.budget?.max} 的骑行者，` +
           `传动采用 ${template.drivetrain_logic?.level?.join('/')} 套件，` +
           `轮胎尺寸 ${template.wheel_logic?.tire_width} 兼顾舒适与效率。`;
  }

  const userMsg = [
    `用户预算：¥${input.budget?.min}–¥${input.budget?.max}`,
    `骑行场景：${(input.usage || []).join('、')}`,
    `优先考量：${(input.priority || []).join('、')}`,
    `候选方案：${template.name}`,
    `  - 车架：${JSON.stringify(template.frame_logic)}`,
    `  - 传动：${JSON.stringify(template.drivetrain_logic)}`,
    `  - 轮组：${JSON.stringify(template.wheel_logic)}`,
    `  - 刹车：${JSON.stringify(template.brake_logic)}`,
    `  - 预算区间：¥${template.budget?.min}–¥${template.budget?.max}`,
  ].join('\n');

  try {
    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMsg },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });
    return completion.choices[0]?.message?.content?.trim() || '暂无 AI 说明';
  } catch (err: any) {
    console.warn('[AI] OpenAI 调用失败，使用 fallback：', err?.message);
    return `${template.name} — 符合您的预算和骑行需求，是不错的选择。`;
  }
}

export async function recommend(input: any) {
  const tplPath   = path.join(DATA_ROOT, 'templates');
  const files     = await fs.readdir(tplPath);
  const templates = await Promise.all(
    files
      .filter(f => f.endsWith('.json'))
      .map(f => fs.readFile(path.join(tplPath, f), 'utf8').then(JSON.parse))
  );

  // 按预算筛选：模板 budget 区间与用户区间有交集
  const budgetMin = input?.budget?.min ?? 0;
  const budgetMax = input?.budget?.max ?? Infinity;
  const matched = templates.filter(t =>
    t.budget?.max >= budgetMin && t.budget?.min <= budgetMax
  );
  // 最多返回 3 个方案
  const selected = matched.slice(0, 3);
  if (selected.length === 0) {
    return { cards: [] };
  }

  const systemPrompt = await loadSystemPrompt();

  const cards = await Promise.all(
    selected.map(async (t, i) => {
      const components = {
        frame:      t.frame_logic,
        drivetrain: t.drivetrain_logic,
        wheelset:   t.wheel_logic,
        brake:      t.brake_logic,
        usage:      input?.usage,
        budget:     input?.budget,
        tire:       { width: t.wheel_logic?.tire_width },
      };

      const [compatibility, explanation] = await Promise.all([
        compatCheck(components),
        generateExplanation(systemPrompt, t, input),
      ]);

      return {
        rec_id: `REC-${Date.now()}-${i}`,
        summary: t.name,
        components: {
          frame:      t.frame_logic,
          drivetrain: t.drivetrain_logic,
          wheelset:   t.wheel_logic,
          brake:      t.brake_logic,
        },
        price_estimate: t.budget,
        compatibility,
        explanations: [explanation],
        ai_powered: !!openaiClient,
        visual: { img: `https://placehold.co/600x340/e0e7ff/4f46e5?text=${encodeURIComponent(t.name)}` },
      };
    })
  );

  return { cards };
}

