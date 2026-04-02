export type Vec2 = [number, number];
export type StrokeStyle = "solid" | "dashed";

export type LabelPosition =
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
  label_radius?: string;
  label_height?: string;
}

export interface Cylinder3DPrimitive extends BasePrimitive {
  type: "cylinder_3d";
  center_bottom_coords: Vec2;
  radius: number;
  height: number;
  label_radius?: string;
  label_height?: string;
}

export interface Cone3DPrimitive extends BasePrimitive {
  type: "cone_3d";
  center_bottom_coords: Vec2;
  radius: number;
  height: number;
  label_radius?: string;
  label_height?: string;
  label_slant?: string;
}

export interface RectangularPrism3DPrimitive extends BasePrimitive {
  type: "rectangular_prism_3d";
  origin_coords: Vec2;
  width: number;
  height: number;
  depth: number;
  label_width?: string;
  label_height?: string;
  label_depth?: string;
}

export interface TriangularPrism3DPrimitive extends BasePrimitive {
  type: "triangular_prism_3d";
  base_vertices: Vec2[];
  height: number;
  label_height?: string;
  label_side_1?: string;
  label_side_2?: string;
  label_side_3?: string;
}

export interface QuadrilateralPrism3DPrimitive extends BasePrimitive {
  type: "quadrilateral_prism_3d";
  base_vertices: Vec2[];
  height: number;
  label_height?: string;
  label_side_1?: string;
  label_side_2?: string;
  label_side_3?: string;
  label_side_4?: string;
}

export interface TriangularPyramid3DPrimitive extends BasePrimitive {
  type: "triangular_pyramid_3d";
  center_base_coords: Vec2;
  base_side: number;
  height: number;
  label_side?: string;
  label_height?: string;
  label_slant?: string;
}

export interface QuadrilateralPyramid3DPrimitive extends BasePrimitive {
  type: "quadrilateral_pyramid_3d";
  center_base_coords: Vec2;
  base_side: number;
  height: number;
  label_side?: string;
  label_height?: string;
  label_slant?: string;
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
  | RectangularPrism3DPrimitive
  | TriangularPrism3DPrimitive
  | QuadrilateralPrism3DPrimitive
  | TriangularPyramid3DPrimitive
  | QuadrilateralPyramid3DPrimitive;

export interface LabelOffset {
  dx: number;
  dy: number;
}

export type LabelOverrides = Record<string, LabelOffset>;

export interface DiagramData {
  canvas: {
    viewBox: [number, number, number, number];
    unit: number;
  };
  primitives: DiagramPrimitive[];
  label_overrides?: LabelOverrides;
}
