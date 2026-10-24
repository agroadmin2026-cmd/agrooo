import { useState } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Map,
  Tractor,
  Wallet,
  Sprout,
  Fuel,
  Wheat,
  CloudRain,
  Users,
  Bug,
  DollarSign,
  FileText,
  ArrowRightLeft,
  Menu,
  RotateCcw,
  Car,
  LogOut,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAgro } from "@/lib/agro-store";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CampaignReportModal } from "./CampaignReportModal";
import { SupabaseSyncIndicator } from "./SupabaseSyncIndicator";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventario", label: "Inventario", icon: Package },
  { to: "/combustible", label: "Diésel B-SISA", icon: Fuel },
  { to: "/maquinaria", label: "Maquinaria", icon: Tractor },
  { to: "/vehiculos", label: "Vehículos & Flota", icon: Car },
  { to: "/cosecha", label: "Cosecha & Silos", icon: Wheat },
  { to: "/lluvias", label: "Pluviómetro", icon: CloudRain },
  { to: "/jornales", label: "Mano de Obra", icon: Users },
  { to: "/monitoreo", label: "Sanidad Vegetal", icon: Bug },
  { to: "/lotes", label: "Lotes & P&L", icon: Map },
  { to: "/contabilidad", label: "Contabilidad", icon: Wallet },
] as const;

