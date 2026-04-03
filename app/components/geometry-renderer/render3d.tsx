import React from "react";

import type { DiagramPrimitive, StrokeStyle, Vec2 } from "./types";
import { readLabelFieldRaw } from "./labels3d";
import {
  findFrontMostVertexIndex,
  getEdgeLabelPositionSvg,
  getObliqueDepthVector,
  getRectangularPrismLabelPositionsSvg,
  getStrokeDasharray,
  isFiniteNumber,
  nudgeLabelAwayFromSegments,
  normalizeDiagramLabel,
  splitEllipseHalfPaths,
  type LineSegmentSvg,
} from "./utils";
import type { RenderLabelOptions } from "./render2d";

type RenderLabelText = (options: RenderLabelOptions) => React.ReactNode;

interface Render3DPrimitiveParams {
  primitive: DiagramPrimitive;
  index: number;
  key: string;
  strokeColor: string;
  strokeWidth: number;
  unit: number;
  transformX: (x: number) => number;
  transformY: (y: number) => number;
  renderLabelText: RenderLabelText;
  editableEdgeStyles: boolean;
  resolveEdgeStyle: (edgeKey: string, defaultStyle: StrokeStyle) => StrokeStyle;
  onToggleEdgeStyle?: (edgeKey: string, defaultStyle: StrokeStyle) => void;
}

function getLabel(primitive: DiagramPrimitive, field: string): string | undefined {
  const raw = readLabelFieldRaw(primitive, field);
  return normalizeDiagramLabel(raw);
}

function getPrismSideDirection(index: number, totalSides: number): "up" | "down" | "left" | "right" {
  if (totalSides === 3) {
    return (["down", "right", "left"] as const)[index % 3];
  }

  return (["down", "right", "up", "left"] as const)[index % 4];
}

