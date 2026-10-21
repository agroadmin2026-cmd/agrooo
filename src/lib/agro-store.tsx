import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
  initialLedger,
  initialLots,
  initialMachines,
  initialSupplies,
  initialUsages,
  initialFuelTank,
  initialFuelTransactions,
  initialHarvestDeliveries,
  initialMaintenanceRecords,
  initialRainfalls,
  initialLaborers,
  initialScoutings,
  uid,
  type CurrencyMode,
  type FuelTankInfo,
  type FuelTransaction,
  type HarvestDelivery,
  type LaborType,
  type LedgerEntry,
  type Lot,
  type Machine,
  type MachineUsage,
  type MaintenanceRecord,
  type RainfallRecord,
  type LaborerWorklog,
  type FieldScouting,
  type Supply,
} from "./agro-data";

export interface RegisterUsageParams {
  date: string;
  machineId: string;
  lotId: string;
  operator: string;
  laborType?: LaborType | string | undefined;
  startHours: number;
  endHours: number;
  supplyId?: string | undefined;
  supplyQty?: number | undefined;
  dieselLiters?: number | undefined;
  notes?: string | undefined;
}

export interface RegisterUsageResult {
  usage: MachineUsage;
  ledgerEntry: LedgerEntry;
  hoursOperated: number;
  operatingCost: number;
  costPerHectare?: number | undefined;
  previousHourmeter: number;
  newHourmeter: number;
  machineName: string;
  lotName: string;
  supplyDeducted?: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    previousStock: number;
    remainingStock: number;
  } | undefined;
  dieselDeductedLiters?: number | undefined;
}

export interface LotFinancialSummary {
  lot: Lot;
  revenueBs: number;
  expensesBs: number;
  grossMarginBs: number;
  grossMarginPerHaBs: number;
  harvestTons: number;
  yieldTonsPerHa: number;
  machineHours: number;
  machineCostBs: number;
  supplyCostBs: number;
  dieselCostBs: number;
  laborCostBs: number;
  isProfitable: boolean;
}

interface Store {
  currencyMode: CurrencyMode;
  exchangeRate: number;
  supplies: Supply[];
  lots: Lot[];
  machines: Machine[];
  usages: MachineUsage[];
  ledger: LedgerEntry[];
  fuelTank: FuelTankInfo;
  fuelTransactions: FuelTransaction[];
  harvestDeliveries: HarvestDelivery[];
  maintenanceRecords: MaintenanceRecord[];
  rainfalls: RainfallRecord[];
  laborers: LaborerWorklog[];
  scoutings: FieldScouting[];

  setCurrencyMode: (mode: CurrencyMode) => void;
  setExchangeRate: (rate: number) => void;
  upsertSupply: (s: Omit<Supply, "id"> & { id?: string | undefined }) => void;
  registerUsage: (u: RegisterUsageParams) => RegisterUsageResult;
  addLedger: (e: Omit<LedgerEntry, "id">) => void;
  addFuelTransaction: (tx: Omit<FuelTransaction, "id">) => void;
  addHarvestDelivery: (h: Omit<HarvestDelivery, "id">) => void;
  addMaintenanceRecord: (m: Omit<MaintenanceRecord, "id">) => void;
  addRainfallRecord: (r: Omit<RainfallRecord, "id">) => RainfallRecord;
  addLaborerWorklog: (l: Omit<LaborerWorklog, "id" | "totalCostBs">) => LaborerWorklog;
  toggleLaborerPaid: (id: string) => void;
  addFieldScouting: (s: Omit<FieldScouting, "id">) => FieldScouting;
  getLotFinancialSummary: (lotId: string) => LotFinancialSummary | null;
  resetAllData: () => void;
}

const STORAGE_KEY = "agroadmin_erp_state_v4";

const Ctx = createContext<Store | null>(null);

