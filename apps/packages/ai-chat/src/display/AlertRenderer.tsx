import type { DisplayAlert } from "@agentic-backbone/ai-sdk";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert.js";

type AlertVariant = "info" | "warning" | "error" | "success";

const VARIANT_CONFIG: Record<AlertVariant, { Icon: typeof Info; className?: string }> = {
  info: { Icon: Info, className: "text-blue-600 dark:text-blue-400 *:[svg]:text-blue-600 dark:*:[svg]:text-blue-400 border-blue-500/50" },
  warning: { Icon: AlertTriangle, className: "text-yellow-600 dark:text-yellow-400 *:[svg]:text-yellow-600 dark:*:[svg]:text-yellow-400 border-yellow-500/50" },
  error: { Icon: AlertCircle },
  success: { Icon: CheckCircle, className: "text-green-600 dark:text-green-400 *:[svg]:text-green-600 dark:*:[svg]:text-green-400 border-green-500/50" },
};

export function AlertRenderer({ variant = "info", title, message }: DisplayAlert) {
  const { Icon, className } = VARIANT_CONFIG[variant as AlertVariant];

  return (
    <Alert
      variant={variant === "error" ? "destructive" : "default"}
      className={className}
    >
      <Icon />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
