/**
 * BikeCover — 用纯 SVG 渲染的自行车封面图，不依赖任何外部图片服务。
 * 根据车型 (frameType) 自动选取配色和图标风格。
 */

const PALETTE: Record<string, { bg: string; accent: string; light: string }> = {
  race_road:    { bg: '#e0e7ff', accent: '#4f46e5', light: '#c7d2fe' },
  endurance:    { bg: '#dbeafe', accent: '#2563eb', light: '#bfdbfe' },
  hardtail_mtb: { bg: '#d1fae5', accent: '#059669', light: '#a7f3d0' },
  full_sus_mtb: { bg: '#d1fae5', accent: '#047857', light: '#6ee7b7' },
  gravel:       { bg: '#fef3c7', accent: '#d97706', light: '#fde68a' },
  commute:      { bg: '#ede9fe', accent: '#7c3aed', light: '#ddd6fe' },
  city:         { bg: '#fce7f3', accent: '#db2777', light: '#fbcfe8' },
};

function getPalette(frameType?: string) {
  if (!frameType) return PALETTE.commute;
  const key = Object.keys(PALETTE).find(k => frameType.toLowerCase().includes(k.replace('_', '')))
    || Object.keys(PALETTE).find(k => frameType.toLowerCase().includes(k));
  return PALETTE[key || 'commute'];
}

interface BikeCoverProps {
  summary: string;
  frameType?: string;
  height?: number;
}

export default function BikeCover({ summary, frameType, height = 140 }: BikeCoverProps) {
  const p = getPalette(frameType);

  // 取最多 8 个字作为封面大字
  const shortName = summary.replace(/（[^）]*）/g, '').trim().slice(0, 8);

  return (
    <svg
      width="100%"
      height={height}
      viewBox="0 0 400 160"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* 背景 */}
      <rect width="400" height="160" fill={p.bg} />

      {/* 装饰圆 */}
      <circle cx="340" cy="30"  r="60" fill={p.light} opacity="0.5" />
      <circle cx="60"  cy="140" r="50" fill={p.light} opacity="0.4" />

      {/* 自行车图形（轮廓简化） */}
      {/* 后轮 */}
      <circle cx="145" cy="105" r="36" stroke={p.accent} strokeWidth="5" fill="none" opacity="0.7" />
      <circle cx="145" cy="105" r="6"  fill={p.accent} opacity="0.7" />
      {/* 前轮 */}
      <circle cx="255" cy="105" r="36" stroke={p.accent} strokeWidth="5" fill="none" opacity="0.7" />
      <circle cx="255" cy="105" r="6"  fill={p.accent} opacity="0.7" />
      {/* 车架 */}
      <polyline
        points="145,105 175,55 215,55 255,105"
        stroke={p.accent} strokeWidth="5" fill="none"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.85"
      />
      <line x1="175" y1="55" x2="145" y2="105" stroke={p.accent} strokeWidth="4" opacity="0.7" />
      {/* 车座 */}
      <line x1="175" y1="55" x2="175" y2="42" stroke={p.accent} strokeWidth="4" strokeLinecap="round" opacity="0.85" />
      <line x1="162" y1="42" x2="188" y2="42" stroke={p.accent} strokeWidth="5" strokeLinecap="round" opacity="0.85" />
      {/* 车把 */}
      <line x1="255" y1="68" x2="255" y2="55" stroke={p.accent} strokeWidth="4" strokeLinecap="round" opacity="0.85" />
      <line x1="248" y1="55" x2="268" y2="55" stroke={p.accent} strokeWidth="5" strokeLinecap="round" opacity="0.85" />
      {/* 踏板 */}
      <circle cx="200" cy="100" r="10" stroke={p.accent} strokeWidth="4" fill="none" opacity="0.7" />
      <line x1="193" y1="107" x2="185" y2="118" stroke={p.accent} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <line x1="207" y1="93"  x2="215" y2="82"  stroke={p.accent} strokeWidth="3" strokeLinecap="round" opacity="0.7" />

      {/* 文字 */}
      <text
        x="200" y="148"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="13"
        fontWeight="600"
        fill={p.accent}
        opacity="0.9"
      >
        {shortName}
      </text>
    </svg>
  );
}
