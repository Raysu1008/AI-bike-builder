import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, AuthPayload } from '../middleware/auth';

const r = Router();

// 演示用硬编码顾问账号 —— 生产环境替换为数据库查询
const ADVISOR_ACCOUNTS: Record<string, { password: string; role: AuthPayload['role'] }> = {
  advisor: { password: 'sky2026', role: 'advisor' },
  admin:   { password: 'admin2026', role: 'admin' },
};

/**
 * POST /v1/auth/login
 * body: { username: string, password: string }
 * returns: { token, role, expiresIn }
 */
r.post('/login', (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: '请提供用户名和密码' });
    return;
  }

  const account = ADVISOR_ACCOUNTS[username];
  if (!account || account.password !== password) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const payload: AuthPayload = { userId: username, username, role: account.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

  res.json({ token, role: account.role, expiresIn: '8h' });
});

export default r;
