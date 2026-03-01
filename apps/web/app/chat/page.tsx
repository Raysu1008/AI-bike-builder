'use client';
import { useState, useRef, useEffect } from 'react';
import BikeCover from '../components/BikeCover';

const API = 'http://localhost:3001/v1';

// ─── 类型 ─────────────────────────────────────────────────────────────────────

interface Card {
  rec_id: string;
  summary: string;
  components: {
    frame?: { type?: string; material?: string[] };
    drivetrain?: { level?: string[] | string; config?: string[] };
    wheelset?: { tire?: string; rim?: string };
    brake?: { type?: string[] | string };
  };
  price_estimate: { min: number; max: number; currency?: string };
  explanations?: string[];
  visual?: { img?: string };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  cards?: Card[];
  isLoading?: boolean;
}

// ─── 快捷引导语 ──────────────────────────────────────────────────────────────

const QUICK_STARTS = [
  '我每天骑车上班，预算大概 8000 元',
  '想买一辆周末骑行的公路车，预算 1.5 万',
  '山地越野用途，5000 左右，性价比优先',
  '通勤 + 轻度越野两用，预算 1 万',
];

// ─── 推荐结果卡片（内联版） ────────────────────────────────────────────────────

function InlineCard({ card }: { card: Card }) {
  const c = card.components;
  const drivetrainLevel = Array.isArray(c.drivetrain?.level)
    ? c.drivetrain!.level.join(' / ')
    : c.drivetrain?.level || '—';
  const brakeType = Array.isArray(c.brake?.type)
    ? c.brake!.type.join(' / ')
    : c.brake?.type || '—';

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
      (e.currentTarget as HTMLElement).style.transform = '';
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {card.visual?.img && !card.visual.img.includes('placehold.co') ? (
        <img
          src={card.visual.img}
          alt={card.summary}
          style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <BikeCover
          summary={card.summary}
          frameType={c.frame?.type}
          height={140}
        />
      )}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
            {card.summary}
          </h4>
          <span style={{
            flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--primary)',
            background: 'var(--primary-light)', borderRadius: 6, padding: '2px 8px',
          }}>
            ¥{card.price_estimate?.min?.toLocaleString()}起
          </span>
        </div>

        {card.explanations?.[0] && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            {card.explanations[0]}
          </p>
        )}

        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {c.frame?.type && (
            <span style={badgeStyle}>🚲 {c.frame.type}</span>
          )}
          {drivetrainLevel !== '—' && (
            <span style={badgeStyle}>⚙️ {drivetrainLevel}</span>
          )}
          {brakeType !== '—' && (
            <span style={badgeStyle}>🔧 {brakeType}</span>
          )}
        </div>
      </div>
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  fontSize: 11, padding: '2px 7px', borderRadius: 5,
  background: '#f1f5f9', color: 'var(--muted)',
  border: '1px solid var(--border)',
};

