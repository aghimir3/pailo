import type { ThroughputPoint } from "@pailo/api-client";

export function ThroughputChart({ data }: { data: ThroughputPoint[] }) {
  const width = 640;
  const height = 260;
  const padding = { top: 18, right: 22, bottom: 34, left: 38 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxPairs = Math.max(...data.flatMap((point) => [point.planned, point.completed]), 120);

  const points = data.map((point, index) => {
    const x = padding.left + (plotWidth / Math.max(data.length - 1, 1)) * index;
    const plannedY = padding.top + plotHeight - (point.planned / maxPairs) * plotHeight;
    const completedY = padding.top + plotHeight - (point.completed / maxPairs) * plotHeight;

    return { ...point, x, plannedY, completedY };
  });

  const plannedPath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.plannedY}`).join(" ");
  const completedPath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.completedY}`).join(" ");
  const completedAreaPath = `${completedPath} L ${points.at(-1)?.x ?? padding.left} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;

  return (
    <div className="chart-frame">
      <svg aria-label="Planned versus completed pairs" className="throughput-svg" role="img" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="completedPairs" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#128c7e" stopOpacity="0.32" />
            <stop offset="95%" stopColor="#128c7e" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = padding.top + (plotHeight / 3) * line;
          return <line className="chart-grid-line" key={line} x1={padding.left} x2={width - padding.right} y1={y} y2={y} />;
        })}
        <path className="chart-area" d={completedAreaPath} />
        <path className="chart-line planned" d={plannedPath} />
        <path className="chart-line completed" d={completedPath} />
        {points.map((point) => (
          <g key={point.day}>
            <circle className="chart-dot" cx={point.x} cy={point.completedY} r="5" />
            <text className="chart-label" x={point.x} y={height - 10}>{point.day}</text>
          </g>
        ))}
      </svg>
      <div className="chart-legend" aria-hidden="true">
        <span><i className="legend-completed" />Completed</span>
        <span><i className="legend-planned" />Planned</span>
      </div>
    </div>
  );
}
