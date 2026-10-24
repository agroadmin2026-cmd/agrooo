import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgro } from "@/lib/agro-store";
import { currency, isLowStock, number } from "@/lib/agro-data";
import { PageHeader, Panel, Pill, selectClass } from "@/components/agro/ui";
import { SupplyDialog } from "@/components/agro/dialogs";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario e Insumos · AgroAdmin" },
      {
        name: "description",
        content: "Control de semillas, fertilizantes e insecticidas con alertas de stock bajo.",
      },
      { property: "og:title", content: "Inventario e Insumos · AgroAdmin" },
      { property: "og:description", content: "Control de insumos agrícolas con alertas de stock." },
    ],
  }),
  component: Inventario,
});

function Inventario() {
  const { supplies } = useAgro();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const rows = supplies.filter(
    (s) => s.name.toLowerCase().includes(q.toLowerCase()) && (!cat || s.category === cat),
  );
  const value = supplies.reduce((a, s) => a + s.stock * s.unitCost, 0);

  return (
    <>
      <PageHeader
        title="Inventario e Insumos"
        subtitle={`Valor total en almacén: ${currency(value)}`}
        actions={
          <SupplyDialog
            trigger={
              <Button>
                <Plus /> Agregar insumo
              </Button>
            }
          />
        }
      />
      <Panel>
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar insumo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className={`${selectClass} sm:w-48`}
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {["Semillas", "Fertilizantes", "Insecticidas", "Herbicidas", "Combustibles"].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </div>
        {/* Mobile View: Cards (md:hidden) */}
        <div className="md:hidden divide-y divide-border/60">
          {rows.map((s) => {
            const low = isLowStock(s);
            return (
              <div key={s.id} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Pill tone="primary" className="text-[10px] py-0">{s.category}</Pill>
                      {low ? (
                        <Pill tone="danger" className="text-[10px] py-0">
                          <AlertTriangle className="size-2.5" /> Stock bajo
                        </Pill>
                      ) : (
                        <Pill tone="success" className="text-[10px] py-0">Disponible</Pill>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm text-foreground">{s.name}</h4>
                  </div>
                  <SupplyDialog
                    supply={s}
                    trigger={
                      <Button size="icon" variant="outline" className="size-8 shrink-0" aria-label={`Editar ${s.name}`}>
                        <Pencil className="size-3.5" />
                      </Button>
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
                  <div className="bg-muted/40 p-2 rounded-md">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Stock Disponible</span>
                    <span className="text-sm font-bold num text-foreground">
                      {number(s.stock)} <span className="text-xs font-normal text-muted-foreground">{s.unit}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Mínimo: {number(s.minStock)} {s.unit}
                    </span>
                  </div>

                  <div className="bg-muted/40 p-2 rounded-md">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Costo Unit. Prom.</span>
                    <span className="text-sm font-bold num text-foreground">
                      {currency(s.unitCost, true)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Valuación: {currency(s.stock * s.unitCost, true)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Sin resultados para los filtros seleccionados.
            </div>
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium text-right">Stock actual</th>
                <th className="px-4 py-3 font-medium">Unidad</th>
                <th className="px-4 py-3 font-medium text-right">Costo unit. prom.</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    <Pill tone="primary">{s.category}</Pill>
                  </td>
                  <td className="px-4 py-3 text-right num">
                    {number(s.stock)}
                    <span className="text-muted-foreground text-xs">
                      {" "}
                      / mín {number(s.minStock)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.unit}</td>
                  <td className="px-4 py-3 text-right num">{currency(s.unitCost, true)}</td>
                  <td className="px-4 py-3">
                    {isLowStock(s) ? (
                      <Pill tone="danger">
                        <AlertTriangle className="size-3" /> Stock bajo
                      </Pill>
                    ) : (
                      <Pill tone="success">Disponible</Pill>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SupplyDialog
                      supply={s}
                      trigger={
                        <Button size="icon" variant="ghost" aria-label={`Editar ${s.name}`}>
                          <Pencil />
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Sin resultados
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
