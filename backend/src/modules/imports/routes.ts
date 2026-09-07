import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth";
import { requireRole, CMMS_ROLES, CMMS_ADMIN_ROLES } from "../../middleware/rbac";
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

// Baixar o modelo e' inofensivo. Importar mexe na estrutura inteira da empresa de uma vez -
// fica com o Administrador, que e' quem responde por ela.
importsRouter.get("/modelo", baixarModelo);
importsRouter.post("/simular", requireRole(...CMMS_ADMIN_ROLES), uploadPlanilha.single("file"), simularImportacao);
importsRouter.post("/confirmar", requireRole(...CMMS_ADMIN_ROLES), uploadPlanilha.single("file"), confirmarImportacao);
