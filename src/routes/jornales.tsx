import { createFileRoute } from "@tanstack/react-router";
import { Users, DollarSign, Calendar, Download, CheckCircle, Clock, MapPin } from "lucide-react";
import { useAgro } from "@/lib/agro-store";
import { formatMoney, exportToCsv, number } from "@/lib/agro-data";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Pill } from "@/components/agro/ui";
import { LaborerDialog } from "@/components/agro/LaborerDialog";

export const Route = createFileRoute("/jornales")({
  head: () => ({
    meta: [
      { title: "Planilla de Jornales y Mano de Obra · AgroAdmin Bolivia" },
      {
        name: "description",
        content:
          "Control de cuadrillas de campo, jornales eventuales, tareas manuales y asignación de costos directos por lote en Santa Cruz, Bolivia.",
      },
    ],
  }),
  component: JornalesPage,
});

function JornalesPage() {
  const store = useAgro();

  const totalCostBs = store.laborers.reduce((acc, l) => acc + l.totalCostBs, 0);
  const totalDays = store.laborers.reduce((acc, l) => acc + l.daysWorked, 0);
  const pendingCostBs = store.laborers
    .filter((l) => !l.isPaid)
    .reduce((acc, l) => acc + l.totalCostBs, 0);
  const paidCostBs = totalCostBs - pendingCostBs;

  const handleExportCsv = () => {
    exportToCsv(
      "planilla_jornales_campo",
      [
        "Fecha",
        "Trabajador",
        "Lote",
        "Tarea Realizada",
        "Días Trabajados",
        "Tarifa Diaria (Bs)",
        "Total (Bs)",
        "Total (USD)",
        "Estado de Pago",
        "Notas",
      ],
      store.laborers.map((l) => {
        const lot = store.lots.find((x) => x.id === l.lotId)?.name || l.lotId;
        const totalUsd = (l.totalCostBs / store.exchangeRate).toFixed(2);
        return [
          l.date,
          l.workerName,
          lot,
          l.taskDescription,
          l.daysWorked,
          l.dailyRateBs,
          l.totalCostBs,
          totalUsd,
          l.isPaid ? "Pagado" : "Pendiente",
          l.notes || "",
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Planilla de Jornales y Mano de Obra"
          subtitle="Seguimiento de labores manuales de campo, liquidaciones de cuadrilla e imputación de costos al lote"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
            <Download className="size-4" />
            <span>Exportar Planilla CSV</span>
          </Button>
          <LaborerDialog />
        </div>
      </div>

      {/* KPI Cards de Mano de Obra */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel className="p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Total Invertido en Mano de Obra
            </span>
            <span className="text-3xl font-black text-primary">
              {formatMoney(totalCostBs, store.currencyMode, store.exchangeRate)}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              Imputado al costo de producción
            </span>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <DollarSign className="size-6" />
          </div>
        </Panel>

        <Panel className="p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Jornales Totales Registrados
            </span>
            <span className="text-3xl font-black text-foreground">
              {totalDays.toFixed(1)} <span className="text-lg font-bold text-muted-foreground">días</span>
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              En {store.laborers.length} turnos de trabajo
            </span>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500">
            <Users className="size-6" />
          </div>
        </Panel>

        <Panel className="p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Liquidado y Pagado
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatMoney(paidCostBs, store.currencyMode, store.exchangeRate)}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              Comprobantes al día
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle className="size-6" />
          </div>
        </Panel>

        <Panel className="p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Pendiente de Liquidación
            </span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatMoney(pendingCostBs, store.currencyMode, store.exchangeRate)}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              Por abonar a cuadrillas
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <Clock className="size-6" />
          </div>
        </Panel>
      </div>

      {/* Tabla de Jornales */}
      <Panel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Registro de Labores y Pagos de Campo</h2>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Registros: {store.laborers.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground font-semibold text-left">
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Trabajador / Cuadrilla</th>
                <th className="py-3 px-3">Lote Imputado</th>
                <th className="py-3 px-3">Tarea de Campo</th>
                <th className="py-3 px-3 text-center">Jornales</th>
                <th className="py-3 px-3 text-right">Tarifa (Bs/d)</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3 text-center">Estado de Pago</th>
                <th className="py-3 px-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {store.laborers.map((l) => {
                const targetLot = store.lots.find((x) => x.id === l.lotId);
                return (
                  <tr key={l.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3 font-medium whitespace-nowrap">{l.date}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-foreground block">{l.workerName}</span>
                      {l.notes && <span className="text-[11px] text-muted-foreground block truncate max-w-xs">{l.notes}</span>}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <MapPin className="size-3.5 text-primary" />
                        <span>{targetLot?.name || l.lotId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground text-xs font-medium">
                      {l.taskDescription}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {l.daysWorked} d
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      Bs {l.dailyRateBs}
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-primary">
                      {formatMoney(l.totalCostBs, store.currencyMode, store.exchangeRate)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Pill tone={l.isPaid ? "success" : "warning"}>
                        {l.isPaid ? "Pagado" : "Pendiente"}
                      </Pill>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => store.toggleLaborerPaid(l.id)}
                      >
                        {l.isPaid ? "Marcar Pendiente" : "Marcar Pagado"}
                      </Button>
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
