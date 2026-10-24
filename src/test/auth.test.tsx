import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider, useAuth, MASTER_CONFIG } from "@/lib/auth-context";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const TEST_ADMIN_PASSWORD = "AgroAdmin2026!";

describe("Sistema de Autenticación Real & Master - AgroAdmin Bolivia", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("inicia sin sesión si el almacenamiento local está vacío", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("permite el acceso con credenciales maestras enterprise", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    let response: { success: boolean; message?: string } | undefined;
    await act(async () => {
      response = await result.current.login(
        MASTER_CONFIG.email,
        TEST_ADMIN_PASSWORD,
        true
      );
    });

    expect(response?.success).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe(MASTER_CONFIG.email);
    expect(result.current.user?.name).toBe("Ing. Marcelo Suárez");
    expect(result.current.user?.role).toBe("Administrador Master");

    // Verificar persistencia en localStorage
    const saved = localStorage.getItem("agroadmin_auth_session_v1");
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved || "{}");
    expect(parsed.email).toBe(MASTER_CONFIG.email);
  });

  it("rechaza intentos con contraseña incorrecta", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    let response: { success: boolean; message?: string } | undefined;
    await act(async () => {
      response = await result.current.login(MASTER_CONFIG.email, "clave_incorrecta_123");
    });

    expect(response?.success).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("permite cerrar sesión y elimina el token de sesión de forma segura", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // 1. Iniciar sesión
    await act(async () => {
      await result.current.login(MASTER_CONFIG.email, TEST_ADMIN_PASSWORD, true);
    });
    expect(result.current.isAuthenticated).toBe(true);

    // 2. Cerrar sesión
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("agroadmin_auth_session_v1")).toBeNull();
  });

  it("restaura la sesión activa guardada en recargas subsecuentes", () => {
    const mockSession = {
      id: "usr_persisted_999",
      email: "gerencia@agroadmin.com",
      name: "Ing. Agrónomo Residente",
      role: "Gerente Agrícola" as const,
      loginMethod: "master" as const,
      lastLogin: new Date().toISOString(),
    };
    localStorage.setItem("agroadmin_auth_session_v1", JSON.stringify(mockSession));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("gerencia@agroadmin.com");
    expect(result.current.user?.name).toBe("Ing. Agrónomo Residente");
  });
});
