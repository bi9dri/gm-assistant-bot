import z from "zod";

export const BaseNodeDataSchema = z.object({
  executedAt: z.coerce.date().optional(),
});

export type BaseNodeData = z.infer<typeof BaseNodeDataSchema>;

// Node width constants (multiples of 16px)
export const NODE_WIDTHS = {
  sm: 192, // 12 × 16
  md: 256, // 16 × 16
  lg: 480, // 30 × 16
  xl: 640, // 40 × 16
} as const;

export type NodeWidth = (typeof NODE_WIDTHS)[keyof typeof NODE_WIDTHS];

export const NODE_TYPE_WIDTHS: Record<string, NodeWidth> = {
  CreateRole: NODE_WIDTHS.md,
  DeleteRole: NODE_WIDTHS.md,
  CreateCategory: NODE_WIDTHS.md,
  DeleteCategory: NODE_WIDTHS.md,
  CreateChannel: NODE_WIDTHS.lg,
} as const;

export const DEFAULT_NODE_WIDTH = NODE_WIDTHS.md;
