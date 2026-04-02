"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseLatex } from "@/lib/utils";

import { apply2DPrimitiveBounds } from "./geometry-renderer/bounds2d";
import { apply3DPrimitiveBounds } from "./geometry-renderer/bounds3d";
import {
  get3DLabelFieldSpecs,
  readLabelFieldRaw,
  setLabelFieldValue,
} from "./geometry-renderer/labels3d";
import { render2DPrimitive, type RenderLabelOptions } from "./geometry-renderer/render2d";
import { render3DPrimitive } from "./geometry-renderer/render3d";
import type {
  AxisPrimitive,
  DiagramData,
  DiagramPrimitive,
  LabelOffset,
  LabelOverrides,
  Vec2,
} from "./geometry-renderer/types";
import { createSvgBounds, getStrokeDasharray } from "./geometry-renderer/utils";

export type { DiagramData } from "./geometry-renderer/types";

interface GeometryRendererProps {
  data: DiagramData;
  editableLabels?: boolean;
  onDiagramDataChange?: (nextData: DiagramData) => void;
}

interface LabelDragState {
  labelKey: string;
  pointerStart: Vec2;
  startOffset: LabelOffset;
}

interface Editable3DLabelGroup {
  primitiveIndex: number;
  primitive: DiagramPrimitive;
  fields: ReturnType<typeof get3DLabelFieldSpecs>;
}

function resolveCanvasConfig(data: DiagramData): {
  viewBox: [number, number, number, number];
  unit: number;
} {
  const canvas = (data as unknown as {
    canvas?: {
      viewBox?: unknown;
      unit?: unknown;
      width?: unknown;
      height?: unknown;
    };
  }).canvas;

  const unit =
    typeof canvas?.unit === "number" && Number.isFinite(canvas.unit) && canvas.unit > 0
      ? canvas.unit
      : 40;

  if (
    Array.isArray(canvas?.viewBox) &&
    canvas.viewBox.length === 4 &&
    canvas.viewBox.every((value) => typeof value === "number" && Number.isFinite(value))
  ) {
    return {
      viewBox: canvas.viewBox as [number, number, number, number],
      unit,
    };
  }

  const widthPx =
    typeof canvas?.width === "number" && Number.isFinite(canvas.width) && canvas.width > 0
      ? canvas.width
      : 300;
  const heightPx =
    typeof canvas?.height === "number" && Number.isFinite(canvas.height) && canvas.height > 0
      ? canvas.height
      : 300;

  const widthRaw = Math.max(widthPx / unit, 1);
  const heightRaw = Math.max(heightPx / unit, 1);

  return {
    viewBox: [-widthRaw / 2, -heightRaw / 2, widthRaw, heightRaw],
    unit,
  };
}

