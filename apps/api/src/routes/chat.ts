import { Router } from 'express';
import { chatRecommend } from '../services/chat.service';

const r = Router();

/**
 * POST /v1/chat
 * Body: { message: string, history?: {role:'user'|'assistant', content:string}[] }
 * Returns: { reply: string, cards?: Card[], parsed?: object }
 */
r.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body as {
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
    };
    if (!message?.trim()) {
      res.status(400).json({ error: '消息不能为空' });
      return;
    }
    const result = await chatRecommend(message, history);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
