import { getSupabaseClient } from "./supabase";
import {
  computeBsisaStatus,
  type BsisaPermit,
  type CurrencyMode,
  type FieldScouting,
  type FuelTankInfo,
  type FuelTransaction,
  type HarvestDelivery,
  type LaborerWorklog,
  type LedgerEntry,
  type Lot,
  type Machine,
  type MachineUsage,
  type MaintenanceRecord,
  type RainfallRecord,
  type Supply,
  type Vehicle,
  type VehicleFuelLog,
  type VehicleMaintenanceLog,
} from "./agro-data";

export interface RemoteStoreData {
  currencyMode: CurrencyMode;
  exchangeRate: number;
  fuelTank: FuelTankInfo;
  lots: Lot[];
  supplies: Supply[];
  machines: Machine[];
  usages: MachineUsage[];
  fuelTransactions: FuelTransaction[];
  harvestDeliveries: HarvestDelivery[];
  maintenanceRecords: MaintenanceRecord[];
  rainfalls: RainfallRecord[];
  laborers: LaborerWorklog[];
  scoutings: FieldScouting[];
  ledger: LedgerEntry[];
  bsisaPermits: BsisaPermit[];
  vehicles?: Vehicle[];
  vehicleFuelLogs?: VehicleFuelLog[];
  vehicleMaintenanceLogs?: VehicleMaintenanceLog[];
}

interface DbLot {
  id: string;
  name: string;
  hectares: number | string;
  crop: string;
  status: Lot["status"];
  location?: string | null;
}

interface DbSupply {
  id: string;
  name: string;
  category: Supply["category"];
  stock: number | string;
  min_stock: number | string;
  unit: Supply["unit"];
  unit_cost_bs: number | string;
}

interface DbMachine {
  id: string;
  name: string;
  type: Machine["type"];
  hourmeter: number | string;
  status: Machine["status"];
  hourly_cost_bs: number | string;
  service_interval_hours?: number | string | null;
  last_service_hourmeter?: number | string | null;
  fuel_average_liters_per_hour?: number | string | null;
}

interface DbUsage {
  id: string;
  date: string;
  machine_id: string;
  lot_id: string;
  operator: string;
  labor_type: string;
  start_hours: number | string;
  end_hours: number | string;
  supply_id?: string | null;
  supply_qty?: number | string | null;
  diesel_liters?: number | string | null;
  operating_cost_bs?: number | string | null;
  cost_per_hectare_bs?: number | string | null;
  notes?: string | null;
}

interface DbFuelTx {
  id: string;
  date: string;
  type: FuelTransaction["type"];
  liters: number | string;
  price_per_liter_bs: number | string;
  total_cost_bs: number | string;
  destination_or_source: string;
  machine_id?: string | null;
  operator?: string | null;
  invoice_number?: string | null;
  notes?: string | null;
}

interface DbHarvest {
  id: string;
  ticket_number: string;
  date: string;
  lot_id: string;
  crop: string;
  silo_destination: string;
  driver: string;
  truck_plate: string;
  gross_weight_kg: number | string;
  tare_weight_kg: number | string;
  net_weight_kg: number | string;
  moisture_percent?: number | string | null;
  impurity_percent?: number | string | null;
  deduction_kg?: number | string | null;
  payable_weight_kg: number | string;
  payable_tons: number | string;
  price_per_ton_bs: number | string;
  total_amount_bs: number | string;
  status: HarvestDelivery["status"];
  notes?: string | null;
}

interface DbMaintenance {
  id: string;
  machine_id: string;
  date: string;
  hourmeter: number | string;
  service_type: MaintenanceRecord["serviceType"];
  mechanic: string;
  cost_bs: number | string;
  parts_replaced?: string | null;
  notes?: string | null;
}

interface DbRainfall {
  id: string;
  date: string;
  lot_id?: string | null;
  millimeters: number | string;
  duration_hours?: number | string | null;
  soil_condition: RainfallRecord["soilCondition"];
  notes?: string | null;
}

