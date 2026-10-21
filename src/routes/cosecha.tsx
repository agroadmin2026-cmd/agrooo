import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Wheat,
  Plus,
  Download,
  Building2,
  CheckCircle2,
  Truck,
  Scale,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
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

export const Route = createFileRoute("/cosecha")({
  head: () => ({
    meta: [
      { title: "Cosecha, Silos y Liquidaciones · AgroAdmin Bolivia" },
      {
        name: "description",
        content:
          "Control de viajes de camiones, tickets de balanza en silos (ADM, Gravetal, Cargill), mermas y liquidaciones en Bolivianos (Bs).",
      },
    ],
  }),
  component: Cosecha,
});

const SILOS_BOLIVIA = [
  "ADM Bolivia (Silo Pailón)",
  "Gravetal Bolivia (Puerto Quijarro)",
  "Cargill Bolivia (Montero)",
  "Nutrioil (Parque Industrial)",
  "Emapa (Silo San Julián)",
  "Granos del Oriente (Cuatro Cañadas)",
];

function Cosecha() {
  const { harvestDeliveries, lots, addHarvestDelivery } = useAgro();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states
  const [ticketNumber, setTicketNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lotId, setLotId] = useState(lots[0]?.id ?? "");
  const [crop, setCrop] = useState(lots[0]?.crop ?? "Soya");
  const [siloDestination, setSiloDestination] = useState(SILOS_BOLIVIA[0]!);
  const [driver, setDriver] = useState("");
  const [truckPlate, setTruckPlate] = useState("");
  const [grossWeightKg, setGrossWeightKg] = useState<number>(0);
  const [tareWeightKg, setTareWeightKg] = useState<number>(0);
  const [moisturePercent, setMoisturePercent] = useState<number>(13.5);
  const [impurityPercent, setImpurityPercent] = useState<number>(1.0);
  const [pricePerTonBs, setPricePerTonBs] = useState<number>(2800);
  const [notes, setNotes] = useState("");

  // Calculations in real-time
  const netWeightKg = Math.max(0, grossWeightKg - tareWeightKg);
  // Merma estimada (tolerancia base 14% humedad y 1% impureza)
  const moistureDeductionRate = Math.max(0, (moisturePercent - 14) * 0.012);
  const impurityDeductionRate = Math.max(0, (impurityPercent - 1.0) * 0.01);
  const totalDeductionRate = moistureDeductionRate + impurityDeductionRate;
  const deductionKg = Math.round(netWeightKg * totalDeductionRate);
  const payableWeightKg = Math.max(0, netWeightKg - deductionKg);
  const payableTons = Math.round((payableWeightKg / 1000) * 100) / 100;
  const totalAmountBs = Math.round(payableTons * pricePerTonBs * 100) / 100;

  // KPIs
  const totalTons = harvestDeliveries.reduce((acc, h) => acc + h.payableTons, 0);
  const totalRevenue = harvestDeliveries.reduce((acc, h) => acc + h.totalAmountBs, 0);
  const avgPricePerTon = totalTons > 0 ? Math.round(totalRevenue / totalTons) : 2800;

  const handleOpenDialog = () => {
    setTicketNumber(`TK-${Math.floor(10000 + Math.random() * 90000)}`);
    setDate(new Date().toISOString().slice(0, 10));
    setLotId(lots[0]?.id ?? "");
    setCrop(lots[0]?.crop ?? "Soya");
    setSiloDestination(SILOS_BOLIVIA[0]!);
    setDriver("");
    setTruckPlate("");
    setGrossWeightKg(0);
    setTareWeightKg(0);
    setMoisturePercent(13.5);
    setImpurityPercent(1.0);
    setPricePerTonBs(2800);
    setNotes("");
    setIsDialogOpen(true);
  };

  const handleLotChange = (selectedLotId: string) => {
    setLotId(selectedLotId);
    const l = lots.find((x) => x.id === selectedLotId);
    if (l) setCrop(l.crop);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketNumber.trim()) {
      toast.error("Ingrese el número de ticket de balanza");
      return;
    }
    if (grossWeightKg <= tareWeightKg) {
      toast.error("El peso bruto debe ser mayor a la tara del camión");
      return;
    }

    addHarvestDelivery({
      ticketNumber: ticketNumber.trim(),
      date,
      lotId,
      crop,
      siloDestination,
      driver: driver.trim() || "Chofer particular",
      truckPlate: truckPlate.trim().toUpperCase() || "S/P",
      grossWeightKg,
      tareWeightKg,
      netWeightKg,
      moisturePercent,
      impurityPercent,
      deductionKg,
      payableWeightKg,
      payableTons,
      pricePerTonBs,
      totalAmountBs,
      status: "Liquidado",
      notes: notes.trim() || undefined,
    });

    toast.success("Entrega de cosecha registrada y liquidada", {
      description: `Se imputó ingreso de ${currency(totalAmountBs)} en el Libro Contable (Venta de Cosecha).`,
    });

    setIsDialogOpen(false);
  };

  const handleExportCsv = () => {
    exportToCsv(
      "cosecha_silos_agroadmin",
      [
        "Ticket",
        "Fecha",
        "Lote",
        "Cultivo",
        "Silo Destino",
        "Chofer",
        "Placa",
        "Peso Bruto (kg)",
        "Tara (kg)",
        "Peso Neto (kg)",
        "Humedad (%)",
        "Impurezas (%)",
        "Merma (kg)",
        "Toneladas Pagables",
        "Precio/t (Bs)",
        "Total (Bs)",
        "Estado",
      ],
      harvestDeliveries.map((h) => {
        const l = lots.find((x) => x.id === h.lotId);
        return [
          h.ticketNumber,
          h.date,
          l?.name ?? h.lotId,
          h.crop,
          h.siloDestination,
          h.driver,
          h.truckPlate,
          h.grossWeightKg,
          h.tareWeightKg,
          h.netWeightKg,
          h.moisturePercent,
          h.impurityPercent,
          h.deductionKg,
          h.payableTons,
          h.pricePerTonBs,
          h.totalAmountBs,
          h.status,
        ];
      })
    );
    toast.success("Archivo CSV de cosecha descargado");
  };

  return (
    <>
      <PageHeader
        title="Cosecha y Liquidación en Silos"
        subtitle="Control de viajes, tickets de balanza, descuentos de humedad/impurezas y liquidaciones en Bs"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCsv} className="gap-2">
              <Download className="size-4" /> Exportar CSV
            </Button>
            <Button onClick={handleOpenDialog} className="gap-2 font-semibold shadow-sm">
              <Plus className="size-4" /> Registrar Ticket de Balanza
            </Button>
          </div>
        }
      />

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Volumen Total Cosechado"
          value={`${number(Math.round(totalTons * 100) / 100)} t`}
          icon={Wheat}
          tone="primary"
          hint={`${harvestDeliveries.length} viajes entregados`}
        />
        <StatCard
          label="Ingresos Brutos por Venta"
          value={currency(totalRevenue)}
          icon={DollarSign}
          tone="success"
          hint="Imputado a contabilidad"
        />
        <StatCard
          label="Precio Promedio por Tonelada"
          value={currency(avgPricePerTon)}
          icon={Scale}
          tone="neutral"
          hint="Tarifa ponderada en silos"
        />
        <StatCard
          label="Destinos de Acopio Activos"
          value={`${new Set(harvestDeliveries.map((h) => h.siloDestination)).size} silos`}
          icon={Building2}
          tone="accent"
          hint="ADM, Gravetal, Cargill, etc."
        />
      </div>

      {/* TABLA DE ENTREGAS DE COSECHA */}
      <Panel>
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Registro de Entregas y Liquidaciones</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Trazabilidad completa desde el lote de origen hasta el silo receptor con parámetros de calidad.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Ticket / Fecha</th>
                <th className="px-4 py-3 font-medium">Lote / Cultivo</th>
                <th className="px-4 py-3 font-medium">Silo Destino</th>
                <th className="px-4 py-3 font-medium">Transporte</th>
                <th className="px-4 py-3 font-medium text-right">Peso Neto</th>
                <th className="px-4 py-3 font-medium text-center">Humedad / Imp.</th>
                <th className="px-4 py-3 font-medium text-right">Toneladas Liq.</th>
                <th className="px-4 py-3 font-medium text-right">Precio / t</th>
                <th className="px-4 py-3 font-medium text-right">Liquidación Total</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {harvestDeliveries.map((h) => {
                const l = lots.find((x) => x.id === h.lotId);
                return (
                  <tr key={h.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-foreground block">{h.ticketNumber}</span>
                      <span className="text-xs text-muted-foreground">{h.date}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{l?.name ?? "—"}</span>
                        <Pill tone="primary">{h.crop}</Pill>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                      {h.siloDestination}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      <span className="block font-medium text-foreground">{h.driver}</span>
                      <span>Placa: {h.truckPlate}</span>
                    </td>
                    <td className="px-4 py-3 text-right num whitespace-nowrap font-mono text-xs">
                      {number(h.netWeightKg)} kg
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap text-xs">
                      <span className="block font-medium">{h.moisturePercent}% H</span>
                      <span className="text-[11px] text-muted-foreground">{h.impurityPercent}% Imp</span>
                    </td>
                    <td className="px-4 py-3 text-right num whitespace-nowrap font-bold text-primary">
                      {h.payableTons.toFixed(2)} t
                    </td>
                    <td className="px-4 py-3 text-right num whitespace-nowrap text-xs">
                      {currency(h.pricePerTonBs)}/t
                    </td>
                    <td className="px-4 py-3 text-right num whitespace-nowrap font-extrabold text-foreground">
                      {currency(h.totalAmountBs)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <Pill tone="success">{h.status}</Pill>
                    </td>
                  </tr>
                );
              })}
              {harvestDeliveries.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    <AlertCircle className="size-6 mx-auto mb-2 opacity-50" />
                    No hay viajes ni entregas de cosecha registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* MODAL REGISTRAR TICKET DE BALANZA */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Scale className="size-4" /> Balanza de Acopio · AgroAdmin Bolivia
            </div>
            <DialogTitle>Registrar Ticket de Balanza de Silo</DialogTitle>
            <DialogDescription>
              Ingresa los datos del ticket de pesaje y laboratorio para liquidar el viaje y generar el ingreso contable.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="N° Ticket de Silo">
                <Input
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="Ej. TK-49021"
                  required
                  className="font-mono font-bold"
                />
              </Field>

              <Field label="Fecha de entrega">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>

              <Field label="Lote de Origen">
                <select className={selectClass} value={lotId} onChange={(e) => handleLotChange(e.target.value)}>
                  {lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.crop})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Silo / Acopiador">
                <select
                  className={selectClass}
                  value={siloDestination}
                  onChange={(e) => setSiloDestination(e.target.value)}
                >
                  {SILOS_BOLIVIA.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Chofer de camión">
                  <Input value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="Ej. Juan Pérez" />
                </Field>
                <Field label="Placa de camión">
                  <Input value={truckPlate} onChange={(e) => setTruckPlate(e.target.value)} placeholder="Ej. 3042-BTY" />
                </Field>
              </div>
            </div>

            {/* SECCIÓN PESAJE */}
            <div className="p-3.5 rounded-xl border bg-muted/30 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Truck className="size-3.5 text-primary" /> Pesaje en Balanza
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Peso Bruto (kg)">
                  <Input
                    type="number"
                    min="0"
                    step="10"
                    placeholder="Ej. 42000"
                    value={grossWeightKg || ""}
                    onChange={(e) => setGrossWeightKg(parseFloat(e.target.value) || 0)}
                    required
                    className="font-mono text-base font-semibold"
                  />
                </Field>

                <Field label="Tara del camión (kg)">
                  <Input
                    type="number"
                    min="0"
                    step="10"
                    placeholder="Ej. 14000"
                    value={tareWeightKg || ""}
                    onChange={(e) => setTareWeightKg(parseFloat(e.target.value) || 0)}
                    required
                    className="font-mono text-base"
                  />
                </Field>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Peso Neto</label>
                  <div className="h-9 px-3 rounded-md bg-background border flex items-center font-mono font-bold text-base num text-foreground">
                    {number(netWeightKg)} kg
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN LABORATORIO Y MERMA */}
            <div className="p-3.5 rounded-xl border bg-card/60 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Scale className="size-3.5 text-primary" /> Análisis de Calidad y Merma
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Humedad (% Base 14%)">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="35"
                    value={moisturePercent}
                    onChange={(e) => setMoisturePercent(parseFloat(e.target.value) || 0)}
                  />
                </Field>

                <Field label="Impurezas (% Base 1%)">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={impurityPercent}
                    onChange={(e) => setImpurityPercent(parseFloat(e.target.value) || 0)}
                  />
                </Field>

                <Field label="Precio por Tonelada (Bs)">
                  <Input
                    type="number"
                    step="10"
                    min="0"
                    value={pricePerTonBs}
                    onChange={(e) => setPricePerTonBs(parseFloat(e.target.value) || 0)}
                    className="font-mono font-semibold"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t text-xs">
                <div className="p-2 rounded bg-background border">
                  <span className="text-muted-foreground block text-[11px]">Merma descontada:</span>
                  <span className="font-bold text-destructive num">−{number(deductionKg)} kg</span>
                </div>
                <div className="p-2 rounded bg-background border">
                  <span className="text-muted-foreground block text-[11px]">Peso Líquido Pagable:</span>
                  <span className="font-bold text-foreground num">{number(payableWeightKg)} kg</span>
                </div>
                <div className="p-2 rounded bg-primary/15 border border-primary/30">
                  <span className="text-primary block text-[11px] font-semibold">Toneladas Pagables:</span>
                  <span className="font-extrabold text-foreground text-sm num">{payableTons.toFixed(2)} t</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex justify-between items-center">
              <span className="font-medium text-emerald-800 dark:text-emerald-300">
                Total a Liquidar por el Silo (Ingreso Contable):
              </span>
              <b className="text-lg text-emerald-700 dark:text-emerald-400 font-extrabold num">
                {currency(totalAmountBs)}
              </b>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="font-semibold gap-1.5 shadow-md">
                <CheckCircle2 className="size-4" /> Liquidar y Generar Ingreso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