export function AppShell() {
  const store = useAgro();
  const { user, logout } = useAuth();
  const [editingRate, setEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(String(store.exchangeRate));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSaveRate = () => {
    const val = parseFloat(tempRate);
    if (!isNaN(val) && val > 0) {
      store.setExchangeRate(val);
    }
    setEditingRate(false);
  };

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex items-center gap-2 px-6 h-16 border-b border-sidebar-border">
          <div className="grid place-items-center size-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Sprout className="size-5" />
          </div>
          <div>
            <span className="font-display text-xl font-bold tracking-tight block">AgroAdmin</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-medium">
              Bolivia Enterprise
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((n) => {
            const hasBsisaWarning =
              n.to === "/combustible" &&
              (store.bsisaAlerts.expiredCount > 0 || store.bsisaAlerts.expiringSoonCount > 0);
            return (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-primary"
              >
                <div className="flex items-center gap-3">
                  <n.icon className="size-4 shrink-0" />
                  <span>{n.label}</span>
                </div>
                {hasBsisaWarning && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      store.bsisaAlerts.expiredCount > 0
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-amber-500 text-black"
                    }`}
                  >
                    {store.bsisaAlerts.expiredCount > 0
                      ? `! ${store.bsisaAlerts.expiredCount}`
                      : `${store.bsisaAlerts.expiringSoonCount} avisos`}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Campaña y Botón de Informe */}
        <div className="p-3 m-3 space-y-2">
          <CampaignReportModal
            trigger={
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors border border-primary/20"
              >
                <FileText className="size-3.5" />
                <span>Informe Cierre (PDF)</span>
              </button>
            }
          />

          <button
            type="button"
            onClick={() => {
              store.resetAllData();
              toast.success("Datos demo restablecidos: 5+ ejemplos cargados en cada sección");
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent text-[11px] font-medium transition-colors border border-sidebar-border"
            title="Recargar datos de ejemplo realistas con 5+ registros por sección"
          >
            <RotateCcw className="size-3" />
            <span>Recargar Datos Demo</span>
          </button>

          <div className="p-3 rounded-xl bg-sidebar-accent/80 border border-sidebar-border text-xs text-sidebar-foreground/80 space-y-1">
            <div className="font-semibold text-sidebar-foreground flex items-center justify-between">
              <span>Campaña 2026/27</span>
              <span className="size-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            </div>
            <p className="text-[11px] text-muted-foreground">Estancia San José · Santa Cruz</p>
          </div>

          {/* Tarjeta de Usuario Autenticado & Cerrar Sesión */}
          {user && (
            <div className="p-2.5 rounded-xl bg-sidebar-accent/40 border border-sidebar-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate" title={user.name}>
                    {user.name}
                  </p>
                  <p className="text-[10px] text-emerald-400 truncate font-medium">
                    {user.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  toast.info("Sesión cerrada exitosamente");
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Cerrar Sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Header Mobile con Botón de Menú y Estado B-SISA */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex items-center gap-1.5">
            <Sprout className="size-4 text-sidebar-primary" />
            <span className="font-display text-sm font-bold tracking-tight">AgroAdmin</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {store.bsisaAlerts.expiredCount > 0 ? (
            <Link
              to="/combustible"
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-destructive text-destructive-foreground animate-pulse"
            >
              ! B-SISA
            </Link>
          ) : store.bsisaAlerts.expiringSoonCount > 0 ? (
            <Link
              to="/combustible"
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-black animate-pulse"
            >
              B-SISA ({store.bsisaAlerts.expiringSoonCount})
            </Link>
          ) : null}

          <SupabaseSyncIndicator />

          <button
            type="button"
            onClick={() => store.setCurrencyMode(store.currencyMode === "BOB" ? "USD" : "BOB")}
            className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-sidebar-accent text-xs font-bold text-primary border border-sidebar-border"
          >
            <span>{store.currencyMode === "BOB" ? "Bs" : "$"}</span>
          </button>
        </div>
      </header>

      {/* Sheet Drawer Móvil con navegación completa */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-[82%] sm:max-w-xs p-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col justify-between"
        >
          <div>
            <SheetHeader className="p-4 border-b border-sidebar-border text-left">
              <div className="flex items-center gap-2">
                <div className="grid place-items-center size-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Sprout className="size-4" />
                </div>
                <div>
                  <SheetTitle className="text-base font-bold text-sidebar-foreground">
                    AgroAdmin
                  </SheetTitle>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Estancia San José · Bolivia
                  </p>
                </div>
              </div>
            </SheetHeader>

            <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
              {nav.map((n) => {
                const hasBsisaWarning =
                  n.to === "/combustible" &&
                  (store.bsisaAlerts.expiredCount > 0 || store.bsisaAlerts.expiringSoonCount > 0);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    activeOptions={{ exact: n.to === "/" }}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-primary"
                  >
                    <div className="flex items-center gap-3">
                      <n.icon className="size-4 shrink-0" />
                      <span>{n.label}</span>
                    </div>
                    {hasBsisaWarning && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          store.bsisaAlerts.expiredCount > 0
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-amber-500 text-black"
                        }`}
                      >
                        {store.bsisaAlerts.expiredCount > 0
                          ? `! ${store.bsisaAlerts.expiredCount}`
                          : `${store.bsisaAlerts.expiringSoonCount}`}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-sidebar-border space-y-2 bg-sidebar-accent/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>T.C. Oficial:</span>
              <span className="font-bold text-foreground">Bs {store.exchangeRate.toFixed(2)}</span>
            </div>
            <CampaignReportModal
              trigger={
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors border border-primary/20"
                >
                  <FileText className="size-3.5" />
                  <span>Informe Cierre (PDF)</span>
                </button>
              }
            />

            <button
              type="button"
              onClick={() => {
                store.resetAllData();
                toast.success("¡Datos demo restablecidos con éxito!", {
                  description: "5+ ejemplos cargados en cada sección agrícola.",
                });
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground text-xs font-semibold transition-colors border border-sidebar-border"
            >
              <RotateCcw className="size-3.5 text-primary" />
              <span>Cargar 5 Ejemplos por Sección</span>
            </button>

            {/* Usuario Autenticado en Drawer Móvil */}
            {user && (
              <div className="p-2.5 rounded-xl bg-sidebar-accent/60 border border-sidebar-border flex items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-sidebar-foreground truncate">{user.name}</p>
                    <p className="text-[10px] text-emerald-400 truncate">{user.role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setIsMobileMenuOpen(false);
                    await logout();
                    toast.info("Sesión cerrada");
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content con Header Bimonetario Desktop */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-10">
        {/* Barra Bimonetaria Superior en Desktop */}
        <div className="hidden md:flex items-center justify-between px-8 py-3 bg-card/60 backdrop-blur border-b border-border text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="font-semibold text-foreground">Estancia San José</span>
            <span>·</span>
            <span>Pailón / Cuatro Cañadas</span>
            <span>·</span>
            {store.bsisaAlerts.expiredCount > 0 ? (
              <Link
                to="/combustible"
                className="inline-flex items-center gap-1.5 text-destructive font-semibold hover:underline"
              >
                <span className="size-2 rounded-full bg-destructive animate-pulse" />
                B-SISA: {store.bsisaAlerts.expiredCount} Vencido(s)
              </Link>
            ) : store.bsisaAlerts.expiringSoonCount > 0 ? (
              <Link
                to="/combustible"
                className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium hover:underline"
              >
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                B-SISA: Por Vencer ({store.bsisaAlerts.expiringSoonCount})
              </Link>
            ) : (
              <Link
                to="/combustible"
                className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
              >
                <span className="size-1.5 rounded-full bg-emerald-500" />
                B-SISA Activo
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Control Bimonetario */}
            <div className="flex items-center gap-2 bg-muted/70 p-1 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => store.setCurrencyMode("BOB")}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  store.currencyMode === "BOB"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bs (BOB)
              </button>
              <button
                type="button"
                onClick={() => store.setCurrencyMode("USD")}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  store.currencyMode === "USD"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                $ (USD)
              </button>
            </div>

            {/* Tipo de Cambio Configurable */}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-[11px] font-medium">T.C.:</span>
              {editingRate ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={tempRate}
                    onChange={(e) => setTempRate(e.target.value)}
                    className="w-16 h-6 px-1.5 text-xs font-bold rounded border bg-background"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSaveRate()}
                  />
                  <button
                    type="button"
                    onClick={handleSaveRate}
                    className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-bold text-[10px]"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTempRate(String(store.exchangeRate));
                    setEditingRate(true);
                  }}
                  className="font-bold text-foreground hover:underline"
                  title="Clic para editar tipo de cambio"
                >
                  Bs {store.exchangeRate.toFixed(2)}
                </button>
              )}
            </div>

            {/* Sincronización Supabase Cloud */}
            <SupabaseSyncIndicator />

            {/* Botón de Informe Rápido */}
            <CampaignReportModal />

            {/* Perfil de Usuario y Logout Desktop */}
            {user && (
              <div className="flex items-center gap-2 pl-3 border-l border-border">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left leading-tight">
                    <p className="text-xs font-semibold text-foreground truncate max-w-[130px]">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground">{user.role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    toast.info("Sesión cerrada");
                  }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation con 5 accesos directos táctiles */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 bg-card/95 backdrop-blur border-t px-1 py-1.5 shadow-lg safe-bottom">
        <Link
          to="/"
          activeOptions={{ exact: true }}
          className="flex flex-col items-center justify-center py-1 text-[10px] font-medium text-muted-foreground data-[status=active]:text-primary transition-colors"
        >
          <LayoutDashboard className="size-5 mb-0.5" />
          <span>Inicio</span>
        </Link>

        <Link
          to="/combustible"
          className="flex flex-col items-center justify-center py-1 text-[10px] font-medium text-muted-foreground data-[status=active]:text-primary transition-colors relative"
        >
          <div className="relative">
            <Fuel className="size-5 mb-0.5" />
            {(store.bsisaAlerts.expiredCount > 0 || store.bsisaAlerts.expiringSoonCount > 0) && (
              <span className="absolute -top-1 -right-1.5 size-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <span>B-SISA</span>
        </Link>

        <Link
          to="/maquinaria"
          className="flex flex-col items-center justify-center py-1 text-[10px] font-medium text-muted-foreground data-[status=active]:text-primary transition-colors"
        >
          <Tractor className="size-5 mb-0.5" />
          <span>Máquinas</span>
        </Link>

        <Link
          to="/cosecha"
          className="flex flex-col items-center justify-center py-1 text-[10px] font-medium text-muted-foreground data-[status=active]:text-primary transition-colors"
        >
          <Wheat className="size-5 mb-0.5" />
          <span>Cosecha</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="size-5 mb-0.5 text-primary" />
          <span className="font-semibold text-foreground">Menú (10)</span>
        </button>
      </nav>
    </div>
  );
}