// ─── 消息气泡 ─────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10,
      alignItems: 'flex-start',
      marginBottom: 16,
    }}>
      {/* 头像 */}
      <div style={{
        flexShrink: 0,
        width: 36, height: 36, borderRadius: '50%',
        background: isUser ? 'var(--primary)' : 'linear-gradient(135deg,#4f46e5,#0ea5e9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, color: '#fff', fontWeight: 700,
        boxShadow: 'var(--shadow-sm)',
      }}>
        {isUser ? '你' : '🚲'}
      </div>

      {/* 内容区 */}
      <div style={{ maxWidth: 'calc(100% - 56px)', display: 'flex', flexDirection: 'column', gap: 10,
        alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {/* 文字气泡 */}
        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          background: isUser ? 'var(--primary)' : '#fff',
          color: isUser ? '#fff' : 'var(--foreground)',
          border: isUser ? 'none' : '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          fontSize: 14, lineHeight: 1.6,
          maxWidth: 520,
        }}>
          {msg.isLoading ? (
            <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={dotStyle(0)} /> <span style={dotStyle(0.2)} /> <span style={dotStyle(0.4)} />
            </span>
          ) : msg.content}
        </div>

        {/* 推荐卡片网格 */}
        {msg.cards && msg.cards.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
            width: '100%',
            maxWidth: 700,
          }}>
            {msg.cards.map(c => <InlineCard key={c.rec_id} card={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function dotStyle(delay: number): React.CSSProperties {
  return {
    width: 6, height: 6, borderRadius: '50%',
    background: 'var(--muted)',
    animation: `bounce 1s ${delay}s infinite`,
    display: 'inline-block',
  };
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 AI 自行车配置顾问 🚲\n\n请告诉我你的需求，例如：预算、用途（通勤/山地/公路）、优先考量（舒适/性能/性价比）等，我来为你推荐最合适的配置方案。',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // 对话历史（传给后端）
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { id: Date.now() + 'u', role: 'user', content: trimmed };
    const loadingMsg: Message = { id: Date.now() + 'l', role: 'assistant', content: '', isLoading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setIsLoading(true);

    // 记录历史
    historyRef.current = [
      ...historyRef.current,
      { role: 'user', content: trimmed },
    ];

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: historyRef.current.slice(-6) }),
      });
      const data = await res.json();

      const assistantText: string = data.reply || (data.cards?.length
        ? `好的！根据你的需求，我为你匹配了 ${data.cards.length} 个方案，你可以对比看看：`
        : '抱歉，暂时没有找到合适的方案，请尝试调整预算或用途。');

      historyRef.current.push({ role: 'assistant', content: assistantText });

      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { ...m, isLoading: false, content: assistantText, cards: data.cards }
          : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { ...m, isLoading: false, content: '⚠️ 请求失败，请检查后端服务是否已启动（http://localhost:3001）' }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function clearChat() {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '对话已清空，我们重新开始吧！请告诉我你的需求 😊',
    }]);
    historyRef.current = [];
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', maxWidth: 860, margin: '0 auto',
      padding: '0 16px',
    }}>
      {/* ── 顶栏 ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 0 12px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ fontSize: 20, textDecoration: 'none' }}>←</a>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--foreground)' }}>
              🚲 AI 配置顾问
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
              用自然语言描述需求，AI 为你推荐最优方案
            </p>
          </div>
        </div>
        <button
          onClick={clearChat}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 13,
            border: '1px solid var(--border)', background: '#fff',
            color: 'var(--muted)', cursor: 'pointer',
          }}>
          清空对话
        </button>
      </div>

      {/* ── 消息区 ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '20px 0',
      }}>
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* ── 快捷引导（只在刚开始时显示） ── */}
      {messages.length <= 1 && (
        <div style={{ paddingBottom: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--muted)' }}>💡 快速开始：</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_STARTS.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12,
                  border: '1px solid var(--primary)', color: 'var(--primary)',
                  background: 'var(--primary-light)', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 输入栏 ── */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 0 20px',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: '#fff', border: '1.5px solid var(--border)',
          borderRadius: 14, padding: '8px 8px 8px 14px',
          boxShadow: 'var(--shadow-sm)',
          transition: 'border-color 0.2s',
        }}
        onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
        onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述你的需求…例如：每天通勤 10 公里，预算 8000 元，舒适优先"
            rows={2}
            style={{
              flex: 1, resize: 'none', border: 'none', outline: 'none',
              fontSize: 14, lineHeight: 1.6, color: 'var(--foreground)',
              background: 'transparent', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            style={{
              flexShrink: 0,
              width: 38, height: 38, borderRadius: 10,
              background: isLoading || !input.trim() ? '#e2e8f0' : 'var(--primary)',
              color: '#fff', border: 'none', cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}>
            ↑
          </button>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          Enter 发送 · Shift+Enter 换行
        </p>
      </div>

      {/* 弹跳动画 */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
