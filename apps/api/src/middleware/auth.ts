import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface AuthPayload {
  userId: string;
  username: string;
  role: 'visitor' | 'advisor' | 'admin';
}

/** 验证 Bearer token，将 payload 挂到 req.user */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录，请先获取 Token' });
    return;
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
}

/** 在 requireAuth 之后使用，确保 role === advisor 或 admin */
export function requireAdvisor(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || (user.role !== 'advisor' && user.role !== 'admin')) {
    res.status(403).json({ error: '仅顾问账号可操作此接口' });
    return;
  }
  next();
}
