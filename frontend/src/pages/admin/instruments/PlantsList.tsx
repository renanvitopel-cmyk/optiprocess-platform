import { SimpleCatalogList } from "../../../components/SimpleCatalogList";
import { listPlants, createPlant, updatePlant, deletePlant } from "../../../api/plants";
import { useCmms } from "../../../lib/cmms";

export default function PlantsList() {
  const { assetsBase } = useCmms();
  return (
    <SimpleCatalogList
      title="Plantas"
      description="Unidades/fabricas da empresa - primeiro nivel da localizacao do ativo"
      itemLabel="Planta"
      namePlaceholder="Ex.: Fabrica Unidade Belo Horizonte"
      breadcrumbs={[{ label: "Ativos", to: assetsBase }, { label: "Cadastros tecnicos", to: `${assetsBase}/cadastros` }, { label: "Plantas" }]}
      base="plants"
      list={listPlants}
      create={createPlant}
      update={updatePlant}
      del={deletePlant}
    />
  );
}
