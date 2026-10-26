import { formatDate } from "@/lib/format";

type Week = { start: Date; end: Date; count: number };

/** Hand-drawn SVG chart: no chart library, so the dashboard stays dependency-free. */
export function WeeklyChart({ weeks }: { weeks: Week[] }) {
  const max = Math.max(1, ...weeks.map((week) => week.count));
  const barWidth = 36;
  const gap = 20;
  const height = 140;
  const width = weeks.length * (barWidth + gap);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height + 34}`}
        className="h-48 w-full min-w-[420px]"
        role="img"
        aria-label="Articles published per week over the last eight weeks"
      >
        {weeks.map((week, index) => {
          const barHeight = Math.round((week.count / max) * (height - 20));
          const x = index * (barWidth + gap) + gap / 2;
          return (
            <g key={week.start.toISOString()}>
              <rect
                x={x}
                y={height - barHeight}
                width={barWidth}
                height={barHeight}
                rx={4}
                className="fill-sky-500"
              />
              <text
                x={x + barWidth / 2}
                y={height - barHeight - 6}
                textAnchor="middle"
                className="fill-slate-600 text-[10px]"
              >
                {week.count}
              </text>
              <text
                x={x + barWidth / 2}
                y={height + 16}
                textAnchor="middle"
                className="fill-slate-400 text-[9px]"
              >
                {formatDate(week.start)}
              </text>
            </g>
          );
        })}
        <line
          x1={0}
          y1={height}
          x2={width}
          y2={height}
          className="stroke-slate-200"
        />
      </svg>
    </div>
  );
}
