import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Sprout,
  TrendingUp,
  TrendingDown,
  Wheat,
  MapPin,
  Calculator,
  Layers,
} from "lucide-react";
import { useAgro } from "@/lib/agro-store";
import { formatMoney, number, type LotStatus } from "@/lib/agro-data";
import { PageHeader, Panel, Pill } from "@/components/agro/ui";
import { ChacoSeedingCalculator } from "@/components/agro/ChacoSeedingCalculator";

export const Route = createFileRoute("/lotes/")({
  head: () => ({
    meta: [
      { title: "Lotes, Parcelas, Chaco Limpio & Siembra · AgroAdmin Bolivia" },
      {
        name: "description",
        content:
          "Subdivisión de chaco limpio, calculadora inteligente de veneno de semillas, amortización de sembradora por campaña y rentabilidad por hectárea.",
      },
    ],
  }),
  component: Lotes,
});

const statusTone: Record<LotStatus, "success" | "warning" | "primary" | "neutral"> = {
  Siembra: "primary",
  Crecimiento: "success",
  Cosecha: "warning",
  Barbecho: "neutral",
};

function Lotes() {
  const store = useAgro();
  const [activeSection, setActiveSection] = useState<"lotes" | "chaco_siembra">("lotes");
  const totalHa = store.lots.reduce((a, l) => a + l.hectares, 0);

  return (
    <>
      <PageHeader
        title="Lotes, Parcelas & Chaco Limpio"
        subtitle={`${number(totalHa)} hectáreas bajo manejo agronómico en Santa Cruz / Chaco boliviano`}
        actions={
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted border">
            <button
              onClick={() => setActiveSection("lotes")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSection === "lotes"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="size-3.5 text-primary" /> Lotes & Margen Bruto
            </button>
            <button
              onClick={() => setActiveSection("chaco_siembra")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSection === "chaco_siembra"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calculator className="size-3.5" /> Chaco Limpio, Siembra & Venenos
            </button>
          </div>
        }
      />

      {activeSection === "chaco_siembra" ? (
        <ChacoSeedingCalculator />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {store.lots.map((l) => {
            const summary = store.getLotFinancialSummary(l.id);
          const hasDeliveries = summary && summary.harvestTons > 0;

          return (
            <Link key={l.id} to="/lotes/$lotId" params={{ lotId: l.id }} className="group">
              <Panel className="p-5 h-full transition-all group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="grid place-items-center size-10 rounded-lg bg-primary/10 text-primary">
                      <Sprout className="size-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Pill tone={statusTone[l.status]}>{l.status}</Pill>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mt-4 tracking-tight group-hover:text-primary transition-colors">
                    {l.name}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                    <span>
                      Cultivo: <b className="text-foreground">{l.crop}</b>
                    </span>
                    {l.location && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <MapPin className="size-3 text-muted-foreground" /> {l.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Superficie</p>
                      <p className="font-bold text-sm num">{l.hectares} ha</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Horas Maq.</p>
                      <p className="font-bold text-sm num">{summary?.machineHours ?? 0} h</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Costo / ha</p>
                      <p className="font-bold text-sm num text-foreground">
                        {summary
                          ? formatMoney(
                              summary.expensesBs / l.hectares,
                              store.currencyMode,
                              store.exchangeRate,
                              true,
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* P&L MINI DASHBOARD */}
                  <div className="p-2.5 rounded-lg bg-muted/40 border space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-[11px]">Margen Bruto Total:</span>
                      <span
                        className={`font-bold num ${
                          summary && summary.grossMarginBs >= 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {summary
                          ? formatMoney(
                              summary.grossMarginBs,
                              store.currencyMode,
                              store.exchangeRate,
                            )
                          : "—"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-1 border-t">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {summary && summary.isProfitable ? (
                          <TrendingUp className="size-3 text-success" />
                        ) : (
                          <TrendingDown className="size-3 text-destructive" />
                        )}
                        Margen por Hectárea:
                      </span>
                      <b
                        className={`num font-semibold ${
                          summary && summary.isProfitable ? "text-success" : "text-destructive"
                        }`}
                      >
                        {summary
                          ? `${formatMoney(summary.grossMarginPerHaBs, store.currencyMode, store.exchangeRate, true)}/ha`
                          : "—"}
                      </b>
                    </div>

                    {hasDeliveries && (
                      <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Wheat className="size-3 text-primary" /> Rendimiento:
                        </span>
                        <b className="text-foreground num">{summary?.yieldTonsPerHa} t/ha</b>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-primary font-semibold flex items-center justify-between pt-1">
                    <span>Ver costos y entregas</span>
                    <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </p>
                </div>
              </Panel>
            </Link>
          );
        })}
      </div>
      )}
    </>
  );
}
