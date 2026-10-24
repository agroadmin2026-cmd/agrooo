import { useState, type ChangeEvent } from "react";
import { CloudRain, Plus, Droplets } from "lucide-react";
import { useAgro } from "@/lib/agro-store";
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

type SoilCondition =
  | "Óptimo para labores"
  | "Humedad adecuada"
  | "Saturado / Anegado (Esperar 48h)"
  | "Déficit hídrico";

export function RainfallDialog({ trigger }: { trigger?: React.ReactNode | undefined }) {
  const store = useAgro();
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lotId, setLotId] = useState<string>("general");
  const [millimeters, setMillimeters] = useState<number>(25);
  const [durationHours, setDurationHours] = useState<number>(2);
  const [soilCondition, setSoilCondition] = useState<SoilCondition>("Humedad adecuada");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (millimeters <= 0) return;

    store.addRainfallRecord({
      date,
      lotId: lotId === "general" ? undefined : lotId,
      millimeters: Number(millimeters),
      durationHours: Number(durationHours) || undefined,
      soilCondition,
      notes: notes.trim() || undefined,
    });

    setOpen(false);
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
            <span>Registrar Lluvia (mm)</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-md p-4 sm:p-6 rounded-2xl sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <CloudRain className="size-5" />
            </div>
            <DialogTitle className="text-base sm:text-xl font-bold">Registro Pluviométrico</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Control de precipitaciones y aptitud de suelo para maquinaria y siembra
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1">
                Fecha de Precipitación
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
                Ubicación / Lote
              </label>
              <select
                className={selectClass}
                value={lotId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setLotId(e.target.value)}
              >
                <option value="general">📍 Estación Central Campamento</option>
                {store.lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.crop})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1">
                Milímetros Caídos (mm)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.5"
                  min="0.1"
                  required
                  value={millimeters}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setMillimeters(parseFloat(e.target.value) || 0)
                  }
                  className="pr-10 text-base font-bold text-primary"
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">
                  mm
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1">
                Duración Estimada (hrs)
              </label>
              <Input
                type="number"
                step="0.5"
                min="0.1"
                value={durationHours}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDurationHours(parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground/80 block mb-1">
              Condición y Aptitud del Suelo
            </label>
            <select
              className={selectClass}
              value={soilCondition}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setSoilCondition(e.target.value as SoilCondition)
              }
            >
              <option value="Humedad adecuada">💧 Humedad adecuada para siembra/desarrollo</option>
              <option value="Óptimo para labores">🚜 Suelo con piso óptimo para maquinaria</option>
              <option value="Saturado / Anegado (Esperar 48h)">
                ⚠️ Saturado / Anegado (Esperar 48 hrs)
              </option>
              <option value="Déficit hídrico">☀️ Déficit hídrico (Lluvia insuficiente)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground/80 block mb-1">
              Observaciones del Frente de Tormenta
            </label>
            <Textarea
              placeholder="Ej: Lluvia uniforme acompañada de viento sur templado, sin granizo."
              value={notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="p-3 rounded-lg bg-muted/60 border border-border/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Droplets className="size-4 text-sky-500" />
              <span>Acumulado del mes actual:</span>
            </div>
            <span className="font-bold text-foreground">
              {(
                store.rainfalls.reduce((acc, r) => acc + r.millimeters, 0) +
                (parseFloat(String(millimeters)) || 0)
              ).toFixed(1)}{" "}
              mm
            </span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto font-semibold">
              Guardar Lectura
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
