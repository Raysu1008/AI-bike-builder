import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "./components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 自行车配置顾问",
  description: "根据您的预算和骑行需求，智能推荐最适合的自行车配置方案",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* 顶部导航栏 */}
        <header style={{
          background: "var(--card-bg)",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 16px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              {/* 品牌 Logo */}
              <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                <circle cx="7" cy="20" r="5" stroke="#4f46e5" strokeWidth="2" fill="none"/>
                <circle cx="21" cy="20" r="5" stroke="#4f46e5" strokeWidth="2" fill="none"/>
                <path d="M7 20 L14 8 L21 20" stroke="#4f46e5" strokeWidth="2" strokeLinejoin="round" fill="none"/>
                <path d="M14 8 L17 14" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="14" cy="8" r="2" fill="#4f46e5"/>
              </svg>
              <span style={{
                fontWeight: 700,
                fontSize: 16,
                color: "var(--foreground)",
                letterSpacing: "-0.02em",
              }}>
                BikeAI <span style={{ color: "var(--primary)", fontWeight: 800 }}>顾问</span>
              </span>
            </a>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* 桌面端导航链接 */}
              <nav style={{ display: "flex", gap: 4 }} className="desktop-nav">
                <a href="/chat" style={navLinkStyle}>💬 AI 对话</a>
                <a href="/admin" style={navLinkStyle}>⚙️ 顾问后台</a>
              </nav>
              <span style={{
                fontSize: 11,
                background: "var(--primary-light)",
                padding: "2px 9px",
                borderRadius: 999,
                fontWeight: 600,
                color: "var(--primary)",
              }}>
                Beta
              </span>
            </div>
          </div>
        </header>

        <main style={{ minHeight: "calc(100vh - 56px - 52px)" }}>
          {children}
        </main>

        {/* 页脚 */}
        <footer style={{
          borderTop: "1px solid var(--border)",
          padding: "16px 24px",
          textAlign: "center",
          fontSize: 12,
          color: "var(--muted)",
        }}>
          © 2026 BikeAI · 智能自行车配置顾问 · 仅供参考，价格以实际销售为准
        </footer>

        {/* 暗色模式切换按钮（悬浮） */}
        <ThemeToggle />
      </body>
    </html>
  );
}

const navLinkStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  color: "var(--muted)",
  textDecoration: "none",
  transition: "background 0.15s, color 0.15s",
};
