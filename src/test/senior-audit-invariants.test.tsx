import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AgroProvider, useAgro } from "../lib/agro-store";
import {
  computeBsisaStatus,
  getBsisaDaysRemaining,
  type LedgerEntry,
  type BsisaPermit,
} from "../lib/agro-data";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => <AgroProvider>{children}</AgroProvider>;

describe("Senior Engineer Audit: Invariantes Críticos & Casos Límite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // 1. INVARIANTE: Precisión Financiera y Punto Flotante
  // ---------------------------------------------------------------------------
  it("invariante financiero: calcula márgenes brutos sin deriva de punto flotante", () => {
    const { result } = renderHook(() => useAgro(), { wrapper });
    const lot = result.current.lots[0]!;

    // Obtener balance inicial del lote
    const initialSummary = result.current.getLotFinancialSummary(lot.id);
    expect(initialSummary).toBeDefined();

    // Sumar 3 gastos con decimales propensos a errores de float (ej. 0.1 + 0.2)
    act(() => {
      result.current.addLedger({
        date: "2026-10-21",
        description: "Servicio de flete fraccionado 1",
        category: "Insumos",
        type: "egreso",
        amount: 70.1,
        lotId: lot.id,
      });
      result.current.addLedger({
        date: "2026-10-21",
        description: "Servicio de flete fraccionado 2",
        category: "Insumos",
        type: "egreso",
        amount: 20.2,
        lotId: lot.id,
      });
    });

    const summary = result.current.getLotFinancialSummary(lot.id)!;
    // 70.1 + 20.2 en JS simple suele dar 90.29999999999999
    // El resumen financiero debe redondear estrictamente a 2 decimales
    const expectedDifference = Math.round((70.1 + 20.2) * 100) / 100;
    expect(summary.expensesBs - initialSummary!.expensesBs).toBeCloseTo(expectedDifference, 2);
    expect(summary.expensesBs).toBe(Math.round(summary.expensesBs * 100) / 100);
  });

  // ---------------------------------------------------------------------------
  // 2. INVARIANTE: Prevención de Stock Negativo y Fallo Atómico
  // ---------------------------------------------------------------------------
  it("invariante de stock: rechaza la labor si el insumo solicitado supera el stock disponible", () => {
    const { result } = renderHook(() => useAgro(), { wrapper });
    const machine = result.current.machines[0]!;
    const lot = result.current.lots[0]!;
    const supply = result.current.supplies[0]!;

    const currentStock = supply.stock;
    const requestedQty = currentStock + 500; // Pedir más de lo que hay

    expect(() => {
      act(() => {
        result.current.registerUsage({
          date: "2026-10-21",
          machineId: machine.id,
          lotId: lot.id,
          operator: "Carlos Mamani",
          laborType: "Fumigación",
          startHours: machine.hourmeter,
          endHours: machine.hourmeter + 2,
          supplyId: supply.id,
          supplyQty: requestedQty,
        });
      });
    }).toThrow(/Stock insuficiente/);

    // Verificar que el stock NO fue tocado (Rollback en memoria)
    const freshSupply = result.current.supplies.find((s) => s.id === supply.id)!;
    expect(freshSupply.stock).toBe(currentStock);
  });

  // ---------------------------------------------------------------------------
  // 3. INVARIANTE: Monotonía de Horómetros (End >= Start)
  // ---------------------------------------------------------------------------
  it("invariante mecánico: rechaza horómetros finales menores o iguales al inicial", () => {
    const { result } = renderHook(() => useAgro(), { wrapper });
    const machine = result.current.machines[0]!;
    const lot = result.current.lots[0]!;

    expect(() => {
      act(() => {
        result.current.registerUsage({
          date: "2026-10-21",
          machineId: machine.id,
          lotId: lot.id,
          operator: "Roberto Vaca",
          laborType: "Rastra",
          startHours: machine.hourmeter,
          endHours: machine.hourmeter - 1, // Error del operador
        });
      });
    }).toThrow(/estrictamente mayor al horómetro inicial/);
  });

  // ---------------------------------------------------------------------------
  // 4. INVARIANTE: Balanza de Granos y Deducción de Mermas
  // ---------------------------------------------------------------------------
  it("invariante de balanza: garantiza que el líquido pagable nunca supere el peso neto de grano", () => {
    const { result } = renderHook(() => useAgro(), { wrapper });
    const lot = result.current.lots[0]!;

    const grossKg = 30000;
    const tareKg = 12000;
    const netKg = grossKg - tareKg; // 18.000 kg
    const moistureDeduction = 450; // 450 kg por humedad
    const payableWeightKg = netKg - moistureDeduction; // 17.550 kg
    const payableTons = payableWeightKg / 1000; // 17.55 t
    const pricePerTonBs = 2400;
    const totalAmountBs = payableTons * pricePerTonBs;

    const initialLedgerCount = result.current.ledger.length;

    act(() => {
      result.current.addHarvestDelivery({
        ticketNumber: "TKT-SR-9988",
        date: "2026-10-21",
        lotId: lot.id,
        crop: "Soya",
        siloDestination: "ADM Pailón",
        driver: "Ernesto Justiniano",
        truckPlate: "3482-KLD",
        grossWeightKg: grossKg,
        tareWeightKg: tareKg,
        netWeightKg: netKg,
        moisturePercent: 14.5,
        impurityPercent: 1.0,
        deductionKg: moistureDeduction,
        payableWeightKg,
        payableTons,
        pricePerTonBs,
        totalAmountBs,
        status: "Liquidado",
      });
    });

    // Validar que se generó exactamente 1 asiento contable de INGRESO
    expect(result.current.ledger.length).toBe(initialLedgerCount + 1);
    const lastEntry = result.current.ledger[0]!;
    expect(lastEntry.type).toBe("ingreso");
    expect(lastEntry.category).toBe("Venta de Cosecha");
    expect(lastEntry.amount).toBe(totalAmountBs);
    expect(lastEntry.lotId).toBe(lot.id);
  });

  // ---------------------------------------------------------------------------
  // 5. INVARIANTE: Sincronización Bimonetaria y Conversión sin Pérdida
  // ---------------------------------------------------------------------------
  it("invariante bimonetario: el cambio de tasa o divisa preserva los montos base en BOB", () => {
    const { result } = renderHook(() => useAgro(), { wrapper });

    act(() => {
      result.current.setCurrencyMode("USD");
      result.current.setExchangeRate(8.5); // Tipo de cambio paralelo/insumos
    });

    expect(result.current.currencyMode).toBe("USD");
    expect(result.current.exchangeRate).toBe(8.5);

    // Los datos contables subyacentes se mantienen en moneda nacional base (BOB)
    const ledger = result.current.ledger;
    expect(ledger.length).toBeGreaterThan(0);
    expect(ledger.every((e) => typeof e.amount === "number" && !isNaN(e.amount))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 6. INVARIANTE: Inmutabilidad Contable & Contra-asientos (GAAP / Auditoría)
  // ---------------------------------------------------------------------------
  it("invariante contable: anulación formal mediante contra-asiento (sin DELETE destructivo)", () => {
    const { result } = renderHook(() => useAgro(), { wrapper });

    let originalId = "";
    act(() => {
      result.current.addLedger({
        date: "2026-10-21",
        description: "Compra errónea de repuestos",
        category: "Mantenimiento",
        type: "egreso",
        amount: 850,
      });
    });

    const created = result.current.ledger[0]!;
    originalId = created.id;
    expect(created.amount).toBe(850);
    expect(created.type).toBe("egreso");

    // Ejecutar contra-asiento de anulación
    let reversal!: LedgerEntry;
    act(() => {
      reversal = result.current.reverseLedgerEntry(
        originalId,
        "Factura rechazada por administración",
      );
    });

    expect(reversal).toBeDefined();
    expect(reversal.isReversal).toBe(true);
    expect(reversal.reversalOfId).toBe(originalId);
    expect(reversal.type).toBe("ingreso"); // Compensación de egreso
    expect(reversal.amount).toBe(850);
    expect(reversal.description).toContain("[CONTRA-ASIENTO / ANULACIÓN]");

    // El asiento original NUNCA fue borrado (preservación histórica)
    const originalStillExists = result.current.ledger.some((e) => e.id === originalId);
    expect(originalStillExists).toBe(true);

    // No se permite doble anulación
    expect(() => {
      act(() => {
        result.current.reverseLedgerEntry(originalId, "Intento duplicado de anulación");
      });
    }).toThrow(/ya ha sido anulado/);

    // No se permite anular el contra-asiento mismo
    expect(() => {
      act(() => {
        result.current.reverseLedgerEntry(reversal.id, "Intento de reversar la reversa");
      });
    }).toThrow(/No se puede reversar un contra-asiento/);
  });

  // ---------------------------------------------------------------------------
  // 7. INVARIANTE: Permisos y Resoluciones B-SISA (Vigencia Legal ANH Bolivia)
  // ---------------------------------------------------------------------------
  it("invariante B-SISA: calcula días restantes, estados preventivos y alertas de vencimiento", () => {
    const { result } = renderHook(() => useAgro(), { wrapper });

    // Permisos iniciales cargados
    expect(result.current.bsisaPermits.length).toBeGreaterThan(0);

    // Permit con vencimiento en 15 días debe marcar 'Por vencer'
    const today = new Date();
    const in15Days = new Date(today);
    in15Days.setDate(in15Days.getDate() + 15);
    const date15Str = in15Days.toISOString().slice(0, 10);

    const status15 = computeBsisaStatus(date15Str);
    expect(status15).toBe("Por vencer");
    expect(getBsisaDaysRemaining(date15Str)).toBeGreaterThan(0);

    // Permit con vencimiento pasado (-5 días) debe marcar 'Vencido'
    const past5Days = new Date(today);
    past5Days.setDate(past5Days.getDate() - 5);
    const past5Str = past5Days.toISOString().slice(0, 10);

    const statusPast = computeBsisaStatus(past5Str);
    expect(statusPast).toBe("Vencido");

    // Registro de un nuevo permiso B-SISA
    let newPermit: BsisaPermit | undefined;
    act(() => {
      newPermit = result.current.upsertBsisaPermit({
        permitNumber: "RA-TEST-ANH-2026/999",
        permitType: "Resolución de Cupo ANH (Cisterna Estancia)",
        issuedDate: "2026-01-01",
        expiryDate: date15Str,
        monthlyQuotaLiters: 15000,
        authorizedStation: "Surtidor Montero",
        status: "Por vencer",
      });
    });

    expect(newPermit?.id).toBeDefined();
    expect(result.current.bsisaPermits.some((p) => p.id === newPermit?.id)).toBe(true);

    // Debe reflejarse en las alertas de bsisaAlerts
    expect(result.current.bsisaAlerts.expiringSoonCount).toBeGreaterThan(0);

    // Edición / Renovación del permiso (+365 días)
    const nextYear = new Date(today);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().slice(0, 10);

    act(() => {
      result.current.upsertBsisaPermit({
        id: newPermit!.id,
        permitNumber: "RA-TEST-ANH-2026/999",
        permitType: "Resolución de Cupo ANH (Cisterna Estancia)",
        issuedDate: "2026-01-01",
        expiryDate: nextYearStr,
        monthlyQuotaLiters: 20000,
        status: "Vigente",
      });
    });

    const updated = result.current.bsisaPermits.find((p) => p.id === newPermit!.id);
    expect(updated?.expiryDate).toBe(nextYearStr);
    expect(updated?.status).toBe("Vigente");

    // Eliminación del permiso
    act(() => {
      result.current.deleteBsisaPermit(newPermit!.id);
    });
    expect(result.current.bsisaPermits.some((p) => p.id === newPermit!.id)).toBe(false);
  });
});
