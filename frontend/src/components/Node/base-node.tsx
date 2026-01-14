// https://reactflow.dev/ui/components/base-node
// Copyright (c) 2019-2025 webkid GmbH
import type { ComponentProps } from "react";

import { Handle, type HandleProps } from "@xyflow/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { NodeWidth } from "./base-schema";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface BaseNodeProps extends ComponentProps<"div"> {
  width?: NodeWidth;
}

export function BaseNode({ className, width, style, ...props }: BaseNodeProps) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground relative rounded-md border",
        "hover:ring-1",
        // React Flow displays node elements inside of a `NodeWrapper` component,
        // which compiles down to a div with the class `react-flow__node`.
        // When a node is selected, the class `selected` is added to the
        // `react-flow__node` element. This allows us to style the node when it
        // is selected, using Tailwind's `&` selector.
        "[.react-flow\\_\\_node.selected_&]:border-muted-foreground",
        "[.react-flow\\_\\_node.selected_&]:shadow-lg",
        className,
      )}
      style={width ? { width: `${width}px`, ...style } : style}
      tabIndex={0}
      {...props}
    />
  );
}

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export function BaseNodeHeader({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      {...props}
      className={cn(
        "mx-0 my-0 -mb-1 flex flex-row items-center justify-between gap-2 px-3 py-2",
        // Remove or modify these classes if you modify the padding in the
        // `<BaseNode />` component.
        className,
      )}
    />
  );
}

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export function BaseNodeHeaderTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="base-node-title"
      className={cn("user-select-none flex-1 font-semibold", className)}
      {...props}
    />
  );
}

interface BaseNodeContentProps extends ComponentProps<"div"> {
  maxHeight?: number;
}

export function BaseNodeContent({ className, maxHeight, ...props }: BaseNodeContentProps) {
  return (
    <div
      data-slot="base-node-content"
      className={cn("flex flex-col gap-y-2 p-3", maxHeight && "overflow-y-auto nowheel", className)}
      style={maxHeight ? { maxHeight: `${maxHeight}px` } : undefined}
      {...props}
    />
  );
}

export function BaseNodeFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="base-node-footer"
      className={cn("flex flex-col items-center gap-y-2 border-t px-3 pt-2 pb-3", className)}
      {...props}
    />
  );
}

export type BaseHandleProps = HandleProps;

export function BaseHandle({ className, children, ...props }: ComponentProps<typeof Handle>) {
  return (
    <Handle
      {...props}
      className={cn(
        "dark:border-secondary dark:bg-secondary rounded-full border border-slate-300 bg-slate-100 transition",
        className,
      )}
      style={{ width: "11px", height: "11px" }}
    >
      {children}
    </Handle>
  );
}

const flexDirections = {
  top: "flex-col",
  right: "flex-row-reverse justify-end",
  bottom: "flex-col-reverse justify-end",
  left: "flex-row",
};

export function LabeledHandle({
  className,
  labelClassName,
  handleClassName,
  title,
  position,
  ...props
}: HandleProps &
  ComponentProps<"div"> & {
    title: string;
    handleClassName?: string;
    labelClassName?: string;
  }) {
  const { ref, ...handleProps } = props;

  return (
    <div
      title={title}
      className={cn("relative flex items-center", flexDirections[position], className)}
      ref={ref}
    >
      <BaseHandle position={position} className={handleClassName} {...handleProps} />
      <label className={cn("text-foreground px-3", labelClassName)}>{title}</label>
    </div>
  );
}
