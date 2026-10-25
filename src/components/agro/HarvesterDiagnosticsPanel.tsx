import { useState } from "react";
import {
  Wrench,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Wind,
  Layers,
  Sparkles,
  Info,
  Calendar,
  User,
  ArrowRight,
  Filter,
  Copy,
  Printer,
  RotateCcw,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { useAgro } from "@/lib/agro-store";
import {
  initialHarvesterStates,
  computeHarvesterDiagnostic,
  type HarvesterStateParams,
  type HarvesterTechnicalObservation,
} from "@/lib/agro-chaco-seeding";

const observationPresets = [
  "Filtro de aceite recién cambiado con repuesto original Fleetguard y aceite 15W40 CI-4. Nivel óptimo.",
  "Se detectó leve sudoración en el retén del porta-filtro de aceite. Monitorear en próximas 20 horas.",
  "Diferencia de presión en manómetro de restricción de aire. Sopletear cartucho primario en el campamento.",
  "Cuchillas melladas en el extremo izquierdo de la barra Draper de 40 pies. Peligro de desgrane en soya.",
  "Separación de cóncavos y régimen de rotor calibrados para humedad de grano al 13%.",
  "Filtro decantador de diésel con trazas de agua. Se purgó la trampa de combustible.",
];

export function HarvesterDiagnosticsPanel() {
  const store = useAgro();

  // Estado con persistencia local
  const [harvesters, setHarvesters] = useState<HarvesterStateParams[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("agroadmin_harvester_diagnostics_v1");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return initialHarvesterStates;
  });

  const [selectedHarvesterId, setSelectedHarvesterId] = useState<string>(
    harvesters[0]?.id ?? "m3",
  );

  // Filtro de bitácora
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");

  // Formulario para nueva observación
  const [newObsComponent, setNewObsComponent] =
    useState<HarvesterTechnicalObservation["component"]>("Motor / Filtro de Aceite");
  const [newObsSeverity, setNewObsSeverity] =
    useState<HarvesterTechnicalObservation["severity"]>("Normal");
  const [newObsDescription, setNewObsDescription] = useState<string>("");
  const [newObsInspector, setNewObsInspector] = useState<string>("Pedro Salazar (Mecánico de Campo)");

  const activeMachine =
    harvesters.find((h) => h.id === selectedHarvesterId) ?? harvesters[0];

  const diagnostic = activeMachine
    ? computeHarvesterDiagnostic(activeMachine)
    : null;

  const saveHarvesters = (updated: HarvesterStateParams[]) => {
    setHarvesters(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("agroadmin_harvester_diagnostics_v1", JSON.stringify(updated));
    }
  };

  const updateActiveMachine = (partial: Partial<HarvesterStateParams>) => {
    if (!activeMachine) return;
    const updated = harvesters.map((h) =>
      h.id === activeMachine.id ? { ...h, ...partial } : h,
    );
    saveHarvesters(updated);
  };

  // Acción rápida: Registrar recambio inmediato de filtro de aceite
  const handleQuickOilFilterChange = () => {
    if (!activeMachine) return;
    const currentHours = activeMachine.currentEngineHours;
    const currentKm = activeMachine.currentKm ?? 0;

    const newObservation: HarvesterTechnicalObservation = {
      id: `hobs-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      engineHoursAtLog: currentHours,
      odometerKmAtLog: currentKm,
      component: "Motor / Filtro de Aceite",
      severity: "Normal",
      description: `CAMBIO DE FILTRO DE ACEITE REALIZADO a las ${currentHours} horas de motor (${currentKm} km). Se instaló filtro nuevo y aceite motor según especificación del fabricante.`,
      inspectorName: "Jefe de Taller / Operador",
      isResolved: true,
    };

    updateActiveMachine({
      lastOilFilterChangeHours: currentHours,
      lastOilFilterChangeKm: currentKm,
      observations: [newObservation, ...activeMachine.observations],
    });

    toast.success("¡Filtro de Aceite Registrado como Nuevo!", {
      description: `Horómetro base fijado en ${currentHours} h. Contador de vida útil reiniciado al 100% (250 horas disponibles).`,
    });
  };

  // Agregar observación
  const handleAddObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMachine) return;
    if (!newObsDescription.trim()) {
      toast.error("Ingresa una descripción de la observación técnica");
      return;
    }

    const newObs: HarvesterTechnicalObservation = {
      id: `hobs-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      engineHoursAtLog: activeMachine.currentEngineHours,
      rotorHoursAtLog: activeMachine.currentRotorHours,
      odometerKmAtLog: activeMachine.currentKm,
      component: newObsComponent,
      severity: newObsSeverity,
      description: newObsDescription.trim(),
      inspectorName: newObsInspector.trim() || "Inspector Agronómico",
      isResolved: newObsSeverity === "Normal",
    };

    updateActiveMachine({
      observations: [newObs, ...activeMachine.observations],
    });

    setNewObsDescription("");
    toast.success("Observación técnica registrada en la bitácora", {
      description: `Componente: ${newObsComponent} (${newObsSeverity})`,
    });
  };

  // Toggle estado de resolución de observación
  const handleToggleResolve = (obsId: string) => {
    if (!activeMachine) return;
    const updatedObs = activeMachine.observations.map((o) =>
      o.id === obsId ? { ...o, isResolved: !o.isResolved } : o,
    );
    updateActiveMachine({ observations: updatedObs });
    toast.info("Estado de observación actualizado");
  };

  // Eliminar observación
  const handleDeleteObservation = (obsId: string) => {
    if (!activeMachine) return;
    const updatedObs = activeMachine.observations.filter((o) => o.id !== obsId);
    updateActiveMachine({ observations: updatedObs });
    toast.info("Observación eliminada");
  };

  // Copiar resumen de diagnóstico
  const handleCopyDiagnosticSummary = () => {
    if (!activeMachine || !diagnostic) return;
    const summary = `
🚜 REPORTE TÉCNICO DE TELEMETRÍA - AGROADMIN BOLIVIA
Máquina: ${activeMachine.name} (${activeMachine.model})
• Horómetro Motor: ${activeMachine.currentEngineHours} h | Trilla: ${activeMachine.currentRotorHours} h | Odom: ${activeMachine.currentKm ?? 0} km
• FILTRO DE ACEITE: Último cambio a las ${activeMachine.lastOilFilterChangeHours} h (${diagnostic.hoursSinceOilChange} h transcurridas)
• Estado Filtro Aceite: ${diagnostic.oilFilterStatus} (${diagnostic.hoursRemainingOilFilter} h restantes - ${diagnostic.oilFilterLifePercent}% vida útil)
• Filtros Combustible: ${diagnostic.fuelFiltersStatus} (${diagnostic.hoursRemainingFuelFilters} h restantes)
• Filtro de Aire: ${diagnostic.airFilterStatus} (Restricción: ${activeMachine.airRestrictionGaugePercent}%)
• Desgaste Mecánico Promedio: ${diagnostic.threshingWearAveragePercent}%
• Score de Preparación para Zafra: ${diagnostic.overallHarvestReadinessScore}/100
• Observaciones Pendientes: ${diagnostic.criticalAlertsCount} críticas, ${diagnostic.activeWarningsCount} preventivas
`.trim();

    navigator.clipboard.writeText(summary);
    toast.success("¡Resumen técnico copiado al portapapeles!", {
      description: "Listo para compartir por WhatsApp con el jefe de taller o contratista.",
    });
  };

  const filteredObservations = (activeMachine?.observations ?? []).filter((o) => {
    if (filterSeverity === "ALL") return true;
    if (filterSeverity === "UNRESOLVED") return !o.isResolved;
    if (filterSeverity === "CRITICAL") return o.severity === "Crítico (Riesgo de parada en zafra)";
    return o.severity === filterSeverity;
  });

  return (
    <div className="space-y-6">
      {/* SELECTOR DE COSECHADORA Y HEADER */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-background to-primary/10 border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs tracking-wider uppercase">
              <Gauge className="size-4" /> Telemetría Predictiva & Mantenimiento de Zafra
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-1">
              Estado de la Cosechadora & Filtros de Aceite
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Cálculo de horas remanentes de filtro de aceite, desgaste de cuchillas y bitácora técnica de campo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyDiagnosticSummary}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border bg-background hover:bg-muted transition-colors shadow-sm"
            >
              <Copy className="size-3.5" /> Copiar Reporte WhatsApp
            </button>
            <button
              onClick={handleQuickOilFilterChange}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md active:scale-95"
            >
              <RotateCcw className="size-3.5" /> Registrar Filtro de Aceite Recién Cambiado
            </button>
          </div>
        </div>

        {/* SELECTOR DE MAQUINARIA EN CAROUSEL CHIPS */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t overflow-x-auto pb-1">
          <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
            Cosechadora activa:
          </span>
          {harvesters.map((h) => {
            const isSelected = h.id === selectedHarvesterId;
            const diag = computeHarvesterDiagnostic(h);
            return (
              <button
                key={h.id}
                onClick={() => setSelectedHarvesterId(h.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "bg-muted/60 hover:bg-muted text-foreground border"
                }`}
              >
                <span>{h.name}</span>
                <span
                  className={`size-2 rounded-full ${
                    diag.oilFilterStatus === "Óptimo"
                      ? "bg-emerald-400"
                      : diag.oilFilterStatus === "Atención próxima"
                      ? "bg-amber-400"
                      : "bg-red-500 animate-pulse"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {activeMachine && diagnostic && (
        <>
          {/* BANNER DE ALERTA CRÍTICA SI EL FILTRO ESTÁ VENCIDO O PRÓXIMO */}
          {diagnostic.oilFilterStatus !== "Óptimo" && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-sm animate-in fade-in duration-300 ${
                diagnostic.oilFilterStatus === "Cambio urgente"
                  ? "bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
              }`}
            >
              <AlertTriangle className="size-5 shrink-0 mt-0.5 text-current" />
              <div className="flex-1">
                <div className="font-bold flex items-center gap-2">
                  <span>
                    {diagnostic.oilFilterStatus === "Cambio urgente"
                      ? "¡ALERTA CRÍTICA: FILTRO DE ACEITE VENCIDO!"
                      : "ATENCIÓN PREVENTIVA: RECAMBIO DE FILTRO PRÓXIMO"}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-background/60 font-mono">
                    {diagnostic.hoursRemainingOilFilter} horas restantes
                  </span>
                </div>
                <p className="text-xs mt-1 opacity-90">{diagnostic.oilFilterAlert}</p>
              </div>
              <button
                onClick={handleQuickOilFilterChange}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-background text-foreground font-semibold shadow-sm hover:bg-muted transition-colors"
              >
                Actualizar a Nuevo
              </button>
            </div>
          )}

          {/* GRID DE KPIs Y CONTADORES DE FILTRO DE ACEITE & TELEMETRÍA */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* KPI 1: FILTRO DE ACEITE VIDA ÚTIL */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm space-y-2 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Filtro de Aceite</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    diagnostic.oilFilterStatus === "Óptimo"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : diagnostic.oilFilterStatus === "Atención próxima"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}
                >
                  {diagnostic.oilFilterStatus}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black tracking-tight num">
                  {diagnostic.hoursRemainingOilFilter} h
                </span>
                <span className="text-xs text-muted-foreground">
                  de {activeMachine.oilFilterIntervalHours ?? 250} h
                </span>
              </div>
              {/* Barra de progreso interactiva */}
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    diagnostic.oilFilterLifePercent > 35
                      ? "bg-emerald-500"
                      : diagnostic.oilFilterLifePercent > 15
                      ? "bg-amber-500"
                      : "bg-red-500 animate-pulse"
                  }`}
                  style={{ width: `${diagnostic.oilFilterLifePercent}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {diagnostic.hoursSinceOilChange} h de uso ({diagnostic.oilFilterLifePercent}% vida útil)
              </p>
            </div>

            {/* KPI 2: HORÓMETRO ACTUAL MOTOR & ROTOR */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Horómetro Motor</span>
                <Clock className="size-3.5 text-primary" />
              </div>
              <p className="text-2xl font-black tracking-tight num">
                {activeMachine.currentEngineHours} h
              </p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Rotor trilla: {activeMachine.currentRotorHours} h</span>
                <span>Odom: {activeMachine.currentKm ?? 0} km</span>
              </div>
            </div>

            {/* KPI 3: FILTROS DE COMBUSTIBLE */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Filtros Diésel</span>
                <span className="text-[10px] font-bold text-primary">
                  {diagnostic.fuelFiltersStatus}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black tracking-tight num">
                  {diagnostic.hoursRemainingFuelFilters} h
                </span>
                <span className="text-xs text-muted-foreground">
                  de {activeMachine.fuelFilterIntervalHours ?? 500} h
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-500"
                  style={{ width: `${diagnostic.fuelFiltersLifePercent}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Trampa y cartucho secundario</p>
            </div>

            {/* KPI 4: HARVEST READINESS SCORE */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Aptitud de Zafra</span>
                <Sparkles className="size-3.5 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-2xl font-black tracking-tight num ${
                    diagnostic.overallHarvestReadinessScore >= 80
                      ? "text-emerald-500"
                      : diagnostic.overallHarvestReadinessScore >= 60
                      ? "text-amber-500"
                      : "text-red-500"
                  }`}
                >
                  {diagnostic.overallHarvestReadinessScore}%
                </span>
                <span className="text-xs text-muted-foreground">Score Senior</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {diagnostic.criticalAlertsCount > 0
                  ? `⚠️ ${diagnostic.criticalAlertsCount} alertas críticas`
                  : diagnostic.activeWarningsCount > 0
                  ? `⚡ ${diagnostic.activeWarningsCount} mantenimientos próximos`
                  : "Listo para alta exigencia"}
              </p>
            </div>
          </div>

          {/* SECCIÓN INTERACTIVA: EDICIÓN DE PARÁMETROS DE LA COSECHADORA Y FILTROS */}
          <div className="p-5 rounded-2xl border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <h3 className="font-bold text-sm tracking-tight">
                  Parámetros de Telemetría & Kilometraje de Filtro de Aceite
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                Los datos se recalculan en tiempo real al ingresar valores
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              {/* Horómetro actual */}
              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Horómetro actual de motor (h)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={activeMachine.currentEngineHours}
                  onChange={(e) =>
                    updateActiveMachine({
                      currentEngineHours: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-semibold num"
                />
              </div>

              {/* Horómetro de trilla / rotor */}
              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Horómetro actual de trilla/rotor (h)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={activeMachine.currentRotorHours}
                  onChange={(e) =>
                    updateActiveMachine({
                      currentRotorHours: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-semibold num"
                />
              </div>

              {/* Kilómetros de traslado */}
              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Kilometraje actual odómetro (km)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={activeMachine.currentKm ?? 0}
                  onChange={(e) =>
                    updateActiveMachine({
                      currentKm: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-semibold num"
                />
              </div>

              {/* Horómetro en que recién se cambió el filtro de aceite */}
              <div>
                <label className="block font-bold text-amber-600 dark:text-amber-400 mb-1">
                  Horómetro cambio filtro aceite (h)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={activeMachine.lastOilFilterChangeHours}
                  onChange={(e) =>
                    updateActiveMachine({
                      lastOilFilterChangeHours: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border-2 border-amber-500/50 bg-background text-sm font-bold num"
                />
              </div>

              {/* Km en que recién se cambió el filtro de aceite */}
              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Km recién cambiado filtro de aceite
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={activeMachine.lastOilFilterChangeKm ?? 0}
                  onChange={(e) =>
                    updateActiveMachine({
                      lastOilFilterChangeKm: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-semibold num"
                />
              </div>

              {/* Intervalo de recambio horas */}
              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Intervalo filtro de aceite (estándar 250h)
                </label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={activeMachine.oilFilterIntervalHours ?? 250}
                  onChange={(e) =>
                    updateActiveMachine({
                      oilFilterIntervalHours: Math.max(50, Number(e.target.value) || 250),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-semibold num"
                />
              </div>

              {/* Marca y especificación de aceite y filtro */}
              <div className="sm:col-span-2">
                <label className="block font-medium text-muted-foreground mb-1">
                  Especificación de Aceite y Filtro Instalado
                </label>
                <input
                  type="text"
                  value={activeMachine.oilBrandAndViscosity ?? ""}
                  onChange={(e) =>
                    updateActiveMachine({ oilBrandAndViscosity: e.target.value })
                  }
                  placeholder="ej. 15W40 CI-4 Plus + Filtro Original Fleetguard / Donaldson"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                />
              </div>
            </div>

            {/* SECCIÓN DESGASTE MECÁNICO & FILTRO DE AIRE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t text-xs">
              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Restricción Filtro de Aire ({activeMachine.airRestrictionGaugePercent}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeMachine.airRestrictionGaugePercent}
                  onChange={(e) =>
                    updateActiveMachine({
                      airRestrictionGaugePercent: Number(e.target.value),
                    })
                  }
                  className="w-full accent-primary"
                />
                <span className="text-[10px] text-muted-foreground">
                  {diagnostic.airFilterStatus}
                </span>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Desgaste Cuchillas Draper ({activeMachine.cutterBarKnifeWearPercent}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeMachine.cutterBarKnifeWearPercent}
                  onChange={(e) =>
                    updateActiveMachine({
                      cutterBarKnifeWearPercent: Number(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500"
                />
                <span className="text-[10px] text-muted-foreground">
                  {activeMachine.cutterBarKnifeWearPercent > 50
                    ? "Requiere afilado o recambio de secciones"
                    : "Filo óptimo de corte"}
                </span>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Desgaste Barras Batidoras ({activeMachine.raspBarsWearPercent}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeMachine.raspBarsWearPercent}
                  onChange={(e) =>
                    updateActiveMachine({
                      raspBarsWearPercent: Number(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-500"
                />
                <span className="text-[10px] text-muted-foreground">
                  Rotor trilla y frotamiento de grano
                </span>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  Desgaste de Cóncavos ({activeMachine.concavesWearPercent}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeMachine.concavesWearPercent}
                  onChange={(e) =>
                    updateActiveMachine({
                      concavesWearPercent: Number(e.target.value),
                    })
                  }
                  className="w-full accent-emerald-500"
                />
                <span className="text-[10px] text-muted-foreground">
                  Calibración de separación milimétrica
                </span>
              </div>
            </div>
          </div>

          {/* BITÁCORA TÉCNICA DE OBSERVACIONES ("una descripción de si se ve una observación") */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* FORMULARIO DE REGISTRO DE OBSERVACIÓN */}
            <div className="lg:col-span-1 p-5 rounded-2xl border bg-card space-y-4">
              <div className="flex items-center gap-2">
                <Wrench className="size-4 text-primary" />
                <h3 className="font-bold text-sm tracking-tight">
                  Registrar Observación Técnica
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Documenta cualquier detalle visual, fugas, sonidos, estado de filtros o desgastes durante la jornada.
              </p>

              <form onSubmit={handleAddObservation} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Componente / Sistema Inspeccionado
                  </label>
                  <select
                    value={newObsComponent}
                    onChange={(e) =>
                      setNewObsComponent(
                        e.target.value as HarvesterTechnicalObservation["component"],
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border bg-background text-xs"
                  >
                    <option value="Motor / Filtro de Aceite">Motor / Filtro de Aceite</option>
                    <option value="Filtros de Combustible / Trampa">
                      Filtros de Combustible / Trampa
                    </option>
                    <option value="Filtros de Aire & Aspiración">
                      Filtros de Aire & Aspiración
                    </option>
                    <option value="Plataforma de Corte & Cuchillas">
                      Plataforma de Corte & Cuchillas
                    </option>
                    <option value="Rotor & Cóncavos de Trilla">
                      Rotor & Cóncavos de Trilla
                    </option>
                    <option value="Sinfín & Elevador de Grano">
                      Sinfín & Elevador de Grano
                    </option>
                    <option value="Sistema Hidrostático & Fugas">
                      Sistema Hidrostático & Fugas
                    </option>
                    <option value="Orugas / Neumáticos & Transmisión">
                      Orugas / Neumáticos & Transmisión
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Nivel de Severidad
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ["Normal", "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"],
                        ["Atención preventiva", "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"],
                        ["Crítico (Riesgo de parada en zafra)", "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"],
                      ] as const
                    ).map(([level, styles]) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setNewObsSeverity(level)}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold text-center transition-all ${
                          newObsSeverity === level
                            ? `${styles} ring-2 ring-primary shadow-sm`
                            : "bg-muted/40 text-muted-foreground opacity-70"
                        }`}
                      >
                        {level === "Crítico (Riesgo de parada en zafra)" ? "Crítico" : level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CHIPS DE OBSERVACIONES RÁPIDAS FRECUENTES */}
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Plantillas de observación rápida:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {observationPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewObsDescription(preset)}
                        className="text-[10px] px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground border text-left truncate max-w-full"
                        title={preset}
                      >
                        {preset.slice(0, 36)}...
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Descripción detallada de la observación
                  </label>
                  <textarea
                    rows={3}
                    value={newObsDescription}
                    onChange={(e) => setNewObsDescription(e.target.value)}
                    placeholder="Describe lo observado: ej. filtro de aceite recién cambiado, estado de rodamientos, fugas de aceite o desgastes..."
                    className="w-full px-3 py-2 rounded-lg border bg-background text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Inspector / Mecánico responsable
                  </label>
                  <input
                    type="text"
                    value={newObsInspector}
                    onChange={(e) => setNewObsInspector(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-sm transition-all"
                >
                  <Plus className="size-4" /> Agregar Observación a la Bitácora
                </button>
              </form>
            </div>

            {/* LISTA CRONOLÓGICA DE OBSERVACIONES TÉCNICAS */}
            <div className="lg:col-span-2 p-5 rounded-2xl border bg-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <h3 className="font-bold text-sm tracking-tight">
                    Historial de Inspecciones & Estado de Filtros ({activeMachine.observations.length})
                  </h3>
                </div>

                {/* Filtro de severidad */}
                <div className="flex items-center gap-1.5 text-xs">
                  <Filter className="size-3 text-muted-foreground" />
                  <span className="text-muted-foreground text-[11px]">Ver:</span>
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="px-2 py-1 rounded border bg-background text-[11px]"
                  >
                    <option value="ALL">Todas las observaciones</option>
                    <option value="UNRESOLVED">Pendientes de atención</option>
                    <option value="CRITICAL">Críticas únicamente</option>
                    <option value="Atención preventiva">Preventivas</option>
                    <option value="Normal">Normales / Rutina</option>
                  </select>
                </div>
              </div>

              {filteredObservations.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed text-muted-foreground text-xs">
                  No hay observaciones registradas con el filtro actual.
                </div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {filteredObservations.map((obs) => {
                    const isCritical =
                      obs.severity === "Crítico (Riesgo de parada en zafra)";
                    const isWarning = obs.severity === "Atención preventiva";

                    return (
                      <div
                        key={obs.id}
                        className={`p-3.5 rounded-xl border text-xs transition-all ${
                          obs.isResolved
                            ? "bg-muted/20 opacity-75"
                            : isCritical
                            ? "bg-red-500/5 border-red-500/30"
                            : isWarning
                            ? "bg-amber-500/5 border-amber-500/30"
                            : "bg-card"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCritical
                                  ? "bg-red-500/20 text-red-700 dark:text-red-400"
                                  : isWarning
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                  : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              }`}
                            >
                              {obs.severity}
                            </span>
                            <span className="font-semibold text-foreground">
                              {obs.component}
                            </span>
                            {obs.isResolved && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                <CheckCircle2 className="size-3" /> Resuelto
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" /> {obs.date}
                            </span>
                            <span className="font-mono">
                              {obs.engineHoursAtLog} h
                            </span>
                            {obs.odometerKmAtLog ? (
                              <span className="font-mono">
                                ({obs.odometerKmAtLog} km)
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <p className="mt-2 text-foreground font-medium text-xs leading-relaxed">
                          {obs.description}
                        </p>

                        <div className="mt-3 pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="size-3" /> {obs.inspectorName}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleResolve(obs.id)}
                              className="text-xs hover:text-foreground font-semibold underline underline-offset-2"
                            >
                              {obs.isResolved ? "Reabrir" : "Marcar Atendido"}
                            </button>
                            <button
                              onClick={() => handleDeleteObservation(obs.id)}
                              className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                              title="Eliminar observación"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
