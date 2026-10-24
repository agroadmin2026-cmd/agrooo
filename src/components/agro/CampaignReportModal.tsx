import { useState } from "react";
import { FileText, Printer, Download, Sprout, TrendingUp, DollarSign } from "lucide-react";
import { useAgro } from "@/lib/agro-store";
import { formatMoney, number } from "@/lib/agro-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CampaignReportModal({ trigger }: { trigger?: React.ReactNode | undefined }) {
  const store = useAgro();
  const [open, setOpen] = useState(false);

  // Totales consolidados de la estancia
  const totalHectares = store.lots.reduce((acc, l) => acc + l.hectares, 0);

  // Entregas de cosecha
  const totalHarvestTons = store.harvestDeliveries.reduce((acc, d) => acc + d.payableTons, 0);
  const totalRevenueBs = store.harvestDeliveries.reduce((acc, d) => acc + d.totalAmountBs, 0);
  const avgYieldTonsPerHa = totalHectares > 0 ? totalHarvestTons / totalHectares : 0;

  // Costos por rubro
  const machineryCostBs = store.usages.reduce(
    (acc, u) => acc + (u.operatingCost ?? (u.endHours - u.startHours) * 315),
    0,
  );
  const dieselCostBs = store.usages.reduce(
    (acc, u) => acc + (u.dieselLiters ? u.dieselLiters * 3.72 : 0),
    0,
  );
  const suppliesCostBs = store.usages.reduce((acc, u) => {
    if (u.supplyId && u.supplyQty) {
      const s = store.supplies.find((x) => x.id === u.supplyId);
      return acc + u.supplyQty * (s?.unitCost ?? 0);
    }
    return acc;
  }, 0);
  const laborCostBs = store.laborers.reduce((acc, l) => acc + l.totalCostBs, 0);

  const totalCostBs = machineryCostBs + dieselCostBs + suppliesCostBs + laborCostBs;
  const grossMarginBs = totalRevenueBs - totalCostBs;
  const grossMarginPerHaBs = totalHectares > 0 ? grossMarginBs / totalHectares : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            className="gap-2 shadow-sm border-primary/30 hover:border-primary"
          >
            <FileText className="size-4 text-primary" />
            <span>Informe Cierre de Campaña</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-4xl max-h-[92dvh] overflow-y-auto p-0 rounded-2xl sm:rounded-xl">
        {/* Barra superior de acciones */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between p-3 sm:p-4 bg-muted/80 backdrop-blur border-b print:hidden gap-2">
          <div className="flex items-center gap-2">
            <FileText className="size-4 sm:size-5 text-primary" />
            <span className="font-bold text-xs sm:text-sm">Informe Ejecutivo</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
            <Button variant="default" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="size-4" />
              <span>Imprimir / PDF</span>
            </Button>
          </div>
        </div>

        {/* Contenido imprimible formal */}
        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 print:p-0 font-sans text-foreground">
          {/* Encabezado formal de la estancia */}
          <div className="border-b pb-4 sm:pb-6 flex flex-col sm:flex-row items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center size-12 rounded-xl bg-primary text-primary-foreground">
                <Sprout className="size-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Estancia Agrícola San José</h1>
                <p className="text-xs text-muted-foreground">
                  Sector Pailón - Cuatro Cañadas · Santa Cruz de la Sierra, Bolivia
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  NIT: 3849102018 · Registro SENASAG: SCZ-2026-AGRO
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider mb-1">
                Campaña Verano 2026/27
              </span>
              <p className="text-xs text-muted-foreground">
                Fecha de Emisión: {new Date().toLocaleDateString("es-BO", { dateStyle: "long" })}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium">
                Moneda Base:{" "}
                <span className="font-bold text-foreground">
                  {store.currencyMode === "USD"
                    ? `Dólares Americanos (USD · TC: ${store.exchangeRate})`
                    : "Bolivianos (Bs / BOB)"}
                </span>
              </p>
            </div>
          </div>

          {/* Tarjetas KPI Ejecutivas */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border bg-card">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                Área Bajo Riego / Manejo
              </span>
              <span className="text-2xl font-black">{number(totalHectares)} ha</span>
              <span className="text-xs text-muted-foreground block mt-1">
                {store.lots.length} lotes productivos
              </span>
            </div>

            <div className="p-4 rounded-xl border bg-card">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                Grano Entregado a Silos
              </span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {totalHarvestTons.toFixed(1)} Tn
              </span>
              <span className="text-xs text-muted-foreground block mt-1">
                Rendimiento: {avgYieldTonsPerHa.toFixed(2)} t/ha
              </span>
            </div>

            <div className="p-4 rounded-xl border bg-card">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                Ingresos Brutos Cosecha
              </span>
              <span className="text-2xl font-black text-primary">
                {formatMoney(totalRevenueBs, store.currencyMode, store.exchangeRate)}
              </span>
              <span className="text-xs text-muted-foreground block mt-1">
                {store.harvestDeliveries.length} comprobantes de balanza
              </span>
            </div>

            <div className="p-4 rounded-xl border bg-card">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                Margen Bruto Final
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatMoney(grossMarginBs, store.currencyMode, store.exchangeRate)}
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block mt-1">
                {formatMoney(grossMarginPerHaBs, store.currencyMode, store.exchangeRate, true)} / ha
              </span>
            </div>
          </div>

          {/* Estructura y Distribución de Costos Operativos */}
          <div className="border rounded-xl p-5 bg-card space-y-3">
            <h3 className="font-bold text-sm tracking-tight flex items-center justify-between">
              <span>Estructura de Costos de Campo</span>
              <span className="text-xs font-semibold text-muted-foreground">
                Costo Total Invertido:{" "}
                {formatMoney(totalCostBs, store.currencyMode, store.exchangeRate)}
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold text-left">
                    <th className="py-2">Rubro Operativo</th>
                    <th className="py-2">Detalle de Aplicación</th>
                    <th className="py-2 text-right">Subtotal en Bs</th>
                    <th className="py-2 text-right">Subtotal en USD</th>
                    <th className="py-2 text-right">% del Costo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2.5 font-bold">Insumos y Agroquímicos</td>
                    <td className="py-2.5 text-muted-foreground">
                      Semillas fiscalizadas, fertilizantes, insecticidas
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatMoney(suppliesCostBs, "BOB")}
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatMoney(suppliesCostBs, "USD", store.exchangeRate)}
                    </td>
                    <td className="py-2.5 text-right font-bold">
                      {totalCostBs > 0 ? ((suppliesCostBs / totalCostBs) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold">Labores de Maquinaria</td>
                    <td className="py-2.5 text-muted-foreground">
                      Horómetros de tractores, pulverizadoras y cosechadoras
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatMoney(machineryCostBs, "BOB")}
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatMoney(machineryCostBs, "USD", store.exchangeRate)}
                    </td>
                    <td className="py-2.5 text-right font-bold">
                      {totalCostBs > 0 ? ((machineryCostBs / totalCostBs) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold">Combustible Diésel B-SISA</td>
                    <td className="py-2.5 text-muted-foreground">
                      Litros consumidos en estancia a tarifa subvencionada (Bs 3,72)
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatMoney(dieselCostBs, "BOB")}
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatMoney(dieselCostBs, "USD", store.exchangeRate)}
                    </td>
                    <td className="py-2.5 text-right font-bold">
                      {totalCostBs > 0 ? ((dieselCostBs / totalCostBs) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold">Mano de Obra y Jornales</td>
                    <td className="py-2.5 text-muted-foreground">
                      Cuadrillas de desmalezado, apoyo en tolva y banderilleros
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatMoney(laborCostBs, "BOB")}
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatMoney(laborCostBs, "USD", store.exchangeRate)}
                    </td>
                    <td className="py-2.5 text-right font-bold">
                      {totalCostBs > 0 ? ((laborCostBs / totalCostBs) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cuadro Consolidado por Lote de Cultivo */}
          <div className="border rounded-xl p-5 bg-card space-y-3">
            <h3 className="font-bold text-sm tracking-tight">
              Rendimiento y Margen Bruto por Lote
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold text-left">
                    <th className="py-2">Lote</th>
                    <th className="py-2">Cultivo</th>
                    <th className="py-2 text-right">Superficie</th>
                    <th className="py-2 text-right">Cosecha (Tn)</th>
                    <th className="py-2 text-right">Rendimiento</th>
                    <th className="py-2 text-right">Ingreso Bruto</th>
                    <th className="py-2 text-right">Costos Campo</th>
                    <th className="py-2 text-right">Margen Bruto/ha</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {store.lots.map((lot) => {
                    const s = store.getLotFinancialSummary(lot.id);
                    if (!s) return null;
                    return (
                      <tr key={lot.id}>
                        <td className="py-2.5 font-bold">{lot.name}</td>
                        <td className="py-2.5">{lot.crop}</td>
                        <td className="py-2.5 text-right">{lot.hectares} ha</td>
                        <td className="py-2.5 text-right font-medium">
                          {s.harvestTons.toFixed(1)} t
                        </td>
                        <td className="py-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                          {s.yieldTonsPerHa.toFixed(2)} t/ha
                        </td>
                        <td className="py-2.5 text-right">
                          {formatMoney(s.revenueBs, store.currencyMode, store.exchangeRate)}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">
                          {formatMoney(s.expensesBs, store.currencyMode, store.exchangeRate)}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(
                            s.grossMarginPerHaBs,
                            store.currencyMode,
                            store.exchangeRate,
                            true,
                          )}
                          /ha
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Firmas de Autorización Formal */}
          <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs">
            <div className="border-t border-foreground/40 pt-2">
              <p className="font-bold text-foreground">Ing. Agr. Carlos Mendoza Ramos</p>
              <p className="text-muted-foreground">Responsable Técnico & Manejo de Cultivos</p>
              <p className="text-[10px] text-muted-foreground">CIAG-SCZ Matrícula: 10482</p>
            </div>
            <div className="border-t border-foreground/40 pt-2">
              <p className="font-bold text-foreground">Lic. Roberto Fernández Suárez</p>
              <p className="text-muted-foreground">Administrador General Estancia San José</p>
              <p className="text-[10px] text-muted-foreground">Santa Cruz - Bolivia</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
