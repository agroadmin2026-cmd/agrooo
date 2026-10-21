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
} from "lucide-react";
import { useAgro } from "@/lib/agro-store";
import { CampaignReportModal } from "./CampaignReportModal";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventario", label: "Inventario", icon: Package },
  { to: "/combustible", label: "Diésel B-SISA", icon: Fuel },
  { to: "/maquinaria", label: "Maquinaria", icon: Tractor },
  { to: "/cosecha", label: "Cosecha & Silos", icon: Wheat },
  { to: "/lluvias", label: "Pluviómetro", icon: CloudRain },
  { to: "/jornales", label: "Mano de Obra", icon: Users },
  { to: "/monitoreo", label: "Sanidad Vegetal", icon: Bug },
  { to: "/lotes", label: "Lotes & P&L", icon: Map },
  { to: "/contabilidad", label: "Contabilidad", icon: Wallet },
] as const;

export function AppShell() {
  const store = useAgro();
  const [editingRate, setEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(String(store.exchangeRate));

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
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-primary"
            >
              <n.icon className="size-4 shrink-0" />
              <span>{n.label}</span>
            </Link>
          ))}
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

          <div className="p-3 rounded-xl bg-sidebar-accent/80 border border-sidebar-border text-xs text-sidebar-foreground/80 space-y-1">
            <div className="font-semibold text-sidebar-foreground flex items-center justify-between">
              <span>Campaña 2026/27</span>
              <span className="size-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            </div>
            <p className="text-[11px] text-muted-foreground">Estancia San José · Santa Cruz</p>
          </div>
        </div>
      </aside>

      {/* Header Mobile */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Sprout className="size-5 text-sidebar-primary" />
          <span className="font-display text-base font-bold">AgroAdmin Bolivia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => store.setCurrencyMode(store.currencyMode === "BOB" ? "USD" : "BOB")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-sidebar-accent text-xs font-bold text-primary border border-sidebar-border"
          >
            <ArrowRightLeft className="size-3" />
            <span>{store.currencyMode === "BOB" ? "Bs" : "$ USD"}</span>
          </button>
          <CampaignReportModal
            trigger={
              <button
                type="button"
                className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
                title="Informe Campaña"
              >
                <FileText className="size-4" />
              </button>
            }
          />
        </div>
      </header>

      {/* Main Content con Header Bimonetario Desktop */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-10">
        {/* Barra Bimonetaria Superior en Desktop */}
        <div className="hidden md:flex items-center justify-between px-8 py-3 bg-card/60 backdrop-blur border-b border-border text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="font-semibold text-foreground">Estancia San José</span>
            <span>·</span>
            <span>Pailón / Cuatro Cañadas</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              B-SISA Activo
            </span>
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

            {/* Botón de Informe Rápido */}
            <CampaignReportModal />
          </div>
        </div>

        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex overflow-x-auto justify-around bg-card border-t px-1 py-1 shadow-lg">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            className="flex flex-col items-center justify-center min-w-[56px] py-1.5 px-1 text-[10px] font-medium text-muted-foreground data-[status=active]:text-primary transition-colors shrink-0"
          >
            <n.icon className="size-4 mb-0.5" />
            <span className="truncate max-w-[62px]">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
