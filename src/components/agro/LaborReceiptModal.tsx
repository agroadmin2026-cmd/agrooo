import {
  Printer,
  FileCheck,
  Tractor,
  MapPin,
  User,
  Clock,
  Fuel,
  FlaskConical,
  Calendar,
  Building2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pill } from "./ui";
import {
  currency,
  number,
  type MachineUsage,
  type Machine,
  type Lot,
  type Supply,
} from "@/lib/agro-data";

interface LaborReceiptModalProps {
  usage: MachineUsage | null;
  machine?: Machine | undefined;
  lot?: Lot | undefined;
  supply?: Supply | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LaborReceiptModal({
  usage,
  machine,
  lot,
  supply,
  open,
  onOpenChange,
}: LaborReceiptModalProps) {
  if (!usage) return null;

  const hours = Math.round((usage.endHours - usage.startHours) * 100) / 100;
  const machineCost = usage.operatingCost ?? hours * (machine?.hourlyCost ?? 0);
  const supplyCost = supply && usage.supplyQty ? usage.supplyQty * supply.unitCost : 0;
  const dieselEstimatedCost = usage.dieselLiters ? usage.dieselLiters * 3.72 : 0;
  const totalCost = machineCost + supplyCost + dieselEstimatedCost;
  const costPerHa = lot && lot.hectares > 0 ? totalCost / lot.hectares : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-xl max-h-[92dvh] overflow-y-auto p-0 gap-0 border-border/80 shadow-2xl rounded-2xl bg-background">
        <DialogHeader className="p-3.5 sm:p-6 pb-3 sm:pb-4 bg-muted/40 border-b flex flex-row items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-primary">
              <Building2 className="size-3.5" /> AgroAdmin · Estancia San José
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight mt-0.5">
              Comprobante de Labor Agrícola
            </DialogTitle>
          </div>
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs shrink-0">
            <Printer className="size-3.5" /> Imprimir
          </Button>
        </DialogHeader>

        <div className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-5 text-sm">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 p-3 rounded-lg border bg-card/60 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">N° Registro:</span>
              <span className="font-mono font-bold text-foreground">
                LAB-{usage.id.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Fecha de labor:</span>
              <span className="font-medium text-foreground">{usage.date}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Tipo de labor:</span>
              <span className="font-semibold text-primary">
                {usage.laborType || "Labor mecanizada"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Máquina:</span>
              <span className="font-semibold text-foreground">{machine?.name ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Lote destino:</span>
              <span className="font-medium text-foreground">
                {lot?.name ?? "—"} ({lot?.crop})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Operador responsable:</span>
              <span className="font-semibold text-foreground">{usage.operator}</span>
            </div>
          </div>

          {/* Horometer and Times */}
          <div className="border rounded-lg p-3.5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary" /> Control de Horómetros
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-muted/40">
                <span className="text-[11px] text-muted-foreground block">Inicial</span>
                <span className="font-bold text-base num">{number(usage.startHours)} h</span>
              </div>
              <div className="p-2 rounded bg-muted/40">
                <span className="text-[11px] text-muted-foreground block">Final</span>
                <span className="font-bold text-base num">{number(usage.endHours)} h</span>
              </div>
              <div className="p-2 rounded bg-primary/10 border border-primary/20">
                <span className="text-[11px] text-primary font-medium block">Horas Efectivas</span>
                <span className="font-extrabold text-base text-primary num">+{hours} h</span>
              </div>
            </div>
          </div>

          {/* Cost Breakdown Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/70 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Concepto</th>
                  <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-3 py-2 text-right font-medium">Precio Unit. (Bs)</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-3 py-2.5 font-medium">Horas de máquina ({machine?.name})</td>
                  <td className="px-3 py-2.5 text-right num">{hours} h</td>
                  <td className="px-3 py-2.5 text-right num">
                    {currency(machine?.hourlyCost ?? 0)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold num">
                    {currency(machineCost)}
                  </td>
                </tr>
                {supply && usage.supplyQty && (
                  <tr>
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{supply.name}</span>
                      <span className="text-[10px] text-muted-foreground block">
                        {supply.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right num">
                      {usage.supplyQty} {supply.unit}
                    </td>
                    <td className="px-3 py-2.5 text-right num">
                      {currency(supply.unitCost, true)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold num">
                      {currency(supplyCost)}
                    </td>
                  </tr>
                )}
                {usage.dieselLiters && (
                  <tr>
                    <td className="px-3 py-2.5">
                      <span className="font-medium">Diésel Oíl (Consumo estimado)</span>
                      <span className="text-[10px] text-muted-foreground block">
                        Rendimiento: {(usage.dieselLiters / hours).toFixed(1)} L/h
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right num">{usage.dieselLiters} L</td>
                    <td className="px-3 py-2.5 text-right num">Bs 3,72</td>
                    <td className="px-3 py-2.5 text-right font-semibold num">
                      {currency(dieselEstimatedCost)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-muted/40 font-bold border-t">
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-2.5 text-right uppercase tracking-wider text-[11px]"
                  >
                    Costo Total Operativo:
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm text-primary num font-extrabold">
                    {currency(totalCost)}
                  </td>
                </tr>
                {lot && lot.hectares > 0 && (
                  <tr className="text-muted-foreground font-medium border-t border-dashed">
                    <td colSpan={3} className="px-3 py-1.5 text-right text-[11px]">
                      Costo imputado por hectárea ({lot.hectares} ha):
                    </td>
                    <td className="px-3 py-1.5 text-right num text-foreground font-semibold">
                      {currency(costPerHa)} / ha
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {usage.notes && (
            <div className="p-3 rounded-lg bg-muted/30 border text-xs text-muted-foreground">
              <span className="font-semibold text-foreground block mb-0.5">
                Observaciones agronómicas:
              </span>
              <p className="italic">{usage.notes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t text-center text-xs text-muted-foreground">
            <div>
              <div className="border-t border-foreground/30 pt-1.5">
                <p className="font-semibold text-foreground">{usage.operator}</p>
                <p className="text-[11px]">Operador / Maquinista</p>
              </div>
            </div>
            <div>
              <div className="border-t border-foreground/30 pt-1.5">
                <p className="font-semibold text-foreground">Administración Agrícola</p>
                <p className="text-[11px]">Control Operativo & Contable</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
