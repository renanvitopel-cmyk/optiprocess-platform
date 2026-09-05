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
const TechnicalCatalogsHub = lazy(() => import("./pages/admin/instruments/TechnicalCatalogsHub"));
const PlantsList = lazy(() => import("./pages/admin/instruments/PlantsList"));
const AreasList = lazy(() => import("./pages/admin/instruments/AreasList"));
const AssetSystemsList = lazy(() => import("./pages/admin/instruments/AssetSystemsList"));
const CostCentersList = lazy(() => import("./pages/admin/instruments/CostCentersList"));
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
const PlatformDashboard = lazy(() => import("./pages/admin/platform/PlatformDashboard"));
const PlansList = lazy(() => import("./pages/admin/platform/PlansList"));
const MaintenanceDashboard = lazy(() => import("./pages/admin/maintenance/MaintenanceDashboard"));
const MaintenancePlansList = lazy(() => import("./pages/admin/maintenance/MaintenancePlansList"));
const MaintenancePlanForm = lazy(() => import("./pages/admin/maintenance/MaintenancePlanForm"));
const MaintenancePlanDetail = lazy(() => import("./pages/admin/maintenance/MaintenancePlanDetail"));
const MaintenancePlanTemplatesList = lazy(() => import("./pages/admin/maintenance/MaintenancePlanTemplatesList"));
const WorkOrdersList = lazy(() => import("./pages/admin/maintenance/WorkOrdersList"));
const KanbanBoard = lazy(() => import("./pages/admin/maintenance/KanbanBoard"));
const SchedulingBoard = lazy(() => import("./pages/admin/maintenance/SchedulingBoard"));
const PredictivePanel = lazy(() => import("./pages/admin/maintenance/PredictivePanel"));
const RcaList = lazy(() => import("./pages/admin/maintenance/RcaList"));
const RcaForm = lazy(() => import("./pages/admin/maintenance/RcaForm"));
const LubricationDashboard = lazy(() => import("./pages/admin/lubrication/LubricationDashboard"));
const LubricationPointsList = lazy(() => import("./pages/admin/lubrication/LubricationPointsList"));
const LubricationRoutesList = lazy(() => import("./pages/admin/lubrication/LubricationRoutesList"));
const LubricantsList = lazy(() => import("./pages/admin/lubrication/LubricantsList"));
const LubricationForecast = lazy(() => import("./pages/admin/lubrication/LubricationForecast"));
const DataImport = lazy(() => import("./pages/admin/imports/DataImport"));
const PortalContract = lazy(() => import("./pages/portal/PortalContract"));
const LubricationHistory = lazy(() => import("./pages/admin/lubrication/LubricationHistory"));
const FailureAnalysis = lazy(() => import("./pages/admin/maintenance/FailureAnalysis"));
const WorkOrderForm = lazy(() => import("./pages/admin/maintenance/WorkOrderForm"));
const WorkOrderDetail = lazy(() => import("./pages/admin/maintenance/WorkOrderDetail"));
const ServiceRequestsList = lazy(() => import("./pages/admin/maintenance/ServiceRequestsList"));
const ServiceRequestForm = lazy(() => import("./pages/admin/maintenance/ServiceRequestForm"));
const ServiceRequestDetail = lazy(() => import("./pages/admin/maintenance/ServiceRequestDetail"));
const FailureCodesList = lazy(() => import("./pages/admin/maintenance/FailureCodesList"));
const StoppageReasonsList = lazy(() => import("./pages/admin/maintenance/StoppageReasonsList"));
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
                <Route path="contrato" element={<PortalContract />} />
                <Route path="perfil" element={<AdminProfile />} />

                <Route path="clientes" element={<ClientsList />} />
                <Route path="clientes/:id" element={<ClientDetail />} />

                <Route path="instrumentos" element={<InstrumentsList />} />
                <Route path="instrumentos/tipos" element={<AssetTypesList />} />
                <Route path="instrumentos/cadastros" element={<TechnicalCatalogsHub />} />
                <Route path="instrumentos/plantas" element={<PlantsList />} />
                <Route path="instrumentos/areas" element={<AreasList />} />
                <Route path="instrumentos/sistemas" element={<AssetSystemsList />} />
                <Route path="instrumentos/centros-custo" element={<CostCentersList />} />
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

                {/* O CMMS e' o produto vendido ao cliente e operado por ele. Na gestao da
                    OptiProcess ele existe so como acesso master do dono da plataforma. */}
                <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
                  <Route path="manutencao" element={<MaintenanceDashboard />} />
                  <Route path="manutencao/planos" element={<MaintenancePlansList />} />
                  <Route path="manutencao/planos/novo" element={<MaintenancePlanForm />} />
                  <Route path="manutencao/planos/:id/editar" element={<MaintenancePlanForm />} />
                  <Route path="manutencao/planos/:id" element={<MaintenancePlanDetail />} />
                  <Route path="manutencao/modelos-de-plano" element={<MaintenancePlanTemplatesList />} />
                  <Route path="manutencao/ordens" element={<WorkOrdersList />} />
                  <Route path="manutencao/kanban" element={<KanbanBoard />} />
                  <Route path="manutencao/programacao" element={<SchedulingBoard />} />
                  <Route path="manutencao/preditiva" element={<PredictivePanel />} />
                  <Route path="manutencao/ordens/novo" element={<WorkOrderForm />} />
                  <Route path="manutencao/ordens/:id/editar" element={<WorkOrderForm />} />
                  <Route path="manutencao/ordens/:id" element={<WorkOrderDetail />} />
                  <Route path="manutencao/solicitacoes" element={<ServiceRequestsList />} />
                  <Route path="manutencao/solicitacoes/novo" element={<ServiceRequestForm />} />
                  <Route path="manutencao/solicitacoes/:id" element={<ServiceRequestDetail />} />
                  <Route path="manutencao/falhas" element={<FailureCodesList />} />
                  <Route path="manutencao/pareto" element={<FailureAnalysis />} />
                  <Route path="manutencao/rca" element={<RcaList />} />
                  <Route path="manutencao/rca/novo" element={<RcaForm />} />
                  <Route path="manutencao/rca/:id" element={<RcaForm />} />
                  <Route path="manutencao/paradas" element={<StoppageReasonsList />} />
                  <Route path="lubrificacao" element={<LubricationDashboard />} />
                  <Route path="lubrificacao/pontos" element={<LubricationPointsList />} />
                  <Route path="lubrificacao/rotas" element={<LubricationRoutesList />} />
                  <Route path="lubrificacao/lubrificantes" element={<LubricantsList />} />
                  <Route path="lubrificacao/previsao" element={<LubricationForecast />} />
                  <Route path="lubrificacao/historico" element={<LubricationHistory />} />
                  <Route path="manutencao/importar" element={<DataImport />} />
                  <Route path="manutencao/almoxarifado" element={<SparePartsList />} />
                  <Route path="manutencao/mao-de-obra" element={<LaborResourcesList />} />
                </Route>

                <Route path="produtos" element={<ProductsListAdmin />} />
                <Route path="produtos/:id" element={<ProductDetailAdmin />} />

                <Route path="orcamentos" element={<QuotesList />} />
                <Route path="orcamentos/:id" element={<QuoteDetail />} />

                <Route path="pedidos" element={<OrdersList />} />
                <Route path="pedidos/:id" element={<OrderDetail />} />

                <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
                  <Route path="usuarios" element={<UsersList />} />
                  <Route path="auditoria" element={<AuditLog />} />
                  <Route path="plataforma" element={<PlatformDashboard />} />
                  <Route path="plataforma/planos" element={<PlansList />} />
                </Route>
              </Route>
            </Route>

            <Route element={<ProtectedRoute roles={["CLIENT"]} />}>
              <Route path="/portal" element={<ClientPortalLayout />}>
                <Route index element={<PortalDashboard />} />
                <Route path="instrumentos" element={<PortalInstruments />} />
                <Route path="instrumentos/tipos" element={<AssetTypesList />} />
                <Route path="instrumentos/cadastros" element={<TechnicalCatalogsHub />} />
                <Route path="instrumentos/plantas" element={<PlantsList />} />
                <Route path="instrumentos/areas" element={<AreasList />} />
                <Route path="instrumentos/sistemas" element={<AssetSystemsList />} />
                <Route path="instrumentos/centros-custo" element={<CostCentersList />} />
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
                <Route path="manutencao/modelos-de-plano" element={<MaintenancePlanTemplatesList />} />
                <Route path="manutencao/ordens" element={<WorkOrdersList />} />
                <Route path="manutencao/kanban" element={<KanbanBoard />} />
                <Route path="manutencao/programacao" element={<SchedulingBoard />} />
                <Route path="manutencao/preditiva" element={<PredictivePanel />} />
                <Route path="manutencao/ordens/novo" element={<WorkOrderForm />} />
                <Route path="manutencao/ordens/:id/editar" element={<WorkOrderForm />} />
                <Route path="manutencao/ordens/:id" element={<WorkOrderDetail />} />
                <Route path="manutencao/solicitacoes" element={<ServiceRequestsList />} />
                <Route path="manutencao/solicitacoes/novo" element={<ServiceRequestForm />} />
                <Route path="manutencao/solicitacoes/:id" element={<ServiceRequestDetail />} />
                <Route path="manutencao/falhas" element={<FailureCodesList />} />
                <Route path="manutencao/pareto" element={<FailureAnalysis />} />
                <Route path="manutencao/rca" element={<RcaList />} />
                <Route path="manutencao/rca/novo" element={<RcaForm />} />
                <Route path="manutencao/rca/:id" element={<RcaForm />} />
                <Route path="manutencao/paradas" element={<StoppageReasonsList />} />
                <Route path="manutencao/arvore" element={<PortalInstrumentsTree />} />
                <Route path="lubrificacao" element={<LubricationDashboard />} />
                <Route path="lubrificacao/pontos" element={<LubricationPointsList />} />
                <Route path="lubrificacao/rotas" element={<LubricationRoutesList />} />
                <Route path="lubrificacao/lubrificantes" element={<LubricantsList />} />
                <Route path="lubrificacao/previsao" element={<LubricationForecast />} />
                <Route path="lubrificacao/historico" element={<LubricationHistory />} />
                <Route path="manutencao/importar" element={<DataImport />} />
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
