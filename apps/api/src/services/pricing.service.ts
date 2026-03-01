import fs from 'fs/promises';
import path from 'path';

type Band = {
  band_id:string; component:string; level:string;
  price:{min:number,max:number,currency:string}; source?:string; last_verified_at?:string
};

const DATA_ROOT = path.resolve(__dirname, '../../../../data');

async function loadBands(): Promise<Band[]> {
  const dir = path.join(DATA_ROOT, 'pricing');
  const files = await fs.readdir(dir);
  const parsed = await Promise.all(files.map(f => fs.readFile(path.join(dir,f),'utf8').then(JSON.parse)));
  // 每个文件可以是单个 Band 对象或 Band 数组，统一展平
  return parsed.flat();
}

export async function estimatePricing(input:any) {
  const bands = await loadBands();
  let min = 0, max = 0, currency = 'CNY', sources: string[] = [];

  // 示例：根据传动等级与轮组材质累加价格区间（你可逐步扩展）
  const drvLevel = input?.components?.drivetrain?.level;          // "Shimano 105/mech"
  const wheelLevel = input?.components?.wheelset?.level;          // "Aluminum-durable"

  for (const b of bands) {
    if (drvLevel && b.level.toLowerCase() === drvLevel.toLowerCase()) {
      min += b.price.min; max += b.price.max; currency = b.price.currency; if (b.source) sources.push(b.source);
    }
    if (wheelLevel && b.level.toLowerCase() === wheelLevel.toLowerCase()) {
      min += b.price.min; max += b.price.max; currency = b.price.currency; if (b.source) sources.push(b.source);
    }
  }
  return { min, max, currency, sources };
}
