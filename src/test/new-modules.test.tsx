import { describe, it, expect, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { AgroProvider, useAgro } from "@/lib/agro-store";
import { formatMoney } from "@/lib/agro-data";

function StoreConsumer({ onReady }: { onReady: (store: ReturnType<typeof useAgro>) => void }) {
  const store = useAgro();
  onReady(store);
  return (
    <div>
      <span data-testid="currency">{store.currencyMode}</span>
      <span data-testid="rate">{store.exchangeRate}</span>
      <span data-testid="rain-count">{store.rainfalls.length}</span>
      <span data-testid="lab-count">{store.laborers.length}</span>
      <span data-testid="scout-count">{store.scoutings.length}</span>
    </div>
  );
}

describe("Nuevas Funcionalidades de Alta Utilidad AgroAdmin Bolivia", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("1. Gestión Bimonetaria (Bolivianos `Bs` y Dólares `USD`)", () => {
    it("convierte montos con precisión según el modo de moneda y tipo de cambio configurado", () => {
      let storeRef!: ReturnType<typeof useAgro>;
      render(
        <AgroProvider>
          <StoreConsumer onReady={(s) => (storeRef = s)} />
        </AgroProvider>,
      );

      // En modo Bs por defecto (TC 6.96)
      expect(storeRef.currencyMode).toBe("BOB");
      expect(storeRef.exchangeRate).toBe(6.96);

      const amountBs = 6960;
      const formattedBs = formatMoney(amountBs, "BOB", 6.96);
      expect(formattedBs).toContain("Bs");
      expect(formattedBs).toContain("6.960");

      const formattedUsd = formatMoney(amountBs, "USD", 6.96);
      expect(formattedUsd).toContain("$ 1,000 USD");

      // Cambiar tipo de cambio a 8.50 (mercado paralelo/insumos)
      act(() => {
        storeRef.setExchangeRate(8.5);
        storeRef.setCurrencyMode("USD");
      });

      expect(storeRef.currencyMode).toBe("USD");
      expect(storeRef.exchangeRate).toBe(8.5);

      const formattedCustomUsd = formatMoney(8500, storeRef.currencyMode, storeRef.exchangeRate);
      expect(formattedCustomUsd).toContain("$ 1,000 USD");
    });
  });

  describe("2. Pluviómetro Digital y Régimen de Precipitaciones", () => {
    it("registra un evento de lluvia en milímetros y actualiza el acumulado", () => {
      let storeRef!: ReturnType<typeof useAgro>;
      render(
        <AgroProvider>
          <StoreConsumer onReady={(s) => (storeRef = s)} />
        </AgroProvider>,
      );

      const initialCount = storeRef.rainfalls.length;

      let newRain!: ReturnType<typeof storeRef.addRainfallRecord>;
      act(() => {
        newRain = storeRef.addRainfallRecord({
          date: "2026-10-21",
          lotId: "l1",
          millimeters: 55.5,
          durationHours: 4,
          soilCondition: "Saturado / Anegado (Esperar 48h)",
          notes: "Lluvia torrencial en Sector Pailón",
        });
      });

      expect(storeRef.rainfalls.length).toBe(initialCount + 1);
      expect(storeRef.rainfalls[0]?.millimeters).toBe(55.5);
      expect(storeRef.rainfalls[0]?.soilCondition).toBe("Saturado / Anegado (Esperar 48h)");
      expect(newRain.id).toBeDefined();
    });
  });

  describe("3. Planilla de Jornales y Mano de Obra", () => {
    it("registra jornales de campo, genera el egreso contable en 'Jornales' y permite alternar pago", () => {
      let storeRef!: ReturnType<typeof useAgro>;
      render(
        <AgroProvider>
          <StoreConsumer onReady={(s) => (storeRef = s)} />
        </AgroProvider>,
      );

      const initialLaborersCount = storeRef.laborers.length;
      const initialLedgerCount = storeRef.ledger.length;

      // 4 jornales a Bs 150/día = Bs 600
      let worklog!: ReturnType<typeof storeRef.addLaborerWorklog>;
      act(() => {
        worklog = storeRef.addLaborerWorklog({
          date: "2026-10-21",
          workerName: "Teófilo Quispe",
          lotId: "l1",
          taskDescription: "Deshierbe y macheteo de bordes",
          daysWorked: 4,
          dailyRateBs: 150,
          isPaid: false,
          notes: "Cuadrilla 2",
        });
      });

      expect(storeRef.laborers.length).toBe(initialLaborersCount + 1);
      expect(worklog.totalCostBs).toBe(600);
      expect(worklog.isPaid).toBe(false);

      // Verificamos que se creó el asiento contable automático
      expect(storeRef.ledger.length).toBe(initialLedgerCount + 1);
      const latestEntry = storeRef.ledger[0]!;
      expect(latestEntry.type).toBe("egreso");
      expect(latestEntry.category).toBe("Jornales");
      expect(latestEntry.amount).toBe(600);
      expect(latestEntry.lotId).toBe("l1");

      // Alternar estado de pago a pagado
      act(() => {
        storeRef.toggleLaborerPaid(worklog.id);
      });

      const updatedWorklog = storeRef.laborers.find((l) => l.id === worklog.id)!;
      expect(updatedWorklog.isPaid).toBe(true);
    });
  });

  describe("4. Integración de Mano de Obra en el Margen Bruto del Lote", () => {
    it("incluye los costos de jornales en el cálculo del Margen Bruto del lote (expensesBs y grossMarginPerHaBs)", () => {
      let storeRef!: ReturnType<typeof useAgro>;
      render(
        <AgroProvider>
          <StoreConsumer onReady={(s) => (storeRef = s)} />
        </AgroProvider>,
      );

      const lot = storeRef.lots.find((l) => l.id === "l1")!;
      const prevSummary = storeRef.getLotFinancialSummary("l1")!;
      const prevExpenses = prevSummary.expensesBs;

      // Registrar 5 jornales @ Bs 200 = Bs 1.000 de costo adicional
      act(() => {
        storeRef.addLaborerWorklog({
          date: "2026-10-21",
          workerName: "Mario Condori",
          lotId: "l1",
          taskDescription: "Apoyo en siembra",
          daysWorked: 5,
          dailyRateBs: 200,
          isPaid: true,
        });
      });

      const newSummary = storeRef.getLotFinancialSummary("l1")!;
      expect(newSummary.laborCostBs).toBe(prevSummary.laborCostBs + 1000);
      expect(newSummary.expensesBs).toBe(prevExpenses + 1000);
      expect(newSummary.grossMarginBs).toBe(prevSummary.grossMarginBs - 1000);
      expect(newSummary.grossMarginPerHaBs).toBeCloseTo(newSummary.grossMarginBs / lot.hectares, 2);
    });
  });

  describe("5. Scouting y Sanidad Vegetal", () => {
    it("registra inspección agronómica con fenología y alertas de plagas", () => {
      let storeRef!: ReturnType<typeof useAgro>;
      render(
        <AgroProvider>
          <StoreConsumer onReady={(s) => (storeRef = s)} />
        </AgroProvider>,
      );

      const initialCount = storeRef.scoutings.length;

      let scouting!: ReturnType<typeof storeRef.addFieldScouting>;
      act(() => {
        scouting = storeRef.addFieldScouting({
          date: "2026-10-21",
          lotId: "l1",
          phenologicalStage: "R3 (Formación de vainas)",
          pestName: "Oruga de las leguminosas (Anticarsia gemmatalis)",
          pestSeverity: "Umbral de Daño Económico",
          weedPressure: "Controlada",
          disease: "Ninguna",
          recommendedAction: "Aplicar insecticida de contacto inmediatamente",
          supplyRecommendedId: "s5",
        });
      });

      expect(storeRef.scoutings.length).toBe(initialCount + 1);
      expect(scouting.pestSeverity).toBe("Umbral de Daño Económico");
      expect(scouting.supplyRecommendedId).toBe("s5");
    });
  });
});
