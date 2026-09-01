import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { Building2, BadgeCheck, ClipboardList, FileWarning, PackageX } from "lucide-react";
import { getAdminDashboard } from "../../api/dashboard";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { FullPageSpinner } from "../../components/Spinner";
import { StatusBadge } from "../../components/StatusBadge";
import { formatCurrency, formatDate, clientDisplayName } from "../../lib/format";
import { EmptyState } from "../../components/EmptyState";

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-dashboard"], queryFn: getAdminDashboard });

  if (isLoading || !data) return <FullPageSpinner />;

  const chartData = data.charts.revenueByMonth.map((r, i) => ({
    month: r.month.slice(5),
    faturamento: r.total,
    servicos: data.charts.servicesByMonth[i]?.total ?? 0,
  }));

  return (
    <div>
      <PageHeader title="Dashboard" description="Visao geral das operacoes da OptiProcess" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clientes ativos" value={data.kpis.activeClients} icon={Building2} tone="navy" to="/gestao/clientes" />
        <StatCard
          label="Calibracoes proximas do vencimento"
          value={data.kpis.calibrationsDueSoon}
          icon={BadgeCheck}
          tone="yellow"
          to="/gestao/calibracoes"
        />
        <StatCard
          label="Ordens de servico em aberto"
          value={data.kpis.openServiceOrders}
          icon={ClipboardList}
          tone="navy"
          to="/gestao/ordens-servico"
        />
        <StatCard
          label="Laudos aguardando emissao"
          value={data.kpis.reportsAwaitingApproval}
          icon={FileWarning}
          tone="red"
          to="/gestao/laudos"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-navy-900">Faturamento estimado (6 meses)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7ea" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#7c8493" />
              <YAxis tick={{ fontSize: 12 }} stroke="#7c8493" tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Line type="monotone" dataKey="faturamento" stroke="#25406a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-navy-900">Servicos por periodo</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7ea" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#7c8493" />
              <YAxis tick={{ fontSize: 12 }} stroke="#7c8493" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="servicos" fill="#F5B400" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-navy-900">Proximos servicos agendados</h2>
          {data.upcomingServiceOrders.length === 0 ? (
            <EmptyState title="Nada agendado" description="Nao ha ordens de servico agendadas no momento." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.upcomingServiceOrders.map((so) => (
                <li key={so.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-graphite-800">
                      {so.number} - {clientDisplayName(so.client)}
                    </p>
                    <p className="text-xs text-graphite-400">{so.technician?.name ?? "Sem tecnico"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-graphite-600">{formatDate(so.scheduledDate)}</p>
                    <StatusBadge status={so.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-navy-900">
            <PackageX className="h-4 w-4 text-safety-red" /> Estoque baixo
          </h2>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-sm text-graphite-500">Nenhum produto com estoque baixo.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.lowStockProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-graphite-700">{p.name}</span>
                  <span className="font-semibold text-safety-red">
                    {p.stockQty}/{p.minStock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h2 className="mb-4 font-semibold text-navy-900">Vendas e pedidos recentes</h2>
        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-graphite-500">Nenhum pedido registrado ainda.</p>
        ) : (
          <div className="table-shell">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.number}</td>
                    <td>{clientDisplayName(o.client)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>{formatCurrency(o.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
