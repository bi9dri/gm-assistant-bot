import z from "zod";

export const BaseNodeDataSchema = z.object({
  executedAt: z.coerce.date().optional(),
});

export type BaseNodeData = z.infer<typeof BaseNodeDataSchema>;

// Node width constants (multiples of 16px)
export const NODE_WIDTHS = {
  xs: 192, // 12 × 16
  sm: 224, // 14 × 16
  md: 256, // 16 × 16
  lg: 288, // 18 × 16
  xl: 320, // 20 × 16
  "2xl": 384, // 24 × 16
} as const;

export type NodeWidth = (typeof NODE_WIDTHS)[keyof typeof NODE_WIDTHS];

export const NODE_TYPE_WIDTHS: Record<string, NodeWidth> = {
  CreateRole: NODE_WIDTHS.xl,
  DeleteRole: NODE_WIDTHS.lg,
} as const;

export const DEFAULT_NODE_WIDTH = NODE_WIDTHS.md;
