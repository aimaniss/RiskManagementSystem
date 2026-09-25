import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export default function StatusStepper({ steps = [], className }) {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const isActive = step.status === "active";
          const isPending = step.status === "pending";
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-all",
                    isCompleted && "bg-blue-600 text-white",
                    isActive && "border-2 border-blue-600 bg-blue-50",
                    isPending && "border-2 border-gray-200 bg-white"
                  )}
                >
                  {isCompleted ? (
                    <Check size={14} className="text-white" />
                  ) : isActive ? (
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                  ) : null}
                </div>
                <span
                  className={cn(
                    "mt-1.5 max-w-[64px] text-center text-[11px] leading-tight sm:max-w-none sm:whitespace-nowrap sm:text-[11.5px]",
                    isCompleted && "text-foreground",
                    isActive && "text-foreground",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-1.5 h-0.5 flex-1 mb-5",
                    isCompleted ? "bg-blue-600" : "bg-gray-200"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
