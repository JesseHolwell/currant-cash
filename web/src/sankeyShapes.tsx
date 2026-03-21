import type { RechartsSankeyLinkPayload, RechartsSankeyNode } from "./domain";
import { formatCurrency } from "./domain";

type NodeKind = NonNullable<RechartsSankeyNode["kind"]>;

const LEFT_LABEL_KINDS = new Set<NodeKind>(["group", "subcategory", "fixed", "income"]);
const RIGHT_LABEL_KINDS = new Set<NodeKind>(["merchant", "fixedLeaf", "savings"]);

function truncateLabel(label: string | undefined, maxChars: number): string {
  const text = (label ?? "").trim();
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function shouldShowPrimaryLabel(kind: NodeKind, height: number): boolean {
  if (kind === "total") {
    return true;
  }
  if (kind === "merchant" || kind === "fixedLeaf" || kind === "savings") {
    return height >= 16;
  }
  return height >= 13;
}

function shouldShowSecondaryLabel(kind: NodeKind, height: number): boolean {
  if (kind === "total") {
    return true;
  }
  if (kind === "merchant" || kind === "fixedLeaf" || kind === "savings") {
    return height >= 26;
  }
  return height >= 22;
}

function resolveLinkOpacity(kind: RechartsSankeyLinkPayload["kind"]): number {
  if (kind === "income") {
    return 0.3;
  }
  if (kind === "group") {
    return 0.34;
  }
  if (kind === "subcategory") {
    return 0.3;
  }
  if (kind === "merchant") {
    return 0.24;
  }
  if (kind === "fixed" || kind === "fixedLeaf") {
    return 0.32;
  }
  if (kind === "savings") {
    return 0.28;
  }
  return 0.22;
}

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
  const widthPenalty = linkWidth > 80 ? 0.18 : linkWidth > 40 ? 0.1 : linkWidth > 20 ? 0.05 : 0;
  const strokeOpacity = Math.max(0.12, resolveLinkOpacity(payload.kind) - widthPenalty);

  return (
    <path
      d={pathWithShoulders}
      fill="none"
      stroke={payload.color ?? "#C4638A"}
      strokeOpacity={strokeOpacity}
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
  const kind: NodeKind = payload.kind ?? "merchant";

  if (kind === "hidden") {
    return <g />;
  }

  const mainLabel = truncateLabel(payload.labelMain ?? payload.name ?? "", kind === "merchant" ? 40 : 30);
  const subLabel = truncateLabel(payload.labelSub, kind === "merchant" ? 34 : 28);
  const showPrimaryLabel = shouldShowPrimaryLabel(kind, height) && Boolean(mainLabel);
  const showSecondaryLabel = showPrimaryLabel && shouldShowSecondaryLabel(kind, height) && Boolean(subLabel);
  const accentOnLeft = kind === "group" || kind === "subcategory" || kind === "fixed" || kind === "income";
  const rightLabelYOffset = showSecondaryLabel ? -2 : 4;
  const leftLabelYOffset = showSecondaryLabel ? -2 : 4;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3} fill="rgba(61,36,56,0.08)" fillOpacity={1} />
      <rect
        x={accentOnLeft ? x : x + width - 3}
        y={y}
        width={3}
        height={height}
        fill={payload.color ?? "#6B445C"}
        opacity={0.95}
      />
      {kind === "total" ? (
        <rect x={x + width / 2 - 1} y={y} width={2} height={height} fill="rgba(61,36,56,0.3)" opacity={0.6} />
      ) : null}

      {RIGHT_LABEL_KINDS.has(kind) && showPrimaryLabel ? (
        <g className="sankey-label">
          {height >= 18 ? (
            <>
              <rect x={x + width + 10} y={y + height / 2 - 10} width={20} height={20} rx={7} className="sankey-chip" />
              <rect x={x + width + 17} y={y + height / 2 - 3} width={6} height={6} rx={2} fill={payload.color ?? "#6B445C"} />
            </>
          ) : null}
          <text x={x + width + (height >= 18 ? 38 : 12)} y={y + height / 2 + rightLabelYOffset} textAnchor="start" className="sankey-label-main">
            {mainLabel}
          </text>
          {showSecondaryLabel ? (
            <text x={x + width + 38} y={y + height / 2 + 13} textAnchor="start" className="sankey-label-sub">
              {subLabel}
            </text>
          ) : null}
        </g>
      ) : null}

      {LEFT_LABEL_KINDS.has(kind) && showPrimaryLabel ? (
        <g className="sankey-label">
          <text x={x - 10} y={y + height / 2 + leftLabelYOffset} textAnchor="end" className="sankey-label-main">
            {mainLabel}
          </text>
          {showSecondaryLabel ? (
            <text x={x - 10} y={y + height / 2 + 13} textAnchor="end" className="sankey-label-sub">
              {subLabel}
            </text>
          ) : null}
        </g>
      ) : null}

      {kind === "total" ? (
        <g className="sankey-label">
          <text x={x + width / 2} y={Math.max(14, y - 15)} textAnchor="middle" className="sankey-label-main">
            {mainLabel}
          </text>
          <text x={x + width / 2} y={Math.max(28, y - 1)} textAnchor="middle" className="sankey-label-sub">
            {subLabel}
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
