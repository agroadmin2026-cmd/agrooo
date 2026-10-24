import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Tractor,
  Clock,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Wrench,
  Fuel,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgro } from "@/lib/agro-store";
import { currency, number, type MachineStatus, type MachineUsage } from "@/lib/agro-data";
import { PageHeader, Panel, Pill, StatCard, selectClass } from "@/components/agro/ui";
import { UsageDialog } from "@/components/agro/UsageDialog";
import { LaborReceiptModal } from "@/components/agro/LaborReceiptModal";

export const Route = createFileRoute("/maquinaria")({
  head: () => ({
    meta: [
      { title: "Maquinaria, Labores y Horómetros · AgroAdmin Bolivia" },
      {
        name: "description",
        content:
          "Control de horómetros en tiempo real, registro de labores agrícolas, descuento reactivo de insumos y diésel, e imputación contable en Bolivianos (Bs).",
      },
      { property: "og:title", content: "Maquinaria y Labores · AgroAdmin Bolivia" },
      {
        property: "og:description",
        content: "Gestión de maquinaria, control de diésel y costos operativos en Bs.",
      },
    ],
  }),
  component: Maquinaria,
});

const tone: Record<MachineStatus, "success" | "warning" | "danger"> = {
  Operativa: "success",
  Mantenimiento: "warning",
  "Fuera de servicio": "danger",
};

