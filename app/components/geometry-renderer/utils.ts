import type { LabelPosition, Vec2 } from "./types";

export const EPSILON = 1e-9;

export interface SvgBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type TextAnchor = "start" | "middle" | "end";

export interface LineSegmentSvg {
  from: Vec2;
  to: Vec2;
}

interface RectangularPrismLabelPositions {
  width?: Vec2;
  height?: Vec2;
  depth?: Vec2;
}

export function createSvgBounds(aX: number, aY: number, bX: number, bY: number): SvgBounds {
  return {
    minX: Math.min(aX, bX),
    minY: Math.min(aY, bY),
    maxX: Math.max(aX, bX),
    maxY: Math.max(aY, bY),
  };
}

export function includeSvgPoint(bounds: SvgBounds, x: number, y: number, padding = 0): void {
  bounds.minX = Math.min(bounds.minX, x - padding);
  bounds.maxX = Math.max(bounds.maxX, x + padding);
  bounds.minY = Math.min(bounds.minY, y - padding);
  bounds.maxY = Math.max(bounds.maxY, y + padding);
}

export function includeSvgRect(
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

export function includeSvgText(
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

export const getStrokeDasharray = (style?: string): string =>
  style === "dashed" ? "5,5" : "none";

export function splitEllipseHalfPaths(cx: number, cy: number, rx: number, ry: number): {
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

export function getObliqueDepthVector(depth: number): Vec2 {
  const projectedDepth = depth * 0.5;
  const component = projectedDepth * Math.SQRT1_2;
  return [component, component];
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

export function findFrontMostVertexIndex(vertices: Vec2[]): number {
  if (vertices.length === 0) {
    return -1;
  }

  let frontIndex = 0;
  for (let i = 1; i < vertices.length; i++) {
    if (vertices[i][1] < vertices[frontIndex][1]) {
      frontIndex = i;
    }
  }
  return frontIndex;
}

export function getEdgeLabelPositionSvg(
  from: Vec2,
  to: Vec2,
  offsetPx: number,
  preferDirection: "up" | "down" | "left" | "right",
  alongPx = 0
): Vec2 {
  const [mx, my] = midpoint(from, to);
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);

  if (len < EPSILON) {
    return [mx, my + offsetPx];
  }

  const tx = dx / len;
  const ty = dy / len;

  // Right-handed normal in SVG coordinates.
  let nx = -dy / len;
  let ny = dx / len;

  const isPreferredDirection =
    (preferDirection === "up" && ny < 0) ||
    (preferDirection === "down" && ny > 0) ||
    (preferDirection === "left" && nx < 0) ||
    (preferDirection === "right" && nx > 0);

  if (!isPreferredDirection) {
    nx = -nx;
    ny = -ny;
  }

  return [mx + nx * offsetPx + tx * alongPx, my + ny * offsetPx + ty * alongPx];
}

function closestPointOnSegment(point: Vec2, segment: LineSegmentSvg): Vec2 {
  const [px, py] = point;
  const [ax, ay] = segment.from;
  const [bx, by] = segment.to;
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;

  if (abLenSq < EPSILON) {
    return [ax, ay];
  }

  const apx = px - ax;
  const apy = py - ay;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
  return [ax + t * abx, ay + t * aby];
}

export function nudgeLabelAwayFromSegments(
  initialPosition: Vec2,
  segments: LineSegmentSvg[],
  preferredDir: Vec2,
  minDistance = 16,
  iterations = 4
): Vec2 {
  if (segments.length === 0) {
    return initialPosition;
  }

  let position: Vec2 = [initialPosition[0], initialPosition[1]];
  const fallbackDir = normalize(preferredDir) ?? [1, 0];

  for (let i = 0; i < iterations; i++) {
    let nearestDistance = Number.POSITIVE_INFINITY;
    let nearestPoint: Vec2 | null = null;

    for (const segment of segments) {
      const candidate = closestPointOnSegment(position, segment);
      const distance = Math.hypot(position[0] - candidate[0], position[1] - candidate[1]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = candidate;
      }
    }

    if (nearestDistance >= minDistance || nearestPoint === null) {
      break;
    }

    const awayVector = normalize([
      position[0] - nearestPoint[0],
      position[1] - nearestPoint[1],
    ]) ?? fallbackDir;
    const push = minDistance - nearestDistance + 1;
    position = [position[0] + awayVector[0] * push, position[1] + awayVector[1] * push];
  }

  return position;
}

export function getRectangularPrismLabelPositionsSvg(options: {
  a: Vec2;
  b: Vec2;
  c: Vec2;
  f: Vec2;
  showWidth: boolean;
  showHeight: boolean;
  showDepth: boolean;
  segments?: LineSegmentSvg[];
}): RectangularPrismLabelPositions {
  type LabelId = "width" | "height" | "depth";

  const candidates: Array<{
    id: LabelId;
    position: Vec2;
    pushDir: Vec2;
  }> = [];

  if (options.showWidth) {
    candidates.push({
      id: "width",
      position: getEdgeLabelPositionSvg(options.a, options.b, 12, "down"),
      pushDir: [0, 1],
    });
  }

  if (options.showHeight) {
    candidates.push({
      id: "height",
      position: getEdgeLabelPositionSvg(options.b, options.c, 16, "right", 10),
      pushDir: [1, 0],
    });
  }

  if (options.showDepth) {
    candidates.push({
      id: "depth",
      position: getEdgeLabelPositionSvg(options.b, options.f, 24, "down", 10),
      pushDir: [0.6, 0.8],
    });
  }

  const adjusted = candidates.map((item) => ({
    ...item,
    position: nudgeLabelAwayFromSegments(
      [item.position[0], item.position[1]],
      options.segments ?? [],
      item.pushDir,
      16,
      4
    ),
  }));

  const minDistance = 28;
  for (let i = 0; i < adjusted.length; i++) {
    for (let j = 0; j < i; j++) {
      const dx = adjusted[i].position[0] - adjusted[j].position[0];
      const dy = adjusted[i].position[1] - adjusted[j].position[1];
      const distance = Math.hypot(dx, dy);

      if (distance >= minDistance) {
        continue;
      }

      const push = minDistance - distance + 1;
      const pushVector = normalize(adjusted[i].pushDir) ?? [1, 0];
      adjusted[i].position = [
        adjusted[i].position[0] + pushVector[0] * push,
        adjusted[i].position[1] + pushVector[1] * push,
      ];
    }
  }

  return {
    width: adjusted.find((item) => item.id === "width")?.position,
    height: adjusted.find((item) => item.id === "height")?.position,
    depth: adjusted.find((item) => item.id === "depth")?.position,
  };
}

export function normalizeDiagramLabel(input?: string | null): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }

  let text = input.trim();
  if (!text) {
    return undefined;
  }
  text = text.replace(/\s+/g, " ").trim();

  return text || undefined;
}

export function isFiniteNumber(value: number): boolean {
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

export function normalize([x, y]: Vec2): Vec2 | null {
  const length = Math.hypot(x, y);
  if (length < EPSILON) {
    return null;
  }
  return [x / length, y / length];
}

export function within(value: number, min: number, max: number): boolean {
  return value >= min - EPSILON && value <= max + EPSILON;
}

export function findLineEndpointsInRect(
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

export function findRayEndpointInRect(
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

export function compileFormula(formula: string): ((x: number) => number | null) | null {
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

export function getPointLabelOffset(position?: LabelPosition): Vec2 {
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
