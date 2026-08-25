import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Send, Info, Trash2 } from "lucide-react";

const iconMap = {
  send: Send,
  warning: AlertTriangle,
  info: Info,
  destructive: Trash2,
};

export default function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Sahkan",
  cancelText = "Batal",
  variant = "default",
  icon,
  onConfirm,
  onCancel,
  className,
}) {
  const IconComponent = icon ? iconMap[icon] || icon : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[380px]", className)}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            {IconComponent && (
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  variant === "destructive"
                    ? "bg-red-50 text-red-600"
                    : variant === "warning"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-blue-50 text-blue-600"
                )}
              >
                <IconComponent size={20} />
              </div>
            )}
            <div>
              <DialogTitle className="text-[14px] font-medium">{title}</DialogTitle>
              <DialogDescription className="text-[13px] mt-1 leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onCancel?.();
              onOpenChange?.(false);
            }}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            size="sm"
            onClick={() => {
              onConfirm?.();
              onOpenChange?.(false);
            }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
