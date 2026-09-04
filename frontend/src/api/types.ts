export type Role = "ADMIN" | "TECHNICIAN" | "COMMERCIAL" | "CLIENT";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  clientId: string | null;
  client: { id: string; companyName: string; tradeName: string | null; contractedServices: ServiceCategory[] } | null;
}

export interface PortalUserRef {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastLoginAt: string | null;
}

export type ClientStatus = "ACTIVE" | "INACTIVE" | "PROSPECT";

export interface ClientRef {
  id: string;
  companyName: string;
  tradeName: string | null;
}

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  isPrimary: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number | null;
  maxUsers: number | null;
  maxInstruments: number | null;
  features: string[];
  active: boolean;
  createdAt: string;
  _count?: { clients: number };
}

export interface PlanUsage {
  current: number;
  limit: number | null;
}

export interface Client {
  id: string;
  companyName: string;
  tradeName: string | null;
  cnpj: string | null;
  stateRegistration: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  technicalContactName: string | null;
  commercialContactName: string | null;
  status: ClientStatus;
  contractedServices: ServiceCategory[];
  planId: string | null;
  plan?: Plan | { id: string; name: string } | null;
  planStartedAt: string | null;
  planUsage?: { users: PlanUsage; instruments: PlanUsage };
  notes: string | null;
  createdAt: string;
  contacts?: ClientContact[];
  /** Usuarios de portal (role CLIENT) ja vinculados a esta empresa. */
  users?: PortalUserRef[];
  _count?: { instruments: number; serviceOrders: number; contracts: number; calibrations?: number; orders?: number };
}

export type ServiceCategory =
  | "ELECTRICAL_MAINTENANCE"
  | "PANEL_MAINTENANCE"
  | "MOTOR_MAINTENANCE"
  | "TECHNICAL_REPORT"
  | "CALIBRATION"
  | "TECHNICAL_ASSISTANCE"
  | "EV_CHARGER"
  | "CMMS_MAINTENANCE"
  | "OTHER";

export type ServiceOrderStatus = "BUDGET" | "APPROVED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
export type ServiceOrderItemType = "CHECKLIST" | "MATERIAL";

export interface ServiceOrderItem {
  id: string;
  serviceOrderId: string;
  type: ServiceOrderItemType;
  description: string;
  done: boolean | null;
  quantity: number | null;
  unit: string | null;
}

export interface InstrumentRef {
  id: string;
  type: string;
  model: string | null;
  serialNumber: string | null;
  tag: string | null;
  description?: string | null;
}

export interface ServiceOrder {
  id: string;
  number: string;
  clientId: string;
  client?: ClientRef;
  instrumentId: string | null;
  instrument?: InstrumentRef | null;
  siteAddress: string;
  category: ServiceCategory;
  description: string;
  technicianId: string | null;
  technician?: { id: string; name: string } | null;
  scheduledDate: string | null;
  deadline: string | null;
  laborHours: number | null;
  status: ServiceOrderStatus;
  clientApprovedAt: string | null;
  createdAt: string;
  items?: ServiceOrderItem[];
}

export type InstrumentStatus = "VALID" | "DUE_SOON" | "EXPIRED" | "IN_MAINTENANCE";
export type OperationalStatus = "IN_OPERATION" | "STOPPED" | "STANDBY" | "DEACTIVATED" | "IN_MAINTENANCE";

export interface Instrument {
  id: string;
  clientId: string;
  client?: ClientRef;
  type: string;
  tag: string | null;
  /** Nome do ativo em linguagem de gente - junto do TAG e' o que identifica nas telas. */
  description: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  measurementRange: string | null;
  resolution: string | null;
  unit: string | null;
  installationLocation: string | null;
  calibrationFrequencyMonths: number | null;
  lastCalibrationDate: string | null;
  nextDueDate: string | null;
  status: InstrumentStatus;
  derivedStatus?: InstrumentStatus;
  // Quanto uma parada deste ativo pesa pra empresa - guia prioridade de OS e estoque.
  criticality: MaintenancePriority;
  // Condicao operacional agora - independente do status de calibracao acima.
  operationalStatus: OperationalStatus;
  // Nivel hierarquico resolvido a partir do catalogo AssetType (por nome) - so pra
  // escolher o icone certo na arvore de ativos, ausente quando o tipo nao tem nivel definido.
  assetTypeLevel?: AssetHierarchyLevel | null;
  calibrations?: CalibrationSummary[];
  // Arvore de ativos: um filho e' um Ativo completo apontando para o pai.
  parentId?: string | null;
  parent?: InstrumentRef | null;
  children?: InstrumentRef[];
  // Localizacao/classificacao do ativo (opcionais) - complementam a arvore pai/filho.
  plantId?: string | null;
  plant?: { id: string; name: string } | null;
  areaId?: string | null;
  area?: { id: string; name: string } | null;
  systemId?: string | null;
  system?: { id: string; name: string } | null;
  costCenterId?: string | null;
  costCenter?: { id: string; name: string } | null;
}