interface DbLaborer {
  id: string;
  date: string;
  worker_name: string;
  lot_id: string;
  task_description: string;
  days_worked: number | string;
  daily_rate_bs: number | string;
  total_cost_bs: number | string;
  is_paid: boolean;
  notes?: string | null;
}

interface DbScouting {
  id: string;
  date: string;
  lot_id: string;
  phenological_stage: string;
  pest_name?: string | null;
  pest_severity?: FieldScouting["pestSeverity"] | null;
  weed_pressure?: FieldScouting["weedPressure"] | null;
  disease?: string | null;
  recommended_action?: string | null;
  supply_recommended_id?: string | null;
  notes?: string | null;
}

interface DbLedger {
  id: string;
  date: string;
  description: string;
  category: LedgerEntry["category"];
  type: LedgerEntry["type"];
  amount_bs: number | string;
  lot_id?: string | null;
  estancia_id?: string | null;
  is_reversal?: boolean | null;
  reversal_of_id?: string | null;
  reversal_reason?: string | null;
}

interface DbBsisa {
  id: string;
  permit_number: string;
  permit_type: BsisaPermit["permitType"];
  issued_date: string;
  expiry_date: string;
  monthly_quota_liters?: number | string | null;
  authorized_station?: string | null;
  machine_id?: string | null;
  status?: BsisaPermit["status"] | null;
  document_number?: string | null;
  notes?: string | null;
  estancia_id?: string | null;
}

/**
 * Carga todos los datos desde Supabase en paralelo.
 */
