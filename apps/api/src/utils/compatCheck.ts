import fs from 'fs/promises';
import path from 'path';

const RULES_PATH = path.resolve(__dirname, '../../../../data/rules/compat-rules.json');

export interface CompatRule {
  rule_id: string;
  type: 'warning' | 'hard_error';
  description: string;
  condition: Record<string, any>;
  message: string;
  suggestion: string;
  enabled: boolean;
}

/** 用规则 condition 中的比较操作符测试实际值 */
function testCondition(condition: Record<string, any>, context: Record<string, any>): boolean {
  return Object.entries(condition).every(([field, ops]) => {
    const actual = context[field];
    if (actual === undefined || actual === null) return false;
    return Object.entries(ops as Record<string, any>).every(([op, expected]) => {
      switch (op) {
        case 'eq':       return actual === expected;
        case 'neq':      return actual !== expected;
        case 'lt':       return Number(actual) < Number(expected);
        case 'lte':      return Number(actual) <= Number(expected);
        case 'gt':       return Number(actual) > Number(expected);
        case 'gte':      return Number(actual) >= Number(expected);
        case 'includes':
          if (Array.isArray(actual)) return actual.includes(expected);
          if (typeof actual === 'string') return actual.includes(String(expected));
          return false;
        default: return true;
      }
    });
  });
}

/** 将 message 模板中的 {field} 替换为实际值 */
function interpolate(template: string, ctx: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? `{${key}}`);
}

export async function compatCheck(components: any) {
  const hard_errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  let rules: CompatRule[] = [];
  try {
    const raw = await fs.readFile(RULES_PATH, 'utf8');
    rules = JSON.parse(raw);
  } catch {
    // 规则文件不存在或解析失败时，降级为空规则集
    rules = [];
  }

  // 构建上下文对象供规则判断
  const ctx: Record<string, any> = {
    rim_internal_width_mm: components?.wheelset?.rim_internal_width_mm,
    tire_width_c: (() => {
      const raw = components?.tire?.width ?? components?.wheelset?.tire ?? '';
      const m = String(raw).match(/(\d+(\.\d+)?)/);
      return m ? parseFloat(m[1]) : undefined;
    })(),
    tire_width_inch: (() => {
      const raw = components?.tire?.width_inch;
      return raw ? parseFloat(raw) : undefined;
    })(),
    brake_type: components?.brake?.type,
    drivetrain_level: components?.drivetrain?.level,
    frame_type: components?.frame?.type,
    usage: components?.usage,           // string | string[]
    budget_max: components?.budget?.max,
  };

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (testCondition(rule.condition, ctx)) {
      const msg = interpolate(rule.message, ctx);
      if (rule.type === 'hard_error') {
        hard_errors.push(msg);
      } else {
        warnings.push(msg);
      }
      if (rule.suggestion) suggestions.push(rule.suggestion);
    }
  }

  return { hard_errors, warnings, suggestions };
}

