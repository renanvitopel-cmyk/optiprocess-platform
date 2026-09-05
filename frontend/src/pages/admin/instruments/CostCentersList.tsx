import { SimpleCatalogList } from "../../../components/SimpleCatalogList";
import { listCostCenters, createCostCenter, updateCostCenter, deleteCostCenter } from "../../../api/costCenters";
import { useCmms } from "../../../lib/cmms";

export default function CostCentersList() {
  const { assetsBase } = useCmms();
  return (
    <SimpleCatalogList
      title="Centros de custo"
      description="Classificacao contabil do custo de manutencao - identificada pelo numero"
      itemLabel="Centro de custo"
      /* O centro de custo e' identificado pelo NUMERO - o nome dele costuma repetir o da
         area, e ai o seletor mostrava "Linha 4" para escolher "Linha 4". */
      codeFirst
      codeRequired
      codeLabel="Numero do centro de custo"
      codePlaceholder="Ex.: 4101-02"
      nameLabel="Descricao"
      namePlaceholder="Ex.: Manutencao Industrial"
      breadcrumbs={[{ label: "Ativos", to: assetsBase }, { label: "Cadastros tecnicos", to: `${assetsBase}/cadastros` }, { label: "Centros de custo" }]}
      base="cost-centers"
      list={listCostCenters}
      create={createCostCenter}
      update={updateCostCenter}
      del={deleteCostCenter}
    />
  );
}
