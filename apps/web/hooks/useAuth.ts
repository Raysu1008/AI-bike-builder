'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

export interface AuthUser {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  role: 'visitor' | 'advisor' | 'admin';
  approved: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });
  const router = useRouter();

  // 从 localStorage 恢复 session
  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (!stored) {
      setState({ user: null, token: null, loading: false });
      return;
    }
    // 验证 token 是否仍有效
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: AuthUser) => {
        setState({ user: data, token: stored, loading: false });
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<{ ok: boolean; message?: string }> => {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, message: data.error ?? '登录失败' };

        localStorage.setItem('auth_token', data.token);
        setState({ user: data.user, token: data.token, loading: false });

        // 按角色跳转
        if (data.user.role === 'admin') router.push('/admin');
        else if (data.user.role === 'advisor') router.push('/advisor');
        else router.push('/');

        return { ok: true };
      } catch {
        return { ok: false, message: '网络错误，请稍后重试' };
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setState({ user: null, token: null, loading: false });
    router.push('/login');
  }, [router]);

  const register = useCallback(
    async (payload: {
      username: string;
      password: string;
      displayName: string;
      email: string;
    }): Promise<{ ok: boolean; message?: string }> => {
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, message: data.error ?? '注册失败' };
        return { ok: true, message: data.message };
      } catch {
        return { ok: false, message: '网络错误，请稍后重试' };
      }
    },
    []
  );

  return { ...state, login, logout, register };
}

/** 权限守卫 Hook — 在页面顶部调用，未登录/无权限时自动跳转 */
export function useRequireAuth(requiredRole?: 'advisor' | 'admin') {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) {
      router.replace('/login');
      return;
    }
    if (requiredRole === 'admin' && auth.user.role !== 'admin') {
      router.replace('/');
    }
    if (requiredRole === 'advisor' && !['advisor', 'admin'].includes(auth.user.role)) {
      router.replace('/login');
    }
  }, [auth.loading, auth.user, requiredRole, router]);

  return auth;
}
