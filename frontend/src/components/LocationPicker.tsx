import { useQuery } from "@tanstack/react-query";
import type { UseFormRegister, UseFormWatch, UseFormSetValue, FieldValues, Path } from "react-hook-form";
import { listPlants } from "../api/plants";
import { listAreas } from "../api/areas";
import { listAssetSystems } from "../api/assetSystems";
import { listCostCenters } from "../api/costCenters";
import { SelectInput } from "./form/Field";

interface Props<T extends FieldValues> {
  clientId?: string;
  register: UseFormRegister<T>;
  watch: UseFormWatch<T>;
  setValue: UseFormSetValue<T>;
}

/** Planta -> Area -> Sistema em cascata + Centro de custo (independente) - localizacao/
 * classificacao do ativo. Reaproveitado no formulario de ativo da gestao e do portal
 * (mesmos nomes de campo: plantId/areaId/systemId/costCenterId). Trocar a planta limpa
 * a area/sistema escolhidos, ja que eles pertenciam a planta anterior. */
export function LocationPicker<T extends FieldValues>({ clientId, register, watch, setValue }: Props<T>) {
  const plantId = watch("plantId" as Path<T>) as string | undefined;
  const areaId = watch("areaId" as Path<T>) as string | undefined;

  const { data: plants } = useQuery({
    queryKey: ["plants-picker", clientId],
    queryFn: () => listPlants({ clientId, active: true }),
    enabled: !!clientId,
  });
  const { data: areas } = useQuery({
    queryKey: ["areas-picker", plantId],
    queryFn: () => listAreas({ plantId, active: true }),
    enabled: !!plantId,
  });
  const { data: systems } = useQuery({
    queryKey: ["asset-systems-picker", areaId],
    queryFn: () => listAssetSystems({ areaId, active: true }),
    enabled: !!areaId,
  });
  const { data: costCenters } = useQuery({
    queryKey: ["cost-centers-picker", clientId],
    queryFn: () => listCostCenters({ clientId, active: true }),
    enabled: !!clientId,
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SelectInput
        label="Planta"
        placeholder="Nenhuma"
        options={(plants ?? []).map((p) => ({ value: p.id, label: p.name }))}
        {...register("plantId" as Path<T>, {
          onChange: () => {
            setValue("areaId" as Path<T>, "" as never);
            setValue("systemId" as Path<T>, "" as never);
          },
        })}
      />
      <SelectInput
        label="Area"
        placeholder={plantId ? "Nenhuma" : "Selecione a planta primeiro"}
        options={(areas ?? []).map((a) => ({ value: a.id, label: a.name }))}
        disabled={!plantId}
        {...register("areaId" as Path<T>, {
          onChange: () => setValue("systemId" as Path<T>, "" as never),
        })}
      />
      <SelectInput
        label="Sistema"
        placeholder={areaId ? "Nenhum" : "Selecione a area primeiro"}
        options={(systems ?? []).map((s) => ({ value: s.id, label: s.name }))}
        disabled={!areaId}
        {...register("systemId" as Path<T>)}
      />
      <SelectInput
        label="Centro de custo"
        placeholder="Nenhum"
        options={(costCenters ?? []).map((c) => ({ value: c.id, label: c.name }))}
        {...register("costCenterId" as Path<T>)}
      />
    </div>
  );
}
