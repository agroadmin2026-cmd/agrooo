import { useState } from "react";
import {
  Sprout,
  Calculator,
  Tractor,
  Layers,
  FlaskConical,
  Wheat,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  Sparkles,
  Scale,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAgro } from "@/lib/agro-store";
import { formatMoney } from "@/lib/agro-data";
import {
  initialChacoConfig,
  initialParcelPlans,
  initialPlanterCampaign,
  defaultSeedTreatmentFormulas,
  calculateCleanChaco,
  calculatePlantingDensity,
  calculateSeedTreatment,
  calculatePlanterCampaign,
  type ChacoLimpioConfig,
  type ParcelPlan,
  type PlanterCampaignParams,
  type SeedTreatmentProduct,
} from "@/lib/agro-chaco-seeding";

export function ChacoSeedingCalculator() {
  const store = useAgro();
  const [activeTab, setActiveTab] = useState<"chaco" | "veneno" | "sembradora">("chaco");

  // ESTADO DEL CHACO LIMPIO
  const [chacoConfig, setChacoConfig] = useState<ChacoLimpioConfig>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("agroadmin_chaco_config_v1");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return initialChacoConfig;
  });

  // ESTADO DE PARCELAS DE SIEMBRA
  const [parcels, setParcels] = useState<ParcelPlan[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("agroadmin_parcel_plans_v1");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return initialParcelPlans;
  });

  // ESTADO DE PRODUCTOS DE VENENO DE SEMILLAS (CURASEMILLAS)
  const [selectedCropTreatment, setSelectedCropTreatment] = useState<string>("Soya");
  const [treatmentProducts, setTreatmentProducts] = useState<SeedTreatmentProduct[]>(
    defaultSeedTreatmentFormulas["Soya"] ?? [],
  );

  // ESTADO DE LA SEMBRADORA COMPRADA POR CAMPAÑA
  const [planter, setPlanter] = useState<PlanterCampaignParams>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("agroadmin_planter_campaign_v1");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return initialPlanterCampaign;
  });

  // Cálculo del chaco limpio
  const cleanChacoResult = calculateCleanChaco(
    chacoConfig.totalHectares,
    chacoConfig.windbreakPercent,
  );

  // Cálculos de siembra por parcela
  const parcelResults = parcels.map((p) => calculatePlantingDensity(p));
  const totalCleanHaPlanned = parcels.reduce((acc, p) => acc + p.cleanHectares, 0);
  const totalSeedKgAllParcels = parcelResults.reduce((acc, r) => acc + r.totalKgRequired, 0);
  const totalBags40kgAllParcels = parcelResults.reduce((acc, r) => acc + r.commercialBags40kg, 0);

  // Cálculo de veneno de semillas
  const seedTreatmentResult = calculateSeedTreatment(
    totalSeedKgAllParcels,
    totalCleanHaPlanned > 0 ? totalCleanHaPlanned : cleanChacoResult.cleanHectares,
    treatmentProducts,
    store.exchangeRate,
  );

  // Cálculo de amortización y capacidad de sembradora
  const planterResult = calculatePlanterCampaign(
    {
      ...planter,
      cleanChacoTargetHa: totalCleanHaPlanned > 0 ? totalCleanHaPlanned : cleanChacoResult.cleanHectares,
    },
    store.exchangeRate,
  );

  // Guardar en localStorage
  const handleSaveChaco = (newCfg: ChacoLimpioConfig) => {
    setChacoConfig(newCfg);
    if (typeof window !== "undefined") {
      localStorage.setItem("agroadmin_chaco_config_v1", JSON.stringify(newCfg));
    }
  };

  const handleSaveParcels = (newParcels: ParcelPlan[]) => {
    setParcels(newParcels);
    if (typeof window !== "undefined") {
      localStorage.setItem("agroadmin_parcel_plans_v1", JSON.stringify(newParcels));
    }
  };

  const handleSavePlanter = (newPlanter: PlanterCampaignParams) => {
    setPlanter(newPlanter);
    if (typeof window !== "undefined") {
      localStorage.setItem("agroadmin_planter_campaign_v1", JSON.stringify(newPlanter));
    }
  };

  // Agregar nueva parcela
  const handleAddParcel = () => {
    const newP: ParcelPlan = {
      id: `par-${Date.now()}`,
      name: `Parcela Lote ${parcels.length + 1}`,
      cleanHectares: 50,
      crop: "Soya",
      plannedSowingDate: new Date().toISOString().slice(0, 10),
      rowSpacingCm: 45,
      seedsPerMeter: 14,
      seedWeight1000g: 155,
      germinationRatePercent: 90,
      purityPercent: 99,
      fieldLossFactorPercent: 6,
    };
    const updated = [...parcels, newP];
    handleSaveParcels(updated);
    toast.success("Nueva parcela de siembra agregada");
  };

  const handleRemoveParcel = (id: string) => {
    const updated = parcels.filter((p) => p.id !== id);
    handleSaveParcels(updated);
    toast.info("Parcela eliminada");
  };

  const handleUpdateParcel = (id: string, field: keyof ParcelPlan, value: any) => {
    const updated = parcels.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    handleSaveParcels(updated);
  };

  const handleUpdateProductDose = (idx: number, dose: number) => {
    const updated = [...treatmentProducts];
    if (updated[idx]) {
      updated[idx] = { ...updated[idx], doseMlPer100kg: dose };
      setTreatmentProducts(updated);
    }
  };

  const handleUpdateProductPrice = (idx: number, priceBs: number) => {
    const updated = [...treatmentProducts];
    if (updated[idx]) {
      updated[idx] = { ...updated[idx], pricePerLiterBs: priceBs };
      setTreatmentProducts(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de Pestañas Superiores */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-card/60 backdrop-blur border rounded-xl">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("chaco")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "chaco"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Layers className="size-4" />
            <span>Chaco Limpio & Parcelas de Siembra</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("veneno")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "veneno"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <FlaskConical className="size-4 text-emerald-300" />
            <span>Calculadora Veneno de Semillas (Curasemillas)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sembradora")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "sembradora"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Tractor className="size-4 text-amber-300" />
            <span>Sembradora por Campaña & Capacidad</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground pr-2 font-mono">
          <span>Estancia San José</span>
          <span>·</span>
          <span className="text-emerald-500 font-semibold">{cleanChacoResult.cleanHectares} ha Limpias</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: CHACO LIMPIO & SUBDIVISIÓN EN PARCELAS                         */}
      {/* ========================================================================= */}
      {activeTab === "chaco" && (
        <div className="space-y-6">
          {/* Header de Configuración del Chaco Limpio */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-card via-card to-emerald-950/20 border shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
                  <Sprout className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    División Territorial: Superficie Total vs Chaco Limpio
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Descuento reglamentario de cortinas rompeviento, cañadas y reserva forestal (Norma ABT Bolivia).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Tipo de Cambio:</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted">
                  Bs {store.exchangeRate.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Inputs de Configuración del Chaco */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Superficie Total del Predio (ha)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={chacoConfig.totalHectares}
                    onChange={(e) =>
                      handleSaveChaco({
                        ...chacoConfig,
                        totalHectares: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-background border focus:border-primary text-sm font-bold num"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">
                    ha
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Cortinas Rompeviento / Reserva (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={chacoConfig.windbreakPercent}
                    onChange={(e) =>
                      handleSaveChaco({
                        ...chacoConfig,
                        windbreakPercent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-background border focus:border-primary text-sm font-bold num"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">
                    %
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Chaco Limpio Cultivable
                  </p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display num">
                    {cleanChacoResult.cleanHectares}{" "}
                    <span className="text-xs font-bold text-muted-foreground">ha netas</span>
                  </p>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  <p>Reserva: {cleanChacoResult.reserveHectares} ha</p>
                  <p className="text-emerald-500 font-semibold">100% Apta Siembra</p>
                </div>
              </div>
            </div>

            {/* Barra Visual de Ocupación */}
            <div className="mt-4 pt-3 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5 font-medium">
                <span>
                  Parcelas Planificadas: <b>{totalCleanHaPlanned.toFixed(1)} ha</b> de{" "}
                  <b>{cleanChacoResult.cleanHectares} ha</b>
                </span>
                <span>
                  {Math.round((totalCleanHaPlanned / cleanChacoResult.cleanHectares) * 100)}% del Chaco Limpio
                </span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (totalCleanHaPlanned / cleanChacoResult.cleanHectares) * 100,
                    )}%`,
                  }}
                  title="Superficie parcelada"
                />
              </div>
            </div>
          </div>

          {/* Listado de Parcelas y Cálculo de Siembra */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Wheat className="size-4 text-primary" />
                  <span>Parcelas de Siembra & Población de Semillas</span>
                </h4>
                <p className="text-xs text-muted-foreground">
                  Cálculo agronómico: semillas por metro, distancia entre líneas (45/52 cm), PMG y requerimiento de bolsas.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddParcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-sm w-fit"
              >
                <Plus className="size-3.5" />
                <span>Agregar Parcela de Siembra</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {parcels.map((p, idx) => {
                const calc = parcelResults[idx] || calculatePlantingDensity(p);

                return (
                  <div
                    key={p.id}
                    className="p-4 sm:p-5 rounded-2xl bg-card border hover:border-primary/40 transition-all space-y-4 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                      <div className="flex items-center gap-3">
                        <span className="size-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => handleUpdateParcel(p.id, "name", e.target.value)}
                          className="font-bold text-sm bg-transparent border-b border-dashed border-border focus:border-primary outline-none text-foreground min-w-[200px]"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={p.crop}
                          onChange={(e) => handleUpdateParcel(p.id, "crop", e.target.value)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-muted border text-foreground outline-none"
                        >
                          <option value="Soya">Soya</option>
                          <option value="Maíz">Maíz</option>
                          <option value="Sorgo">Sorgo</option>
                          <option value="Girasol">Girasol</option>
                          <option value="Trigo">Trigo</option>
                          <option value="Chía">Chía</option>
                          <option value="Sésamo">Sésamo</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveParcel(p.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Eliminar parcela"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* Fila de Parámetros Agronómicos */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Chaco Limpio</span>
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            min="1"
                            step="0.5"
                            value={p.cleanHectares}
                            onChange={(e) =>
                              handleUpdateParcel(p.id, "cleanHectares", parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 rounded bg-muted border font-bold text-foreground num"
                          />
                          <span className="text-muted-foreground font-medium">ha</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground block text-[11px]">Distancia Surcos</span>
                        <select
                          value={p.rowSpacingCm}
                          onChange={(e) =>
                            handleUpdateParcel(p.id, "rowSpacingCm", parseFloat(e.target.value) || 45)
                          }
                          className="w-full px-2 py-1 mt-1 rounded bg-muted border font-bold text-foreground"
                        >
                          <option value={45}>45 cm (Soya)</option>
                          <option value={50}>50 cm (Soya/Maíz)</option>
                          <option value={52}>52 cm (Maíz/Girasol)</option>
                          <option value={70}>70 cm (Tradicional)</option>
                          <option value={17.5}>17.5 cm (Trigo fino)</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-muted-foreground block text-[11px]">Semillas / Metro</span>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          value={p.seedsPerMeter}
                          onChange={(e) =>
                            handleUpdateParcel(p.id, "seedsPerMeter", parseFloat(e.target.value) || 1)
                          }
                          className="w-full px-2 py-1 mt-1 rounded bg-muted border font-bold text-foreground num"
                        />
                      </div>

                      <div>
                        <span className="text-muted-foreground block text-[11px]">PMG (1.000 sem.)</span>
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            step="1"
                            value={p.seedWeight1000g}
                            onChange={(e) =>
                              handleUpdateParcel(p.id, "seedWeight1000g", parseFloat(e.target.value) || 100)
                            }
                            className="w-full px-2 py-1 rounded bg-muted border font-bold text-foreground num"
                          />
                          <span className="text-muted-foreground font-medium">g</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground block text-[11px]">Poder Germ. (PG)</span>
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            min="50"
                            max="100"
                            value={p.germinationRatePercent}
                            onChange={(e) =>
                              handleUpdateParcel(
                                p.id,
                                "germinationRatePercent",
                                parseFloat(e.target.value) || 90,
                              )
                            }
                            className="w-full px-2 py-1 rounded bg-muted border font-bold text-foreground num"
                          />
                          <span className="text-muted-foreground font-medium">%</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground block text-[11px]">Fecha Siembra</span>
                        <input
                          type="date"
                          value={p.plannedSowingDate}
                          onChange={(e) => handleUpdateParcel(p.id, "plannedSowingDate", e.target.value)}
                          className="w-full px-2 py-1 mt-1 rounded bg-muted border font-semibold text-foreground text-[11px]"
                        />
                      </div>
                    </div>

                    {/* Resumen Calculado en Tiempo Real para esta Parcela */}
                    <div className="p-3 rounded-xl bg-muted/40 border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Población Objetivo:</span>
                        <span className="text-sm font-bold text-foreground num">
                          {calc.viablePlantsPerHa.toLocaleString()} plantas/ha
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground text-[11px] block">Dosis Semilla / ha:</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 num">
                          {calc.kgPerHectare} kg/ha
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground text-[11px] block">Semilla Total Parcela:</span>
                        <span className="text-sm font-bold text-foreground num">
                          {calc.totalKgRequired.toLocaleString()} kg
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground text-[11px] block">Bolsas Necesarias:</span>
                        <span className="text-sm font-bold text-foreground">
                          {calc.commercialBags40kg} de 40kg{" "}
                          <span className="text-muted-foreground text-[11px]">
                            ({calc.bigBags1000kg} BigBags)
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: CALCULADORA INTELIGENTE DE VENENO DE SEMILLAS (CURASEMILLAS)   */}
      {/* ========================================================================= */}
      {activeTab === "veneno" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-card via-card to-emerald-950/20 border shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <FlaskConical className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Calculadora Inteligente de Veneno de Semillas (Curasemillas)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tratamiento profesional: Fungicida + Insecticida + Inoculante Rhizobium + Bioestimulante Co-Mo + Polímero adherente.
                  </p>
                </div>
              </div>

              {/* Selector de Receta según Cultivo */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Receta:</span>
                <select
                  value={selectedCropTreatment}
                  onChange={(e) => {
                    const c = e.target.value;
                    setSelectedCropTreatment(c);
                    if (defaultSeedTreatmentFormulas[c]) {
                      setTreatmentProducts(defaultSeedTreatmentFormulas[c]!);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-muted border text-foreground"
                >
                  <option value="Soya">Soya (Inoculante + Fungicida + Insecticida)</option>
                  <option value="Maíz">Maíz (Insecticida Cogollero + Enraizante Zinc)</option>
                </select>
              </div>
            </div>

            {/* Resumen Superior del Volumen a Tratar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="p-3 rounded-xl bg-muted/50 border">
                <span className="text-[11px] text-muted-foreground block">Semilla a Tratar</span>
                <p className="text-lg font-black text-foreground num">
                  {totalSeedKgAllParcels.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-muted-foreground">kg ({totalBags40kgAllParcels} bolsas)</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 border">
                <span className="text-[11px] text-muted-foreground block">Hectáreas de Chaco Limpio</span>
                <p className="text-lg font-black text-foreground num">
                  {totalCleanHaPlanned.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">ha netas</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                  Costo Veneno / ha
                </span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-display num">
                  ${seedTreatmentResult.costPerHaUsd.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (Bs {seedTreatmentResult.costPerHaBs.toFixed(2)})
                  </span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                <span className="text-[11px] text-primary font-semibold block">Costo Total Curasemillas</span>
                <p className="text-lg font-black text-primary font-display num">
                  ${seedTreatmentResult.totalCostUsd.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (Bs {seedTreatmentResult.totalCostBs.toLocaleString()})
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de Productos del Veneno / Curasemillas */}
          <div className="p-5 rounded-2xl bg-card border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="size-4 text-emerald-500" />
                <span>Dosificación y Mezcla de Productos por cada 100 kg de Semilla</span>
              </h4>
              <span className="text-xs text-muted-foreground">
                Volumen de Caldo: <b>{seedTreatmentResult.totalSlurryLiters} Litros Totales</b>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/70 text-muted-foreground font-semibold border-b">
                  <tr>
                    <th className="p-2.5">Componente / Producto</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Dosis / 100 kg</th>
                    <th className="p-2.5">Precio (Bs/L)</th>
                    <th className="p-2.5 text-right">Litros Necesarios</th>
                    <th className="p-2.5 text-right">Inversión (Bs)</th>
                    <th className="p-2.5 text-right">Inversión (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {treatmentProducts.map((prod, idx) => {
                    const liters = (prod.doseMlPer100kg * (totalSeedKgAllParcels / 100)) / 1000;
                    const costBs = liters * prod.pricePerLiterBs;
                    const costUsd = costBs / store.exchangeRate;

                    return (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="p-2.5 font-bold text-foreground">
                          {prod.name}
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            {prod.activeIngredient}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted border">
                            {prod.type}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1 w-24">
                            <input
                              type="number"
                              min="0"
                              value={prod.doseMlPer100kg}
                              onChange={(e) =>
                                handleUpdateProductDose(idx, parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1 rounded bg-muted border text-xs font-bold text-foreground num"
                            />
                            <span className="text-muted-foreground text-[10px]">ml</span>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1 w-24">
                            <span className="text-muted-foreground text-[10px]">Bs</span>
                            <input
                              type="number"
                              min="0"
                              value={prod.pricePerLiterBs}
                              onChange={(e) =>
                                handleUpdateProductPrice(idx, parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1 rounded bg-muted border text-xs font-bold text-foreground num"
                            />
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-foreground">
                          {liters.toFixed(2)} L
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-foreground">
                          Bs {costBs.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ${costUsd.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Receta Técnica Resumen */}
            <div className="p-3 rounded-xl bg-muted/40 border text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Info className="size-4 text-primary" />
                Costo Curasemillas por Bolsa de 40 kg:{" "}
                <b className="text-foreground">
                  Bs {(seedTreatmentResult.costPer100kgBs * 0.4).toFixed(2)} ($
                  {((seedTreatmentResult.costPer100kgBs * 0.4) / store.exchangeRate).toFixed(2)} USD)
                </b>
              </span>
              <button
                type="button"
                onClick={() => {
                  toast.success("Receta de veneno de semillas lista para bodega", {
                    description: `Total a despachar: ${seedTreatmentResult.totalSlurryLiters} L de caldo para ${totalSeedKgAllParcels} kg de semilla.`,
                  });
                }}
                className="text-xs font-semibold text-primary hover:underline w-fit"
              >
                Copiar Orden de Tratamiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: SEMBRADORA COMPRADA POR CAMPAÑA & CAPACIDAD                    */}
      {/* ========================================================================= */}
      {activeTab === "sembradora" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-card via-card to-amber-950/20 border shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Tractor className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Sembradora Adquirida por Campaña & Capacidad de Labor
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Cálculo de amortización por hectárea sembrada en chaco limpio, rendimiento (ha/día) y días de siembra.
                  </p>
                </div>
              </div>

              <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400">
                Ancho de Labor: {planterResult.workingWidthMeters} metros
              </div>
            </div>

            {/* Parámetros de la Sembradora */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Modelo Sembradora</label>
                <input
                  type="text"
                  value={planter.model}
                  onChange={(e) => handleSavePlanter({ ...planter, model: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border text-xs font-bold text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Precio Compra ($ USD)</label>
                <input
                  type="number"
                  min="1000"
                  value={planter.purchasePriceUsd}
                  onChange={(e) =>
                    handleSavePlanter({
                      ...planter,
                      purchasePriceUsd: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-background border text-sm font-bold text-foreground num"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Valor Residual ($ USD)</label>
                <input
                  type="number"
                  min="0"
                  value={planter.residualValueUsd}
                  onChange={(e) =>
                    handleSavePlanter({
                      ...planter,
                      residualValueUsd: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-background border text-sm font-bold text-foreground num"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Vida Útil (Campañas)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={planter.usefulCampaigns}
                  onChange={(e) =>
                    handleSavePlanter({
                      ...planter,
                      usefulCampaigns: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-background border text-sm font-bold text-foreground num"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Líneas / Cuerpos</label>
                <input
                  type="number"
                  min="1"
                  value={planter.rowsCount}
                  onChange={(e) =>
                    handleSavePlanter({
                      ...planter,
                      rowsCount: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-background border text-sm font-bold text-foreground num"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Espaciamiento (cm)</label>
                <select
                  value={planter.rowSpacingCm}
                  onChange={(e) =>
                    handleSavePlanter({
                      ...planter,
                      rowSpacingCm: parseFloat(e.target.value) || 45,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-background border text-xs font-bold text-foreground"
                >
                  <option value={45}>45 cm</option>
                  <option value={50}>50 cm</option>
                  <option value={52}>52 cm</option>
                  <option value={70}>70 cm</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Velocidad Siembra (km/h)</label>
                <input
                  type="number"
                  step="0.2"
                  min="3"
                  max="12"
                  value={planter.sowingSpeedKmH}
                  onChange={(e) =>
                    handleSavePlanter({
                      ...planter,
                      sowingSpeedKmH: parseFloat(e.target.value) || 6.5,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-background border text-sm font-bold text-foreground num"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Jornada Diaria (horas)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={planter.operatingHoursPerDay}
                  onChange={(e) =>
                    handleSavePlanter({
                      ...planter,
                      operatingHoursPerDay: parseFloat(e.target.value) || 12,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-background border text-sm font-bold text-foreground num"
                />
              </div>
            </div>
          </div>

          {/* Tarjetas de Resultados de Amortización y Desempeño */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Amortización por Campaña
              </span>
              <p className="text-2xl font-black text-amber-500 font-display num">
                ${planterResult.amortizationPerCampaignUsd.toLocaleString()}{" "}
                <span className="text-xs font-normal text-muted-foreground">USD</span>
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                Bs {planterResult.amortizationPerCampaignBs.toLocaleString()} / campaña
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Costo Amortización / ha
              </span>
              <p className="text-2xl font-black text-foreground font-display num">
                ${planterResult.amortizationCostPerHaUsd.toFixed(2)}{" "}
                <span className="text-xs font-normal text-muted-foreground">USD/ha</span>
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                Bs {planterResult.amortizationCostPerHaBs.toFixed(2)} por hectárea sembrada
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Rendimiento de Siembra
              </span>
              <p className="text-2xl font-black text-emerald-500 font-display num">
                {planterResult.capacityHaPerDay}{" "}
                <span className="text-xs font-normal text-muted-foreground">ha / día</span>
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {planterResult.capacityHaPerHour} ha/hora efectiva ({planter.operatingHoursPerDay}h jornada)
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Días de Siembra Requeridos
              </span>
              <p className="text-2xl font-black text-primary font-display num">
                {planterResult.daysRequiredToPlant}{" "}
                <span className="text-xs font-normal text-muted-foreground">días continuos</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Para culminar {totalCleanHaPlanned > 0 ? totalCleanHaPlanned : cleanChacoResult.cleanHectares} ha de chaco limpio
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