function loadInitialState() {
  const fallback = {
    currencyMode: "BOB" as CurrencyMode,
    exchangeRate: 6.96,
    supplies: initialSupplies,
    machines: initialMachines,
    usages: initialUsages,
    ledger: initialLedger,
    lots: initialLots,
    fuelTank: initialFuelTank,
    fuelTransactions: initialFuelTransactions,
    harvestDeliveries: initialHarvestDeliveries,
    maintenanceRecords: initialMaintenanceRecords,
    rainfalls: initialRainfalls,
    laborers: initialLaborers,
    scoutings: initialScoutings,
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("agroadmin_erp_state_v3");
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      currencyMode: parsed.currencyMode === "USD" ? ("USD" as CurrencyMode) : ("BOB" as CurrencyMode),
      exchangeRate:
        typeof parsed.exchangeRate === "number" && parsed.exchangeRate > 0 ? parsed.exchangeRate : 6.96,
      supplies: Array.isArray(parsed.supplies) ? parsed.supplies : initialSupplies,
      machines: Array.isArray(parsed.machines) ? parsed.machines : initialMachines,
      usages: Array.isArray(parsed.usages) ? parsed.usages : initialUsages,
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : initialLedger,
      lots: Array.isArray(parsed.lots) ? parsed.lots : initialLots,
      fuelTank: parsed.fuelTank || initialFuelTank,
      fuelTransactions: Array.isArray(parsed.fuelTransactions)
        ? parsed.fuelTransactions
        : initialFuelTransactions,
      harvestDeliveries: Array.isArray(parsed.harvestDeliveries)
        ? parsed.harvestDeliveries
        : initialHarvestDeliveries,
      maintenanceRecords: Array.isArray(parsed.maintenanceRecords)
        ? parsed.maintenanceRecords
        : initialMaintenanceRecords,
      rainfalls: Array.isArray(parsed.rainfalls) ? parsed.rainfalls : initialRainfalls,
      laborers: Array.isArray(parsed.laborers) ? parsed.laborers : initialLaborers,
      scoutings: Array.isArray(parsed.scoutings) ? parsed.scoutings : initialScoutings,
    };
  } catch {
    return fallback;
  }
}

