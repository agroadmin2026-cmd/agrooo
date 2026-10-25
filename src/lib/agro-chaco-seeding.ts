/**
 * MÓDULO AGRO-CHACO: SUBDIVISIÓN DE CHACO LIMPIO, PLANIFICACIÓN DE SIEMBRA,
 * CALCULADORA INTELIGENTE DE VENENO DE SEMILLAS (CURASEMILLAS),
 * AMORTIZACIÓN DE SEMBRADORA POR CAMPAÑA Y TELEMETRÍA PREDICTIVA DE COSECHADORAS.
 * 
 * Diseñado bajo estándares de ingeniería agronómica de precisión para Bolivia
 * (Santa Cruz, Tierras Bajas del Este, Pailón, Cuatro Cañadas, San Pedro y Chaco).
 */

// ---------------------------------------------------------------------------
// 1. CHACO LIMPIO Y SUBDIVISIÓN EN PARCELAS
// ---------------------------------------------------------------------------

export interface ChacoLimpioConfig {
  totalHectares: number; // Superficie total del predio / chaco
  windbreakPercent: number; // Porcentaje de cortinas rompeviento, cañadas y reserva forestal (ej. 15%)
  cleanHectares: number; // Hectáreas netas de chaco limpio cultivable
  estanciaName: string;
  location: string;
}

export interface ParcelPlan {
  id: string;
  name: string; // ej. "Parcela Norte 1", "Franja Centro A"
  cleanHectares: number; // Hectáreas asignadas a esta parcela
  crop: "Soya" | "Maíz" | "Sorgo" | "Girasol" | "Trigo" | "Chía" | "Sésamo";
  plannedSowingDate: string; // YYYY-MM-DD
  rowSpacingCm: number; // Distancia entre hileras (45, 50, 52, 70 cm)
  seedsPerMeter: number; // Densidad de siembra en semillas por metro lineal
  seedWeight1000g: number; // Peso de Mil Granos (PMG en gramos)
  germinationRatePercent: number; // Poder Germinativo (PG %) ej. 90%
  purityPercent: number; // Pureza de la semilla % ej. 99%
  fieldLossFactorPercent: number; // Merma por estrés de suelo / campo % ej. 5%
}

export interface PlantingCalculationResult {
  parcelId: string;
  parcelName: string;
  cleanHectares: number;
  crop: string;
  linearMetersPerHa: number; // Metros lineales por hectárea
  seedsPerHectare: number; // Semillas teóricas por hectárea
  viablePlantsPerHa: number; // Plantas logradas / población de pie estimada
  kgPerHectare: number; // Kilos de semilla por hectárea
  totalKgRequired: number; // Total de semilla para la parcela (kg)
  commercialBags40kg: number; // Cantidad de bolsas de 40 kg
  bigBags1000kg: number; // Cantidad de Big Bags de 1.000 kg
}

export function calculateCleanChaco(
  totalHectares: number,
  windbreakPercent: number = 15,
): { cleanHectares: number; reserveHectares: number } {
  const safeTotal = Math.max(0, totalHectares);
  const safePercent = Math.min(50, Math.max(0, windbreakPercent));
  const reserveHectares = Math.round((safeTotal * (safePercent / 100)) * 100) / 100;
  const cleanHectares = Math.max(0, Math.round((safeTotal - reserveHectares) * 100) / 100);
  return { cleanHectares, reserveHectares };
}

