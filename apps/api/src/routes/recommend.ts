import { Router } from 'express';
import { recommend } from '../services/recommend.service';

const r = Router();

r.post('/recommend', async (req, res) => {
  try {
    const data = await recommend(req.body);
    res.json(data);
  } catch (e:any) {
    res.status(400).json({ error: e.message });
  }
});

export default r;
