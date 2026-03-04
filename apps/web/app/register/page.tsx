'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: '', password: '', confirmPassword: '', displayName: '', email: '',
  });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [loading, setLoading] = useState(false);

  // 注册成功后倒计时跳转
  useEffect(() => {
    if (!success) return;
    if (countdown <= 0) { window.location.href = '/login'; return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [success, countdown]);

  function update(field: string, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('两次密码不一致');
      return;
    }
    if (form.password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    setLoading(true);
    const result = await register({
      username: form.username,
      password: form.password,
      displayName: form.displayName,
      email: form.email,
    });
    setLoading(false);
    if (!result.ok) { setError(result.message ?? '注册失败'); return; }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 text-center max-w-md w-full shadow-2xl">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-white mb-2">注册申请已提交</h2>
          <p className="text-slate-400 text-sm mb-6">
            您的顾问账号正在等待管理员审核。<br />
            审核通过后您将能够提交知识库数据。
          </p>
          <div className="bg-slate-700 rounded-lg px-4 py-3 text-slate-300 text-sm">
            {countdown} 秒后自动跳转到登录页…
          </div>
          <Link
            href="/login"
            className="mt-4 inline-block text-orange-400 hover:text-orange-300 text-sm transition"
          >
            立即前往登录 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl">🚴</span>
          </div>
          <h1 className="text-2xl font-bold text-white">申请成为顾问</h1>
          <p className="text-slate-400 text-sm mt-1">提交后需等待管理员审核</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* 显示名称 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                显示名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => update('displayName', e.target.value)}
                placeholder="例：张教练"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>

            {/* 邮箱 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                邮箱 <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>

            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                登录用户名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                placeholder="仅限英文字母和数字"
                required
                pattern="[a-zA-Z0-9_]+"
                title="只允许英文字母、数字和下划线"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>

            {/* 密码 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  密码 <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="至少 6 位"
                  required
                  autoComplete="new-password"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  确认密码 <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  placeholder="再次输入"
                  required
                  autoComplete="new-password"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>
            </div>

            {/* 说明 */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-4 py-3 text-orange-300 text-xs leading-relaxed">
              📋 顾问资质说明：提交后管理员将审核您的申请。通过后您可以向知识库提交配置模板、兼容性规则和定价信息，所有提交均需经过二次审核方能生效。
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition"
            >
              {loading ? '提交中…' : '提交申请'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            已有账号？{' '}
            <Link href="/login" className="text-orange-400 hover:text-orange-300 transition">
              返回登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
