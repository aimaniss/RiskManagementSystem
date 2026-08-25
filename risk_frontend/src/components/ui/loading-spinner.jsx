import React from "react";
import { cn } from "@/lib/utils";

export default function LoadingSpinner({ text = "Memproses...", subtext, size = "md", className }) {
  const sizeClasses = {
    sm: "h-5 w-5 border-2",
    md: "h-7 w-7 border-[3px]",
    lg: "h-9 w-9 border-[3px]",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-blue-200 border-t-blue-600",
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="mt-3 text-sm font-medium text-foreground">{text}</p>
      )}
      {subtext && (
        <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
      )}
    </div>
  );
}