export function calculatePlantingDensity(
  parcel: ParcelPlan,
): PlantingCalculationResult {
  const rowSpacingM = parcel.rowSpacingCm / 100;
  const linearMetersPerHa = Math.round(10000 / rowSpacingM);
  const theoreticalSeedsPerHa = linearMetersPerHa * parcel.seedsPerMeter;

  // Eficiencia real de implantación = PG% * Pureza% * (1 - Merma)
  const germinationFactor = (parcel.germinationRatePercent / 100) * (parcel.purityPercent / 100);
  const fieldLossFactor = 1 - (parcel.fieldLossFactorPercent / 100);
  const effectiveSurvivalFactor = germinationFactor * fieldLossFactor;

  const viablePlantsPerHa = Math.round(theoreticalSeedsPerHa * effectiveSurvivalFactor);

  // Kilos por hectárea = (Semillas/ha * PMG en gramos) / 1.000.000
  const kgPerHectare = Math.round(((theoreticalSeedsPerHa * parcel.seedWeight1000g) / 1000000) * 10) / 10;
  const totalKgRequired = Math.round(kgPerHectare * parcel.cleanHectares);
  const commercialBags40kg = Math.ceil(totalKgRequired / 40);
  const bigBags1000kg = Math.round((totalKgRequired / 1000) * 10) / 10;

  return {
    parcelId: parcel.id,
    parcelName: parcel.name,
    cleanHectares: parcel.cleanHectares,
    crop: parcel.crop,
    linearMetersPerHa,
    seedsPerHectare: theoreticalSeedsPerHa,
    viablePlantsPerHa,
    kgPerHectare,
    totalKgRequired,
    commercialBags40kg,
    bigBags1000kg,
  };
}

// ---------------------------------------------------------------------------
// 2. CALCULADORA INTELIGENTE DE VENENO DE SEMILLAS (CURASEMILLAS PROFESIONAL)
// ---------------------------------------------------------------------------

export interface SeedTreatmentProduct {
  name: string;
  type: "Fungicida" | "Insecticida" | "Inoculante" | "Bioestimulante Co-Mo" | "Polímero Adherente";
  doseMlPer100kg: number; // Dosis en ml (o gramos) por cada 100 kg de semilla
  pricePerLiterBs: number; // Costo en Bolivianos por litro
  activeIngredient: string;
}

export interface SeedTreatmentCalculation {
  totalSeedKg: number;
  totalHectares: number;
  fungicideRequiredLiters: number;
  fungicideCostBs: number;
  insecticideRequiredLiters: number;
  insecticideCostBs: number;
  inoculantRequiredLiters: number;
  inoculantCostBs: number;
  biostimulantRequiredLiters: number;
  biostimulantCostBs: number;
  polymerRequiredLiters: number;
  polymerCostBs: number;
  slurryVolumeLitersPer100kg: number; // Caldo total de tratamiento por 100 kg (agua + productos)
  totalSlurryLiters: number; // Volumen total de caldo a preparar
  totalCostBs: number;
  totalCostUsd: number;
  costPer100kgBs: number;
  costPer100kgUsd: number;
  costPerHaBs: number;
  costPerHaUsd: number;
}

export const defaultSeedTreatmentFormulas: Record<string, SeedTreatmentProduct[]> = {
  Soya: [
    {
      name: "Maxim XL / Fludioxonil + Metalaxil",
      type: "Fungicida",
      doseMlPer100kg: 100, // 100 ml / 100 kg
      pricePerLiterBs: 280,
      activeIngredient: "Fludioxonil 2.5% + Metalaxil-M 1.0%",
    },
    {
      name: "Cruiser 600 FS / Tiametoxam",
      type: "Insecticida",
      doseMlPer100kg: 120, // 120 ml / 100 kg
      pricePerLiterBs: 340,
      activeIngredient: "Tiametoxam 600 g/L",
    },
    {
      name: "Inoculante Bradyrhizobium Líquido",
      type: "Inoculante",
      doseMlPer100kg: 200, // 200 ml / 100 kg
      pricePerLiterBs: 95,
      activeIngredient: "Bradyrhizobium japonicum (1x10^9 UFC/ml)",
    },
    {
      name: "Bioestimulante Co-Mo (Cobalto + Molibdeno)",
      type: "Bioestimulante Co-Mo",
      doseMlPer100kg: 80, // 80 ml / 100 kg
      pricePerLiterBs: 160,
      activeIngredient: "Molibdeno 15% + Cobalto 1.5%",
    },
    {
      name: "Polímero Micro-Film Rojo Fijador",
      type: "Polímero Adherente",
      doseMlPer100kg: 50,
      pricePerLiterBs: 75,
      activeIngredient: "Polímero fijador de fluidez",
    },
  ],
  Maíz: [
    {
      name: "Maxim Quattro / Tiabendazol + Metalaxil",
      type: "Fungicida",
      doseMlPer100kg: 120,
      pricePerLiterBs: 320,
      activeIngredient: "Azoxistrobina + Metalaxil-M + Fludioxonil",
    },
    {
      name: "Fortenza Duo / Ciantraniliprol + Tiametoxam",
      type: "Insecticida",
      doseMlPer100kg: 250,
      pricePerLiterBs: 580,
      activeIngredient: "Ciantraniliprole 400 + Tiametoxam 200 g/L (Oruga cogollera)",
    },
    {
      name: "Bioestimulante Enraizante Zinc + Auxinas",
      type: "Bioestimulante Co-Mo",
      doseMlPer100kg: 100,
      pricePerLiterBs: 180,
      activeIngredient: "Zinc quelatado 10% + Fitohormonas",
    },
  ],
};

