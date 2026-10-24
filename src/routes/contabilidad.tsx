import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Scale,
  TrendingDown,
  TrendingUp,
  Download,
  Receipt,
  Undo2,
  ShieldAlert,
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
import { formatMoney, exportToCsv, type LedgerEntry } from "@/lib/agro-data";
import { Field, PageHeader, Panel, Pill, StatCard, selectClass } from "@/components/agro/ui";
import { LedgerDialog } from "@/components/agro/dialogs";

export const Route = createFileRoute("/contabilidad")({
  head: () => ({
    meta: [
      { title: "Contabilidad y Libro Diario · AgroAdmin Bolivia" },
      {
        name: "description",
        content:
          "Libro contable de ingresos y egresos por categoría y lote, balance neto en Bolivianos (Bs) y Dólares (USD), y exportación para RAU/Excel.",
      },
    ],
  }),
  component: Contabilidad,
});

function Contabilidad() {
  const store = useAgro();
  const { ledger, lots, currencyMode, exchangeRate } = store;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cat, setCat] = useState("");
  const [lot, setLot] = useState("");
  const [reverseTarget, setReverseTarget] = useState<LedgerEntry | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  const handleConfirmReversal = () => {
    if (!reverseTarget) return;
    try {
      store.reverseLedgerEntry(reverseTarget.id, reverseReason);
      toast.success("Asiento anulado formalmente mediante contra-asiento de compensación");
      setReverseTarget(null);
      setReverseReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    }
  };

  const rows = ledger
    .filter(
      (e) =>
        (!from || e.date >= from) &&
        (!to || e.date <= to) &&
        (!cat || e.category === cat) &&
        (!lot || e.lotId === lot),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const inc = rows.filter((e) => e.type === "ingreso").reduce((a, e) => a + e.amount, 0);
  const exp = rows.filter((e) => e.type === "egreso").reduce((a, e) => a + e.amount, 0);

  const handleExportCsv = () => {
    exportToCsv(
      "libro_contable_agroadmin",
      ["ID", "Fecha", "Descripción", "Tipo", "Categoría", "Lote", "Importe (Bs)", "Importe (USD)"],
      rows.map((e) => {
        const l = lots.find((x) => x.id === e.lotId);
        const amountUsd = (e.amount / exchangeRate).toFixed(2);
        return [
          e.id,
          e.date,
          e.description,
          e.type.toUpperCase(),
          e.category,
          l?.name ?? "General / Sin Lote",
          e.amount,
          amountUsd,
        ];
      }),
    );
    toast.success("Libro contable exportado a archivo CSV (Excel)");
  };

  return (
    <>
      <PageHeader
        title="Contabilidad y Finanzas"
        subtitle={`Libro diario de ingresos y egresos operativos expresado en ${
          currencyMode === "USD" ? "Dólares Americanos (USD)" : "Bolivianos (Bs)"
        }`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCsv} className="gap-2">
              <Download className="size-4" /> Exportar a Excel (CSV)
            </Button>
            <LedgerDialog
              trigger={
                <Button className="gap-1.5 font-semibold">
                  <Plus className="size-4" /> Nuevo movimiento
                </Button>
              }
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 mb-5 sm:mb-6">
        <StatCard
          label="Ingresos Totales"
          value={formatMoney(inc, currencyMode, exchangeRate)}
          icon={TrendingUp}
          tone="success"
          hint="Ventas de grano y cobros"
        />
        <StatCard
          label="Egresos Operativos"
          value={formatMoney(exp, currencyMode, exchangeRate)}
          icon={TrendingDown}
          tone="danger"
          hint="Insumos, labores, diésel"
        />
        <StatCard
          label="Balance Neto"
          value={formatMoney(inc - exp, currencyMode, exchangeRate)}
          icon={Scale}
          tone={inc - exp >= 0 ? "success" : "danger"}
          hint={inc - exp >= 0 ? "Superávit operativo" : "Déficit en período"}
        />
      </div>

      <Panel className="mt-4 sm:mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 p-3.5 sm:p-4 border-b items-end">
          <Field label="Desde">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-xs h-9" />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-xs h-9" />
          </Field>
          <Field label="Categoría">
            <select className={`${selectClass} text-xs h-9`} value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Todas</option>
              {[
                "Insumos",
                "Maquinaria",
                "Combustibles",
                "Jornales",
                "Mantenimiento",
                "Venta de Cosecha",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Lote vinculado">
            <select className={`${selectClass} text-xs h-9`} value={lot} onChange={(e) => setLot(e.target.value)}>
              <option value="">Todos los lotes</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 col-span-2 lg:col-span-1"
            onClick={() => {
              setFrom("");
              setTo("");
              setCat("");
              setLot("");
            }}
          >
            Limpiar filtros
          </Button>
        </div>

        {/* Mobile View: High density touch cards */}
        <div className="md:hidden divide-y divide-border/60">
          {rows.map((e) => {
            const isReversal = Boolean(e.isReversal);
            const isReversed = ledger.some((x) => x.reversalOfId === e.id);
            const lotName = lots.find((l) => l.id === e.lotId)?.name ?? "General";
            return (
              <div key={e.id} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">{e.date}</span>
                      <Pill tone={e.type === "ingreso" ? "success" : "neutral"} className="text-[10px] py-0">
                        {e.category}
                      </Pill>
                      {lotName !== "General" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          {lotName}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-sm leading-snug break-words">
                      {isReversal && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 mr-1.5">
                          Contra-asiento
                        </span>
                      )}
                      {isReversed && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 line-through mr-1.5">
                          Anulado
                        </span>
                      )}
                      <span className={isReversed ? "line-through text-muted-foreground" : ""}>
                        {e.description}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`num font-bold text-base whitespace-nowrap text-right shrink-0 ${
                      isReversed
                        ? "text-muted-foreground line-through"
                        : e.type === "ingreso"
                          ? "text-success"
                          : "text-destructive"
                    }`}
                  >
                    {e.type === "ingreso" ? "+" : "−"}
                    {formatMoney(e.amount, currencyMode, exchangeRate)}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    Lote: <strong className="text-foreground">{lotName}</strong>
                  </span>
                  {!isReversal && !isReversed ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1 px-2 cursor-pointer"
                      onClick={() => {
                        setReverseTarget(e);
                        setReverseReason("");
                      }}
                      title="Anular con contra-asiento contable (GAAP/Audit)"
                    >
                      <Undo2 className="size-3" />
                      <span>Anular</span>
                    </Button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Inmutable</span>
                  )}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Sin movimientos para estos filtros.
            </div>
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Descripción del Movimiento</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Lote</th>
                <th className="px-4 py-3 font-medium text-right">
                  Importe ({currencyMode === "USD" ? "USD" : "Bs"})
                </th>
                <th className="px-4 py-3 font-medium text-center">Auditoría / Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((e) => {
                const isReversal = Boolean(e.isReversal);
                const isReversed = ledger.some((x) => x.reversalOfId === e.id);
                return (
                  <tr key={e.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 num whitespace-nowrap text-muted-foreground">
                      {e.date}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isReversal && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            Contra-asiento
                          </span>
                        )}
                        {isReversed && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 line-through">
                            Anulado
                          </span>
                        )}
                        <span className={isReversed ? "line-through text-muted-foreground" : ""}>
                          {e.description}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Pill tone={e.type === "ingreso" ? "success" : "neutral"}>{e.category}</Pill>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {lots.find((l) => l.id === e.lotId)?.name ?? "General"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right num font-bold whitespace-nowrap ${
                        isReversed
                          ? "text-muted-foreground line-through"
                          : e.type === "ingreso"
                            ? "text-success"
                            : "text-destructive"
                      }`}
                    >
                      {e.type === "ingreso" ? "+" : "−"}
                      {formatMoney(e.amount, currencyMode, exchangeRate)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {!isReversal && !isReversed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1 px-2 cursor-pointer"
                          onClick={() => {
                            setReverseTarget(e);
                            setReverseReason("");
                          }}
                          title="Anular con contra-asiento contable (GAAP/Audit)"
                        >
                          <Undo2 className="size-3" />
                          <span>Anular</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Inmutable</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Sin movimientos para estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Modal de Anulación Contable (Contra-asiento formal) */}
      <Dialog
        open={Boolean(reverseTarget)}
        onOpenChange={(open) => !open && setReverseTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              <DialogTitle>Anulación Contable (Contra-asiento)</DialogTitle>
            </div>
            <DialogDescription>
              Por principios de auditoría e integridad fiscal, los asientos contables no se eliminan
              físicamente. Se generará un <strong>contra-asiento formal</strong> de compensación que
              anulará el balance.
            </DialogDescription>
          </DialogHeader>

          {reverseTarget && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg bg-muted border space-y-1">
                <div>
                  <strong>Asiento Original:</strong> {reverseTarget.description}
                </div>
                <div>
                  <strong>Monto:</strong> Bs {reverseTarget.amount.toFixed(2)} (
                  {reverseTarget.type.toUpperCase()})
                </div>
                <div>
                  <strong>Fecha:</strong> {reverseTarget.date}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">
                  Motivo de anulación (Obligatorio para auditoría):
                </label>
                <Input
                  placeholder="Ej: Factura rectificada por proveedor / Error de digitación"
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setReverseTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmReversal}
              disabled={!reverseReason.trim()}
            >
              Confirmar Contra-asiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
