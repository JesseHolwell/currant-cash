import type { RechartsSankeyLinkPayload, RechartsSankeyNode } from "./models";
import { formatCurrency } from "./models";

export function LinkShape(props: {
  sourceX: number;
  sourceY: number;
  sourceControlX: number;
  targetX: number;
  targetY: number;
  targetControlX: number;
  linkWidth: number;
  payload: RechartsSankeyLinkPayload;
}) {
  const {
    sourceX,
    sourceY,
    sourceControlX,
    targetX,
    targetY,
    targetControlX,
    linkWidth,
    payload
  } = props;

  if (payload.kind === "hidden") {
    return <path d="" fill="none" stroke="none" />;
  }

  const path = `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`;
  const shoulder = Math.max(8, Math.min(26, (targetX - sourceX) * 0.12));
  const startX = sourceX + shoulder;
  const endX = targetX - shoulder;
  const pathWithShoulders = endX > startX
    ? `M${sourceX},${sourceY} L${startX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${endX},${targetY} L${targetX},${targetY}`
    : path;

  return (
    <path
      d={pathWithShoulders}
      fill="none"
      stroke={payload.color ?? "#8ea0b2"}
      strokeOpacity={payload.kind === "income" ? 0.62 : 0.74}
      strokeWidth={Math.max(linkWidth, 1)}
      strokeLinecap="butt"
    />
  );
}

export function NodeShape(props: {
  x: number;
  y: number;
  width: number;
  height: number;
  payload: RechartsSankeyNode;
}) {
  const { x, y, width, height, payload } = props;

  if (payload.kind === "hidden") {
    return <g />;
  }

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={2} fill="#bcc4cc" fillOpacity={0.95} />
      <rect
        x={payload.kind === "group" || payload.kind === "subcategory" || payload.kind === "fixed" ? x : x + width - 3}
        y={y}
        width={3}
        height={height}
        fill={payload.color ?? "#5f6b79"}
        opacity={0.94}
      />
      {payload.kind === "total" ? (
        <rect x={x + width / 2 - 1} y={y} width={2} height={height} fill="#6e7b8a" opacity={0.42} />
      ) : null}
      {(payload.kind === "merchant" || payload.kind === "fixedLeaf" || payload.kind === "savings") ? (
        <g className="sankey-label">
          <rect x={x + width + 12} y={y + height / 2 - 12} width={24} height={24} rx={8} className="sankey-chip" />
          <rect x={x + width + 21} y={y + height / 2 - 3} width={6} height={6} rx={2} fill={payload.color ?? "#5f6b79"} />
          <text x={x + width + 46} y={y + height / 2 - 1} textAnchor="start" className="sankey-label-main">
            {payload.labelMain}
          </text>
          <text x={x + width + 46} y={y + height / 2 + 16} textAnchor="start" className="sankey-label-sub">
            {payload.labelSub}
          </text>
        </g>
      ) : null}
      {payload.kind === "group" ? (
        <g className="sankey-label">
          <text x={x - 12} y={y + height / 2 - 1} textAnchor="end" className="sankey-label-main">
            {payload.labelMain}
          </text>
          <text x={x - 12} y={y + height / 2 + 16} textAnchor="end" className="sankey-label-sub">
            {payload.labelSub}
          </text>
        </g>
      ) : null}
      {payload.kind === "subcategory" ? (
        <g className="sankey-label">
          <text x={x - 12} y={y + height / 2 - 1} textAnchor="end" className="sankey-label-main">
            {payload.labelMain}
          </text>
          <text x={x - 12} y={y + height / 2 + 16} textAnchor="end" className="sankey-label-sub">
            {payload.labelSub}
          </text>
        </g>
      ) : null}
      {payload.kind === "fixed" ? (
        <g className="sankey-label">
          <text x={x - 12} y={y + height / 2 - 1} textAnchor="end" className="sankey-label-main">
            {payload.labelMain}
          </text>
          <text x={x - 12} y={y + height / 2 + 16} textAnchor="end" className="sankey-label-sub">
            {payload.labelSub}
          </text>
        </g>
      ) : null}
      {payload.kind === "income" ? (
        <g className="sankey-label">
          <text x={x - 12} y={y + height / 2 - 1} textAnchor="end" className="sankey-label-main">
            {payload.labelMain}
          </text>
          <text x={x - 12} y={y + height / 2 + 16} textAnchor="end" className="sankey-label-sub">
            {payload.labelSub}
          </text>
        </g>
      ) : null}
      {payload.kind === "total" ? (
        <g className="sankey-label">
          <text x={x + width / 2} y={Math.max(14, y - 16)} textAnchor="middle" className="sankey-label-main">
            {payload.labelMain}
          </text>
          <text x={x + width / 2} y={Math.max(29, y - 1)} textAnchor="middle" className="sankey-label-sub">
            {payload.labelSub}
          </text>
        </g>
      ) : null}
    </g>
  );
}

export function FlowTooltip({
  active,
  payload,
  currency
}: {
  active?: boolean;
  payload?: Array<{ payload?: RechartsSankeyLinkPayload }>;
  currency: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;
  if (!item?.source || !item?.target || typeof item.value !== "number") {
    return null;
  }

  return (
    <div className="flow-tooltip">
      <p>{item.source.name} -&gt; {item.target.name}</p>
      <strong>{formatCurrency(item.value, currency)}</strong>
    </div>
  );
}
