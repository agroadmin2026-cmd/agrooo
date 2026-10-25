import { describe, it, expect } from "vitest";
import {
  calculateCleanChaco,
  calculatePlantingDensity,
  calculateSeedTreatment,
  calculatePlanterCampaign,
  computeHarvesterDiagnostic,
  defaultSeedTreatmentFormulas,
  type ParcelPlan,
  type PlanterCampaignParams,
  type HarvesterStateParams,
} from "@/lib/agro-chaco-seeding";

describe("Módulo Agro-Chaco Limpio, Siembra, Veneno de Semillas y Cosechadora", () => {
  it("calcula las hectáreas de chaco limpio descontando cortinas rompeviento y reserva forestal", () => {
    const res = calculateCleanChaco(674, 15);
    expect(res.cleanHectares).toBe(572.9);
    expect(res.reserveHectares).toBe(101.1);

    // Caso borde: 0 ha
    const zero = calculateCleanChaco(0, 15);
    expect(zero.cleanHectares).toBe(0);
    expect(zero.reserveHectares).toBe(0);
  });

  it("calcula la densidad de siembra, población de plantas y kilos de semilla por hectárea", () => {
    const parcel: ParcelPlan = {
      id: "test-p1",
      name: "Parcela Test Soya",
      cleanHectares: 100,
      crop: "Soya",
      plannedSowingDate: "2026-11-20",
      rowSpacingCm: 45, // 0.45 m -> 22.222 m lineales / ha
      seedsPerMeter: 14,
      seedWeight1000g: 155, // PMG 155g
      germinationRatePercent: 90,
      purityPercent: 99,
      fieldLossFactorPercent: 5,
    };

    const res = calculatePlantingDensity(parcel);
    expect(res.linearMetersPerHa).toBe(22222);
    expect(res.seedsPerHectare).toBe(311108);
    // Plantas logradas deben ser menores a las semillas por merma y germinación
    expect(res.viablePlantsPerHa).toBeLessThan(res.seedsPerHectare);
    expect(res.viablePlantsPerHa).toBeGreaterThan(250000);
    // Kilos por hectárea aprox 48 kg/ha
    expect(res.kgPerHectare).toBeCloseTo(48.2, 1);
    expect(res.totalKgRequired).toBe(4820);
    expect(res.commercialBags40kg).toBe(121);
    expect(res.bigBags1000kg).toBe(4.8);
  });

  it("calcula de forma inteligente el veneno de semilla (curasemillas, inoculante, fungicida)", () => {
    const soyaProducts = defaultSeedTreatmentFormulas["Soya"]!;
    const totalSeedKg = 4820; // 48.2 quintales de 100kg
    const cleanHa = 100;
    const exchangeRate = 6.96;

    const res = calculateSeedTreatment(totalSeedKg, cleanHa, soyaProducts, exchangeRate);

    // Debe calcular litros de fungicida, insecticida, etc.
    expect(res.fungicideRequiredLiters).toBeGreaterThan(4);
    expect(res.insecticideRequiredLiters).toBeGreaterThan(5);
    expect(res.inoculantRequiredLiters).toBeGreaterThan(9);
    expect(res.totalCostBs).toBeGreaterThan(0);
    expect(res.totalCostUsd).toBeGreaterThan(0);
    expect(res.costPerHaUsd).toBeGreaterThan(0);
    expect(res.costPer100kgBs).toBeGreaterThan(0);
    expect(res.totalSlurryLiters).toBeGreaterThan(0);
  });

  it("calcula la amortización de sembradora por campaña y su capacidad de labor diaria", () => {
    const params: PlanterCampaignParams = {
      model: "John Deere 1745",
      brand: "John Deere",
      purchasePriceUsd: 78000,
      residualValueUsd: 22000,
      usefulCampaigns: 8,
      rowsCount: 24,
      rowSpacingCm: 45, // 24 * 0.45 = 10.8 m de ancho de labor
      sowingSpeedKmH: 6.8,
      fieldEfficiencyPercent: 76,
      operatingHoursPerDay: 12,
      cleanChacoTargetHa: 572.9,
    };

    const res = calculatePlanterCampaign(params, 6.96);

    expect(res.workingWidthMeters).toBe(10.8);
    // Amortización total = 78000 - 22000 = 56000 USD
    expect(res.amortizationTotalUsd).toBe(56000);
    // Amortización por campaña = 56000 / 8 = 7000 USD
    expect(res.amortizationPerCampaignUsd).toBe(7000);
    // Amortización por hectárea sembrada = 7000 / 572.9 = ~12.22 USD/ha
    expect(res.amortizationCostPerHaUsd).toBeCloseTo(12.22, 1);

    // Capacidad de trabajo: 10.8m * 6.8km/h * 0.76 / 10 = ~5.58 ha/h
    expect(res.capacityHaPerHour).toBeCloseTo(5.58, 1);
    // En 12 horas: ~67 ha/día
    expect(res.capacityHaPerDay).toBeGreaterThan(60);
    // Días requeridos para 572.9 ha: ~8.6 días
    expect(res.daysRequiredToPlant).toBeLessThan(10);
    expect(res.daysRequiredToPlant).toBeGreaterThan(7);
  });

  it("calcula con precisión el estado de la cosechadora, horas de filtro recién cambiado y observaciones", () => {
    const harvester: HarvesterStateParams = {
      id: "m3",
      name: "Case Axial-Flow 8250",
      model: "8250 Draper 40ft",
      currentEngineHours: 1980,
      currentRotorHours: 1420,
      currentKm: 4850,
      lastOilFilterChangeHours: 1820, // Cambiado hace 160h
      oilFilterIntervalHours: 250,
      lastFuelFiltersChangeHours: 1650,
      fuelFilterIntervalHours: 500,
      lastAirFilterChangeHours: 1450,
      lastAirFilterBlowCleanHours: 1968,
      airRestrictionGaugePercent: 35,
      raspBarsWearPercent: 30,
      cutterBarKnifeWearPercent: 42,
      concavesWearPercent: 25,
      observations: [
        {
          id: "obs-1",
          date: "2026-10-22",
          engineHoursAtLog: 1980,
          component: "Motor / Filtro de Aceite",
          severity: "Normal",
          description: "Filtro de aceite recién cambiado a las 1820h. Nivel óptimo.",
          inspectorName: "Pedro Salazar",
        },
      ],
    };

    const diag = computeHarvesterDiagnostic(harvester);
    // Horas desde el cambio = 1980 - 1820 = 160h
    expect(diag.hoursSinceOilChange).toBe(160);
    // Horas restantes = 250 - 160 = 90h
    expect(diag.hoursRemainingOilFilter).toBe(90);
    expect(diag.oilFilterLifePercent).toBe(36); // 90 / 250 = 36%
    expect(diag.oilFilterStatus).toBe("Óptimo");
    expect(diag.overallHarvestReadinessScore).toBeGreaterThan(80);

    // Caso de advertencia: si el filtro de aceite tiene 235 horas de uso (quedan 15h)
    const harvesterNearService: HarvesterStateParams = {
      ...harvester,
      lastOilFilterChangeHours: 1745, // 1980 - 1745 = 235h usadas, quedan 15h
    };
    const diagWarn = computeHarvesterDiagnostic(harvesterNearService);
    expect(diagWarn.hoursRemainingOilFilter).toBe(15);
    expect(diagWarn.oilFilterStatus).toBe("Atención próxima");
    expect(diagWarn.oilFilterAlert).toContain("Próximo cambio requerido");

    // Caso crítico: filtro vencido (260h transcurridas)
    const harvesterExpired: HarvesterStateParams = {
      ...harvester,
      lastOilFilterChangeHours: 1700, // 280h usadas
    };
    const diagExp = computeHarvesterDiagnostic(harvesterExpired);
    expect(diagExp.hoursRemainingOilFilter).toBe(0);
    expect(diagExp.oilFilterStatus).toBe("Cambio urgente");
    expect(diagExp.oilFilterAlert).toContain("vencido");
  });
});
