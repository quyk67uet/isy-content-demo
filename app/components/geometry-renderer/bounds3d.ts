import type { DiagramPrimitive, Vec2 } from "./types";
import { readLabelFieldRaw } from "./labels3d";
import {
  findFrontMostVertexIndex,
  getEdgeLabelPositionSvg,
  getObliqueDepthVector,
  getRectangularPrismLabelPositionsSvg,
  includeSvgPoint,
  includeSvgRect,
  includeSvgText,
  isFiniteNumber,
  nudgeLabelAwayFromSegments,
  normalizeDiagramLabel,
  type LineSegmentSvg,
  type SvgBounds,
} from "./utils";

interface Apply3DBoundsParams {
  primitive: DiagramPrimitive;
  primitiveIndex: number;
  bounds: SvgBounds;
  linePadding: number;
  unit: number;
  transformX: (x: number) => number;
  transformY: (y: number) => number;
  applyLabelOffset: (labelKey: string, x: number, y: number) => Vec2;
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

export function apply3DPrimitiveBounds(params: Apply3DBoundsParams): boolean {
  const {
    primitive,
    primitiveIndex,
    bounds,
    linePadding,
    unit,
    transformX,
    transformY,
    applyLabelOffset,
  } = params;

  switch (primitive.type) {
    case "sphere_3d": {
      const [cX, cY] = primitive.center_coords;
      if (!isFiniteNumber(primitive.radius) || primitive.radius <= 0) {
        return true;
      }

      const cx = transformX(cX);
      const cy = transformY(cY);
      const rxPx = primitive.radius * unit;
      const ryPx = primitive.radius * 0.25 * unit;

      includeSvgRect(bounds, cx - rxPx, cy - rxPx, cx + rxPx, cy + rxPx, linePadding);
      includeSvgRect(bounds, cx - rxPx, cy - ryPx, cx + rxPx, cy + ryPx, linePadding);

      const labelRadius = getLabel(primitive, "label_radius");
      if (labelRadius) {
        const radiusLabelPos = getEdgeLabelPositionSvg(
          [transformX(cX), transformY(cY)],
          [transformX(cX + primitive.radius), transformY(cY)],
          12,
          "down"
        );
        const [radiusLabelX, radiusLabelY] = applyLabelOffset(
          `primitive-${primitiveIndex}-sphere-radius`,
          radiusLabelPos[0],
          radiusLabelPos[1]
        );
        includeSvgText(bounds, radiusLabelX, radiusLabelY, labelRadius, 12, "middle");
      }

      return true;
    }

    case "cylinder_3d": {
      const [bX, bY] = primitive.center_bottom_coords;
      if (
        !isFiniteNumber(primitive.radius) ||
        !isFiniteNumber(primitive.height) ||
        primitive.radius <= 0
      ) {
        return true;
      }

      const tY = bY + primitive.height;
      const bottomCx = transformX(bX);
      const bottomCy = transformY(bY);
      const topCx = transformX(bX);
      const topCy = transformY(tY);
      const rxPx = primitive.radius * unit;
      const ryPx = primitive.radius * 0.25 * unit;

      includeSvgRect(bounds, bottomCx - rxPx, bottomCy - ryPx, bottomCx + rxPx, bottomCy + ryPx, linePadding);
      includeSvgRect(bounds, topCx - rxPx, topCy - ryPx, topCx + rxPx, topCy + ryPx, linePadding);
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

      const labelRadius = getLabel(primitive, "label_radius");
      if (labelRadius) {
        const radiusLabelPos = getEdgeLabelPositionSvg(
          [transformX(bX), transformY(bY)],
          [transformX(bX + primitive.radius), transformY(bY)],
          12,
          "down"
        );
        const [radiusLabelX, radiusLabelY] = applyLabelOffset(
          `primitive-${primitiveIndex}-cylinder-radius`,
          radiusLabelPos[0],
          radiusLabelPos[1]
        );
        includeSvgText(bounds, radiusLabelX, radiusLabelY, labelRadius, 12, "middle");
      }

      const labelHeight = getLabel(primitive, "label_height");
      if (labelHeight) {
        const heightLabelPos = getEdgeLabelPositionSvg(
          [transformX(bX + primitive.radius), transformY(bY)],
          [transformX(bX + primitive.radius), transformY(tY)],
          18,
          "right"
        );
        const [heightLabelX, heightLabelY] = applyLabelOffset(
          `primitive-${primitiveIndex}-cylinder-height`,
          heightLabelPos[0],
          heightLabelPos[1]
        );
        includeSvgText(bounds, heightLabelX, heightLabelY, labelHeight, 12, "middle");
      }

      return true;
    }

    case "cone_3d": {
      const [bX, bY] = primitive.center_bottom_coords;
      if (
        !isFiniteNumber(primitive.radius) ||
        !isFiniteNumber(primitive.height) ||
        primitive.radius <= 0
      ) {
        return true;
      }

      const apex: Vec2 = [bX, bY + primitive.height];
      const left: Vec2 = [bX - primitive.radius, bY];
      const right: Vec2 = [bX + primitive.radius, bY];
      const baseCenter: Vec2 = [bX, bY];

      const bottomCx = transformX(bX);
      const bottomCy = transformY(bY);
      const rxPx = primitive.radius * unit;
      const ryPx = primitive.radius * 0.25 * unit;

      includeSvgRect(bounds, bottomCx - rxPx, bottomCy - ryPx, bottomCx + rxPx, bottomCy + ryPx, linePadding);
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

      const labelRadius = getLabel(primitive, "label_radius");
      if (labelRadius) {
        const radiusLabelPos = getEdgeLabelPositionSvg(
          [transformX(bX), transformY(bY)],
          [transformX(bX + primitive.radius), transformY(bY)],
          12,
          "down"
        );
        const [radiusLabelX, radiusLabelY] = applyLabelOffset(
          `primitive-${primitiveIndex}-cone-radius`,
          radiusLabelPos[0],
          radiusLabelPos[1]
        );
        includeSvgText(bounds, radiusLabelX, radiusLabelY, labelRadius, 12, "middle");
      }

      const labelHeight = getLabel(primitive, "label_height");
      if (labelHeight) {
        includeSvgRect(
          bounds,
          transformX(baseCenter[0]),
          transformY(baseCenter[1]),
          transformX(apex[0]),
          transformY(apex[1]),
          linePadding
        );
        const heightLabelPos = getEdgeLabelPositionSvg(
          [transformX(baseCenter[0]), transformY(baseCenter[1])],
          [transformX(apex[0]), transformY(apex[1])],
          14,
          "right"
        );
        const [heightLabelX, heightLabelY] = applyLabelOffset(
          `primitive-${primitiveIndex}-cone-height`,
          heightLabelPos[0],
          heightLabelPos[1]
        );
        includeSvgText(bounds, heightLabelX, heightLabelY, labelHeight, 12, "middle");
      }

      const labelSlant = getLabel(primitive, "label_slant");
      if (labelSlant) {
        const slantLabelPos = getEdgeLabelPositionSvg(
          [transformX(apex[0]), transformY(apex[1])],
          [transformX(right[0]), transformY(right[1])],
          14,
          "right"
        );
        const [slantLabelX, slantLabelY] = applyLabelOffset(
          `primitive-${primitiveIndex}-cone-slant`,
          slantLabelPos[0],
          slantLabelPos[1]
        );
        includeSvgText(bounds, slantLabelX, slantLabelY, labelSlant, 12, "middle");
      }

      return true;
    }

    case "rectangular_prism_3d": {
      const [oX, oY] = primitive.origin_coords;
      if (
        !isFiniteNumber(primitive.width) ||
        !isFiniteNumber(primitive.height) ||
        !isFiniteNumber(primitive.depth)
      ) {
        return true;
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

      [a, b, c, d, e, f, g, h].forEach(([xRaw, yRaw]) => {
        includeSvgPoint(bounds, transformX(xRaw), transformY(yRaw), linePadding);
      });

      const labelWidth = getLabel(primitive, "label_width");
      if (labelWidth) {
        const [labelWidthX, labelWidthY] = applyLabelOffset(
          `primitive-${primitiveIndex}-rect-width`,
          labelPositions.width?.[0] ?? transformX(a[0]),
          labelPositions.width?.[1] ?? transformY(a[1])
        );
        includeSvgText(bounds, labelWidthX, labelWidthY, labelWidth, 12, "middle");
      }

      const labelHeight = getLabel(primitive, "label_height");
      if (labelHeight) {
        const [labelHeightX, labelHeightY] = applyLabelOffset(
          `primitive-${primitiveIndex}-rect-height`,
          labelPositions.height?.[0] ?? transformX(c[0]),
          labelPositions.height?.[1] ?? transformY(c[1])
        );
        includeSvgText(bounds, labelHeightX, labelHeightY, labelHeight, 12, "middle");
      }

      const labelDepth = getLabel(primitive, "label_depth");
      if (labelDepth) {
        const [labelDepthX, labelDepthY] = applyLabelOffset(
          `primitive-${primitiveIndex}-rect-depth`,
          labelPositions.depth?.[0] ?? transformX(f[0]),
          labelPositions.depth?.[1] ?? transformY(f[1])
        );
        includeSvgText(bounds, labelDepthX, labelDepthY, labelDepth, 12, "middle");
      }

      return true;
    }

    case "triangular_prism_3d":
    case "quadrilateral_prism_3d": {
      const baseVertices = primitive.base_vertices;
      if (
        !Array.isArray(baseVertices) ||
        baseVertices.length < 3 ||
        !isFiniteNumber(primitive.height)
      ) {
        return true;
      }

      const topVertices = baseVertices.map(([xRaw, yRaw]) => [xRaw, yRaw + primitive.height] as Vec2);
      [...baseVertices, ...topVertices].forEach(([xRaw, yRaw]) => {
        includeSvgPoint(bounds, transformX(xRaw), transformY(yRaw), linePadding);
      });

      const prismSegmentsSvg: LineSegmentSvg[] = [];
      for (let i = 0; i < baseVertices.length; i++) {
        const next = (i + 1) % baseVertices.length;
        prismSegmentsSvg.push({
          from: [transformX(baseVertices[i][0]), transformY(baseVertices[i][1])],
          to: [transformX(baseVertices[next][0]), transformY(baseVertices[next][1])],
        });
        prismSegmentsSvg.push({
          from: [transformX(baseVertices[i][0]), transformY(baseVertices[i][1])],
          to: [transformX(topVertices[i][0]), transformY(topVertices[i][1])],
        });
      }

      const labelHeight = getLabel(primitive, "label_height");
      if (labelHeight) {
        const frontIndex = findFrontMostVertexIndex(baseVertices);
        if (frontIndex >= 0) {
          const rawVerticalLabelPos = getEdgeLabelPositionSvg(
            [transformX(baseVertices[frontIndex][0]), transformY(baseVertices[frontIndex][1])],
            [transformX(topVertices[frontIndex][0]), transformY(topVertices[frontIndex][1])],
            20,
            "right",
            10
          );
          const verticalLabelPos = nudgeLabelAwayFromSegments(rawVerticalLabelPos, prismSegmentsSvg, [1, 0], 18, 5);
          const [labelHeightX, labelHeightY] = applyLabelOffset(
            `primitive-${primitiveIndex}-prism-height`,
            verticalLabelPos[0],
            verticalLabelPos[1]
          );
          includeSvgText(bounds, labelHeightX, labelHeightY, labelHeight, 12, "middle");
        }
      }

      const sideFields =
        primitive.type === "triangular_prism_3d"
          ? ["label_side_1", "label_side_2", "label_side_3"]
          : ["label_side_1", "label_side_2", "label_side_3", "label_side_4"];

      sideFields.forEach((field, sideIndex) => {
        const content = getLabel(primitive, field);
        if (!content) {
          return;
        }

        const next = (sideIndex + 1) % baseVertices.length;
        const sideLabelPos = getEdgeLabelPositionSvg(
          [transformX(baseVertices[sideIndex][0]), transformY(baseVertices[sideIndex][1])],
          [transformX(baseVertices[next][0]), transformY(baseVertices[next][1])],
          12,
          getPrismSideDirection(sideIndex, baseVertices.length)
        );
        const [labelX, labelY] = applyLabelOffset(
          `primitive-${primitiveIndex}-prism-side-${sideIndex + 1}`,
          sideLabelPos[0],
          sideLabelPos[1]
        );
        includeSvgText(bounds, labelX, labelY, content, 12, "middle");
      });

      return true;
    }

    case "quadrilateral_pyramid_3d": {
      const [cX, cY] = primitive.center_base_coords;
      if (
        !isFiniteNumber(primitive.base_side) ||
        !isFiniteNumber(primitive.height) ||
        primitive.base_side <= 0
      ) {
        return true;
      }

      const half = primitive.base_side / 2;
      const quarter = primitive.base_side / 4;

      const frontLeft: Vec2 = [cX - half, cY - quarter];
      const frontRight: Vec2 = [cX + half, cY - quarter];
      const backRight: Vec2 = [cX + half, cY + quarter];
      const backLeft: Vec2 = [cX - half, cY + quarter];
      const apex: Vec2 = [cX, cY + primitive.height];
      const baseCenter: Vec2 = [cX, cY];
      const slantFoot: Vec2 = [(frontLeft[0] + frontRight[0]) / 2, (frontLeft[1] + frontRight[1]) / 2];

      [frontLeft, frontRight, backRight, backLeft, apex].forEach(([xRaw, yRaw]) => {
        includeSvgPoint(bounds, transformX(xRaw), transformY(yRaw), linePadding);
      });

      const labelSide = getLabel(primitive, "label_side");
      if (labelSide) {
        const sideLabelPos = getEdgeLabelPositionSvg(
          [transformX(frontLeft[0]), transformY(frontLeft[1])],
          [transformX(frontRight[0]), transformY(frontRight[1])],
          12,
          "down"
        );
        const [labelSideX, labelSideY] = applyLabelOffset(
          `primitive-${primitiveIndex}-quad-pyramid-side`,
          sideLabelPos[0],
          sideLabelPos[1]
        );
        includeSvgText(bounds, labelSideX, labelSideY, labelSide, 12, "middle");
      }

      const labelHeight = getLabel(primitive, "label_height");
      if (labelHeight) {
        includeSvgRect(
          bounds,
          transformX(baseCenter[0]),
          transformY(baseCenter[1]),
          transformX(apex[0]),
          transformY(apex[1]),
          linePadding
        );
        const hLabelPos = getEdgeLabelPositionSvg(
          [transformX(baseCenter[0]), transformY(baseCenter[1])],
          [transformX(apex[0]), transformY(apex[1])],
          12,
          "right"
        );
        const [labelHeightX, labelHeightY] = applyLabelOffset(
          `primitive-${primitiveIndex}-quad-pyramid-height`,
          hLabelPos[0],
          hLabelPos[1]
        );
        includeSvgText(bounds, labelHeightX, labelHeightY, labelHeight, 12, "middle");
      }

      const labelSlant = getLabel(primitive, "label_slant");
      if (labelSlant) {
        includeSvgRect(
          bounds,
          transformX(apex[0]),
          transformY(apex[1]),
          transformX(slantFoot[0]),
          transformY(slantFoot[1]),
          linePadding
        );
        const slantLabelPos = getEdgeLabelPositionSvg(
          [transformX(apex[0]), transformY(apex[1])],
          [transformX(slantFoot[0]), transformY(slantFoot[1])],
          12,
          "right"
        );
        const [labelSlantX, labelSlantY] = applyLabelOffset(
          `primitive-${primitiveIndex}-quad-pyramid-slant`,
          slantLabelPos[0],
          slantLabelPos[1]
        );
        includeSvgText(bounds, labelSlantX, labelSlantY, labelSlant, 12, "middle");
      }

      return true;
    }

    case "triangular_pyramid_3d": {
      const [cX, cY] = primitive.center_base_coords;
      if (
        !isFiniteNumber(primitive.base_side) ||
        !isFiniteNumber(primitive.height) ||
        primitive.base_side <= 0
      ) {
        return true;
      }

      const front: Vec2 = [cX, cY - primitive.base_side / 3];
      const backLeft: Vec2 = [cX - primitive.base_side / 2, cY + primitive.base_side / 6];
      const backRight: Vec2 = [cX + primitive.base_side / 2, cY + primitive.base_side / 6];
      const apex: Vec2 = [cX, cY + primitive.height];
      const baseCenter: Vec2 = [cX, cY];
      const slantFoot: Vec2 = [(front[0] + backRight[0]) / 2, (front[1] + backRight[1]) / 2];

      [front, backLeft, backRight, apex].forEach(([xRaw, yRaw]) => {
        includeSvgPoint(bounds, transformX(xRaw), transformY(yRaw), linePadding);
      });

      const labelSide = getLabel(primitive, "label_side");
      if (labelSide) {
        const sideLabelPos = getEdgeLabelPositionSvg(
          [transformX(front[0]), transformY(front[1])],
          [transformX(backRight[0]), transformY(backRight[1])],
          12,
          "down"
        );
        const [labelSideX, labelSideY] = applyLabelOffset(
          `primitive-${primitiveIndex}-tri-pyramid-side`,
          sideLabelPos[0],
          sideLabelPos[1]
        );
        includeSvgText(bounds, labelSideX, labelSideY, labelSide, 12, "middle");
      }

      const labelHeight = getLabel(primitive, "label_height");
      if (labelHeight) {
        includeSvgRect(
          bounds,
          transformX(baseCenter[0]),
          transformY(baseCenter[1]),
          transformX(apex[0]),
          transformY(apex[1]),
          linePadding
        );
        const hLabelPos = getEdgeLabelPositionSvg(
          [transformX(baseCenter[0]), transformY(baseCenter[1])],
          [transformX(apex[0]), transformY(apex[1])],
          12,
          "right"
        );
        const [labelHeightX, labelHeightY] = applyLabelOffset(
          `primitive-${primitiveIndex}-tri-pyramid-height`,
          hLabelPos[0],
          hLabelPos[1]
        );
        includeSvgText(bounds, labelHeightX, labelHeightY, labelHeight, 12, "middle");
      }

      const labelSlant = getLabel(primitive, "label_slant");
      if (labelSlant) {
        includeSvgRect(
          bounds,
          transformX(apex[0]),
          transformY(apex[1]),
          transformX(slantFoot[0]),
          transformY(slantFoot[1]),
          linePadding
        );
        const slantLabelPos = getEdgeLabelPositionSvg(
          [transformX(apex[0]), transformY(apex[1])],
          [transformX(slantFoot[0]), transformY(slantFoot[1])],
          12,
          "right"
        );
        const [labelSlantX, labelSlantY] = applyLabelOffset(
          `primitive-${primitiveIndex}-tri-pyramid-slant`,
          slantLabelPos[0],
          slantLabelPos[1]
        );
        includeSvgText(bounds, labelSlantX, labelSlantY, labelSlant, 12, "middle");
      }

      return true;
    }

    default:
      return false;
  }
}
