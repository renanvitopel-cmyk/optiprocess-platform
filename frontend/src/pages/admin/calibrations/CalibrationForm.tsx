import { useSearchParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/PageHeader";
import { CalibrationFieldsForm } from "./CalibrationFieldsForm";

/** Tela inicial: so' identificacao. Ao salvar, o rascunho e' criado e o tecnico continua
 * na ficha do certificado (padroes, pontos, fotos) - um fluxo so', nao duas telas. */
export default function CalibrationForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Nova calibracao"
        breadcrumbs={[{ label: "Calibracoes", to: "/gestao/calibracoes" }, { label: "Nova" }]}
      />

      <CalibrationFieldsForm
        initialClientId={searchParams.get("clientId") ?? undefined}
        initialInstrumentId={searchParams.get("instrumentId") ?? undefined}
        onSaved={(calibration) => navigate(`/gestao/calibracoes/${calibration.id}`)}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
