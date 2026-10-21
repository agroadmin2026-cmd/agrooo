import { createFileRoute, Link } from "@tanstack/react-router";
import { Bug, AlertTriangle, ShieldCheck, Download, MapPin, Sparkles, ArrowRight, Sprout } from "lucide-react";
import { useAgro } from "@/lib/agro-store";
import { exportToCsv } from "@/lib/agro-data";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Pill } from "@/components/agro/ui";
import { ScoutingDialog } from "@/components/agro/ScoutingDialog";

export const Route = createFileRoute("/monitoreo")({
  head: () => ({
    meta: [
      { title: "Sanidad Vegetal y Monitoreo de Plagas · AgroAdmin Bolivia" },
      {
        name: "description",
        content:
          "Scouting agronómico, control de umbrales económicos de plagas, malezas resistentes y fenología en cultivos de Santa Cruz, Bolivia.",
      },
    ],
  }),
  component: MonitoreoPage,
});

function MonitoreoPage() {
  const store = useAgro();

  const criticalPests = store.scoutings.filter(
    (s) => s.pestSeverity === "Umbral de Daño Económico"
  );
  const mediumPests = store.scoutings.filter((s) => s.pestSeverity === "Media");
  const highWeeds = store.scoutings.filter(
    (s) => s.weedPressure === "Alta (Requiere desecación)"
  );

  const handleExportCsv = () => {
    exportToCsv(
      "monitoreo_sanidad_vegetal",
      [
        "Fecha",
        "Lote",
        "Estadío Fenológico",
        "Plaga Principal",
        "Severidad Plaga",
        "Presión de Malezas",
        "Enfermedad Foliar",
        "Acción Recomendada",
        "Observaciones",
      ],
      store.scoutings.map((s) => {
        const lot = store.lots.find((x) => x.id === s.lotId)?.name || s.lotId;
        return [
          s.date,
          lot,
          s.phenologicalStage,
          s.pestName || "Ninguna",
          s.pestSeverity,
          s.weedPressure,
          s.disease || "Ninguna",
          s.recommendedAction,
          s.notes || "",
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Monitoreo de Campo y Sanidad Vegetal"
          subtitle="Scouting agronómico de plagas, umbrales de daño económico, malezas y estadíos fenológicos"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
            <Download className="size-4" />
            <span>Exportar Monitoreos CSV</span>
          </Button>
          <ScoutingDialog />
        </div>
      </div>

      {/* KPI Cards de Sanidad */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel className="p-5 flex items-start justify-between border-l-4 border-l-amber-500">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Umbral de Daño Económico
            </span>
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {criticalPests.length} <span className="text-lg font-bold text-muted-foreground">lotes</span>
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium block mt-1">
              Requiere aplicación urgente
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <AlertTriangle className="size-6" />
          </div>
        </Panel>

        <Panel className="p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Infestación Moderada
            </span>
            <span className="text-3xl font-black text-foreground">
              {mediumPests.length} <span className="text-lg font-bold text-muted-foreground">lotes</span>
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              En monitoreo cada 48 hrs
            </span>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500">
            <Bug className="size-6" />
          </div>
        </Panel>

        <Panel className="p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Focos de Malezas
            </span>
            <span className="text-3xl font-black text-foreground">
              {highWeeds.length > 0 ? `${highWeeds.length} lotes` : "Controlado"}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              Chía, digitaria y amaranthus
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <Sprout className="size-6" />
          </div>
        </Panel>

        <Panel className="p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Inspecciones Realizadas
            </span>
            <span className="text-3xl font-black text-foreground">
              {store.scoutings.length}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              Campaña Verano 2026/27
            </span>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
        </Panel>
      </div>

      {/* Tabla de Monitoreos */}
      <Panel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bug className="size-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Historial de Scouting y Diagnósticos Agronómicos</h2>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Total inspecciones: {store.scoutings.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground font-semibold text-left">
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Lote Inspeccionado</th>
                <th className="py-3 px-3">Fenología</th>
                <th className="py-3 px-3">Plaga Detectada</th>
                <th className="py-3 px-3 text-center">Nivel / Umbral</th>
                <th className="py-3 px-3">Presión Malezas</th>
                <th className="py-3 px-3">Acción Recomendada</th>
                <th className="py-3 px-3">Insumo Almacén</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {store.scoutings.map((s) => {
                const targetLot = store.lots.find((x) => x.id === s.lotId);
                const targetSupply = s.supplyRecommendedId
                  ? store.supplies.find((x) => x.id === s.supplyRecommendedId)
                  : undefined;

                return (
                  <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 font-medium whitespace-nowrap">{s.date}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <MapPin className="size-3.5 text-primary" />
                        <span>{targetLot?.name || s.lotId}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground block">
                        Cultivo: {targetLot?.crop}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-xs text-muted-foreground">
                      {s.phenologicalStage}
                    </td>
                    <td className="py-3 px-3 font-semibold text-foreground text-xs">
                      {s.pestName || "Sin plagas visibles"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Pill
                        tone={
                          s.pestSeverity === "Umbral de Daño Económico"
                            ? "warning"
                            : s.pestSeverity === "Media"
                            ? "primary"
                            : "success"
                        }
                      >
                        {s.pestSeverity}
                      </Pill>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">
                      {s.weedPressure}
                    </td>
                    <td className="py-3 px-3 text-xs font-medium text-foreground max-w-xs">
                      {s.recommendedAction}
                    </td>
                    <td className="py-3 px-3">
                      {targetSupply ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-primary block truncate max-w-[130px]">
                            {targetSupply.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({targetSupply.stock} {targetSupply.unit})
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
