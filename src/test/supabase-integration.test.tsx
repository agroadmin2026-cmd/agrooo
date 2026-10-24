import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AgroProvider, useAgro } from "../lib/agro-store";
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
} from "../lib/supabase";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => <AgroProvider>{children}</AgroProvider>;

describe("Supabase Integration & Cloud State", () => {
  beforeEach(() => {
    localStorage.clear();
    clearSupabaseConfig();
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detecta correctamente cuando Supabase no está configurado", () => {
    const config = getSupabaseConfig();
    expect(config.isConfigured).toBe(false);
  });

  it("guarda y limpia las credenciales de Supabase en localStorage", () => {
    saveSupabaseConfig("https://mi-estancia.supabase.co", "anon-key-12345");
    const config = getSupabaseConfig();
    expect(config.isConfigured).toBe(true);
    expect(config.url).toBe("https://mi-estancia.supabase.co");
    expect(config.anonKey).toBe("anon-key-12345");

    clearSupabaseConfig();
    const cleared = getSupabaseConfig();
    expect(cleared.isConfigured).toBe(false);
  });

  it("retorna un mensaje amigable al probar conexión sin credenciales", async () => {
    const result = await testSupabaseConnection();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Supabase no está configurado");
  });

  it("provee los métodos de sincronización y estado de nube en el hook useAgro", () => {
    const { result } = renderHook(() => useAgro(), { wrapper });

    expect(result.current).toHaveProperty("isCloudConnected");
    expect(result.current).toHaveProperty("isSyncing");
    expect(result.current).toHaveProperty("refreshFromCloud");
    expect(result.current).toHaveProperty("uploadLocalToCloud");
    expect(typeof result.current.refreshFromCloud).toBe("function");
    expect(typeof result.current.uploadLocalToCloud).toBe("function");
  });

  it("mantiene la integridad contable al registrar uso en modo offline o nube", () => {
    const { result } = renderHook(() => useAgro(), { wrapper });

    const initialLedgerCount = result.current.ledger.length;
    const initialUsagesCount = result.current.usages.length;
    const machine = result.current.machines[0]!;
    const lot = result.current.lots[0]!;

    let usageRes: ReturnType<typeof result.current.registerUsage> | undefined;
    act(() => {
      usageRes = result.current.registerUsage({
        date: "2026-10-21",
        machineId: machine.id,
        lotId: lot.id,
        operator: "Juan Perez",
        laborType: "Siembra directa",
        startHours: machine.hourmeter,
        endHours: machine.hourmeter + 5,
        dieselLiters: 40,
      });
    });

    expect(usageRes).toBeDefined();
    expect(usageRes?.hoursOperated).toBe(5);
    expect(result.current.usages.length).toBe(initialUsagesCount + 1);
    expect(result.current.ledger.length).toBe(initialLedgerCount + 1);

    // Horómetro actualizado
    const updatedMachine = result.current.machines.find((m) => m.id === machine.id);
    expect(updatedMachine?.hourmeter).toBe(machine.hourmeter + 5);
  });
});
