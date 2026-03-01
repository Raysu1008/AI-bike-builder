import { Router } from 'express';
import { exportPdf } from '../services/export.service';

const r = Router();

r.post('/pdf', async (req, res) => {
  try { res.json(await exportPdf(req.body)); }
  catch (e:any) { res.status(400).json({ error: e.message }); }
});

export default r;
