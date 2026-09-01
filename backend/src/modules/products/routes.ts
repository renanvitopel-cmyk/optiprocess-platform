import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { attachUserIfPresent } from "../../middleware/auth";
import {
  listProducts,
  getProduct,
  listProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  listInventoryMovements,
  createInventoryMovement,
} from "./controller";

export const productsRouter = Router();

// Leitura e publica (catalogo do site), mas reconhece staff logado para ver tudo.
productsRouter.get("/", attachUserIfPresent, listProducts);
productsRouter.get("/categories", listProductCategories);
productsRouter.get("/:idOrSlug", attachUserIfPresent, getProduct);

productsRouter.post("/categories", requireAuth, requireRole("ADMIN", "COMMERCIAL"), createProductCategory);
productsRouter.patch("/categories/:id", requireAuth, requireRole("ADMIN", "COMMERCIAL"), updateProductCategory);
productsRouter.delete("/categories/:id", requireAuth, requireRole("ADMIN"), deleteProductCategory);

productsRouter.post("/", requireAuth, requireRole("ADMIN", "COMMERCIAL"), createProduct);
productsRouter.patch("/:id", requireAuth, requireRole("ADMIN", "COMMERCIAL"), updateProduct);
productsRouter.delete("/:id", requireAuth, requireRole("ADMIN"), deleteProduct);

productsRouter.get("/:id/inventory-movements", requireAuth, requireRole("ADMIN", "COMMERCIAL"), listInventoryMovements);
productsRouter.post("/:id/inventory-movements", requireAuth, requireRole("ADMIN", "COMMERCIAL"), createInventoryMovement);