export type CalibrationResult = "APPROVED" | "APPROVED_WITH_RESTRICTION" | "REJECTED";
export type PointResult = "PASS" | "FAIL";
export type DocumentStatus = "DRAFT" | "ISSUED";

export interface CalibrationPoint {
  id?: string;
  standardValue: number;
  indicatedValue: number;
  error: number;
  tolerance: number;
  uncertainty: number;
  result: PointResult;
}

export interface CalibrationStandard {
  id?: string;
  description: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  certificateNumber?: string | null;
  certificateValidUntil?: string | null;
  laboratory?: string | null;
}

export type AttachmentCategory = "LOCATION" | "INSTRUMENT" | "STANDARD" | "MEASUREMENT" | "DOCUMENT" | "OTHER";

export interface CalibrationAttachment {
  id: string;
  category: AttachmentCategory;
  caption: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface CalibrationSummary {
  id: string;
  certificateNumber: string;
  calibrationDate: string;
  validUntil: string;
  result: CalibrationResult;
  status: DocumentStatus;
  visibleToClient: boolean;
  revisionNumber: number;
}

export interface Calibration {
  id: string;
  certificateNumber: string;
  clientId: string;
  client?: ClientRef;
  instrumentId: string;
  instrument?: Instrument;
  serviceOrderId: string | null;
  serviceOrder?: { id: string; number: string } | null;
  calibrationDate: string;
  location: string;
  technicianId: string;
  technician?: { id: string; name: string };
  standardUsed: string | null;
  traceability: string | null;
  procedure: string | null;
  coverageFactorK: number | null;
  ambientTemperature: number | null;
  ambientHumidity: number | null;
  environmentalNotes: string | null;
  result: CalibrationResult;
  technicalConclusion: string;
  observations: string | null;
  validUntil: string;
  issuedAt: string | null;
  standards: CalibrationStandard[];
  status: DocumentStatus;
  visibleToClient: boolean;
  qrCodeToken: string;
  qrCodeUrl?: string;
  qrCodeDataUrl?: string;
  revisionNumber: number;
  previousRevisionId: string | null;
  points: CalibrationPoint[];
  pdfAttachment: { id: string; fileName: string; mimeType: string; sizeBytes: number } | null;
  createdAt: string;
}

export type TechnicalReportCategory =
  | "ELECTRICAL_INSTALLATION"
  | "THERMOGRAPHY"
  | "GROUNDING"
  | "SPDA"
  | "OTHER";

export interface TechnicalReport {
  id: string;
  number: string;
  category: TechnicalReportCategory;
  clientId: string;
  client?: ClientRef;
  location: string;
  responsibleId: string;
  responsible?: { id: string; name: string };
  reportDate: string;
  validUntil: string | null;
  status: DocumentStatus;
  observations: string | null;
  visibleToClient: boolean;
  pdfAttachment: { id: string; fileName: string; mimeType: string; sizeBytes: number } | null;
  createdAt: string;
}

export type ContractStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "CANCELED";
export type ContractPeriodicity = "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL" | "ONE_TIME" | "OTHER";

export interface ServiceContract {
  id: string;
  clientId: string;
  client?: ClientRef;
  serviceName: string;
  startDate: string;
  endDate: string | null;
  value: number | null;
  periodicity: ContractPeriodicity;
  responsibleId: string | null;
  responsible?: { id: string; name: string } | null;
  status: ContractStatus;
  derivedStatus?: string;
  notes: string | null;
  createdAt: string;
}

export type ProductStatus = "ACTIVE" | "INACTIVE" | "UNAVAILABLE";
export type InventoryMovementType = "IN" | "OUT" | "ADJUSTMENT";

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

export interface ProductImage {
  id: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  category?: ProductCategory;
  brand: string | null;
  description: string | null;
  technicalSheetUrl: string | null;
  price: number | null;
  promoPrice: number | null;
  priceOnRequest: boolean;
  stockQty: number;
  minStock: number;
  status: ProductStatus;
  featured: boolean;
  images?: ProductImage[];
}

export type QuoteStatus = "NEW" | "IN_ANALYSIS" | "QUOTE_SENT" | "APPROVED" | "REJECTED" | "EXPIRED";
export type QuoteSource = "SERVICE_REQUEST" | "PRODUCT_CART" | "CONTACT";

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  product?: { id: string; name: string; sku: string; price: number | null };
  quantity: number;
  unitPriceRequested: number | null;
  unitPriceOffered: number | null;
}

