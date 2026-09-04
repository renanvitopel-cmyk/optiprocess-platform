-- CreateTable: equipe de apoio da OS. O responsavel continua sendo
-- maintenance_work_orders.assignedResourceId; aqui ficam os demais que podem atuar.
CREATE TABLE "work_order_assignees" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "laborResourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_assignees_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "work_order_assignees_workOrderId_idx" ON "work_order_assignees"("workOrderId");
CREATE UNIQUE INDEX "work_order_assignees_workOrderId_laborResourceId_key" ON "work_order_assignees"("workOrderId", "laborResourceId");

ALTER TABLE "work_order_assignees" ADD CONSTRAINT "work_order_assignees_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_order_assignees" ADD CONSTRAINT "work_order_assignees_laborResourceId_fkey" FOREIGN KEY ("laborResourceId") REFERENCES "labor_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