export async function fetchRemoteData(): Promise<RemoteStoreData | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [
      settingsRes,
      lotsRes,
      suppliesRes,
      machinesRes,
      usagesRes,
      fuelTxRes,
      harvestRes,
      maintenanceRes,
      rainfallRes,
      laborersRes,
      scoutingsRes,
      ledgerRes,
      bsisaRes,
    ] = await Promise.all([
      client.from("app_settings").select("*").limit(1).maybeSingle(),
      client.from("lots").select("*").order("name"),
      client.from("supplies").select("*").order("name"),
      client.from("machines").select("*").order("name"),
      client.from("machine_usages").select("*").order("date", { ascending: false }),
      client.from("fuel_transactions").select("*").order("date", { ascending: false }),
      client.from("harvest_deliveries").select("*").order("date", { ascending: false }),
      client.from("maintenance_records").select("*").order("date", { ascending: false }),
      client.from("rainfall_records").select("*").order("date", { ascending: false }),
      client.from("laborer_worklogs").select("*").order("date", { ascending: false }),
      client.from("field_scoutings").select("*").order("date", { ascending: false }),
      client.from("ledger_entries").select("*").order("date", { ascending: false }),
      client.from("bsisa_permits").select("*").order("expiry_date", { ascending: true }),
    ]);

    // Check if any core query failed
    if (lotsRes.error) throw lotsRes.error;

    // Transform settings
    const settings = settingsRes.data;
    const currencyMode: CurrencyMode = settings?.currency_mode === "USD" ? "USD" : "BOB";
    const exchangeRate = Number(settings?.exchange_rate) || 6.96;
    const fuelTank: FuelTankInfo = {
      capacityLiters: Number(settings?.fuel_tank_capacity_liters) || 25000,
      monthlyQuotaLiters: Number(settings?.fuel_tank_monthly_quota_liters) || 15000,
    };

    // Transform lots
    const lots: Lot[] = ((lotsRes.data || []) as unknown as DbLot[]).map((l) => ({
      id: l.id,
      name: l.name,
      hectares: Number(l.hectares),
      crop: l.crop,
      status: l.status,
      location: l.location || undefined,
    }));

    // Transform supplies
    const supplies: Supply[] = ((suppliesRes.data || []) as unknown as DbSupply[]).map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      stock: Number(s.stock),
      minStock: Number(s.min_stock),
      unit: s.unit,
      unitCost: Number(s.unit_cost_bs),
    }));

    // Transform machines
    const machines: Machine[] = ((machinesRes.data || []) as unknown as DbMachine[]).map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      hourmeter: Number(m.hourmeter),
      status: m.status,
      hourlyCost: Number(m.hourly_cost_bs),
      serviceIntervalHours: Number(m.service_interval_hours) || 250,
      lastServiceHourmeter: Number(m.last_service_hourmeter) || 0,
      fuelAverageLitersPerHour: Number(m.fuel_average_liters_per_hour) || 0,
    }));

    // Transform usages
    const usages: MachineUsage[] = ((usagesRes.data || []) as unknown as DbUsage[]).map((u) => ({
      id: u.id,
      date: u.date,
      machineId: u.machine_id,
      lotId: u.lot_id,
      operator: u.operator,
      laborType: u.labor_type,
      startHours: Number(u.start_hours),
      endHours: Number(u.end_hours),
      supplyId: u.supply_id || undefined,
      supplyQty: u.supply_qty ? Number(u.supply_qty) : undefined,
      dieselLiters: u.diesel_liters ? Number(u.diesel_liters) : undefined,
      operatingCost: u.operating_cost_bs ? Number(u.operating_cost_bs) : undefined,
      costPerHectare: u.cost_per_hectare_bs ? Number(u.cost_per_hectare_bs) : undefined,
      notes: u.notes || undefined,
    }));

    // Transform fuel transactions
    const fuelTransactions: FuelTransaction[] = (
      (fuelTxRes.data || []) as unknown as DbFuelTx[]
    ).map((f) => ({
      id: f.id,
      date: f.date,
      type: f.type,
      liters: Number(f.liters),
      pricePerLiter: Number(f.price_per_liter_bs),
      totalCostBs: Number(f.total_cost_bs),
      destinationOrSource: f.destination_or_source,
      machineId: f.machine_id || undefined,
      operator: f.operator || undefined,
      invoiceNumber: f.invoice_number || undefined,
      notes: f.notes || undefined,
    }));

    // Transform harvest deliveries
    const harvestDeliveries: HarvestDelivery[] = (
      (harvestRes.data || []) as unknown as DbHarvest[]
    ).map((h) => ({
      id: h.id,
      ticketNumber: h.ticket_number,
      date: h.date,
      lotId: h.lot_id,
      crop: h.crop,
      siloDestination: h.silo_destination,
      driver: h.driver,
      truckPlate: h.truck_plate,
      grossWeightKg: Number(h.gross_weight_kg),
      tareWeightKg: Number(h.tare_weight_kg),
      netWeightKg: Number(h.net_weight_kg),
      moisturePercent: Number(h.moisture_percent) || 0,
      impurityPercent: Number(h.impurity_percent) || 0,
      deductionKg: Number(h.deduction_kg) || 0,
      payableWeightKg: Number(h.payable_weight_kg),
      payableTons: Number(h.payable_tons),
      pricePerTonBs: Number(h.price_per_ton_bs),
      totalAmountBs: Number(h.total_amount_bs),
      status: h.status,
      notes: h.notes || undefined,
    }));

    // Transform maintenance
    const maintenanceRecords: MaintenanceRecord[] = (
      (maintenanceRes.data || []) as unknown as DbMaintenance[]
    ).map((m) => ({
      id: m.id,
      machineId: m.machine_id,
      date: m.date,
      hourmeter: Number(m.hourmeter),
      serviceType: m.service_type,
      mechanic: m.mechanic,
      costBs: Number(m.cost_bs),
      partsReplaced: m.parts_replaced || "",
      notes: m.notes || undefined,
    }));

    // Transform rainfall
    const rainfalls: RainfallRecord[] = ((rainfallRes.data || []) as unknown as DbRainfall[]).map(
      (r) => ({
        id: r.id,
        date: r.date,
        lotId: r.lot_id || undefined,
        millimeters: Number(r.millimeters),
        durationHours: r.duration_hours ? Number(r.duration_hours) : undefined,
        soilCondition: r.soil_condition,
        notes: r.notes || undefined,
      }),
    );

    // Transform laborers
    const laborers: LaborerWorklog[] = ((laborersRes.data || []) as unknown as DbLaborer[]).map(
      (l) => ({
        id: l.id,
        date: l.date,
        workerName: l.worker_name,
        lotId: l.lot_id,
        taskDescription: l.task_description,
        daysWorked: Number(l.days_worked),
        dailyRateBs: Number(l.daily_rate_bs),
        totalCostBs: Number(l.total_cost_bs),
        isPaid: Boolean(l.is_paid),
        notes: l.notes || undefined,
      }),
    );

    // Transform scoutings
    const scoutings: FieldScouting[] = ((scoutingsRes.data || []) as unknown as DbScouting[]).map(
      (s) => ({
        id: s.id,
        date: s.date,
        lotId: s.lot_id,
        phenologicalStage: s.phenological_stage,
        pestName: s.pest_name || undefined,
        pestSeverity: s.pest_severity || "Ninguna",
        weedPressure: s.weed_pressure || "Controlada",
        disease: s.disease || undefined,
        recommendedAction: s.recommended_action || "",
        supplyRecommendedId: s.supply_recommended_id || undefined,
        notes: s.notes || undefined,
      }),
    );

    // Transform ledger
    const ledger: LedgerEntry[] = ((ledgerRes.data || []) as unknown as DbLedger[]).map((led) => ({
      id: led.id,
      date: led.date,
      description: led.description,
      category: led.category,
      type: led.type,
      amount: Number(led.amount_bs),
      lotId: led.lot_id || undefined,
      estanciaId: led.estancia_id || undefined,
      isReversal: Boolean(led.is_reversal),
      reversalOfId: led.reversal_of_id || undefined,
      reversalReason: led.reversal_reason || undefined,
    }));

    // Transform bsisa permits
    const bsisaPermits: BsisaPermit[] = ((bsisaRes.data || []) as unknown as DbBsisa[]).map(
      (bp) => ({
        id: bp.id,
        permitNumber: bp.permit_number,
        permitType: bp.permit_type,
        issuedDate: bp.issued_date,
        expiryDate: bp.expiry_date,
        monthlyQuotaLiters: bp.monthly_quota_liters ? Number(bp.monthly_quota_liters) : undefined,
        authorizedStation: bp.authorized_station || undefined,
        machineId: bp.machine_id || undefined,
        status: computeBsisaStatus(bp.expiry_date, bp.status || undefined),
        documentNumber: bp.document_number || undefined,
        notes: bp.notes || undefined,
        estanciaId: bp.estancia_id || undefined,
      }),
    );

    return {
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
    };
  } catch (err) {
    console.warn("Error leyendo datos de Supabase:", err);
    return null;
  }
}