export function calculateSeedTreatment(
  totalSeedKg: number,
  cleanHectares: number,
  products: SeedTreatmentProduct[],
  exchangeRate: number = 6.96,
  carrierWaterMlPer100kg: number = 300, // Agua portadora para caldo de tratamiento
): SeedTreatmentCalculation {
  const quintales100kg = Math.max(0, totalSeedKg) / 100;
  const safeHa = Math.max(0.1, cleanHectares);

  let fungicideRequiredLiters = 0;
  let fungicideCostBs = 0;
  let insecticideRequiredLiters = 0;
  let insecticideCostBs = 0;
  let inoculantRequiredLiters = 0;
  let inoculantCostBs = 0;
  let biostimulantRequiredLiters = 0;
  let biostimulantCostBs = 0;
  let polymerRequiredLiters = 0;
  let polymerCostBs = 0;
  let chemicalVolumeMlPer100kg = 0;

  products.forEach((p) => {
    const litersTotal = (p.doseMlPer100kg * quintales100kg) / 1000;
    const costTotal = litersTotal * p.pricePerLiterBs;
    chemicalVolumeMlPer100kg += p.doseMlPer100kg;

    switch (p.type) {
      case "Fungicida":
        fungicideRequiredLiters += litersTotal;
        fungicideCostBs += costTotal;
        break;
      case "Insecticida":
        insecticideRequiredLiters += litersTotal;
        insecticideCostBs += costTotal;
        break;
      case "Inoculante":
        inoculantRequiredLiters += litersTotal;
        inoculantCostBs += costTotal;
        break;
      case "Bioestimulante Co-Mo":
        biostimulantRequiredLiters += litersTotal;
        biostimulantCostBs += costTotal;
        break;
      case "Polímero Adherente":
        polymerRequiredLiters += litersTotal;
        polymerCostBs += costTotal;
        break;
    }
  });

  const slurryVolumeLitersPer100kg = (chemicalVolumeMlPer100kg + carrierWaterMlPer100kg) / 1000;
  const totalSlurryLiters = Math.round(slurryVolumeLitersPer100kg * quintales100kg * 10) / 10;

  const totalCostBs = Math.round((fungicideCostBs + insecticideCostBs + inoculantCostBs + biostimulantCostBs + polymerCostBs) * 100) / 100;
  const totalCostUsd = Math.round((totalCostBs / exchangeRate) * 100) / 100;

  const costPer100kgBs = quintales100kg > 0 ? Math.round((totalCostBs / quintales100kg) * 100) / 100 : 0;
  const costPer100kgUsd = Math.round((costPer100kgBs / exchangeRate) * 100) / 100;

  const costPerHaBs = Math.round((totalCostBs / safeHa) * 100) / 100;
  const costPerHaUsd = Math.round((totalCostUsd / safeHa) * 100) / 100;

  return {
    totalSeedKg,
    totalHectares: cleanHectares,
    fungicideRequiredLiters: Math.round(fungicideRequiredLiters * 100) / 100,
    fungicideCostBs: Math.round(fungicideCostBs * 100) / 100,
    insecticideRequiredLiters: Math.round(insecticideRequiredLiters * 100) / 100,
    insecticideCostBs: Math.round(insecticideCostBs * 100) / 100,
    inoculantRequiredLiters: Math.round(inoculantRequiredLiters * 100) / 100,
    inoculantCostBs: Math.round(inoculantCostBs * 100) / 100,
    biostimulantRequiredLiters: Math.round(biostimulantRequiredLiters * 100) / 100,
    biostimulantCostBs: Math.round(biostimulantCostBs * 100) / 100,
    polymerRequiredLiters: Math.round(polymerRequiredLiters * 100) / 100,
    polymerCostBs: Math.round(polymerCostBs * 100) / 100,
    slurryVolumeLitersPer100kg: Math.round(slurryVolumeLitersPer100kg * 100) / 100,
    totalSlurryLiters,
    totalCostBs,
    totalCostUsd,
    costPer100kgBs,
    costPer100kgUsd,
    costPerHaBs,
    costPerHaUsd,
  };
}

