import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AgroProvider } from "@/lib/agro-store";
import { ChacoSeedingCalculator } from "@/components/agro/ChacoSeedingCalculator";
import { HarvesterDiagnosticsPanel } from "@/components/agro/HarvesterDiagnosticsPanel";

describe("UI Suite: Chaco Limpio, Siembra, Curasemillas y Cosechadoras", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renderiza ChacoSeedingCalculator y permite conmutar entre pestañas", () => {
    render(
      <AgroProvider>
        <ChacoSeedingCalculator />
      </AgroProvider>,
    );

    // Header y título principal
    expect(screen.getByText(/División Territorial: Superficie Total vs Chaco Limpio/i)).toBeDefined();

    // Pestañas visibles
    expect(screen.getByText(/Chaco Limpio & Parcelas de Siembra/i)).toBeDefined();
    expect(screen.getByText(/Calculadora Veneno de Semillas/i)).toBeDefined();
    expect(screen.getByText(/Sembradora por Campaña/i)).toBeDefined();

    // Cambiar a la pestaña de Veneno de Semillas
    const venenoTabBtn = screen.getByRole("button", { name: /Calculadora Veneno de Semillas/i });
    fireEvent.click(venenoTabBtn);

    expect(screen.getByText(/Calculadora Inteligente de Veneno de Semillas/i)).toBeDefined();
    expect(screen.getByText(/Maxim XL \/ Fludioxonil \+ Metalaxil/i)).toBeDefined();

    // Cambiar a la pestaña de Sembradora
    const sembradoraTabBtn = screen.getByRole("button", { name: /Sembradora por Campaña/i });
    fireEvent.click(sembradoraTabBtn);

    expect(screen.getByText(/Sembradora Adquirida por Campaña & Capacidad de Labor/i)).toBeDefined();
    expect(screen.getByText(/Rendimiento de Siembra/i)).toBeDefined();
    expect(screen.getByText(/Días de Siembra Requeridos/i)).toBeDefined();
  });

  it("renderiza HarvesterDiagnosticsPanel con horas de filtro de aceite y telemetría", () => {
    render(
      <AgroProvider>
        <HarvesterDiagnosticsPanel />
      </AgroProvider>,
    );

    // Título y selector de cosechadora
    expect(screen.getByText(/Estado de la Cosechadora & Filtros de Aceite/i)).toBeDefined();
    expect(screen.getByText(/Case Axial-Flow 8250/i)).toBeDefined();

    // Métricas de filtro de aceite
    expect(screen.getByText(/Horómetro cambio filtro aceite/i)).toBeDefined();
    expect(screen.getByText(/Km recién cambiado filtro de aceite/i)).toBeDefined();

    // Botones de acción rápida
    expect(screen.getByText(/Registrar Filtro de Aceite Recién Cambiado/i)).toBeDefined();
  });

  it("permite registrar una nueva observación técnica en la bitácora de la cosechadora", () => {
    render(
      <AgroProvider>
        <HarvesterDiagnosticsPanel />
      </AgroProvider>,
    );

    const descriptionInput = screen.getByPlaceholderText(
      /Describe lo observado: ej\. filtro de aceite recién cambiado/i,
    );
    fireEvent.change(descriptionInput, {
      target: { value: "Filtro de aceite recién cambiado con filtro Donaldson y aceite 15W40 en lote San José" },
    });

    const submitBtn = screen.getByRole("button", {
      name: /Agregar Observación a la Bitácora/i,
    });
    fireEvent.click(submitBtn);

    // Se debe reflejar la observación en el historial
    expect(
      screen.getByText(/Filtro de aceite recién cambiado con filtro Donaldson y aceite 15W40 en lote San José/i),
    ).toBeDefined();
  });

  it("el botón de recambio rápido de filtro de aceite actualiza las horas restantes a 250", () => {
    render(
      <AgroProvider>
        <HarvesterDiagnosticsPanel />
      </AgroProvider>,
    );

    const quickResetBtn = screen.getByRole("button", {
      name: /Registrar Filtro de Aceite Recién Cambiado/i,
    });
    fireEvent.click(quickResetBtn);

    // El filtro queda con 250 horas restantes (100% vida útil)
    const hoursElements = screen.getAllByText(/250 h/i);
    expect(hoursElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/100% vida útil/i)).toBeDefined();
  });
});