/**
 * Guarda o actualiza un lote en Supabase.
 */
export async function syncLotToRemote(lot: Lot): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from("lots").upsert({
    id: lot.id,
    name: lot.name,
    hectares: lot.hectares,
    crop: lot.crop,
    status: lot.status,
    location: lot.location || null,
  });

  return !error;
}

/**
 * Guarda o actualiza un insumo en Supabase.
 */
export async function syncSupplyToRemote(supply: Supply): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from("supplies").upsert({
    id: supply.id,
    name: supply.name,
    category: supply.category,
    stock: supply.stock,
    min_stock: supply.minStock,
    unit: supply.unit,
    unit_cost_bs: supply.unitCost,
  });

  return !error;
}

/**
 * Guarda o actualiza una máquina en Supabase.
 */
export async function syncMachineToRemote(machine: Machine): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from("machines").upsert({
    id: machine.id,
    name: machine.name,
    type: machine.type,
    hourmeter: machine.hourmeter,
    status: machine.status,
    hourly_cost_bs: machine.hourlyCost,
    service_interval_hours: machine.serviceIntervalHours,
    last_service_hourmeter: machine.lastServiceHourmeter,
    fuel_average_liters_per_hour: machine.fuelAverageLitersPerHour,
  });

  return !error;
}

/**
 * Ejecuta el registro de uso de maquinaria a través de la función RPC ACID en Supabase.
 * Si la función RPC no está disponible, realiza las inserciones y updates correspondientes.
 */
