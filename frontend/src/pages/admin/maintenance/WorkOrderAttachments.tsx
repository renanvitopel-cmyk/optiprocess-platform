import {
  deleteWorkOrderAttachment,
  getWorkOrderAttachmentUrl,
  listWorkOrderAttachments,
  uploadWorkOrderAttachment,
} from "../../../api/maintenanceWorkOrders";
import { EntityAttachments } from "../../../components/EntityAttachments";

export function WorkOrderAttachments({ workOrderId, canEdit }: { workOrderId: string; canEdit: boolean }) {
  return (
    <EntityAttachments
      queryKey={["work-order-attachments", workOrderId]}
      canEdit={canEdit}
      list={() => listWorkOrderAttachments(workOrderId)}
      upload={(file, category) => uploadWorkOrderAttachment(workOrderId, file, category)}
      remove={(attachmentId) => deleteWorkOrderAttachment(workOrderId, attachmentId)}
      getUrl={(attachmentId) => getWorkOrderAttachmentUrl(workOrderId, attachmentId)}
    />
  );
}
