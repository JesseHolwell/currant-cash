import type { RechartsSankeyLinkPayload, RechartsSankeyNode } from "./domain";
import { formatCurrency } from "./domain";

type NodeKind = NonNullable<RechartsSankeyNode["kind"]>;
type LabelAlign = "left" | "right" | "center";

const LEFT_LABEL_KINDS = new Set<NodeKind>(["group", "subcategory", "fixed", "income"]);
const RIGHT_LABEL_KINDS = new Set<NodeKind>(["merchant", "fixedLeaf", "savings"]);
const LABEL_GAP = 12;
const LABEL_PADDING_X = 10;
const LABEL_CARD_SINGLE_HEIGHT = 24;
const LABEL_CARD_DOUBLE_HEIGHT = 36;
const LABEL_ACCENT_WIDTH = 4;

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
    return height >= 18;
  }
  return height >= 14;
}

function shouldShowSecondaryLabel(kind: NodeKind, height: number): boolean {
  if (kind === "total") {
    return true;
  }
  if (kind === "merchant" || kind === "fixedLeaf" || kind === "savings") {
    return height >= 30;
  }
  return height >= 24;
}

function estimateTextWidth(text: string, variant: "main" | "sub"): number {
  const widthPerCharacter = variant === "main" ? 6.6 : 5.8;
  return Math.ceil(text.length * widthPerCharacter);
}

function truncateLabelToWidth(label: string | undefined, maxWidth: number, variant: "main" | "sub"): string {
  const widthPerCharacter = variant === "main" ? 6.6 : 5.8;
  const maxChars = Math.max(6, Math.floor(maxWidth / widthPerCharacter));
  return truncateLabel(label, maxChars);
}

function getLabelTextWidthLimit(kind: NodeKind, align: LabelAlign): number {
  if (align === "center") {
    return 150;
  }
  if (align === "right") {
    return kind === "merchant" || kind === "fixedLeaf" ? 182 : 156;
  }
  if (kind === "income") {
    return 162;
  }
  return 146;
}

function SankeyLabelCard({
  anchorX,
  anchorY,
  align,
  color,
  kind,
  main,
  sub
}: {
  anchorX: number;
  anchorY: number;
  align: LabelAlign;
  color?: string;
  kind: NodeKind;
  main: string;
  sub?: string;
}) {
  const maxTextWidth = getLabelTextWidthLimit(kind, align);
  const mainLabel = truncateLabelToWidth(main, maxTextWidth, "main");
  const subLabel = truncateLabelToWidth(sub, maxTextWidth, "sub");
  const cardHeight = subLabel ? LABEL_CARD_DOUBLE_HEIGHT : LABEL_CARD_SINGLE_HEIGHT;
  const textWidth = Math.max(
    estimateTextWidth(mainLabel, "main"),
    subLabel ? estimateTextWidth(subLabel, "sub") : 0
  );
  const accentInset = align === "center" ? 0 : LABEL_ACCENT_WIDTH;
  const cardWidth = textWidth + LABEL_PADDING_X * 2 + accentInset;
  const boxX = align === "left"
    ? anchorX - cardWidth
    : align === "center"
      ? anchorX - cardWidth / 2
      : anchorX;
  const boxY = anchorY - cardHeight / 2;
  const textX = align === "right" ? boxX + LABEL_ACCENT_WIDTH + LABEL_PADDING_X : boxX + LABEL_PADDING_X;
  const mainY = boxY + (subLabel ? 13 : cardHeight / 2 + 0.5);
  const subY = boxY + 25;

  return (
    <g className="sankey-label">
      <rect x={boxX} y={boxY} width={cardWidth} height={cardHeight} rx={10} className="sankey-label-card" />
      {align !== "center" ? (
        <rect
          x={align === "left" ? boxX + cardWidth - LABEL_ACCENT_WIDTH : boxX}
          y={boxY}
          width={LABEL_ACCENT_WIDTH}
          height={cardHeight}
          rx={10}
          fill={color ?? "#6B445C"}
          className="sankey-label-accent"
        />
      ) : null}
      <text x={textX} y={mainY} textAnchor="start" dominantBaseline="middle" className="sankey-label-main">
        {mainLabel}
      </text>
      {subLabel ? (
        <text x={textX} y={subY} textAnchor="start" dominantBaseline="middle" className="sankey-label-sub">
          {subLabel}
        </text>
      ) : null}
    </g>
  );
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

  const mainLabel = (payload.labelMain ?? payload.name ?? "").trim();
  const subLabel = (payload.labelSub ?? "").trim();
  const showPrimaryLabel = shouldShowPrimaryLabel(kind, height) && Boolean(mainLabel);
  const showSecondaryLabel = showPrimaryLabel && shouldShowSecondaryLabel(kind, height) && Boolean(subLabel);
  const accentOnLeft = kind === "group" || kind === "subcategory" || kind === "fixed" || kind === "income";

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
        <SankeyLabelCard
          anchorX={x + width + LABEL_GAP}
          anchorY={y + height / 2}
          align="right"
          color={payload.color}
          kind={kind}
          main={mainLabel}
          sub={showSecondaryLabel ? subLabel : undefined}
        />
      ) : null}

      {LEFT_LABEL_KINDS.has(kind) && showPrimaryLabel ? (
        <SankeyLabelCard
          anchorX={x - LABEL_GAP}
          anchorY={y + height / 2}
          align="left"
          color={payload.color}
          kind={kind}
          main={mainLabel}
          sub={showSecondaryLabel ? subLabel : undefined}
        />
      ) : null}

      {kind === "total" ? (
        <SankeyLabelCard
          anchorX={x + width / 2}
          anchorY={Math.max(24, y - 14)}
          align="center"
          color={payload.color}
          kind={kind}
          main={mainLabel}
          sub={subLabel}
        />
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
