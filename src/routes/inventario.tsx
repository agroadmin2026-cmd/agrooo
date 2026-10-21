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
      { name: "description", content: "Control de semillas, fertilizantes e insecticidas con alertas de stock bajo." },
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
  const rows = supplies.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) && (!cat || s.category === cat));
  const value = supplies.reduce((a, s) => a + s.stock * s.unitCost, 0);

  return (
    <>
      <PageHeader title="Inventario e Insumos" subtitle={`Valor total en almacén: ${currency(value)}`}
        actions={<SupplyDialog trigger={<Button><Plus /> Agregar insumo</Button>} />} />
      <Panel>
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar insumo…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={`${selectClass} sm:w-48`} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {["Semillas", "Fertilizantes", "Insecticidas", "Herbicidas", "Combustibles"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
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
                  <td className="px-4 py-3"><Pill tone="primary">{s.category}</Pill></td>
                  <td className="px-4 py-3 text-right num">{number(s.stock)}<span className="text-muted-foreground text-xs"> / mín {number(s.minStock)}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{s.unit}</td>
                  <td className="px-4 py-3 text-right num">{currency(s.unitCost, true)}</td>
                  <td className="px-4 py-3">{isLowStock(s) ? <Pill tone="danger"><AlertTriangle className="size-3" /> Stock bajo</Pill> : <Pill tone="success">Disponible</Pill>}</td>
                  <td className="px-4 py-3 text-right">
                    <SupplyDialog supply={s} trigger={<Button size="icon" variant="ghost" aria-label={`Editar ${s.name}`}><Pencil /></Button>} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
