import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Map,
  PackagePlus,
  Receipt,
  Tractor,
  TrendingUp,
  Fuel,
  Wheat,
  Scale,
  CloudRain,
  Users,
  Bug,
  Droplets,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgro } from "@/lib/agro-store";
import { formatMoney, isLowStock, number } from "@/lib/agro-data";
import { Panel, Pill, StatCard } from "@/components/agro/ui";
import { LedgerDialog, SupplyDialog, UsageDialog } from "@/components/agro/dialogs";
import { RainfallDialog } from "@/components/agro/RainfallDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · AgroAdmin Bolivia" },
      {
        name: "description",
        content:
          "Panel central de gestión agrícola en Bolivia: maquinaria, inventario, cisterna de diésel B-SISA, cosecha, pluviómetro, jornales y contabilidad bimonetaria (Bs/USD).",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const store = useAgro();
  const {
    ledger,
    usages,
    supplies,
    lots,
    machines,
    fuelTank,
    harvestDeliveries,
    rainfalls,
    laborers,
    scoutings,
    currencyMode,
    exchangeRate,
  } = store;

  const month = "2026-10";
  const monthly = ledger.filter((e) => e.date.startsWith(month));
  const inc = monthly.filter((e) => e.type === "ingreso").reduce((a, e) => a + e.amount, 0);
  const exp = monthly.filter((e) => e.type === "egreso").reduce((a, e) => a + e.amount, 0);
  const hours = usages.reduce((a, u) => a + (u.endHours - u.startHours), 0);
  const low = supplies.filter(isLowStock);
  const ha = lots.reduce((a, l) => a + l.hectares, 0);

  const dieselSupply = supplies.find((s) => s.category === "Combustibles");
  const currentDieselLiters = dieselSupply ? dieselSupply.stock : 14200;
  const totalHarvestTons = harvestDeliveries.reduce((a, h) => a + h.payableTons, 0);
  const totalRainfallMm = rainfalls.reduce((a, r) => a + r.millimeters, 0);
  const criticalPests = scoutings.filter((s) => s.pestSeverity === "Umbral de Daño Económico");

  return (
    <>
      <section className="bg-hero text-primary-foreground rounded-2xl p-6 md:p-8 mb-6 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-sm opacity-80">Octubre 2026 · Campaña de Verano · Santa Cruz, Bolivia</p>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-foreground/20 font-semibold">
              Moneda: {currencyMode === "USD" ? `USD ($ · TC: ${exchangeRate})` : "Bolivianos (Bs)"}
            </span>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mt-2 tracking-tight">Estancia San José · AgroAdmin</h1>
        <p className="opacity-80 mt-2 max-w-2xl text-sm">
          Monitoreo integral en tiempo real: maquinaria ({machines.length} equipos), cisterna B-SISA ({number(currentDieselLiters)} L), entregas en silos ({totalHarvestTons.toFixed(1)} t), pluviómetro ({totalRainfallMm.toFixed(1)} mm) y mano de obra.
        </p>
        <div className="flex flex-wrap gap-2.5 mt-5">
          <UsageDialog trigger={<Button variant="secondary" className="gap-2 font-semibold"><Tractor className="size-4" /> Labor de maquinaria</Button>} />
          <RainfallDialog trigger={<Button variant="secondary" className="gap-2 font-semibold"><CloudRain className="size-4" /> Registrar lluvia</Button>} />
          <LedgerDialog trigger={<Button variant="secondary" className="gap-2 font-semibold"><Receipt className="size-4" /> Movimiento contable</Button>} />
          <SupplyDialog trigger={<Button variant="secondary" className="gap-2 font-semibold"><PackagePlus className="size-4" /> Entrada a depósito</Button>} />
        </div>
      </section>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Flujo de Caja Neto"
          value={formatMoney(inc - exp, currencyMode, exchangeRate)}
          icon={TrendingUp}
          tone={inc - exp >= 0 ? "success" : "danger"}
          hint={
            <span className="flex gap-3">
              <span className="text-success font-medium">↑ {formatMoney(inc, currencyMode, exchangeRate)}</span>
              <span className="text-destructive font-medium">↓ {formatMoney(exp, currencyMode, exchangeRate)}</span>
            </span>
          }
        />
        <StatCard
          label="Horas de Maquinaria"
          value={`${number(Math.round(hours * 10) / 10)} h`}
          icon={Clock}
          hint={`${usages.length} labores registradas`}
        />
        <StatCard
          label="Tanque Diésel B-SISA"
          value={`${number(currentDieselLiters)} L`}
          icon={Fuel}
          tone={currentDieselLiters > 3000 ? "primary" : "danger"}
          hint={`Capacidad: ${number(fuelTank.capacityLiters)} L`}
        />
        <StatCard
          label="Cosecha Entregada"
          value={`${number(Math.round(totalHarvestTons * 10) / 10)} t`}
          icon={Wheat}
          tone="accent"
          hint={`${harvestDeliveries.length} viajes en silos`}
        />
      </div>

      {/* WIDGETS RÁPIDOS: PLUVIÓMETRO & SANIDAD VEGETAL */}
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <Panel className="p-4 flex items-center justify-between border-l-4 border-l-sky-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
              <CloudRain className="size-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Pluviómetro de Campaña
              </span>
              <span className="text-lg font-black text-foreground">
                {totalRainfallMm.toFixed(1)} mm acumulados
              </span>
              <span className="text-xs text-muted-foreground block">
                Última lluvia: {rainfalls[0]?.date || "Sin registro"} ({rainfalls[0]?.millimeters || 0} mm)
              </span>
            </div>
          </div>
          <Link to="/lluvias" className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline">
            Ver lluvias →
          </Link>
        </Panel>

        <Panel className="p-4 flex items-center justify-between border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Bug className="size-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Sanidad Vegetal & Plagas
              </span>
              <span className="text-lg font-black text-foreground">
                {criticalPests.length > 0 ? `${criticalPests.length} alertas críticas` : "Cultivos bajo control"}
              </span>
              <span className="text-xs text-muted-foreground block">
                {scoutings.length} monitoreos fenológicos en campo
              </span>
            </div>
          </div>
          <Link to="/monitoreo" className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline">
            Ver scouting →
          </Link>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* ÚLTIMOS MOVIMIENTOS CONTABLES */}
        <Panel className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Últimos Movimientos Contables</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Valores expresados en {currencyMode === "USD" ? "Dólares Americanos (USD)" : "Bolivianos (Bs)"}
              </p>
            </div>
            <Link to="/contabilidad" className="text-xs text-primary font-semibold hover:underline">
              Ver libro completo →
            </Link>
          </div>
          <ul className="divide-y text-xs">
            {ledger.slice(0, 6).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-3">
                <div
                  className={`grid place-items-center size-8 rounded-full shrink-0 ${
                    e.type === "ingreso" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {e.type === "ingreso" ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">{e.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.date} · <span className="font-medium text-foreground/80">{e.category}</span>
                  </p>
                </div>
                <span
                  className={`num text-sm font-bold whitespace-nowrap ${
                    e.type === "ingreso" ? "text-success" : "text-foreground"
                  }`}
                >
                  {e.type === "ingreso" ? "+" : "−"}{formatMoney(e.amount, currencyMode, exchangeRate)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ALERTAS DE STOCK Y ACCESOS */}
        <div className="space-y-6">
          <Panel className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold tracking-tight">Alertas de Almacén</h2>
                <p className="text-xs text-muted-foreground">Insumos bajo stock de seguridad</p>
              </div>
              <Link to="/inventario" className="text-xs text-primary font-semibold hover:underline">
                Inventario →
              </Link>
            </div>
            {low.length === 0 ? (
              <p className="text-xs text-muted-foreground">Todos los insumos sobre el stock mínimo.</p>
            ) : (
              <ul className="space-y-3">
                {low.map((s) => (
                  <li key={s.id} className="text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">{s.name}</span>
                      <Pill tone="danger">
                        {number(s.stock)} / {number(s.minStock)} {s.unit}
                      </Pill>
                    </div>
                    <div className="h-1.5 mt-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-destructive transition-all"
                        style={{ width: `${Math.min(100, (s.stock / s.minStock) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* ACCESOS DIRECTOS */}
          <Panel className="p-5 bg-muted/20">
            <h3 className="font-semibold text-sm mb-3">Módulos Especializados</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link to="/combustible" className="p-2.5 rounded-lg bg-background border hover:border-primary/50 transition-colors block">
                <Fuel className="size-4 text-amber-500 mb-1" />
                <span className="font-bold text-foreground block">Diésel B-SISA</span>
                <span className="text-[10px] text-muted-foreground">Cisterna & Cupos</span>
              </Link>
              <Link to="/cosecha" className="p-2.5 rounded-lg bg-background border hover:border-primary/50 transition-colors block">
                <Wheat className="size-4 text-emerald-500 mb-1" />
                <span className="font-bold text-foreground block">Cosecha & Silos</span>
                <span className="text-[10px] text-muted-foreground">Tickets de Balanza</span>
              </Link>
              <Link to="/lluvias" className="p-2.5 rounded-lg bg-background border hover:border-primary/50 transition-colors block">
                <CloudRain className="size-4 text-sky-500 mb-1" />
                <span className="font-bold text-foreground block">Pluviómetro</span>
                <span className="text-[10px] text-muted-foreground">Lluvias (mm)</span>
              </Link>
              <Link to="/jornales" className="p-2.5 rounded-lg bg-background border hover:border-primary/50 transition-colors block">
                <Users className="size-4 text-purple-500 mb-1" />
                <span className="font-bold text-foreground block">Mano de Obra</span>
                <span className="text-[10px] text-muted-foreground">Jornales de Campo</span>
              </Link>
              <Link to="/monitoreo" className="p-2.5 rounded-lg bg-background border hover:border-primary/50 transition-colors block">
                <Bug className="size-4 text-red-500 mb-1" />
                <span className="font-bold text-foreground block">Sanidad Vegetal</span>
                <span className="text-[10px] text-muted-foreground">Plagas & Fenología</span>
              </Link>
              <Link to="/lotes" className="p-2.5 rounded-lg bg-background border hover:border-primary/50 transition-colors block">
                <Map className="size-4 text-accent-foreground mb-1" />
                <span className="font-bold text-foreground block">Lotes & P&L</span>
                <span className="text-[10px] text-muted-foreground">Margen / ha</span>
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
