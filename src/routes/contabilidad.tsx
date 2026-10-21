import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Scale, TrendingDown, TrendingUp, Download, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgro } from "@/lib/agro-store";
import { formatMoney, exportToCsv } from "@/lib/agro-data";
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

  const rows = ledger
    .filter(
      (e) =>
        (!from || e.date >= from) &&
        (!to || e.date <= to) &&
        (!cat || e.category === cat) &&
        (!lot || e.lotId === lot)
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
      })
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
            <LedgerDialog trigger={<Button className="gap-1.5 font-semibold"><Plus className="size-4" /> Nuevo movimiento</Button>} />
          </div>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4">
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
          hint="Insumos, labores, diésel, jornales"
        />
        <StatCard
          label="Balance Neto"
          value={formatMoney(inc - exp, currencyMode, exchangeRate)}
          icon={Scale}
          tone={inc - exp >= 0 ? "success" : "danger"}
          hint={inc - exp >= 0 ? "Superávit operativo" : "Déficit en período"}
        />
      </div>

      <Panel className="mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-4 border-b items-end">
          <Field label="Desde">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Categoría">
            <select className={selectClass} value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Todas</option>
              {["Insumos", "Maquinaria", "Combustibles", "Jornales", "Mantenimiento", "Venta de Cosecha"].map(
                (c) => (
                  <option key={c}>{c}</option>
                )
              )}
            </select>
          </Field>
          <Field label="Lote vinculado">
            <select className={selectClass} value={lot} onChange={(e) => setLot(e.target.value)}>
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

        <div className="overflow-x-auto">
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
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((e) => (
                <tr key={e.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 num whitespace-nowrap text-muted-foreground">{e.date}</td>
                  <td className="px-4 py-3 font-medium">{e.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Pill tone={e.type === "ingreso" ? "success" : "neutral"}>{e.category}</Pill>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {lots.find((l) => l.id === e.lotId)?.name ?? "General"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right num font-bold whitespace-nowrap ${
                      e.type === "ingreso" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {e.type === "ingreso" ? "+" : "−"}{formatMoney(e.amount, currencyMode, exchangeRate)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Sin movimientos para estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
