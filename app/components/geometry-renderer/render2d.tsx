import React from "react";

import type { DiagramPrimitive, Vec2 } from "./types";
import {
  compileFormula,
  EPSILON,
  findLineEndpointsInRect,
  findRayEndpointInRect,
  getPointLabelOffset,
  isFiniteNumber,
  normalize,
  normalizeDiagramLabel,
  within,
} from "./utils";

export interface RenderLabelOptions {
  labelKey: string;
  x: number;
  y: number;
  text: string;
  fill: string;
  fontSize?: number;
  textAnchor?: "start" | "middle" | "end";
}

type RenderLabelText = (options: RenderLabelOptions) => React.ReactNode;

interface Render2DPrimitiveParams {
  primitive: DiagramPrimitive;
  index: number;
  key: string;
  strokeColor: string;
  strokeWidth: number;
  strokeDasharray: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  unit: number;
  functionXRange: Vec2;
  getPointRawCoords: (id: string) => Vec2 | null;
  getPointCoords: (id: string) => Vec2 | null;
  transformX: (x: number) => number;
  transformY: (y: number) => number;
  renderLabelText: RenderLabelText;
  editablePoints: boolean;
  editableStrokeStyles: boolean;
  onPointPointerDown: (
    event: React.PointerEvent<SVGCircleElement>,
    pointId: string,
    primitiveIndex: number
  ) => void;
  onTogglePrimitiveStyle?: (primitiveIndex: number) => void;
}