// ---------------------------------------------------------------------------
// 3. ADQUISICIÓN Y AMORTIZACIÓN DE SEMBRADORA POR CAMPAÑA
// ---------------------------------------------------------------------------

export interface PlanterCampaignParams {
  model: string;
  brand: string;
  purchasePriceUsd: number; // Precio de compra en USD ej. $72.000
  residualValueUsd: number; // Valor residual de reventa ej. $18.000
  usefulCampaigns: number; // Campañas de vida útil estimadas ej. 8 campañas (4 años zafra/zafriña)
  rowsCount: number; // Número de líneas / cuerpos de siembra ej. 24 líneas
  rowSpacingCm: number; // Distanciamiento ej. 45 cm
  sowingSpeedKmH: number; // Velocidad promedio de siembra ej. 6.5 km/h
  fieldEfficiencyPercent: number; // Eficiencia de campo ej. 75%
  operatingHoursPerDay: number; // Jornada de labor diaria ej. 12 horas
  cleanChacoTargetHa: number; // Hectáreas de chaco limpio que sembrará en esta campaña
}

export interface PlanterCampaignResult {
  workingWidthMeters: number; // Ancho de labor en metros (Líneas * Espaciamiento)
  amortizationTotalUsd: number; // Amortización total = Precio - Residual
  amortizationPerCampaignUsd: number; // Depreciación por campaña en USD
  amortizationPerCampaignBs: number; // En Bolivianos
  amortizationCostPerHaUsd: number; // Costo de amortización por hectárea sembrada ($/ha)
  amortizationCostPerHaBs: number;
  capacityHaPerHour: number; // Capacidad de trabajo efectiva (ha/hora)
  capacityHaPerDay: number; // Capacidad de trabajo por jornada (ha/día)
  daysRequiredToPlant: number; // Días de siembra continuos requeridos
}

export function calculatePlanterCampaign(
  params: PlanterCampaignParams,
  exchangeRate: number = 6.96,
): PlanterCampaignResult {
  const workingWidthMeters = Math.round((params.rowsCount * (params.rowSpacingCm / 100)) * 100) / 100;
  const amortizationTotalUsd = Math.max(0, params.purchasePriceUsd - params.residualValueUsd);
  const campaigns = Math.max(1, params.usefulCampaigns);
  const amortizationPerCampaignUsd = Math.round((amortizationTotalUsd / campaigns) * 100) / 100;
  const amortizationPerCampaignBs = Math.round((amortizationPerCampaignUsd * exchangeRate) * 100) / 100;

  const targetHa = Math.max(1, params.cleanChacoTargetHa);
  const amortizationCostPerHaUsd = Math.round((amortizationPerCampaignUsd / targetHa) * 100) / 100;
  const amortizationCostPerHaBs = Math.round((amortizationCostPerHaUsd * exchangeRate) * 100) / 100;

  // Capacidad teórica ha/h = (Ancho * Velocidad * Eficiencia) / 10
  const efficiencyFactor = params.fieldEfficiencyPercent / 100;
  const capacityHaPerHour = Math.round(((workingWidthMeters * params.sowingSpeedKmH * efficiencyFactor) / 10) * 100) / 100;
  const capacityHaPerDay = Math.round((capacityHaPerHour * params.operatingHoursPerDay) * 10) / 10;
  const daysRequiredToPlant = capacityHaPerDay > 0 ? Math.ceil((targetHa / capacityHaPerDay) * 10) / 10 : 0;

  return {
    workingWidthMeters,
    amortizationTotalUsd,
    amortizationPerCampaignUsd,
    amortizationPerCampaignBs,
    amortizationCostPerHaUsd,
    amortizationCostPerHaBs,
    capacityHaPerHour,
    capacityHaPerDay,
    daysRequiredToPlant,
  };
}

