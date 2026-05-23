'use client';

import { useRouter } from 'next/navigation';
import type { Asset } from '@/lib/types';

const CATEGORY_COLORS: Record<string, string> = {
  STOCKS: '#3b82f6',
  REAL_ESTATE_US: '#22c55e',
  INDIA_LAND: '#f97316',
  CRYPTO: '#a855f7',
  ALTERNATIVE: '#14b8a6',
  CASH: '#94a3b8',
};

const CATEGORY_LABELS: Record<string, string> = {
  STOCKS: 'Stocks',
  REAL_ESTATE_US: 'Real Estate',
  INDIA_LAND: 'India Land',
  CRYPTO: 'Crypto',
  ALTERNATIVE: 'Alternative',
  CASH: 'Cash',
};

function fmtValue(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

interface BubbleData {
  id: string;
  name: string;
  ticker?: string;
  category: string;
  current_value: number;
  rank: number;
  r: number;
  x: number;
  y: number;
}

function packBubbles(bubbles: Omit<BubbleData, 'x' | 'y'>[]): BubbleData[] {
  const placed: BubbleData[] = [];
  const cx = 400;
  const cy = 300;

  for (const bubble of bubbles) {
    if (placed.length === 0) {
      placed.push({ ...bubble, x: cx, y: cy });
      continue;
    }

    let placedFlag = false;
    for (let dist = 0; dist < 400; dist += 5) {
      for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
        const x = cx + dist * Math.cos(angle);
        const y = cy + dist * Math.sin(angle);
        const overlaps = placed.some(
          (p) => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < p.r + bubble.r + 4
        );
        if (
          !overlaps &&
          x - bubble.r > 10 &&
          x + bubble.r < 790 &&
          y - bubble.r > 10 &&
          y + bubble.r < 590
        ) {
          placed.push({ ...bubble, x, y });
          placedFlag = true;
          break;
        }
      }
      if (placedFlag) break;
    }
    if (!placedFlag) {
      placed.push({
        ...bubble,
        x: Math.random() * 700 + 50,
        y: Math.random() * 500 + 50,
      });
    }
  }
  return placed;
}

interface Props {
  assets: (Asset & { rank: number })[];
}

export default function BubbleChart({ assets }: Props) {
  const router = useRouter();

  if (!assets || assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        No assets to display
      </div>
    );
  }

  const maxValue = Math.max(...assets.map((a) => a.current_value));
  const maxRadius = 100;

  const rawBubbles = assets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    ticker: asset.ticker,
    category: asset.category,
    current_value: asset.current_value,
    rank: asset.rank,
    r: Math.max(25, Math.sqrt(asset.current_value / maxValue) * maxRadius),
  }));

  const packed = packBubbles(rawBubbles);

  // Compute category centroid angles for outer labels
  const categoryAngles: Record<string, { sumCos: number; sumSin: number; count: number }> = {};
  const cx = 400;
  const cy = 300;
  for (const b of packed) {
    const dx = b.x - cx;
    const dy = b.y - cy;
    const angle = Math.atan2(dy, dx);
    if (!categoryAngles[b.category]) {
      categoryAngles[b.category] = { sumCos: 0, sumSin: 0, count: 0 };
    }
    categoryAngles[b.category].sumCos += Math.cos(angle);
    categoryAngles[b.category].sumSin += Math.sin(angle);
    categoryAngles[b.category].count += 1;
  }

  const categorySet: Record<string, boolean> = {};
  for (const a of assets) categorySet[a.category] = true;
  const usedCategories = Object.keys(categorySet) as Array<Asset['category']>;

  return (
    <div>
      <div className="overflow-x-auto w-full">
        <svg
          viewBox="0 0 800 600"
          width="100%"
          style={{ minWidth: 320, display: 'block' }}
          aria-label="Portfolio bubble chart"
        >
          {packed.map((b) => {
            const color = CATEGORY_COLORS[b.category] || '#64748b';
            const fontSize = Math.min(14, b.r / 3);
            const tickerSize = Math.min(11, b.r / 4);
            const valueFontSize = Math.min(10, b.r / 4.5);

            return (
              <g
                key={b.id}
                onClick={() => router.push(`/portfolio/${b.id}`)}
                style={{ cursor: 'pointer' }}
                role="button"
                aria-label={`${b.name}: ${fmtValue(b.current_value)}`}
              >
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={b.r}
                  fill={color}
                  fillOpacity={0.75}
                  stroke={color}
                  strokeWidth={2}
                />
                {/* Rank in top-left of bubble */}
                <text
                  x={b.x - b.r * 0.6}
                  y={b.y - b.r * 0.55}
                  fontSize={10}
                  fill="white"
                  fillOpacity={0.85}
                  textAnchor="middle"
                  fontWeight="400"
                >
                  #{b.rank}
                </text>
                {/* Asset name */}
                <text
                  x={b.x}
                  y={b.y - (b.ticker ? fontSize * 0.6 : fontSize * 0.2)}
                  fontSize={fontSize}
                  fill="white"
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {b.name.length > 12 && b.r < 50 ? b.name.substring(0, 10) + '…' : b.name}
                </text>
                {/* Ticker */}
                {b.ticker && (
                  <text
                    x={b.x}
                    y={b.y + fontSize * 0.8}
                    fontSize={tickerSize}
                    fill="#d1d5db"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {b.ticker}
                  </text>
                )}
                {/* Value */}
                <text
                  x={b.x}
                  y={b.y + (b.ticker ? fontSize * 1.8 : fontSize * 1.2)}
                  fontSize={valueFontSize}
                  fill="white"
                  fillOpacity={0.9}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {fmtValue(b.current_value)}
                </text>
              </g>
            );
          })}

          {/* Outer category labels */}
          {usedCategories.map((cat) => {
            const data = categoryAngles[cat];
            if (!data || data.count === 0) return null;
            const avgAngle = Math.atan2(data.sumSin / data.count, data.sumCos / data.count);
            const labelR = 280;
            const lx = cx + labelR * Math.cos(avgAngle);
            const ly = cy + labelR * Math.sin(avgAngle);
            const color = CATEGORY_COLORS[cat] || '#64748b';
            const inBounds = lx > 30 && lx < 770 && ly > 20 && ly < 580;
            if (!inBounds) return null;
            return (
              <text
                key={`label-${cat}`}
                x={lx}
                y={ly}
                fontSize={11}
                fill={color}
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="600"
              >
                {CATEGORY_LABELS[cat]}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 px-4">
        {usedCategories.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[cat] || '#64748b' }}
            />
            <span className="text-xs text-slate-400">{CATEGORY_LABELS[cat]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
