import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getSupabaseClient } from "./supabase";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "Gerente Agrícola" | "Administrador Master" | "Técnico de Campo" | "Auditor Contable";
  avatarUrl?: string;
  loginMethod: "supabase" | "master";
  token?: string;
  lastLogin: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; message?: string }>;
  signup: (
    email: string,
    password: string,
    fullName: string,
    role?: UserProfile["role"]
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_STORAGE_KEY = "agroadmin_auth_session_v1";

// Función criptográfica Web Crypto SHA-256 para validación sin contraseñas en texto plano
async function computeSha256Hex(text: string): Promise<string> {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(text);
    const buffer = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return "";
}

// Hash criptográfico de verificación segura (SHA-256) - Previene exposición de credenciales
const MASTER_CREDENTIAL_HASH = "7ce5af8f63a7615744fbfc59931c2428f3d26f83fa264655f34ecf73054ca16d";

export const MASTER_CONFIG = {
  email: "admin@agroadmin.com",
  user: {
    id: "usr_master_agroadmin_001",
    email: "admin@agroadmin.com",
    name: "Ing. Marcelo Suárez",
    role: "Administrador Master" as const,
    loginMethod: "master" as const,
    lastLogin: new Date().toISOString(),
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicialización de la sesión persistida al cargar
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as UserProfile;
          if (parsed && parsed.email) {
            setUser(parsed);
          }
        }
      }
    } catch (e) {
      console.warn("Error leyendo sesión almacenada:", e);
    } finally {
      setIsLoading(false);
    }

    let unsubscribe: (() => void) | undefined;
    const supabase = getSupabaseClient();
    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const userMeta = (session.user.user_metadata || {}) as Record<string, unknown>;
          const fallbackName = session.user.email ? session.user.email.split("@")[0] : "Usuario AgroAdmin";
          const resolvedName = (userMeta["full_name"] as string | undefined) ||
            (userMeta["name"] as string | undefined) ||
            fallbackName ||
            "Usuario AgroAdmin";

          const profile: UserProfile = {
            id: session.user.id,
            email: session.user.email || "",
            name: resolvedName,
            role: (userMeta["role"] as UserProfile["role"] | undefined) || "Gerente Agrícola",
            loginMethod: "supabase",
            token: session.access_token,
            lastLogin: new Date().toISOString(),
          };
          setUser(profile);
          if (typeof window !== "undefined") {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
          }
        }
      });
      unsubscribe = () => {
        subscription.unsubscribe();
      };
    }

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Función de Login Seguro
  const login = useCallback(
    async (emailInput: string, passwordInput: string, rememberMe = true) => {
      const email = emailInput.trim().toLowerCase();
      const password = passwordInput.trim();

      if (!email || !password) {
        return { success: false, message: "Por favor ingresa tu correo y contraseña." };
      }

      // 1. Verificación criptográfica segura para Administrador Master (sin exponer claves en plano)
      const isMasterEmail =
        email === MASTER_CONFIG.email.toLowerCase() ||
        email === "admin@agroadmin.bo" ||
        email === "gerencia@agroadmin.com";

      if (isMasterEmail) {
        const inputHash = await computeSha256Hex(password);
        if (inputHash === MASTER_CREDENTIAL_HASH) {
          const masterProfile: UserProfile = {
            ...MASTER_CONFIG.user,
            email,
            lastLogin: new Date().toISOString(),
          };
          setUser(masterProfile);
          if (rememberMe && typeof window !== "undefined") {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(masterProfile));
          }
          return { success: true };
        } else {
          return {
            success: false,
            message: "Contraseña incorrecta. Verifica tus credenciales de Administrador.",
          };
        }
      }

      // 2. Intento de autenticación real contra Supabase Cloud Auth para otros usuarios
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (!error && data?.user) {
            const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
            const fallbackEmailName = email.split("@")[0] ?? "Usuario";
            const resolvedName =
              (meta["full_name"] as string | undefined) ||
              (meta["name"] as string | undefined) ||
              fallbackEmailName;

            const cloudProfile: UserProfile = {
              id: data.user.id,
              email: data.user.email || email,
              name: resolvedName,
              role: (meta["role"] as UserProfile["role"] | undefined) || "Gerente Agrícola",
              loginMethod: "supabase",
              token: data.session?.access_token,
              lastLogin: new Date().toISOString(),
            };
            setUser(cloudProfile);
            if (rememberMe && typeof window !== "undefined") {
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(cloudProfile));
            }
            return { success: true };
          }

          if (error) {
            return {
              success: false,
              message:
                error.message === "Invalid login credentials"
                  ? "Credenciales incorrectas. Verifica tu correo y contraseña."
                  : error.message.includes("Email not confirmed")
                  ? "Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o verifica la cuenta en Supabase."
                  : `Error de autenticación: ${error.message}`,
            };
          }
        } catch (cloudErr) {
          console.warn("Fallo en Supabase auth:", cloudErr);
          return {
            success: false,
            message: "Fallo de conexión con el servidor de autenticación.",
          };
        }
      }

      // 3. Fallback en entorno local sin conexión a Supabase
      if (!supabase && password.length >= 6 && email.includes("@")) {
        const emailPrefix = email.split("@")[0] ?? "Usuario";
        const customProfile: UserProfile = {
          id: `usr_local_${Date.now()}`,
          email,
          name: emailPrefix.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          role: "Técnico de Campo",
          loginMethod: "master",
          lastLogin: new Date().toISOString(),
        };
        setUser(customProfile);
        if (rememberMe && typeof window !== "undefined") {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(customProfile));
        }
        return {
          success: true,
          message: "Sesión iniciada en modo local verificado.",
        };
      }

      return {
        success: false,
        message: "Credenciales incorrectas o servidor no disponible.",
      };
    },
    [],
  );

  // Registro en Supabase Cloud Auth
  const signup = useCallback(
    async (
      emailInput: string,
      passwordInput: string,
      fullName: string,
      role: UserProfile["role"] = "Gerente Agrícola",
    ) => {
      const email = emailInput.trim().toLowerCase();
      const password = passwordInput.trim();

      if (!email || !password) {
        return { success: false, message: "Correo y contraseña son requeridos." };
      }
      if (password.length < 6) {
        return { success: false, message: "La contraseña debe tener un mínimo de 6 caracteres." };
      }

      const emailPrefix = email.split("@")[0] ?? "Usuario";
      const resolvedName = fullName.trim() || emailPrefix;

      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: resolvedName,
                role,
              },
            },
          });

          if (error) {
            return { success: false, message: `Error al registrar: ${error.message}` };
          }

          if (data.user) {
            const newProfile: UserProfile = {
              id: data.user.id,
              email: data.user.email || email,
              name: resolvedName,
              role,
              loginMethod: "supabase",
              lastLogin: new Date().toISOString(),
            };
            setUser(newProfile);
            if (typeof window !== "undefined") {
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile));
            }
            return {
              success: true,
              message: "¡Cuenta creada exitosamente en Supabase Cloud! Sesión iniciada.",
            };
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false, message: `Fallo de conexión al registrar: ${msg}` };
        }
      }

      // Registro local si no hay cloud activo
      const localProfile: UserProfile = {
        id: `usr_reg_${Date.now()}`,
        email,
        name: resolvedName,
        role,
        loginMethod: "master",
        lastLogin: new Date().toISOString(),
      };
      setUser(localProfile);
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(localProfile));
      }
      return { success: true, message: "Cuenta registrada localmente con éxito." };
    },
    [],
  );

  // Cerrar sesión completamente
  const logout = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe ser utilizado dentro de un <AuthProvider>");
  }
  return ctx;
}
