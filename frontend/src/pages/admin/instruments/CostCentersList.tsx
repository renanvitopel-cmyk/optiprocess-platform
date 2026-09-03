import { SimpleCatalogList } from "../../../components/SimpleCatalogList";
import { listCostCenters, createCostCenter, updateCostCenter, deleteCostCenter } from "../../../api/costCenters";
import { useCmms } from "../../../lib/cmms";

export default function CostCentersList() {
  const { assetsBase } = useCmms();
  return (
    <SimpleCatalogList
      title="Centros de custo"
      description="Classificacao contabil usada para apurar custo de manutencao por centro"
      itemLabel="Centro de custo"
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
