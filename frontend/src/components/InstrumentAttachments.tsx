import {
  deleteInstrumentAttachment,
  getInstrumentAttachmentUrl,
  listInstrumentAttachments,
  uploadInstrumentAttachment,
} from "../api/instruments";
import { EntityAttachments } from "./EntityAttachments";

/** Manual, foto do equipamento e outros anexos do proprio ativo (nao de uma OS ou
 * calibracao especifica) - fica na propria ficha, sempre visivel. */
export function InstrumentAttachments({ instrumentId, canEdit }: { instrumentId: string; canEdit: boolean }) {
  return (
    <EntityAttachments
      title="Manual e fotos do ativo"
      queryKey={["instrument-attachments", instrumentId]}
      canEdit={canEdit}
      list={() => listInstrumentAttachments(instrumentId)}
      upload={(file, category) => uploadInstrumentAttachment(instrumentId, file, category)}
      remove={(attachmentId) => deleteInstrumentAttachment(instrumentId, attachmentId)}
      getUrl={(attachmentId) => getInstrumentAttachmentUrl(instrumentId, attachmentId)}
    />
  );
}
