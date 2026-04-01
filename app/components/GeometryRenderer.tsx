"use client";

import React, { useCallback, useMemo } from "react";

type Vec2 = [number, number];
type StrokeStyle = "solid" | "dashed";

type LabelPosition =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right";

interface BasePrimitive {
  type:
    | "point"
    | "segment"
    | "line"
    | "ray"
    | "circle"
    | "ellipse"
    | "arc"
    | "angle"
    | "polygon"
    | "label"
    | "grid"
    | "axis"
    | "function"
    | "sphere_3d"
    | "cylinder_3d"
    | "cone_3d"
    | "box_3d"
    | "rectangular_prism_3d"
    | "triangular_prism_3d"
    | "quadrilateral_prism_3d"
    | "triangular_pyramid_3d"
    | "quadrilateral_pyramid_3d";
  color?: string;
  stroke_width?: number;
  style?: StrokeStyle;
}

export interface PointPrimitive extends BasePrimitive {
  type: "point";
  id: string;
  coords: Vec2;
  label?: string;
  pos?: LabelPosition;
}

export interface SegmentPrimitive extends BasePrimitive {
  type: "segment";
  points: [string, string];
}

export interface LinePrimitive extends BasePrimitive {
  type: "line";
  points: [string, string];
}

export interface RayPrimitive extends BasePrimitive {
  type: "ray";
  from: string;
  towards: string;
}

export interface CirclePrimitive extends BasePrimitive {
  type: "circle";
  center_id?: string;
  center?: Vec2;
  radius: number;
}

export interface EllipsePrimitive extends BasePrimitive {
  type: "ellipse";
  center_id: string;
  rx: number;
  ry: number;
}

export interface ArcPrimitive extends BasePrimitive {
  type: "arc";
  center_id: string;
  start_id: string;
  end_id: string;
}

export interface AnglePrimitive extends BasePrimitive {
  type: "angle";
  vertex: string;
  p1: string;
  p2: string;
  mark?: "arc" | "right";
  label?: string;
}

export interface PolygonPrimitive extends BasePrimitive {
  type: "polygon";
  points: string[];
  fill?: string;
}

export interface LabelPrimitive extends BasePrimitive {
  type: "label";
  coords: Vec2;
  content: string;
}

export interface GridPrimitive extends BasePrimitive {
  type: "grid";
  step?: number;
}

export interface AxisPrimitive extends BasePrimitive {
  type: "axis";
  x_range: Vec2;
  y_range: Vec2;
  show_numbers?: boolean;
}

export interface FunctionPrimitive extends BasePrimitive {
  type: "function";
  formula: string;
  color?: string;
}

export interface Sphere3DPrimitive extends BasePrimitive {
  type: "sphere_3d";
  center_coords: Vec2;
  radius: number;
}

export interface Cylinder3DPrimitive extends BasePrimitive {
  type: "cylinder_3d";
  center_bottom_coords: Vec2;
  radius: number;
  height: number;
}

export interface Cone3DPrimitive extends BasePrimitive {
  type: "cone_3d";
  center_bottom_coords: Vec2;
  radius: number;
  height: number;
}

export interface Box3DPrimitive extends BasePrimitive {
  type: "box_3d";
  origin_coords: Vec2;
  width: number;
  height: number;
  depth: number;
}

export interface RectangularPrism3DPrimitive extends BasePrimitive {
  type: "rectangular_prism_3d";
  origin_coords: Vec2;
  width: number;
  height: number;
  depth: number;
}

export interface TriangularPrism3DPrimitive extends BasePrimitive {
  type: "triangular_prism_3d";
  base_vertices: Vec2[];
  height: number;
}

export interface QuadrilateralPrism3DPrimitive extends BasePrimitive {
  type: "quadrilateral_prism_3d";
  base_vertices: Vec2[];
  height: number;
}

export interface TriangularPyramid3DPrimitive extends BasePrimitive {
  type: "triangular_pyramid_3d";
  center_base_coords: Vec2;
  base_side: number;
  height: number;
}

export interface QuadrilateralPyramid3DPrimitive extends BasePrimitive {
  type: "quadrilateral_pyramid_3d";
  center_base_coords: Vec2;
  base_side: number;
  height: number;
}

export type DiagramPrimitive =
  | PointPrimitive
  | SegmentPrimitive
  | LinePrimitive
  | RayPrimitive
  | CirclePrimitive
  | EllipsePrimitive
  | ArcPrimitive
  | AnglePrimitive
  | PolygonPrimitive
  | LabelPrimitive
  | GridPrimitive
  | AxisPrimitive
  | FunctionPrimitive
  | Sphere3DPrimitive
  | Cylinder3DPrimitive
  | Cone3DPrimitive
  | Box3DPrimitive
  | RectangularPrism3DPrimitive
  | TriangularPrism3DPrimitive
  | QuadrilateralPrism3DPrimitive
  | TriangularPyramid3DPrimitive
  | QuadrilateralPyramid3DPrimitive;

export interface DiagramData {
  canvas: {
    viewBox: [number, number, number, number];
    unit: number;
  };
  primitives: DiagramPrimitive[];
}

interface GeometryRendererProps {
  data: DiagramData;
}

const EPSILON = 1e-9;

interface SvgBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

type TextAnchor = "start" | "middle" | "end";

function createSvgBounds(aX: number, aY: number, bX: number, bY: number): SvgBounds {
  return {
    minX: Math.min(aX, bX),
    minY: Math.min(aY, bY),
    maxX: Math.max(aX, bX),
    maxY: Math.max(aY, bY),
  };
}

function includeSvgPoint(bounds: SvgBounds, x: number, y: number, padding = 0): void {
  bounds.minX = Math.min(bounds.minX, x - padding);
  bounds.maxX = Math.max(bounds.maxX, x + padding);
  bounds.minY = Math.min(bounds.minY, y - padding);
  bounds.maxY = Math.max(bounds.maxY, y + padding);
}

