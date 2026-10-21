import { describe, it, expect, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { AgroProvider, useAgro } from "@/lib/agro-store";
import { exportToCsv } from "@/lib/agro-data";

function StoreConsumer({
  onReady,
}: {
  onReady: (store: ReturnType<typeof useAgro>) => void;
}) {
  const store = useAgro();
  onReady(store);
  return (
    <div>
      <span data-testid="fuel-tx">{store.fuelTransactions.length}</span>
      <span data-testid="harvest-tx">{store.harvestDeliveries.length}</span>
      <span data-testid="maint-tx">{store.maintenanceRecords.length}</span>
    </div>
  );
}

describe("Módulos Enterprise AgroAdmin Bolivia", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Cisterna de Diésel y Cupo B-SISA", () => {
    it("registra una compra/ingreso de combustible aumentando el nivel del tanque y registrando el egreso contable", () => {
      let storeRef!: ReturnType<typeof useAgro>;
      render(
        <AgroProvider>
          <StoreConsumer onReady={(s) => (storeRef = s)} />
        </AgroProvider>
      );

      const dieselSupply = storeRef.supplies.find((s) => s.category === "Combustibles")!;
      const initialStock = dieselSupply.stock;
      const initialLedgerCount = storeRef.ledger.length;

      act(() => {
        storeRef.addFuelTransaction({
          date: "2026-10-21",
          type: "ingreso",
          liters: 5000,
          pricePerLiter: 3.72,
          totalCostBs: 18600,
          destinationOrSource: "YPFB Refinería Guillermo Elder Bell",
          invoiceNumber: "B-SISA-2026-9999",
          notes: "Carga de cisterna autorizada por ANH",
        });
      });

      const updatedDiesel = storeRef.supplies.find((s) => s.category === "Combustibles")!;
      expect(updatedDiesel.stock).toBe(initialStock + 5000);
      expect(storeRef.ledger.length).toBe(initialLedgerCount + 1);

      const latestTx = storeRef.fuelTransactions[0]!;
      expect(latestTx.liters).toBe(5000);
      expect(latestTx.totalCostBs).toBe(18600);

      const latestEntry = storeRef.ledger[0]!;
      expect(latestEntry.type).toBe("egreso");
      expect(latestEntry.category).toBe("Combustibles");
      expect(latestEntry.amount).toBe(18600);
    });

    it("registra un despacho/egreso a maquinaria descontando litros del tanque", () => {
      let storeRef!: ReturnType<typeof useAgro>;
      render(
        <AgroProvider>
          <StoreConsumer onReady={(s) => (storeRef = s)} />
        </AgroProvider>
      );

      const dieselSupply = storeRef.supplies.find((s) => s.category === "Combustibles")!;
      const initialStock = dieselSupply.stock;

      act(() => {
        storeRef.addFuelTransaction({
          date: "2026-10-21",
          type: "despacho",
          liters: 250,
          pricePerLiter: 3.72,
          totalCostBs: 930,
          machineId: "m1",
          destinationOrSource: "Tractor John Deere 6155J",
          notes: "Despacho previo a labor de siembra",
        });
      });

      const updatedDiesel = storeRef.supplies.find((s) => s.category === "Combustibles")!;
      expect(updatedDiesel.stock).toBe(initialStock - 250);
      const latestTx = storeRef.fuelTransactions[0]!;
      expect(latestTx.type).toBe("despacho");
      expect(latestTx.liters).toBe(250);
    });
  });

  describe("Cosecha y Liquidación de Silos (Balanza)", () => {
    it("registra un ticket de balanza, descuenta humedad e impurezas, y registra el ingreso contable por venta de grano", () => {
      let storeRef!: ReturnType<typeof useAgro>;
      render(
        <AgroProvider>
          <StoreConsumer onReady={(s) => (storeRef = s)} />
        </AgroProvider>
      );

      const initialLedgerCount = storeRef.ledger.length;
      const initialDeliveriesCount = storeRef.harvestDeliveries.length;

      // 32.500 kg brutos, tara 12.000 kg -> neto 20.500 kg (20.5 Tn)
      // Merma 800 kg -> pagable = 19.700 kg = 19.70 Tn
      // Precio: 2.450 Bs/Tn -> Total = 48.265 Bs
      act(() => {
        storeRef.addHarvestDelivery({
          date: "2026-10-21",
          lotId: "l1",
          crop: "Soya",
          siloDestination: "ADM Silo Pailón",
          ticketNumber: "ADM-998877",
          truckPlate: "4421-KLX",
          driver: "Marcelo Condori",
          grossWeightKg: 32500,
          tareWeightKg: 12000,
          netWeightKg: 20500,
          moisturePercent: 12.5,
          impurityPercent: 1.0,
          deductionKg: 800,
          payableWeightKg: 19700,
          payableTons: 19.7,
          pricePerTonBs: 2450,
          totalAmountBs: 48265,
          status: "Liquidado",
        });
      });

      expect(storeRef.harvestDeliveries.length).toBe(initialDeliveriesCount + 1);
      const delivery = storeRef.harvestDeliveries[0]!;
      expect(delivery.netWeightKg).toBe(20500);
      expect(delivery.payableTons).toBe(19.7);
      expect(delivery.totalAmountBs).toBe(48265);

      // Verificamos que se creó el ingreso en Contabilidad
      expect(storeRef.ledger.length).toBe(initialLedgerCount + 1);
      const entry = storeRef.ledger[0]!;
      expect(entry.type).toBe("ingreso");
      expect(entry.category).toBe("Venta de Cosecha");
      expect(entry.amount).toBe(48265);
      expect(entry.lotId).toBe("l1");
    });
  });

  describe("Rentabilidad y Margen Bruto Agrícola por Lote (Bs/ha)", () => {
    it("calcula ingresos, costos operativos y margen neto por hectárea con precisión", () => {
      let storeRef!: ReturnType<typeof useAgro>;
      render(
        <AgroProvider>
          <StoreConsumer onReady={(s) => (storeRef = s)} />
        </AgroProvider>
      );

      const lot = storeRef.lots.find((l) => l.id === "l1")!; // Lote Norte A (120 ha)
      const summary = storeRef.getLotFinancialSummary("l1")!;

      expect(summary).toBeDefined();
      expect(summary.lot.hectares).toBe(lot.hectares);
      expect(summary.grossMarginBs).toBe(summary.revenueBs - summary.expensesBs);
      expect(summary.grossMarginPerHaBs).toBeCloseTo(
        summary.grossMarginBs / summary.lot.hectares,
        2
      );
      expect(summary.yieldTonsPerHa).toBeCloseTo(
        summary.harvestTons / summary.lot.hectares,
        2
      );
    });
  });

  describe("Servicios Preventivos de Maquinaria (250 horas)", () => {
    it("registra un mantenimiento, actualiza el último horómetro de servicio y genera el egreso", () => {
      let storeRef!: ReturnType<typeof useAgro>;
      render(
        <AgroProvider>
          <StoreConsumer onReady={(s) => (storeRef = s)} />
        </AgroProvider>
      );

      const machine = storeRef.machines.find((m) => m.id === "m1")!;
      const initialLedgerCount = storeRef.ledger.length;

      act(() => {
        storeRef.addMaintenanceRecord({
          machineId: machine.id,
          date: "2026-10-21",
          hourmeter: 4500,
          serviceType: "Service 250h",
          costBs: 2800,
          mechanic: "Taller Agrícola Montero",
          partsReplaced: "Filtro de aceite, filtro de combustible, 20L 15W40",
          notes: "Cambio de aceite 15W40 y filtros John Deere originales",
        });
      });

      const updatedMachine = storeRef.machines.find((m) => m.id === machine.id)!;
      expect(updatedMachine.lastServiceHourmeter).toBe(4500);

      const latestMaint = storeRef.maintenanceRecords[0]!;
      expect(latestMaint.costBs).toBe(2800);

      expect(storeRef.ledger.length).toBe(initialLedgerCount + 1);
      const entry = storeRef.ledger[0]!;
      expect(entry.category).toBe("Mantenimiento");
      expect(entry.amount).toBe(2800);
    });
  });

  describe("Utilidad de Exportación CSV", () => {
    it("genera contenido CSV formateado con cabeceras y filas", () => {
      let createdBlob: Blob | null = null;
      const originalCreate = URL.createObjectURL;
      const originalRevoke = URL.revokeObjectURL;
      URL.createObjectURL = (blob: Blob) => {
        createdBlob = blob;
        return "blob:mock-url";
      };
      URL.revokeObjectURL = () => {};

      try {
        exportToCsv(
          "test_contabilidad",
          ["Fecha", "Concepto", "Monto (Bs)"],
          [
            ["2026-10-21", "Cipermetrina", 540],
            ["2026-10-20", "Diésel B-SISA", 1860],
          ]
        );

        expect(createdBlob).not.toBeNull();
        expect(createdBlob!.type).toContain("text/csv");
      } finally {
        URL.createObjectURL = originalCreate;
        URL.revokeObjectURL = originalRevoke;
      }
    });
  });
});
