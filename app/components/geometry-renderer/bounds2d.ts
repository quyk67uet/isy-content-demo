import type { DiagramPrimitive, Vec2 } from "./types";
import {
  compileFormula,
  EPSILON,
  findLineEndpointsInRect,
  findRayEndpointInRect,
  getPointLabelOffset,
  includeSvgPoint,
  includeSvgRect,
  includeSvgText,
  isFiniteNumber,
  normalize,
  normalizeDiagramLabel,
  type SvgBounds,
  within,
} from "./utils";

interface Apply2DBoundsParams {
  primitive: DiagramPrimitive;
  primitiveIndex: number;
  bounds: SvgBounds;
  linePadding: number;
  unit: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  height: number;
  functionXRange: Vec2;
  getPointRawCoords: (id: string) => Vec2 | null;
  transformX: (x: number) => number;
  transformY: (y: number) => number;
  applyLabelOffset: (labelKey: string, x: number, y: number) => Vec2;
}

export function apply2DPrimitiveBounds(params: Apply2DBoundsParams): boolean {
  const {
    primitive,
    primitiveIndex,
    bounds,
    linePadding,
    unit,
    minX,
    maxX,
    minY,
    maxY,
    height,
    functionXRange,
    getPointRawCoords,
    transformX,
    transformY,
    applyLabelOffset,
  } = params;

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
      return true;
    }

    case "segment": {
      const [pA, pB] = primitive.points;
      const a = getPointRawCoords(pA);
      const b = getPointRawCoords(pB);

      if (!a || !b) {
        return true;
      }

      includeSvgRect(
        bounds,
        transformX(a[0]),
        transformY(a[1]),
        transformX(b[0]),
        transformY(b[1]),
        linePadding
      );
      return true;
    }

    case "line": {
      const [pA, pB] = primitive.points;
      const rawA = getPointRawCoords(pA);
      const rawB = getPointRawCoords(pB);

      if (!rawA || !rawB) {
        return true;
      }

      const endpoints = findLineEndpointsInRect(rawA, rawB, minX, maxX, minY, maxY);
      if (!endpoints) {
        return true;
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
      return true;
    }

    case "ray": {
      const rawFrom = getPointRawCoords(primitive.from);
      const rawTowards = getPointRawCoords(primitive.towards);

      if (!rawFrom || !rawTowards) {
        return true;
      }

      const endpoint = findRayEndpointInRect(rawFrom, rawTowards, minX, maxX, minY, maxY);
      if (!endpoint) {
        return true;
      }

      includeSvgRect(
        bounds,
        transformX(rawFrom[0]),
        transformY(rawFrom[1]),
        transformX(endpoint[0]),
        transformY(endpoint[1]),
        linePadding + 8
      );
      return true;
    }

    case "circle": {
      const centerRaw = primitive.center_id
        ? getPointRawCoords(primitive.center_id)
        : primitive.center ?? null;

      if (!centerRaw || !isFiniteNumber(primitive.radius) || primitive.radius <= 0) {
        return true;
      }

      const cx = transformX(centerRaw[0]);
      const cy = transformY(centerRaw[1]);
      const radiusPx = primitive.radius * unit;

      includeSvgRect(bounds, cx - radiusPx, cy - radiusPx, cx + radiusPx, cy + radiusPx, linePadding);
      return true;
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
        return true;
      }

      const cx = transformX(centerRaw[0]);
      const cy = transformY(centerRaw[1]);
      const rxPx = primitive.rx * unit;
      const ryPx = primitive.ry * unit;

      includeSvgRect(bounds, cx - rxPx, cy - ryPx, cx + rxPx, cy + ryPx, linePadding);
      return true;
    }

    case "arc": {
      const center = getPointRawCoords(primitive.center_id);
      const start = getPointRawCoords(primitive.start_id);

      if (!center || !start) {
        return true;
      }

      const radius = Math.hypot(start[0] - center[0], start[1] - center[1]);
      if (radius < EPSILON) {
        return true;
      }

      const cx = transformX(center[0]);
      const cy = transformY(center[1]);
      const radiusPx = radius * unit;

      includeSvgRect(bounds, cx - radiusPx, cy - radiusPx, cx + radiusPx, cy + radiusPx, linePadding);
      return true;
    }

    case "angle": {
      const vertex = getPointRawCoords(primitive.vertex);
      const p1 = getPointRawCoords(primitive.p1);
      const p2 = getPointRawCoords(primitive.p2);

      if (!vertex || !p1 || !p2) {
        return true;
      }

      const v1 = normalize([p1[0] - vertex[0], p1[1] - vertex[1]]);
      const v2 = normalize([p2[0] - vertex[0], p2[1] - vertex[1]]);
      if (!v1 || !v2) {
        return true;
      }

      const markRadius = 0.45;
      const markerRadiusPx = markRadius * unit;
      const vx = transformX(vertex[0]);
      const vy = transformY(vertex[1]);

      includeSvgRect(bounds, vx - markerRadiusPx, vy - markerRadiusPx, vx + markerRadiusPx, vy + markerRadiusPx, 4);

      if (primitive.mark === "right") {
        const q1: Vec2 = [vertex[0] + v1[0] * markRadius, vertex[1] + v1[1] * markRadius];
        const q2: Vec2 = [vertex[0] + v2[0] * markRadius, vertex[1] + v2[1] * markRadius];
        const q3: Vec2 = [q1[0] + v2[0] * markRadius, q1[1] + v2[1] * markRadius];

        includeSvgRect(bounds, transformX(q1[0]), transformY(q1[1]), transformX(q2[0]), transformY(q2[1]), 4);
        includeSvgPoint(bounds, transformX(q3[0]), transformY(q3[1]), 4);
      }

      if (primitive.label) {
        const bisector = normalize([v1[0] + v2[0], v1[1] + v2[1]]);
        if (bisector) {
          const labelPos: Vec2 = [
            vertex[0] + bisector[0] * markRadius * 1.6,
            vertex[1] + bisector[1] * markRadius * 1.6,
          ];

          includeSvgText(bounds, transformX(labelPos[0]), transformY(labelPos[1]), primitive.label, 12, "middle");
        }
      }

      return true;
    }

    case "polygon": {
      const rawPoints = primitive.points
        .map((id) => getPointRawCoords(id))
        .filter((point): point is Vec2 => point !== null);

      if (rawPoints.length < 3) {
        return true;
      }

      rawPoints.forEach(([xRaw, yRaw]) => {
        includeSvgPoint(bounds, transformX(xRaw), transformY(yRaw), linePadding);
      });
      return true;
    }

    case "label": {
      const labelContent = normalizeDiagramLabel(primitive.content);
      if (!labelContent) {
        return true;
      }

      const [labelX, labelY] = applyLabelOffset(
        `primitive-${primitiveIndex}-label`,
        transformX(primitive.coords[0]),
        transformY(primitive.coords[1])
      );

      includeSvgText(bounds, labelX, labelY, labelContent, 12, "middle");
      return true;
    }

    case "grid": {
      includeSvgRect(bounds, transformX(minX), transformY(minY), transformX(maxX), transformY(maxY));
      return true;
    }

    case "axis": {
      const [xStart, xEnd] = primitive.x_range;
      const [yStart, yEnd] = primitive.y_range;

      includeSvgRect(bounds, transformX(xStart), transformY(0), transformX(xEnd), transformY(0), linePadding + 8);
      includeSvgRect(bounds, transformX(0), transformY(yStart), transformX(0), transformY(yEnd), linePadding + 8);

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

      return true;
    }

    case "function": {
      const evaluate = compileFormula(primitive.formula);
      if (!evaluate) {
        return true;
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
      return true;
    }

    default:
      return false;
  }
}
