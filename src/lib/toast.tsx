import { toast as sonnerToast } from "sonner";
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";

/**
 * Premium toast notification utility using sonner
 * Provides consistent, visually appealing notifications with icons
 */

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      duration: 3000,
    });
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      duration: 5000,
    });
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      icon: <Info className="h-5 w-5 text-blue-500" />,
      duration: 3000,
    });
  },
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      duration: 4000,
    });
  },
};
