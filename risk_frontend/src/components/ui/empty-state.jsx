import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export default function EmptyState({
  icon: Icon,
  title = "Tiada data",
  description,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed py-10 px-6 text-center",
        className
      )}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 mb-3">
          <Icon size={24} className="text-blue-600" />
        </div>
      )}
      <p className="text-[14px] font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" className="mt-4 gap-1.5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
