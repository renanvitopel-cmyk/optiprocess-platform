import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "node:path";
import { env } from "./config/env";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

import { authRouter } from "./modules/auth/routes";
import { usersRouter } from "./modules/users/routes";
import { clientsRouter } from "./modules/clients/routes";
import { instrumentsRouter } from "./modules/instruments/routes";
import { calibrationsRouter } from "./modules/calibrations/routes";
import { serviceOrdersRouter } from "./modules/serviceOrders/routes";
import { technicalReportsRouter } from "./modules/technicalReports/routes";
import { contractsRouter } from "./modules/contracts/routes";
import { productsRouter } from "./modules/products/routes";
import { quotesRouter } from "./modules/quotes/routes";
import { ordersRouter } from "./modules/orders/routes";
import { attachmentsRouter } from "./modules/attachments/routes";
import { auditRouter } from "./modules/audit/routes";
import { notificationsRouter } from "./modules/notifications/routes";
import { dashboardRouter } from "./modules/dashboard/routes";
import { searchRouter } from "./modules/search/routes";
import { publicRouter } from "./modules/public/routes";
import { localStorageRouter } from "./modules/localStorage/routes";
import { metersRouter } from "./modules/meters/routes";
import { failureCodesRouter } from "./modules/failureCodes/routes";
import { assetTypesRouter } from "./modules/assetTypes/routes";
import { laborTypesRouter } from "./modules/laborTypes/routes";
import { laborResourcesRouter } from "./modules/laborResources/routes";
import { maintenancePlansRouter } from "./modules/maintenancePlans/routes";
import { maintenanceWorkOrdersRouter } from "./modules/maintenanceWorkOrders/routes";
import { sparePartsRouter } from "./modules/spareParts/routes";
import { plantsRouter } from "./modules/plants/routes";
import { areasRouter } from "./modules/areas/routes";
import { assetSystemsRouter } from "./modules/assetSystems/routes";
import { costCentersRouter } from "./modules/costCenters/routes";
import { serviceRequestsRouter } from "./modules/serviceRequests/routes";
import { serviceRequestCategoriesRouter } from "./modules/serviceRequestCategories/routes";
import { stoppageReasonsRouter } from "./modules/stoppageReasons/routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: env.isProduction ? env.publicUrl : env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  if (!env.isProduction) app.use(morgan("dev"));

  // Rota de saude: nunca consulta o banco. Aponte monitores de uptime (UptimeRobot
  // etc.) para ca, nunca para "/", para nao manter o Neon acordado o tempo todo.
  app.get("/api/ping", (_req, res) => res.status(200).json({ status: "ok" }));

  app.use("/api/local-storage", localStorageRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/clients", clientsRouter);
  app.use("/api/instruments", instrumentsRouter);
  app.use("/api/calibrations", calibrationsRouter);
  app.use("/api/service-orders", serviceOrdersRouter);
  app.use("/api/technical-reports", technicalReportsRouter);
  app.use("/api/contracts", contractsRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/quotes", quotesRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/attachments", attachmentsRouter);
  app.use("/api/audit-logs", auditRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/meters", metersRouter);
  app.use("/api/failure-codes", failureCodesRouter);
  app.use("/api/asset-types", assetTypesRouter);
  app.use("/api/labor-types", laborTypesRouter);
  app.use("/api/labor-resources", laborResourcesRouter);
  app.use("/api/maintenance-plans", maintenancePlansRouter);
  app.use("/api/maintenance-work-orders", maintenanceWorkOrdersRouter);
  app.use("/api/spare-parts", sparePartsRouter);
  app.use("/api/plants", plantsRouter);
  app.use("/api/areas", areasRouter);
  app.use("/api/asset-systems", assetSystemsRouter);
  app.use("/api/cost-centers", costCentersRouter);
  app.use("/api/service-requests", serviceRequestsRouter);
  app.use("/api/service-request-categories", serviceRequestCategoriesRouter);
  app.use("/api/stoppage-reasons", stoppageReasonsRouter);

  if (env.isProduction) {
    const frontendDist = path.resolve(__dirname, "../../frontend/dist");
    app.use(express.static(frontendDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }

  app.use("/api", notFoundHandler);
  app.use(errorHandler);

  return app;
}
