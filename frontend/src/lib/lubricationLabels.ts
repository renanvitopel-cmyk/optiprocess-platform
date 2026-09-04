import type {
  LubricantBase,
  LubricantType,
  LubricationCondition,
  MachineStateForLubrication,
} from "../api/types";

export const TIPOS_DE_LUBRIFICANTE: Record<LubricantType, string> = {
  GREASE: "Graxa",
  OIL: "Oleo",
  OTHER: "Outro",
};

export const BASES_DE_LUBRIFICANTE: Record<LubricantBase, string> = {
  MINERAL: "Mineral",
  SYNTHETIC: "Sintetica",
  SEMI_SYNTHETIC: "Semissintetica",
};

/** Estado da maquina exigido no ponto. Nao e' burocracia: lubrificar acoplamento girando
 * e' acidente, e o campo existe para a ordem avisar antes de alguem chegar la. */
export const ESTADOS_DA_MAQUINA: Record<MachineStateForLubrication, string> = {
  STOPPED: "So com a maquina parada",
  RUNNING: "Com a maquina em operacao",
  ANY: "Tanto faz",
};

export const CONDICOES_DO_PONTO: Record<LubricationCondition, string> = {
  NORMAL: "Normal",
  LOW: "Nivel baixo",
  DRY: "Seco",
  CONTAMINATED: "Contaminado",
  EXCESS: "Excesso",
};
