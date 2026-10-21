import { createFileRoute } from "@tanstack/react-router";
import { CloudRain, Droplets, Calendar, Download, AlertTriangle, CheckCircle2, MapPin } from "lucide-react";
import { useAgro } from "@/lib/agro-store";
import { exportToCsv } from "@/lib/agro-data";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Pill } from "@/components/agro/ui";
import { RainfallDialog } from "@/components/agro/RainfallDialog";

export const Route = createFileRoute("/lluvias")({
  head: () => ({
    meta: [
      { title: "Pluviómetro y Régimen de Lluvias · AgroAdmin Bolivia" },
      {
        name: "description",
        content:
          "Registro pluviométrico en milímetros (mm), acumulados de campaña y aptitud de suelo para labores agrícolas en Santa Cruz, Bolivia.",
      },
    ],
  }),
  component: LluviasPage,
});

function LluviasPage() {
  const store = useAgro();

  const totalMonthlyMm = store.rainfalls.reduce((acc, r) => acc + r.millimeters, 0);
  const avgMmPerRain = store.rainfalls.length > 0 ? totalMonthlyMm / store.rainfalls.length : 0;
  const latestRain = store.rainfalls[0];

  const handleExportCsv = () => {
    exportToCsv(
      "pluviometro_lluvias",
      ["Fecha", "Ubicación / Lote", "Precipitación (mm)", "Duración (h)", "Condición del Suelo", "Observaciones"],
      store.rainfalls.map((r) => {
        const lot = r.lotId ? store.lots.find((l) => l.id === r.lotId)?.name : "Estación Central";
        return [
          r.date,
          lot || "Estación Central",
          r.millimeters,
          r.durationHours || "-",
          r.soilCondition,
          r.notes || "",
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Pluviómetro y Régimen de Precipitaciones"
          subtitle="Monitoreo de lluvias en milímetros (mm), humedad en suelo y aptitud para labores mecánicas"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
            <Download className="size-4" />
            <span>Exportar CSV</span>
          </Button>
          <RainfallDialog />
        </div>
      </div>

      {/* KPI Cards Pluviométricas */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel className="p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Acumulado del Mes
            </span>
            <span className="text-3xl font-black text-sky-600 dark:text-sky-400">
              {totalMonthlyMm.toFixed(1)} <span className="text-lg font-bold text-muted-foreground">mm</span>
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              En {store.rainfalls.length} eventos registrados
            </span>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500">
            <CloudRain className="size-6" />
          </div>
        </Panel>

        <Panel className="p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Promedio por Lluvia
            </span>
            <span className="text-3xl font-black text-foreground">
              {avgMmPerRain.toFixed(1)} <span className="text-lg font-bold text-muted-foreground">mm</span>
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              Régimen moderado
            </span>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Droplets className="size-6" />
          </div>
        </Panel>

        <Panel className="p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Última Precipitación
            </span>
            <span className="text-2xl font-bold text-foreground">
              {latestRain ? `${latestRain.millimeters} mm` : "Sin registro"}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              {latestRain ? latestRain.date : "-"}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <Calendar className="size-6" />
          </div>
        </Panel>

        <Panel className="p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Estado del Suelo (Campo)
            </span>
            <span className="text-base font-bold text-foreground block">
              {latestRain?.soilCondition || "Óptimo para labores"}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              Monitoreo técnico activo
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <CheckCircle2 className="size-6" />
          </div>
        </Panel>
      </div>

      {/* Historial Pluviométrico */}
      <Panel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CloudRain className="size-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Lecturas Pluviométricas Registradas</h2>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Total lecturas: {store.rainfalls.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground font-semibold text-left">
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Ubicación / Parcela</th>
                <th className="py-3 px-3 text-right">Lluvia (mm)</th>
                <th className="py-3 px-3 text-center">Duración</th>
                <th className="py-3 px-3">Condición de Suelo</th>
                <th className="py-3 px-3">Observaciones de Campo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {store.rainfalls.map((r) => {
                const targetLot = r.lotId ? store.lots.find((l) => l.id === r.lotId) : undefined;
                return (
                  <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 font-medium whitespace-nowrap">{r.date}</td>
                    <td className="py-3 px-3">
                      {targetLot ? (
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <MapPin className="size-3.5 text-primary" />
                          <span>{targetLot.name}</span>
                          <span className="text-xs text-muted-foreground font-normal">({targetLot.crop})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                          <MapPin className="size-3.5 text-sky-500" />
                          <span>Estación Central Estancia</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-base font-extrabold text-sky-600 dark:text-sky-400">
                        {r.millimeters.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">mm</span>
                    </td>
                    <td className="py-3 px-3 text-center text-xs text-muted-foreground">
                      {r.durationHours ? `${r.durationHours} hrs` : "-"}
                    </td>
                    <td className="py-3 px-3">
                      <Pill
                        tone={
                          r.soilCondition.includes("Anegado")
                            ? "warning"
                            : r.soilCondition.includes("Déficit")
                            ? "neutral"
                            : "success"
                        }
                      >
                        {r.soilCondition}
                      </Pill>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground max-w-xs truncate">
                      {r.notes || "—"}
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
