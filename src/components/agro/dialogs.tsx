import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgro } from "@/lib/agro-store";
import type { LedgerCategory, Supply, SupplyCategory, Unit } from "@/lib/agro-data";
import { Field, selectClass } from "./ui";

const today = () => new Date().toISOString().slice(0, 10);

export function SupplyDialog({ trigger, supply }: { trigger: ReactNode; supply?: Supply }) {
  const { upsertSupply } = useAgro();
  const [open, setOpen] = useState(false);
  const empty = {
    name: "",
    category: "Semillas" as SupplyCategory,
    stock: 0,
    minStock: 0,
    unit: "Kilos" as Unit,
    unitCost: 0,
  };
  const [f, setF] = useState(supply ?? empty);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setF(supply ?? empty);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supply ? "Editar insumo" : "Agregar insumo"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.name.trim()) {
              toast.error("Ingrese un nombre");
              return;
            }
            upsertSupply(supply ? { ...f, id: supply.id } : f);
            toast.success(supply ? "Insumo actualizado" : "Insumo agregado");
            setOpen(false);
          }}
        >
          <Field label="Nombre">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <Field label="Categoría">
              <select
                className={selectClass}
                value={f.category}
                onChange={(e) => setF({ ...f, category: e.target.value as SupplyCategory })}
              >
                {["Semillas", "Fertilizantes", "Insecticidas", "Herbicidas", "Combustibles"].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Unidad">
              <select
                className={selectClass}
                value={f.unit}
                onChange={(e) => setF({ ...f, unit: e.target.value as Unit })}
              >
                {["Litros", "Kilos", "Unidades"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Stock actual">
              <Input
                type="number"
                min={0}
                value={f.stock}
                onChange={(e) => setF({ ...f, stock: +e.target.value })}
              />
            </Field>
            <Field label="Stock mínimo">
              <Input
                type="number"
                min={0}
                value={f.minStock}
                onChange={(e) => setF({ ...f, minStock: +e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Costo unitario (Bs)">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={f.unitCost}
                  onChange={(e) => setF({ ...f, unitCost: +e.target.value })}
                />
              </Field>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto font-semibold">
              Guardar Insumo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { UsageDialog } from "./UsageDialog";

export function LedgerDialog({
  trigger,
  defaultType = "egreso",
}: {
  trigger: ReactNode;
  defaultType?: "ingreso" | "egreso";
}) {
  const { lots, addLedger } = useAgro();
  const [open, setOpen] = useState(false);
  const init = () => ({
    date: today(),
    description: "",
    category: (defaultType === "ingreso" ? "Venta de Cosecha" : "Insumos") as LedgerCategory,
    type: defaultType,
    amount: 0,
    lotId: "",
  });
  const [f, setF] = useState(init);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setF(init());
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo movimiento contable</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3.5 sm:gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.description.trim() || f.amount <= 0) {
              toast.error("Complete descripción y monto");
              return;
            }
            addLedger({ ...f, lotId: f.lotId || undefined });
            toast.success("Movimiento registrado");
            setOpen(false);
          }}
        >
          <Field label="Descripción">
            <Input
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <Field label="Tipo">
              <select
                className={selectClass}
                value={f.type}
                onChange={(e) => setF({ ...f, type: e.target.value as "ingreso" | "egreso" })}
              >
                <option value="egreso">Egreso</option>
                <option value="ingreso">Ingreso</option>
              </select>
            </Field>
            <Field label="Categoría">
              <select
                className={selectClass}
                value={f.category}
                onChange={(e) => setF({ ...f, category: e.target.value as LedgerCategory })}
              >
                {["Insumos", "Maquinaria", "Jornales", "Venta de Cosecha", "Combustibles"].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Monto (Bs)">
              <Input
                type="number"
                min={0}
                value={f.amount}
                onChange={(e) => setF({ ...f, amount: +e.target.value })}
              />
            </Field>
            <Field label="Fecha">
              <Input
                type="date"
                value={f.date}
                onChange={(e) => setF({ ...f, date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Lote vinculado">
            <select
              className={selectClass}
              value={f.lotId}
              onChange={(e) => setF({ ...f, lotId: e.target.value })}
            >
              <option value="">General</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto font-semibold">
              Registrar Movimiento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
