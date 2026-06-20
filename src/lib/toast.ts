import { createElement } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';

interface NotifyOptions {
  description?: string;
}

/**
 * Toasts unificados para toda la app. Una sola voz para success / error / info / warning,
 * con iconografía y tokens consistentes (en vez de llamar a `toast` con estilos ad-hoc).
 */
export const notify = {
  success: (message: string, opts?: NotifyOptions) =>
    toast.success(message, {
      description: opts?.description,
      icon: createElement(CheckCircle2, { className: 'h-4 w-4 text-success' }),
    }),
  error: (message: string, opts?: NotifyOptions) =>
    toast.error(message, {
      description: opts?.description,
      icon: createElement(XCircle, { className: 'h-4 w-4 text-error' }),
    }),
  info: (message: string, opts?: NotifyOptions) =>
    toast(message, {
      description: opts?.description,
      icon: createElement(Info, { className: 'h-4 w-4 text-info' }),
    }),
  warning: (message: string, opts?: NotifyOptions) =>
    toast.warning(message, {
      description: opts?.description,
      icon: createElement(AlertTriangle, { className: 'h-4 w-4 text-warning' }),
    }),
};
