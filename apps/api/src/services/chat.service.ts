import OpenAI from 'openai';
import { recommend } from './recommend.service';

let openaiClient: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const PARSE_SYSTEM = `你是自行车配置助手。用户用自然语言描述需求时，你需要：
1. 友好地回复用户（1-2句，中文），确认你理解了需求
2. 从对话中提取结构化参数（JSON），提取以下字段：
   - budget: { min: number, max: number, currency: "CNY" }（从文字中推断金额，如"一万左右"→{min:8000,max:12000}）
   - usage: string[]（从 commute/endurance_weekend/mtb_trail/gravel/racing 中选）
   - priority: string[]（从 comfort/performance/weight/durability/value 中选）
   - ready: boolean（true=用户已给出足够信息可以推荐，false=还需要追问）
   - follow_up: string（当 ready=false 时，用一句话追问用户缺少的信息）

**必须以 JSON 格式回复**，结构如下：
{
  "reply": "...",
  "parsed": {
    "budget": { "min": 8000, "max": 12000, "currency": "CNY" },
    "usage": ["commute"],
    "priority": ["comfort"],
    "ready": true,
    "follow_up": ""
  }
}

场景映射参考：
- 通勤/上班/城市/代步 → commute
- 周末/骑游/耐力/长途 → endurance_weekend
- 山地/越野/爬坡/土路 → mtb_trail
- 砾石/碎石/探险 → gravel
- 竞速/比赛/训练/速度 → racing

优先级映射参考：
- 舒适/轻松/好骑 → comfort
- 快/性能/速度 → performance
- 轻/轻量 → weight
- 耐用/结实/不容易坏 → durability
- 性价比/便宜/划算/省钱 → value`;

/** 当没有 OpenAI key 时，用规则解析用户输入 */
function ruleBasedParse(message: string): {
  budget: { min: number; max: number; currency: string };
  usage: string[];
  priority: string[];
  ready: boolean;
  follow_up: string;
} {
  const text = message;

  // 提取预算
  let min = 5000, max = 10000;
  const wanMatch = text.match(/(\d+(?:\.\d+)?)\s*[万w]/);
  const kMatch   = text.match(/(\d+)\s*[kK千]/);
  const numMatch = text.match(/(\d{4,6})/);

  if (wanMatch) {
    const v = parseFloat(wanMatch[1]) * 10000;
    min = Math.round(v * 0.8); max = Math.round(v * 1.2);
  } else if (kMatch) {
    const v = parseInt(kMatch[1]) * 1000;
    min = Math.round(v * 0.8); max = Math.round(v * 1.2);
  } else if (numMatch) {
    const v = parseInt(numMatch[1]);
    min = Math.round(v * 0.8); max = Math.round(v * 1.2);
  }

  // 场景
  const usage: string[] = [];
  if (/通勤|上班|城市|代步/.test(text)) usage.push('commute');
  if (/周末|骑游|耐力|长途/.test(text)) usage.push('endurance_weekend');
  if (/山地|越野|爬坡|土路/.test(text)) usage.push('mtb_trail');
  if (/砾石|碎石|探险/.test(text)) usage.push('gravel');
  if (/竞速|比赛|训练|速度/.test(text)) usage.push('racing');
  if (usage.length === 0) usage.push('commute');

  // 优先级
  const priority: string[] = [];
  if (/舒适|轻松|好骑/.test(text)) priority.push('comfort');
  if (/快|性能|速度/.test(text)) priority.push('performance');
  if (/轻量|轻(?!松)/.test(text)) priority.push('weight');
  if (/耐用|结实/.test(text)) priority.push('durability');
  if (/性价比|便宜|划算|省/.test(text)) priority.push('value');
  if (priority.length === 0) priority.push('comfort');

  const hasBudget = wanMatch || kMatch || numMatch;
  const ready = !!(hasBudget && usage.length > 0);

  return {
    budget: { min, max, currency: 'CNY' },
    usage,
    priority,
    ready,
    follow_up: ready ? '' : '请告诉我您的大概预算范围，以及主要用途（通勤、山地越野还是公路骑行）？',
  };
}

export async function chatRecommend(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[]
) {
  let parsed: ReturnType<typeof ruleBasedParse>;
  let reply = '';

  if (openaiClient) {
    try {
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: PARSE_SYSTEM },
        ...history.map(h => ({ role: h.role, content: h.content } as OpenAI.ChatCompletionMessageParam)),
        { role: 'user', content: message },
      ];
      const completion = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        max_tokens: 400,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
      const raw = completion.choices[0]?.message?.content || '{}';
      const json = JSON.parse(raw);
      reply  = json.reply  || '好的，我来帮你分析一下！';
      parsed = json.parsed || ruleBasedParse(message);
    } catch {
      parsed = ruleBasedParse(message);
      reply  = '我已经理解你的需求，正在为你匹配方案…';
    }
  } else {
    // 无 key → 规则解析 + 固定回复
    parsed = ruleBasedParse(message);
    if (!parsed.ready) {
      reply = parsed.follow_up;
    } else {
      reply = `明白了！你的预算大约 ¥${parsed.budget.min.toLocaleString()}–¥${parsed.budget.max.toLocaleString()}，主要用途是${parsed.usage.join('、')}，正在为你匹配方案…`;
    }
  }

  if (!parsed.ready) {
    return { reply, cards: [], parsed, ready: false };
  }

  // 调用推荐引擎
  const rec = await recommend({
    budget:   parsed.budget,
    usage:    parsed.usage,
    priority: parsed.priority,
  });

  return { reply, cards: rec.cards, parsed, ready: true };
}
