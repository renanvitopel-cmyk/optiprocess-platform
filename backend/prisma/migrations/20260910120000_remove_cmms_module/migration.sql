-- AlterEnum
BEGIN;
CREATE TYPE "AttachmentEntityType_new" AS ENUM ('SERVICE_ORDER', 'CALIBRATION', 'TECHNICAL_REPORT', 'SERVICE_CONTRACT', 'PRODUCT', 'CLIENT', 'INSTRUMENT');
ALTER TABLE "attachments" ALTER COLUMN "entityType" TYPE "AttachmentEntityType_new" USING ("entityType"::text::"AttachmentEntityType_new");
ALTER TYPE "AttachmentEntityType" RENAME TO "AttachmentEntityType_old";
ALTER TYPE "AttachmentEntityType_new" RENAME TO "AttachmentEntityType";
DROP TYPE IF EXISTS "AttachmentEntityType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "instruments" DROP CONSTRAINT IF EXISTS "instruments_parentId_fkey";

-- DropForeignKey
ALTER TABLE "instruments" DROP CONSTRAINT IF EXISTS "instruments_plantId_fkey";

-- DropForeignKey
ALTER TABLE "instruments" DROP CONSTRAINT IF EXISTS "instruments_areaId_fkey";

-- DropForeignKey
ALTER TABLE "instruments" DROP CONSTRAINT IF EXISTS "instruments_systemId_fkey";

-- DropForeignKey
ALTER TABLE "instruments" DROP CONSTRAINT IF EXISTS "instruments_costCenterId_fkey";

-- DropForeignKey
ALTER TABLE "meters" DROP CONSTRAINT IF EXISTS "meters_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "meter_readings" DROP CONSTRAINT IF EXISTS "meter_readings_meterId_fkey";

-- DropForeignKey
ALTER TABLE "labor_types" DROP CONSTRAINT IF EXISTS "labor_types_clientId_fkey";

-- DropForeignKey
ALTER TABLE "labor_resources" DROP CONSTRAINT IF EXISTS "labor_resources_clientId_fkey";

-- DropForeignKey
ALTER TABLE "labor_resources" DROP CONSTRAINT IF EXISTS "labor_resources_userId_fkey";

-- DropForeignKey
ALTER TABLE "work_order_labor" DROP CONSTRAINT IF EXISTS "work_order_labor_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "work_order_labor" DROP CONSTRAINT IF EXISTS "work_order_labor_laborResourceId_fkey";

-- DropForeignKey
ALTER TABLE "work_order_third_party_services" DROP CONSTRAINT IF EXISTS "work_order_third_party_services_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "spare_part_reservations" DROP CONSTRAINT IF EXISTS "spare_part_reservations_sparePartId_fkey";

-- DropForeignKey
ALTER TABLE "spare_part_reservations" DROP CONSTRAINT IF EXISTS "spare_part_reservations_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "stoppage_reasons" DROP CONSTRAINT IF EXISTS "stoppage_reasons_clientId_fkey";

-- DropForeignKey
ALTER TABLE "work_order_stoppages" DROP CONSTRAINT IF EXISTS "work_order_stoppages_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "work_order_stoppages" DROP CONSTRAINT IF EXISTS "work_order_stoppages_reasonId_fkey";

-- DropForeignKey
ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "plants_clientId_fkey";

-- DropForeignKey
ALTER TABLE "areas" DROP CONSTRAINT IF EXISTS "areas_clientId_fkey";

-- DropForeignKey
ALTER TABLE "areas" DROP CONSTRAINT IF EXISTS "areas_plantId_fkey";

-- DropForeignKey
ALTER TABLE "areas" DROP CONSTRAINT IF EXISTS "areas_costCenterId_fkey";

-- DropForeignKey
ALTER TABLE "asset_systems" DROP CONSTRAINT IF EXISTS "asset_systems_clientId_fkey";

-- DropForeignKey
ALTER TABLE "asset_systems" DROP CONSTRAINT IF EXISTS "asset_systems_areaId_fkey";

-- DropForeignKey
ALTER TABLE "cost_centers" DROP CONSTRAINT IF EXISTS "cost_centers_clientId_fkey";

-- DropForeignKey
ALTER TABLE "failure_codes" DROP CONSTRAINT IF EXISTS "failure_codes_clientId_fkey";