function includeSvgRect(
  bounds: SvgBounds,
  aX: number,
  aY: number,
  bX: number,
  bY: number,
  padding = 0
): void {
  bounds.minX = Math.min(bounds.minX, aX, bX) - padding;
  bounds.maxX = Math.max(bounds.maxX, aX, bX) + padding;
  bounds.minY = Math.min(bounds.minY, aY, bY) - padding;
  bounds.maxY = Math.max(bounds.maxY, aY, bY) + padding;
}

function estimateTextWidth(text: string, fontSize: number): number {
  const safeLength = Math.max(text.trim().length, 1);
  return Math.max(safeLength * fontSize * 0.62, fontSize);
}

function includeSvgText(
  bounds: SvgBounds,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  anchor: TextAnchor
): void {
  const width = estimateTextWidth(text, fontSize);
  const ascent = fontSize * 0.82;
  const descent = fontSize * 0.38;

  let left = x;
  if (anchor === "middle") {
    left = x - width / 2;
  } else if (anchor === "end") {
    left = x - width;
  }

  const right = left + width;
  const top = y - ascent;
  const bottom = y + descent;

  includeSvgRect(bounds, left, top, right, bottom, 2);
}

const getStrokeDasharray = (style?: string): string =>
  style === "dashed" ? "5,5" : "none";

function splitEllipseHalfPaths(cx: number, cy: number, rx: number, ry: number): {
  topPath: string;
  bottomPath: string;
} {
  const leftX = cx - rx;
  const rightX = cx + rx;

  return {
    // In our coordinate setup, sweep=1 gives the upper arc, sweep=0 gives the lower arc.
    topPath: `M ${leftX} ${cy} A ${rx} ${ry} 0 0 1 ${rightX} ${cy}`,
    bottomPath: `M ${leftX} ${cy} A ${rx} ${ry} 0 0 0 ${rightX} ${cy}`,
  };
}

function getObliqueDepthVector(depth: number): Vec2 {
  const projectedDepth = depth * 0.5;
  const component = projectedDepth * Math.SQRT1_2;
  return [component, component];
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value);
}

function dedupePoints(points: Vec2[]): Vec2[] {
  const result: Vec2[] = [];

  points.forEach((point) => {
    const found = result.some(
      (existing) =>
        Math.abs(existing[0] - point[0]) < EPSILON &&
        Math.abs(existing[1] - point[1]) < EPSILON
    );

    if (!found) {
      result.push(point);
    }
  });

  return result;
}

function normalize([x, y]: Vec2): Vec2 | null {
  const length = Math.hypot(x, y);
  if (length < EPSILON) {
    return null;
  }
  return [x / length, y / length];
}

function within(value: number, min: number, max: number): boolean {
  return value >= min - EPSILON && value <= max + EPSILON;
}

function findLineEndpointsInRect(
  a: Vec2,
  b: Vec2,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): [Vec2, Vec2] | null {
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;

  if (Math.abs(dx) < EPSILON && Math.abs(dy) < EPSILON) {
    return null;
  }

  const intersections: Vec2[] = [];

  if (Math.abs(dx) > EPSILON) {
    const tLeft = (minX - ax) / dx;
    const yLeft = ay + tLeft * dy;
    if (within(yLeft, minY, maxY)) {
      intersections.push([minX, yLeft]);
    }

    const tRight = (maxX - ax) / dx;
    const yRight = ay + tRight * dy;
    if (within(yRight, minY, maxY)) {
      intersections.push([maxX, yRight]);
    }
  }

  if (Math.abs(dy) > EPSILON) {
    const tBottom = (minY - ay) / dy;
    const xBottom = ax + tBottom * dx;
    if (within(xBottom, minX, maxX)) {
      intersections.push([xBottom, minY]);
    }

    const tTop = (maxY - ay) / dy;
    const xTop = ax + tTop * dx;
    if (within(xTop, minX, maxX)) {
      intersections.push([xTop, maxY]);
    }
  }

  const unique = dedupePoints(intersections);
  if (unique.length < 2) {
    return null;
  }

  let bestPair: [Vec2, Vec2] = [unique[0], unique[1]];
  let bestDistance = -1;

  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const distance = Math.hypot(
        unique[i][0] - unique[j][0],
        unique[i][1] - unique[j][1]
      );
      if (distance > bestDistance) {
        bestDistance = distance;
        bestPair = [unique[i], unique[j]];
      }
    }
  }

  return bestPair;
}

