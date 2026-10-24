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
      }),
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Planilla de Jornales y Mano de Obra"
        subtitle="Seguimiento de labores manuales de campo, liquidaciones de cuadrilla e imputación de costos al lote"
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5 flex-1 sm:flex-initial text-xs">
              <Download className="size-4" />
              <span>Exportar CSV</span>
            </Button>
            <LaborerDialog />
          </div>
        }
      />

      {/* KPI Cards de Mano de Obra: 2 columnas en smartphone */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Panel className="p-3.5 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1">
            <span className="text-xs font-semibold text-muted-foreground line-clamp-2">
              Inversión en Mano de Obra
            </span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <DollarSign className="size-4 sm:size-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-2xl md:text-3xl font-black text-primary block truncate">
              {formatMoney(totalCostBs, store.currencyMode, store.exchangeRate)}
            </span>
            <span className="text-[11px] text-muted-foreground block truncate">
              Costo de producción
            </span>
          </div>
        </Panel>

        <Panel className="p-3.5 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1">
            <span className="text-xs font-semibold text-muted-foreground line-clamp-2">
              Jornales Totales
            </span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
              <Users className="size-4 sm:size-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-2xl md:text-3xl font-black text-foreground block truncate">
              {totalDays.toFixed(1)}{" "}
              <span className="text-xs sm:text-sm font-bold text-muted-foreground">días</span>
            </span>
            <span className="text-[11px] text-muted-foreground block truncate">
              En {store.laborers.length} turnos
            </span>
          </div>
        </Panel>

        <Panel className="p-3.5 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1">
            <span className="text-xs font-semibold text-muted-foreground line-clamp-2">
              Liquidado y Pagado
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
              <CheckCircle className="size-4 sm:size-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 block truncate">
              {formatMoney(paidCostBs, store.currencyMode, store.exchangeRate)}
            </span>
            <span className="text-[11px] text-muted-foreground block truncate">
              Comprobantes al día
            </span>
          </div>
        </Panel>

        <Panel className="p-3.5 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1">
            <span className="text-xs font-semibold text-muted-foreground line-clamp-2">
              Por Liquidar
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
              <Clock className="size-4 sm:size-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400 block truncate">
              {formatMoney(pendingCostBs, store.currencyMode, store.exchangeRate)}
            </span>
            <span className="text-[11px] text-muted-foreground block truncate">
              Por abonar a cuadrillas
            </span>
          </div>
        </Panel>
      </div>

      {/* Tabla y Tarjetas de Jornales */}
      <Panel className="p-3.5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              Registro de Labores y Pagos de Campo
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {store.laborers.length} registros
          </span>
        </div>

        {/* Vista Móvil: Tarjetas táctiles legibles */}
        <div className="md:hidden space-y-3">
          {store.laborers.map((l) => {
            const targetLot = store.lots.find((x) => x.id === l.lotId);
            return (
              <div
                key={l.id}
                className="p-3.5 rounded-xl border border-border bg-card shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-foreground block">{l.workerName}</span>
                    <span className="text-xs text-muted-foreground block">{l.taskDescription}</span>
                  </div>
                  <Pill tone={l.isPaid ? "success" : "warning"}>
                    {l.isPaid ? "Pagado" : "Pendiente"}
                  </Pill>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <div className="flex items-center gap-1 text-foreground font-medium">
                    <MapPin className="size-3.5 text-primary shrink-0" />
                    <span>{targetLot?.name || l.lotId}</span>
                  </div>
                  <span>{l.date}</span>
                </div>

                <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Jornales</span>
                    <span className="font-bold text-foreground">
                      {l.daysWorked} d · @ Bs {l.dailyRateBs}/d
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block text-[11px]">Liquidación Total</span>
                    <span className="text-base font-black text-primary">
                      {formatMoney(l.totalCostBs, store.currencyMode, store.exchangeRate)}
                    </span>
                  </div>
                </div>

                <Button
                  variant={l.isPaid ? "outline" : "default"}
                  size="sm"
                  className="w-full text-xs font-semibold h-8"
                  onClick={() => store.toggleLaborerPaid(l.id)}
                >
                  {l.isPaid ? "Marcar como Pendiente" : "✓ Confirmar Pago Liquidado"}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Vista Escritorio: Tabla completa */}
        <div className="hidden md:block overflow-x-auto">
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
                      {l.notes && (
                        <span className="text-[11px] text-muted-foreground block truncate max-w-xs">
                          {l.notes}
                        </span>
                      )}
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
                    <td className="py-3 px-3 text-center font-bold">{l.daysWorked} d</td>
                    <td className="py-3 px-3 text-right font-medium">Bs {l.dailyRateBs}</td>
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
