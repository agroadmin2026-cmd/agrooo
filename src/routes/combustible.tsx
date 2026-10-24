import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Fuel,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Download,
  AlertTriangle,
  Building,
  CheckCircle2,
  Calendar,
  Radio,
  FileText,
  Clock,
  ShieldCheck,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAgro } from "@/lib/agro-store";
import {
  currency,
  number,
  exportToCsv,
  getBsisaDaysRemaining,
  computeBsisaStatus,
  type BsisaPermit,
  type BsisaPermitType,
  type BsisaPermitStatus,
} from "@/lib/agro-data";
import { PageHeader, Panel, Pill, StatCard, Field, selectClass } from "@/components/agro/ui";

export const Route = createFileRoute("/combustible")({
  head: () => ({
    meta: [
      { title: "Control de Diésel y Cupo B-SISA · AgroAdmin Bolivia" },
      {
        name: "description",
        content:
          "Gestión del tanque cisterna de estancia, cupo B-SISA ANH, descargas de combustible y despacho a maquinaria en Bolivianos (Bs).",
      },
    ],
  }),
  component: Combustible,
});

function Combustible() {
  const {
    fuelTank,
    fuelTransactions,
    machines,
    addFuelTransaction,
    supplies,
    bsisaPermits,
    bsisaAlerts,
    upsertBsisaPermit,
    deleteBsisaPermit,
  } = useAgro();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txType, setTxType] = useState<"ingreso" | "despacho">("ingreso");

  // B-SISA Dialog state
  const [isPermitDialogOpen, setIsPermitDialogOpen] = useState(false);
  const [editingPermitId, setEditingPermitId] = useState<string | null>(null);
  const [permitNumber, setPermitNumber] = useState("");
  const [permitType, setPermitType] = useState<BsisaPermitType>(
    "Resolución de Cupo ANH (Cisterna Estancia)",
  );
  const [issuedDate, setIssuedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [monthlyQuotaLiters, setMonthlyQuotaLiters] = useState<number | undefined>(20000);
  const [authorizedStation, setAuthorizedStation] = useState(
    "Estación de Servicio Pailón Norte / YPFB",
  );
  const [permitMachineId, setPermitMachineId] = useState<string>("");
  const [permitStatusMode, setPermitStatusMode] = useState<"auto" | "En trámite">("auto");
  const [documentNumber, setDocumentNumber] = useState("");
  const [permitNotes, setPermitNotes] = useState("");

  // Form states for Fuel Transaction
  const [liters, setLiters] = useState<number>(0);
  const [pricePerLiter, setPricePerLiter] = useState<number>(3.72);
  const [destinationOrSource, setDestinationOrSource] = useState<string>(
    "YPFB Refinería (Cisterna B-SISA)",
  );
  const [machineId, setMachineId] = useState<string>("");
  const [operator, setOperator] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>("");

  const dieselSupply = supplies.find((s) => s.category === "Combustibles");
  const currentLiters = dieselSupply ? dieselSupply.stock : 14200;
  const capacityPercent = Math.min(
    100,
    Math.round((currentLiters / fuelTank.capacityLiters) * 100),
  );

  // Cupo mensual B-Sisa
  const monthlyConsumed = fuelTransactions
    .filter((tx) => tx.type === "despacho")
    .reduce((acc, tx) => acc + tx.liters, 0);
  const quotaRemaining = Math.max(0, fuelTank.monthlyQuotaLiters - monthlyConsumed);
  const quotaPercent = Math.min(
    100,
    Math.round((monthlyConsumed / fuelTank.monthlyQuotaLiters) * 100),
  );

  const handleOpenDialog = (type: "ingreso" | "despacho") => {
    setTxType(type);
    setLiters(0);
    setPricePerLiter(3.72);
    setDestinationOrSource(
      type === "ingreso" ? "YPFB Refinería (Cisterna B-SISA)" : (machines[0]?.name ?? ""),
    );
    setMachineId(type === "despacho" && machines[0] ? machines[0].id : "");
    setOperator("");
    setInvoiceNumber("");
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (liters <= 0) {
      toast.error("Ingrese una cantidad válida de litros");
      return;
    }

    if (txType === "despacho" && liters > currentLiters) {
      toast.error("Saldo insuficiente en cisterna", {
        description: `Solo hay ${number(currentLiters)} Litros disponibles en el tanque principal.`,
      });
      return;
    }

    const totalCostBs = Math.round(liters * pricePerLiter * 100) / 100;
    const dest =
      txType === "despacho" && machineId
        ? machines.find((m) => m.id === machineId)?.name || destinationOrSource
        : destinationOrSource;

    addFuelTransaction({
      date,
      type: txType,
      liters,
      pricePerLiter,
      totalCostBs,
      destinationOrSource: dest,
      machineId: txType === "despacho" ? machineId || undefined : undefined,
      operator: operator.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    toast.success(
      txType === "ingreso"
        ? `Carga de ${number(liters)} L registrada con éxito`
        : `Despacho de ${number(liters)} L registrado`,
      {
        description:
          txType === "ingreso"
            ? `Se imputó egreso de ${currency(totalCostBs)} al Libro Contable (Compra Diésel).`
            : `Descontado del tanque cisterna de la estancia.`,
      },
    );

    setIsDialogOpen(false);
  };

  const handleExportCsv = () => {
    exportToCsv(
      "combustible_diésel_agroadmin",
      [
        "ID",
        "Fecha",
        "Tipo",
        "Litros",
        "Precio Unitario (Bs)",
        "Total (Bs)",
        "Origen / Destino",
        "Operador",
        "Factura",
        "Notas",
      ],
      fuelTransactions.map((tx) => [
        tx.id,
        tx.date,
        tx.type === "ingreso" ? "Carga en Cisterna" : "Despacho a Maquinaria",
        tx.liters,
        tx.pricePerLiter,
        tx.totalCostBs,
        tx.destinationOrSource,
        tx.operator || "—",
        tx.invoiceNumber || "—",
        tx.notes || "—",
      ]),
    );
    toast.success("Archivo CSV de combustible descargado");
  };

  const handleOpenPermitDialog = (permitToEdit?: BsisaPermit) => {
    if (permitToEdit) {
      setEditingPermitId(permitToEdit.id);
      setPermitNumber(permitToEdit.permitNumber);
      setPermitType(permitToEdit.permitType);
      setIssuedDate(permitToEdit.issuedDate);
      setExpiryDate(permitToEdit.expiryDate);
      setMonthlyQuotaLiters(permitToEdit.monthlyQuotaLiters);
      setAuthorizedStation(permitToEdit.authorizedStation || "");
      setPermitMachineId(permitToEdit.machineId || "");
      setPermitStatusMode(permitToEdit.status === "En trámite" ? "En trámite" : "auto");
      setDocumentNumber(permitToEdit.documentNumber || "");
      setPermitNotes(permitToEdit.notes || "");
    } else {
      setEditingPermitId(null);
      setPermitNumber("");
      setPermitType("Resolución de Cupo ANH (Cisterna Estancia)");
      setIssuedDate(new Date().toISOString().slice(0, 10));
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setExpiryDate(nextYear.toISOString().slice(0, 10));
      setMonthlyQuotaLiters(20000);
      setAuthorizedStation("Estación de Servicio Pailón Norte / YPFB");
      setPermitMachineId("");
      setPermitStatusMode("auto");
      setDocumentNumber("");
      setPermitNotes("");
    }
    setIsPermitDialogOpen(true);
  };

  const handleSavePermit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permitNumber.trim()) {
      toast.error("Ingrese el número de resolución o código RFID");
      return;
    }
    if (!expiryDate) {
      toast.error("Seleccione la fecha de vencimiento");
      return;
    }

    const calculatedStatus: BsisaPermitStatus =
      permitStatusMode === "En trámite" ? "En trámite" : computeBsisaStatus(expiryDate);

    upsertBsisaPermit({
      id: editingPermitId || undefined,
      permitNumber: permitNumber.trim(),
      permitType,
      issuedDate,
      expiryDate,
      monthlyQuotaLiters:
        monthlyQuotaLiters && monthlyQuotaLiters > 0 ? monthlyQuotaLiters : undefined,
      authorizedStation: authorizedStation.trim() || undefined,
      machineId: permitMachineId || undefined,
      status: calculatedStatus,
      documentNumber: documentNumber.trim() || undefined,
      notes: permitNotes.trim() || undefined,
    });

    toast.success(
      editingPermitId
        ? "Permiso B-SISA actualizado exitosamente"
        : "Nuevo permiso B-SISA registrado",
      {
        description: `Resolución / Registro: ${permitNumber} · Vencimiento: ${expiryDate}`,
      },
    );

    setIsPermitDialogOpen(false);
  };

  const handleDeletePermit = (id: string, num: string) => {
    if (confirm(`¿Seguro que desea eliminar el permiso / roseta ${num}?`)) {
      deleteBsisaPermit(id);
      toast.info(`Permiso ${num} eliminado`);
    }
  };

  return (
    <>
      <PageHeader
        title="Control de Diésel y Cupo B-SISA"
        subtitle="Administración del tanque cisterna de estancia, cupos ANH y consumo de combustible"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportCsv} className="gap-2">
              <Download className="size-4" /> Exportar CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOpenPermitDialog()}
              className="gap-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <ShieldCheck className="size-4" /> Permisos B-SISA
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOpenDialog("despacho")}
              className="gap-2 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <ArrowDownLeft className="size-4" /> Despacho a Máquina
            </Button>
            <Button
              onClick={() => handleOpenDialog("ingreso")}
              className="gap-2 font-semibold shadow-sm"
            >
              <Plus className="size-4" /> Cargar Cisterna (Compra B-Sisa)
            </Button>
          </div>
        }
      />

      {/* ALERTA PREVENTIVA DE VENCIMIENTOS B-SISA EN BOLIVIA */}
      {(bsisaAlerts.expiredCount > 0 || bsisaAlerts.expiringSoonCount > 0) && (
        <div
          role="alert"
          className={`mb-6 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
            bsisaAlerts.expiredCount > 0
              ? "bg-destructive/10 border-destructive/30 text-destructive dark:text-red-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">
                {bsisaAlerts.expiredCount > 0
                  ? `Atención Crítica: Tienes ${bsisaAlerts.expiredCount} permiso(s) B-SISA vencido(s).`
                  : `Aviso Preventivo ANH: Tienes ${bsisaAlerts.expiringSoonCount} permiso(s) B-SISA por vencer en los próximos 30 días.`}
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                En Bolivia, la ANH y las estaciones de servicio bloquean automáticamente el despacho
                de diésel subvencionado a Bs 3,72 si la resolución de cupo o la roseta RFID de la
                máquina no están vigentes.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={bsisaAlerts.expiredCount > 0 ? "destructive" : "default"}
            onClick={() => handleOpenPermitDialog()}
            className="whitespace-nowrap shrink-0 text-xs font-semibold"
          >
            Gestionar / Renovar Ahora
          </Button>
        </div>
      )}

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Nivel en Cisterna Principal"
          value={`${number(currentLiters)} L`}
          icon={Fuel}
          tone={currentLiters > 4000 ? "primary" : "danger"}
          hint={`Capacidad: ${number(fuelTank.capacityLiters)} L (${capacityPercent}%)`}
        />
        <StatCard
          label="Cupo Mensual B-SISA"
          value={`${number(quotaRemaining)} L`}
          icon={Building}
          tone="accent"
          hint={`Autorizado ANH: ${number(fuelTank.monthlyQuotaLiters)} L/mes`}
        />
        <StatCard
          label="Consumo Mensual Registrado"
          value={`${number(monthlyConsumed)} L`}
          icon={ArrowDownLeft}
          tone="neutral"
          hint={`${quotaPercent}% del cupo mensual`}
        />
        <StatCard
          label="Valor del Combustible en Tanque"
          value={currency(currentLiters * 3.72)}
          icon={CheckCircle2}
          tone="success"
          hint="Tarifa subvencionada Bs 3.72/L"
        />
      </div>

      {/* MONITOR VISUAL DEL TANQUE CISTERNA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Panel className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Fuel className="size-4 text-primary" /> Tanque Cisterna Estancia
              </h3>
              <Pill tone={currentLiters > 4000 ? "success" : "danger"}>
                {capacityPercent}% lleno
              </Pill>
            </div>
            <p className="text-xs text-muted-foreground">
              Almacenamiento subterráneo / aéreo para abastecimiento de maquinaria agrícola.
            </p>
          </div>

          <div className="my-6 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span>{number(currentLiters)} Litros disponibles</span>
              <span className="text-muted-foreground">{number(fuelTank.capacityLiters)} L máx</span>
            </div>
            <div className="h-4 rounded-full bg-muted overflow-hidden border p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  currentLiters > 5000 ? "bg-primary" : "bg-destructive"
                }`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground pt-3 border-t flex justify-between items-center">
            <span>Punto de reorden mínimo:</span>
            <b>3.000 Litros</b>
          </div>
        </Panel>

        {/* MONITOR CUPO ANH / B-SISA */}
        <Panel className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Building className="size-4 text-amber-600 dark:text-amber-400" /> Cupo Autorizado
                ANH / B-SISA
              </h3>
              <Pill tone="warning">{100 - quotaPercent}% saldo</Pill>
            </div>
            <p className="text-xs text-muted-foreground">
              Asignación mensual oficial para sector productivo agrícola (Resolución ANH).
            </p>
          </div>

          <div className="my-6 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span>{number(monthlyConsumed)} L consumidos</span>
              <span className="text-muted-foreground">
                {number(fuelTank.monthlyQuotaLiters)} L cupo
              </span>
            </div>
            <div className="h-4 rounded-full bg-muted overflow-hidden border p-0.5">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground pt-3 border-t flex justify-between items-center">
            <span>Saldo para retiro en surtidor:</span>
            <b className="text-foreground">{number(quotaRemaining)} Litros</b>
          </div>
        </Panel>

        {/* ACCIONES RÁPIDAS Y PRECIOS REFERENCIALES */}
        <Panel className="p-5 flex flex-col justify-between bg-muted/20">
          <div>
            <h3 className="font-semibold text-base mb-1">Precios Oficiales de Combustible</h3>
            <p className="text-xs text-muted-foreground">
              Vigentes para la campaña agrícola en Bolivia.
            </p>
          </div>

          <div className="space-y-2.5 my-4 text-xs">
            <div className="p-2.5 rounded-lg bg-background border flex justify-between items-center">
              <div>
                <span className="font-semibold block text-foreground">
                  Diésel Subvencionado (B-SISA)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Uso productivo agropecuario
                </span>
              </div>
              <span className="font-bold text-base text-primary num">Bs 3,72 / L</span>
            </div>

            <div className="p-2.5 rounded-lg bg-background border flex justify-between items-center">
              <div>
                <span className="font-semibold block text-foreground">
                  Diésel Libre Importación
                </span>
                <span className="text-[11px] text-muted-foreground">Sin restricción de cupo</span>
              </div>
              <span className="font-bold text-base text-muted-foreground num">Bs 9,50 / L</span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => handleOpenDialog("ingreso")}
            className="w-full text-xs font-semibold gap-1.5"
          >
            <Plus className="size-3.5" /> Registrar Llegada de Cisterna
          </Button>
        </Panel>
      </div>

      {/* SECCIÓN PERMISOS, RESOLUCIONES Y ROSETAS RFID B-SISA */}
      <Panel className="mb-6">
        <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <h2 className="text-xl font-semibold tracking-tight">
                Permisos, Resoluciones ANH y Rosetas RFID B-SISA
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control de vigencia legal y plazos de renovación para compra y transporte de diésel
              subvencionado (Bs 3,72/L) en Bolivia.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => handleOpenPermitDialog()}
            className="gap-1.5 font-semibold shrink-0 text-xs shadow-sm"
          >
            <Plus className="size-3.5" /> Registrar / Renovar Permiso
          </Button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {bsisaPermits.map((p) => {
              const daysRemaining = getBsisaDaysRemaining(p.expiryDate);
              const status = computeBsisaStatus(p.expiryDate, p.status);
              const machine = machines.find((m) => m.id === p.machineId);

              const isExpired = status === "Vencido";
              const isWarning = status === "Por vencer";
              const isPending = status === "En trámite";

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all shadow-sm ${
                    isExpired
                      ? "bg-destructive/5 border-destructive/40"
                      : isWarning
                        ? "bg-amber-500/5 border-amber-500/40"
                        : isPending
                          ? "bg-blue-500/5 border-blue-500/30"
                          : "bg-card border-border hover:border-primary/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {p.permitType.includes("RFID") ? (
                          <Radio className="size-4 text-primary shrink-0" />
                        ) : (
                          <FileText className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        <span className="text-[11px] font-semibold text-muted-foreground line-clamp-1">
                          {p.permitType}
                        </span>
                      </div>
                      <Pill
                        tone={
                          isExpired
                            ? "danger"
                            : isWarning
                              ? "warning"
                              : isPending
                                ? "primary"
                                : "success"
                        }
                      >
                        {status}
                      </Pill>
                    </div>

                    <div>
                      <div className="font-mono font-bold text-sm text-foreground break-all">
                        {p.permitNumber}
                      </div>
                      {p.documentNumber && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Folio: {p.documentNumber}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      {machine && (
                        <div className="text-muted-foreground flex items-center justify-between">
                          <span>Máquina:</span>
                          <span className="font-semibold text-foreground text-right">
                            {machine.name}
                          </span>
                        </div>
                      )}
                      {p.authorizedStation && (
                        <div className="text-muted-foreground flex items-start justify-between gap-2">
                          <span className="shrink-0">Surtidor:</span>
                          <span className="font-medium text-foreground text-right line-clamp-1">
                            {p.authorizedStation}
                          </span>
                        </div>
                      )}
                      {p.monthlyQuotaLiters && (
                        <div className="text-muted-foreground flex items-center justify-between">
                          <span>Cupo:</span>
                          <span className="font-bold text-primary">
                            {number(p.monthlyQuotaLiters)} L/mes
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Vencimiento:</span>
                      <span className="font-mono font-medium">{p.expiryDate}</span>
                    </div>

                    <div
                      className={`text-[11px] font-medium px-2 py-1 rounded flex items-center gap-1.5 ${
                        isExpired
                          ? "bg-destructive/15 text-destructive font-semibold"
                          : isWarning
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold"
                            : isPending
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      <Clock className="size-3 shrink-0" />
                      {isExpired ? (
                        <span>Vencido hace {Math.abs(daysRemaining)} d · Despacho bloqueado</span>
                      ) : isWarning ? (
                        <span>Vence en {daysRemaining} días · Tramitar renovación</span>
                      ) : isPending ? (
                        <span>En trámite ante ANH</span>
                      ) : (
                        <span>Vigente ({daysRemaining} días restantes)</span>
                      )}
                    </div>

                    {p.notes && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                        "{p.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-1.5 pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenPermitDialog(p)}
                        className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-3" /> Editar / Renovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePermit(p.id, p.permitNumber)}
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {bsisaPermits.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <ShieldCheck className="size-8 mx-auto mb-2 opacity-40 text-primary" />
              <p className="font-semibold text-sm">No hay permisos B-SISA registrados</p>
              <p className="text-xs mt-1">
                Registra la Resolución de Cupo ANH de la estancia o las Rosetas RFID de tu
                maquinaria.
              </p>
            </div>
          )}
        </div>
      </Panel>

      {/* HISTORIAL DE MOVIMIENTOS */}
      <Panel>
        <div className="p-3.5 sm:p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-xl font-semibold tracking-tight">
              Kardex y Movimientos de Combustible
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registro cronológico de entradas de cisterna y despachos a maquinaria.
            </p>
          </div>
        </div>

        {/* Vista Móvil: Tarjetas táctiles */}
        <div className="md:hidden p-3.5 space-y-2.5">
          {fuelTransactions.map((tx) => (
            <div
              key={tx.id}
              className="p-3 rounded-xl border border-border bg-card shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <Pill tone={tx.type === "ingreso" ? "success" : "warning"}>
                  {tx.type === "ingreso" ? (
                    <>
                      <ArrowDownLeft className="size-3" /> Carga Cisterna
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="size-3" /> Despacho
                    </>
                  )}
                </Pill>
                <span className="text-xs text-muted-foreground">{tx.date}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-foreground block">{tx.destinationOrSource}</span>
                  {tx.operator && (
                    <span className="text-muted-foreground text-[11px] block">
                      Operador: {tx.operator}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-sm text-foreground block num">
                    {tx.type === "ingreso" ? "+" : "−"}{number(tx.liters)} L
                  </span>
                  <span className="text-xs font-bold text-primary block">
                    {currency(tx.totalCostBs)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {fuelTransactions.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-xs">
              <AlertTriangle className="size-6 mx-auto mb-2 opacity-50" />
              No hay movimientos registrados de combustible.
            </div>
          )}
        </div>

        {/* Vista Escritorio: Tabla completa */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Origen / Destino</th>
                <th className="px-4 py-3 font-medium">Operador / Chofer</th>
                <th className="px-4 py-3 font-medium text-right">Volumen</th>
                <th className="px-4 py-3 font-medium text-right">Precio Unit. (Bs)</th>
                <th className="px-4 py-3 font-medium text-right">Importe Total</th>
                <th className="px-4 py-3 font-medium">Factura / Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fuelTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 num whitespace-nowrap text-muted-foreground">
                    {tx.date}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Pill tone={tx.type === "ingreso" ? "success" : "warning"}>
                      {tx.type === "ingreso" ? (
                        <>
                          <ArrowDownLeft className="size-3" /> Carga Cisterna
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="size-3" /> Despacho
                        </>
                      )}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {tx.destinationOrSource}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {tx.operator || "—"}
                  </td>
                  <td className="px-4 py-3 text-right num font-semibold whitespace-nowrap">
                    {tx.type === "ingreso" ? "+" : "−"}
                    {number(tx.liters)} L
                  </td>
                  <td className="px-4 py-3 text-right num whitespace-nowrap">
                    Bs {tx.pricePerLiter.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right num font-bold whitespace-nowrap text-foreground">
                    {currency(tx.totalCostBs)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {tx.invoiceNumber || "—"}
                  </td>
                </tr>
              ))}
              {fuelTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <AlertTriangle className="size-6 mx-auto mb-2 opacity-50" />
                    No hay movimientos registrados de combustible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* DIÁLOGO REGISTRAR TRANSACCIÓN */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-md p-4 sm:p-6 rounded-2xl sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {txType === "ingreso"
                ? "Registrar Ingreso de Diésel (Carga Cisterna)"
                : "Despachar Diésel a Maquinaria"}
            </DialogTitle>
            <DialogDescription>
              {txType === "ingreso"
                ? "Registra la compra y descarga de combustible subvencionado B-SISA en el tanque de la propiedad."
                : "Descuenta combustible del tanque principal y lo asigna a un tractor o labor."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <Field label="Volumen (Litros)">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="Ej. 5000"
                  value={liters || ""}
                  onChange={(e) => setLiters(parseFloat(e.target.value) || 0)}
                  className="font-mono font-semibold text-base"
                />
              </Field>

              <Field label="Precio (Bs / Litro)">
                <Input
                  type="number"
                  step="0.01"
                  value={pricePerLiter}
                  onChange={(e) => setPricePerLiter(parseFloat(e.target.value) || 3.72)}
                  className="font-mono text-base"
                />
              </Field>
            </div>

            {txType === "despacho" ? (
              <Field label="Máquina de destino">
                <select
                  className={selectClass}
                  value={machineId}
                  onChange={(e) => {
                    setMachineId(e.target.value);
                    const m = machines.find((x) => x.id === e.target.value);
                    if (m) setDestinationOrSource(m.name);
                  }}
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.type} · Horómetro: {m.hourmeter}h)
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Proveedor / Origen">
                <Input
                  value={destinationOrSource}
                  onChange={(e) => setDestinationOrSource(e.target.value)}
                  placeholder="Ej. YPFB Refinería / Estación de Servicio"
                  required
                />
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <Field label={txType === "despacho" ? "Operador que recibe" : "Chofer de cisterna"}>
                <Input
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="Nombre responsable"
                />
              </Field>

              <Field label="Fecha">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
            </div>

            <Field label="N° Factura / Orden B-SISA">
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ej. FAC-10294"
              />
            </Field>

            <Field label="Notas">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones de la carga"
              />
            </Field>

            <div className="p-3 rounded-lg bg-muted/40 border text-xs flex justify-between items-center">
              <span className="text-muted-foreground">Importe total:</span>
              <b className="text-base text-foreground font-extrabold num">
                {currency(liters * pricePerLiter)}
              </b>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto font-semibold">
                Guardar Movimiento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO REGISTRAR / RENOVAR PERMISO B-SISA */}
      <Dialog open={isPermitDialogOpen} onOpenChange={setIsPermitDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-lg max-h-[92dvh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {editingPermitId
                ? "Renovar o Modificar Permiso B-SISA"
                : "Registrar Nuevo Permiso / Roseta B-SISA"}
            </DialogTitle>
            <DialogDescription>
              Control oficial ante la Agencia Nacional de Hidrocarburos (ANH) y DGSC de Bolivia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePermit} className="space-y-3.5 sm:space-y-4 pt-2">
            <Field label="Tipo de Permiso / Documento Oficial">
              <select
                className={selectClass}
                value={permitType}
                onChange={(e) => setPermitType(e.target.value as BsisaPermitType)}
              >
                <option value="Resolución de Cupo ANH (Cisterna Estancia)">
                  Resolución de Cupo ANH (Cisterna Estancia)
                </option>
                <option value="Roseta RFID B-SISA (Maquinaria Agrícola)">
                  Roseta RFID B-SISA (Maquinaria Agrícola)
                </option>
                <option value="Hoja de Ruta / Transporte DGSC">
                  Hoja de Ruta / Transporte DGSC
                </option>
                <option value="Tarjeta de Compra en Surtidor">Tarjeta de Compra en Surtidor</option>
              </select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <Field label="N° Resolución / Código RFID">
                <Input
                  required
                  placeholder="Ej. RA-ANH-ULCR-2026/0488"
                  value={permitNumber}
                  onChange={(e) => setPermitNumber(e.target.value)}
                  className="font-mono font-medium"
                />
              </Field>

              <Field label="Folio / N° Documental (Opcional)">
                <Input
                  placeholder="Ej. FOLIO-ANH-7721"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="font-mono text-xs"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <Field label="Máquina Asignada (Si aplica)">
                <select
                  className={selectClass}
                  value={permitMachineId}
                  onChange={(e) => setPermitMachineId(e.target.value)}
                >
                  <option value="">Ninguna / Estancia General</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.type})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Cupo Mensual Autorizado (Litros)">
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Ej. 20000"
                  value={monthlyQuotaLiters ?? ""}
                  onChange={(e) =>
                    setMonthlyQuotaLiters(e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  className="font-mono"
                />
              </Field>
            </div>

            <Field label="Surtidor o Tramo Autorizado">
              <Input
                placeholder="Ej. Estación de Servicio Pailón Norte / YPFB"
                value={authorizedStation}
                onChange={(e) => setAuthorizedStation(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <Field label="Fecha de Emisión">
                <Input
                  type="date"
                  required
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                />
              </Field>

              <Field label="Fecha de Vencimiento">
                <Input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Estado del Trámite">
              <select
                className={selectClass}
                value={permitStatusMode}
                onChange={(e) => setPermitStatusMode(e.target.value as "auto" | "En trámite")}
              >
                <option value="auto">Automático (Según fecha de vencimiento)</option>
                <option value="En trámite">En trámite de renovación ante ANH/DGSC</option>
              </select>
            </Field>

            <Field label="Observaciones / Requisitos de Inspección">
              <Input
                placeholder="Ej. Inspección técnica vehicular en taller móvil ANH"
                value={permitNotes}
                onChange={(e) => setPermitNotes(e.target.value)}
              />
            </Field>

            <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPermitDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto font-semibold">
                {editingPermitId ? "Actualizar Permiso" : "Guardar Permiso B-SISA"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