-- DropForeignKey
ALTER TABLE "root_cause_analyses" DROP CONSTRAINT IF EXISTS "root_cause_analyses_clientId_fkey";

-- DropForeignKey
ALTER TABLE "root_cause_analyses" DROP CONSTRAINT IF EXISTS "root_cause_analyses_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "root_cause_analyses" DROP CONSTRAINT IF EXISTS "root_cause_analyses_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "root_cause_analyses" DROP CONSTRAINT IF EXISTS "root_cause_analyses_responsibleId_fkey";

-- DropForeignKey
ALTER TABLE "service_request_categories" DROP CONSTRAINT IF EXISTS "service_request_categories_clientId_fkey";

-- DropForeignKey
ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_clientId_fkey";

-- DropForeignKey
ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_areaId_fkey";

-- DropForeignKey
ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_triageById_fkey";

-- DropForeignKey
ALTER TABLE "service_requests" DROP CONSTRAINT IF EXISTS "service_requests_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plans" DROP CONSTRAINT IF EXISTS "maintenance_plans_clientId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plans" DROP CONSTRAINT IF EXISTS "maintenance_plans_specialtyId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plans" DROP CONSTRAINT IF EXISTS "maintenance_plans_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plans" DROP CONSTRAINT IF EXISTS "maintenance_plans_lubricationRouteId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plans" DROP CONSTRAINT IF EXISTS "maintenance_plans_conditionMeterId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plans" DROP CONSTRAINT IF EXISTS "maintenance_plans_meterId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plans" DROP CONSTRAINT IF EXISTS "maintenance_plans_responsibleId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plans" DROP CONSTRAINT IF EXISTS "maintenance_plans_templateId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plan_parts" DROP CONSTRAINT IF EXISTS "maintenance_plan_parts_planId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plan_parts" DROP CONSTRAINT IF EXISTS "maintenance_plan_parts_sparePartId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plan_parts" DROP CONSTRAINT IF EXISTS "maintenance_plan_parts_alternativeSparePartId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plan_templates" DROP CONSTRAINT IF EXISTS "maintenance_plan_templates_clientId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plan_template_checklist_items" DROP CONSTRAINT IF EXISTS "maintenance_plan_template_checklist_items_templateId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_plan_checklist_items" DROP CONSTRAINT IF EXISTS "maintenance_plan_checklist_items_planId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_clientId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_planId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_lubricationRouteId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_costCenterId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_assignedResourceId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_failureCodeId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_closedById_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_triggeredByMeterId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_originWorkOrderId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_orders" DROP CONSTRAINT IF EXISTS "maintenance_work_orders_originChecklistItemId_fkey";

-- DropForeignKey
ALTER TABLE "work_order_assignees" DROP CONSTRAINT IF EXISTS "work_order_assignees_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "work_order_assignees" DROP CONSTRAINT IF EXISTS "work_order_assignees_laborResourceId_fkey";

-- DropForeignKey
ALTER TABLE "work_order_material_logs" DROP CONSTRAINT IF EXISTS "work_order_material_logs_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "work_order_material_logs" DROP CONSTRAINT IF EXISTS "work_order_material_logs_sparePartId_fkey";

-- DropForeignKey
ALTER TABLE "work_order_material_logs" DROP CONSTRAINT IF EXISTS "work_order_material_logs_alternativeSparePartId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_work_order_checklist_items" DROP CONSTRAINT IF EXISTS "maintenance_work_order_checklist_items_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "spare_parts" DROP CONSTRAINT IF EXISTS "spare_parts_clientId_fkey";

-- DropForeignKey
ALTER TABLE "spare_part_movements" DROP CONSTRAINT IF EXISTS "spare_part_movements_sparePartId_fkey";

-- DropForeignKey
ALTER TABLE "spare_part_movements" DROP CONSTRAINT IF EXISTS "spare_part_movements_maintenanceWorkOrderId_fkey";

-- DropForeignKey
ALTER TABLE "asset_parts" DROP CONSTRAINT IF EXISTS "asset_parts_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "asset_parts" DROP CONSTRAINT IF EXISTS "asset_parts_sparePartId_fkey";

-- DropForeignKey
ALTER TABLE "automation_settings" DROP CONSTRAINT IF EXISTS "automation_settings_clientId_fkey";

