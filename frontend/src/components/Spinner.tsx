import { Loader2 } from "lucide-react";

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function FullPageSpinner({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 text-graphite-500">
      <Spinner className="h-8 w-8 text-navy-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-graphite-500">
      <Spinner className="h-5 w-5" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
