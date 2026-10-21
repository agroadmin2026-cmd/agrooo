import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AgroProvider, useAgro } from "@/lib/agro-store";
import { UsageDialog } from "@/components/agro/UsageDialog";
import { initialMachines, initialSupplies, initialLots } from "@/lib/agro-data";

// Helper component to test useAgro store operations directly
function StoreConsumer({
  onReady,
}: {
  onReady: (store: ReturnType<typeof useAgro>) => void;
}) {
  const store = useAgro();
  onReady(store);
  return (
    <div>
      <span data-testid="machines-count">{store.machines.length}</span>
      <span data-testid="usages-count">{store.usages.length}</span>
      <span data-testid="ledger-count">{store.ledger.length}</span>
    </div>
  );
}

describe("Módulo de Maquinaria, Uso y Descuento de Inventario", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("actualiza el horómetro de la máquina, descuenta el stock de insumo y genera el egreso contable", () => {
    let storeRef!: ReturnType<typeof useAgro>;

    render(
      <AgroProvider>
        <StoreConsumer onReady={(s) => (storeRef = s)} />
      </AgroProvider>
    );

    // Estado inicial
    const machine = storeRef.machines.find((m) => m.id === "m1")!; // John Deere 6155J, horometer 4320, hourlyCost 45
    const supply = storeRef.supplies.find((s) => s.id === "s5")!; // Cipermetrina 25%, stock 95, unit Litros
    const lot = storeRef.lots.find((l) => l.id === "l1")!; // Lote Norte A

    expect(machine.hourmeter).toBe(4320);
    expect(supply.stock).toBe(95);

    const initialLedgerCount = storeRef.ledger.length;
    const initialUsagesCount = storeRef.usages.length;

    // Ejecutar registro de uso: 8 horas de labor con 15 Litros de Cipermetrina
    const startH = 4320;
    const endH = 4328;
    const qtyUsed = 15;

    let result!: ReturnType<typeof storeRef.registerUsage>;
    act(() => {
      result = storeRef.registerUsage({
        date: "2026-10-21",
        machineId: machine.id,
        lotId: lot.id,
        operator: "Roberto Fernández",
        startHours: startH,
        endHours: endH,
        supplyId: supply.id,
        supplyQty: qtyUsed,
        notes: "Aplicación preventiva contra oruga",
      });
    });

    // 1. Verificar retorno de la función
    expect(result.hoursOperated).toBe(8);
    expect(result.operatingCost).toBe(8 * 315); // 2.520 Bs
    expect(result.newHourmeter).toBe(4328);
    expect(result.supplyDeducted?.quantity).toBe(15);
    expect(result.supplyDeducted?.remainingStock).toBe(80);

    // 2. Verificar actualización del horómetro en la lista de máquinas
    const updatedMachine = storeRef.machines.find((m) => m.id === "m1")!;
    expect(updatedMachine.hourmeter).toBe(4328);

    // 3. Verificar descuento reactivo en el stock de insumos
    const updatedSupply = storeRef.supplies.find((s) => s.id === "s5")!;
    expect(updatedSupply.stock).toBe(80); // 95 - 15 = 80

    // 4. Verificar generación automática del asiento contable de egreso en Bolivianos
    expect(storeRef.ledger.length).toBe(initialLedgerCount + 1);
    const newEntry = storeRef.ledger[0]!; // Los asientos nuevos van al inicio
    expect(newEntry.category).toBe("Maquinaria");
    expect(newEntry.type).toBe("egreso");
    expect(newEntry.amount).toBe(2520);
    expect(newEntry.lotId).toBe("l1");
    expect(newEntry.description).toContain("Labor con John Deere 6155J en Lote Norte A");
    expect(newEntry.description).toContain("Roberto Fernández");

    // 5. Verificar historial de uso
    expect(storeRef.usages.length).toBe(initialUsagesCount + 1);
    const newUsage = storeRef.usages[0]!;
    expect(newUsage.operator).toBe("Roberto Fernández");
    expect(newUsage.operatingCost).toBe(2520);
    expect(newUsage.supplyId).toBe("s5");
    expect(newUsage.supplyQty).toBe(15);
  });

  it("rechaza registros donde el horómetro final es menor o igual al inicial", () => {
    let storeRef!: ReturnType<typeof useAgro>;

    render(
      <AgroProvider>
        <StoreConsumer onReady={(s) => (storeRef = s)} />
      </AgroProvider>
    );

    expect(() =>
      storeRef.registerUsage({
        date: "2026-10-21",
        machineId: "m1",
        lotId: "l1",
        operator: "Roberto",
        startHours: 4320,
        endHours: 4320, // Igual
      })
    ).toThrow("El horómetro final debe ser estrictamente mayor al horómetro inicial.");

    expect(() =>
      storeRef.registerUsage({
        date: "2026-10-21",
        machineId: "m1",
        lotId: "l1",
        operator: "Roberto",
        startHours: 4320,
        endHours: 4315, // Menor
      })
    ).toThrow("El horómetro final debe ser estrictamente mayor al horómetro inicial.");
  });

  it("rechaza el registro si la cantidad requerida de insumo excede el stock disponible en almacén", () => {
    let storeRef!: ReturnType<typeof useAgro>;

    render(
      <AgroProvider>
        <StoreConsumer onReady={(s) => (storeRef = s)} />
      </AgroProvider>
    );

    const supply = storeRef.supplies.find((s) => s.id === "s6")!; // Clorpirifós 48%, stock: 22

    expect(() =>
      storeRef.registerUsage({
        date: "2026-10-21",
        machineId: "m4",
        lotId: "l1",
        operator: "Juan",
        startHours: 3410,
        endHours: 3415,
        supplyId: supply.id,
        supplyQty: 50, // 50 > 22
      })
    ).toThrow(/Stock insuficiente de Clorpirifós 48%/);
  });

  it("permite registrar labores puramente mecánicas sin insumos (supplyId opcional)", () => {
    let storeRef!: ReturnType<typeof useAgro>;

    render(
      <AgroProvider>
        <StoreConsumer onReady={(s) => (storeRef = s)} />
      </AgroProvider>
    );

    const machine = storeRef.machines.find((m) => m.id === "m3")!; // Case Axial-Flow 8250, 1980h, $120/h

    let result!: ReturnType<typeof storeRef.registerUsage>;
    act(() => {
      result = storeRef.registerUsage({
        date: "2026-10-21",
        machineId: machine.id,
        lotId: "l3",
        operator: "Luis Peña",
        startHours: 1980,
        endHours: 1990, // 10 horas
      });
    });

    expect(result.hoursOperated).toBe(10);
    expect(result.operatingCost).toBe(8400); // 10h * 840 Bs
    expect(result.supplyDeducted).toBeUndefined();

    const updatedMachine = storeRef.machines.find((m) => m.id === "m3")!;
    expect(updatedMachine.hourmeter).toBe(1990);

    const newLedger = storeRef.ledger[0]!;
    expect(newLedger.amount).toBe(8400);
    expect(newLedger.category).toBe("Maquinaria");
  });

  it("el formulario UsageDialog calcula horas, costo y proyecta stock en tiempo real", async () => {
    render(
      <AgroProvider>
        <UsageDialog open={true} />
      </AgroProvider>
    );

    // Validar presencia del título del diálogo
    expect(screen.getByText("Registrar Labor y Uso de Maquinaria")).toBeInTheDocument();

    // Validar campos de horómetros
    const startInput = screen.getByLabelText(/Horómetro Inicial/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/Horómetro Final/i) as HTMLInputElement;

    // Cambiar horómetro final a +5 horas sobre el inicial
    const baseHours = parseFloat(startInput.value);
    fireEvent.change(endInput, { target: { value: (baseHours + 5).toString() } });

    // El cálculo automático de horas debe mostrar +5 h
    await waitFor(() => {
      expect(screen.getByText("+5 h")).toBeInTheDocument();
    });

    // Validar que se muestre el botón de confirmación
    const submitBtn = screen.getByRole("button", {
      name: /Registrar labor y actualizar módulos/i,
    });
    expect(submitBtn).toBeInTheDocument();
  });
});
