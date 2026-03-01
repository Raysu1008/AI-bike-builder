import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const BANDS_FILE = path.resolve(process.cwd(), '../../data/pricing/bands.json');

export async function GET() {
  try {
    const raw = await fs.readFile(BANDS_FILE, 'utf8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: '读取定价文件失败' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await fs.writeFile(BANDS_FILE, JSON.stringify(body, null, 2), 'utf8');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