function formatPrimitiveName(type: string): string {
  return type
    .replace(/_3d$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function GeometryRenderer({
  data,
  editableLabels = false,
  onDiagramDataChange,
}: GeometryRendererProps) {
  const { viewBox, unit } = useMemo(() => resolveCanvasConfig(data), [data]);
  const [minX, minY, width, height] = viewBox;
  const maxX = minX + width;
  const maxY = minY + height;

  const transformX = useCallback((x: number): number => x * unit, [unit]);
  const transformY = useCallback((y: number): number => -y * unit, [unit]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<LabelDragState | null>(null);

  const [labelOverrides, setLabelOverrides] = useState<LabelOverrides>(
    data.label_overrides ?? {}
  );
  const labelOverridesRef = useRef<LabelOverrides>(data.label_overrides ?? {});

  useEffect(() => {
    const incomingOverrides = data.label_overrides ?? {};
    setLabelOverrides(incomingOverrides);
    labelOverridesRef.current = incomingOverrides;
  }, [data.label_overrides]);

  const getSvgPointerCoords = useCallback(
    (clientX: number, clientY: number): Vec2 | null => {
      const svg = svgRef.current;
      if (!svg) {
        return null;
      }

      const matrix = svg.getScreenCTM();
      if (!matrix) {
        return null;
      }

      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;

      const transformed = point.matrixTransform(matrix.inverse());
      return [transformed.x, transformed.y];
    },
    []
  );

  const applyLabelOffset = useCallback(
    (labelKey: string, x: number, y: number): Vec2 => {
      const offset = labelOverrides[labelKey];
      if (!offset) {
        return [x, y];
      }

      return [x + offset.dx, y + offset.dy];
    },
    [labelOverrides]
  );

  const commitLabelOverrides = useCallback(
    (nextOverrides: LabelOverrides) => {
      if (!onDiagramDataChange) {
        return;
      }

      const roundedEntries = Object.entries(nextOverrides)
        .map(([key, offset]) => [
          key,
          {
            dx: Math.round(offset.dx * 100) / 100,
            dy: Math.round(offset.dy * 100) / 100,
          },
        ] as const)
        .filter(
          ([, offset]) => Math.abs(offset.dx) > 0.5 || Math.abs(offset.dy) > 0.5
        );

      const normalizedOverrides = Object.fromEntries(roundedEntries) as LabelOverrides;

      if (Object.keys(normalizedOverrides).length > 0) {
        onDiagramDataChange({
          ...data,
          label_overrides: normalizedOverrides,
        });
        return;
      }

      const nextData: DiagramData = {
        ...data,
      };
      delete nextData.label_overrides;
      onDiagramDataChange(nextData);
    },
    [data, onDiagramDataChange]
  );

  const beginLabelDrag = useCallback(
    (event: React.PointerEvent<Element>, labelKey: string) => {
      if (!editableLabels) {
        return;
      }

      const pointer = getSvgPointerCoords(event.clientX, event.clientY);
      if (!pointer) {
        return;
      }

      const startOffset = labelOverridesRef.current[labelKey] ?? { dx: 0, dy: 0 };
      dragStateRef.current = {
        labelKey,
        pointerStart: pointer,
        startOffset,
      };

      if ("setPointerCapture" in event.currentTarget) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      event.stopPropagation();
    },
    [editableLabels, getSvgPointerCoords]
  );

  const estimateLabelBox = useCallback((text: string, fontSize: number) => {
    const normalized = text
      .replace(/\$+/g, "")
      .replace(/\\[a-zA-Z]+/g, "x")
      .replace(/[{}_^]/g, "")
      .trim();
    const length = Math.max(normalized.length, 1);
    const width = Math.max(26, Math.min(220, length * fontSize * 0.72 + 12));
    const height = Math.max(24, fontSize * 1.9);
    return { width, height };
  }, []);

  const handleSvgPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!editableLabels || !dragStateRef.current) {
        return;
      }

      const pointer = getSvgPointerCoords(event.clientX, event.clientY);
      if (!pointer) {
        return;
      }

      const { labelKey, pointerStart, startOffset } = dragStateRef.current;
      const nextOffset: LabelOffset = {
        dx: startOffset.dx + (pointer[0] - pointerStart[0]),
        dy: startOffset.dy + (pointer[1] - pointerStart[1]),
      };

      setLabelOverrides((previous) => {
        const next = {
          ...previous,
          [labelKey]: nextOffset,
        };
        labelOverridesRef.current = next;
        return next;
      });
    },
    [editableLabels, getSvgPointerCoords]
  );

  const endLabelDrag = useCallback(() => {
    if (!dragStateRef.current) {
      return;
    }

    dragStateRef.current = null;
    commitLabelOverrides(labelOverridesRef.current);
  }, [commitLabelOverrides]);

  const renderLabelText = useCallback(
    (options: RenderLabelOptions) => {
      const [finalX, finalY] = applyLabelOffset(options.labelKey, options.x, options.y);
      const fontSize = options.fontSize ?? 12;
      const textAnchor = options.textAnchor ?? "middle";
      const { width: boxWidth, height: boxHeight } = estimateLabelBox(options.text, fontSize);
      const boxX =
        textAnchor === "start"
          ? finalX
          : textAnchor === "end"
            ? finalX - boxWidth
            : finalX - boxWidth / 2;
      const boxY = finalY - boxHeight / 2;

      return (
        <foreignObject
          key={options.labelKey}
          x={boxX}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          onPointerDown={(event) => beginLabelDrag(event, options.labelKey)}
        >
          <div
            className="w-full h-full flex items-center justify-center leading-none [&&_.katex-display]:m-0 [&_p]:m-0"
            style={{
              color: options.fill,
              fontSize: `${fontSize}px`,
              cursor: editableLabels ? "grab" : "default",
              userSelect: "none",
              textShadow: "0 0 2px #f9fafb, 0 0 2px #f9fafb",
            }}
          >
            {parseLatex(options.text)}
          </div>
        </foreignObject>
      );
    },
    [applyLabelOffset, beginLabelDrag, editableLabels, estimateLabelBox]
  );

  const editable3DLabelGroups = useMemo<Editable3DLabelGroup[]>(() => {
    const groups: Editable3DLabelGroup[] = [];

    data.primitives.forEach((primitive, primitiveIndex) => {
      const fields = get3DLabelFieldSpecs(primitive);
      if (fields.length === 0) {
        return;
      }

      groups.push({
        primitiveIndex,
        primitive,
        fields,
      });
    });

    return groups;
  }, [data.primitives]);

  const updatePrimitiveLabelField = useCallback(
    (primitiveIndex: number, field: string, value: string) => {
      if (!onDiagramDataChange) {
        return;
      }

      const nextPrimitives = data.primitives.map((primitive, index) => {
        if (index !== primitiveIndex) {
          return primitive;
        }

        return setLabelFieldValue(primitive, field, value);
      });

      onDiagramDataChange({
        ...data,
        primitives: nextPrimitives,
      });
    },
    [data, onDiagramDataChange]
  );

  const pointMap = useMemo(() => {
    const map = new Map<string, Vec2>();
    data.primitives.forEach((primitive) => {
      if (primitive.type === "point") {
        map.set(primitive.id, primitive.coords);
      }
    });
    return map;
  }, [data.primitives]);

  const getPointRawCoords = useCallback(
    (id: string): Vec2 | null => {
      const point = pointMap.get(id);
      return point ?? null;
    },
    [pointMap]
  );

  const getPointCoords = useCallback(
    (id: string): Vec2 | null => {
      const raw = getPointRawCoords(id);
      if (!raw) {
        return null;
      }
      return [transformX(raw[0]), transformY(raw[1])];
    },
    [getPointRawCoords, transformX, transformY]
  );

  const axisPrimitive = data.primitives.find(
    (primitive): primitive is AxisPrimitive => primitive.type === "axis"
  );

  const functionXRange = useMemo<Vec2>(
    () => axisPrimitive?.x_range ?? [minX, maxX],
    [axisPrimitive, minX, maxX]
  );

  const contentBounds = useMemo(() => {
    const bounds = {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    };

    for (const [primitiveIndex, primitive] of data.primitives.entries()) {
      const strokeWidth = primitive.stroke_width ?? 2;
      const linePadding = strokeWidth / 2 + 2;

      const handled2D = apply2DPrimitiveBounds({
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
      });

      if (handled2D) {
        continue;
      }

      apply3DPrimitiveBounds({
        primitive,
        primitiveIndex,
        bounds,
        linePadding,
        unit,
        transformX,
        transformY,
        applyLabelOffset,
      });
    }

    if (
      Number.isFinite(bounds.minX) &&
      Number.isFinite(bounds.minY) &&
      Number.isFinite(bounds.maxX) &&
      Number.isFinite(bounds.maxY)
    ) {
      return bounds;
    }

    // Fallback when no drawable primitive could contribute bounds.
    return createSvgBounds(
      transformX(minX),
      transformY(maxY),
      transformX(maxX),
      transformY(minY)
    );
  }, [
    applyLabelOffset,
    data.primitives,
    functionXRange,
    height,
    maxX,
    maxY,
    minX,
    minY,
    getPointRawCoords,
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

  const canEdit3DFields =
    editableLabels && Boolean(onDiagramDataChange) && editable3DLabelGroups.length > 0;

  return (
    <div className="w-full max-w-md mx-auto my-4 space-y-3">
      <svg
        ref={svgRef}
        viewBox={svgViewBox}
        className="w-full h-auto rounded border border-gray-200 bg-white"
        role="img"
        aria-label="Geometry diagram"
        onPointerMove={handleSvgPointerMove}
        onPointerUp={endLabelDrag}
        onPointerCancel={endLabelDrag}
        style={editableLabels ? { touchAction: "none" } : undefined}
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

          const rendered2D = render2DPrimitive({
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
          });

          if (rendered2D !== undefined) {
            return rendered2D;
          }

          const rendered3D = render3DPrimitive({
            primitive,
            index,
            key,
            strokeColor,
            strokeWidth,
            strokeDasharray,
            unit,
            transformX,
            transformY,
            renderLabelText,
          });

          if (rendered3D !== undefined) {
            return rendered3D;
          }

          return null;
        })}
      </svg>

      {canEdit3DFields && (
        <div className="rounded border border-gray-200 bg-gray-50 p-3 space-y-3">
          <p className="text-xs font-semibold text-gray-700">
            Edit 3D labels (updates JSON fields directly)
          </p>
          {editable3DLabelGroups.map((group) => (
            <div
              key={`primitive-editor-${group.primitiveIndex}`}
              className="rounded border border-gray-200 bg-white p-2 space-y-2"
            >
              <p className="text-xs font-medium text-gray-700">
                {formatPrimitiveName(group.primitive.type)} #{group.primitiveIndex + 1}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.fields.map((fieldSpec) => (
                  <label
                    key={`primitive-${group.primitiveIndex}-${fieldSpec.field}`}
                    className="flex flex-col gap-1"
                  >
                    <span className="text-[11px] font-medium text-gray-600">{fieldSpec.label}</span>
                    <input
                      type="text"
                      value={readLabelFieldRaw(group.primitive, fieldSpec.field) ?? ""}
                      onChange={(event) =>
                        updatePrimitiveLabelField(
                          group.primitiveIndex,
                          fieldSpec.field,
                          event.target.value
                        )
                      }
                      placeholder={fieldSpec.field}
                      className="h-8 rounded border border-gray-300 px-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
