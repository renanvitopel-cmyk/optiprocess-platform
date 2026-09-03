import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { CartProvider } from "./cart/CartContext";
import { ToastProvider } from "./components/Toast";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { FullPageSpinner } from "./components/Spinner";
import { ScrollToTop } from "./components/ScrollToTop";

import { PublicLayout } from "./layouts/PublicLayout";

import Home from "./pages/public/Home";
import Company from "./pages/public/Company";
import Services from "./pages/public/Services";
import ServiceDetail from "./pages/public/ServiceDetail";
import Products from "./pages/public/Products";
import ProductDetail from "./pages/public/ProductDetail";
import Cart from "./pages/public/Cart";
import RequestQuote from "./pages/public/RequestQuote";
import Contact from "./pages/public/Contact";
import ValidateCertificate from "./pages/public/ValidateCertificate";
import Login from "./pages/auth/Login";
import NotFound from "./pages/NotFound";

// Gestao interna e portal do cliente ficam fora do bundle inicial: so quem faz
// login (nunca um visitante anonimo do site) paga o custo de baixa-los.
const AdminLayout = lazy(() => import("./layouts/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const ClientPortalLayout = lazy(() =>
  import("./layouts/ClientPortalLayout").then((m) => ({ default: m.ClientPortalLayout })),
);

const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProfile = lazy(() => import("./pages/admin/Profile"));
const ClientsList = lazy(() => import("./pages/admin/clients/ClientsList"));
const ClientDetail = lazy(() => import("./pages/admin/clients/ClientDetail"));
const InstrumentsList = lazy(() => import("./pages/admin/instruments/InstrumentsList"));
const InstrumentDetail = lazy(() => import("./pages/admin/instruments/InstrumentDetail"));
const InstrumentsTree = lazy(() => import("./pages/admin/instruments/InstrumentsTree"));
const AssetTypesList = lazy(() => import("./pages/admin/instruments/AssetTypesList"));
const CalibrationsList = lazy(() => import("./pages/admin/calibrations/CalibrationsList"));
const CalibrationForm = lazy(() => import("./pages/admin/calibrations/CalibrationForm"));
const CalibrationDetail = lazy(() => import("./pages/admin/calibrations/CalibrationDetail"));
const TechnicalReportsList = lazy(() => import("./pages/admin/reports/TechnicalReportsList"));
const TechnicalReportDetail = lazy(() => import("./pages/admin/reports/TechnicalReportDetail"));
const ServiceOrdersList = lazy(() => import("./pages/admin/serviceOrders/ServiceOrdersList"));
const ServiceOrderForm = lazy(() => import("./pages/admin/serviceOrders/ServiceOrderForm"));
const ServiceOrderDetail = lazy(() => import("./pages/admin/serviceOrders/ServiceOrderDetail"));
const ContractsList = lazy(() => import("./pages/admin/contracts/ContractsList"));
const ProductsListAdmin = lazy(() => import("./pages/admin/products/ProductsList"));
const ProductDetailAdmin = lazy(() => import("./pages/admin/products/ProductDetail"));
const QuotesList = lazy(() => import("./pages/admin/quotes/QuotesList"));
const QuoteDetail = lazy(() => import("./pages/admin/quotes/QuoteDetail"));
const OrdersList = lazy(() => import("./pages/admin/orders/OrdersList"));
const OrderDetail = lazy(() => import("./pages/admin/orders/OrderDetail"));
const UsersList = lazy(() => import("./pages/admin/users/UsersList"));
const AuditLog = lazy(() => import("./pages/admin/audit/AuditLog"));
const MaintenanceDashboard = lazy(() => import("./pages/admin/maintenance/MaintenanceDashboard"));
const MaintenancePlansList = lazy(() => import("./pages/admin/maintenance/MaintenancePlansList"));
const MaintenancePlanForm = lazy(() => import("./pages/admin/maintenance/MaintenancePlanForm"));
const MaintenancePlanDetail = lazy(() => import("./pages/admin/maintenance/MaintenancePlanDetail"));
const WorkOrdersList = lazy(() => import("./pages/admin/maintenance/WorkOrdersList"));
const WorkOrderForm = lazy(() => import("./pages/admin/maintenance/WorkOrderForm"));
const WorkOrderDetail = lazy(() => import("./pages/admin/maintenance/WorkOrderDetail"));
const FailureCodesList = lazy(() => import("./pages/admin/maintenance/FailureCodesList"));
const SparePartsList = lazy(() => import("./pages/admin/maintenance/SparePartsList"));
const LaborResourcesList = lazy(() => import("./pages/admin/maintenance/LaborResourcesList"));

const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const PortalInstruments = lazy(() => import("./pages/portal/PortalInstruments"));
const PortalInstrumentDetail = lazy(() => import("./pages/portal/PortalInstrumentDetail"));
const PortalCertificates = lazy(() => import("./pages/portal/PortalCertificates"));
const PortalCertificateDetail = lazy(() => import("./pages/portal/PortalCertificateDetail"));
const PortalReports = lazy(() => import("./pages/portal/PortalReports"));
const PortalServiceOrders = lazy(() => import("./pages/portal/PortalServiceOrders"));
const PortalServiceOrderDetail = lazy(() => import("./pages/portal/PortalServiceOrderDetail"));
const PortalContracts = lazy(() => import("./pages/portal/PortalContracts"));
const PortalOrders = lazy(() => import("./pages/portal/PortalOrders"));
const PortalProfile = lazy(() => import("./pages/portal/PortalProfile"));
const PortalSpareParts = lazy(() => import("./pages/portal/PortalSpareParts"));
const PortalInstrumentsTree = lazy(() => import("./pages/portal/PortalInstrumentsTree"));

export default function App() {
  return (
    <ToastProvider>
      <CartProvider>
        <ScrollToTop />
        <Suspense fallback={<FullPageSpinner />}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/empresa" element={<Company />} />
              <Route path="/servicos" element={<Services />} />
              <Route path="/servicos/:slug" element={<ServiceDetail />} />
              <Route path="/produtos" element={<Products />} />
              <Route path="/produtos/:idOrSlug" element={<ProductDetail />} />
              <Route path="/carrinho" element={<Cart />} />
              <Route path="/orcamento" element={<RequestQuote />} />
              <Route path="/contato" element={<Contact />} />
              <Route path="/validar-certificado" element={<ValidateCertificate />} />
              <Route path="/validar-certificado/:code" element={<ValidateCertificate />} />
            </Route>

            <Route path="/entrar" element={<Login />} />

            <Route element={<ProtectedRoute roles={["ADMIN", "TECHNICIAN", "COMMERCIAL"]} />}>
              <Route path="/gestao" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="perfil" element={<AdminProfile />} />

                <Route path="clientes" element={<ClientsList />} />
                <Route path="clientes/:id" element={<ClientDetail />} />

                <Route path="instrumentos" element={<InstrumentsList />} />
                <Route path="instrumentos/tipos" element={<AssetTypesList />} />
                <Route path="instrumentos/:id" element={<InstrumentDetail />} />
                <Route path="manutencao/arvore" element={<InstrumentsTree />} />

                <Route path="calibracoes" element={<CalibrationsList />} />
                <Route path="calibracoes/novo" element={<CalibrationForm />} />
                <Route path="calibracoes/:id" element={<CalibrationDetail />} />

                <Route path="laudos" element={<TechnicalReportsList />} />
                <Route path="laudos/:id" element={<TechnicalReportDetail />} />

                <Route path="ordens-servico" element={<ServiceOrdersList />} />
                <Route path="ordens-servico/novo" element={<ServiceOrderForm />} />
                <Route path="ordens-servico/:id/editar" element={<ServiceOrderForm />} />
                <Route path="ordens-servico/:id" element={<ServiceOrderDetail />} />

                <Route path="contratos" element={<ContractsList />} />

                <Route path="manutencao" element={<MaintenanceDashboard />} />
                <Route path="manutencao/planos" element={<MaintenancePlansList />} />
                <Route path="manutencao/planos/novo" element={<MaintenancePlanForm />} />
                <Route path="manutencao/planos/:id/editar" element={<MaintenancePlanForm />} />
                <Route path="manutencao/planos/:id" element={<MaintenancePlanDetail />} />
                <Route path="manutencao/ordens" element={<WorkOrdersList />} />
                <Route path="manutencao/ordens/novo" element={<WorkOrderForm />} />
                <Route path="manutencao/ordens/:id/editar" element={<WorkOrderForm />} />
                <Route path="manutencao/ordens/:id" element={<WorkOrderDetail />} />
                <Route path="manutencao/falhas" element={<FailureCodesList />} />
                <Route path="manutencao/almoxarifado" element={<SparePartsList />} />
                <Route path="manutencao/mao-de-obra" element={<LaborResourcesList />} />

                <Route path="produtos" element={<ProductsListAdmin />} />
                <Route path="produtos/:id" element={<ProductDetailAdmin />} />

                <Route path="orcamentos" element={<QuotesList />} />
                <Route path="orcamentos/:id" element={<QuoteDetail />} />

                <Route path="pedidos" element={<OrdersList />} />
                <Route path="pedidos/:id" element={<OrderDetail />} />

                <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
                  <Route path="usuarios" element={<UsersList />} />
                  <Route path="auditoria" element={<AuditLog />} />
                </Route>
              </Route>
            </Route>

            <Route element={<ProtectedRoute roles={["CLIENT"]} />}>
              <Route path="/portal" element={<ClientPortalLayout />}>
                <Route index element={<PortalDashboard />} />
                <Route path="instrumentos" element={<PortalInstruments />} />
                <Route path="instrumentos/tipos" element={<AssetTypesList />} />
                <Route path="instrumentos/:id" element={<PortalInstrumentDetail />} />
                <Route path="certificados" element={<PortalCertificates />} />
                <Route path="certificados/:id" element={<PortalCertificateDetail />} />
                <Route path="laudos" element={<PortalReports />} />
                <Route path="ordens-servico" element={<PortalServiceOrders />} />
                <Route path="ordens-servico/:id" element={<PortalServiceOrderDetail />} />
                <Route path="contratos" element={<PortalContracts />} />
                <Route path="pedidos" element={<PortalOrders />} />
                <Route path="manutencao" element={<MaintenanceDashboard />} />
                <Route path="manutencao/planos" element={<MaintenancePlansList />} />
                <Route path="manutencao/planos/novo" element={<MaintenancePlanForm />} />
                <Route path="manutencao/planos/:id/editar" element={<MaintenancePlanForm />} />
                <Route path="manutencao/planos/:id" element={<MaintenancePlanDetail />} />
                <Route path="manutencao/ordens" element={<WorkOrdersList />} />
                <Route path="manutencao/ordens/novo" element={<WorkOrderForm />} />
                <Route path="manutencao/ordens/:id/editar" element={<WorkOrderForm />} />
                <Route path="manutencao/ordens/:id" element={<WorkOrderDetail />} />
                <Route path="manutencao/falhas" element={<FailureCodesList />} />
                <Route path="manutencao/arvore" element={<PortalInstrumentsTree />} />
                <Route path="almoxarifado" element={<PortalSpareParts />} />
                <Route path="manutencao/mao-de-obra" element={<LaborResourcesList />} />
                <Route path="perfil" element={<PortalProfile />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </CartProvider>
    </ToastProvider>
  );
}