export async function syncUsageToRemote(
  usage: MachineUsage,
  machine: Machine,
  ledgerEntry: LedgerEntry,
  supplyDeducted?: { id: string; remainingStock: number },
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    // Intentar invocar función RPC transaccional
    const { data, error: rpcError } = await client.rpc("register_machine_usage_tx", {
      p_date: usage.date,
      p_machine_id: usage.machineId,
      p_lot_id: usage.lotId,
      p_operator: usage.operator,
      p_labor_type: usage.laborType || "Labor mecanizada",
      p_start_hours: usage.startHours,
      p_end_hours: usage.endHours,
      p_supply_id: usage.supplyId || null,
      p_supply_qty: usage.supplyQty || 0,
      p_diesel_liters: usage.dieselLiters || 0,
      p_notes: usage.notes || null,
    });

    if (!rpcError && data?.success) {
      return true;
    }

    // Fallback: Si no está creado el RPC, hacer las operaciones directamente
    const [uRes, mRes, lRes] = await Promise.all([
      client.from("machine_usages").upsert({
        id: usage.id,
        date: usage.date,
        machine_id: usage.machineId,
        lot_id: usage.lotId,
        operator: usage.operator,
        labor_type: usage.laborType || "Labor mecanizada",
        start_hours: usage.startHours,
        end_hours: usage.endHours,
        supply_id: usage.supplyId || null,
        supply_qty: usage.supplyQty || null,
        diesel_liters: usage.dieselLiters || null,
        operating_cost_bs: usage.operatingCost || null,
        cost_per_hectare_bs: usage.costPerHectare || null,
        notes: usage.notes || null,
      }),
      client.from("machines").update({ hourmeter: machine.hourmeter }).eq("id", machine.id),
      client.from("ledger_entries").upsert({
        id: ledgerEntry.id,
        date: ledgerEntry.date,
        description: ledgerEntry.description,
        category: ledgerEntry.category,
        type: ledgerEntry.type,
        amount_bs: ledgerEntry.amount,
        lot_id: ledgerEntry.lotId || null,
      }),
    ]);

    if (supplyDeducted) {
      await client
        .from("supplies")
        .update({ stock: supplyDeducted.remainingStock })
        .eq("id", supplyDeducted.id);
    }

    return !uRes.error && !mRes.error && !lRes.error;
  } catch (err) {
    console.warn("Error sincronizando uso a Supabase:", err);
    return false;
  }
}

/**
 * Guarda una transacción de combustible.
 */
export async function syncFuelTransactionToRemote(
  tx: FuelTransaction,
  ledgerEntry?: LedgerEntry,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error: txError } = await client.from("fuel_transactions").upsert({
    id: tx.id,
    date: tx.date,
    type: tx.type,
    liters: tx.liters,
    price_per_liter_bs: tx.pricePerLiter,
    total_cost_bs: tx.totalCostBs,
    destination_or_source: tx.destinationOrSource,
    machine_id: tx.machineId || null,
    operator: tx.operator || null,
    invoice_number: tx.invoiceNumber || null,
    notes: tx.notes || null,
  });

  if (ledgerEntry) {
    await client.from("ledger_entries").upsert({
      id: ledgerEntry.id,
      date: ledgerEntry.date,
      description: ledgerEntry.description,
      category: ledgerEntry.category,
      type: ledgerEntry.type,
      amount_bs: ledgerEntry.amount,
      lot_id: ledgerEntry.lotId || null,
    });
  }

  return !txError;
}

/**
 * Guarda una entrega de cosecha en silo.
 */