function findRayEndpointInRect(
  from: Vec2,
  towards: Vec2,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): Vec2 | null {
  const dx = towards[0] - from[0];
  const dy = towards[1] - from[1];

  if (Math.abs(dx) < EPSILON && Math.abs(dy) < EPSILON) {
    return null;
  }

  const candidates: Array<{ t: number; point: Vec2 }> = [];

  if (Math.abs(dx) > EPSILON) {
    const tLeft = (minX - from[0]) / dx;
    const yLeft = from[1] + tLeft * dy;
    if (tLeft >= 0 && within(yLeft, minY, maxY)) {
      candidates.push({ t: tLeft, point: [minX, yLeft] });
    }

    const tRight = (maxX - from[0]) / dx;
    const yRight = from[1] + tRight * dy;
    if (tRight >= 0 && within(yRight, minY, maxY)) {
      candidates.push({ t: tRight, point: [maxX, yRight] });
    }
  }

  if (Math.abs(dy) > EPSILON) {
    const tBottom = (minY - from[1]) / dy;
    const xBottom = from[0] + tBottom * dx;
    if (tBottom >= 0 && within(xBottom, minX, maxX)) {
      candidates.push({ t: tBottom, point: [xBottom, minY] });
    }

    const tTop = (maxY - from[1]) / dy;
    const xTop = from[0] + tTop * dx;
    if (tTop >= 0 && within(xTop, minX, maxX)) {
      candidates.push({ t: tTop, point: [xTop, maxY] });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.t - a.t);
  return candidates[0].point;
}

function tokenizeExpression(formula: string): string[] | null {
  const source = formula.replace(/\s+/g, "");
  if (!source) {
    return null;
  }

  const tokens: string[] = [];
  let i = 0;

  while (i < source.length) {
    const char = source[i];

    if (/[0-9.]/.test(char)) {
      let numberValue = char;
      i += 1;

      while (i < source.length && /[0-9.]/.test(source[i])) {
        numberValue += source[i];
        i += 1;
      }

      if (!/^\d*\.?\d+$/.test(numberValue)) {
        return null;
      }

      tokens.push(numberValue);
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      let identifier = char;
      i += 1;

      while (i < source.length && /[a-zA-Z]/.test(source[i])) {
        identifier += source[i];
        i += 1;
      }

      if (identifier.toLowerCase() !== "x") {
        return null;
      }

      tokens.push("x");
      continue;
    }

    if ("()+-*/^".includes(char)) {
      tokens.push(char);
      i += 1;
      continue;
    }

    return null;
  }

  const isNumber = (token: string): boolean => /^\d*\.?\d+$/.test(token);
  const endsValue = (token: string): boolean =>
    isNumber(token) || token === "x" || token === ")";
  const startsValue = (token: string): boolean =>
    isNumber(token) || token === "x" || token === "(";

  const expanded: string[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const current = tokens[index];
    const previous = expanded[expanded.length - 1];

    if (previous && endsValue(previous) && startsValue(current)) {
      expanded.push("*");
    }

    expanded.push(current);
  }

  return expanded;
}

function toRpn(tokens: string[]): string[] | null {
  const output: string[] = [];
  const operators: string[] = [];

  const precedence: Record<string, number> = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
    "^": 3,
    "u-": 4,
  };

  const rightAssociative = new Set(["^", "u-"]);
  const isOperator = (token: string): boolean => token in precedence;

  let prevToken: string | null = null;

  for (const token of tokens) {
    if (/^\d*\.?\d+$/.test(token) || token === "x") {
      output.push(token);
      prevToken = token;
      continue;
    }

    if (token === "(") {
      operators.push(token);
      prevToken = token;
      continue;
    }

    if (token === ")") {
      while (operators.length > 0 && operators[operators.length - 1] !== "(") {
        output.push(operators.pop() as string);
      }

      if (operators.length === 0) {
        return null;
      }

      operators.pop();
      prevToken = token;
      continue;
    }

    if (["+", "-", "*", "/", "^"].includes(token)) {
      let current = token;
      const isUnaryMinus =
        token === "-" &&
        (prevToken === null ||
          prevToken === "(" ||
          ["+", "-", "*", "/", "^", "u-"].includes(prevToken));

      if (isUnaryMinus) {
        current = "u-";
      }

      while (operators.length > 0) {
        const top = operators[operators.length - 1];
        if (!isOperator(top)) {
          break;
        }

        const shouldPop = rightAssociative.has(current)
          ? precedence[current] < precedence[top]
          : precedence[current] <= precedence[top];

        if (!shouldPop) {
          break;
        }

        output.push(operators.pop() as string);
      }

      operators.push(current);
      prevToken = current;
      continue;
    }

    return null;
  }

  while (operators.length > 0) {
    const top = operators.pop() as string;
    if (top === "(" || top === ")") {
      return null;
    }
    output.push(top);
  }

  return output;
}

