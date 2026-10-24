import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const LOCAL_STORAGE_URL_KEY = "agroadmin_supabase_url";
const LOCAL_STORAGE_ANON_KEY = "agroadmin_supabase_anon_key";

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = "";

/**
 * Obtiene la configuración de Supabase desde variables de entorno (.env)
 * o desde el almacenamiento local configurado por el usuario en la UI.
 */
export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  let url = "";
  let anonKey = "";

  if (typeof window !== "undefined") {
    url = localStorage.getItem(LOCAL_STORAGE_URL_KEY) || "";
    anonKey = localStorage.getItem(LOCAL_STORAGE_ANON_KEY) || "";
  }

  // Fallback a variables de entorno Vite
  if (!url) {
    url = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.trim() || "";
  }
  if (!anonKey) {
    anonKey = (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined)?.trim() || "";
  }

  const isConfigured = Boolean(
    url && anonKey && url.startsWith("https://") && !url.includes("your-project-id"),
  );

  return { url, anonKey, isConfigured };
}

/**
 * Guarda credenciales de Supabase personalizadas desde la interfaz.
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_URL_KEY, url.trim());
    localStorage.setItem(LOCAL_STORAGE_ANON_KEY, anonKey.trim());
    cachedClient = null; // Reiniciar cliente
    cachedConfigKey = "";
  }
}

/**
 * Borra las credenciales locales de Supabase.
 */
export function clearSupabaseConfig(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_STORAGE_URL_KEY);
    localStorage.removeItem(LOCAL_STORAGE_ANON_KEY);
    cachedClient = null;
    cachedConfigKey = "";
  }
}

/**
 * Retorna la instancia de cliente Supabase o null si no está configurado.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  const currentKey = `${url}:${anonKey}`;
  if (cachedClient && cachedConfigKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    cachedConfigKey = currentKey;
    return cachedClient;
  } catch (err) {
    console.warn("No se pudo inicializar Supabase client:", err);
    return null;
  }
}

/**
 * Verifica la conectividad con Supabase consultando la tabla app_settings o lots.
 */
export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  message: string;
  tableCount?: number;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      message: "Supabase no está configurado. Ingresa la URL y la Anon Key del proyecto.",
    };
  }

  try {
    const { data, error } = await client.from("lots").select("id", { count: "exact" }).limit(1);

    if (error) {
      // Si la tabla no existe aún
      if (error.code === "42P01") {
        return {
          ok: false,
          message:
            "Conectado a Supabase pero la tabla 'lots' no existe. Debes ejecutar el script schema.sql en el SQL Editor.",
        };
      }
      return {
        ok: false,
        message: `Error de Supabase [${error.code}]: ${error.message}`,
      };
    }

    return {
      ok: true,
      message: "¡Conexión con Supabase verificada con éxito! Base de datos activa.",
      tableCount: data?.length ?? 0,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `Fallo de red al conectar con Supabase: ${msg}`,
    };
  }
}
