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
import { currency, number, exportToCsv } from "@/lib/agro-data";
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
  const { fuelTank, fuelTransactions, machines, addFuelTransaction, supplies } = useAgro();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txType, setTxType] = useState<"ingreso" | "despacho">("ingreso");

  // Form states
  const [liters, setLiters] = useState<number>(0);
  const [pricePerLiter, setPricePerLiter] = useState<number>(3.72);
  const [destinationOrSource, setDestinationOrSource] = useState<string>("YPFB Refinería (Cisterna B-SISA)");
  const [machineId, setMachineId] = useState<string>("");
  const [operator, setOperator] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>("");

  const dieselSupply = supplies.find((s) => s.category === "Combustibles");
  const currentLiters = dieselSupply ? dieselSupply.stock : 14200;
  const capacityPercent = Math.min(100, Math.round((currentLiters / fuelTank.capacityLiters) * 100));

  // Cupo mensual B-Sisa
  const monthlyConsumed = fuelTransactions
    .filter((tx) => tx.type === "despacho")
    .reduce((acc, tx) => acc + tx.liters, 0);
  const quotaRemaining = Math.max(0, fuelTank.monthlyQuotaLiters - monthlyConsumed);
  const quotaPercent = Math.min(100, Math.round((monthlyConsumed / fuelTank.monthlyQuotaLiters) * 100));

  const handleOpenDialog = (type: "ingreso" | "despacho") => {
    setTxType(type);
    setLiters(0);
    setPricePerLiter(3.72);
    setDestinationOrSource(
      type === "ingreso" ? "YPFB Refinería (Cisterna B-SISA)" : machines[0]?.name ?? ""
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
      }
    );

    setIsDialogOpen(false);
  };

  const handleExportCsv = () => {
    exportToCsv(
      "combustible_diésel_agroadmin",
      ["ID", "Fecha", "Tipo", "Litros", "Precio Unitario (Bs)", "Total (Bs)", "Origen / Destino", "Operador", "Factura", "Notas"],
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
      ])
    );
    toast.success("Archivo CSV de combustible descargado");
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
              onClick={() => handleOpenDialog("despacho")}
              className="gap-2 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <ArrowDownLeft className="size-4" /> Despacho a Máquina
            </Button>
            <Button onClick={() => handleOpenDialog("ingreso")} className="gap-2 font-semibold shadow-sm">
              <Plus className="size-4" /> Cargar Cisterna (Compra B-Sisa)
            </Button>
          </div>
        }
      />

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
                <Building className="size-4 text-amber-600 dark:text-amber-400" /> Cupo Autorizado ANH / B-SISA
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
              <span className="text-muted-foreground">{number(fuelTank.monthlyQuotaLiters)} L cupo</span>
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
            <p className="text-xs text-muted-foreground">Vigentes para la campaña agrícola en Bolivia.</p>
          </div>

          <div className="space-y-2.5 my-4 text-xs">
            <div className="p-2.5 rounded-lg bg-background border flex justify-between items-center">
              <div>
                <span className="font-semibold block text-foreground">Diésel Subvencionado (B-SISA)</span>
                <span className="text-[11px] text-muted-foreground">Uso productivo agropecuario</span>
              </div>
              <span className="font-bold text-base text-primary num">Bs 3,72 / L</span>
            </div>

            <div className="p-2.5 rounded-lg bg-background border flex justify-between items-center">
              <div>
                <span className="font-semibold block text-foreground">Diésel Libre Importación</span>
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

      {/* HISTORIAL DE MOVIMIENTOS */}
      <Panel>
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Kardex y Movimientos de Combustible</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registro cronológico de entradas de cisterna y despachos a maquinaria con trazabilidad de operadores.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
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
                  <td className="px-4 py-3 num whitespace-nowrap text-muted-foreground">{tx.date}</td>
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
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{tx.destinationOrSource}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{tx.operator || "—"}</td>
                  <td className="px-4 py-3 text-right num font-semibold whitespace-nowrap">
                    {tx.type === "ingreso" ? "+" : "−"}{number(tx.liters)} L
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {txType === "ingreso" ? "Registrar Ingreso de Diésel (Carga Cisterna)" : "Despachar Diésel a Maquinaria"}
            </DialogTitle>
            <DialogDescription>
              {txType === "ingreso"
                ? "Registra la compra y descarga de combustible subvencionado B-SISA en el tanque de la propiedad."
                : "Descuenta combustible del tanque principal y lo asigna a un tractor o labor."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
              <Field label={txType === "despacho" ? "Operador que recibe" : "Chofer de cisterna"}>
                <Input
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="Nombre responsable"
                />
              </Field>

              <Field label="Fecha">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="font-semibold">
                Guardar Movimiento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
