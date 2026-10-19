import React, { useState, useRef, useId } from 'react';

export interface ChartDataPoint {
  name: string;
  bookings?: number;
  count?: number;
  value?: number;
  [key: string]: any;
}

export interface ServiceStatPoint {
  name: string;
  value: number;
  color?: string;
}

// 1. Sleek Responsive Trend / Area / Line Chart
export const AdminTrendChart: React.FC<{
  data: ChartDataPoint[];
  dataKey?: string;
  height?: number;
  color?: string;
  gradientId?: string;
  unitLabel?: string;
}> = ({
  data = [],
  dataKey = 'bookings',
  height = 240,
  color = '#F52B35',
  gradientId = 'trendGrad',
  unitLabel = 'طلب'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId().replace(/:/g, '');
  const gradId = `${gradientId}-${uniqueId}`;

  const values = data.map(d => Number(d[dataKey] ?? d.count ?? d.value ?? 0));
  const maxVal = Math.max(...values, 5);
  const minVal = 0;

  // Coordinate dimensions for SVG viewBox
  const svgWidth = 600;
  const svgHeight = height;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 35;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingX + (data.length > 1 ? (i / (data.length - 1)) * usableWidth : usableWidth / 2);
    const val = Number(d[dataKey] ?? d.count ?? d.value ?? 0);
    const y = paddingTop + (usableHeight - ((val - minVal) / (maxVal - minVal || 1)) * usableHeight);
    return { x, y, val, label: d.name };
  });

  // Generate SVG path command with smooth cardinal spline
  let linePath = '';
  let areaPath = '';

  if (points.length > 0) {
    if (points.length === 1) {
      linePath = `M ${paddingX} ${points[0].y} L ${svgWidth - paddingX} ${points[0].y}`;
      areaPath = `${linePath} L ${svgWidth - paddingX} ${svgHeight - paddingBottom} L ${paddingX} ${svgHeight - paddingBottom} Z`;
    } else {
      linePath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      areaPath = `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} L ${points[0].x} ${svgHeight - paddingBottom} Z`;
    }
  }

  // 3 horizontal guide lines
  const gridLines = [0, 0.5, 1].map((ratio) => {
    const y = paddingTop + usableHeight * (1 - ratio);
    const val = Math.round(minVal + ratio * (maxVal - minVal));
    return { y, val };
  });

  return (
    <div ref={containerRef} className="w-full relative select-none">
      <svg 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: height }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="85%" stopColor={color} stopOpacity={0.02} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid lines & Y labels */}
        {gridLines.map((gl, i) => (
          <g key={i}>
            <line 
              x1={paddingX} 
              y1={gl.y} 
              x2={svgWidth - paddingX} 
              y2={gl.y} 
              stroke="#262A34" 
              strokeDasharray="4 4" 
              strokeWidth={1} 
            />
            <text 
              x={paddingX - 10} 
              y={gl.y + 4} 
              fill="#717684" 
              fontSize={10} 
              textAnchor="end" 
              fontFamily="inherit"
            >
              {gl.val}
            </text>
          </g>
        ))}

        {/* Area Fill */}
        {areaPath && (
          <path d={areaPath} fill={`url(#${gradId})`} />
        )}

        {/* Line Stroke */}
        {linePath && (
          <path 
            d={linePath} 
            fill="none" 
            stroke={color} 
            strokeWidth={3} 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        )}

        {/* Data points & X labels */}
        {points.map((pt, i) => (
          <g key={i}>
            {/* Vertical hover line */}
            {hoveredIdx === i && (
              <line 
                x1={pt.x} 
                y1={paddingTop} 
                x2={pt.x} 
                y2={svgHeight - paddingBottom} 
                stroke="#F52B35" 
                strokeDasharray="2 2" 
                strokeWidth={1.5} 
                opacity={0.8}
              />
            )}

            {/* Point circle */}
            <circle 
              cx={pt.x} 
              cy={pt.y} 
              r={hoveredIdx === i ? 6 : 4} 
              fill={hoveredIdx === i ? '#FFF' : color} 
              stroke="#0C0E12" 
              strokeWidth={2}
              className="transition-all duration-150 cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
            />

            {/* Transparent hover capture zone */}
            <rect 
              x={pt.x - 20} 
              y={paddingTop} 
              width={40} 
              height={usableHeight} 
              fill="transparent" 
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />

            {/* X Axis Label */}
            <text 
              x={pt.x} 
              y={svgHeight - 10} 
              fill={hoveredIdx === i ? '#FFF' : '#8E94A3'} 
              fontSize={10} 
              fontWeight={hoveredIdx === i ? 'bold' : 'normal'} 
              textAnchor="middle" 
              fontFamily="inherit"
            >
              {pt.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div 
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 bg-[#181B24] border border-white/15 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 text-xs text-white"
          style={{
            left: `${(points[hoveredIdx].x / svgWidth) * 100}%`,
            top: `${Math.max(0, (points[hoveredIdx].y / svgHeight) * 100 - 35)}%`
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[#F52B35]" />
          <span className="text-[#A1A6B2]">{points[hoveredIdx].label}:</span>
          <span className="font-bold font-mono text-[#F5F6F8]">
            {points[hoveredIdx].val} {unitLabel}
          </span>
        </div>
      )}
    </div>
  );
};

// 2. Modern Bar Chart (For distribution / comparisons)
export const AdminBarChart: React.FC<{
  data: ChartDataPoint[];
  dataKey?: string;
  nameKey?: string;
  height?: number;
  color?: string;
  unitLabel?: string;
}> = ({
  data = [],
  dataKey = 'count',
  nameKey = 'name',
  height = 240,
  color = '#F52B35',
  unitLabel = 'طلب'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const values = data.map(d => Number(d[dataKey] ?? d.value ?? 0));
  const maxVal = Math.max(...values, 4);

  const svgWidth = 600;
  const svgHeight = height;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 35;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingTop - paddingBottom;

  const barCount = Math.max(data.length, 1);
  const gap = 12;
  const barWidth = Math.min(36, Math.max(16, (usableWidth - (barCount - 1) * gap) / barCount));

  return (
    <div className="w-full relative select-none">
      <svg 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: height }}
      >
        {/* Horizontal background lines */}
        {[0, 0.5, 1].map((ratio, i) => {
          const y = paddingTop + usableHeight * (1 - ratio);
          return (
            <line 
              key={i} 
              x1={paddingX} 
              y1={y} 
              x2={svgWidth - paddingX} 
              y2={y} 
              stroke="#262A34" 
              strokeDasharray="4 4" 
              strokeWidth={1} 
            />
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const val = Number(d[dataKey] ?? d.value ?? 0);
          const barHeight = Math.max(4, (val / maxVal) * usableHeight);
          const x = paddingX + (i / barCount) * usableWidth + (usableWidth / barCount - barWidth) / 2;
          const y = paddingTop + usableHeight - barHeight;
          const isHovered = hoveredIdx === i;

          return (
            <g 
              key={i} 
              className="cursor-pointer" 
              onMouseEnter={() => setHoveredIdx(i)} 
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Bar Rect with rounded top */}
              <rect 
                x={x} 
                y={y} 
                width={barWidth} 
                height={barHeight} 
                rx={6} 
                ry={6} 
                fill={isHovered ? '#FF414A' : color} 
                className="transition-all duration-150"
              />

              {/* Value on top of bar */}
              {val > 0 && (
                <text 
                  x={x + barWidth / 2} 
                  y={y - 6} 
                  fill={isHovered ? '#FFF' : '#A1A6B2'} 
                  fontSize={10} 
                  fontWeight="bold" 
                  textAnchor="middle" 
                  fontFamily="inherit"
                >
                  {val}
                </text>
              )}

              {/* X Axis Label */}
              <text 
                x={x + barWidth / 2} 
                y={svgHeight - 12} 
                fill={isHovered ? '#FFF' : '#8E94A3'} 
                fontSize={9} 
                textAnchor="middle" 
                fontFamily="inherit"
              >
                {String(d[nameKey] || '').slice(0, 10)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div 
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 bg-[#181B24] border border-white/15 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 text-xs text-white"
          style={{
            left: `${((paddingX + (hoveredIdx / barCount) * usableWidth + usableWidth / (barCount * 2)) / svgWidth) * 100}%`,
            top: '8%'
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[#F52B35]" />
          <span className="text-[#A1A6B2]">{data[hoveredIdx][nameKey]}:</span>
          <span className="font-bold font-mono text-[#F5F6F8]">
            {data[hoveredIdx][dataKey] ?? data[hoveredIdx].value} {unitLabel}
          </span>
        </div>
      )}
    </div>
  );
};

// 3. Modern Interactive Donut / Pie Chart
export const AdminDonutChart: React.FC<{
  data: ServiceStatPoint[];
  height?: number;
  centerLabel?: string;
}> = ({
  data = [],
  height = 220,
  centerLabel = 'إجمالي الخدمات'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const defaultPalette = [
    '#F52B35',
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4'
  ];

  let accumulatedPercent = 0;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 text-xs">
        <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-2">
          0
        </div>
        <span>لا توجد بيانات كافية</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2 select-none">
      {/* Donut Circle */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1D212C"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {data.map((item, index) => {
            const val = Number(item.value) || 0;
            const percent = val / total;
            const strokeDasharray = `${percent * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += percent;

            const sliceColor = item.color || defaultPalette[index % defaultPalette.length];
            const isHovered = hoveredIdx === index;

            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={sliceColor}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-xl font-display font-black text-white">
            {hoveredIdx !== null ? data[hoveredIdx]?.value : total}
          </span>
          <span className="text-[10px] text-[#A1A6B2] max-w-[80px] truncate px-1">
            {hoveredIdx !== null ? data[hoveredIdx]?.name : centerLabel}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-tabs-scrollbar pr-1 w-full max-w-[200px]">
        {data.map((item, index) => {
          const sliceColor = item.color || defaultPalette[index % defaultPalette.length];
          const isHovered = hoveredIdx === index;

          return (
            <div
              key={index}
              onMouseEnter={() => setHoveredIdx(index)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                isHovered ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: sliceColor }} 
                />
                <span className="text-gray-300 truncate" title={item.name}>
                  {item.name}
                </span>
              </div>
              <span className="font-bold font-mono text-white shrink-0">
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
