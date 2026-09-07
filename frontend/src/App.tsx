import { Suspense } from "react";
import { lazyPagina } from "./lib/lazyPagina";
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
const AdminLayout = lazyPagina(() => import("./layouts/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const ClientPortalLayout = lazyPagina(() =>
  import("./layouts/ClientPortalLayout").then((m) => ({ default: m.ClientPortalLayout })),
);

const Dashboard = lazyPagina(() => import("./pages/admin/Dashboard"));
const AdminProfile = lazyPagina(() => import("./pages/admin/Profile"));
const ClientsList = lazyPagina(() => import("./pages/admin/clients/ClientsList"));
const ClientDetail = lazyPagina(() => import("./pages/admin/clients/ClientDetail"));
const InstrumentsList = lazyPagina(() => import("./pages/admin/instruments/InstrumentsList"));
const InstrumentDetail = lazyPagina(() => import("./pages/admin/instruments/InstrumentDetail"));
const InstrumentsTree = lazyPagina(() => import("./pages/admin/instruments/InstrumentsTree"));
const AssetTypesList = lazyPagina(() => import("./pages/admin/instruments/AssetTypesList"));
const TechnicalCatalogsHub = lazyPagina(() => import("./pages/admin/instruments/TechnicalCatalogsHub"));
const PlantsList = lazyPagina(() => import("./pages/admin/instruments/PlantsList"));
const AreasList = lazyPagina(() => import("./pages/admin/instruments/AreasList"));
const AssetSystemsList = lazyPagina(() => import("./pages/admin/instruments/AssetSystemsList"));
const CalibrationsList = lazyPagina(() => import("./pages/admin/calibrations/CalibrationsList"));
const CalibrationForm = lazyPagina(() => import("./pages/admin/calibrations/CalibrationForm"));
const CalibrationDetail = lazyPagina(() => import("./pages/admin/calibrations/CalibrationDetail"));
const TechnicalReportsList = lazyPagina(() => import("./pages/admin/reports/TechnicalReportsList"));
const TechnicalReportDetail = lazyPagina(() => import("./pages/admin/reports/TechnicalReportDetail"));
const ServiceOrdersList = lazyPagina(() => import("./pages/admin/serviceOrders/ServiceOrdersList"));
const ServiceOrderForm = lazyPagina(() => import("./pages/admin/serviceOrders/ServiceOrderForm"));
const ServiceOrderDetail = lazyPagina(() => import("./pages/admin/serviceOrders/ServiceOrderDetail"));
const ContractsList = lazyPagina(() => import("./pages/admin/contracts/ContractsList"));
const ProductsListAdmin = lazyPagina(() => import("./pages/admin/products/ProductsList"));
const ProductDetailAdmin = lazyPagina(() => import("./pages/admin/products/ProductDetail"));
const QuotesList = lazyPagina(() => import("./pages/admin/quotes/QuotesList"));
const QuoteDetail = lazyPagina(() => import("./pages/admin/quotes/QuoteDetail"));
const OrdersList = lazyPagina(() => import("./pages/admin/orders/OrdersList"));
const OrderDetail = lazyPagina(() => import("./pages/admin/orders/OrderDetail"));
const UsersList = lazyPagina(() => import("./pages/admin/users/UsersList"));
const AuditLog = lazyPagina(() => import("./pages/admin/audit/AuditLog"));
const PlatformDashboard = lazyPagina(() => import("./pages/admin/platform/PlatformDashboard"));
const PlansList = lazyPagina(() => import("./pages/admin/platform/PlansList"));
const MaintenanceDashboard = lazyPagina(() => import("./pages/admin/maintenance/MaintenanceDashboard"));
const MaintenancePlansList = lazyPagina(() => import("./pages/admin/maintenance/MaintenancePlansList"));
const MaintenancePlanForm = lazyPagina(() => import("./pages/admin/maintenance/MaintenancePlanForm"));
const MaintenancePlanDetail = lazyPagina(() => import("./pages/admin/maintenance/MaintenancePlanDetail"));
const MaintenancePlanTemplatesList = lazyPagina(() => import("./pages/admin/maintenance/MaintenancePlanTemplatesList"));
const WorkOrdersList = lazyPagina(() => import("./pages/admin/maintenance/WorkOrdersList"));
const KanbanBoard = lazyPagina(() => import("./pages/admin/maintenance/KanbanBoard"));
const SchedulingBoard = lazyPagina(() => import("./pages/admin/maintenance/SchedulingBoard"));
const PlanningBoard = lazyPagina(() => import("./pages/admin/maintenance/PlanningBoard"));
const PredictivePanel = lazyPagina(() => import("./pages/admin/maintenance/PredictivePanel"));
const RcaList = lazyPagina(() => import("./pages/admin/maintenance/RcaList"));
const RcaForm = lazyPagina(() => import("./pages/admin/maintenance/RcaForm"));
const LubricationDashboard = lazyPagina(() => import("./pages/admin/lubrication/LubricationDashboard"));
const LubricationPointsList = lazyPagina(() => import("./pages/admin/lubrication/LubricationPointsList"));
const LubricationRoutesList = lazyPagina(() => import("./pages/admin/lubrication/LubricationRoutesList"));
const LubricantsList = lazyPagina(() => import("./pages/admin/lubrication/LubricantsList"));
const LubricationForecast = lazyPagina(() => import("./pages/admin/lubrication/LubricationForecast"));
const DataImport = lazyPagina(() => import("./pages/admin/imports/DataImport"));
const PortalContract = lazyPagina(() => import("./pages/portal/PortalContract"));
const LubricationHistory = lazyPagina(() => import("./pages/admin/lubrication/LubricationHistory"));
const FailureAnalysis = lazyPagina(() => import("./pages/admin/maintenance/FailureAnalysis"));
const WorkOrderForm = lazyPagina(() => import("./pages/admin/maintenance/WorkOrderForm"));
const WorkOrderDetail = lazyPagina(() => import("./pages/admin/maintenance/WorkOrderDetail"));
const ServiceRequestsList = lazyPagina(() => import("./pages/admin/maintenance/ServiceRequestsList"));
const ServiceRequestForm = lazyPagina(() => import("./pages/admin/maintenance/ServiceRequestForm"));
const ServiceRequestDetail = lazyPagina(() => import("./pages/admin/maintenance/ServiceRequestDetail"));
const FailureCodesList = lazyPagina(() => import("./pages/admin/maintenance/FailureCodesList"));
const StoppageReasonsList = lazyPagina(() => import("./pages/admin/maintenance/StoppageReasonsList"));
const LaborTypesList = lazyPagina(() => import("./pages/admin/maintenance/LaborTypesList"));
const SparePartsList = lazyPagina(() => import("./pages/admin/maintenance/SparePartsList"));
const LaborResourcesList = lazyPagina(() => import("./pages/admin/maintenance/LaborResourcesList"));

const PortalDashboard = lazyPagina(() => import("./pages/portal/PortalDashboard"));
const PortalInstruments = lazyPagina(() => import("./pages/portal/PortalInstruments"));
const PortalInstrumentDetail = lazyPagina(() => import("./pages/portal/PortalInstrumentDetail"));
const PortalCertificates = lazyPagina(() => import("./pages/portal/PortalCertificates"));
const PortalCertificateDetail = lazyPagina(() => import("./pages/portal/PortalCertificateDetail"));
const PortalReports = lazyPagina(() => import("./pages/portal/PortalReports"));
const PortalServiceOrders = lazyPagina(() => import("./pages/portal/PortalServiceOrders"));
const PortalServiceOrderDetail = lazyPagina(() => import("./pages/portal/PortalServiceOrderDetail"));
const PortalContracts = lazyPagina(() => import("./pages/portal/PortalContracts"));
const PortalOrders = lazyPagina(() => import("./pages/portal/PortalOrders"));
const PortalProfile = lazyPagina(() => import("./pages/portal/PortalProfile"));
const PortalSpareParts = lazyPagina(() => import("./pages/portal/PortalSpareParts"));
const PortalInstrumentsTree = lazyPagina(() => import("./pages/portal/PortalInstrumentsTree"));

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
                  <Route path="manutencao/planejamento" element={<PlanningBoard />} />
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
                  <Route path="manutencao/tipos-mao-de-obra" element={<LaborTypesList />} />
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

            {/* Todo o portal e' da equipe do cliente. Os blocos aninhados abaixo separam o
                que cada perfil alcanca - a mesma regra que a API cobra em cada rota, porque
                esconder o item do menu nunca foi permissao: quem sabe a URL entra assim mesmo. */}
            <Route element={<ProtectedRoute roles={["CLIENT", "CLIENT_PLANNER", "CLIENT_TECHNICIAN", "REQUESTER"]} />}>
              <Route path="/portal" element={<ClientPortalLayout />}>
                {/* Solicitante: so as proprias solicitacoes e o proprio perfil. */}
                <Route path="manutencao/solicitacoes" element={<ServiceRequestsList />} />
                <Route path="manutencao/solicitacoes/novo" element={<ServiceRequestForm />} />
                <Route path="manutencao/solicitacoes/:id" element={<ServiceRequestDetail />} />
                <Route path="perfil" element={<PortalProfile />} />

                {/* Equipe de manutencao: consulta o parque e trabalha nas ordens. */}
                <Route element={<ProtectedRoute roles={["CLIENT", "CLIENT_PLANNER", "CLIENT_TECHNICIAN"]} />}>
                  <Route index element={<PortalDashboard />} />
                  <Route path="instrumentos" element={<PortalInstruments />} />
                  <Route path="instrumentos/:id" element={<PortalInstrumentDetail />} />
                  <Route path="manutencao/arvore" element={<PortalInstrumentsTree />} />
                  <Route path="certificados" element={<PortalCertificates />} />
                  <Route path="certificados/:id" element={<PortalCertificateDetail />} />
                  <Route path="laudos" element={<PortalReports />} />
                  <Route path="ordens-servico" element={<PortalServiceOrders />} />
                  <Route path="ordens-servico/:id" element={<PortalServiceOrderDetail />} />
                  <Route path="contratos" element={<PortalContracts />} />
                  <Route path="pedidos" element={<PortalOrders />} />
                  <Route path="manutencao" element={<MaintenanceDashboard />} />
                  <Route path="manutencao/ordens" element={<WorkOrdersList />} />
                  <Route path="manutencao/ordens/:id" element={<WorkOrderDetail />} />
                  <Route path="manutencao/kanban" element={<KanbanBoard />} />
                  <Route path="almoxarifado" element={<PortalSpareParts />} />
                  <Route path="lubrificacao" element={<LubricationDashboard />} />
                  <Route path="lubrificacao/pontos" element={<LubricationPointsList />} />
                  <Route path="lubrificacao/rotas" element={<LubricationRoutesList />} />
                  <Route path="lubrificacao/historico" element={<LubricationHistory />} />
                </Route>

                {/* Planejamento: monta plano, programa, aprova e olha custo. O Tecnico
                    executa o que foi programado, entao nao reestrutura nada disto. */}
                <Route element={<ProtectedRoute roles={["CLIENT", "CLIENT_PLANNER"]} />}>
                  <Route path="instrumentos/cadastros" element={<TechnicalCatalogsHub />} />
                  <Route path="instrumentos/tipos" element={<AssetTypesList />} />
                  <Route path="instrumentos/plantas" element={<PlantsList />} />
                  <Route path="instrumentos/areas" element={<AreasList />} />
                  <Route path="instrumentos/sistemas" element={<AssetSystemsList />} />
                  <Route path="manutencao/planos" element={<MaintenancePlansList />} />
                  <Route path="manutencao/planos/novo" element={<MaintenancePlanForm />} />
                  <Route path="manutencao/planos/:id/editar" element={<MaintenancePlanForm />} />
                  <Route path="manutencao/planos/:id" element={<MaintenancePlanDetail />} />
                  <Route path="manutencao/modelos-de-plano" element={<MaintenancePlanTemplatesList />} />
                  <Route path="manutencao/ordens/novo" element={<WorkOrderForm />} />
                  <Route path="manutencao/ordens/:id/editar" element={<WorkOrderForm />} />
                  <Route path="manutencao/programacao" element={<SchedulingBoard />} />
                  <Route path="manutencao/planejamento" element={<PlanningBoard />} />
                  <Route path="manutencao/preditiva" element={<PredictivePanel />} />
                  <Route path="manutencao/falhas" element={<FailureCodesList />} />
                  <Route path="manutencao/pareto" element={<FailureAnalysis />} />
                  <Route path="manutencao/rca" element={<RcaList />} />
                  <Route path="manutencao/rca/novo" element={<RcaForm />} />
                  <Route path="manutencao/rca/:id" element={<RcaForm />} />
                  <Route path="manutencao/paradas" element={<StoppageReasonsList />} />
                  <Route path="manutencao/mao-de-obra" element={<LaborResourcesList />} />
                  <Route path="manutencao/tipos-mao-de-obra" element={<LaborTypesList />} />
                  <Route path="lubrificacao/lubrificantes" element={<LubricantsList />} />
                  <Route path="lubrificacao/previsao" element={<LubricationForecast />} />
                </Route>

                {/* Contrato e importacao mexem na empresa inteira: so o Administrador. */}
                <Route element={<ProtectedRoute roles={["CLIENT"]} />}>
                  <Route path="contrato" element={<PortalContract />} />
                  <Route path="manutencao/importar" element={<DataImport />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </CartProvider>
    </ToastProvider>
  );
}