// ---------------------------------------------------------------------------
// 4. TELEMETRÍA PREDICTIVA & ESTADO DE COSECHADORAS (FILTROS, KM, OBSERVACIONES)
// ---------------------------------------------------------------------------

export interface HarvesterTechnicalObservation {
  id: string;
  date: string; // YYYY-MM-DD
  engineHoursAtLog: number;
  rotorHoursAtLog?: number | undefined;
  odometerKmAtLog?: number | undefined;
  component:
    | "Motor / Filtro de Aceite"
    | "Filtros de Combustible / Trampa"
    | "Filtros de Aire & Aspiración"
    | "Plataforma de Corte & Cuchillas"
    | "Rotor & Cóncavos de Trilla"
    | "Sinfín & Elevador de Grano"
    | "Sistema Hidrostático & Fugas"
    | "Orugas / Neumáticos & Transmisión";
  severity: "Normal" | "Atención preventiva" | "Crítico (Riesgo de parada en zafra)";
  description: string;
  inspectorName: string;
  photoUrl?: string | undefined;
  isResolved?: boolean | undefined;
}

export interface HarvesterStateParams {
  id: string;
  name: string; // ej. "Case Axial-Flow 8250" o "John Deere S780"
  model: string;
  currentEngineHours: number; // Horómetro actual de motor
  currentRotorHours: number; // Horómetro de trilla
  currentKm?: number | undefined; // Kilometraje de traslado
  // FILTRO DE ACEITE
  lastOilFilterChangeHours: number; // Horómetro en el que recién se cambió el filtro de aceite
  oilFilterIntervalHours?: number | undefined; // Estándar 250 horas
  lastOilFilterChangeKm?: number | undefined; // O en Km si computa trayecto
  oilBrandAndViscosity?: string | undefined; // ej. "15W40 CI-4 Plus / Filtro Original Fleetguard"
  // FILTROS DE COMBUSTIBLE
  lastFuelFiltersChangeHours: number; // Filtro primario decantador y secundario
  fuelFilterIntervalHours?: number | undefined; // Estándar 500 horas
  // FILTRO DE AIRE
  lastAirFilterChangeHours: number; // Horómetro último cambio de cartucho primario
  lastAirFilterBlowCleanHours: number; // Horómetro última limpieza por soplado
  airRestrictionGaugePercent: number; // Indicador de restricción (0% limpio, 100% saturado)
  // ESTADO DE PIEZAS DE TRILLA Y CORTE
  raspBarsWearPercent: number; // Desgaste barras batidoras del rotor (0% nuevo, 100% gastado)
  cutterBarKnifeWearPercent: number; // Desgaste cuchillas de barra de corte (0 a 100%)
  concavesWearPercent: number; // Desgaste cóncavos
  // BITÁCORA DE OBSERVACIONES
  observations: HarvesterTechnicalObservation[];
}

export interface HarvesterHealthDiagnostic {
  machineId: string;
  machineName: string;
  hoursSinceOilChange: number;
  hoursRemainingOilFilter: number;
  oilFilterLifePercent: number; // 100% nuevo -> 0% agotado
  oilFilterStatus: "Óptimo" | "Atención próxima" | "Cambio urgente";
  oilFilterAlert?: string | undefined;
  hoursSinceFuelFiltersChange: number;
  hoursRemainingFuelFilters: number;
  fuelFiltersLifePercent: number;
  fuelFiltersStatus: "Óptimo" | "Atención próxima" | "Cambio urgente";
  airFilterStatus: "Óptimo" | "Requiere sopleteado preventivo" | "Saturado (Riesgo de inyección)";
  threshingWearAveragePercent: number;
  overallHarvestReadinessScore: number; // 0% a 100%
  activeWarningsCount: number;
  criticalAlertsCount: number;
}

