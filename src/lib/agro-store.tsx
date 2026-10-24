import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
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
  initialBsisaPermits,
  initialVehicles,
  initialVehicleFuelLogs,
  initialVehicleMaintenanceLogs,
  computeBsisaStatus,
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
  type BsisaPermit,
  type Vehicle,
  type VehicleFuelLog,
  type VehicleMaintenanceLog,
} from "./agro-data";
import { getSupabaseConfig, testSupabaseConnection } from "./supabase";
import {
  fetchRemoteData,
  syncLotToRemote,
  syncSupplyToRemote,
  syncMachineToRemote,
  syncUsageToRemote,
  syncFuelTransactionToRemote,
  syncHarvestDeliveryToRemote,
  syncMaintenanceToRemote,
  syncRainfallToRemote,
  syncLaborerToRemote,
  toggleLaborerPaidInRemote,
  syncScoutingToRemote,
  syncLedgerToRemote,
  syncBsisaPermitToRemote,
  deleteBsisaPermitInRemote,
  syncSettingsToRemote,
  exportLocalDataToSupabase,
  syncVehicleToRemote,
  syncVehicleFuelLogToRemote,
  syncVehicleMaintenanceLogToRemote,
} from "./supabase-service";
import { getVehicleDefaultEmoji } from "./agro-data";

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
  supplyDeducted?:
    | {
        id: string;
        name: string;
        quantity: number;
        unit: string;
        previousStock: number;
        remainingStock: number;
      }
    | undefined;
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
  bsisaPermits: BsisaPermit[];
  vehicles: Vehicle[];
  vehicleFuelLogs: VehicleFuelLog[];
  vehicleMaintenanceLogs: VehicleMaintenanceLog[];
  bsisaAlerts: {
    expiredCount: number;
    expiringSoonCount: number;
  };

  // Supabase Cloud State
  isCloudConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  refreshFromCloud: () => Promise<boolean>;
  uploadLocalToCloud: () => Promise<{ success: boolean; message: string }>;

  setCurrencyMode: (mode: CurrencyMode) => void;
  setExchangeRate: (rate: number) => void;
  upsertLot: (l: Omit<Lot, "id"> & { id?: string | undefined }) => void;
  upsertMachine: (m: Omit<Machine, "id"> & { id?: string | undefined }) => void;
  upsertSupply: (s: Omit<Supply, "id"> & { id?: string | undefined }) => void;
  registerUsage: (u: RegisterUsageParams) => RegisterUsageResult;
  addLedger: (e: Omit<LedgerEntry, "id">) => void;
  reverseLedgerEntry: (entryId: string, reason: string) => LedgerEntry;
  addFuelTransaction: (tx: Omit<FuelTransaction, "id">) => void;
  addHarvestDelivery: (h: Omit<HarvestDelivery, "id">) => void;
  addMaintenanceRecord: (m: Omit<MaintenanceRecord, "id">) => void;
  addRainfallRecord: (r: Omit<RainfallRecord, "id">) => RainfallRecord;
  addLaborerWorklog: (l: Omit<LaborerWorklog, "id" | "totalCostBs">) => LaborerWorklog;
  toggleLaborerPaid: (id: string) => void;
  addFieldScouting: (s: Omit<FieldScouting, "id">) => FieldScouting;
  upsertBsisaPermit: (p: Omit<BsisaPermit, "id"> & { id?: string | undefined }) => BsisaPermit;
  deleteBsisaPermit: (id: string) => void;
  upsertVehicle: (v: Omit<Vehicle, "id"> & { id?: string | undefined }) => void;
  addVehicleFuelLog: (
    log: Omit<VehicleFuelLog, "id" | "totalCostBs" | "calculatedKmPerLiter" | "costPerKmBs">,
  ) => VehicleFuelLog;
  addVehicleMaintenanceLog: (log: Omit<VehicleMaintenanceLog, "id">) => VehicleMaintenanceLog;
  updateVehiclePhoto: (vehicleId: string, imageUrl: string) => void;
  getLotFinancialSummary: (lotId: string) => LotFinancialSummary | null;
  resetAllData: () => void;
}