export function render3DPrimitive(params: Render3DPrimitiveParams): React.ReactNode | undefined {
  const {
    primitive,
    index,
    key,
    strokeColor,
    strokeWidth,
    unit,
    transformX,
    transformY,
    renderLabelText,
    editableEdgeStyles,
    resolveEdgeStyle,
    onToggleEdgeStyle,
  } = params;

  const getEdgeProps = (edgeKey: string, defaultStyle: StrokeStyle) => ({
    strokeDasharray: getStrokeDasharray(resolveEdgeStyle(edgeKey, defaultStyle)),
    onClick:
      editableEdgeStyles && onToggleEdgeStyle
        ? (event: React.MouseEvent<SVGElement>) => {
            event.stopPropagation();
            onToggleEdgeStyle(edgeKey, defaultStyle);
          }
        : undefined,
    style: editableEdgeStyles && onToggleEdgeStyle ? { cursor: "pointer" } : undefined,
  });

  switch (primitive.type) {
    case "sphere_3d": {
      const [cX, cY] = primitive.center_coords;
      if (!isFiniteNumber(primitive.radius) || primitive.radius <= 0) {
        return null;
      }

      const cx = transformX(cX);
      const cy = transformY(cY);
      const rxPx = primitive.radius * unit;
      const ryPx = Math.max(primitive.radius * 0.25 * unit, 1);
      const { topPath, bottomPath } = splitEllipseHalfPaths(cx, cy, rxPx, ryPx);
      const radiusEnd: Vec2 = [cX + primitive.radius, cY];
      const radiusLabelPos = getEdgeLabelPositionSvg(
        [transformX(cX), transformY(cY)],
        [transformX(radiusEnd[0]), transformY(radiusEnd[1])],
        12,
        "down"
      );
      const sphereEdgePrefix = `primitive-${index}-sphere`;
      const labelRadius = getLabel(primitive, "label_radius");

      return (
        <g key={key}>
          <g data-layer="fill" />
          <g data-layer="solid-lines">
            <circle
              cx={cx}
              cy={cy}
              r={rxPx}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              {...getEdgeProps(`${sphereEdgePrefix}-outline`, "solid")}
            />
            <path
              d={bottomPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              {...getEdgeProps(`${sphereEdgePrefix}-equator-front`, "solid")}
            />
          </g>
          <g data-layer="dashed-lines-and-labels">
            <path
              d={topPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              {...getEdgeProps(`${sphereEdgePrefix}-equator-back`, "dashed")}
            />
            {labelRadius && (
              <>
                <line
                  x1={transformX(cX)}
                  y1={transformY(cY)}
                  x2={transformX(radiusEnd[0])}
                  y2={transformY(radiusEnd[1])}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  strokeDasharray={getStrokeDasharray("dashed")}
                />
                {renderLabelText({
                  labelKey: `primitive-${index}-sphere-radius`,
                  x: radiusLabelPos[0],
                  y: radiusLabelPos[1],
                  text: labelRadius,
                  fill: strokeColor,
                })}
              </>
            )}
          </g>
        </g>
      );
    }

    case "cylinder_3d": {
      const [bX, bY] = primitive.center_bottom_coords;
      if (
        !isFiniteNumber(primitive.radius) ||
        !isFiniteNumber(primitive.height) ||
        primitive.radius <= 0
      ) {
        return null;
      }

      const tY = bY + primitive.height;
      const bottomCx = transformX(bX);
      const bottomCy = transformY(bY);
      const topCx = transformX(bX);
      const topCy = transformY(tY);
      const rxPx = primitive.radius * unit;
      const ryPx = Math.max(primitive.radius * 0.25 * unit, 1);
      const { topPath, bottomPath } = splitEllipseHalfPaths(bottomCx, bottomCy, rxPx, ryPx);
      const radiusEnd: Vec2 = [bX + primitive.radius, bY];
      const radiusLabelPos = getEdgeLabelPositionSvg(
        [transformX(bX), transformY(bY)],
        [transformX(radiusEnd[0]), transformY(radiusEnd[1])],
        12,
        "down"
      );
      const heightLabelPos = getEdgeLabelPositionSvg(
        [transformX(bX + primitive.radius), transformY(bY)],
        [transformX(bX + primitive.radius), transformY(tY)],
        18,
        "right"
      );
      const cylinderEdgePrefix = `primitive-${index}-cylinder`;
      const labelRadius = getLabel(primitive, "label_radius");
      const labelHeight = getLabel(primitive, "label_height");

      return (
        <g key={key}>
          <g data-layer="fill" />
          <g data-layer="solid-lines">
            <line
              x1={transformX(bX - primitive.radius)}
              y1={transformY(bY)}
              x2={transformX(bX - primitive.radius)}
              y2={transformY(tY)}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              {...getEdgeProps(`${cylinderEdgePrefix}-left-side`, "solid")}
            />
            <line
              x1={transformX(bX + primitive.radius)}
              y1={transformY(bY)}
              x2={transformX(bX + primitive.radius)}
              y2={transformY(tY)}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              {...getEdgeProps(`${cylinderEdgePrefix}-right-side`, "solid")}
            />
            <ellipse
              cx={topCx}
              cy={topCy}
              rx={rxPx}
              ry={ryPx}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              {...getEdgeProps(`${cylinderEdgePrefix}-top-rim`, "solid")}
            />
            <path
              d={bottomPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              {...getEdgeProps(`${cylinderEdgePrefix}-bottom-rim-front`, "solid")}
            />
          </g>
          <g data-layer="dashed-lines-and-labels">
            <path
              d={topPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              {...getEdgeProps(`${cylinderEdgePrefix}-bottom-rim-back`, "dashed")}
            />
            {labelRadius && (
              <>
                <line
                  x1={transformX(bX)}
                  y1={transformY(bY)}
                  x2={transformX(radiusEnd[0])}
                  y2={transformY(radiusEnd[1])}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  strokeDasharray={getStrokeDasharray("dashed")}
                />
                {renderLabelText({
                  labelKey: `primitive-${index}-cylinder-radius`,
                  x: radiusLabelPos[0],
                  y: radiusLabelPos[1],
                  text: labelRadius,
                  fill: strokeColor,
                })}
              </>
            )}
            {labelHeight &&
              renderLabelText({
                labelKey: `primitive-${index}-cylinder-height`,
                x: heightLabelPos[0],
                y: heightLabelPos[1],
                text: labelHeight,
                fill: strokeColor,
              })}
          </g>
        </g>
      );
    }

    case "cone_3d": {
      const [bX, bY] = primitive.center_bottom_coords;
      if (
        !isFiniteNumber(primitive.radius) ||
        !isFiniteNumber(primitive.height) ||
        primitive.radius <= 0
      ) {
        return null;
      }

      const apex: Vec2 = [bX, bY + primitive.height];
      const left: Vec2 = [bX - primitive.radius, bY];
      const right: Vec2 = [bX + primitive.radius, bY];
      const baseCenter: Vec2 = [bX, bY];

      const bottomCx = transformX(bX);
      const bottomCy = transformY(bY);
      const rxPx = primitive.radius * unit;
      const ryPx = Math.max(primitive.radius * 0.25 * unit, 1);
      const { topPath, bottomPath } = splitEllipseHalfPaths(bottomCx, bottomCy, rxPx, ryPx);
      const radiusEnd: Vec2 = [bX + primitive.radius, bY];
      const radiusLabelPos = getEdgeLabelPositionSvg(
        [transformX(bX), transformY(bY)],
        [transformX(radiusEnd[0]), transformY(radiusEnd[1])],
        12,
        "down"
      );
      const heightLabelPos = getEdgeLabelPositionSvg(
        [transformX(baseCenter[0]), transformY(baseCenter[1])],
        [transformX(apex[0]), transformY(apex[1])],
        14,
        "right"
      );
      const slantLabelPos = getEdgeLabelPositionSvg(
        [transformX(apex[0]), transformY(apex[1])],
        [transformX(right[0]), transformY(right[1])],
        14,
        "right"
      );
      const coneEdgePrefix = `primitive-${index}-cone`;
      const labelRadius = getLabel(primitive, "label_radius");
      const labelHeight = getLabel(primitive, "label_height");
      const labelSlant = getLabel(primitive, "label_slant");

      return (
        <g key={key}>
          <g data-layer="fill" />
          <g data-layer="solid-lines">
            <line
              x1={transformX(apex[0])}
              y1={transformY(apex[1])}
              x2={transformX(left[0])}
              y2={transformY(left[1])}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              {...getEdgeProps(`${coneEdgePrefix}-left-side`, "solid")}
            />
            <line
              x1={transformX(apex[0])}
              y1={transformY(apex[1])}
              x2={transformX(right[0])}
              y2={transformY(right[1])}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              {...getEdgeProps(`${coneEdgePrefix}-right-side`, "solid")}
            />
            <path
              d={bottomPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              {...getEdgeProps(`${coneEdgePrefix}-base-front`, "solid")}
            />
          </g>
          <g data-layer="dashed-lines-and-labels">
            <path
              d={topPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              {...getEdgeProps(`${coneEdgePrefix}-base-back`, "dashed")}
            />
            {labelRadius && (
              <>
                <line
                  x1={transformX(bX)}
                  y1={transformY(bY)}
                  x2={transformX(radiusEnd[0])}
                  y2={transformY(radiusEnd[1])}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  strokeDasharray={getStrokeDasharray("dashed")}
                />
                {renderLabelText({
                  labelKey: `primitive-${index}-cone-radius`,
                  x: radiusLabelPos[0],
                  y: radiusLabelPos[1],
                  text: labelRadius,
                  fill: strokeColor,
                })}
              </>
            )}
            {labelHeight && (
              <>
                <line
                  x1={transformX(baseCenter[0])}
                  y1={transformY(baseCenter[1])}
                  x2={transformX(apex[0])}
                  y2={transformY(apex[1])}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  strokeDasharray={getStrokeDasharray("dashed")}
                />
                {renderLabelText({
                  labelKey: `primitive-${index}-cone-height`,
                  x: heightLabelPos[0],
                  y: heightLabelPos[1],
                  text: labelHeight,
                  fill: strokeColor,
                })}
              </>
            )}
            {labelSlant &&
              renderLabelText({
                labelKey: `primitive-${index}-cone-slant`,
                x: slantLabelPos[0],
                y: slantLabelPos[1],
                text: labelSlant,
                fill: strokeColor,
              })}
          </g>
        </g>
      );
    }

    case "rectangular_prism_3d": {
      const [oX, oY] = primitive.origin_coords;
      if (
        !isFiniteNumber(primitive.width) ||
        !isFiniteNumber(primitive.height) ||
        !isFiniteNumber(primitive.depth)
      ) {
        return null;
      }

      const [dX, dY] = getObliqueDepthVector(primitive.depth);

      const a: Vec2 = [oX, oY];
      const b: Vec2 = [oX + primitive.width, oY];
      const c: Vec2 = [oX + primitive.width, oY + primitive.height];
      const d: Vec2 = [oX, oY + primitive.height];
      const e: Vec2 = [a[0] + dX, a[1] + dY];
      const f: Vec2 = [b[0] + dX, b[1] + dY];
      const g: Vec2 = [c[0] + dX, c[1] + dY];
      const h: Vec2 = [d[0] + dX, d[1] + dY];

      const prismSegmentsSvg: LineSegmentSvg[] = [
        { from: [transformX(a[0]), transformY(a[1])], to: [transformX(b[0]), transformY(b[1])] },
        { from: [transformX(b[0]), transformY(b[1])], to: [transformX(c[0]), transformY(c[1])] },
        { from: [transformX(c[0]), transformY(c[1])], to: [transformX(d[0]), transformY(d[1])] },
        { from: [transformX(d[0]), transformY(d[1])], to: [transformX(a[0]), transformY(a[1])] },
        { from: [transformX(e[0]), transformY(e[1])], to: [transformX(f[0]), transformY(f[1])] },
        { from: [transformX(f[0]), transformY(f[1])], to: [transformX(g[0]), transformY(g[1])] },
        { from: [transformX(g[0]), transformY(g[1])], to: [transformX(h[0]), transformY(h[1])] },
        { from: [transformX(h[0]), transformY(h[1])], to: [transformX(e[0]), transformY(e[1])] },
        { from: [transformX(a[0]), transformY(a[1])], to: [transformX(e[0]), transformY(e[1])] },
        { from: [transformX(b[0]), transformY(b[1])], to: [transformX(f[0]), transformY(f[1])] },
        { from: [transformX(c[0]), transformY(c[1])], to: [transformX(g[0]), transformY(g[1])] },
        { from: [transformX(d[0]), transformY(d[1])], to: [transformX(h[0]), transformY(h[1])] },
      ];

      const labelPositions = getRectangularPrismLabelPositionsSvg({
        a: [transformX(a[0]), transformY(a[1])],
        b: [transformX(b[0]), transformY(b[1])],
        c: [transformX(c[0]), transformY(c[1])],
        f: [transformX(f[0]), transformY(f[1])],
        showWidth: Boolean(getLabel(primitive, "label_width")),
        showHeight: Boolean(getLabel(primitive, "label_height")),
        showDepth: Boolean(getLabel(primitive, "label_depth")),
        segments: prismSegmentsSvg,
      });
      const labelWidth = getLabel(primitive, "label_width");
      const labelHeight = getLabel(primitive, "label_height");
      const labelDepth = getLabel(primitive, "label_depth");

      const edges: Array<{ id: string; from: Vec2; to: Vec2; style: StrokeStyle }> = [
        { id: "ab", from: a, to: b, style: "solid" },
        { id: "bc", from: b, to: c, style: "solid" },
        { id: "cd", from: c, to: d, style: "solid" },
        { id: "da", from: d, to: a, style: "solid" },
        { id: "ef", from: e, to: f, style: "dashed" },
        { id: "fg", from: f, to: g, style: "solid" },
        { id: "gh", from: g, to: h, style: "solid" },
        { id: "he", from: h, to: e, style: "dashed" },
        { id: "ae", from: a, to: e, style: "dashed" },
        { id: "bf", from: b, to: f, style: "solid" },
        { id: "cg", from: c, to: g, style: "solid" },
        { id: "dh", from: d, to: h, style: "solid" },
      ];

      const solidEdges = edges.filter((edge) => edge.style === "solid");
      const dashedEdges = edges.filter((edge) => edge.style === "dashed");

      return (
        <g key={key}>
          <g data-layer="fill">
            <polygon
              points={`${transformX(a[0])},${transformY(a[1])} ${transformX(b[0])},${transformY(
                b[1]
              )} ${transformX(c[0])},${transformY(c[1])} ${transformX(d[0])},${transformY(
                d[1]
              )}`}
              fill="rgba(59, 130, 246, 0.06)"
              stroke="none"
            />
            <polygon
              points={`${transformX(d[0])},${transformY(d[1])} ${transformX(c[0])},${transformY(
                c[1]
              )} ${transformX(g[0])},${transformY(g[1])} ${transformX(h[0])},${transformY(
                h[1]
              )}`}
              fill="rgba(59, 130, 246, 0.05)"
              stroke="none"
            />
          </g>
          <g data-layer="solid-lines">
            {solidEdges.map((edge) => (
              <line
                key={`${key}-${edge.id}`}
                x1={transformX(edge.from[0])}
                y1={transformY(edge.from[1])}
                x2={transformX(edge.to[0])}
                y2={transformY(edge.to[1])}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                {...getEdgeProps(`primitive-${index}-rect-prism-${edge.id}`, edge.style)}
              />
            ))}
          </g>
          <g data-layer="dashed-lines-and-labels">
            {dashedEdges.map((edge) => (
              <line
                key={`${key}-${edge.id}`}
                x1={transformX(edge.from[0])}
                y1={transformY(edge.from[1])}
                x2={transformX(edge.to[0])}
                y2={transformY(edge.to[1])}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                {...getEdgeProps(`primitive-${index}-rect-prism-${edge.id}`, edge.style)}
              />
            ))}
            {labelWidth &&
              renderLabelText({
                labelKey: `primitive-${index}-rect-width`,
                x: labelPositions.width?.[0] ?? transformX(a[0]),
                y: labelPositions.width?.[1] ?? transformY(a[1]),
                text: labelWidth,
                fill: strokeColor,
              })}
            {labelHeight &&
              renderLabelText({
                labelKey: `primitive-${index}-rect-height`,
                x: labelPositions.height?.[0] ?? transformX(c[0]),
                y: labelPositions.height?.[1] ?? transformY(c[1]),
                text: labelHeight,
                fill: strokeColor,
              })}
            {labelDepth &&
              renderLabelText({
                labelKey: `primitive-${index}-rect-depth`,
                x: labelPositions.depth?.[0] ?? transformX(f[0]),
                y: labelPositions.depth?.[1] ?? transformY(f[1]),
                text: labelDepth,
                fill: strokeColor,
              })}
          </g>
        </g>
      );
    }

    case "triangular_prism_3d":
    case "quadrilateral_prism_3d": {
      const baseVertices = primitive.base_vertices;
      if (
        !Array.isArray(baseVertices) ||
        baseVertices.length < 3 ||
        !isFiniteNumber(primitive.height)
      ) {
        return null;
      }

      const topVertices = baseVertices.map(([xRaw, yRaw]) =>
        [xRaw, yRaw + primitive.height] as Vec2
      );
      const lastIndex = baseVertices.length - 1;
      const frontIndex = findFrontMostVertexIndex(baseVertices);
      const topPoints = topVertices
        .map(([xRaw, yRaw]) => `${transformX(xRaw)},${transformY(yRaw)}`)
        .join(" ");

      const edges: Array<{ id: string; from: Vec2; to: Vec2; style: StrokeStyle }> = [];

      for (let i = 0; i < baseVertices.length; i++) {
        const next = (i + 1) % baseVertices.length;
        const edgeStyle: StrokeStyle =
          i === lastIndex || next === lastIndex ? "dashed" : "solid";

        edges.push({ id: `base-${i}-${next}`, from: baseVertices[i], to: baseVertices[next], style: edgeStyle });
        edges.push({ id: `top-${i}-${next}`, from: topVertices[i], to: topVertices[next], style: edgeStyle });
        edges.push({
          id: `vertical-${i}`,
          from: baseVertices[i],
          to: topVertices[i],
          style: i === lastIndex ? "dashed" : "solid",
        });
      }

      const solidEdges = edges.filter((edge) => edge.style === "solid");
      const dashedEdges = edges.filter((edge) => edge.style === "dashed");
      const prismSegmentsSvg: LineSegmentSvg[] = edges.map((edge) => ({
        from: [transformX(edge.from[0]), transformY(edge.from[1])],
        to: [transformX(edge.to[0]), transformY(edge.to[1])],
      }));

      const frontVerticalLabelPos =
        frontIndex >= 0
          ? nudgeLabelAwayFromSegments(
              getEdgeLabelPositionSvg(
                [
                  transformX(baseVertices[frontIndex][0]),
                  transformY(baseVertices[frontIndex][1]),
                ],
                [
                  transformX(topVertices[frontIndex][0]),
                  transformY(topVertices[frontIndex][1]),
                ],
                20,
                "right",
                10
              ),
              prismSegmentsSvg,
              [1, 0],
              18,
              5
            )
          : null;

      const labelHeight = getLabel(primitive, "label_height");
      const sideFields =
        primitive.type === "triangular_prism_3d"
          ? ["label_side_1", "label_side_2", "label_side_3"]
          : ["label_side_1", "label_side_2", "label_side_3", "label_side_4"];

      return (
        <g key={key}>
          <g data-layer="fill">
            <polygon points={topPoints} fill="rgba(59, 130, 246, 0.06)" stroke="none" />
          </g>
          <g data-layer="solid-lines">
            {solidEdges.map((edge) => (
              <line
                key={`${key}-${edge.id}`}
                x1={transformX(edge.from[0])}
                y1={transformY(edge.from[1])}
                x2={transformX(edge.to[0])}
                y2={transformY(edge.to[1])}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                {...getEdgeProps(`primitive-${index}-prism-${edge.id}`, edge.style)}
              />
            ))}
          </g>
          <g data-layer="dashed-lines-and-labels">
            {dashedEdges.map((edge) => (
              <line
                key={`${key}-${edge.id}`}
                x1={transformX(edge.from[0])}
                y1={transformY(edge.from[1])}
                x2={transformX(edge.to[0])}
                y2={transformY(edge.to[1])}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                {...getEdgeProps(`primitive-${index}-prism-${edge.id}`, edge.style)}
              />
            ))}
            {labelHeight &&
              frontVerticalLabelPos &&
              renderLabelText({
                labelKey: `primitive-${index}-prism-height`,
                x: frontVerticalLabelPos[0],
                y: frontVerticalLabelPos[1],
                text: labelHeight,
                fill: strokeColor,
              })}
            {sideFields.map((field, sideIndex) => {
              const content = getLabel(primitive, field);
              if (!content) {
                return null;
              }

              const next = (sideIndex + 1) % baseVertices.length;
              const sideLabelPos = getEdgeLabelPositionSvg(
                [transformX(baseVertices[sideIndex][0]), transformY(baseVertices[sideIndex][1])],
                [transformX(baseVertices[next][0]), transformY(baseVertices[next][1])],
                12,
                getPrismSideDirection(sideIndex, baseVertices.length)
              );

              return renderLabelText({
                labelKey: `primitive-${index}-prism-side-${sideIndex + 1}`,
                x: sideLabelPos[0],
                y: sideLabelPos[1],
                text: content,
                fill: strokeColor,
              });
            })}
          </g>
        </g>
      );
    }

    case "quadrilateral_pyramid_3d": {
      const [cX, cY] = primitive.center_base_coords;
      if (
        !isFiniteNumber(primitive.base_side) ||
        !isFiniteNumber(primitive.height) ||
        primitive.base_side <= 0
      ) {
        return null;
      }

      const half = primitive.base_side / 2;
      const quarter = primitive.base_side / 4;

      const frontLeft: Vec2 = [cX - half, cY - quarter];
      const frontRight: Vec2 = [cX + half, cY - quarter];
      const backRight: Vec2 = [cX + half, cY + quarter];
      const backLeft: Vec2 = [cX - half, cY + quarter];
      const apex: Vec2 = [cX, cY + primitive.height];
      const baseCenter: Vec2 = [cX, cY];
      const sideLabelPos = getEdgeLabelPositionSvg(
        [transformX(frontLeft[0]), transformY(frontLeft[1])],
        [transformX(frontRight[0]), transformY(frontRight[1])],
        12,
        "down"
      );
      const heightLabelPos = getEdgeLabelPositionSvg(
        [transformX(baseCenter[0]), transformY(baseCenter[1])],
        [transformX(apex[0]), transformY(apex[1])],
        12,
        "right"
      );
      const slantFoot: Vec2 = [(frontLeft[0] + frontRight[0]) / 2, (frontLeft[1] + frontRight[1]) / 2];
      const slantLabelPos = getEdgeLabelPositionSvg(
        [transformX(apex[0]), transformY(apex[1])],
        [transformX(slantFoot[0]), transformY(slantFoot[1])],
        12,
        "right"
      );
      const labelHeight = getLabel(primitive, "label_height");
      const labelSide = getLabel(primitive, "label_side");
      const labelSlant = getLabel(primitive, "label_slant");

      const edges: Array<{ id: string; from: Vec2; to: Vec2; style: StrokeStyle }> = [
        { id: "apex-frontLeft", from: apex, to: frontLeft, style: "solid" },
        { id: "apex-frontRight", from: apex, to: frontRight, style: "solid" },
        { id: "apex-backRight", from: apex, to: backRight, style: "solid" },
        { id: "frontLeft-frontRight", from: frontLeft, to: frontRight, style: "solid" },
        { id: "frontRight-backRight", from: frontRight, to: backRight, style: "solid" },
        { id: "apex-backLeft", from: apex, to: backLeft, style: "dashed" },
        { id: "backLeft-frontLeft", from: backLeft, to: frontLeft, style: "dashed" },
        { id: "backLeft-backRight", from: backLeft, to: backRight, style: "dashed" },
      ];

      const solidEdges = edges.filter((edge) => edge.style === "solid");
      const dashedEdges = edges.filter((edge) => edge.style === "dashed");

      return (
        <g key={key}>
          <g data-layer="fill">
            <polygon
              points={`${transformX(frontLeft[0])},${transformY(frontLeft[1])} ${transformX(
                frontRight[0]
              )},${transformY(frontRight[1])} ${transformX(backRight[0])},${transformY(
                backRight[1]
              )} ${transformX(backLeft[0])},${transformY(backLeft[1])}`}
              fill="rgba(59, 130, 246, 0.04)"
              stroke="none"
            />
          </g>
          <g data-layer="solid-lines">
            {solidEdges.map((edge) => (
              <line
                key={`${key}-${edge.id}`}
                x1={transformX(edge.from[0])}
                y1={transformY(edge.from[1])}
                x2={transformX(edge.to[0])}
                y2={transformY(edge.to[1])}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                {...getEdgeProps(`primitive-${index}-quad-pyramid-${edge.id}`, edge.style)}
              />
            ))}
          </g>
          <g data-layer="dashed-lines-and-labels">
            {dashedEdges.map((edge) => (
              <line
                key={`${key}-${edge.id}`}
                x1={transformX(edge.from[0])}
                y1={transformY(edge.from[1])}
                x2={transformX(edge.to[0])}
                y2={transformY(edge.to[1])}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                {...getEdgeProps(`primitive-${index}-quad-pyramid-${edge.id}`, edge.style)}
              />
            ))}
            {labelHeight && (
              <>
                <line
                  x1={transformX(baseCenter[0])}
                  y1={transformY(baseCenter[1])}
                  x2={transformX(apex[0])}
                  y2={transformY(apex[1])}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  strokeDasharray={getStrokeDasharray("dashed")}
                />
                {renderLabelText({
                  labelKey: `primitive-${index}-quad-pyramid-height`,
                  x: heightLabelPos[0],
                  y: heightLabelPos[1],
                  text: labelHeight,
                  fill: strokeColor,
                })}
              </>
            )}
            {labelSlant && (
              <>
                <line
                  x1={transformX(apex[0])}
                  y1={transformY(apex[1])}
                  x2={transformX(slantFoot[0])}
                  y2={transformY(slantFoot[1])}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  strokeDasharray={getStrokeDasharray("dashed")}
                />
                {renderLabelText({
                  labelKey: `primitive-${index}-quad-pyramid-slant`,
                  x: slantLabelPos[0],
                  y: slantLabelPos[1],
                  text: labelSlant,
                  fill: strokeColor,
                })}
              </>
            )}
            {labelSide &&
              renderLabelText({
                labelKey: `primitive-${index}-quad-pyramid-side`,
                x: sideLabelPos[0],
                y: sideLabelPos[1],
                text: labelSide,
                fill: strokeColor,
              })}
          </g>
        </g>
      );
    }

    case "triangular_pyramid_3d": {
      const [cX, cY] = primitive.center_base_coords;
      if (
        !isFiniteNumber(primitive.base_side) ||
        !isFiniteNumber(primitive.height) ||
        primitive.base_side <= 0
      ) {
        return null;
      }

      const front: Vec2 = [cX, cY - primitive.base_side / 3];
      const backLeft: Vec2 = [cX - primitive.base_side / 2, cY + primitive.base_side / 6];
      const backRight: Vec2 = [cX + primitive.base_side / 2, cY + primitive.base_side / 6];
      const apex: Vec2 = [cX, cY + primitive.height];
      const baseCenter: Vec2 = [cX, cY];
      const sideLabelPos = getEdgeLabelPositionSvg(
        [transformX(front[0]), transformY(front[1])],
        [transformX(backRight[0]), transformY(backRight[1])],
        12,
        "down"
      );
      const heightLabelPos = getEdgeLabelPositionSvg(
        [transformX(baseCenter[0]), transformY(baseCenter[1])],
        [transformX(apex[0]), transformY(apex[1])],
        12,
        "right"
      );
      const slantFoot: Vec2 = [(front[0] + backRight[0]) / 2, (front[1] + backRight[1]) / 2];
      const slantLabelPos = getEdgeLabelPositionSvg(
        [transformX(apex[0]), transformY(apex[1])],
        [transformX(slantFoot[0]), transformY(slantFoot[1])],
        12,
        "right"
      );
      const labelHeight = getLabel(primitive, "label_height");
      const labelSide = getLabel(primitive, "label_side");
      const labelSlant = getLabel(primitive, "label_slant");

      const edges: Array<{ id: string; from: Vec2; to: Vec2; style: StrokeStyle }> = [
        { id: "apex-front", from: apex, to: front, style: "solid" },
        { id: "apex-backRight", from: apex, to: backRight, style: "solid" },
        { id: "front-backRight", from: front, to: backRight, style: "solid" },
        { id: "apex-backLeft", from: apex, to: backLeft, style: "dashed" },
        { id: "backLeft-front", from: backLeft, to: front, style: "dashed" },
        { id: "backLeft-backRight", from: backLeft, to: backRight, style: "dashed" },
      ];

      const solidEdges = edges.filter((edge) => edge.style === "solid");
      const dashedEdges = edges.filter((edge) => edge.style === "dashed");

      return (
        <g key={key}>
          <g data-layer="fill">
            <polygon
              points={`${transformX(front[0])},${transformY(front[1])} ${transformX(
                backRight[0]
              )},${transformY(backRight[1])} ${transformX(backLeft[0])},${transformY(backLeft[1])}`}
              fill="rgba(59, 130, 246, 0.04)"
              stroke="none"
            />
          </g>
          <g data-layer="solid-lines">
            {solidEdges.map((edge) => (
              <line
                key={`${key}-${edge.id}`}
                x1={transformX(edge.from[0])}
                y1={transformY(edge.from[1])}
                x2={transformX(edge.to[0])}
                y2={transformY(edge.to[1])}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                {...getEdgeProps(`primitive-${index}-tri-pyramid-${edge.id}`, edge.style)}
              />
            ))}
          </g>
          <g data-layer="dashed-lines-and-labels">
            {dashedEdges.map((edge) => (
              <line
                key={`${key}-${edge.id}`}
                x1={transformX(edge.from[0])}
                y1={transformY(edge.from[1])}
                x2={transformX(edge.to[0])}
                y2={transformY(edge.to[1])}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                {...getEdgeProps(`primitive-${index}-tri-pyramid-${edge.id}`, edge.style)}
              />
            ))}
            {labelHeight && (
              <>
                <line
                  x1={transformX(baseCenter[0])}
                  y1={transformY(baseCenter[1])}
                  x2={transformX(apex[0])}
                  y2={transformY(apex[1])}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  strokeDasharray={getStrokeDasharray("dashed")}
                />
                {renderLabelText({
                  labelKey: `primitive-${index}-tri-pyramid-height`,
                  x: heightLabelPos[0],
                  y: heightLabelPos[1],
                  text: labelHeight,
                  fill: strokeColor,
                })}
              </>
            )}
            {labelSlant && (
              <>
                <line
                  x1={transformX(apex[0])}
                  y1={transformY(apex[1])}
                  x2={transformX(slantFoot[0])}
                  y2={transformY(slantFoot[1])}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  strokeDasharray={getStrokeDasharray("dashed")}
                />
                {renderLabelText({
                  labelKey: `primitive-${index}-tri-pyramid-slant`,
                  x: slantLabelPos[0],
                  y: slantLabelPos[1],
                  text: labelSlant,
                  fill: strokeColor,
                })}
              </>
            )}
            {labelSide &&
              renderLabelText({
                labelKey: `primitive-${index}-tri-pyramid-side`,
                x: sideLabelPos[0],
                y: sideLabelPos[1],
                text: labelSide,
                fill: strokeColor,
              })}
          </g>
        </g>
      );
    }

    default:
      return undefined;
  }
}