-- DropForeignKey
ALTER TABLE "lubricants" DROP CONSTRAINT IF EXISTS "lubricants_clientId_fkey";

-- DropForeignKey
ALTER TABLE "lubricants" DROP CONSTRAINT IF EXISTS "lubricants_sparePartId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_points" DROP CONSTRAINT IF EXISTS "lubrication_points_clientId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_points" DROP CONSTRAINT IF EXISTS "lubrication_points_instrumentId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_points" DROP CONSTRAINT IF EXISTS "lubrication_points_lubricantId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_routes" DROP CONSTRAINT IF EXISTS "lubrication_routes_clientId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_routes" DROP CONSTRAINT IF EXISTS "lubrication_routes_plantId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_routes" DROP CONSTRAINT IF EXISTS "lubrication_routes_areaId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_routes" DROP CONSTRAINT IF EXISTS "lubrication_routes_responsibleId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_route_items" DROP CONSTRAINT IF EXISTS "lubrication_route_items_routeId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_route_items" DROP CONSTRAINT IF EXISTS "lubrication_route_items_pointId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_records" DROP CONSTRAINT IF EXISTS "lubrication_records_clientId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_records" DROP CONSTRAINT IF EXISTS "lubrication_records_pointId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_records" DROP CONSTRAINT IF EXISTS "lubrication_records_lubricantId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_records" DROP CONSTRAINT IF EXISTS "lubrication_records_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_records" DROP CONSTRAINT IF EXISTS "lubrication_records_laborResourceId_fkey";

-- DropForeignKey
ALTER TABLE "lubrication_records" DROP CONSTRAINT IF EXISTS "lubrication_records_movementId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "instruments_parentId_idx";

-- DropIndex
DROP INDEX IF EXISTS "instruments_plantId_idx";

-- DropIndex
DROP INDEX IF EXISTS "instruments_areaId_idx";

-- DropIndex
DROP INDEX IF EXISTS "instruments_systemId_idx";

-- DropIndex
DROP INDEX IF EXISTS "instruments_costCenterId_idx";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN IF EXISTS "contractStatus";

-- AlterTable
ALTER TABLE "instruments" DROP COLUMN IF EXISTS "areaId",
DROP COLUMN IF EXISTS "areaOverride",
DROP COLUMN IF EXISTS "costCenterId",
DROP COLUMN IF EXISTS "costCenterOverride",
DROP COLUMN IF EXISTS "criticality",
DROP COLUMN IF EXISTS "level",
DROP COLUMN IF EXISTS "lubricatable",
DROP COLUMN IF EXISTS "lubricationPointsComplete",
DROP COLUMN IF EXISTS "operationalStatus",
DROP COLUMN IF EXISTS "parentId",
DROP COLUMN IF EXISTS "plantId",
DROP COLUMN IF EXISTS "specificAttributes",
DROP COLUMN IF EXISTS "systemId";

-- AlterTable
ALTER TABLE "asset_types" DROP COLUMN IF EXISTS "level";

-- DropTable
DROP TABLE IF EXISTS "meters";

-- DropTable
DROP TABLE IF EXISTS "meter_readings";

-- DropTable
DROP TABLE IF EXISTS "labor_types";

-- DropTable
DROP TABLE IF EXISTS "labor_resources";

-- DropTable
DROP TABLE IF EXISTS "work_order_labor";

-- DropTable
DROP TABLE IF EXISTS "work_order_third_party_services";

-- DropTable
DROP TABLE IF EXISTS "spare_part_reservations";

-- DropTable
DROP TABLE IF EXISTS "stoppage_reasons";

-- DropTable
DROP TABLE IF EXISTS "work_order_stoppages";

-- DropTable
DROP TABLE IF EXISTS "plants";

-- DropTable
DROP TABLE IF EXISTS "areas";

-- DropTable
DROP TABLE IF EXISTS "asset_systems";

-- DropTable
DROP TABLE IF EXISTS "cost_centers";

-- DropTable
DROP TABLE IF EXISTS "failure_codes";

-- DropTable
DROP TABLE IF EXISTS "root_cause_analyses";

-- DropTable
DROP TABLE IF EXISTS "service_request_categories";

-- DropTable
DROP TABLE IF EXISTS "service_requests";

