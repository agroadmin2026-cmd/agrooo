import { describe, it, expect, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { AgroProvider, useAgro } from "@/lib/agro-store";
import { computeVehicleWear, type Vehicle } from "@/lib/agro-data";

function StoreConsumer({ onReady }: { onReady: (store: ReturnType<typeof useAgro>) => void }) {
  const store = useAgro();
  onReady(store);
  return (
    <div>
      <span data-testid="veh-count">{store.vehicles.length}</span>
      <span data-testid="fuel-count">{store.vehicleFuelLogs.length}</span>
      <span data-testid="maint-count">{store.vehicleMaintenanceLogs.length}</span>
    </div>
  );
}

describe("Módulo de Vehículos, Flota & Desgaste Predictivo", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("carga inicialmente la flota de 5 vehículos reales y sus bitácoras de ejemplo", () => {
    let storeRef!: ReturnType<typeof useAgro>;
    render(
      <AgroProvider>
        <StoreConsumer onReady={(s) => (storeRef = s)} />
      </AgroProvider>,
    );

    expect(storeRef.vehicles.length).toBeGreaterThanOrEqual(5);
    expect(storeRef.vehicleFuelLogs.length).toBeGreaterThanOrEqual(5);
    expect(storeRef.vehicleMaintenanceLogs.length).toBeGreaterThanOrEqual(5);

    const hilux = storeRef.vehicles.find((v) => v.plate === "4021-NBS");
    expect(hilux).toBeDefined();
    expect(hilux?.name).toContain("Hilux");
    expect(hilux?.type).toBe("Camioneta 4x4");
    expect(hilux?.fuelType).toBe("Diésel Vehicular");
  });

  it("calcula el desgaste acelerado y alertas predictivas según condición del camino", () => {
    const mockVehicle: Vehicle = {
      id: "veh-test",
      name: "Toyota Hilux 4x4",
      plate: "9999-XYZ",
      type: "Camioneta 4x4",
      fuelType: "Gasolina Especial",
      currentKm: 54200,
      averageKmPerLiter: 9.5,
      tankCapacityLiters: 80,
      lastOilChangeKm: 50000, // 4,200 km since oil change
      oilIntervalKm: 5000,
      lastAirFilterChangeKm: 46000, // 8,200 km on air filter
      airFilterIntervalKm: 10000,
      lastBrakeChangeKm: 40000,
      brakeIntervalKm: 20000,
      lastTireChangeKm: 20000,
      tireIntervalKm: 40000,
    };

    // On standard pavement (1.0x factor)
    const pavedWear = computeVehicleWear(mockVehicle, "Asfalto y Carretera");
    expect(pavedWear.oil.percentRemaining).toBe(16); // (5000 - 4200) / 5000 = 16%

    // On dusty farm tracks (1.35x dust acceleration factor)
    const dustyWear = computeVehicleWear(mockVehicle, "Tierra y Ripio con Polvo");
    expect(dustyWear.wearFactor).toBe(1.35);
    // 8200 on effective 10000/1.35 = 7407 km interval -> saturated!
    expect(dustyWear.airFilter.status).toBe("Cambio urgente");
    expect(dustyWear.airFilter.alertMessage).toBeDefined();
  });

  it("registra una carga de combustible vehicular, actualiza el odómetro, calcula km/L y genera egreso contable", () => {
    let storeRef!: ReturnType<typeof useAgro>;
    render(
      <AgroProvider>
        <StoreConsumer onReady={(s) => (storeRef = s)} />
      </AgroProvider>,
    );

    const initialLedgerCount = storeRef.ledger.length;
    const initialFuelLogsCount = storeRef.vehicleFuelLogs.length;
    const frontier = storeRef.vehicles.find((v) => v.plate === "3815-KPT")!;
    const prevKm = frontier.currentKm;

    act(() => {
      storeRef.addVehicleFuelLog({
        vehicleId: frontier.id,
        date: "2026-10-22",
        odometerKm: prevKm + 520, // 520 km traveled
        liters: 65,
        pricePerLiterBs: 3.74,
        fuelType: "Gasolina Especial",
        station: "Surtidor Los Troncos - Cuatro Cañadas",
        driver: "Ing. Walter Mendoza",
        fullTank: true,
        notes: "Recorrido supervisión zafra soya",
      });
    });

    // Check vehicle fuel log added
    expect(storeRef.vehicleFuelLogs.length).toBe(initialFuelLogsCount + 1);
    const latestLog = storeRef.vehicleFuelLogs[0]!;
    expect(latestLog.liters).toBe(65);
    expect(latestLog.odometerKm).toBe(prevKm + 520);
    expect(latestLog.calculatedKmPerLiter).toBeCloseTo(520 / 65, 1); // 8.0 km/L
    expect(latestLog.costPerKmBs).toBeCloseTo((65 * 3.74) / 520, 2);

    // Check vehicle odometer was updated
    const updatedFrontier = storeRef.vehicles.find((v) => v.plate === "3815-KPT")!;
    expect(updatedFrontier.currentKm).toBe(prevKm + 520);

    // Check accounting ledger entry was automatically created
    expect(storeRef.ledger.length).toBe(initialLedgerCount + 1);
    const ledgerEntry = storeRef.ledger[0]!;
    expect(ledgerEntry.type).toBe("egreso");
    expect(ledgerEntry.category).toBe("Combustibles");
    expect(ledgerEntry.amount).toBeCloseTo(65 * 3.74, 2);
    expect(ledgerEntry.description).toContain("Combustible Vehicular");
    expect(ledgerEntry.description).toContain("3815-KPT");
  });

  it("registra un mantenimiento preventivo de aceite y resetea el contador de desgaste", () => {
    let storeRef!: ReturnType<typeof useAgro>;
    render(
      <AgroProvider>
        <StoreConsumer onReady={(s) => (storeRef = s)} />
      </AgroProvider>,
    );

    const initialLedgerCount = storeRef.ledger.length;
    const initialMaintLogsCount = storeRef.vehicleMaintenanceLogs.length;
    const frontier = storeRef.vehicles.find((v) => v.plate === "3815-KPT")!;
    const newKm = frontier.currentKm + 200;

    act(() => {
      storeRef.addVehicleMaintenanceLog({
        vehicleId: frontier.id,
        date: "2026-10-22",
        odometerKm: newKm,
        serviceType: "Cambio de Aceite y Filtros",
        partsReplaced: "5 L 10W40 Semisintético + Filtro Mann W940",
        costBs: 480,
        workshopOrMechanic: "Taller Central Estancia",
        notes: "Mantenimiento preventivo por polvo de zafra",
      });
    });

    // Check maintenance log added
    expect(storeRef.vehicleMaintenanceLogs.length).toBe(initialMaintLogsCount + 1);

    // Check vehicle was updated with new oil change km
    const updatedFrontier = storeRef.vehicles.find((v) => v.plate === "3815-KPT")!;
    expect(updatedFrontier.lastOilChangeKm).toBe(newKm);
    expect(updatedFrontier.currentKm).toBe(newKm);

    // Wear of oil should now be 100% fresh!
    const freshWear = computeVehicleWear(updatedFrontier, "Tierra y Ripio con Polvo");
    expect(freshWear.oil.percentRemaining).toBe(100);

    // Check accounting ledger entry was created
    expect(storeRef.ledger.length).toBe(initialLedgerCount + 1);
    const ledgerEntry = storeRef.ledger[0]!;
    expect(ledgerEntry.type).toBe("egreso");
    expect(ledgerEntry.category).toBe("Mantenimiento");
    expect(ledgerEntry.amount).toBe(480);
    expect(ledgerEntry.description).toContain("Mantenimiento Vehicular");
    expect(ledgerEntry.description).toContain("3815-KPT");
  });

  it("preserva la integridad del módulo de maquinaria pesada existente sin colisiones", () => {
    let storeRef!: ReturnType<typeof useAgro>;
    render(
      <AgroProvider>
        <StoreConsumer onReady={(s) => (storeRef = s)} />
      </AgroProvider>,
    );

    // Machinery uses hourmeters, lots, and diesel liters/hour
    const johnDeere = storeRef.machines.find((m) => m.name.includes("John Deere"));
    expect(johnDeere).toBeDefined();
    expect(johnDeere?.hourmeter).toBeGreaterThan(0);
    expect(johnDeere?.hourlyCost).toBeGreaterThan(0);

    // Machinery usages still work cleanly
    expect(storeRef.usages.length).toBeGreaterThan(0);
    const firstUsage = storeRef.usages[0]!;
    expect(firstUsage.machineId).toBeDefined();
    expect(firstUsage.endHours).toBeGreaterThan(firstUsage.startHours);
  });

  it("permite actualizar la foto y conserva el emoji según el tipo de vehículo", () => {
    let storeRef!: ReturnType<typeof useAgro>;
    render(
      <AgroProvider>
        <StoreConsumer onReady={(s) => (storeRef = s)} />
      </AgroProvider>,
    );

    const hilux = storeRef.vehicles.find((v) => v.plate === "4021-NBS")!;
    expect(hilux.emoji).toBe("🛻");
    expect(hilux.imageUrl).toBeDefined();

    const newPhotoUrl = "https://res.cloudinary.com/test-cloud/image/upload/v1/hilux-campo.jpg";
    act(() => {
      storeRef.updateVehiclePhoto(hilux.id, newPhotoUrl);
    });

    const updated = storeRef.vehicles.find((v) => v.plate === "4021-NBS")!;
    expect(updated.imageUrl).toBe(newPhotoUrl);
  });
});
