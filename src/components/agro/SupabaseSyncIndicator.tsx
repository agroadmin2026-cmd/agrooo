import { useState } from "react";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  UploadCloud,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAgro } from "@/lib/agro-store";
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
} from "@/lib/supabase";

export function SupabaseSyncIndicator() {
  const { isCloudConnected, isSyncing, lastSyncTime, refreshFromCloud, uploadLocalToCloud } =
    useAgro();
  const [open, setOpen] = useState(false);

  const initialConfig = getSupabaseConfig();
  const [url, setUrl] = useState(initialConfig.url);
  const [anonKey, setAnonKey] = useState(initialConfig.anonKey);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSaveConfig = () => {
    if (!url.trim() || !anonKey.trim()) {
      toast.error("Debes ingresar la URL y la Anon Key de Supabase.");
      return;
    }
    saveSupabaseConfig(url, anonKey);
    toast.success("Credenciales guardadas. Verificando conexión...");
    handleTestConnection();
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl("");
    setAnonKey("");
    setTestResult(null);
    toast.info("Credenciales removidas. La app funcionará en modo local.");
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection();
    setIsTesting(false);
    setTestResult(res);
    if (res.ok) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  const handleRefresh = async () => {
    toast.loading("Obteniendo datos de Supabase...", { id: "cloud-sync" });
    const ok = await refreshFromCloud();
    if (ok) {
      toast.success("¡Datos descargados y actualizados desde Supabase!", { id: "cloud-sync" });
    } else {
      toast.error("No se pudo sincronizar con Supabase. Revisa las credenciales o la conexión.", {
        id: "cloud-sync",
      });
    }
  };

  const handleUpload = async () => {
    toast.loading("Exportando datos locales a Supabase...", { id: "cloud-upload" });
    const res = await uploadLocalToCloud();
    if (res.success) {
      toast.success(res.message, { id: "cloud-upload" });
    } else {
      toast.error(res.message, { id: "cloud-upload" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-all duration-150 cursor-pointer select-none bg-background/80 hover:bg-muted"
          title="Estado de sincronización con Supabase Cloud"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span className="hidden sm:inline text-blue-600 font-semibold">Sincronizando...</span>
            </>
          ) : isCloudConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline text-emerald-700 font-medium">Supabase Nube</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <CloudOff className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline text-amber-700 font-medium">Modo Local</span>
            </>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <DialogTitle>Supabase Cloud & Producción</DialogTitle>
          </div>
          <DialogDescription>
            Conecta tu estancia con Supabase PostgreSQL para habilitar base de datos centralizada,
            acceso multiusuario en vivo y respaldo en la nube.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Estado actual */}
          <div className="p-3 rounded-lg border bg-muted/40 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Estado de Base de Datos
              </div>
              <div className="flex items-center gap-2">
                {isCloudConnected ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Conectado a Producción
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-300 gap-1"
                  >
                    <AlertCircle className="w-3.5 h-3.5" /> Modo Local (LocalStorage)
                  </Badge>
                )}
              </div>
            </div>
            {lastSyncTime && (
              <div className="text-right text-xs text-muted-foreground">
                Último sync:{" "}
                {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>

          {/* Formulario de credenciales */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Project URL de Supabase (VITE_SUPABASE_URL)
              </label>
              <Input
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-foreground">
                  Anon Public Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showKey ? "Ocultar" : "Mostrar"}</span>
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="font-mono text-xs pr-10"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 mt-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Credenciales aisladas: No se comparten con servidores de terceros.</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <Button size="sm" onClick={handleSaveConfig} disabled={isTesting} className="w-full sm:w-auto">
                Guardar Credenciales
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || !url || !anonKey}
                className="w-full sm:w-auto"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Probar Conexión
              </Button>
              {url && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive w-full sm:w-auto"
                  onClick={handleClear}
                >
                  Desconectar
                </Button>
              )}
            </div>

            {testResult && (
              <div
                className={`p-3 rounded text-xs flex items-start gap-2 border ${
                  testResult.ok
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-destructive mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Acciones de Sincronización */}
          {isCloudConnected && (
            <div className="border-t pt-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Operaciones de Nube
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isSyncing}
                  className="justify-start"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                  Descargar de Nube
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpload}
                  disabled={isSyncing}
                  className="justify-start"
                >
                  <UploadCloud className="w-3.5 h-3.5 mr-2" />
                  Subir Local a Nube
                </Button>
              </div>
            </div>
          )}

          {/* Guía rápida para SQL Editor */}
          <div className="border-t pt-3 space-y-1.5 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <span>📋 Pasos en tu panel de Supabase:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
              <li>
                Copia el archivo <code>supabase/schema.sql</code> generado en este proyecto.
              </li>
              <li>
                Abre tu consola de Supabase y ve a <strong>SQL Editor &gt; New Query</strong>.
              </li>
              <li>
                Pega el contenido y presiona <strong>Run</strong> (creará las 11 tablas, FKs, RLS y
                función RPC).
              </li>
              <li>
                Ingresa la URL y Anon Key arriba y haz clic en <strong>Probar Conexión</strong>.
              </li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
