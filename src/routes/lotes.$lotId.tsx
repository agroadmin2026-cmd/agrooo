import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  FlaskConical,
  Map,
  Scale,
  TrendingDown,
  TrendingUp,
  Wheat,
  Fuel,
  Tractor,
  CloudRain,
  Users,
  Bug,
  AlertTriangle,
} from "lucide-react";
import { lotCosts, useAgro } from "@/lib/agro-store";
import { formatMoney, number } from "@/lib/agro-data";
import { PageHeader, Panel, Pill, StatCard } from "@/components/agro/ui";

export const Route = createFileRoute("/lotes/$lotId")({
  head: () => ({
    meta: [
      { title: "Detalle de Lote y Margen Bruto · AgroAdmin Bolivia" },
      {
        name: "description",
        content:
          "Insumos aplicados, labores de maquinaria, entregas en silos, jornales, lluvias y estado de resultados por hectárea.",
      },
    ],
  }),
  component: LotDetail,
});

function LotDetail() {
  const { lotId } = Route.useParams();
  const store = useAgro();
  const lot = store.lots.find((l) => l.id === lotId);

  if (!lot) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Lote no encontrado.</p>
        <Link to="/lotes" className="text-primary font-medium mt-2 inline-block">
          ← Volver a lotes
        </Link>
      </div>
    );
  }

  const c = lotCosts(store, lot.id);
  const summary = store.getLotFinancialSummary(lot.id);
  const deliveries = store.harvestDeliveries.filter((h) => h.lotId === lot.id);
  const lotLaborers = store.laborers.filter((w) => w.lotId === lot.id);
  const lotRainfalls = store.rainfalls.filter((r) => r.lotId === lot.id);
  const lotScoutings = store.scoutings.filter((s) => s.lotId === lot.id);
  const mach = (id: string) => store.machines.find((m) => m.id === id)?.name ?? "—";

  const totalLotRainfallMm = lotRainfalls.reduce((acc, r) => acc + r.millimeters, 0);

  return (
    <>
      <Link
        to="/lotes"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Volver a Lotes y Parcelas
      </Link>

      <PageHeader
        title={lot.name}
        subtitle={`${lot.crop} · ${lot.status} · Superficie: ${lot.hectares} hectáreas ${
          lot.location ? `· ${lot.location}` : ""
        }`}
      />

      {/* KPI METRICS DE P&L Y RENDIMIENTO BIMONETARIO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Ingresos por Cosecha"
          value={formatMoney(summary?.revenueBs ?? 0, store.currencyMode, store.exchangeRate)}
          icon={TrendingUp}
          tone="success"
          hint={`${summary?.harvestTons ?? 0} t entregadas en silos`}
        />
        <StatCard
          label="Costo Total Invertido"
          value={formatMoney(summary?.expensesBs ?? 0, store.currencyMode, store.exchangeRate)}
          icon={TrendingDown}
          tone="danger"
          hint={`${formatMoney((summary?.expensesBs ?? 0) / lot.hectares, store.currencyMode, store.exchangeRate, true)} / ha`}
        />
        <StatCard
          label="Margen Bruto del Lote"
          value={formatMoney(summary?.grossMarginBs ?? 0, store.currencyMode, store.exchangeRate)}
          icon={DollarSign}
          tone={summary?.isProfitable ? "success" : "danger"}
          hint={`${formatMoney(summary?.grossMarginPerHaBs ?? 0, store.currencyMode, store.exchangeRate, true)} / ha`}
        />
        <StatCard
          label="Rendimiento Obtenido"
          value={`${summary?.yieldTonsPerHa ?? 0} t/ha`}
          icon={Wheat}
          tone="accent"
          hint={`Total ${summary?.harvestTons ?? 0} toneladas métricas`}
        />
      </div>

      {/* RESUMEN AGRONÓMICO RÁPIDO: LLUVIA Y SANIDAD */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Panel className="p-4 flex items-center justify-between border-l-4 border-l-sky-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
              <CloudRain className="size-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Precipitaciones en este Lote
              </span>
              <span className="text-lg font-black text-foreground">
                {totalLotRainfallMm.toFixed(1)} mm acumulados
              </span>
              <span className="text-xs text-muted-foreground block">
                {lotRainfalls.length} lecturas pluviométricas en parcela
              </span>
            </div>
          </div>
          <Link to="/lluvias" className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline">
            Ver todas →
          </Link>
        </Panel>

        <Panel className="p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Bug className="size-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Estado Fitosanitario
              </span>
              <span className="text-lg font-black text-foreground">
                {lotScoutings[0] ? lotScoutings[0].phenologicalStage : "Sin inspección"}
              </span>
              <span className="text-xs text-muted-foreground block">
                Plaga: {lotScoutings[0]?.pestName || "Ninguna"} ({lotScoutings[0]?.pestSeverity || "Controlada"})
              </span>
            </div>
          </div>
          <Link to="/monitoreo" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
            Ver scouting →
          </Link>
        </Panel>
      </div>

      {/* DETALLES DE COSTOS E INGRESOS EN 4 COLUMNAS */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* COLUMNA 1: INSUMOS APLICADOS */}
        <Panel className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-1.5">
                <FlaskConical className="size-4 text-primary" /> Insumos
              </h2>
              <span className="text-xs text-muted-foreground font-medium">
                {formatMoney(summary?.supplyCostBs ?? 0, store.currencyMode, store.exchangeRate)}
              </span>
            </div>

            {c.applied.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Sin aplicaciones de agroquímicos registradas en este lote.
              </p>
            ) : (
              <ul className="divide-y text-xs">
                {c.applied.map((a, i) => (
                  <li key={i} className="flex justify-between py-2.5">
                    <div>
                      <p className="font-semibold text-foreground">{a.supply.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {a.date} · {number(a.qty)} {a.supply.unit}
                      </p>
                    </div>
                    <span className="num font-bold text-foreground self-center">
                      {formatMoney(a.cost, store.currencyMode, store.exchangeRate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        {/* COLUMNA 2: LABORES DE MAQUINARIA Y DIÉSEL */}
        <Panel className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-1.5">
                <Tractor className="size-4 text-primary" /> Maquinaria
              </h2>
              <span className="text-xs text-muted-foreground font-medium">
                {formatMoney(
                  (summary?.machineCostBs ?? 0) + (summary?.dieselCostBs ?? 0),
                  store.currencyMode,
                  store.exchangeRate
                )}
              </span>
            </div>

            {c.usages.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Sin labores mecánicas registradas en este lote.
              </p>
            ) : (
              <ul className="divide-y text-xs">
                {c.usages.map((u) => {
                  const hours = u.endHours - u.startHours;
                  return (
                    <li key={u.id} className="flex justify-between py-2.5">
                      <div>
                        <p className="font-semibold text-foreground">
                          {mach(u.machineId)} {u.laborType && `· ${u.laborType}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {u.date} · {u.operator}
                          {u.dieselLiters && ` · ${u.dieselLiters} L diésel`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Pill tone="primary">+{hours} h</Pill>
                        {u.operatingCost && (
                          <span className="text-[11px] font-bold num block text-foreground mt-0.5">
                            {formatMoney(u.operatingCost, store.currencyMode, store.exchangeRate)}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Panel>

        {/* COLUMNA 3: MANO DE OBRA Y JORNALES */}
        <Panel className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-1.5">
                <Users className="size-4 text-primary" /> Jornales
              </h2>
              <span className="text-xs text-muted-foreground font-medium">
                {formatMoney(summary?.laborCostBs ?? 0, store.currencyMode, store.exchangeRate)}
              </span>
            </div>

            {lotLaborers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Sin jornales manuales registrados en este lote.
              </p>
            ) : (
              <ul className="divide-y text-xs">
                {lotLaborers.map((w) => (
                  <li key={w.id} className="flex justify-between py-2.5">
                    <div>
                      <p className="font-semibold text-foreground">{w.workerName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {w.date} · {w.taskDescription} ({w.daysWorked} d)
                      </p>
                    </div>
                    <span className="num font-bold text-foreground self-center">
                      {formatMoney(w.totalCostBs, store.currencyMode, store.exchangeRate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        {/* COLUMNA 4: ENTREGAS DE COSECHA EN SILOS */}
        <Panel className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-1.5">
                <Wheat className="size-4 text-emerald-600 dark:text-emerald-400" /> Silos
              </h2>
              <span className="text-xs text-muted-foreground font-medium">
                {formatMoney(summary?.revenueBs ?? 0, store.currencyMode, store.exchangeRate)}
              </span>
            </div>

            {deliveries.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Sin viajes de cosecha entregados en acopio para este lote.
              </p>
            ) : (
              <ul className="divide-y text-xs">
                {deliveries.map((h) => (
                  <li key={h.id} className="flex justify-between py-2.5">
                    <div>
                      <p className="font-semibold text-foreground">{h.siloDestination}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {h.date} · {h.ticketNumber} ({h.payableTons.toFixed(2)} t)
                      </p>
                    </div>
                    <span className="num font-extrabold text-emerald-600 dark:text-emerald-400 self-center">
                      +{formatMoney(h.totalAmountBs, store.currencyMode, store.exchangeRate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