export function computeHarvesterDiagnostic(
  h: HarvesterStateParams,
): HarvesterHealthDiagnostic {
  const oilInterval = h.oilFilterIntervalHours ?? 250;
  const hoursSinceOilChange = Math.max(0, h.currentEngineHours - h.lastOilFilterChangeHours);
  const hoursRemainingOilFilter = Math.max(0, oilInterval - hoursSinceOilChange);
  const oilFilterLifePercent = Math.max(
    0,
    Math.min(100, Math.round(((oilInterval - hoursSinceOilChange) / oilInterval) * 100)),
  );

  let oilFilterStatus: HarvesterHealthDiagnostic["oilFilterStatus"] = "Óptimo";
  let oilFilterAlert: string | undefined = undefined;

  if (hoursRemainingOilFilter <= 0) {
    oilFilterStatus = "Cambio urgente";
    oilFilterAlert = `Filtro de aceite vencido por ${hoursSinceOilChange - oilInterval} horas. Peligro de daño en turbo y cigüeñal en plena cosecha.`;
  } else if (hoursRemainingOilFilter <= 40) {
    oilFilterStatus = "Atención próxima";
    oilFilterAlert = `Próximo cambio requerido en ${hoursRemainingOilFilter} horas de motor. Preparar filtros y aceite en el lote.`;
  }

  // Filtros de combustible
  const fuelInterval = h.fuelFilterIntervalHours ?? 500;
  const hoursSinceFuelFiltersChange = Math.max(0, h.currentEngineHours - h.lastFuelFiltersChangeHours);
  const hoursRemainingFuelFilters = Math.max(0, fuelInterval - hoursSinceFuelFiltersChange);
  const fuelFiltersLifePercent = Math.max(
    0,
    Math.min(100, Math.round(((fuelInterval - hoursSinceFuelFiltersChange) / fuelInterval) * 100)),
  );

  let fuelFiltersStatus: HarvesterHealthDiagnostic["fuelFiltersStatus"] = "Óptimo";
  if (hoursRemainingFuelFilters <= 0) {
    fuelFiltersStatus = "Cambio urgente";
  } else if (hoursRemainingFuelFilters <= 60) {
    fuelFiltersStatus = "Atención próxima";
  }

  // Filtro de aire
  let airFilterStatus: HarvesterHealthDiagnostic["airFilterStatus"] = "Óptimo";
  if (h.airRestrictionGaugePercent >= 80) {
    airFilterStatus = "Saturado (Riesgo de inyección)";
  } else if (h.airRestrictionGaugePercent >= 50 || h.currentEngineHours - h.lastAirFilterBlowCleanHours >= 24) {
    airFilterStatus = "Requiere sopleteado preventivo";
  }

  // Desgaste de trilla promedio
  const threshingWearAveragePercent = Math.round(
    (h.raspBarsWearPercent + h.cutterBarKnifeWearPercent + h.concavesWearPercent) / 3,
  );

  // Conteo de observaciones no resueltas
  const criticalObs = h.observations.filter(
    (o) => !o.isResolved && o.severity === "Crítico (Riesgo de parada en zafra)",
  ).length;
  const warningObs = h.observations.filter(
    (o) => !o.isResolved && o.severity === "Atención preventiva",
  ).length;

  // Score general de preparación para zafra (0 - 100%)
  let score = 100;
  if (oilFilterStatus === "Cambio urgente") score -= 30;
  else if (oilFilterStatus === "Atención próxima") score -= 10;

  if (fuelFiltersStatus === "Cambio urgente") score -= 20;
  else if (fuelFiltersStatus === "Atención próxima") score -= 8;

  if (airFilterStatus === "Saturado (Riesgo de inyección)") score -= 15;
  else if (airFilterStatus === "Requiere sopleteado preventivo") score -= 5;

  if (threshingWearAveragePercent > 80) score -= 15;
  else if (threshingWearAveragePercent > 50) score -= 8;

  score -= criticalObs * 25;
  score -= warningObs * 8;
  const overallHarvestReadinessScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    machineId: h.id,
    machineName: h.name,
    hoursSinceOilChange,
    hoursRemainingOilFilter,
    oilFilterLifePercent,
    oilFilterStatus,
    oilFilterAlert,
    hoursSinceFuelFiltersChange,
    hoursRemainingFuelFilters,
    fuelFiltersLifePercent,
    fuelFiltersStatus,
    airFilterStatus,
    threshingWearAveragePercent,
    overallHarvestReadinessScore,
    activeWarningsCount: warningObs + (oilFilterStatus === "Atención próxima" ? 1 : 0),
    criticalAlertsCount: criticalObs + (oilFilterStatus === "Cambio urgente" ? 1 : 0),
  };
}

