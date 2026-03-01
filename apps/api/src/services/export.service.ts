import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs/promises';
import path from 'path';

const OUT_DIR = path.resolve(__dirname, '../../../../out');
const FONT_PATH = path.resolve(__dirname, '../../../../data/fonts/ArialUnicode.ttf');

export async function exportPdf(body:any) {
  const { rec_id, card } = body;
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await fs.readFile(FONT_PATH);
  const font = await pdfDoc.embedFont(fontBytes);

  const page = pdfDoc.addPage([595, 842]); // A4
  const { height } = page.getSize();

  page.drawText(`配置单：${rec_id}`, { x: 50, y: height - 80, size: 16, font, color: rgb(0, 0, 0) });
  page.drawText(`摘要：${card?.summary ?? ''}`, { x: 50, y: height - 110, size: 12, font });
  page.drawText(`价格区间：¥${card?.price_estimate?.min ?? 0} - ¥${card?.price_estimate?.max ?? 0}`, { x: 50, y: height - 130, size: 12, font });

  const bytes = await pdfDoc.save();
  await fs.mkdir(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${rec_id}.pdf`);
  await fs.writeFile(file, bytes);

  return { url: `file://${file}` };
}
