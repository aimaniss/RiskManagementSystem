import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, AlertTriangle, X, Info } from "lucide-react";

const variantStyles = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    borderLeft: "border-l-green-600",
    icon: CheckCircle,
    iconColor: "text-green-600",
    textColor: "text-green-800",
    subColor: "text-green-600",
    progress: "bg-green-500",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    borderLeft: "border-l-red-600",
    icon: AlertCircle,
    iconColor: "text-red-600",
    textColor: "text-red-800",
    subColor: "text-red-600",
    progress: "bg-red-500",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    borderLeft: "border-l-amber-500",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    textColor: "text-amber-800",
    subColor: "text-amber-600",
    progress: "bg-amber-500",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    borderLeft: "border-l-blue-600",
    icon: Info,
    iconColor: "text-blue-600",
    textColor: "text-blue-800",
    subColor: "text-blue-600",
    progress: "bg-blue-600",
  },
};

export default function Toast({ variant = "success", title, message, action, onClose, autoClose = 5000, className }) {
  const style = variantStyles[variant] || variantStyles.success;
  const IconComponent = style.icon;

  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => onClose(), autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 overflow-hidden rounded-lg border border-l-[3px] px-4 py-3 shadow-md animate-in slide-in-from-right-full",
        style.bg,
        style.border,
        style.borderLeft,
        className
      )}
    >
      <IconComponent size={18} className={cn("mt-0.5 shrink-0", style.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-medium", style.textColor)}>{title}</p>
        {message && (
          <p className={cn("text-xs mt-0.5", style.subColor)}>{message}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onClose && (
        <button
          onClick={onClose}
          className={cn("shrink-0 p-0.5 rounded hover:opacity-70", style.iconColor)}
        >
          <X size={14} />
        </button>
      )}
      {autoClose && onClose && (
        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-black/5">
          <div
            className={cn("h-full origin-left", style.progress)}
            style={{ animation: `toast-progress ${autoClose}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  );
}
