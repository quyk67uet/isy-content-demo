import type { DiagramPrimitive } from "./types";

interface LabelFieldConfig {
  field: string;
  label: string;
  aliases: string[];
}

const LABEL_FIELD_CONFIGS: Record<string, LabelFieldConfig> = {
  label_radius: {
    field: "label_radius",
    label: "Radius",
    aliases: ["label_r", "radius_label", "labelRadius", "r_label"],
  },
  label_height: {
    field: "label_height",
    label: "Height",
    aliases: ["label_h", "height_label", "labelHeight", "h_label"],
  },
  label_slant: {
    field: "label_slant",
    label: "Slant",
    aliases: ["label_l", "slant_label", "labelSlant", "label_slant_height", "d_label", "l_label"],
  },
  label_side: {
    field: "label_side",
    label: "Side",
    aliases: ["side_label", "labelSide", "label_a", "a_label"],
  },
  label_width: {
    field: "label_width",
    label: "Width",
    aliases: ["width_label", "labelWidth", "label_w", "w_label"],
  },
  label_depth: {
    field: "label_depth",
    label: "Depth",
    aliases: ["depth_label", "labelDepth", "label_d", "d_label"],
  },
  label_side_1: {
    field: "label_side_1",
    label: "Side 1",
    aliases: ["side_1_label", "labelSide1", "label_s1", "label_side1"],
  },
  label_side_2: {
    field: "label_side_2",
    label: "Side 2",
    aliases: ["side_2_label", "labelSide2", "label_s2", "label_side2"],
  },
  label_side_3: {
    field: "label_side_3",
    label: "Side 3",
    aliases: ["side_3_label", "labelSide3", "label_s3", "label_side3"],
  },
  label_side_4: {
    field: "label_side_4",
    label: "Side 4",
    aliases: ["side_4_label", "labelSide4", "label_s4", "label_side4"],
  },
};

function getFieldConfig(field: string): LabelFieldConfig {
  return LABEL_FIELD_CONFIGS[field] ?? { field, label: field, aliases: [] };
}

function getFieldCandidates(field: string): string[] {
  const config = getFieldConfig(field);
  return [config.field, ...config.aliases];
}

function readStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

export function readLabelFieldRaw(primitive: DiagramPrimitive, field: string): string | undefined {
  const record = primitive as unknown as Record<string, unknown>;
  for (const key of getFieldCandidates(field)) {
    const value = readStringField(record, key);
    if (value) {
      return value;
    }
  }
  return undefined;
}

export function setLabelFieldValue<T extends DiagramPrimitive>(
  primitive: T,
  field: string,
  value: string
): T {
  const config = getFieldConfig(field);
  const next = { ...primitive } as T & Record<string, unknown>;

  if (value.trim()) {
    next[config.field] = value;
  } else {
    delete next[config.field];
  }

  for (const alias of config.aliases) {
    delete next[alias];
  }

  return next;
}

export interface LabelFieldSpec {
  field: string;
  label: string;
}

function toFieldSpecs(fields: string[]): LabelFieldSpec[] {
  return fields.map((field) => {
    const config = getFieldConfig(field);
    return {
      field: config.field,
      label: config.label,
    };
  });
}

export function get3DLabelFieldSpecs(primitive: DiagramPrimitive): LabelFieldSpec[] {
  switch (primitive.type) {
    case "sphere_3d":
      return toFieldSpecs(["label_radius"]);

    case "cylinder_3d":
      return toFieldSpecs(["label_radius", "label_height"]);

    case "cone_3d":
      return toFieldSpecs(["label_radius", "label_height", "label_slant"]);

    case "triangular_pyramid_3d":
    case "quadrilateral_pyramid_3d":
      return toFieldSpecs(["label_side", "label_height", "label_slant"]);

    case "rectangular_prism_3d":
      return toFieldSpecs(["label_width", "label_height", "label_depth"]);

    case "triangular_prism_3d":
      return toFieldSpecs(["label_height", "label_side_1", "label_side_2", "label_side_3"]);

    case "quadrilateral_prism_3d":
      return toFieldSpecs([
        "label_height",
        "label_side_1",
        "label_side_2",
        "label_side_3",
        "label_side_4",
      ]);

    default:
      return [];
  }
}
