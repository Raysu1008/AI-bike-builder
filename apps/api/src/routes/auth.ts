import { Router } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { JWT_SECRET, AuthPayload, requireAuth } from '../middleware/auth';

const r = Router();

// 用户数据存储文件（生产环境可替换为数据库）
const USERS_FILE = path.resolve(__dirname, '../../../../../data/users.json');

interface User {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  password: string; // sha256 hash
  role: AuthPayload['role'];
  createdAt: string;
  approved: boolean; // 顾问账号需管理员审批
}

async function readUsers(): Promise<User[]> {
  try {
    return JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
  } catch {
    // 默认内置管理员账号
    const admin: User = {
      userId: 'admin',
      username: 'admin',
      displayName: '系统管理员',
      email: 'admin@example.com',
      password: hashPwd('admin2026'),
      role: 'admin',
      createdAt: new Date().toISOString(),
      approved: true,
    };
    await writeUsers([admin]);
    return [admin];
  }
}

async function writeUsers(users: User[]): Promise<void> {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function hashPwd(pwd: string): string {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

/**
 * POST /v1/auth/login
 * body: { username, password }
 */
r.post('/login', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: '请提供用户名和密码' }); return;
  }
  const users = await readUsers();
  const user = users.find(u => u.username === username);
  if (!user || user.password !== hashPwd(password)) {
    res.status(401).json({ error: '用户名或密码错误' }); return;
  }
  if (!user.approved) {
    res.status(403).json({ error: '账号待管理员审批，请耐心等待' }); return;
  }
  const payload: AuthPayload = { userId: user.userId, username: user.username, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, role: user.role, displayName: user.displayName, expiresIn: '8h' });
});

/**
 * POST /v1/auth/register
 * body: { username, password, displayName, email }
 * 注册为 advisor，需管理员审批后才能登录
 */
r.post('/register', async (req, res) => {
  const { username, password, displayName, email } = req.body as Record<string, string>;
  if (!username || !password || !displayName || !email) {
    res.status(400).json({ error: '请填写所有必填项：用户名、密码、显示名称、邮箱' }); return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: '密码至少6位' }); return;
  }
  const users = await readUsers();
  if (users.find(u => u.username === username)) {
    res.status(409).json({ error: '该用户名已被注册' }); return;
  }
  const newUser: User = {
    userId: crypto.randomUUID(),
    username, displayName, email,
    password: hashPwd(password),
    role: 'advisor',
    createdAt: new Date().toISOString(),
    approved: false, // 待审批
  };
  users.push(newUser);
  await writeUsers(users);
  res.status(201).json({ message: '注册成功，请等待管理员审批后即可登录', username });
});

/**
 * GET /v1/auth/me  — 获取当前登录用户信息
 */
r.get('/me', requireAuth, async (req: any, res) => {
  const users = await readUsers();
  const user = users.find(u => u.userId === req.user.userId);
  if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
  const { password: _, ...safe } = user;
  res.json(safe);
});

/**
 * GET /v1/auth/users  — 管理员：查看所有顾问账号（含待审批）
 */
r.get('/users', requireAuth, async (req: any, res) => {
  if (req.user.role !== 'admin') { res.status(403).json({ error: '无权限' }); return; }
  const users = await readUsers();
  res.json(users.map(({ password: _, ...u }) => u));
});

/**
 * POST /v1/auth/users/:userId/approve  — 管理员审批顾问账号
 */
r.post('/users/:userId/approve', requireAuth, async (req: any, res) => {
  if (req.user.role !== 'admin') { res.status(403).json({ error: '无权限' }); return; }
  const users = await readUsers();
  const user = users.find(u => u.userId === req.params.userId);
  if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
  user.approved = true;
  await writeUsers(users);
  res.json({ message: `账号 ${user.displayName} 已审批通过` });
});

/**
 * DELETE /v1/auth/users/:userId  — 管理员删除/禁用账号
 */
r.delete('/users/:userId', requireAuth, async (req: any, res) => {
  if (req.user.role !== 'admin') { res.status(403).json({ error: '无权限' }); return; }
  const users = await readUsers();
  const filtered = users.filter(u => u.userId !== req.params.userId);
  if (filtered.length === users.length) { res.status(404).json({ error: '用户不存在' }); return; }
  await writeUsers(filtered);
  res.json({ ok: true });
});

export default r;
