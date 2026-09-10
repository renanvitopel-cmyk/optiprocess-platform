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
const AssetTypesList = lazyPagina(() => import("./pages/admin/instruments/AssetTypesList"));
const TechnicalCatalogsHub = lazyPagina(() => import("./pages/admin/instruments/TechnicalCatalogsHub"));
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
const PortalContract = lazyPagina(() => import("./pages/portal/PortalContract"));

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
                <Route path="instrumentos/:id" element={<InstrumentDetail />} />

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
                <Route path="perfil" element={<PortalProfile />} />

                <Route element={<ProtectedRoute roles={["CLIENT", "CLIENT_PLANNER", "CLIENT_TECHNICIAN"]} />}>
                  <Route index element={<PortalDashboard />} />
                  <Route path="instrumentos" element={<PortalInstruments />} />
                  <Route path="instrumentos/:id" element={<PortalInstrumentDetail />} />
                  <Route path="certificados" element={<PortalCertificates />} />
                  <Route path="certificados/:id" element={<PortalCertificateDetail />} />
                  <Route path="laudos" element={<PortalReports />} />
                  <Route path="ordens-servico" element={<PortalServiceOrders />} />
                  <Route path="ordens-servico/:id" element={<PortalServiceOrderDetail />} />
                  <Route path="contratos" element={<PortalContracts />} />
                  <Route path="pedidos" element={<PortalOrders />} />
                </Route>

                <Route element={<ProtectedRoute roles={["CLIENT", "CLIENT_PLANNER"]} />}>
                  <Route path="instrumentos/cadastros" element={<TechnicalCatalogsHub />} />
                  <Route path="instrumentos/tipos" element={<AssetTypesList />} />
                </Route>

                {/* Contrato mexe na empresa inteira: so o Administrador. */}
                <Route element={<ProtectedRoute roles={["CLIENT"]} />}>
                  <Route path="contrato" element={<PortalContract />} />
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
