import { useState, type ChangeEvent } from "react";
import { Users, Plus, DollarSign } from "lucide-react";
import { useAgro } from "@/lib/agro-store";
import { currency } from "@/lib/agro-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { selectClass } from "./ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function LaborerDialog({ trigger }: { trigger?: React.ReactNode | undefined }) {
  const store = useAgro();
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [workerName, setWorkerName] = useState("");
  const [lotId, setLotId] = useState(store.lots[0]?.id || "l1");
  const [taskDescription, setTaskDescription] = useState("");
  const [daysWorked, setDaysWorked] = useState<number>(1);
  const [dailyRateBs, setDailyRateBs] = useState<number>(150);
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [notes, setNotes] = useState("");

  const totalCostBs = (daysWorked || 0) * (dailyRateBs || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim() || daysWorked <= 0 || dailyRateBs <= 0) return;

    store.addLaborerWorklog({
      date,
      workerName: workerName.trim(),
      lotId,
      taskDescription: taskDescription.trim() || "Labor manual de campo",
      daysWorked: Number(daysWorked),
      dailyRateBs: Number(dailyRateBs),
      isPaid,
      notes: notes.trim() || undefined,
    });

    setOpen(false);
    setWorkerName("");
    setTaskDescription("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button className="gap-2 shadow-sm font-semibold">
            <Plus className="size-4" />
            <span>Registrar Jornal de Campo</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="size-5" />
            </div>
            <DialogTitle className="text-xl">Planilla de Jornaleros</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Asignación de costos de mano de obra eventual por lote y registro contable
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1">
                Fecha de Jornal
              </label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1">
                Lote de Destino
              </label>
              <select
                className={selectClass}
                value={lotId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setLotId(e.target.value)}
              >
                {store.lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.crop})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground/80 block mb-1">
              Nombre del Trabajador / Cuadrillero
            </label>
            <Input
              type="text"
              required
              placeholder="Ej: Faustino Callisaya"
              value={workerName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setWorkerName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground/80 block mb-1">
              Descripción de la Tarea Realizada
            </label>
            <Input
              type="text"
              required
              placeholder="Ej: Desmalezado manual en cabeceras / Banderillero"
              value={taskDescription}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTaskDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1">
                Días / Jornales Trabajados
              </label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={daysWorked}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDaysWorked(parseFloat(e.target.value) || 0)
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1">
                Tarifa Diaria (Bs/día)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="5"
                  min="50"
                  required
                  value={dailyRateBs}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setDailyRateBs(parseFloat(e.target.value) || 0)
                  }
                  className="pr-10"
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">
                  Bs
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                Total Mano de Obra:
              </span>
            </div>
            <span className="text-lg font-bold text-primary">
              {currency(totalCostBs)}
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground/80 block mb-1">
              Estado de Pago
            </label>
            <select
              className={selectClass}
              value={isPaid ? "pagado" : "pendiente"}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setIsPaid(e.target.value === "pagado")}
            >
              <option value="pagado">✅ Pagado y liquidado en efectivo</option>
              <option value="pendiente">⏳ Pendiente de liquidación fin de semana</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground/80 block mb-1">
              Notas Adicionales
            </label>
            <Textarea
              placeholder="Detalles de cuadrilla, contratista o recibo manual de campo"
              value={notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar Jornal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
