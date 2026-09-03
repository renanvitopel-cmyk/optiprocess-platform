import {
  deleteServiceRequestAttachment,
  getServiceRequestAttachmentUrl,
  listServiceRequestAttachments,
  uploadServiceRequestAttachment,
} from "../api/serviceRequests";
import { EntityAttachments } from "./EntityAttachments";

/** Fotos do problema e anexos da solicitacao de servico - o solicitante ou a equipe
 * de triagem podem anexar evidencia (ex.: foto do vazamento). */
export function ServiceRequestAttachments({ requestId, canEdit }: { requestId: string; canEdit: boolean }) {
  return (
    <EntityAttachments
      title="Fotos e anexos"
      queryKey={["service-request-attachments", requestId]}
      canEdit={canEdit}
      list={() => listServiceRequestAttachments(requestId)}
      upload={(file, category) => uploadServiceRequestAttachment(requestId, file, category)}
      remove={(attachmentId) => deleteServiceRequestAttachment(requestId, attachmentId)}
      getUrl={(attachmentId) => getServiceRequestAttachmentUrl(requestId, attachmentId)}
    />
  );
}