export async function syncHarvestDeliveryToRemote(
  h: HarvestDelivery,
  ledgerEntry?: LedgerEntry,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error: hError } = await client.from("harvest_deliveries").upsert({
    id: h.id,
    ticket_number: h.ticketNumber,
    date: h.date,
    lot_id: h.lotId,
    crop: h.crop,
    silo_destination: h.siloDestination,
    driver: h.driver,
    truck_plate: h.truckPlate,
    gross_weight_kg: h.grossWeightKg,
    tare_weight_kg: h.tareWeightKg,
    net_weight_kg: h.netWeightKg,
    moisture_percent: h.moisturePercent,
    impurity_percent: h.impurityPercent,
    deduction_kg: h.deductionKg,
    payable_weight_kg: h.payableWeightKg,
    payable_tons: h.payableTons,
    price_per_ton_bs: h.pricePerTonBs,
    total_amount_bs: h.totalAmountBs,
    status: h.status,
    notes: h.notes || null,
  });

  if (ledgerEntry) {
    await client.from("ledger_entries").upsert({
      id: ledgerEntry.id,
      date: ledgerEntry.date,
      description: ledgerEntry.description,
      category: ledgerEntry.category,
      type: ledgerEntry.type,
      amount_bs: ledgerEntry.amount,
      lot_id: ledgerEntry.lotId || null,
    });
  }

  return !hError;
}

/**
 * Guarda un registro de mantenimiento.
 */
export async function syncMaintenanceToRemote(
  m: MaintenanceRecord,
  ledgerEntry?: LedgerEntry,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error: mError } = await client.from("maintenance_records").upsert({
    id: m.id,
    machine_id: m.machineId,
    date: m.date,
    hourmeter: m.hourmeter,
    service_type: m.serviceType,
    mechanic: m.mechanic,
    cost_bs: m.costBs,
    parts_replaced: m.partsReplaced,
    notes: m.notes || null,
  });

  if (ledgerEntry) {
    await client.from("ledger_entries").upsert({
      id: ledgerEntry.id,
      date: ledgerEntry.date,
      description: ledgerEntry.description,
      category: ledgerEntry.category,
      type: ledgerEntry.type,
      amount_bs: ledgerEntry.amount,
      lot_id: ledgerEntry.lotId || null,
    });
  }

  return !mError;
}

/**
 * Guarda un registro de lluvia.
 */
export async function syncRainfallToRemote(r: RainfallRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from("rainfall_records").upsert({
    id: r.id,
    date: r.date,
    lot_id: r.lotId || null,
    millimeters: r.millimeters,
    duration_hours: r.durationHours || null,
    soil_condition: r.soilCondition,
    notes: r.notes || null,
  });

  return !error;
}

/**
 * Guarda un registro de jornal y su asiento contable.
 */
export async function syncLaborerToRemote(
  l: LaborerWorklog,
  ledgerEntry?: LedgerEntry,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error: lError } = await client.from("laborer_worklogs").upsert({
    id: l.id,
    date: l.date,
    worker_name: l.workerName,
    lot_id: l.lotId,
    task_description: l.taskDescription,
    days_worked: l.daysWorked,
    daily_rate_bs: l.dailyRateBs,
    total_cost_bs: l.totalCostBs,
    is_paid: l.isPaid,
    notes: l.notes || null,
  });

  if (ledgerEntry) {
    await client.from("ledger_entries").upsert({
      id: ledgerEntry.id,
      date: ledgerEntry.date,
      description: ledgerEntry.description,
      category: ledgerEntry.category,
      type: ledgerEntry.type,
      amount_bs: ledgerEntry.amount,
      lot_id: ledgerEntry.lotId || null,
    });
  }

  return !lError;
}

/**
 * Actualiza estado de pago de un jornal.
 */
export async function toggleLaborerPaidInRemote(id: string, isPaid: boolean): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from("laborer_worklogs").update({ is_paid: isPaid }).eq("id", id);
  return !error;
}

/**
 * Guarda un monitoreo fitosanitario / scouting.
 */
export async function syncScoutingToRemote(s: FieldScouting): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from("field_scoutings").upsert({
    id: s.id,
    date: s.date,
    lot_id: s.lotId,
    phenological_stage: s.phenologicalStage,
    pest_name: s.pestName || null,
    pest_severity: s.pestSeverity,
    weed_pressure: s.weedPressure,
    disease: s.disease || null,
    recommended_action: s.recommendedAction,
    supply_recommended_id: s.supplyRecommendedId || null,
    notes: s.notes || null,
  });

  return !error;
}

/**
 * Guarda un asiento contable genérico.
 */