// ---------------------------------------------------------------------------
// DATOS INICIALES REALISTAS DE COSECHADORAS Y CHACO PARA SANTA CRUZ / BOLIVIA
// ---------------------------------------------------------------------------

export const initialChacoConfig: ChacoLimpioConfig = {
  totalHectares: 674,
  windbreakPercent: 15,
  cleanHectares: 572.9,
  estanciaName: "Estancia San José",
  location: "Pailón / Cuatro Cañadas · Santa Cruz",
};

export const initialParcelPlans: ParcelPlan[] = [
  {
    id: "par-1",
    name: "Parcela Norte A (Chaco Limpio)",
    cleanHectares: 102,
    crop: "Soya",
    plannedSowingDate: "2026-11-15",
    rowSpacingCm: 45,
    seedsPerMeter: 14,
    seedWeight1000g: 155, // 155 g
    germinationRatePercent: 92,
    purityPercent: 99,
    fieldLossFactorPercent: 6,
  },
  {
    id: "par-2",
    name: "Parcela Norte B (Chaco Limpio)",
    cleanHectares: 72.25,
    crop: "Maíz",
    plannedSowingDate: "2026-11-25",
    rowSpacingCm: 52,
    seedsPerMeter: 4.2,
    seedWeight1000g: 310, // 310 g
    germinationRatePercent: 95,
    purityPercent: 99.5,
    fieldLossFactorPercent: 5,
  },
  {
    id: "par-3",
    name: "Parcela La Esperanza (Chaco Limpio)",
    cleanHectares: 178.5,
    crop: "Soya",
    plannedSowingDate: "2026-11-18",
    rowSpacingCm: 45,
    seedsPerMeter: 14.5,
    seedWeight1000g: 160,
    germinationRatePercent: 90,
    purityPercent: 98.5,
    fieldLossFactorPercent: 7,
  },
  {
    id: "par-4",
    name: "Parcela Las Palmeras (Chaco Limpio)",
    cleanHectares: 127.5,
    crop: "Girasol",
    plannedSowingDate: "2026-12-05",
    rowSpacingCm: 52,
    seedsPerMeter: 3.5,
    seedWeight1000g: 58,
    germinationRatePercent: 88,
    purityPercent: 99,
    fieldLossFactorPercent: 6,
  },
  {
    id: "par-5",
    name: "Parcela El Bajío (Chaco Limpio)",
    cleanHectares: 54.4,
    crop: "Sorgo",
    plannedSowingDate: "2026-12-10",
    rowSpacingCm: 45,
    seedsPerMeter: 9.0,
    seedWeight1000g: 32,
    germinationRatePercent: 89,
    purityPercent: 98,
    fieldLossFactorPercent: 6,
  },
  {
    id: "par-6",
    name: "Parcela Río (Chaco Limpio)",
    cleanHectares: 38.25,
    crop: "Trigo",
    plannedSowingDate: "2027-04-20",
    rowSpacingCm: 17.5, // Siembra fina
    seedsPerMeter: 45,
    seedWeight1000g: 38,
    germinationRatePercent: 93,
    purityPercent: 99,
    fieldLossFactorPercent: 5,
  },
];

export const initialPlanterCampaign: PlanterCampaignParams = {
  model: "John Deere 1745 MaxEmerge 5 (Neumática)",
  brand: "John Deere",
  purchasePriceUsd: 78000,
  residualValueUsd: 22000,
  usefulCampaigns: 8,
  rowsCount: 24,
  rowSpacingCm: 45,
  sowingSpeedKmH: 6.8,
  fieldEfficiencyPercent: 76,
  operatingHoursPerDay: 12,
  cleanChacoTargetHa: 572.9,
};

