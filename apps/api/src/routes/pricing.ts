import { Router } from 'express';
import { estimatePricing } from '../services/pricing.service';

const r = Router();

r.post('/estimate', async (req, res) => {
  try { res.json(await estimatePricing(req.body)); }
  catch (e:any) { res.status(400).json({ error: e.message }); }
});

export default r;
