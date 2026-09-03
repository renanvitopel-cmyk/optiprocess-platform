import { Factory, Workflow, Cog, Component, CircleDot, type LucideIcon } from "lucide-react";
import type { AssetHierarchyLevel } from "../api/types";

export const ASSET_LEVEL_LABELS: Record<AssetHierarchyLevel, string> = {
  PLANT: "Planta",
  AREA: "Área",
  MACHINE: "Máquina",
  SUBASSEMBLY: "Subconjunto",
  PART: "Parte",
};

export const ASSET_LEVEL_OPTIONS = (Object.keys(ASSET_LEVEL_LABELS) as AssetHierarchyLevel[]).map((value) => ({
  value,
  label: ASSET_LEVEL_LABELS[value],
}));

/** Icone por nivel na arvore de ativos - so estetico, nao afeta o que pode ser filho de que. */
export const ASSET_LEVEL_ICONS: Record<AssetHierarchyLevel, LucideIcon> = {
  PLANT: Factory,
  AREA: Workflow,
  MACHINE: Cog,
  SUBASSEMBLY: Component,
  PART: CircleDot,
};
