import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <ShieldAlert className="h-12 w-12 text-navy-300" />
      <h1 className="text-3xl font-bold text-navy-900">Página não encontrada</h1>
      <p className="max-w-md text-graphite-500">A página que você procura não existe ou foi movida.</p>
      <Link to="/" className="btn-primary">
        Voltar ao início
      </Link>
    </div>
  );
}