export function AgroProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadInitialState);
  const [supplies, setSupplies] = useState<Supply[]>(initial.supplies);
  const [machines, setMachines] = useState<Machine[]>(initial.machines);
  const [usages, setUsages] = useState<MachineUsage[]>(initial.usages);
  const [ledger, setLedger] = useState<LedgerEntry[]>(initial.ledger);
  const [lots, setLots] = useState<Lot[]>(initial.lots);
  const [fuelTank, setFuelTank] = useState<FuelTankInfo>(initial.fuelTank);
  const [fuelTransactions, setFuelTransactions] = useState<FuelTransaction[]>(
    initial.fuelTransactions
  );
  const [harvestDeliveries, setHarvestDeliveries] = useState<HarvestDelivery[]>(
    initial.harvestDeliveries
  );
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(
    initial.maintenanceRecords
  );
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>(initial.currencyMode);
  const [exchangeRate, setExchangeRate] = useState<number>(initial.exchangeRate);
  const [rainfalls, setRainfalls] = useState<RainfallRecord[]>(initial.rainfalls);
  const [laborers, setLaborers] = useState<LaborerWorklog[]>(initial.laborers);
  const [scoutings, setScoutings] = useState<FieldScouting[]>(initial.scoutings);

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            currencyMode,
            exchangeRate,
            supplies,
            machines,
            usages,
            ledger,
            lots,
            fuelTank,
            fuelTransactions,
            harvestDeliveries,
            maintenanceRecords,
            rainfalls,
            laborers,
            scoutings,
          })
        );
      } catch (err) {
        console.warn("Error guardando en localStorage:", err);
      }
    }
  }, [
    currencyMode,
    exchangeRate,
    supplies,
    machines,
    usages,
    ledger,
    lots,
    fuelTank,
    fuelTransactions,
    harvestDeliveries,
    maintenanceRecords,
    rainfalls,
    laborers,
    scoutings,
  ]);

  const resetAllData = () => {
    setCurrencyMode("BOB");
    setExchangeRate(6.96);
    setSupplies(initialSupplies);
    setMachines(initialMachines);
    setUsages(initialUsages);
    setLedger(initialLedger);
    setLots(initialLots);
    setFuelTank(initialFuelTank);
    setFuelTransactions(initialFuelTransactions);
    setHarvestDeliveries(initialHarvestDeliveries);
    setMaintenanceRecords(initialMaintenanceRecords);
    setRainfalls(initialRainfalls);
    setLaborers(initialLaborers);
    setScoutings(initialScoutings);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const upsertSupply: Store["upsertSupply"] = (s) =>
    setSupplies((prev) =>
      s.id
        ? prev.map((p) => (p.id === s.id ? { ...p, ...s, id: p.id } : p))
        : [{ ...s, id: uid() }, ...prev]
    );

  const addLedger: Store["addLedger"] = (e) =>
    setLedger((prev) => [{ ...e, id: uid() }, ...prev]);

  /**
   * Registra uso de maquinaria: horómetro, stock, diésel, libro contable.
   */
  const registerUsage: Store["registerUsage"] = (u) => {
    const machine = machines.find((m) => m.id === u.machineId);
    if (!machine) {
      throw new Error(`Máquina con ID ${u.machineId} no encontrada`);
    }

    const lot = lots.find((l) => l.id === u.lotId);
    const lotName = lot ? lot.name : "Lote sin especificar";

    if (u.endHours <= u.startHours) {
      throw new Error("El horómetro final debe ser estrictamente mayor al horómetro inicial.");
    }

    const hoursOperated = Math.round((u.endHours - u.startHours) * 100) / 100;
    const operatingCost = Math.round(hoursOperated * machine.hourlyCost * 100) / 100;
    const costPerHectare =
      lot && lot.hectares > 0
        ? Math.round((operatingCost / lot.hectares) * 100) / 100
        : undefined;

    const previousHourmeter = machine.hourmeter;
    const newHourmeter = Math.max(machine.hourmeter, u.endHours);

    // 1. Insumo
    let supplyDeduction: RegisterUsageResult["supplyDeducted"] = undefined;
    let targetSupply: Supply | undefined = undefined;

    if (u.supplyId && u.supplyQty && u.supplyQty > 0) {
      targetSupply = supplies.find((s) => s.id === u.supplyId);
      if (!targetSupply) {
        throw new Error(`Insumo con ID ${u.supplyId} no encontrado en almacén.`);
      }
      if (u.supplyQty > targetSupply.stock) {
        throw new Error(
          `Stock insuficiente de ${targetSupply.name}: disponible ${targetSupply.stock} ${targetSupply.unit}, solicitado ${u.supplyQty} ${targetSupply.unit}.`
        );
      }
      supplyDeduction = {
        id: targetSupply.id,
        name: targetSupply.name,
        quantity: u.supplyQty,
        unit: targetSupply.unit,
        previousStock: targetSupply.stock,
        remainingStock: Math.max(0, targetSupply.stock - u.supplyQty),
      };
    }

    // 2. Diésel
    let dieselDeductedLiters: number | undefined = undefined;
    if (u.dieselLiters && u.dieselLiters > 0) {
      dieselDeductedLiters = u.dieselLiters;
    }

    // 3. Objeto de uso
    const newUsage: MachineUsage = {
      id: uid(),
      date: u.date,
      machineId: u.machineId,
      lotId: u.lotId,
      operator: u.operator.trim(),
      laborType: u.laborType || undefined,
      startHours: u.startHours,
      endHours: u.endHours,
      supplyId: u.supplyId || undefined,
      supplyQty: u.supplyId && u.supplyQty ? u.supplyQty : undefined,
      dieselLiters: u.dieselLiters || undefined,
      operatingCost,
      costPerHectare,
      notes: u.notes?.trim() || undefined,
    };

    // 4. Asiento contable
    const laborPrefix = u.laborType ? `${u.laborType}: ` : "Labor con ";
    const newLedgerEntry: LedgerEntry = {
      id: uid(),
      date: u.date,
      description: `${laborPrefix}${machine.name} en ${lotName} (${u.operator}) · ${hoursOperated}h @ Bs ${machine.hourlyCost}/h`,
      category: "Maquinaria",
      type: "egreso",
      amount: operatingCost,
      lotId: u.lotId,
    };

    setUsages((prev) => [newUsage, ...prev]);

    setMachines((prev) =>
      prev.map((m) => (m.id === u.machineId ? { ...m, hourmeter: newHourmeter } : m))
    );

    // Actualizar inventario de insumos y tanque cisterna de diésel
    setSupplies((prev) =>
      prev.map((s) => {
        if (u.supplyId && s.id === u.supplyId && u.supplyQty) {
          return { ...s, stock: Math.max(0, s.stock - u.supplyQty) };
        }
        if (
          dieselDeductedLiters &&
          s.category === "Combustibles" &&
          s.stock >= dieselDeductedLiters
        ) {
          return { ...s, stock: Math.max(0, s.stock - dieselDeductedLiters) };
        }
        return s;
      })
    );

    if (dieselDeductedLiters) {
      setFuelTransactions((prev) => [
        {
          id: uid(),
          date: u.date,
          type: "despacho",
          liters: dieselDeductedLiters!,
          pricePerLiter: 3.72,
          totalCostBs: Math.round(dieselDeductedLiters! * 3.72 * 100) / 100,
          destinationOrSource: `${machine.name} (${u.laborType ?? "Labor"})`,
          machineId: machine.id,
          operator: u.operator,
          notes: `Labor en ${lotName}`,
        },
        ...prev,
      ]);
    }

    setLedger((prev) => [newLedgerEntry, ...prev]);

    return {
      usage: newUsage,
      ledgerEntry: newLedgerEntry,
      hoursOperated,
      operatingCost,
      costPerHectare,
      previousHourmeter,
      newHourmeter,
      machineName: machine.name,
      lotName,
      supplyDeducted: supplyDeduction,
      dieselDeductedLiters,
    };
  };

  /**
   * Registro de transacciones de combustible (Diésel Oíl):
   * Ingreso (carga de cisterna) o Despacho a vehículo.
   */
  const addFuelTransaction: Store["addFuelTransaction"] = (tx) => {
    const newTx: FuelTransaction = { ...tx, id: uid() };
    setFuelTransactions((prev) => [newTx, ...prev]);

    // Actualizar stock de combustible en insumos
    setSupplies((prev) =>
      prev.map((s) => {
        if (s.category === "Combustibles") {
          const delta = tx.type === "ingreso" ? tx.liters : -tx.liters;
          return { ...s, stock: Math.max(0, s.stock + delta) };
        }
        return s;
      })
    );

    // Si es ingreso (compra de diésel), imputar asiento contable de egreso
    if (tx.type === "ingreso") {
      addLedger({
        date: tx.date,
        description: `Compra Diésel Oíl B-SISA (${tx.liters} L @ Bs ${tx.pricePerLiter}/L) ${tx.invoiceNumber ? `Fac. ${tx.invoiceNumber}` : ""}`,
        category: "Combustibles",
        type: "egreso",
        amount: tx.totalCostBs,
      });
    }
  };

  /**
   * Registro de entrega y liquidación de cosecha en Silos:
   * Genera el comprobante de balanza y el ingreso en el Libro Contable.
   */
  const addHarvestDelivery: Store["addHarvestDelivery"] = (h) => {
    const newHarvest: HarvestDelivery = { ...h, id: uid() };
    setHarvestDeliveries((prev) => [newHarvest, ...prev]);

    const targetLot = lots.find((l) => l.id === h.lotId);
    const lotName = targetLot ? targetLot.name : "Lote";

    // Asiento contable automático de ingreso
    addLedger({
      date: h.date,
      description: `Liquidación Cosecha ${h.crop}: ${h.payableTons.toFixed(2)} t en ${h.siloDestination} (${lotName} - Ticket ${h.ticketNumber})`,
      category: "Venta de Cosecha",
      type: "ingreso",
      amount: h.totalAmountBs,
      lotId: h.lotId,
    });
  };

  /**
   * Registro de mantenimiento de maquinaria y reseteo de horómetro de service.
   */
  const addMaintenanceRecord: Store["addMaintenanceRecord"] = (m) => {
    const newMnt: MaintenanceRecord = { ...m, id: uid() };
    setMaintenanceRecords((prev) => [newMnt, ...prev]);

    const machine = machines.find((x) => x.id === m.machineId);

    // Actualizar horómetro de último service de la máquina
    if (machine) {
      setMachines((prev) =>
        prev.map((x) =>
          x.id === m.machineId
            ? { ...x, lastServiceHourmeter: m.hourmeter, status: "Operativa" }
            : x
        )
      );

      addLedger({
        date: m.date,
        description: `Mantenimiento ${m.serviceType}: ${machine.name} (${m.partsReplaced})`,
        category: "Mantenimiento",
        type: "egreso",
        amount: m.costBs,
      });
    }
  };

  /**
   * Registro pluviométrico de precipitaciones (lluvias en mm).
   */
  const addRainfallRecord: Store["addRainfallRecord"] = (r) => {
    const record: RainfallRecord = { ...r, id: uid() };
    setRainfalls((prev) => [record, ...prev]);
    return record;
  };

  /**
   * Registro de jornales y mano de obra de campo:
   * Genera el comprobante y el egreso contable en el Libro Diario.
   */
  const addLaborerWorklog: Store["addLaborerWorklog"] = (l) => {
    const totalCostBs = l.daysWorked * l.dailyRateBs;
    const worklog: LaborerWorklog = { ...l, totalCostBs, id: uid() };
    setLaborers((prev) => [worklog, ...prev]);

    const targetLot = lots.find((x) => x.id === l.lotId);
    const lotName = targetLot ? targetLot.name : "Lote";

    addLedger({
      date: l.date,
      description: `Jornal (${l.workerName}): ${l.taskDescription} (${l.daysWorked} d @ Bs ${l.dailyRateBs}) - ${lotName}`,
      category: "Jornales",
      type: "egreso",
      amount: totalCostBs,
      lotId: l.lotId,
    });

    return worklog;
  };

  /**
   * Alternar estado de liquidación/pago de un jornal de campo.
   */
  const toggleLaborerPaid: Store["toggleLaborerPaid"] = (id) => {
    setLaborers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isPaid: !item.isPaid } : item))
    );
  };

  /**
   * Registro de monitoreo de sanidad vegetal, plagas, malezas y fenología.
   */
  const addFieldScouting: Store["addFieldScouting"] = (s) => {
    const scouting: FieldScouting = { ...s, id: uid() };
    setScoutings((prev) => [scouting, ...prev]);
    return scouting;
  };

  /**
   * Cálculo integral del Margen Bruto y P&L por Lote (Bs/ha).
   */
  const getLotFinancialSummary: Store["getLotFinancialSummary"] = (lotId) => {
    const lot = lots.find((l) => l.id === lotId);
    if (!lot) return null;

    // 1. Ingresos por cosecha
    const deliveries = harvestDeliveries.filter((h) => h.lotId === lotId);
    const harvestTons = deliveries.reduce((acc, d) => acc + d.payableTons, 0);
    const revenueBs = deliveries.reduce((acc, d) => acc + d.totalAmountBs, 0);

    // 2. Costos de maquinaria, insumos y diésel
    const lotUsages = usages.filter((u) => u.lotId === lotId);
    let machineHours = 0;
    let machineCostBs = 0;
    let supplyCostBs = 0;
    let dieselCostBs = 0;

    for (const u of lotUsages) {
      const h = u.endHours - u.startHours;
      machineHours += h;
      const m = machines.find((x) => x.id === u.machineId);
      machineCostBs += u.operatingCost ?? h * (m?.hourlyCost ?? 0);

      if (u.supplyId && u.supplyQty) {
        const s = supplies.find((x) => x.id === u.supplyId);
        if (s) {
          supplyCostBs += u.supplyQty * s.unitCost;
        }
      }

      if (u.dieselLiters) {
        dieselCostBs += u.dieselLiters * 3.72;
      }
    }

    // 3. Costos de jornales y mano de obra del lote
    const lotLaborers = laborers.filter((w) => w.lotId === lotId);
    const laborCostBs = lotLaborers.reduce((acc, w) => acc + w.totalCostBs, 0);

    // 4. Otros egresos directos imputados al lote en contabilidad (excluyendo maquinaria y jornales para no duplicar)
    const otherLotExpenses = ledger
      .filter(
        (e) =>
          e.lotId === lotId &&
          e.type === "egreso" &&
          e.category !== "Maquinaria" &&
          e.category !== "Jornales"
      )
      .reduce((acc, e) => acc + e.amount, 0);

    const expensesBs = machineCostBs + supplyCostBs + dieselCostBs + laborCostBs + otherLotExpenses;
    const grossMarginBs = revenueBs - expensesBs;
    const grossMarginPerHaBs = lot.hectares > 0 ? grossMarginBs / lot.hectares : 0;
    const yieldTonsPerHa = lot.hectares > 0 ? harvestTons / lot.hectares : 0;

    return {
      lot,
      revenueBs,
      expensesBs,
      grossMarginBs,
      grossMarginPerHaBs: Math.round(grossMarginPerHaBs * 100) / 100,
      harvestTons: Math.round(harvestTons * 100) / 100,
      yieldTonsPerHa: Math.round(yieldTonsPerHa * 100) / 100,
      machineHours: Math.round(machineHours * 10) / 10,
      machineCostBs: Math.round(machineCostBs * 100) / 100,
      supplyCostBs: Math.round(supplyCostBs * 100) / 100,
      dieselCostBs: Math.round(dieselCostBs * 100) / 100,
      laborCostBs: Math.round(laborCostBs * 100) / 100,
      isProfitable: grossMarginBs >= 0,
    };
  };

  return (
    <Ctx.Provider
      value={{
        currencyMode,
        exchangeRate,
        supplies,
        lots,
        machines,
        usages,
        ledger,
        fuelTank,
        fuelTransactions,
        harvestDeliveries,
        maintenanceRecords,
        rainfalls,
        laborers,
        scoutings,
        setCurrencyMode,
        setExchangeRate,
        upsertSupply,
        registerUsage,
        addLedger,
        addFuelTransaction,
        addHarvestDelivery,
        addMaintenanceRecord,
        addRainfallRecord,
        addLaborerWorklog,
        toggleLaborerPaid,
        addFieldScouting,
        getLotFinancialSummary,
        resetAllData,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAgro() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAgro must be used inside AgroProvider");
  return c;
}

export function lotCosts(store: Pick<Store, "usages" | "machines" | "supplies">, lotId: string) {
  const us = store.usages.filter((u) => u.lotId === lotId);
  let hours = 0,
    machineCost = 0,
    supplyCost = 0;
  const applied: { supply: Supply; qty: number; cost: number; date: string }[] = [];
  for (const u of us) {
    const h = u.endHours - u.startHours;
    hours += h;
    machineCost += h * (store.machines.find((m) => m.id === u.machineId)?.hourlyCost ?? 0);
    const s = u.supplyId ? store.supplies.find((x) => x.id === u.supplyId) : undefined;
    if (s && u.supplyQty) {
      const c = u.supplyQty * s.unitCost;
      supplyCost += c;
      applied.push({ supply: s, qty: u.supplyQty, cost: c, date: u.date });
    }
  }
  return { usages: us, hours, machineCost, supplyCost, applied, total: machineCost + supplyCost };
}