-- DropTable
DROP TABLE IF EXISTS "maintenance_plans";

-- DropTable
DROP TABLE IF EXISTS "maintenance_plan_parts";

-- DropTable
DROP TABLE IF EXISTS "maintenance_plan_templates";

-- DropTable
DROP TABLE IF EXISTS "maintenance_plan_template_checklist_items";

-- DropTable
DROP TABLE IF EXISTS "maintenance_plan_checklist_items";

-- DropTable
DROP TABLE IF EXISTS "maintenance_work_orders";

-- DropTable
DROP TABLE IF EXISTS "work_order_assignees";

-- DropTable
DROP TABLE IF EXISTS "work_order_material_logs";

-- DropTable
DROP TABLE IF EXISTS "maintenance_work_order_checklist_items";

-- DropTable
DROP TABLE IF EXISTS "spare_parts";

-- DropTable
DROP TABLE IF EXISTS "spare_part_movements";

-- DropTable
DROP TABLE IF EXISTS "asset_parts";

-- DropTable
DROP TABLE IF EXISTS "automation_settings";

-- DropTable
DROP TABLE IF EXISTS "lubricants";

-- DropTable
DROP TABLE IF EXISTS "lubrication_points";

-- DropTable
DROP TABLE IF EXISTS "lubrication_routes";

-- DropTable
DROP TABLE IF EXISTS "lubrication_route_items";

-- DropTable
DROP TABLE IF EXISTS "lubrication_records";

-- DropEnum
DROP TYPE IF EXISTS "CmmsContractStatus";

-- DropEnum
DROP TYPE IF EXISTS "MaintenanceTriggerType";

-- DropEnum
DROP TYPE IF EXISTS "MaintenanceFrequencyUnit";

-- DropEnum
DROP TYPE IF EXISTS "OperationalCalendar";

-- DropEnum
DROP TYPE IF EXISTS "MeterResetRule";

-- DropEnum
DROP TYPE IF EXISTS "MaintenanceTriggerMode";

-- DropEnum
DROP TYPE IF EXISTS "MaterialPolicy";

-- DropEnum
DROP TYPE IF EXISTS "MaintenancePlanStatus";

-- DropEnum
DROP TYPE IF EXISTS "MaintenancePlanType";

-- DropEnum
DROP TYPE IF EXISTS "MaintenancePlanScope";

-- DropEnum
DROP TYPE IF EXISTS "PredictiveTechnique";

-- DropEnum
DROP TYPE IF EXISTS "MeasurementDirection";

-- DropEnum
DROP TYPE IF EXISTS "ConditionSeverity";

-- DropEnum
DROP TYPE IF EXISTS "MaintenanceOrderType";

-- DropEnum
DROP TYPE IF EXISTS "MaintenancePriority";

-- DropEnum
DROP TYPE IF EXISTS "AssetHierarchyLevel";

-- DropEnum
DROP TYPE IF EXISTS "OperationalStatus";

-- DropEnum
DROP TYPE IF EXISTS "WorkOrderExecutionCondition";

-- DropEnum
DROP TYPE IF EXISTS "BreakdownSituation";

-- DropEnum
DROP TYPE IF EXISTS "MaintenanceOrderStatus";

-- DropEnum
DROP TYPE IF EXISTS "LaborHourType";

-- DropEnum
DROP TYPE IF EXISTS "RcaStatus";

-- DropEnum
DROP TYPE IF EXISTS "SparePartReservationStatus";

-- DropEnum
DROP TYPE IF EXISTS "ServiceRequestStatus";

-- DropEnum
DROP TYPE IF EXISTS "ChecklistResponseType";

-- DropEnum
DROP TYPE IF EXISTS "ChecklistItemResult";

-- DropEnum
DROP TYPE IF EXISTS "LubricationMethod";

-- DropEnum
DROP TYPE IF EXISTS "CorrectiveType";

-- DropEnum
DROP TYPE IF EXISTS "FailureSeverity";

-- DropEnum
DROP TYPE IF EXISTS "LubricantType";

-- DropEnum
DROP TYPE IF EXISTS "LubricantBase";

-- DropEnum
DROP TYPE IF EXISTS "MachineStateForLubrication";

-- DropEnum
DROP TYPE IF EXISTS "LubricationCondition";

