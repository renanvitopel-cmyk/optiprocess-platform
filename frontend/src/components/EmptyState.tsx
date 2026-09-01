import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <div className="rounded-full bg-navy-50 p-3 text-navy-500">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <p className="font-semibold text-navy-900">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-graphite-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <p className="font-medium text-safety-red">{message}</p>
      {onRetry && (
        <button type="button" className="btn-outline btn-sm" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