export function render2DPrimitive(params: Render2DPrimitiveParams): React.ReactNode | undefined {
  const {
    primitive,
    index,
    key,
    strokeColor,
    strokeWidth,
    strokeDasharray,
    minX,
    maxX,
    minY,
    maxY,
    unit,
    functionXRange,
    getPointRawCoords,
    getPointCoords,
    transformX,
    transformY,
    renderLabelText,
    editablePoints,
    editableStrokeStyles,
    onPointPointerDown,
    onTogglePrimitiveStyle,
  } = params;

  const getStyleToggleProps = () => ({
    onClick:
      editableStrokeStyles && onTogglePrimitiveStyle
        ? (event: React.MouseEvent<SVGElement>) => {
            event.stopPropagation();
            onTogglePrimitiveStyle(index);
          }
        : undefined,
    style: editableStrokeStyles && onTogglePrimitiveStyle ? { cursor: "pointer" } : undefined,
  });

  switch (primitive.type) {
    case "grid": {
      const step = primitive.step && primitive.step > 0 ? primitive.step : 1;
      const lines: React.ReactNode[] = [];

      for (let x = Math.ceil(minX / step) * step; x <= maxX + EPSILON; x += step) {
        lines.push(
          <line
            key={`grid-x-${x}`}
            x1={transformX(x)}
            y1={transformY(minY)}
            x2={transformX(x)}
            y2={transformY(maxY)}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        );
      }

      for (let y = Math.ceil(minY / step) * step; y <= maxY + EPSILON; y += step) {
        lines.push(
          <line
            key={`grid-y-${y}`}
            x1={transformX(minX)}
            y1={transformY(y)}
            x2={transformX(maxX)}
            y2={transformY(y)}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        );
      }

      return <g key={key}>{lines}</g>;
    }

    case "axis": {
      const [xStart, xEnd] = primitive.x_range;
      const [yStart, yEnd] = primitive.y_range;
      const showNumbers = Boolean(primitive.show_numbers);
      const nodes: React.ReactNode[] = [];

      nodes.push(
        <line
          key="axis-x"
          x1={transformX(xStart)}
          y1={transformY(0)}
          x2={transformX(xEnd)}
          y2={transformY(0)}
          stroke="#374151"
          strokeWidth={1.5}
          strokeDasharray={strokeDasharray}
          markerEnd="url(#geometry-arrow)"
        />
      );

      nodes.push(
        <line
          key="axis-y"
          x1={transformX(0)}
          y1={transformY(yStart)}
          x2={transformX(0)}
          y2={transformY(yEnd)}
          stroke="#374151"
          strokeWidth={1.5}
          strokeDasharray={strokeDasharray}
          markerEnd="url(#geometry-arrow)"
        />
      );

      if (showNumbers) {
        if (within(0, yStart, yEnd)) {
          for (let x = Math.ceil(xStart); x <= Math.floor(xEnd); x++) {
            if (x === 0) {
              continue;
            }

            nodes.push(
              <text
                key={`axis-x-number-${x}`}
                x={transformX(x)}
                y={transformY(0) + 14}
                fontSize={10}
                textAnchor="middle"
                fill="#6b7280"
              >
                {x}
              </text>
            );
          }
        }

        if (within(0, xStart, xEnd)) {
          for (let y = Math.ceil(yStart); y <= Math.floor(yEnd); y++) {
            if (y === 0) {
              continue;
            }

            nodes.push(
              <text
                key={`axis-y-number-${y}`}
                x={transformX(0) - 8}
                y={transformY(y) + 4}
                fontSize={10}
                textAnchor="end"
                fill="#6b7280"
              >
                {y}
              </text>
            );
          }
        }
      }

      return <g key={key}>{nodes}</g>;
    }

    case "polygon": {
      const points = primitive.points
        .map((id) => getPointCoords(id))
        .filter((point): point is Vec2 => point !== null);

      if (points.length < 3) {
        return null;
      }

      const pointsString = points.map(([x, y]) => `${x},${y}`).join(" ");

      return (
        <polygon
          key={key}
          points={pointsString}
          fill={primitive.fill ?? "rgba(59, 130, 246, 0.1)"}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          {...getStyleToggleProps()}
        />
      );
    }

    case "segment": {
      const [pA, pB] = primitive.points;
      const a = getPointCoords(pA);
      const b = getPointCoords(pB);

      if (!a || !b) {
        return null;
      }

      return (
        <line
          key={key}
          x1={a[0]}
          y1={a[1]}
          x2={b[0]}
          y2={b[1]}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          {...getStyleToggleProps()}
        />
      );
    }

    case "line": {
      const [pA, pB] = primitive.points;
      const rawA = getPointRawCoords(pA);
      const rawB = getPointRawCoords(pB);

      if (!rawA || !rawB) {
        return null;
      }

      const endpoints = findLineEndpointsInRect(rawA, rawB, minX, maxX, minY, maxY);
      if (!endpoints) {
        return null;
      }

      const [start, end] = endpoints;

      return (
        <line
          key={key}
          x1={transformX(start[0])}
          y1={transformY(start[1])}
          x2={transformX(end[0])}
          y2={transformY(end[1])}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          {...getStyleToggleProps()}
        />
      );
    }

    case "ray": {
      const rawFrom = getPointRawCoords(primitive.from);
      const rawTowards = getPointRawCoords(primitive.towards);

      if (!rawFrom || !rawTowards) {
        return null;
      }

      const endpoint = findRayEndpointInRect(rawFrom, rawTowards, minX, maxX, minY, maxY);
      if (!endpoint) {
        return null;
      }

      return (
        <line
          key={key}
          x1={transformX(rawFrom[0])}
          y1={transformY(rawFrom[1])}
          x2={transformX(endpoint[0])}
          y2={transformY(endpoint[1])}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          markerEnd="url(#geometry-arrow)"
          {...getStyleToggleProps()}
        />
      );
    }

    case "circle": {
      const centerRaw = primitive.center_id
        ? getPointRawCoords(primitive.center_id)
        : primitive.center ?? null;

      if (!centerRaw || !isFiniteNumber(primitive.radius) || primitive.radius <= 0) {
        return null;
      }

      return (
        <circle
          key={key}
          cx={transformX(centerRaw[0])}
          cy={transformY(centerRaw[1])}
          r={primitive.radius * unit}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          {...getStyleToggleProps()}
        />
      );
    }

    case "ellipse": {
      const center = getPointCoords(primitive.center_id);
      if (
        !center ||
        !isFiniteNumber(primitive.rx) ||
        !isFiniteNumber(primitive.ry) ||
        primitive.rx <= 0 ||
        primitive.ry <= 0
      ) {
        return null;
      }

      return (
        <ellipse
          key={key}
          cx={center[0]}
          cy={center[1]}
          rx={primitive.rx * unit}
          ry={primitive.ry * unit}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          {...getStyleToggleProps()}
        />
      );
    }

    case "arc": {
      const center = getPointRawCoords(primitive.center_id);
      const start = getPointRawCoords(primitive.start_id);
      const end = getPointRawCoords(primitive.end_id);

      if (!center || !start || !end) {
        return null;
      }

      const radius = Math.hypot(start[0] - center[0], start[1] - center[1]);
      if (radius < EPSILON) {
        return null;
      }

      const startSvg: Vec2 = [transformX(start[0]), transformY(start[1])];
      const endSvg: Vec2 = [transformX(end[0]), transformY(end[1])];

      const v1: Vec2 = [start[0] - center[0], start[1] - center[1]];
      const v2: Vec2 = [end[0] - center[0], end[1] - center[1]];
      const cross = v1[0] * v2[1] - v1[1] * v2[0];
      const sweepFlag = cross >= 0 ? 0 : 1;

      return (
        <path
          key={key}
          d={`M ${startSvg[0]} ${startSvg[1]} A ${radius * unit} ${radius * unit} 0 0 ${sweepFlag} ${endSvg[0]} ${endSvg[1]}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          {...getStyleToggleProps()}
        />
      );
    }

    case "angle": {
      const vertex = getPointRawCoords(primitive.vertex);
      const p1 = getPointRawCoords(primitive.p1);
      const p2 = getPointRawCoords(primitive.p2);

      if (!vertex || !p1 || !p2) {
        return null;
      }

      const v1 = normalize([p1[0] - vertex[0], p1[1] - vertex[1]]);
      const v2 = normalize([p2[0] - vertex[0], p2[1] - vertex[1]]);
      if (!v1 || !v2) {
        return null;
      }

      const markType = primitive.mark ?? "arc";
      const markRadius = 0.45;
      const markColor = primitive.color ?? "#ef4444";
      const angleCross = v1[0] * v2[1] - v1[1] * v2[0];
      const sweepFlag = angleCross >= 0 ? 0 : 1;

      const nodes: React.ReactNode[] = [];

      if (markType === "right") {
        const q1: Vec2 = [vertex[0] + v1[0] * markRadius, vertex[1] + v1[1] * markRadius];
        const q2: Vec2 = [vertex[0] + v2[0] * markRadius, vertex[1] + v2[1] * markRadius];
        const q3: Vec2 = [q1[0] + v2[0] * markRadius, q1[1] + v2[1] * markRadius];

        nodes.push(
          <path
            key="angle-right-mark"
            d={`M ${transformX(q1[0])} ${transformY(q1[1])} L ${transformX(q3[0])} ${transformY(q3[1])} L ${transformX(q2[0])} ${transformY(q2[1])}`}
            fill="none"
            stroke={markColor}
            strokeWidth={2}
            strokeDasharray={strokeDasharray}
            {...getStyleToggleProps()}
          />
        );
      } else {
        const start: Vec2 = [vertex[0] + v1[0] * markRadius, vertex[1] + v1[1] * markRadius];
        const end: Vec2 = [vertex[0] + v2[0] * markRadius, vertex[1] + v2[1] * markRadius];

        nodes.push(
          <path
            key="angle-arc-mark"
            d={`M ${transformX(start[0])} ${transformY(start[1])} A ${markRadius * unit} ${markRadius * unit} 0 0 ${sweepFlag} ${transformX(end[0])} ${transformY(end[1])}`}
            fill="none"
            stroke={markColor}
            strokeWidth={2}
            strokeDasharray={strokeDasharray}
            {...getStyleToggleProps()}
          />
        );
      }

      const angleLabel = normalizeDiagramLabel(primitive.label);
      if (angleLabel) {
        const bisector = normalize([v1[0] + v2[0], v1[1] + v2[1]]);
        if (bisector) {
          const labelPos: Vec2 = [
            vertex[0] + bisector[0] * markRadius * 1.6,
            vertex[1] + bisector[1] * markRadius * 1.6,
          ];

          nodes.push(
            renderLabelText({
              labelKey: `primitive-${index}-angle-label`,
              x: transformX(labelPos[0]),
              y: transformY(labelPos[1]),
              text: angleLabel,
              fill: "#1f2937",
              textAnchor: "middle",
            })
          );
        }
      }

      return <g key={key}>{nodes}</g>;
    }

    case "point": {
      const pointCoords = getPointCoords(primitive.id);
      if (!pointCoords) {
        return null;
      }

      const [x, y] = pointCoords;
      const [offsetX, offsetY] = getPointLabelOffset(primitive.pos);
      const pointLabel = normalizeDiagramLabel(primitive.label ?? primitive.id);

      return (
        <g key={key}>
          <circle
            cx={x}
            cy={y}
            r={editablePoints ? 6 : 4}
            fill={primitive.color ?? "#111827"}
            style={editablePoints ? { cursor: "move" } : undefined}
            onPointerDown={(event) => onPointPointerDown(event, primitive.id, index)}
          />
          {pointLabel &&
            renderLabelText({
              labelKey: `primitive-${index}-point-label`,
              x: x + offsetX,
              y: y + offsetY,
              text: pointLabel,
              fill: "#111827",
              textAnchor: "start",
            })}
        </g>
      );
    }

    case "label": {
      const labelContent = normalizeDiagramLabel(primitive.content);
      if (!labelContent) {
        return null;
      }

      return renderLabelText({
        labelKey: `primitive-${index}-label`,
        x: transformX(primitive.coords[0]),
        y: transformY(primitive.coords[1]),
        text: labelContent,
        fill: primitive.color ?? "#111827",
      });
    }

    case "function": {
      const evaluate = compileFormula(primitive.formula);
      if (!evaluate) {
        return null;
      }

      const [xStart, xEnd] = functionXRange;
      const sampleCount = 300;
      const segments: string[] = [];
      let currentSegment: string[] = [];

      for (let i = 0; i <= sampleCount; i++) {
        const ratio = i / sampleCount;
        const x = xStart + (xEnd - xStart) * ratio;
        const y = evaluate(x);

        if (y === null || !isFiniteNumber(y) || Math.abs(y) > 1e6) {
          if (currentSegment.length > 1) {
            segments.push(currentSegment.join(" "));
          }
          currentSegment = [];
          continue;
        }

        currentSegment.push(`${transformX(x)},${transformY(y)}`);
      }

      if (currentSegment.length > 1) {
        segments.push(currentSegment.join(" "));
      }

      if (segments.length === 0) {
        return null;
      }

      return (
        <g key={key}>
          {segments.map((segment, segmentIndex) => (
            <polyline
              key={`${key}-segment-${segmentIndex}`}
              points={segment}
              fill="none"
              stroke={primitive.color ?? "#2563eb"}
              strokeWidth={2}
              strokeDasharray={strokeDasharray}
              {...getStyleToggleProps()}
            />
          ))}
        </g>
      );
    }

    default:
      return undefined;
  }
}