function Maquinaria() {
  const { machines, usages, lots, supplies } = useAgro();
  const [filterMachine, setFilterMachine] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMachineForDialog, setSelectedMachineForDialog] = useState<string | undefined>(
    undefined,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [receiptUsage, setReceiptUsage] = useState<MachineUsage | null>(null);

  // Quick stats
  const totalHoursWorked = usages.reduce((acc, u) => acc + (u.endHours - u.startHours), 0);
  const totalOperatingExpense = usages.reduce((acc, u) => {
    if (u.operatingCost) return acc + u.operatingCost;
    const m = machines.find((x) => x.id === u.machineId);
    return acc + (u.endHours - u.startHours) * (m?.hourlyCost ?? 0);
  }, 0);
  const totalDieselLiters = usages.reduce((acc, u) => acc + (u.dieselLiters ?? 0), 0);
  const operativeCount = machines.filter((m) => m.status === "Operativa").length;

  // Filtered rows
  const filteredUsages = usages.filter((u) => {
    const matchMachine = !filterMachine || u.machineId === filterMachine;
    const m = machines.find((x) => x.id === u.machineId);
    const l = lots.find((x) => x.id === u.lotId);
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !searchQuery ||
      u.operator.toLowerCase().includes(q) ||
      (m?.name.toLowerCase().includes(q) ?? false) ||
      (l?.name.toLowerCase().includes(q) ?? false) ||
      (u.laborType?.toLowerCase().includes(q) ?? false) ||
      (u.notes?.toLowerCase().includes(q) ?? false);
    return matchMachine && matchSearch;
  });

  const getMachine = (id: string) => machines.find((x) => x.id === id);
  const getLot = (id: string) => lots.find((x) => x.id === id);

  const openUsageForMachine = (mId: string) => {
    setSelectedMachineForDialog(mId);
    setIsDialogOpen(true);
  };

  const selectedReceiptMachine = receiptUsage ? getMachine(receiptUsage.machineId) : undefined;
  const selectedReceiptLot = receiptUsage ? getLot(receiptUsage.lotId) : undefined;
  const selectedReceiptSupply =
    receiptUsage && receiptUsage.supplyId
      ? supplies.find((s) => s.id === receiptUsage.supplyId)
      : undefined;

  return (
    <>
      <PageHeader
        title="Maquinaria y Horas"
        subtitle="Control de horómetros, mantenimiento preventivo y costos operativos en Bolivianos (Bs)"
        actions={
          <Button
            onClick={() => {
              setSelectedMachineForDialog(undefined);
              setIsDialogOpen(true);
            }}
            className="gap-2 shadow-sm font-semibold"
          >
            <Plus className="size-4" /> Registrar labor de maquinaria
          </Button>
        }
      />

      {/* KPI STAT CARDS: 2 columnas en smartphone */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-6">
        <StatCard
          label="Horas de Labor"
          value={`${number(Math.round(totalHoursWorked * 10) / 10)} h`}
          icon={Clock}
          tone="primary"
          hint={`${usages.length} labores`}
        />
        <StatCard
          label="Costo Operativo"
          value={currency(totalOperatingExpense)}
          icon={Tractor}
          tone="neutral"
          hint="En contabilidad"
        />
        <StatCard
          label="Diésel Consumido"
          value={`${number(totalDieselLiters)} L`}
          icon={Fuel}
          tone="accent"
          hint="Subvencionado"
        />
        <StatCard
          label="Parque Maquinaria"
          value={`${operativeCount} / ${machines.length}`}
          icon={Wrench}
          tone={operativeCount === machines.length ? "success" : "warning"}
          hint={`${operativeCount} operativas`}
        />
      </div>

      {/* TARJETAS DE MAQUINARIA ACTIVA */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {machines.map((m) => {
          const serviceInterval = m.serviceIntervalHours ?? 250;
          const hoursSinceLastService = m.hourmeter - (m.lastServiceHourmeter ?? 0);
          const hoursUntilService = Math.max(
            0,
            serviceInterval - (hoursSinceLastService % serviceInterval),
          );
          const serviceProgress = Math.min(
            100,
            Math.round(((serviceInterval - hoursUntilService) / serviceInterval) * 100),
          );
          const isUrgent = hoursUntilService <= 25;

          return (
            <Panel
              key={m.id}
              className="p-5 flex flex-col justify-between hover:border-primary/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="grid place-items-center size-10 rounded-lg bg-accent/25 text-accent-foreground">
                    <Tractor className="size-5" />
                  </div>
                  <Pill tone={tone[m.status]}>{m.status}</Pill>
                </div>
                <h3 className="font-semibold text-lg mt-3">{m.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {m.type} ·{" "}
                  <span className="font-medium text-foreground">{currency(m.hourlyCost)}/h</span>
                </p>
              </div>

              <div className="mt-4 pt-3 border-t space-y-3">
                {/* Horómetro actual */}
                <div>
                  <p className="text-xs text-muted-foreground">Horómetro actual</p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold num tracking-tight text-foreground">
                      {number(m.hourmeter)}{" "}
                      <span className="text-sm font-normal text-muted-foreground">h</span>
                    </p>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="size-3 text-emerald-500" /> Sincronizado
                    </span>
                  </div>
                </div>

                {/* Service Tracker */}
                <div className="p-2.5 rounded-lg bg-muted/40 border space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Wrench className="size-3 text-primary" /> Service ({serviceInterval}h):
                    </span>
                    <span
                      className={`font-semibold ${isUrgent ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}
                    >
                      {hoursUntilService === 0 ? "¡Toca ahora!" : `En ${hoursUntilService} h`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isUrgent ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{ width: `${serviceProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span>Consumo diésel:</span>
                    <span>~{m.fuelAverageLitersPerHour ?? 14} L/h</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold gap-1.5"
                  onClick={() => openUsageForMachine(m.id)}
                >
                  <Plus className="size-3.5" /> Cargar horas a esta máquina
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>

      {/* TABLA DE HISTORIAL DE USO */}
      {/* HISTORIAL DE USO Y LABORES */}
      <Panel className="mt-6">
        <div className="p-3.5 sm:p-5 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-base sm:text-xl font-semibold tracking-tight">Historial de uso y labores</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registro con horómetros, horas computadas e imputación contable.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por operador, lote o labor…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground shrink-0" />
              <select
                className={`${selectClass} w-full sm:w-44 text-xs h-9`}
                value={filterMachine}
                onChange={(e) => setFilterMachine(e.target.value)}
              >
                <option value="">Todas las máquinas</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Vista Móvil: Tarjetas táctiles de labores */}
        <div className="md:hidden p-3.5 space-y-3">
          {filteredUsages.map((u) => {
            const m = getMachine(u.machineId);
            const l = getLot(u.lotId);
            const s = supplies.find((x) => x.id === u.supplyId);
            const hours = Math.round((u.endHours - u.startHours) * 100) / 100;
            const cost = u.operatingCost ?? hours * (m?.hourlyCost ?? 0);

            return (
              <div
                key={u.id}
                className="p-3.5 rounded-xl border border-border bg-card shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary shrink-0" />
                      {u.laborType || "Labor mecanizada"}
                    </span>
                    <span className="text-xs text-muted-foreground block">{u.date}</span>
                  </div>
                  <Pill tone="primary">+{hours} h</Pill>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                  <span className="font-semibold text-foreground">{m?.name}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>{l?.name ?? "Lote"}</span>
                    {l && <Pill tone="neutral">{l.crop}</Pill>}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  <span>Operador: <b>{u.operator}</b></span> ·{" "}
                  <span className="font-mono">Horómetro: {number(u.startHours)} → {number(u.endHours)}</span>
                </div>

                {s && (
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                    Insumo: <b className="text-foreground">{s.name}</b> ({u.supplyQty} {s.unit})
                  </div>
                )}

                <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg text-xs">
                  <div>
                    {u.dieselLiters && (
                      <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                        <Fuel className="size-3" /> {u.dieselLiters} L diésel
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground block">Costo Operativo</span>
                    <span className="text-base font-black text-foreground">{currency(cost)}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-semibold h-8 gap-1.5"
                  onClick={() => setReceiptUsage(u)}
                >
                  <Receipt className="size-3.5" /> Ver Ficha de Labor
                </Button>
              </div>
            );
          })}
          {filteredUsages.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-xs">
              <AlertCircle className="size-6 mx-auto mb-2 opacity-50" />
              No se encontraron registros de labor.
            </div>
          )}
        </div>

        {/* Vista Escritorio: Tabla completa */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Labor / Tipo</th>
                <th className="px-4 py-3 font-medium">Máquina</th>
                <th className="px-4 py-3 font-medium">Lote / Parcela</th>
                <th className="px-4 py-3 font-medium">Operador</th>
                <th className="px-4 py-3 font-medium">Horómetro</th>
                <th className="px-4 py-3 font-medium text-right">Horas</th>
                <th className="px-4 py-3 font-medium text-right">Diésel</th>
                <th className="px-4 py-3 font-medium text-right">Costo Operativo</th>
                <th className="px-4 py-3 font-medium">Insumo Aplicado</th>
                <th className="px-4 py-3 text-center">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsages.map((u) => {
                const m = getMachine(u.machineId);
                const l = getLot(u.lotId);
                const s = supplies.find((x) => x.id === u.supplyId);
                const hours = Math.round((u.endHours - u.startHours) * 100) / 100;
                const cost = u.operatingCost ?? hours * (m?.hourlyCost ?? 0);

                return (
                  <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 num whitespace-nowrap text-muted-foreground">
                      {u.date}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3 text-primary" />{" "}
                        {u.laborType || "Labor mecanizada"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{m?.name ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{l?.name ?? "—"}</span>
                        {l && <Pill tone="neutral">{l.crop}</Pill>}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                      {u.operator}
                    </td>
                    <td className="px-4 py-3 num whitespace-nowrap text-muted-foreground text-xs font-mono">
                      {number(u.startHours)} → {number(u.endHours)}
                    </td>
                    <td className="px-4 py-3 text-right num whitespace-nowrap">
                      <Pill tone="primary" className="font-semibold">
                        +{hours} h
                      </Pill>
                    </td>
                    <td className="px-4 py-3 text-right num whitespace-nowrap text-xs">
                      {u.dieselLiters ? (
                        <span className="text-foreground font-medium flex items-center justify-end gap-1">
                          <Fuel className="size-3 text-amber-500" /> {u.dieselLiters} L
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right num whitespace-nowrap font-bold text-foreground">
                      {currency(cost)}
                      {u.costPerHectare && (
                        <span className="text-[10px] text-muted-foreground block font-normal">
                          {currency(u.costPerHectare)}/ha
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {s ? (
                        <div className="flex items-center gap-1.5">
                          <Pill tone="success">{s.category}</Pill>
                          <span className="text-foreground font-medium">{s.name}</span>
                          <span>
                            ({u.supplyQty} {s.unit})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => setReceiptUsage(u)}
                      >
                        <Receipt className="size-3.5" /> Ficha
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsages.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                    <AlertCircle className="size-6 mx-auto mb-2 opacity-50" />
                    No se encontraron registros de labor para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* MODAL DE REGISTRO */}
      <UsageDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        defaultMachineId={selectedMachineForDialog}
      />

      {/* MODAL DE COMPROBANTE DIGITAL / FICHA DE LABOR */}
      <LaborReceiptModal
        usage={receiptUsage}
        machine={selectedReceiptMachine}
        lot={selectedReceiptLot}
        supply={selectedReceiptSupply}
        open={!!receiptUsage}
        onOpenChange={(open) => !open && setReceiptUsage(null)}
      />
    </>
  );
}
