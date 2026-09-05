import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES } from "../../middleware/rbac";
import { baixarModelo, simularImportacao, confirmarImportacao } from "./controller";

/** Planilha e' arquivo de escritorio, nao imagem nem PDF: o uploadAny do projeto so aceita
 * esses dois, entao a importacao tem o proprio filtro. */
const uploadPlanilha = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const permitidos = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
    ];
    if (permitidos.includes(file.mimetype) || file.originalname.toLowerCase().endsWith(".xlsx")) cb(null, true);
    else cb(new Error("Envie a planilha em .xlsx."));
  },
});

export const importsRouter = Router();

importsRouter.use(requireAuth, requireRole(...CMMS_ROLES));

importsRouter.get("/modelo", baixarModelo);
importsRouter.post("/simular", uploadPlanilha.single("file"), simularImportacao);
importsRouter.post("/confirmar", uploadPlanilha.single("file"), confirmarImportacao);
