import { useState, type FormEvent } from "react";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Sprout,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import { getSupabaseConfig } from "@/lib/supabase";

export function LoginGate() {
  const { login, signup } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserProfile["role"]>("Gerente Agrícola");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabaseConfig = getSupabaseConfig();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Por favor completa tu correo y contraseña.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (tab === "login") {
        const res = await login(email, password, rememberMe);
        if (!res.success) {
          setErrorMessage(res.message || "Error al iniciar sesión.");
          toast.error("Acceso denegado", {
            description: res.message || "Verifica tus credenciales.",
          });
        } else {
          toast.success("¡Bienvenido a AgroAdmin!", {
            description: res.message || "Sesión verificada exitosamente.",
          });
        }
      } else {
        const res = await signup(email, password, fullName, role);
        if (!res.success) {
          setErrorMessage(res.message || "Error al registrar cuenta.");
          toast.error("Fallo al registrar", {
            description: res.message,
          });
        } else {
          toast.success("Cuenta creada", {
            description: res.message || "Acceso autorizado.",
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      toast.error("Error imprevisto", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    toast.info("Recuperación de Acceso Institucional", {
      description: "Por motivos de seguridad, contacta al Administrador de Sistemas de Estancia San José.",
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#07130f] via-[#0b1d16] to-[#040907] relative overflow-hidden font-sans text-neutral-100">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-900/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-neutral-900/80 backdrop-blur-2xl border border-neutral-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          {/* Header Brand */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-lg shadow-emerald-500/20 mb-3 border border-emerald-400/30">
              <Sprout className="size-8" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              AgroAdmin <span className="text-emerald-400 text-sm font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30">Bolivia</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Control Integral de Campo, Flota y Finanzas · Estancia San José
            </p>

            {/* Cloud Status Indicator */}
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-950/60 border border-neutral-800 text-[11px] text-neutral-300">
              <Database className="size-3 text-emerald-400" />
              <span>
                {supabaseConfig.isConfigured ? "Supabase Cloud Auth v2.118" : "Autenticación Cifrada Activa"}
              </span>
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
            </div>
          </div>

          {/* Tabs: Iniciar Sesión / Registrarse */}
          <div className="grid grid-cols-2 p-1 bg-neutral-950/80 rounded-xl mb-5 border border-neutral-800">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === "login"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("signup");
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === "signup"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive-foreground text-xs flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "signup" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                    <User className="size-3.5 text-neutral-400" />
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Ing. Roberto Mendoza"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/90 border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-neutral-400" />
                    Rol en la Empresa
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserProfile["role"])}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/90 border border-neutral-800 focus:border-emerald-500 text-sm text-neutral-100 outline-none transition-all"
                  >
                    <option value="Gerente Agrícola">Gerente Agrícola</option>
                    <option value="Administrador Master">Administrador Master</option>
                    <option value="Técnico de Campo">Técnico de Campo</option>
                    <option value="Auditor Contable">Auditor Contable</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Mail className="size-3.5 text-neutral-400" />
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@empresa.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/90 border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition-all font-mono text-[13px]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-neutral-400" />
                  Contraseña
                </label>
                {tab === "login" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-neutral-950/90 border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition-all font-mono text-[13px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors"
                  aria-label={showPassword ? "Ocultar clave" : "Ver clave"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {tab === "login" && (
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 size-3.5"
                />
                <span className="text-xs text-neutral-400 select-none">
                  Mantener sesión iniciada en este dispositivo
                </span>
              </label>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/60 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando Credenciales...</span>
                </>
              ) : tab === "login" ? (
                <>
                  <Lock className="size-4" />
                  <span>Entrar al Sistema AgroAdmin</span>
                  <ArrowRight className="size-4 ml-1" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Crear Cuenta y Acceder</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Security Badges */}
          <div className="mt-6 pt-5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              Cifrado SSL 256-Bit
            </span>
            <span>Versión 2026.4 · Enterprise</span>
          </div>
        </div>

        {/* Small bottom note */}
        <p className="text-center text-[11px] text-neutral-500 mt-4">
          Sistema protegido bajo políticas de seguridad de Estancia San José.
        </p>
      </div>
    </div>
  );
}
