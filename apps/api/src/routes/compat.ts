import { Router } from 'express';
import { compatCheck } from '../utils/compatCheck';

const r = Router();

r.post('/check', async (req, res) => {
  try { res.json(await compatCheck(req.body)); }
  catch (e:any) { res.status(400).json({ error: e.message }); }
});

export default r;
