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
  DeleteChannel: NODE_WIDTHS.md,
  ChangeChannelPermission: NODE_WIDTHS.md,
  AddRoleToRoleMembers: NODE_WIDTHS.md,
  SendMessage: NODE_WIDTHS.lg,
  Blueprint: NODE_WIDTHS.lg,
  SetGameFlag: NODE_WIDTHS.md,
  LabeledGroup: NODE_WIDTHS.xl,
  Comment: NODE_WIDTHS.md,
  RecordCombination: NODE_WIDTHS.lg,
  Kanban: NODE_WIDTHS.xl,
  SelectBranch: NODE_WIDTHS.md,
  ShuffleAssign: NODE_WIDTHS.lg,
} as const;

// LabeledGroup node default dimensions
export const LABELED_GROUP_DEFAULTS = {
  width: NODE_WIDTHS.xl * 2,
  height: 400,
  minWidth: NODE_WIDTHS.md,
  minHeight: 200,
} as const;

export const DEFAULT_NODE_WIDTH = NODE_WIDTHS.md;

// Node content height constants for scrollable areas
export const NODE_CONTENT_HEIGHTS = {
  sm: 200, // Small nodes
  md: 300, // Standard nodes
  lg: 400, // Large/complex nodes
} as const;

export type NodeContentHeight = (typeof NODE_CONTENT_HEIGHTS)[keyof typeof NODE_CONTENT_HEIGHTS];