const STORAGE_KEY = "agroadmin_erp_state_v7";

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
    bsisaPermits: initialBsisaPermits,
    vehicles: initialVehicles,
    vehicleFuelLogs: initialVehicleFuelLogs,
    vehicleMaintenanceLogs: initialVehicleMaintenanceLogs,
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      currencyMode:
        parsed.currencyMode === "USD" ? ("USD" as CurrencyMode) : ("BOB" as CurrencyMode),
      exchangeRate:
        typeof parsed.exchangeRate === "number" && parsed.exchangeRate > 0
          ? parsed.exchangeRate
          : 6.96,
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
      bsisaPermits: Array.isArray(parsed.bsisaPermits)
        ? parsed.bsisaPermits.map((p: BsisaPermit) => ({
            ...p,
            status: computeBsisaStatus(p.expiryDate, p.status),
          }))
        : initialBsisaPermits,
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : initialVehicles,
      vehicleFuelLogs: Array.isArray(parsed.vehicleFuelLogs)
        ? parsed.vehicleFuelLogs
        : initialVehicleFuelLogs,
      vehicleMaintenanceLogs: Array.isArray(parsed.vehicleMaintenanceLogs)
        ? parsed.vehicleMaintenanceLogs
        : initialVehicleMaintenanceLogs,
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
    initial.fuelTransactions,
  );
  const [harvestDeliveries, setHarvestDeliveries] = useState<HarvestDelivery[]>(
    initial.harvestDeliveries,
  );
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(
    initial.maintenanceRecords,
  );
  const [currencyMode, setCurrencyModeState] = useState<CurrencyMode>(initial.currencyMode);
  const [exchangeRate, setExchangeRateState] = useState<number>(initial.exchangeRate);
  const [rainfalls, setRainfalls] = useState<RainfallRecord[]>(initial.rainfalls);
  const [laborers, setLaborers] = useState<LaborerWorklog[]>(initial.laborers);
  const [scoutings, setScoutings] = useState<FieldScouting[]>(initial.scoutings);
  const [bsisaPermits, setBsisaPermits] = useState<BsisaPermit[]>(initial.bsisaPermits);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initial.vehicles);
  const [vehicleFuelLogs, setVehicleFuelLogs] = useState<VehicleFuelLog[]>(initial.vehicleFuelLogs);
  const [vehicleMaintenanceLogs, setVehicleMaintenanceLogs] = useState<VehicleMaintenanceLog[]>(
    initial.vehicleMaintenanceLogs,
  );

  // Supabase Cloud State
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(() => {
    return getSupabaseConfig().isConfigured;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

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
            bsisaPermits,
            vehicles,
            vehicleFuelLogs,
            vehicleMaintenanceLogs,
          }),
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
    bsisaPermits,
    vehicles,
    vehicleFuelLogs,
    vehicleMaintenanceLogs,
  ]);

  // Carga inicial y chequeo de conexión con Supabase en background
  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) {
      setIsCloudConnected(false);
      return;
    }

    let isMounted = true;
    testSupabaseConnection().then((res) => {
      if (!isMounted) return;
      setIsCloudConnected(res.ok);
      if (res.ok) {
        // Carga silenciosa en arranque si hay datos en Supabase
        fetchRemoteData().then((remote) => {
          if (!isMounted || !remote) return;
          if (remote.lots.length > 0 || remote.machines.length > 0) {
            setCurrencyModeState(remote.currencyMode);
            setExchangeRateState(remote.exchangeRate);
            setLots(remote.lots);
            setSupplies(remote.supplies);
            setMachines(remote.machines);
            setUsages(remote.usages);
            setLedger(remote.ledger);
            setFuelTank(remote.fuelTank);
            setFuelTransactions(remote.fuelTransactions);
            setHarvestDeliveries(remote.harvestDeliveries);
            setMaintenanceRecords(remote.maintenanceRecords);
            setRainfalls(remote.rainfalls);
            setLaborers(remote.laborers);
            setScoutings(remote.scoutings);
            if (remote.bsisaPermits && remote.bsisaPermits.length > 0) {
              setBsisaPermits(remote.bsisaPermits);
            }
            setLastSyncTime(new Date());
          }
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshFromCloud = useCallback(async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      const remote = await fetchRemoteData();
      if (!remote) {
        setIsSyncing(false);
        return false;
      }
      setCurrencyModeState(remote.currencyMode);
      setExchangeRateState(remote.exchangeRate);
      setLots(remote.lots);
      setSupplies(remote.supplies);
      setMachines(remote.machines);
      setUsages(remote.usages);
      setLedger(remote.ledger);
      setFuelTank(remote.fuelTank);
      setFuelTransactions(remote.fuelTransactions);
      setHarvestDeliveries(remote.harvestDeliveries);
      setMaintenanceRecords(remote.maintenanceRecords);
      setRainfalls(remote.rainfalls);
      setLaborers(remote.laborers);
      setScoutings(remote.scoutings);
      if (remote.bsisaPermits) {
        setBsisaPermits(remote.bsisaPermits);
      }
      setLastSyncTime(new Date());
      setIsCloudConnected(true);
      setIsSyncing(false);
      return true;
    } catch {
      setIsSyncing(false);
      return false;
    }
  }, []);

  const uploadLocalToCloud = useCallback(async () => {
    setIsSyncing(true);
    const res = await exportLocalDataToSupabase({
      currencyMode,
      exchangeRate,
      fuelTank,
      lots,
      supplies,
      machines,
      usages,
      fuelTransactions,
      harvestDeliveries,
      maintenanceRecords,
      rainfalls,
      laborers,
      scoutings,
      ledger,
      bsisaPermits,
      vehicles,
      vehicleFuelLogs,
      vehicleMaintenanceLogs,
    });
    setIsSyncing(false);
    if (res.success) {
      setLastSyncTime(new Date());
      setIsCloudConnected(true);
    }
    return res;
  }, [
    currencyMode,
    exchangeRate,
    fuelTank,
    lots,
    supplies,
    machines,
    usages,
    fuelTransactions,
    harvestDeliveries,
    maintenanceRecords,
    rainfalls,
    laborers,
    scoutings,
    ledger,
    bsisaPermits,
    vehicles,
    vehicleFuelLogs,
    vehicleMaintenanceLogs,
  ]);

  const setCurrencyMode: Store["setCurrencyMode"] = (mode) => {
    setCurrencyModeState(mode);
    syncSettingsToRemote(mode, exchangeRate, fuelTank).catch(() => {});
  };

  const setExchangeRate: Store["setExchangeRate"] = (rate) => {
    setExchangeRateState(rate);
    syncSettingsToRemote(currencyMode, rate, fuelTank).catch(() => {});
  };

  const resetAllData = () => {
    setCurrencyModeState("BOB");
    setExchangeRateState(6.96);
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
    setBsisaPermits(initialBsisaPermits);
    setVehicles(initialVehicles);
    setVehicleFuelLogs(initialVehicleFuelLogs);
    setVehicleMaintenanceLogs(initialVehicleMaintenanceLogs);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("agroadmin_erp_state_v6");
      localStorage.removeItem("agroadmin_erp_state_v5");
    }
  };

  const upsertLot: Store["upsertLot"] = (l) => {
    const lotObj: Lot = { ...l, id: l.id || uid() };
    setLots((prev) => (l.id ? prev.map((p) => (p.id === l.id ? lotObj : p)) : [lotObj, ...prev]));
    syncLotToRemote(lotObj).catch(() => {});
  };

  const upsertMachine: Store["upsertMachine"] = (m) => {
    const machObj: Machine = { ...m, id: m.id || uid() };
    setMachines((prev) =>
      m.id ? prev.map((p) => (p.id === m.id ? machObj : p)) : [machObj, ...prev],
    );
    syncMachineToRemote(machObj).catch(() => {});
  };

  const upsertSupply: Store["upsertSupply"] = (s) => {
    const supplyObj: Supply = { ...s, id: s.id || uid() };
    setSupplies((prev) =>
      s.id ? prev.map((p) => (p.id === s.id ? supplyObj : p)) : [supplyObj, ...prev],
    );
    syncSupplyToRemote(supplyObj).catch(() => {});
  };

  const addLedger: Store["addLedger"] = (e) => {
    const newEntry: LedgerEntry = { ...e, id: uid() };
    setLedger((prev) => [newEntry, ...prev]);
    syncLedgerToRemote(newEntry).catch(() => {});
  };

  /**
   * Anulación / Reversión Contable Inmutable (Contra-asiento):
   * En auditoría financiera nunca se hace DELETE; se asienta la contrapartida.
   */
  const reverseLedgerEntry: Store["reverseLedgerEntry"] = (entryId, reason) => {
    const target = ledger.find((e) => e.id === entryId);
    if (!target) {
      throw new Error(`Asiento contable con ID ${entryId} no encontrado`);
    }
    if (target.isReversal) {
      throw new Error("No se puede reversar un contra-asiento existente.");
    }
    const alreadyReversed = ledger.some((e) => e.reversalOfId === entryId);
    if (alreadyReversed) {
      throw new Error("Este asiento contable ya ha sido anulado previamente.");
    }

    const cleanReason =
      (reason || "").replace(/[<>]/g, "").trim() || "Anulación contable autorizada";
    const reversalType = target.type === "ingreso" ? "egreso" : "ingreso";
    const reversalEntry: LedgerEntry = {
      id: uid(),
      date: new Date().toISOString().slice(0, 10),
      description: `[CONTRA-ASIENTO / ANULACIÓN] ${cleanReason} (Ref. #${target.id.slice(0, 8)}: ${target.description})`,
      category: target.category,
      type: reversalType,
      amount: target.amount,
      lotId: target.lotId,
      isReversal: true,
      reversalOfId: target.id,
      reversalReason: cleanReason,
    };

    setLedger((prev) => [reversalEntry, ...prev]);
    syncLedgerToRemote(reversalEntry).catch(() => {});
    return reversalEntry;
  };

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
      lot && lot.hectares > 0 ? Math.round((operatingCost / lot.hectares) * 100) / 100 : undefined;

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
          `Stock insuficiente de ${targetSupply.name}: disponible ${targetSupply.stock} ${targetSupply.unit}, solicitado ${u.supplyQty} ${targetSupply.unit}.`,
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

    // Actualizaciones de estado local
    setUsages((prev) => [newUsage, ...prev]);

    setMachines((prev) =>
      prev.map((m) => (m.id === u.machineId ? { ...m, hourmeter: newHourmeter } : m)),
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
      }),
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

    // Sincronización asíncrona a Supabase (Background)
    syncUsageToRemote(
      newUsage,
      { ...machine, hourmeter: newHourmeter },
      newLedgerEntry,
      supplyDeduction
        ? { id: supplyDeduction.id, remainingStock: supplyDeduction.remainingStock }
        : undefined,
    ).catch(() => {});

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
      }),
    );

    let relatedLedger: LedgerEntry | undefined = undefined;
    // Si es ingreso (compra de diésel), imputar asiento contable de egreso
    if (tx.type === "ingreso") {
      relatedLedger = {
        id: uid(),
        date: tx.date,
        description: `Compra Diésel Oíl B-SISA (${tx.liters} L @ Bs ${tx.pricePerLiter}/L) ${tx.invoiceNumber ? `Fac. ${tx.invoiceNumber}` : ""}`,
        category: "Combustibles",
        type: "egreso",
        amount: tx.totalCostBs,
      };
      setLedger((prev) => [relatedLedger!, ...prev]);
    }

    syncFuelTransactionToRemote(newTx, relatedLedger).catch(() => {});
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
    const incomeLedger: LedgerEntry = {
      id: uid(),
      date: h.date,
      description: `Liquidación Cosecha ${h.crop}: ${h.payableTons.toFixed(2)} t en ${h.siloDestination} (${lotName} - Ticket ${h.ticketNumber})`,
      category: "Venta de Cosecha",
      type: "ingreso",
      amount: h.totalAmountBs,
      lotId: h.lotId,
    };
    setLedger((prev) => [incomeLedger, ...prev]);

    syncHarvestDeliveryToRemote(newHarvest, incomeLedger).catch(() => {});
  };

  /**
   * Registro de mantenimiento de maquinaria y reseteo de horómetro de service.
   */
  const addMaintenanceRecord: Store["addMaintenanceRecord"] = (m) => {
    const newMnt: MaintenanceRecord = { ...m, id: uid() };
    setMaintenanceRecords((prev) => [newMnt, ...prev]);

    const machine = machines.find((x) => x.id === m.machineId);

    let mntLedger: LedgerEntry | undefined = undefined;
    // Actualizar horómetro de último service de la máquina
    if (machine) {
      const updatedMachine = {
        ...machine,
        lastServiceHourmeter: m.hourmeter,
        status: "Operativa" as const,
      };
      setMachines((prev) => prev.map((x) => (x.id === m.machineId ? updatedMachine : x)));

      mntLedger = {
        id: uid(),
        date: m.date,
        description: `Mantenimiento ${m.serviceType}: ${machine.name} (${m.partsReplaced})`,
        category: "Mantenimiento",
        type: "egreso",
        amount: m.costBs,
      };
      setLedger((prev) => [mntLedger!, ...prev]);

      syncMachineToRemote(updatedMachine).catch(() => {});
    }

    syncMaintenanceToRemote(newMnt, mntLedger).catch(() => {});
  };

  /**
   * Registro pluviométrico de precipitaciones (lluvias en mm).
   */
  const addRainfallRecord: Store["addRainfallRecord"] = (r) => {
    const record: RainfallRecord = { ...r, id: uid() };
    setRainfalls((prev) => [record, ...prev]);
    syncRainfallToRemote(record).catch(() => {});
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

    const laborerLedger: LedgerEntry = {
      id: uid(),
      date: l.date,
      description: `Jornal (${l.workerName}): ${l.taskDescription} (${l.daysWorked} d @ Bs ${l.dailyRateBs}) - ${lotName}`,
      category: "Jornales",
      type: "egreso",
      amount: totalCostBs,
      lotId: l.lotId,
    };
    setLedger((prev) => [laborerLedger, ...prev]);

    syncLaborerToRemote(worklog, laborerLedger).catch(() => {});

    return worklog;
  };

  /**
   * Alternar estado de liquidación/pago de un jornal de campo.
   */
  const toggleLaborerPaid: Store["toggleLaborerPaid"] = (id) => {
    let nextStatus = false;
    setLaborers((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          nextStatus = !item.isPaid;
          return { ...item, isPaid: nextStatus };
        }
        return item;
      }),
    );
    toggleLaborerPaidInRemote(id, nextStatus).catch(() => {});
  };

  /**
   * Registro de monitoreo de sanidad vegetal, plagas, malezas y fenología.
   */
  const addFieldScouting: Store["addFieldScouting"] = (s) => {
    const scouting: FieldScouting = { ...s, id: uid() };
    setScoutings((prev) => [scouting, ...prev]);
    syncScoutingToRemote(scouting).catch(() => {});
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
          e.category !== "Jornales",
      )
      .reduce((acc, e) => acc + e.amount, 0);

    const expensesBs =
      Math.round(
        (machineCostBs + supplyCostBs + dieselCostBs + laborCostBs + otherLotExpenses) * 100,
      ) / 100;
    const grossMarginBs = Math.round((revenueBs - expensesBs) * 100) / 100;
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

  const bsisaAlerts = useMemo(() => {
    let expiredCount = 0;
    let expiringSoonCount = 0;
    for (const p of bsisaPermits) {
      const st = computeBsisaStatus(p.expiryDate, p.status);
      if (st === "Vencido") expiredCount++;
      else if (st === "Por vencer") expiringSoonCount++;
    }
    return { expiredCount, expiringSoonCount };
  }, [bsisaPermits]);

  const upsertBsisaPermit: Store["upsertBsisaPermit"] = (p) => {
    const status = computeBsisaStatus(p.expiryDate, p.status);
    const item: BsisaPermit = {
      id: p.id || uid(),
      permitNumber: p.permitNumber.trim(),
      permitType: p.permitType,
      issuedDate: p.issuedDate,
      expiryDate: p.expiryDate,
      monthlyQuotaLiters: p.monthlyQuotaLiters,
      authorizedStation: p.authorizedStation?.trim() || undefined,
      machineId: p.machineId || undefined,
      status,
      documentNumber: p.documentNumber?.trim() || undefined,
      notes: p.notes?.trim() || undefined,
    };

    setBsisaPermits((prev) => {
      const exists = prev.some((x) => x.id === item.id);
      if (exists) {
        return prev.map((x) => (x.id === item.id ? item : x));
      }
      return [item, ...prev];
    });

    syncBsisaPermitToRemote(item).catch(() => {});
    return item;
  };

  const deleteBsisaPermit: Store["deleteBsisaPermit"] = (id) => {
    setBsisaPermits((prev) => prev.filter((x) => x.id !== id));
    deleteBsisaPermitInRemote(id).catch(() => {});
  };

  const upsertVehicle: Store["upsertVehicle"] = (v) => {
    const item: Vehicle = {
      id: v.id || uid(),
      name: v.name.trim(),
      plate: v.plate.trim().toUpperCase(),
      type: v.type,
      fuelType: v.fuelType,
      currentKm: v.currentKm,
      averageKmPerLiter: v.averageKmPerLiter,
      tankCapacityLiters: v.tankCapacityLiters,
      lastOilChangeKm: v.lastOilChangeKm,
      oilIntervalKm: v.oilIntervalKm,
      lastBrakeChangeKm: v.lastBrakeChangeKm,
      brakeIntervalKm: v.brakeIntervalKm,
      lastAirFilterChangeKm: v.lastAirFilterChangeKm,
      airFilterIntervalKm: v.airFilterIntervalKm,
      lastTireChangeKm: v.lastTireChangeKm,
      tireIntervalKm: v.tireIntervalKm,
      assignedDriver: v.assignedDriver?.trim() || undefined,
      imageUrl: v.imageUrl || undefined,
      emoji: v.emoji || getVehicleDefaultEmoji(v.type),
      notes: v.notes?.trim() || undefined,
    };

    setVehicles((prev) => {
      const exists = prev.some((x) => x.id === item.id);
      return exists ? prev.map((x) => (x.id === item.id ? item : x)) : [item, ...prev];
    });

    syncVehicleToRemote(item).catch(() => {});
  };

  const updateVehiclePhoto: Store["updateVehiclePhoto"] = (vehicleId, imageUrl) => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === vehicleId) {
          const updated = { ...v, imageUrl };
          syncVehicleToRemote(updated).catch(() => {});
          return updated;
        }
        return v;
      }),
    );
  };

  const addVehicleFuelLog: Store["addVehicleFuelLog"] = (log) => {
    const totalCostBs = Math.round(log.liters * log.pricePerLiterBs * 100) / 100;
    const vehicle = vehicles.find((v) => v.id === log.vehicleId);

    // Calcular rendimiento km/L si hay una carga previa con odómetro inferior
    let calculatedKmPerLiter: number | undefined = undefined;
    let costPerKmBs: number | undefined = undefined;
    const previousLogs = vehicleFuelLogs
      .filter((fl) => fl.vehicleId === log.vehicleId && fl.odometerKm < log.odometerKm)
      .sort((a, b) => b.odometerKm - a.odometerKm);

    if (previousLogs.length > 0) {
      const prev = previousLogs[0]!;
      const kmDiff = log.odometerKm - prev.odometerKm;
      if (kmDiff > 0 && log.liters > 0) {
        calculatedKmPerLiter = Math.round((kmDiff / log.liters) * 10) / 10;
        costPerKmBs = Math.round((totalCostBs / kmDiff) * 100) / 100;
      }
    }

    const item: VehicleFuelLog = {
      id: uid(),
      vehicleId: log.vehicleId,
      date: log.date,
      odometerKm: log.odometerKm,
      liters: log.liters,
      pricePerLiterBs: log.pricePerLiterBs,
      totalCostBs,
      fuelType: log.fuelType,
      station: log.station.trim(),
      driver: log.driver.trim(),
      fullTank: log.fullTank,
      calculatedKmPerLiter,
      costPerKmBs,
      receiptPhotoUrl: log.receiptPhotoUrl || undefined,
      notes: log.notes?.trim() || undefined,
    };

    setVehicleFuelLogs((prev) => [item, ...prev]);

    // Actualizar odómetro del vehículo si la carga tiene kilometraje mayor
    if (vehicle && log.odometerKm > vehicle.currentKm) {
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === log.vehicleId) {
            const updated = { ...v, currentKm: log.odometerKm };
            syncVehicleToRemote(updated).catch(() => {});
            return updated;
          }
          return v;
        }),
      );
    }

    // Impacto contable: Asiento de Egreso en Combustibles
    const vehicleName = vehicle ? `${vehicle.name} (${vehicle.plate})` : "Vehículo";
    const newLedgerEntry: LedgerEntry = {
      id: uid(),
      date: log.date,
      description: `Combustible Vehicular: ${vehicleName} · ${log.liters} L @ Bs ${log.pricePerLiterBs}/L (${log.driver} - ${log.station})`,
      category: "Combustibles",
      type: "egreso",
      amount: totalCostBs,
    };
    setLedger((prev) => [newLedgerEntry, ...prev]);

    syncVehicleFuelLogToRemote(item, newLedgerEntry).catch(() => {});

    return item;
  };

  const addVehicleMaintenanceLog: Store["addVehicleMaintenanceLog"] = (log) => {
    const item: VehicleMaintenanceLog = {
      id: uid(),
      vehicleId: log.vehicleId,
      date: log.date,
      odometerKm: log.odometerKm,
      serviceType: log.serviceType,
      partsReplaced: log.partsReplaced.trim(),
      costBs: log.costBs,
      workshopOrMechanic: log.workshopOrMechanic.trim(),
      invoicePhotoUrl: log.invoicePhotoUrl || undefined,
      notes: log.notes?.trim() || undefined,
    };

    setVehicleMaintenanceLogs((prev) => [item, ...prev]);

    // Actualizar vehículo (odómetro y componente reseteado según serviceType)
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== log.vehicleId) return v;
        const updated = { ...v };
        if (log.odometerKm > updated.currentKm) {
          updated.currentKm = log.odometerKm;
        }
        if (log.serviceType === "Cambio de Aceite y Filtros") {
          updated.lastOilChangeKm = log.odometerKm;
          updated.lastAirFilterChangeKm = log.odometerKm;
        } else if (log.serviceType === "Filtro de Aire / Combustible") {
          updated.lastAirFilterChangeKm = log.odometerKm;
        } else if (log.serviceType === "Pastillas y Discos de Freno") {
          updated.lastBrakeChangeKm = log.odometerKm;
        } else if (log.serviceType === "Neumáticos y Alineación") {
          updated.lastTireChangeKm = log.odometerKm;
        }
        syncVehicleToRemote(updated).catch(() => {});
        return updated;
      }),
    );

    // Impacto contable: Asiento de Egreso en Mantenimiento
    const vehicle = vehicles.find((v) => v.id === log.vehicleId);
    const vehicleName = vehicle ? `${vehicle.name} (${vehicle.plate})` : "Vehículo";
    const newLedgerEntry: LedgerEntry = {
      id: uid(),
      date: log.date,
      description: `Mantenimiento Vehicular: ${vehicleName} · ${log.serviceType} (${log.workshopOrMechanic}) - ${log.partsReplaced}`,
      category: "Mantenimiento",
      type: "egreso",
      amount: log.costBs,
    };
    setLedger((prev) => [newLedgerEntry, ...prev]);

    syncVehicleMaintenanceLogToRemote(item, newLedgerEntry).catch(() => {});

    return item;
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
        bsisaPermits,
        bsisaAlerts,
        vehicles,
        vehicleFuelLogs,
        vehicleMaintenanceLogs,
        isCloudConnected,
        isSyncing,
        lastSyncTime,
        refreshFromCloud,
        uploadLocalToCloud,
        setCurrencyMode,
        setExchangeRate,
        upsertLot,
        upsertMachine,
        upsertSupply,
        registerUsage,
        addLedger,
        reverseLedgerEntry,
        addFuelTransaction,
        addHarvestDelivery,
        addMaintenanceRecord,
        addRainfallRecord,
        addLaborerWorklog,
        toggleLaborerPaid,
        addFieldScouting,
        upsertBsisaPermit,
        deleteBsisaPermit,
        upsertVehicle,
        addVehicleFuelLog,
        addVehicleMaintenanceLog,
        updateVehiclePhoto,
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