export interface Quote {
  id: string;
  number: string;
  clientId: string | null;
  client?: ClientRef | null;
  source: QuoteSource;
  status: QuoteStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  serviceCategory: ServiceCategory | null;
  message: string | null;
  shippingCost: number | null;
  notes: string | null;
  items: QuoteItem[];
  createdAt: string;
}

export type OrderStatus = "PENDING" | "SEPARATED" | "DELIVERED" | "CANCELED";
export type PaymentMethod = "PIX" | "BOLETO" | "OTHER";
export type PaymentStatus = "PENDING" | "PAID";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: { id: string; name: string; sku: string };
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderStatusHistoryEntry {
  id: string;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  number: string;
  clientId: string;
  client?: ClientRef;
  quoteId: string | null;
  status: OrderStatus;
  shippingCost: number | null;
  totalAmount: number;
  deadline: string | null;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  paymentNotes: string | null;
  items: OrderItem[];
  statusHistory: OrderStatusHistoryEntry[];
  createdAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  clientId: string | null;
  client: ClientRef | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface RoleDefinitionDto {
  key: Role;
  label: string;
  description: string | null;
  permissions: string[];
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  user: { id: string; name: string; email: string } | null;
  action: string;
  entityType: string;
  entityId: string;
  description: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// CMMS - RLP Maintenance CMMS (gestao de manutencao, pacote opcional)
// ---------------------------------------------------------------------------

export type PredictiveTechnique =
  | "COUNTER"
  | "VIBRATION"
  | "THERMOGRAPHY"
  | "OIL_ANALYSIS"
  | "ULTRASOUND"
  | "MOTOR_CURRENT"
  | "VISUAL"
  | "OTHER";
export type MeasurementDirection = "UPPER" | "LOWER" | "RANGE";
export type ConditionSeverity = "NORMAL" | "WARNING" | "ALARM" | "CRITICAL";

export interface MeterReading {
  id: string;
  meterId: string;
  value: number;
  readAt: string;
  alertTriggered: boolean;
  severity: ConditionSeverity;
  notes: string | null;
  recordedById: string | null;
  createdAt: string;
}

export interface Meter {
  id: string;
  instrumentId: string;
  name: string;
  unit: string;
  currentValue: number;
  technique: PredictiveTechnique;
  direction: MeasurementDirection;
  minThreshold: number | null;
  maxThreshold: number | null;
  warningLimit: number | null;
  criticalLimit: number | null;
  criterion: string | null;
  frequencyDays: number | null;
  lastReadingAt: string | null;
  createdAt: string;
  readings?: MeterReading[];
}

/** Um ponto de medicao no painel preditivo, com tendencia recente. */
export interface PredictivePoint {
  id: string;
  name: string;
  unit: string;
  technique: PredictiveTechnique;
  direction: MeasurementDirection;
  criterion: string | null;
  frequencyDays: number | null;
  lastReadingAt: string | null;
  neverMeasured: boolean;
  collectionOverdue: boolean;
  dueInDays: number | null;
  severity: ConditionSeverity | null;
  lastValue: number | null;
  limits: { warning: number | null; alarm: number | null; critical: number | null };
  instrument: { id: string; tag: string | null; type: string; description: string | null; criticality: MaintenancePriority };
  trend: { value: number; readAt: string; severity: ConditionSeverity }[];
}

export interface PredictivePanelData {
  totals: {
    points: number;
    critical: number;
    alarm: number;
    warning: number;
    normal: number;
    neverMeasured: number;
    collectionOverdue: number;
  };
  needsAttention: PredictivePoint[];
  collectionOverdue: PredictivePoint[];
  points: PredictivePoint[];
}

export type AssetHierarchyLevel = "PLANT" | "AREA" | "MACHINE" | "SUBASSEMBLY" | "PART";

export type ServiceRequestStatus = "OPEN" | "IN_TRIAGE" | "AWAITING_INFO" | "PLANNED" | "CONVERTED" | "REJECTED" | "CLOSED";

export interface ServiceRequestCategory {
  id: string;
  clientId: string | null;
  name: string;
  active: boolean;
}

export interface ServiceRequest {
  id: string;
  number: string;
  clientId: string;
  client?: ClientRef;
  requestedById: string | null;
  requestedBy?: { id: string; name: string } | null;
  areaId: string | null;
  area?: { id: string; name: string } | null;
  instrumentId: string | null;
  instrument?: InstrumentRef | null;
  location: string | null;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
  description: string;
  safetyImpact: boolean;
  qualityImpact: boolean;
  productionImpact: boolean;
  suggestedPriority: MaintenancePriority;
  status: ServiceRequestStatus;
  triageById: string | null;
  triageBy?: { id: string; name: string } | null;
  triageNotes: string | null;
  rejectionReason: string | null;
  workOrderId: string | null;
  workOrder?: { id: string; number: string; status: string } | null;
  createdAt: string;
}

export interface Plant {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  active: boolean;
}

export interface Area {
  id: string;
  clientId: string;
  plantId: string;
  plant?: { id: string; name: string };
  name: string;
  code: string | null;
  active: boolean;
}

export interface AssetSystem {
  id: string;
  clientId: string;
  areaId: string;
  area?: { id: string; name: string; plant?: { id: string; name: string } };
  name: string;
  code: string | null;
  active: boolean;
}

export interface CostCenter {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  active: boolean;
}

export interface AssetType {
  id: string;
  clientId: string | null;
  name: string;
  level: AssetHierarchyLevel | null;
  active: boolean;
}

export interface FailureCode {
  id: string;
  clientId: string | null;
  code: string;
  description: string;
  category: string | null;
  symptom: string | null;
  mode: string | null;
  mechanism: string | null;
  cause: string | null;
  correctiveAction: string | null;
  applicableAssetFamily: string | null;
  severity: MaintenancePriority | null;
  active: boolean;
}

export type MaintenanceTriggerType = "TIME" | "METER";
export type MaintenanceOrderType = "PREVENTIVE" | "CORRECTIVE" | "PREDICTIVE";
export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type MaintenanceOrderStatus =
  | "OPEN"
  | "IN_TRIAGE"
  | "PLANNED"
  | "PROGRAMMED"
  | "RELEASED"
  | "IN_PROGRESS"
  | "AWAITING_MATERIAL"
  | "AWAITING_RELEASE"
  | "AWAITING_STOPPAGE"
  | "COMPLETED"
  | "CANCELED";
export type ChecklistItemResult = "PENDING" | "OK" | "NOT_OK" | "NA";
export type DerivedDueStatus = "VALID" | "DUE_SOON" | "EXPIRED";

export interface MaintenancePlanChecklistItem {
  id?: string;
  description: string;
  sortOrder?: number;
}

export interface MaintenancePlanPart {
  id?: string;
  sparePartId: string;
  sparePart?: { id: string; name: string; code: string | null; unit: string; stockQty: number; reservedQty: number };
  quantity: number;
}

export interface MaintenancePlan {
  id: string;
  clientId: string;
  client?: ClientRef;
  instrumentId: string;
  instrument?: InstrumentRef;
  name: string;
  description: string | null;
  triggerType: MaintenanceTriggerType;
  frequencyDays: number | null;
  nextDueDate: string | null;
  meterId: string | null;
  meter?: { id: string; name: string; unit: string; currentValue: number } | null;
  meterInterval: number | null;
  lastGeneratedAt: string | null;
  lastMeterAtGeneration: number | null;
  active: boolean;
  responsibleId: string | null;
  responsible?: { id: string; name: string } | null;
  derivedStatus?: DerivedDueStatus;
  toleranceDaysBefore: number | null;
  toleranceDaysAfter: number | null;
  procedure: string | null;
  estimatedLaborHours: number | null;
  templateId: string | null;
  template?: { id: string; name: string } | null;
  checklistTemplate: MaintenancePlanChecklistItem[];
  parts?: MaintenancePlanPart[];
  workOrders?: { id: string; number: string; status: MaintenanceOrderStatus; completedAt: string | null }[];
  createdAt: string;
}

export interface MaintenancePlanTemplateChecklistItem {
  id?: string;
  description: string;
  sortOrder?: number;
}

export interface MaintenancePlanTemplate {
  id: string;
  clientId: string | null;
  name: string;
  applicableAssetFamily: string | null;
  triggerType: MaintenanceTriggerType;
  frequencyDays: number | null;
  meterInterval: number | null;
  toleranceDaysBefore: number | null;
  toleranceDaysAfter: number | null;
  procedure: string | null;
  estimatedLaborHours: number | null;
  active: boolean;
  createdAt: string;
  checklistItems: MaintenancePlanTemplateChecklistItem[];
}

export interface MaintenanceWorkOrderChecklistItem {
  id: string;
  workOrderId: string;
  description: string;
  result: ChecklistItemResult;
  notes: string | null;
  sortOrder: number;
}

export interface LaborType {
  id: string;
  clientId: string | null;
  name: string;
  active: boolean;
}

export interface LaborResource {
  id: string;
  clientId: string;
  client?: ClientRef;
  type: string;
  name: string;
  registrationNumber: string | null;
  hourlyRate: number | null;
  active: boolean;
  createdAt: string;
}

export type LaborHourType = "NORMAL" | "OVERTIME" | "NIGHT";

export interface WorkOrderLaborEntry {
  id: string;
  workOrderId: string;
  laborResourceId: string;
  laborResource?: { id: string; name: string; type: string };
  hours: number;
  hourlyRateSnapshot: number | null;
  hourType: LaborHourType | null;
  startedAt: string | null;
  endedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface WorkOrderThirdPartyService {
  id: string;
  workOrderId: string;
  supplierName: string;
  description: string;
  cost: number;
  invoiceNumber: string | null;
  notes: string | null;
  createdAt: string;
}

export type SparePartReservationStatus = "RESERVED" | "CONSUMED" | "RELEASED";

export interface SparePartReservation {
  id: string;
  sparePartId: string;
  sparePart?: { id: string; name: string; code: string | null; unit: string };
  workOrderId: string;
  quantity: number;
  status: SparePartReservationStatus;
  createdAt: string;
}

export interface StoppageReason {
  id: string;
  clientId: string | null;
  name: string;
  active: boolean;
}

export interface WorkOrderStoppage {
  id: string;
  workOrderId: string;
  reasonId: string | null;
  reason?: { id: string; name: string } | null;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface InstrumentCostSummary {
  partsCost: number | null;
  laborCost: number | null;
  thirdPartyCost: number | null;
  totalCost: number | null;
  totalLaborHours: number;
}

export interface MaintenancePartUsed {
  id: string;
  sparePartId: string;
  sparePart?: { id: string; name: string; code: string | null; unit: string };
  quantity: number;
  unitCost: number | null;
  reason: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Almoxarifado (SparePart) - estoque tecnico interno do CMMS, separado do
// catalogo comercial de Produtos.
// ---------------------------------------------------------------------------

export interface SparePartMovement {
  id: string;
  sparePartId: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  unitCost: number | null;
  reason: string | null;
  maintenanceWorkOrderId: string | null;
  createdAt: string;
}

export interface SparePart {
  id: string;
  clientId: string;
  client?: ClientRef;
  name: string;
  code: string | null;
  category: string | null;
  unit: string;
  stockQty: number;
  minStock: number;
  reservedQty: number;
  unitCost: number | null;
  active: boolean;
  createdAt: string;
  movements?: SparePartMovement[];
}

export interface AssetPart {
  id: string;
  instrumentId: string;
  sparePartId: string;
  sparePart?: SparePart;
  notes: string | null;
  createdAt: string;
}

/** Consumo real de pecas de um ativo (o que ja foi baixado do almoxarifado nas OS dele) -
 * diferente do AssetPart (BOM), que so lista o que e' compativel. */
export interface AssetPartHistoryEntry {
  sparePart: { id: string; name: string; code: string | null; unit: string };
  totalQuantity: number;
  timesUsed: number;
  totalCost: number | null;
  lastUsedAt: string;
  lastWorkOrder: { id: string; number: string } | null;
}

export interface MaintenanceWorkOrder {
  id: string;
  number: string;
  clientId: string;
  client?: ClientRef;
  instrumentId: string;
  instrument?: InstrumentRef;
  planId: string | null;
  plan?: { id: string; name: string } | null;
  type: MaintenanceOrderType;
  priority: MaintenancePriority;
  status: MaintenanceOrderStatus;
  description: string;
  technicianId: string | null;
  technician?: { id: string; name: string } | null;
  /** Mao de obra do proprio cliente que vai executar (eixo do quadro de programacao). */
  assignedResourceId: string | null;
  assignedResource?: { id: string; name: string; type: string } | null;
  scheduledDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failureCodeId: string | null;
  failureCode?: FailureCode | null;
  // Preenchido quando a OS foi aberta sozinha por uma leitura de medidor fora da faixa.
  triggeredByMeterId: string | null;
  meterReadingAtExecution: number | null;
  laborHours: number | null;
  observations: string | null;
  checklist?: MaintenanceWorkOrderChecklistItem[];
  partsUsed?: MaintenancePartUsed[];
  laborEntries?: WorkOrderLaborEntry[];
  thirdPartyServices?: WorkOrderThirdPartyService[];
  partReservations?: SparePartReservation[];
  stoppages?: WorkOrderStoppage[];
  // Rastreabilidade: de onde esta OS veio (SS que a originou, ou OS + item de checklist
  // que revelou a anomalia) e o que ela gerou (corretivas abertas automaticamente).
  serviceRequest?: { id: string; number: string; status: string } | null;
  originWorkOrderId: string | null;
  originWorkOrder?: { id: string; number: string; type: MaintenanceOrderType } | null;
  originChecklistItemId: string | null;
  originChecklistItem?: { id: string; description: string } | null;
  spawnedWorkOrders?: { id: string; number: string; status: MaintenanceOrderStatus; type: MaintenanceOrderType }[];
  // Equipe de apoio (o responsavel e' o assignedResource declarado acima).
  assignees?: WorkOrderAssignee[];
  createdAt: string;
}

export interface WorkOrderAssignee {
  id: string;
  workOrderId: string;
  laborResourceId: string;
  laborResource?: { id: string; name: string; type: string };
  createdAt: string;
}

/** Cartao enxuto de OS usado no quadro de programacao do PCM. */
export interface ScheduleCard {
  id: string;
  number: string;
  description: string;
  type: MaintenanceOrderType;
  priority: MaintenancePriority;
  status: MaintenanceOrderStatus;
  scheduledDate: string | null;
  laborHours: number | null;
  assignedResourceId: string | null;
  instrument?: { id: string; tag: string | null; type: string } | null;
}

export interface MaintenanceScheduleData {
  clientId: string | null;
  resources: { id: string; name: string; type: string }[];
  scheduled: ScheduleCard[];
  unscheduled: ScheduleCard[];
}

export type RcaStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export interface RootCauseAnalysis {
  id: string;
  clientId: string;
  client?: ClientRef;
  instrumentId: string | null;
  instrument?: InstrumentRef | null;
  workOrderId: string | null;
  workOrder?: { id: string; number: string; status: string } | null;
  problem: string;
  participants: string | null;
  why1: string | null;
  why2: string | null;
  why3: string | null;
  why4: string | null;
  why5: string | null;
  rootCause: string | null;
  correctiveActions: string | null;
  preventiveActions: string | null;
  responsibleId: string | null;
  responsible?: { id: string; name: string } | null;
  dueDate: string | null;
  effectivenessVerifiedAt: string | null;
  effectivenessNotes: string | null;
  status: RcaStatus;
  createdAt: string;
}

export interface FailureAnalysisBucket {
  key: string;
  label: string;
  count: number;
  downtimeHours: number;
  cost: number;
}

export interface FailureAnalysisData {
  period: { from: string; to: string };
  totalCorrective: number;
  emergency: number;
  withoutFailureCode: number;
  recurringFailureCodes: number;
  byFailureCode: FailureAnalysisBucket[];
  byInstrument: FailureAnalysisBucket[];
  byArea: FailureAnalysisBucket[];
}

export interface MaintenanceDashboardData {
  period: { from: string; to: string };
  totals: {
    workOrders: number;
    open: number;
    inProgress: number;
    completed: number;
    corrective: number;
    preventive: number;
    predictive: number;
    predictiveAutoOpened: number;
  };
  kpis: {
    mttrHours: number;
    mtbfHours: number;
    availabilityPct: number;
    planComplianceRatePct: number;
  };
  pcm: {
    backlogHours: number;
    openWithoutEstimate: number;
    overdue: number;
    emergency: number;
    awaitingMaterial: number;
    awaitingRelease: number;
    awaitingStoppage: number;
    plannedHoursCompleted: number;
    actualHoursCompleted: number;
    scheduleAdherencePct: number | null;
    scheduledCompletedCount: number;
  };
}
