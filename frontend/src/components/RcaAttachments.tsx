import { deleteRcaAttachment, getRcaAttachmentUrl, listRcaAttachments, uploadRcaAttachment } from "../api/rootCauseAnalyses";
import { EntityAttachments } from "./EntityAttachments";

/** Evidencia fotografica e documentos da RCA (analise de causa raiz). */
export function RcaAttachments({ rcaId, canEdit }: { rcaId: string; canEdit: boolean }) {
  return (
    <EntityAttachments
      title="Evidencias e anexos"
      queryKey={["rca-attachments", rcaId]}
      canEdit={canEdit}
      list={() => listRcaAttachments(rcaId)}
      upload={(file, category) => uploadRcaAttachment(rcaId, file, category)}
      remove={(attachmentId) => deleteRcaAttachment(rcaId, attachmentId)}
      getUrl={(attachmentId) => getRcaAttachmentUrl(rcaId, attachmentId)}
    />
  );
}
