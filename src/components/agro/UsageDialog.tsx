import { useState, useId, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Tractor,
  Clock,
  MapPin,
  User,
  FlaskConical,
  Fuel,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileText,
  Wrench,
  Gauge,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgro } from "@/lib/agro-store";
import { currency, number, type LaborType } from "@/lib/agro-data";
import { Field, Pill, selectClass } from "./ui";

const todayStr = () => new Date().toISOString().slice(0, 10);

const LABOR_TYPES: LaborType[] = [
  "Pulverización / Fumigación",
  "Siembra directa",
  "Preparación de suelo (Rastra / Cincel)",
  "Cosecha mecanizada",
  "Fertilización",
  "Transporte / Apoyo",
];

const DIESEL_PRICE_BS = 3.72; // Precio referencial oficial B-SISA en Bolivia

interface UsageDialogProps {
  trigger?: ReactNode | undefined;
  defaultMachineId?: string | undefined;
  defaultLotId?: string | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
}

export function UsageDialog({
  trigger,
  defaultMachineId,
  defaultLotId,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: UsageDialogProps) {
  const { machines, lots, supplies, registerUsage } = useAgro();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  // Initial machine
  const initialMachine =
    machines.find((m) => m.id === defaultMachineId) ||
    machines.find((m) => m.status === "Operativa") ||
    machines[0];

  const initialLot = lots.find((l) => l.id === defaultLotId) || lots[0];

  const formId = useId();

  // Form State
  const [machineId, setMachineId] = useState(initialMachine ? initialMachine.id : "");
  const [lotId, setLotId] = useState(initialLot ? initialLot.id : "");
  const [operator, setOperator] = useState("");
  const [laborType, setLaborType] = useState<LaborType>("Pulverización / Fumigación");
  const [date, setDate] = useState(todayStr());
  const [startHours, setStartHours] = useState<number>(
    initialMachine ? initialMachine.hourmeter : 0,
  );
  const [endHours, setEndHours] = useState<number>(initialMachine ? initialMachine.hourmeter : 0);
  const [supplyId, setSupplyId] = useState<string>("");
  const [supplyQty, setSupplyQty] = useState<number>(0);
  const [dieselLiters, setDieselLiters] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lookups
  const selectedMachine = machines.find((m) => m.id === machineId) || machines[0];
  const selectedLot = lots.find((l) => l.id === lotId) || lots[0];
  const selectedSupply = supplies.find((s) => s.id === supplyId);
  const dieselSupply = supplies.find((s) => s.category === "Combustibles");

  // Reset form when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && selectedMachine) {
      const activeMachine =
        machines.find((m) => m.id === defaultMachineId) ||
        machines.find((m) => m.status === "Operativa") ||
        machines[0];
      if (activeMachine) {
        setMachineId(activeMachine.id);
        setStartHours(activeMachine.hourmeter);
        setEndHours(activeMachine.hourmeter);
      }
      if (defaultLotId) {
        setLotId(defaultLotId);
      }
      setOperator("");
      setLaborType("Pulverización / Fumigación");
      setDate(todayStr());
      setSupplyId("");
      setSupplyQty(0);
      setDieselLiters(0);
      setNotes("");
    }
  };

  // Machine change handler
  const handleMachineChange = (newMachineId: string) => {
    setMachineId(newMachineId);
    const m = machines.find((x) => x.id === newMachineId);
    if (m) {
      setStartHours(m.hourmeter);
      setEndHours(m.hourmeter);
    }
  };

  // Calculations
  const rawHoursOperated = endHours - startHours;
  const hoursOperated = Math.max(0, Math.round(rawHoursOperated * 100) / 100);
  const isValidHours = rawHoursOperated > 0;
  const hourlyCost = selectedMachine ? selectedMachine.hourlyCost : 0;
  const machineOperatingCost = Math.round(hoursOperated * hourlyCost * 100) / 100;
  const newMachineHourmeter = selectedMachine
    ? Math.max(selectedMachine.hourmeter, endHours)
    : endHours;

  // Maintenance Service Hours Status
  const serviceInterval = selectedMachine?.serviceIntervalHours ?? 250;
  const hoursSinceLastService = newMachineHourmeter - (selectedMachine?.lastServiceHourmeter ?? 0);
  const hoursUntilService = Math.max(
    0,
    serviceInterval - (hoursSinceLastService % serviceInterval),
  );
  const isServiceClose = hoursUntilService <= 25;

  // Supply calculations & validations
  const availableStock = selectedSupply ? selectedSupply.stock : 0;
  const isStockSufficient = !selectedSupply || (supplyQty > 0 && supplyQty <= availableStock);
  const projectedRemainingStock = selectedSupply ? Math.max(0, availableStock - supplyQty) : 0;
  const supplyCost = selectedSupply
    ? Math.round(supplyQty * selectedSupply.unitCost * 100) / 100
    : 0;

  // Fuel (Diésel) calculations
  const dieselEstimatedCost = Math.round(dieselLiters * DIESEL_PRICE_BS * 100) / 100;
  const litersPerHour =
    hoursOperated > 0 && dieselLiters > 0 ? (dieselLiters / hoursOperated).toFixed(1) : "—";

  // Total Investment
  const totalOperationCost = machineOperatingCost + supplyCost + dieselEstimatedCost;
  const costPerHectare =
    selectedLot && selectedLot.hectares > 0
      ? Math.round((totalOperationCost / selectedLot.hectares) * 100) / 100
      : undefined;

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!operator.trim()) {
      toast.error("Falta el operador responsable", {
        description: "Por favor indique el nombre del operador o maquinista.",
      });
      return;
    }

    if (!isValidHours) {
      toast.error("Horómetro final inválido", {
        description:
          "El horómetro final debe ser mayor al horómetro inicial registrado para calcular las horas de labor.",
      });
      return;
    }

    if (selectedSupply && supplyQty <= 0) {
      toast.error("Cantidad de insumo inválida", {
        description: "Especifique una cantidad mayor a cero o elija 'Ninguno'.",
      });
      return;
    }

    if (selectedSupply && !isStockSufficient) {
      toast.error("Stock insuficiente", {
        description: `Solo hay ${availableStock} ${selectedSupply.unit} disponibles de ${selectedSupply.name}.`,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const result = registerUsage({
        date,
        machineId,
        lotId,
        operator: operator.trim(),
        laborType,
        startHours,
        endHours,
        supplyId: supplyId || undefined,
        supplyQty: supplyId && supplyQty > 0 ? supplyQty : undefined,
        dieselLiters: dieselLiters > 0 ? dieselLiters : undefined,
        notes: notes.trim() || undefined,
      });

      toast.success("Labor registrada exitosamente en AgroAdmin", {
        description: (
          <div className="space-y-1 text-xs mt-1">
            <p>
              ✔ <b>{result.machineName}:</b> Horómetro actualizado a{" "}
              <b>{number(result.newHourmeter)} h</b> (+{result.hoursOperated} h).
            </p>
            <p>
              ✔ <b>Libro Contable:</b> Se imputó egreso de <b>{currency(result.operatingCost)}</b>{" "}
              por costo operativo de labor.
            </p>
            {result.supplyDeducted && (
              <p>
                ✔ <b>Inventario:</b> Se descontaron {number(result.supplyDeducted.quantity)}{" "}
                {result.supplyDeducted.unit} de {result.supplyDeducted.name} (Quedan{" "}
                {number(result.supplyDeducted.remainingStock)}).
              </p>
            )}
            {dieselLiters > 0 && (
              <p>
                ✔ <b>Diésel:</b> Se registraron {dieselLiters} L de combustible ({litersPerHour}{" "}
                L/h).
              </p>
            )}
          </div>
        ),
        duration: 5500,
      });

      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar labor";
      toast.error("Error al procesar", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-3xl max-h-[92dvh] overflow-y-auto p-0 gap-0 border-border/80 shadow-2xl rounded-2xl">
        {/* HEADER */}
        <DialogHeader className="p-3.5 sm:p-6 pb-2.5 sm:pb-4 bg-muted/30 border-b text-left">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-primary text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              <Tractor className="size-3.5 sm:size-4" /> AgroAdmin · Gestión Maquinaria
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Valores en Bs
            </span>
          </div>
          <DialogTitle className="text-base sm:text-xl font-bold tracking-tight mt-1">
            Registrar Labor y Uso de Maquinaria
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground">
            Control de horómetros, horas efectivas, consumo de diésel e insumos con asiento contable automático.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-5">
          {/* SECCIÓN 1: MÁQUINA Y DESTINO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Máquina */}
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tractor className="size-3.5" /> Máquina asignada
              </label>
              <select
                className={selectClass}
                value={machineId}
                onChange={(e) => handleMachineChange(e.target.value)}
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.type})
                  </option>
                ))}
              </select>
              {selectedMachine && (
                <div className="text-xs p-2 rounded-md bg-muted/50 border space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tarifa horaria:</span>
                    <b className="text-foreground">{currency(selectedMachine.hourlyCost)}/h</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horómetro base:</span>
                    <b className="num text-foreground">{number(selectedMachine.hourmeter)} h</b>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Wrench className="size-3" /> Próx. service:
                    </span>
                    <span
                      className={
                        isServiceClose ? "text-amber-600 font-semibold" : "text-muted-foreground"
                      }
                    >
                      en {hoursUntilService} h
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Lote */}
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5" /> Lote o Parcela
              </label>
              <select
                className={selectClass}
                value={lotId}
                onChange={(e) => setLotId(e.target.value)}
              >
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — {l.crop} ({l.hectares} ha)
                  </option>
                ))}
              </select>
              {selectedLot && (
                <div className="text-xs p-2 rounded-md bg-muted/50 border space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cultivo actual:</span>
                    <b className="text-foreground">{selectedLot.crop}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Superficie:</span>
                    <b className="text-foreground">{selectedLot.hectares} ha</b>
                  </div>
                  {selectedLot.location && (
                    <div className="flex justify-between text-[11px] pt-1 border-t text-muted-foreground">
                      <span>Ubicación:</span>
                      <span>{selectedLot.location}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tipo de Labor */}
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Tipo de Labor Agrícola
              </label>
              <select
                className={selectClass}
                value={laborType}
                onChange={(e) => setLaborType(e.target.value as LaborType)}
              >
                {LABOR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div className="text-xs p-2 rounded-md bg-muted/50 border flex flex-col justify-center min-h-[66px]">
                <span className="text-[11px] text-muted-foreground">
                  Se imputará directamente en el centro de costos del lote como labor de{" "}
                  <b>{laborType}</b>.
                </span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: OPERADOR Y FECHA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Operador / Maquinista responsable">
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Ej. Juan Rojas / Carlos Vaca"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  required
                />
              </div>
            </Field>

            <Field label="Fecha de operación">
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-9"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </Field>
          </div>

          {/* SECCIÓN 3: CONTROL DE HORÓMETROS Y HORAS EFECTIVAS */}
          <div className="p-3 sm:p-4 rounded-xl border bg-card/60 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" /> Horómetros y Horas Efectivas
              </h4>
              <span className="text-[10px] sm:text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Cálculo instantáneo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
              <Field label="Horómetro Inicial (h)">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={startHours}
                  onChange={(e) => setStartHours(parseFloat(e.target.value) || 0)}
                  className="font-mono text-base font-semibold"
                />
              </Field>

              <Field label="Horómetro Final (h)">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={endHours}
                  onChange={(e) => setEndHours(parseFloat(e.target.value) || 0)}
                  className={`font-mono text-base font-semibold ${
                    !isValidHours && rawHoursOperated !== 0
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }`}
                />
              </Field>
            </div>

            {/* Resumen dinámico */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t">
              <div className="p-2 sm:p-2.5 rounded-lg bg-background border flex flex-col justify-between">
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                  Horas Efectivas:
                </span>
                <span
                  className={`text-base sm:text-lg font-bold num ${
                    isValidHours ? "text-primary" : "text-destructive"
                  }`}
                >
                  {rawHoursOperated > 0 ? `+${hoursOperated} h` : `${rawHoursOperated} h`}
                </span>
              </div>

              <div className="p-2 sm:p-2.5 rounded-lg bg-background border flex flex-col justify-between">
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                  Costo ({currency(selectedMachine?.hourlyCost ?? 0)}/h):
                </span>
                <span className="text-base sm:text-lg font-bold num text-foreground">
                  {currency(machineOperatingCost)}
                </span>
              </div>

              <div className="p-2 sm:p-2.5 rounded-lg bg-background border flex flex-col justify-between">
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                  Horómetro Nuevo:
                </span>
                <span className="text-base sm:text-lg font-bold num text-emerald-600 dark:text-emerald-400">
                  {number(newMachineHourmeter)} h
                </span>
              </div>

              <div className="p-2 sm:p-2.5 rounded-lg bg-background border flex flex-col justify-between">
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                  Costo por Hectárea:
                </span>
                <span className="text-base sm:text-lg font-bold num text-foreground">
                  {costPerHectare ? `${currency(costPerHectare)}/ha` : "—"}
                </span>
              </div>
            </div>

            {!isValidHours && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
                <AlertCircle className="size-4 shrink-0" />
                <span>
                  El horómetro final debe ser mayor al horómetro inicial ({startHours} h).
                </span>
              </div>
            )}
          </div>

          {/* SECCIÓN 4: DIÉSEL Y COMBUSTIBLE (ESPECÍFICO BOLIVIA) */}
          <div className="p-3 sm:p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Fuel className="size-3.5" /> Consumo de Combustible (Diésel Oíl)
              </h4>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                Precio B-Sisa: <b>Bs {DIESEL_PRICE_BS.toFixed(2)}/L</b>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Litros de Diésel cargados/consumidos
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Ej. 120 Litros"
                  value={dieselLiters || ""}
                  onChange={(e) => setDieselLiters(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Costo de Combustible Estimado
                </label>
                <div className="h-9 px-3 rounded-md bg-background border flex items-center text-sm font-semibold num text-foreground">
                  {currency(dieselEstimatedCost)}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Rendimiento (L/hora de labor)
                </label>
                <div className="h-9 px-3 rounded-md bg-background border flex items-center justify-between text-sm num text-foreground">
                  <span>{litersPerHour} L/h</span>
                  <span className="text-[11px] text-muted-foreground">
                    (Prom: {selectedMachine?.fuelAverageLitersPerHour ?? 15} L/h)
                  </span>
                </div>
              </div>
            </div>

            {dieselSupply && (
              <p className="text-[11px] text-muted-foreground">
                Stock actual en cisterna de estancia: <b>{number(dieselSupply.stock)} Litros</b>
                {dieselLiters > 0 &&
                  ` → Quedarán ${number(Math.max(0, dieselSupply.stock - dieselLiters))} L`}
                .
              </p>
            )}
          </div>

          {/* SECCIÓN 5: INSUMO / INSECTICIDA / QUÍMICO ASOCIADO */}
          <div className="p-3 sm:p-4 rounded-xl border bg-muted/20 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FlaskConical className="size-3.5 text-primary" /> Insumo o Agroquímico (Opcional)
              </h4>
              {selectedSupply && (
                <span className="text-xs font-medium text-primary">{selectedSupply.category}</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Seleccionar producto de depósito
                </label>
                <select
                  className={selectClass}
                  value={supplyId}
                  onChange={(e) => {
                    setSupplyId(e.target.value);
                    setSupplyQty(0);
                  }}
                >
                  <option value="">Ninguno (Labor mecánica pura sin aplicación)</option>
                  {supplies
                    .filter((s) => s.category !== "Combustibles")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.category}] {s.name} — Stock: {number(s.stock)} {s.unit} (
                        {currency(s.unitCost, true)}/{s.unit})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Cantidad aplicada {selectedSupply ? `(${selectedSupply.unit})` : ""}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  disabled={!selectedSupply}
                  placeholder={selectedSupply ? "0" : "N/A"}
                  value={supplyQty || ""}
                  onChange={(e) => setSupplyQty(parseFloat(e.target.value) || 0)}
                  className={!isStockSufficient ? "border-destructive" : ""}
                />
              </div>
            </div>

            {selectedSupply && (
              <div className="space-y-2 pt-2 border-t text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-muted-foreground">
                    Stock en Depósito:{" "}
                    <b>
                      {number(selectedSupply.stock)} {selectedSupply.unit}
                    </b>
                  </span>
                  <span className="text-muted-foreground">
                    Precio:{" "}
                    <b>
                      {currency(selectedSupply.unitCost, true)} / {selectedSupply.unit}
                    </b>
                  </span>
                  <span className="text-muted-foreground">
                    Costo insumo: <b className="text-foreground">{currency(supplyCost, true)}</b>
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-background border flex items-center justify-between">
                  <span className="text-muted-foreground">Proyección de Stock:</span>
                  <span
                    className={`font-semibold num ${
                      isStockSufficient ? "text-foreground" : "text-destructive"
                    }`}
                  >
                    {number(selectedSupply.stock)} − {supplyQty} ={" "}
                    <b>
                      {number(projectedRemainingStock)} {selectedSupply.unit}
                    </b>
                  </span>
                </div>

                {!isStockSufficient && (
                  <div className="flex items-center gap-1.5 text-destructive font-medium">
                    <AlertCircle className="size-3.5" />
                    <span>
                      La cantidad requerida excede el stock disponible en almacén (
                      {selectedSupply.stock} {selectedSupply.unit}).
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECCIÓN 6: NOTAS */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="size-3.5" /> Observaciones agronómicas
            </label>
            <Input
              placeholder="Ej. Buena humedad de suelo. Boquillas abanico plano 11002. Presión 3 bar."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* DESGLOSE TOTAL DE LA OPERACIÓN EN BOLIVIANOS */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-primary/10 via-background to-muted/40 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-primary">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4" /> Desglose Económico (Bs)
              </span>
              <span>Lote: {selectedLot?.name}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-xs">
              <div className="p-2 rounded bg-background/80 border">
                <span className="text-muted-foreground block text-[11px]">Maquinaria:</span>
                <span className="font-bold text-foreground num">
                  {currency(machineOperatingCost)}
                </span>
              </div>
              <div className="p-2 rounded bg-background/80 border">
                <span className="text-muted-foreground block text-[11px]">Insumos:</span>
                <span className="font-bold text-foreground num">{currency(supplyCost)}</span>
              </div>
              <div className="p-2 rounded bg-background/80 border">
                <span className="text-muted-foreground block text-[11px]">Diésel:</span>
                <span className="font-bold text-foreground num">
                  {currency(dieselEstimatedCost)}
                </span>
              </div>
              <div className="p-2 rounded bg-primary/15 border border-primary/30">
                <span className="text-primary block text-[11px] font-semibold">
                  Total Operación:
                </span>
                <span className="font-extrabold text-foreground text-sm num">
                  {currency(totalOperationCost)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-2.5">
            <div className="text-xs text-muted-foreground font-medium text-center sm:text-left">
              Asiento de egreso contable:{" "}
              <b className="text-foreground text-sm">{currency(machineOperatingCost)}</b>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isValidHours || (!!selectedSupply && !isStockSufficient)}
                className="flex-1 sm:flex-initial gap-2 font-semibold shadow-md"
              >
                <Gauge className="size-4" />
                <span>{isSubmitting ? "Registrando..." : "Registrar labor y actualizar módulos"}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