export const initialHarvesterStates: HarvesterStateParams[] = [
  {
    id: "m3",
    name: "Case Axial-Flow 8250 (Trilladora Principal)",
    model: "Axial-Flow 8250 con Plataforma Draper 40 pies",
    currentEngineHours: 1980,
    currentRotorHours: 1420,
    currentKm: 4850,
    lastOilFilterChangeHours: 1820, // Cambiado hace 160h (quedan 90h de vida útil)
    oilFilterIntervalHours: 250,
    lastOilFilterChangeKm: 4200,
    oilBrandAndViscosity: "Akcela No. 1 15W40 + Filtro Fleetguard Doble Flujo",
    lastFuelFiltersChangeHours: 1650,
    fuelFilterIntervalHours: 500,
    lastAirFilterChangeHours: 1450,
    lastAirFilterBlowCleanHours: 1968, // Soplado hace 12h
    airRestrictionGaugePercent: 35,
    raspBarsWearPercent: 30, // 30% desgaste
    cutterBarKnifeWearPercent: 42,
    concavesWearPercent: 25,
    observations: [
      {
        id: "hobs-1",
        date: "2026-10-22",
        engineHoursAtLog: 1980,
        rotorHoursAtLog: 1420,
        odometerKmAtLog: 4850,
        component: "Motor / Filtro de Aceite",
        severity: "Normal",
        description: "Filtro de aceite recién cambiado a las 1.820h. Nivel en varilla máximo, sin fugas en el porta-filtro. Listo para zafra.",
        inspectorName: "Pedro Salazar (Jefe de Taller)",
      },
      {
        id: "hobs-2",
        date: "2026-10-24",
        engineHoursAtLog: 1975,
        rotorHoursAtLog: 1415,
        component: "Plataforma de Corte & Cuchillas",
        severity: "Atención preventiva",
        description: "Se detectó 3 secciones de cuchilla con filo mellado en extremo izquierdo de barra de corte Draper. Reemplazar antes de entrar a soya pesada.",
        inspectorName: "Ramiro Flores (Operador Cosechadora)",
      },
      {
        id: "hobs-3",
        date: "2026-10-18",
        engineHoursAtLog: 1950,
        rotorHoursAtLog: 1390,
        component: "Sinfín & Elevador de Grano",
        severity: "Normal",
        description: "Tensión de cadena de elevador de granos limpios ajustada según manual (deflexión 15 mm). Sensores de pérdida calibrados.",
        inspectorName: "Pedro Salazar",
      },
    ],
  },
  {
    id: "m6",
    name: "John Deere S780 (Trilladora Apoyo Zafra)",
    model: "S780 Rotor TriStream con Cabezal 640FD",
    currentEngineHours: 1150,
    currentRotorHours: 810,
    currentKm: 2780,
    lastOilFilterChangeHours: 920, // Cambiado a las 920h -> van 230h transcurridas! Quedan solo 20h!
    oilFilterIntervalHours: 250,
    lastOilFilterChangeKm: 2100,
    oilBrandAndViscosity: "John Deere Plus-50 II 15W40 + Filtro Original JD",
    lastFuelFiltersChangeHours: 700,
    fuelFilterIntervalHours: 500,
    lastAirFilterChangeHours: 600,
    lastAirFilterBlowCleanHours: 1140,
    airRestrictionGaugePercent: 48,
    raspBarsWearPercent: 18,
    cutterBarKnifeWearPercent: 22,
    concavesWearPercent: 15,
    observations: [
      {
        id: "hobs-4",
        date: "2026-10-24",
        engineHoursAtLog: 1150,
        component: "Motor / Filtro de Aceite",
        severity: "Atención preventiva",
        description: "Filtro de aceite cumpliendo 230 horas de servicio. Se programó recambio preventivo en 20 horas de motor con aceite Plus-50 II y filtros de stock.",
        inspectorName: "Pedro Salazar",
      },
    ],
  },
];
