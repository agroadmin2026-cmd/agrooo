import { useState, type ChangeEvent } from "react";
import { Bug, Plus, AlertTriangle, ShieldCheck } from "lucide-react";
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

export function ScoutingDialog({ trigger }: { trigger?: React.ReactNode | undefined }) {
  const store = useAgro();
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lotId, setLotId] = useState(store.lots[0]?.id || "l1");
  const [phenologicalStage, setPhenologicalStage] = useState("V4 (Cuatro hojas)");
  const [pestName, setPestName] = useState("");
  const [pestSeverity, setPestSeverity] = useState<
    "Ninguna" | "Baja" | "Media" | "Umbral de Daño Económico"
  >("Baja");
  const [weedPressure, setWeedPressure] = useState<
    "Controlada" | "Media (Focos aislados)" | "Alta (Requiere desecación)"
  >("Controlada");
  const [disease, setDisease] = useState("Ninguna");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [supplyRecommendedId, setSupplyRecommendedId] = useState<string>("none");
  const [notes, setNotes] = useState("");

  const agrochemicals = store.supplies.filter(
    (s) => s.category === "Insecticidas" || s.category === "Herbicidas" || s.category === "Fertilizantes"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    store.addFieldScouting({
      date,
      lotId,
      phenologicalStage,
      pestName: pestName.trim() || undefined,
      pestSeverity,
      weedPressure,
      disease: disease.trim() || undefined,
      recommendedAction:
        recommendedAction.trim() ||
        (pestSeverity === "Umbral de Daño Económico"
          ? "Aplicación fitosanitaria urgente recomendada"
          : "Monitoreo continuo de evolución"),
      supplyRecommendedId: supplyRecommendedId === "none" ? undefined : supplyRecommendedId,
      notes: notes.trim() || undefined,
    });

    setOpen(false);
    setPestName("");
    setRecommendedAction("");
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
            <span>Nuevo Monitoreo de Campo</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bug className="size-5" />
            </div>
            <DialogTitle className="text-xl">Monitoreo y Sanidad Vegetal</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Scouting agronómico: fenología, umbrales de plagas y malezas por lote
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1">
                Fecha del Monitoreo
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
                Lote Inspeccionado
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1">
                Estadío Fenológico
              </label>
              <Input
                type="text"
                required
                placeholder="Ej: R1 Inicio Floración / V4 Vegetativo"
                value={phenologicalStage}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPhenologicalStage(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1">
                Presencia de Malezas
              </label>
              <select
                className={selectClass}
                value={weedPressure}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setWeedPressure(e.target.value as any)}
              >
                <option value="Controlada">🌱 Controlada (Lote limpio)</option>
                <option value="Media (Focos aislados)">🌿 Media (Focos aislados)</option>
                <option value="Alta (Requiere desecación)">⚠️ Alta (Requiere aplicación)</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Plaga Principal Identificada</span>
              {pestSeverity === "Umbral de Daño Económico" ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="size-3" />
                  Alerta Crítica
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="size-3" />
                  Bajo Control
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Nombre de la Plaga
                </label>
                <Input
                  type="text"
                  placeholder="Ej: Falsa Medidora / Cogollero"
                  value={pestName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPestName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Nivel de Infestación
                </label>
                <select
                  className={selectClass}
                  value={pestSeverity}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setPestSeverity(e.target.value as any)}
                >
                  <option value="Ninguna">Ninguna (0 orugas/m)</option>
                  <option value="Baja">Baja (1 a 4 orugas/m)</option>
                  <option value="Media">Media (5 a 8 orugas/m)</option>
                  <option value="Umbral de Daño Económico">⚠️ Umbral de Daño (&gt;8 orugas/m)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1">
                Enfermedad Foliar
              </label>
              <Input
                type="text"
                placeholder="Ej: Roya de la Soya / Ninguna"
                value={disease}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDisease(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1">
                Insumo Sugerido de Almacén
              </label>
              <select
                className={selectClass}
                value={supplyRecommendedId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSupplyRecommendedId(e.target.value)}
              >
                <option value="none">Sin insumo requerido</option>
                {agrochemicals.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Stock: {s.stock} {s.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground/80 block mb-1">
              Acción Agronómica Recomendada
            </label>
            <Input
              type="text"
              placeholder="Ej: Pulverización preventiva con 100 cc/ha de Cipermetrina en 48 hrs"
              value={recommendedAction}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setRecommendedAction(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground/80 block mb-1">
              Observaciones de Campo
            </label>
            <Textarea
              placeholder="Detalles de defoliación, humedad en el entresurco o estado general del follaje"
              value={notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Monitoreo</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