function evaluateRpn(rpn: string[], xValue: number): number | null {
  const stack: number[] = [];

  for (const token of rpn) {
    if (/^\d*\.?\d+$/.test(token)) {
      stack.push(Number(token));
      continue;
    }

    if (token === "x") {
      stack.push(xValue);
      continue;
    }

    if (token === "u-") {
      const value = stack.pop();
      if (value === undefined) {
        return null;
      }
      stack.push(-value);
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();

    if (left === undefined || right === undefined) {
      return null;
    }

    let result: number;
    switch (token) {
      case "+":
        result = left + right;
        break;
      case "-":
        result = left - right;
        break;
      case "*":
        result = left * right;
        break;
      case "/":
        result = left / right;
        break;
      case "^":
        result = left ** right;
        break;
      default:
        return null;
    }

    if (!isFiniteNumber(result)) {
      return null;
    }

    stack.push(result);
  }

  if (stack.length !== 1 || !isFiniteNumber(stack[0])) {
    return null;
  }

  return stack[0];
}

function compileFormula(formula: string): ((x: number) => number | null) | null {
  const tokens = tokenizeExpression(formula);
  if (!tokens) {
    return null;
  }

  const rpn = toRpn(tokens);
  if (!rpn) {
    return null;
  }

  return (x: number) => evaluateRpn(rpn, x);
}

function getPointLabelOffset(position?: LabelPosition): Vec2 {
  switch (position) {
    case "top":
      return [0, -10];
    case "bottom":
      return [0, 14];
    case "left":
      return [-12, 4];
    case "right":
      return [10, 4];
    case "top_left":
      return [-12, -8];
    case "bottom_left":
      return [-12, 14];
    case "bottom_right":
      return [10, 14];
    case "top_right":
    default:
      return [10, -8];
  }
}

export default function GeometryRenderer({ data }: GeometryRendererProps) {
  const [minX, minY, width, height] = data.canvas.viewBox;
  const unit = data.canvas.unit;
  const maxX = minX + width;
  const maxY = minY + height;

  const transformX = useCallback((x: number): number => x * unit, [unit]);
  const transformY = useCallback((y: number): number => -y * unit, [unit]);

  const pointMap = useMemo(() => {
    const map = new Map<string, Vec2>();
    data.primitives.forEach((primitive) => {
      if (primitive.type === "point") {
        map.set(primitive.id, primitive.coords);
      }
    });
    return map;
  }, [data.primitives]);

  const getPointRawCoords = (id: string): Vec2 | null => {
    const point = pointMap.get(id);
    return point ?? null;
  };

  const getPointCoords = (id: string): Vec2 | null => {
    const raw = getPointRawCoords(id);
    if (!raw) {
      return null;
    }
    return [transformX(raw[0]), transformY(raw[1])];
  };

  const axisPrimitive = data.primitives.find(
    (primitive): primitive is AxisPrimitive => primitive.type === "axis"
  );

  const functionXRange = useMemo<Vec2>(
    () => axisPrimitive?.x_range ?? [minX, maxX],
    [axisPrimitive, minX, maxX]
  );

  const contentBounds = useMemo(() => {
    const bounds = createSvgBounds(
      transformX(minX),
      transformY(maxY),
      transformX(maxX),
      transformY(minY)
    );

    const getPointRawCoords = (id: string): Vec2 | null => {
      const point = pointMap.get(id);
      return point ?? null;
    };

    for (const primitive of data.primitives) {
      const strokeWidth = primitive.stroke_width ?? 2;
      const linePadding = strokeWidth / 2 + 2;

      switch (primitive.type) {
        case "point": {
          const [xRaw, yRaw] = primitive.coords;
          const x = transformX(xRaw);
          const y = transformY(yRaw);

          includeSvgPoint(bounds, x, y, 6);

          const pointLabel = primitive.label ?? primitive.id;
          if (pointLabel) {
            const [offsetX, offsetY] = getPointLabelOffset(primitive.pos);
            includeSvgText(bounds, x + offsetX, y + offsetY, pointLabel, 12, "start");
          }
          break;
        }

        case "segment": {
          const [pA, pB] = primitive.points;
          const a = getPointRawCoords(pA);
          const b = getPointRawCoords(pB);

          if (!a || !b) {
            break;
          }

          includeSvgRect(
            bounds,
            transformX(a[0]),
            transformY(a[1]),
            transformX(b[0]),
            transformY(b[1]),
            linePadding
          );
          break;
        }

        case "line": {
          const [pA, pB] = primitive.points;
          const rawA = getPointRawCoords(pA);
          const rawB = getPointRawCoords(pB);

          if (!rawA || !rawB) {
            break;
          }

          const endpoints = findLineEndpointsInRect(rawA, rawB, minX, maxX, minY, maxY);
          if (!endpoints) {
            break;
          }

          const [start, end] = endpoints;
          includeSvgRect(
            bounds,
            transformX(start[0]),
            transformY(start[1]),
            transformX(end[0]),
            transformY(end[1]),
            linePadding
          );
          break;
        }

        case "ray": {
          const rawFrom = getPointRawCoords(primitive.from);
          const rawTowards = getPointRawCoords(primitive.towards);

          if (!rawFrom || !rawTowards) {
            break;
          }

          const endpoint = findRayEndpointInRect(rawFrom, rawTowards, minX, maxX, minY, maxY);
          if (!endpoint) {
            break;
          }

          includeSvgRect(
            bounds,
            transformX(rawFrom[0]),
            transformY(rawFrom[1]),
            transformX(endpoint[0]),
            transformY(endpoint[1]),
            linePadding + 8
          );
          break;
        }

        case "circle": {
          const centerRaw = primitive.center_id
            ? getPointRawCoords(primitive.center_id)
            : primitive.center ?? null;

          if (!centerRaw || !isFiniteNumber(primitive.radius) || primitive.radius <= 0) {
            break;
          }

          const cx = transformX(centerRaw[0]);
          const cy = transformY(centerRaw[1]);
          const radiusPx = primitive.radius * unit;

          includeSvgRect(
            bounds,
            cx - radiusPx,
            cy - radiusPx,
            cx + radiusPx,
            cy + radiusPx,
            linePadding
          );
          break;
        }

        case "ellipse": {
          const centerRaw = getPointRawCoords(primitive.center_id);
          if (
            !centerRaw ||
            !isFiniteNumber(primitive.rx) ||
            !isFiniteNumber(primitive.ry) ||
            primitive.rx <= 0 ||
            primitive.ry <= 0
          ) {
            break;
          }

          const cx = transformX(centerRaw[0]);
          const cy = transformY(centerRaw[1]);
          const rxPx = primitive.rx * unit;
          const ryPx = primitive.ry * unit;

          includeSvgRect(
            bounds,
            cx - rxPx,
            cy - ryPx,
            cx + rxPx,
            cy + ryPx,
            linePadding
          );
          break;
        }

        case "arc": {
          const center = getPointRawCoords(primitive.center_id);
          const start = getPointRawCoords(primitive.start_id);

          if (!center || !start) {
            break;
          }

          const radius = Math.hypot(start[0] - center[0], start[1] - center[1]);
          if (radius < EPSILON) {
            break;
          }

          const cx = transformX(center[0]);
          const cy = transformY(center[1]);
          const radiusPx = radius * unit;

          // Conservative bound using full circle to avoid clipping even with wide arcs.
          includeSvgRect(
            bounds,
            cx - radiusPx,
            cy - radiusPx,
            cx + radiusPx,
            cy + radiusPx,
            linePadding
          );
          break;
        }

        case "angle": {
          const vertex = getPointRawCoords(primitive.vertex);
          const p1 = getPointRawCoords(primitive.p1);
          const p2 = getPointRawCoords(primitive.p2);

          if (!vertex || !p1 || !p2) {
            break;
          }

          const v1 = normalize([p1[0] - vertex[0], p1[1] - vertex[1]]);
          const v2 = normalize([p2[0] - vertex[0], p2[1] - vertex[1]]);
          if (!v1 || !v2) {
            break;
          }

          const markRadius = 0.45;
          const markerRadiusPx = markRadius * unit;
          const vx = transformX(vertex[0]);
          const vy = transformY(vertex[1]);

          includeSvgRect(
            bounds,
            vx - markerRadiusPx,
            vy - markerRadiusPx,
            vx + markerRadiusPx,
            vy + markerRadiusPx,
            4
          );

          if (primitive.mark === "right") {
            const q1: Vec2 = [vertex[0] + v1[0] * markRadius, vertex[1] + v1[1] * markRadius];
            const q2: Vec2 = [vertex[0] + v2[0] * markRadius, vertex[1] + v2[1] * markRadius];
            const q3: Vec2 = [q1[0] + v2[0] * markRadius, q1[1] + v2[1] * markRadius];

            includeSvgRect(
              bounds,
              transformX(q1[0]),
              transformY(q1[1]),
              transformX(q2[0]),
              transformY(q2[1]),
              4
            );
            includeSvgPoint(bounds, transformX(q3[0]), transformY(q3[1]), 4);
          }

          if (primitive.label) {
            const bisector = normalize([v1[0] + v2[0], v1[1] + v2[1]]);
            if (bisector) {
              const labelPos: Vec2 = [
                vertex[0] + bisector[0] * markRadius * 1.6,
                vertex[1] + bisector[1] * markRadius * 1.6,
              ];

              includeSvgText(
                bounds,
                transformX(labelPos[0]),
                transformY(labelPos[1]),
                primitive.label,
                12,
                "middle"
              );
            }
          }
          break;
        }

        case "polygon": {
          const rawPoints = primitive.points
            .map((id) => getPointRawCoords(id))
            .filter((point): point is Vec2 => point !== null);

          if (rawPoints.length < 3) {
            break;
          }

          rawPoints.forEach(([xRaw, yRaw]) => {
            includeSvgPoint(bounds, transformX(xRaw), transformY(yRaw), linePadding);
          });
          break;
        }

        case "label": {
          includeSvgText(
            bounds,
            transformX(primitive.coords[0]),
            transformY(primitive.coords[1]),
            primitive.content,
            12,
            "middle"
          );
          break;
        }

        case "grid": {
          includeSvgRect(
            bounds,
            transformX(minX),
            transformY(minY),
            transformX(maxX),
            transformY(maxY)
          );
          break;
        }

        case "axis": {
          const [xStart, xEnd] = primitive.x_range;
          const [yStart, yEnd] = primitive.y_range;

          includeSvgRect(
            bounds,
            transformX(xStart),
            transformY(0),
            transformX(xEnd),
            transformY(0),
            linePadding + 8
          );

          includeSvgRect(
            bounds,
            transformX(0),
            transformY(yStart),
            transformX(0),
            transformY(yEnd),
            linePadding + 8
          );

          if (primitive.show_numbers) {
            if (within(0, yStart, yEnd)) {
              for (let x = Math.ceil(xStart); x <= Math.floor(xEnd); x++) {
                if (x === 0) {
                  continue;
                }

                includeSvgText(bounds, transformX(x), transformY(0) + 14, `${x}`, 10, "middle");
              }
            }

            if (within(0, xStart, xEnd)) {
              for (let y = Math.ceil(yStart); y <= Math.floor(yEnd); y++) {
                if (y === 0) {
                  continue;
                }

                includeSvgText(bounds, transformX(0) - 8, transformY(y) + 4, `${y}`, 10, "end");
              }
            }
          }
          break;
        }

        case "function": {
          const evaluate = compileFormula(primitive.formula);
          if (!evaluate) {
            break;
          }

          const [xStart, xEnd] = functionXRange;
          const sampleCount = 300;
          const yMinBound = minY - height * 2;
          const yMaxBound = maxY + height * 2;

          for (let i = 0; i <= sampleCount; i++) {
            const ratio = i / sampleCount;
            const x = xStart + (xEnd - xStart) * ratio;
            const y = evaluate(x);

            if (
              y === null ||
              !isFiniteNumber(y) ||
              Math.abs(y) > 1e6 ||
              y < yMinBound ||
              y > yMaxBound
            ) {
              continue;
            }

            includeSvgPoint(bounds, transformX(x), transformY(y), 2);
          }
          break;
        }

        case "sphere_3d": {
          const [cX, cY] = primitive.center_coords;
          if (!isFiniteNumber(primitive.radius) || primitive.radius <= 0) {
            break;
          }

          const cx = transformX(cX);
          const cy = transformY(cY);
          const rxPx = primitive.radius * unit;
          const ryPx = primitive.radius * 0.25 * unit;

          includeSvgRect(
            bounds,
            cx - rxPx,
            cy - rxPx,
            cx + rxPx,
            cy + rxPx,
            linePadding
          );
          includeSvgRect(
            bounds,
            cx - rxPx,
            cy - ryPx,
            cx + rxPx,
            cy + ryPx,
            linePadding
          );
          break;
        }

        case "cylinder_3d": {
          const [bX, bY] = primitive.center_bottom_coords;
          if (
            !isFiniteNumber(primitive.radius) ||
            !isFiniteNumber(primitive.height) ||
            primitive.radius <= 0
          ) {
            break;
          }

          const tY = bY + primitive.height;
          const bottomCx = transformX(bX);
          const bottomCy = transformY(bY);
          const topCx = transformX(bX);
          const topCy = transformY(tY);
          const rxPx = primitive.radius * unit;
          const ryPx = primitive.radius * 0.25 * unit;

          includeSvgRect(
            bounds,
            bottomCx - rxPx,
            bottomCy - ryPx,
            bottomCx + rxPx,
            bottomCy + ryPx,
            linePadding
          );
          includeSvgRect(
            bounds,
            topCx - rxPx,
            topCy - ryPx,
            topCx + rxPx,
            topCy + ryPx,
            linePadding
          );
          includeSvgRect(
            bounds,
            transformX(bX - primitive.radius),
            transformY(bY),
            transformX(bX - primitive.radius),
            transformY(tY),
            linePadding
          );
          includeSvgRect(
            bounds,
            transformX(bX + primitive.radius),
            transformY(bY),
            transformX(bX + primitive.radius),
            transformY(tY),
            linePadding
          );
          break;
        }

        case "cone_3d": {
          const [bX, bY] = primitive.center_bottom_coords;
          if (
            !isFiniteNumber(primitive.radius) ||
            !isFiniteNumber(primitive.height) ||
            primitive.radius <= 0
          ) {
            break;
          }

          const apex: Vec2 = [bX, bY + primitive.height];
          const left: Vec2 = [bX - primitive.radius, bY];
          const right: Vec2 = [bX + primitive.radius, bY];

          const bottomCx = transformX(bX);
          const bottomCy = transformY(bY);
          const rxPx = primitive.radius * unit;
          const ryPx = primitive.radius * 0.25 * unit;

          includeSvgRect(
            bounds,
            bottomCx - rxPx,
            bottomCy - ryPx,
            bottomCx + rxPx,
            bottomCy + ryPx,
            linePadding
          );
          includeSvgRect(
            bounds,
            transformX(apex[0]),
            transformY(apex[1]),
            transformX(left[0]),
            transformY(left[1]),
            linePadding
          );
          includeSvgRect(
            bounds,
            transformX(apex[0]),
            transformY(apex[1]),
            transformX(right[0]),
            transformY(right[1]),
            linePadding
          );
          break;
        }

        case "box_3d": {
          const [oX, oY] = primitive.origin_coords;
          if (
            !isFiniteNumber(primitive.width) ||
            !isFiniteNumber(primitive.height) ||
            !isFiniteNumber(primitive.depth)
          ) {
            break;
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

          [a, b, c, d, e, f, g, h].forEach(([xRaw, yRaw]) => {
            includeSvgPoint(bounds, transformX(xRaw), transformY(yRaw), linePadding);
          });
          break;
        }

        case "rectangular_prism_3d": {
          const [oX, oY] = primitive.origin_coords;
          if (
            !isFiniteNumber(primitive.width) ||
            !isFiniteNumber(primitive.height) ||
            !isFiniteNumber(primitive.depth)
          ) {
            break;
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

          [a, b, c, d, e, f, g, h].forEach(([xRaw, yRaw]) => {
            includeSvgPoint(bounds, transformX(xRaw), transformY(yRaw), linePadding);
          });
          break;
        }

        case "triangular_prism_3d":
        case "quadrilateral_prism_3d": {
          const baseVertices = primitive.base_vertices;
          if (
            !Array.isArray(baseVertices) ||
            baseVertices.length < 3 ||
            !isFiniteNumber(primitive.height)
          ) {
            break;
          }

          const topVertices = baseVertices.map(([xRaw, yRaw]) => [xRaw, yRaw + primitive.height] as Vec2);
          [...baseVertices, ...topVertices].forEach(([xRaw, yRaw]) => {
            includeSvgPoint(bounds, transformX(xRaw), transformY(yRaw), linePadding);
          });
          break;
        }

        case "quadrilateral_pyramid_3d": {
          const [cX, cY] = primitive.center_base_coords;
          if (
            !isFiniteNumber(primitive.base_side) ||
            !isFiniteNumber(primitive.height) ||
            primitive.base_side <= 0
          ) {
            break;
          }

          const half = primitive.base_side / 2;
          const quarter = primitive.base_side / 4;

          const frontLeft: Vec2 = [cX - half, cY - quarter];
          const frontRight: Vec2 = [cX + half, cY - quarter];
          const backRight: Vec2 = [cX + half, cY + quarter];
          const backLeft: Vec2 = [cX - half, cY + quarter];
          const apex: Vec2 = [cX, cY + primitive.height];

          [frontLeft, frontRight, backRight, backLeft, apex].forEach(([xRaw, yRaw]) => {
            includeSvgPoint(bounds, transformX(xRaw), transformY(yRaw), linePadding);
          });
          break;
        }

        case "triangular_pyramid_3d": {
          const [cX, cY] = primitive.center_base_coords;
          if (
            !isFiniteNumber(primitive.base_side) ||
            !isFiniteNumber(primitive.height) ||
            primitive.base_side <= 0
          ) {
            break;
          }

          const front: Vec2 = [cX, cY - primitive.base_side / 3];
          const backLeft: Vec2 = [cX - primitive.base_side / 2, cY + primitive.base_side / 6];
          const backRight: Vec2 = [cX + primitive.base_side / 2, cY + primitive.base_side / 6];
          const apex: Vec2 = [cX, cY + primitive.height];

          [front, backLeft, backRight, apex].forEach(([xRaw, yRaw]) => {
            includeSvgPoint(bounds, transformX(xRaw), transformY(yRaw), linePadding);
          });
          break;
        }

        default:
          break;
      }
    }

    return bounds;
  }, [
    data.primitives,
    functionXRange,
    height,
    maxX,
    maxY,
    minX,
    minY,
    pointMap,
    transformX,
    transformY,
    unit,
  ]);

  const viewBoxPaddingPx = 12;
  const viewBoxX = contentBounds.minX - viewBoxPaddingPx;
  const viewBoxY = contentBounds.minY - viewBoxPaddingPx;
  const viewBoxWidth = Math.max(
    contentBounds.maxX - contentBounds.minX + viewBoxPaddingPx * 2,
    1
  );
  const viewBoxHeight = Math.max(
    contentBounds.maxY - contentBounds.minY + viewBoxPaddingPx * 2,
    1
  );

  const svgViewBox = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`;

  return (
    <div className="w-full max-w-md mx-auto my-4">
      <svg
        viewBox={svgViewBox}
        className="w-full h-auto rounded border border-gray-200 bg-white"
        role="img"
        aria-label="Geometry diagram"
      >
        <defs>
          <marker
            id="geometry-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#374151" />
          </marker>
        </defs>

        {data.primitives.map((primitive, index) => {
          const key = `${primitive.type}-${index}`;
          const strokeColor = primitive.color ?? "#1f2937";
          const strokeWidth = primitive.stroke_width ?? 2;
          const strokeDasharray = getStrokeDasharray(primitive.style);

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

              const endpoints = findLineEndpointsInRect(
                rawA,
                rawB,
                minX,
                maxX,
                minY,
                maxY
              );

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
                />
              );
            }

            case "ray": {
              const rawFrom = getPointRawCoords(primitive.from);
              const rawTowards = getPointRawCoords(primitive.towards);

              if (!rawFrom || !rawTowards) {
                return null;
              }

              const endpoint = findRayEndpointInRect(
                rawFrom,
                rawTowards,
                minX,
                maxX,
                minY,
                maxY
              );

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
                  d={`M ${startSvg[0]} ${startSvg[1]} A ${radius * unit} ${
                    radius * unit
                  } 0 0 ${sweepFlag} ${endSvg[0]} ${endSvg[1]}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
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
                    d={`M ${transformX(q1[0])} ${transformY(q1[1])} L ${transformX(
                      q3[0]
                    )} ${transformY(q3[1])} L ${transformX(q2[0])} ${transformY(q2[1])}`}
                    fill="none"
                    stroke={markColor}
                    strokeWidth={2}
                    strokeDasharray={strokeDasharray}
                  />
                );
              } else {
                const start: Vec2 = [vertex[0] + v1[0] * markRadius, vertex[1] + v1[1] * markRadius];
                const end: Vec2 = [vertex[0] + v2[0] * markRadius, vertex[1] + v2[1] * markRadius];

                nodes.push(
                  <path
                    key="angle-arc-mark"
                    d={`M ${transformX(start[0])} ${transformY(start[1])} A ${
                      markRadius * unit
                    } ${markRadius * unit} 0 0 ${sweepFlag} ${transformX(end[0])} ${transformY(
                      end[1]
                    )}`}
                    fill="none"
                    stroke={markColor}
                    strokeWidth={2}
                    strokeDasharray={strokeDasharray}
                  />
                );
              }

              if (primitive.label) {
                const bisector = normalize([v1[0] + v2[0], v1[1] + v2[1]]);
                if (bisector) {
                  const labelPos: Vec2 = [
                    vertex[0] + bisector[0] * markRadius * 1.6,
                    vertex[1] + bisector[1] * markRadius * 1.6,
                  ];

                  nodes.push(
                    <text
                      key="angle-label"
                      x={transformX(labelPos[0])}
                      y={transformY(labelPos[1])}
                      fontSize={12}
                      fill="#1f2937"
                      textAnchor="middle"
                    >
                      {primitive.label}
                    </text>
                  );
                }
              }

              return <g key={key}>{nodes}</g>;
            }

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

              return (
                <g key={key}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={rxPx}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                  />
                  <path
                    d={topPath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={getStrokeDasharray("dashed")}
                  />
                  <path
                    d={bottomPath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={getStrokeDasharray("solid")}
                  />
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

              return (
                <g key={key}>
                  <path
                    d={topPath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={getStrokeDasharray("dashed")}
                  />
                  <line
                    x1={transformX(bX - primitive.radius)}
                    y1={transformY(bY)}
                    x2={transformX(bX - primitive.radius)}
                    y2={transformY(tY)}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                  />
                  <line
                    x1={transformX(bX + primitive.radius)}
                    y1={transformY(bY)}
                    x2={transformX(bX + primitive.radius)}
                    y2={transformY(tY)}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                  />
                  <ellipse
                    cx={topCx}
                    cy={topCy}
                    rx={rxPx}
                    ry={ryPx}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                  />
                  <path
                    d={bottomPath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={getStrokeDasharray("solid")}
                  />
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

              const bottomCx = transformX(bX);
              const bottomCy = transformY(bY);
              const rxPx = primitive.radius * unit;
              const ryPx = Math.max(primitive.radius * 0.25 * unit, 1);
              const { topPath, bottomPath } = splitEllipseHalfPaths(bottomCx, bottomCy, rxPx, ryPx);

              return (
                <g key={key}>
                  <path
                    d={topPath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={getStrokeDasharray("dashed")}
                  />
                  <line
                    x1={transformX(apex[0])}
                    y1={transformY(apex[1])}
                    x2={transformX(left[0])}
                    y2={transformY(left[1])}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                  />
                  <line
                    x1={transformX(apex[0])}
                    y1={transformY(apex[1])}
                    x2={transformX(right[0])}
                    y2={transformY(right[1])}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                  />
                  <path
                    d={bottomPath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={getStrokeDasharray("solid")}
                  />
                </g>
              );
            }

            case "box_3d": {
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

              const edges: Array<{ from: Vec2; to: Vec2; style: StrokeStyle }> = [
                { from: a, to: b, style: "solid" },
                { from: b, to: c, style: "solid" },
                { from: c, to: d, style: "solid" },
                { from: d, to: a, style: "solid" },
                { from: e, to: f, style: "dashed" },
                { from: f, to: g, style: "solid" },
                { from: g, to: h, style: "solid" },
                { from: h, to: e, style: "dashed" },
                { from: a, to: e, style: "dashed" },
                { from: b, to: f, style: "solid" },
                { from: c, to: g, style: "solid" },
                { from: d, to: h, style: "solid" },
              ];

              return (
                <g key={key}>
                  {edges.map((edge, edgeIndex) => (
                    <line
                      key={`${key}-edge-${edgeIndex}`}
                      x1={transformX(edge.from[0])}
                      y1={transformY(edge.from[1])}
                      x2={transformX(edge.to[0])}
                      y2={transformY(edge.to[1])}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={getStrokeDasharray(edge.style)}
                    />
                  ))}
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

              const edges: Array<{ from: Vec2; to: Vec2; style: StrokeStyle }> = [
                { from: a, to: b, style: "solid" },
                { from: b, to: c, style: "solid" },
                { from: c, to: d, style: "solid" },
                { from: d, to: a, style: "solid" },
                { from: e, to: f, style: "dashed" },
                { from: f, to: g, style: "solid" },
                { from: g, to: h, style: "solid" },
                { from: h, to: e, style: "dashed" },
                { from: a, to: e, style: "dashed" },
                { from: b, to: f, style: "solid" },
                { from: c, to: g, style: "solid" },
                { from: d, to: h, style: "solid" },
              ];

              return (
                <g key={key}>
                  {edges.map((edge, edgeIndex) => (
                    <line
                      key={`${key}-edge-${edgeIndex}`}
                      x1={transformX(edge.from[0])}
                      y1={transformY(edge.from[1])}
                      x2={transformX(edge.to[0])}
                      y2={transformY(edge.to[1])}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={getStrokeDasharray(edge.style)}
                    />
                  ))}
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

              const topVertices = baseVertices.map(([xRaw, yRaw]) => [xRaw, yRaw + primitive.height] as Vec2);
              const lastIndex = baseVertices.length - 1;
              const topPoints = topVertices.map(([xRaw, yRaw]) => `${transformX(xRaw)},${transformY(yRaw)}`).join(" ");

              const edges: Array<{ from: Vec2; to: Vec2; style: StrokeStyle }> = [];

              for (let i = 0; i < baseVertices.length; i++) {
                const next = (i + 1) % baseVertices.length;
                const edgeStyle: StrokeStyle =
                  i === lastIndex || next === lastIndex ? "dashed" : "solid";

                edges.push({ from: baseVertices[i], to: baseVertices[next], style: edgeStyle });
                edges.push({
                  from: baseVertices[i],
                  to: topVertices[i],
                  style: i === lastIndex ? "dashed" : "solid",
                });
              }

              return (
                <g key={key}>
                  <polygon
                    points={topPoints}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={getStrokeDasharray("solid")}
                  />
                  {edges.map((edge, edgeIndex) => (
                    <line
                      key={`${key}-edge-${edgeIndex}`}
                      x1={transformX(edge.from[0])}
                      y1={transformY(edge.from[1])}
                      x2={transformX(edge.to[0])}
                      y2={transformY(edge.to[1])}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={getStrokeDasharray(edge.style)}
                    />
                  ))}
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

              const edges: Array<{ from: Vec2; to: Vec2; style: StrokeStyle }> = [
                { from: apex, to: frontLeft, style: "solid" },
                { from: apex, to: frontRight, style: "solid" },
                { from: apex, to: backRight, style: "solid" },
                { from: frontLeft, to: frontRight, style: "solid" },
                { from: frontRight, to: backRight, style: "solid" },
                { from: apex, to: backLeft, style: "dashed" },
                { from: backLeft, to: frontLeft, style: "dashed" },
                { from: backLeft, to: backRight, style: "dashed" },
              ];

              return (
                <g key={key}>
                  {edges.map((edge, edgeIndex) => (
                    <line
                      key={`${key}-edge-${edgeIndex}`}
                      x1={transformX(edge.from[0])}
                      y1={transformY(edge.from[1])}
                      x2={transformX(edge.to[0])}
                      y2={transformY(edge.to[1])}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={getStrokeDasharray(edge.style)}
                    />
                  ))}
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

              const edges: Array<{ from: Vec2; to: Vec2; style: StrokeStyle }> = [
                { from: apex, to: front, style: "solid" },
                { from: apex, to: backRight, style: "solid" },
                { from: front, to: backRight, style: "solid" },
                { from: apex, to: backLeft, style: "dashed" },
                { from: backLeft, to: front, style: "dashed" },
                { from: backLeft, to: backRight, style: "dashed" },
              ];

              return (
                <g key={key}>
                  {edges.map((edge, edgeIndex) => (
                    <line
                      key={`${key}-edge-${edgeIndex}`}
                      x1={transformX(edge.from[0])}
                      y1={transformY(edge.from[1])}
                      x2={transformX(edge.to[0])}
                      y2={transformY(edge.to[1])}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={getStrokeDasharray(edge.style)}
                    />
                  ))}
                </g>
              );
            }

            case "point": {
              const [x, y] = primitive.coords;
              const [offsetX, offsetY] = getPointLabelOffset(primitive.pos);

              return (
                <g key={key}>
                  <circle
                    cx={transformX(x)}
                    cy={transformY(y)}
                    r={4}
                    fill={primitive.color ?? "#111827"}
                  />
                  {(primitive.label ?? primitive.id) && (
                    <text
                      x={transformX(x) + offsetX}
                      y={transformY(y) + offsetY}
                      fontSize={12}
                      fill="#111827"
                    >
                      {primitive.label ?? primitive.id}
                    </text>
                  )}
                </g>
              );
            }

            case "label": {
              return (
                <text
                  key={key}
                  x={transformX(primitive.coords[0])}
                  y={transformY(primitive.coords[1])}
                  fontSize={12}
                  textAnchor="middle"
                  fill={primitive.color ?? "#111827"}
                >
                  {primitive.content}
                </text>
              );
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
                    />
                  ))}
                </g>
              );
            }

            default:
              return null;
          }
        })}
      </svg>
    </div>
  );
}
