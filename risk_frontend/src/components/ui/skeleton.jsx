import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function Spinner({ className, ...props }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} {...props} />;
}

function Skeleton({ className, ...props }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Spinner, Skeleton };