export async function syncLedgerToRemote(led: LedgerEntry): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from("ledger_entries").upsert({
    id: led.id,
    date: led.date,
    description: led.description,
    category: led.category,
    type: led.type,
    amount_bs: led.amount,
    lot_id: led.lotId || null,
    estancia_id: led.estanciaId || "estancia-san-jose",
    is_reversal: Boolean(led.isReversal),
    reversal_of_id: led.reversalOfId || null,
    reversal_reason: led.reversalReason || null,
  });

  return !error;
}

/**
 * Guarda o actualiza un permiso o resolución B-SISA en Supabase.
 */
export async function syncBsisaPermitToRemote(p: BsisaPermit): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from("bsisa_permits").upsert({
    id: p.id,
    estancia_id: p.estanciaId || "estancia-san-jose",
    permit_number: p.permitNumber,
    permit_type: p.permitType,
    issued_date: p.issuedDate,
    expiry_date: p.expiryDate,
    monthly_quota_liters: p.monthlyQuotaLiters || null,
    authorized_station: p.authorizedStation || null,
    machine_id: p.machineId || null,
    status: p.status,
    document_number: p.documentNumber || null,
    notes: p.notes || null,
  });

  return !error;
}

/**
 * Elimina un permiso B-SISA en Supabase.
 */
export async function deleteBsisaPermitInRemote(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from("bsisa_permits").delete().eq("id", id);
  return !error;
}

/**
 * Guarda o actualiza un vehículo en Supabase.
 */
