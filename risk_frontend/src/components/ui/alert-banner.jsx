import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, AlertTriangle, X, Info } from "lucide-react";

const variantStyles = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: CheckCircle,
    iconColor: "text-green-600",
    titleColor: "text-green-800",
    descColor: "text-green-600",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: AlertCircle,
    iconColor: "text-red-600",
    titleColor: "text-red-800",
    descColor: "text-red-600",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    titleColor: "text-amber-800",
    descColor: "text-amber-600",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Info,
    iconColor: "text-blue-600",
    titleColor: "text-blue-800",
    descColor: "text-blue-600",
  },
};

export default function AlertBanner({ variant = "success", title, description, action, onClose, className }) {
  const style = variantStyles[variant] || variantStyles.success;
  const IconComponent = style.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        style.bg,
        style.border,
        className
      )}
    >
      <IconComponent size={18} className={cn("mt-0.5 shrink-0", style.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-medium", style.titleColor)}>{title}</p>
        {description && (
          <p className={cn("text-xs mt-0.5", style.descColor)}>{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onClose && (
        <button onClick={onClose} className={cn("shrink-0 p-0.5 rounded hover:opacity-70", style.iconColor)}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}