export async function syncVehicleToRemote(vehicle: Vehicle): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from("vehicles").upsert(
      {
        id: vehicle.id,
        name: vehicle.name,
        plate: vehicle.plate,
        type: vehicle.type,
        fuel_type: vehicle.fuelType,
        current_km: vehicle.currentKm,
        average_km_per_liter: vehicle.averageKmPerLiter,
        tank_capacity_liters: vehicle.tankCapacityLiters,
        last_oil_change_km: vehicle.lastOilChangeKm,
        oil_interval_km: vehicle.oilIntervalKm,
        last_brake_change_km: vehicle.lastBrakeChangeKm,
        brake_interval_km: vehicle.brakeIntervalKm,
        last_air_filter_change_km: vehicle.lastAirFilterChangeKm,
        air_filter_interval_km: vehicle.airFilterIntervalKm,
        last_tire_change_km: vehicle.lastTireChangeKm,
        tire_interval_km: vehicle.tireIntervalKm,
        assigned_driver: vehicle.assignedDriver || null,
        image_url: vehicle.imageUrl || null,
        emoji: vehicle.emoji || null,
        notes: vehicle.notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Guarda una carga de combustible vehicular en Supabase.
 */
export async function syncVehicleFuelLogToRemote(
  log: VehicleFuelLog,
  relatedLedger?: LedgerEntry,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    await client.from("vehicle_fuel_logs").upsert(
      {
        id: log.id,
        vehicle_id: log.vehicleId,
        date: log.date,
        odometer_km: log.odometerKm,
        liters: log.liters,
        price_per_liter_bs: log.pricePerLiterBs,
        total_cost_bs: log.totalCostBs,
        fuel_type: log.fuelType,
        station: log.station,
        driver: log.driver,
        full_tank: log.fullTank,
        calculated_km_per_liter: log.calculatedKmPerLiter ?? null,
        cost_per_km_bs: log.costPerKmBs ?? null,
        receipt_photo_url: log.receiptPhotoUrl || null,
        notes: log.notes || null,
      },
      { onConflict: "id" },
    );
    if (relatedLedger) {
      await syncLedgerToRemote(relatedLedger);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Guarda un mantenimiento vehicular en Supabase.
 */
export async function syncVehicleMaintenanceLogToRemote(
  log: VehicleMaintenanceLog,
  relatedLedger?: LedgerEntry,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    await client.from("vehicle_maintenance_logs").upsert(
      {
        id: log.id,
        vehicle_id: log.vehicleId,
        date: log.date,
        odometer_km: log.odometerKm,
        service_type: log.serviceType,
        parts_replaced: log.partsReplaced,
        cost_bs: log.costBs,
        workshop_or_mechanic: log.workshopOrMechanic,
        invoice_photo_url: log.invoicePhotoUrl || null,
        notes: log.notes || null,
      },
      { onConflict: "id" },
    );
    if (relatedLedger) {
      await syncLedgerToRemote(relatedLedger);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Guarda la configuración de la estancia (moneda, tipo de cambio).
 */
export async function syncSettingsToRemote(
  mode: CurrencyMode,
  rate: number,
  tank?: FuelTankInfo,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from("app_settings").upsert({
    id: "default",
    currency_mode: mode,
    exchange_rate: rate,
    fuel_tank_capacity_liters: tank?.capacityLiters ?? 25000,
    fuel_tank_monthly_quota_liters: tank?.monthlyQuotaLiters ?? 15000,
  });

  return !error;
}

/**
 * Exporta todos los datos locales actuales de la estancia a la nube de Supabase.
 */
export async function exportLocalDataToSupabase(data: RemoteStoreData): Promise<{
  success: boolean;
  message: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: "Supabase no está configurado" };
  }

  try {
    // 1. Settings
    await syncSettingsToRemote(data.currencyMode, data.exchangeRate, data.fuelTank);

    // 2. Lots
    for (const lot of data.lots) {
      await syncLotToRemote(lot);
    }

    // 3. Supplies
    for (const sup of data.supplies) {
      await syncSupplyToRemote(sup);
    }

    // 4. Machines
    for (const mac of data.machines) {
      await syncMachineToRemote(mac);
    }

    // 5. Usages
    for (const u of data.usages) {
      await client.from("machine_usages").upsert({
        id: u.id,
        date: u.date,
        machine_id: u.machineId,
        lot_id: u.lotId,
        operator: u.operator,
        labor_type: u.laborType || "Labor mecanizada",
        start_hours: u.startHours,
        end_hours: u.endHours,
        supply_id: u.supplyId || null,
        supply_qty: u.supplyQty || null,
        diesel_liters: u.dieselLiters || null,
        operating_cost_bs: u.operatingCost || null,
        cost_per_hectare_bs: u.costPerHectare || null,
        notes: u.notes || null,
      });
    }

    // 6. Fuel Transactions
    for (const f of data.fuelTransactions) {
      await syncFuelTransactionToRemote(f);
    }

    // 7. Harvest Deliveries
    for (const h of data.harvestDeliveries) {
      await syncHarvestDeliveryToRemote(h);
    }

    // 8. Maintenance
    for (const m of data.maintenanceRecords) {
      await syncMaintenanceToRemote(m);
    }

    // 9. Rainfalls
    for (const r of data.rainfalls) {
      await syncRainfallToRemote(r);
    }

    // 10. Laborers
    for (const l of data.laborers) {
      await syncLaborerToRemote(l);
    }

    // 11. Scoutings
    for (const s of data.scoutings) {
      await syncScoutingToRemote(s);
    }

    // 12. Ledger
    for (const led of data.ledger) {
      await syncLedgerToRemote(led);
    }

    // 13. Permisos B-SISA
    for (const bp of data.bsisaPermits) {
      await syncBsisaPermitToRemote(bp);
    }

    // 14. Vehículos y Flota
    if (data.vehicles) {
      for (const v of data.vehicles) {
        await syncVehicleToRemote(v);
      }
    }

    // 15. Cargas de Combustible Vehicular
    if (data.vehicleFuelLogs) {
      for (const vf of data.vehicleFuelLogs) {
        await syncVehicleFuelLogToRemote(vf);
      }
    }

    // 16. Mantenimiento Vehicular
    if (data.vehicleMaintenanceLogs) {
      for (const vm of data.vehicleMaintenanceLogs) {
        await syncVehicleMaintenanceLogToRemote(vm);
      }
    }

    return {
      success: true,
      message:
        "¡Todos los datos locales fueron sincronizados y respaldados en Supabase exitosamente!",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Error durante la exportación a Supabase: ${msg}`,
    };
  }
}
