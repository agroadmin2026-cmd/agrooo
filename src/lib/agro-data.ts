export type Unit = "Litros" | "Kilos" | "Unidades";
export type SupplyCategory = "Semillas" | "Fertilizantes" | "Insecticidas" | "Herbicidas" | "Combustibles";

export interface Supply {
  id: string;
  name: string;
  category: SupplyCategory;
  stock: number;
  minStock: number;
  unit: Unit;
  unitCost: number; // Expresado en Bolivianos (Bs)
}

export type LotStatus = "Siembra" | "Crecimiento" | "Cosecha" | "Barbecho";
export interface Lot {
  id: string;
  name: string;
  hectares: number;
  crop: string;
  status: LotStatus;
  location?: string;
}

export type MachineStatus = "Operativa" | "Mantenimiento" | "Fuera de servicio";

export interface Machine {
  id: string;
  name: string;
  type: "Tractor" | "Cosechadora" | "Pulverizador";
  hourmeter: number;
  status: MachineStatus;
  hourlyCost: number; // En Bs/hora
  serviceIntervalHours: number; // Cada cuántas horas toca mantenimiento preventivo (ej. 250 h)
  lastServiceHourmeter: number; // Horómetro del último cambio de filtros y aceite
  fuelAverageLitersPerHour: number; // Consumo promedio en L/h
}

export type LaborType =
  | "Pulverización / Fumigación"
  | "Siembra directa"
  | "Preparación de suelo (Rastra / Cincel)"
  | "Cosecha mecanizada"
  | "Fertilización"
  | "Transporte / Apoyo";

export interface MachineUsage {
  id: string;
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
  operatingCost?: number | undefined; // En Bs
  costPerHectare?: number | undefined; // En Bs/ha
  notes?: string | undefined;
}

export type LedgerCategory = "Insumos" | "Maquinaria" | "Jornales" | "Venta de Cosecha" | "Combustibles" | "Mantenimiento";

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  category: LedgerCategory;
  type: "ingreso" | "egreso";
  amount: number; // En Bs
  lotId?: string | undefined;
}

export interface FuelTransaction {
  id: string;
  date: string;
  type: "ingreso" | "despacho";
  liters: number;
  pricePerLiter: number; // Bs/L
  totalCostBs: number; // Bs
  destinationOrSource: string; // "YPFB Refinería" o "John Deere 6155J"
  machineId?: string | undefined;
  operator?: string | undefined;
  invoiceNumber?: string | undefined;
  notes?: string | undefined;
}

export interface FuelTankInfo {
  capacityLiters: number;
  monthlyQuotaLiters: number; // Cupo B-Sisa mensual
}

export interface HarvestDelivery {
  id: string;
  ticketNumber: string;
  date: string;
  lotId: string;
  crop: string;
  siloDestination: string; // ej. "ADM Chaco", "Gravetal", "Cargill"
  driver: string;
  truckPlate: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  moisturePercent: number; // Humedad %
  impurityPercent: number; // Impurezas %
  deductionKg: number; // Merma
  payableWeightKg: number; // Líquido pagable
  payableTons: number;
  pricePerTonBs: number; // Bs/t
  totalAmountBs: number; // Total a cobrar
  status: "Liquidado" | "En silo";
  notes?: string | undefined;
}

export interface MaintenanceRecord {
  id: string;
  machineId: string;
  date: string;
  hourmeter: number;
  serviceType: "Service 250h" | "Service 500h" | "Service 1000h" | "Reparación correctiva";
  mechanic: string;
  costBs: number;
  partsReplaced: string;
  notes?: string | undefined;
}

export type CurrencyMode = "BOB" | "USD";

export interface RainfallRecord {
  id: string;
  date: string;
  lotId?: string | undefined; // Si es undefined, es la estación central de la estancia
  millimeters: number; // Precipitaciones registradas en mm
  durationHours?: number | undefined;
  soilCondition: "Óptimo para labores" | "Humedad adecuada" | "Saturado / Anegado (Esperar 48h)" | "Déficit hídrico";
  notes?: string | undefined;
}

export interface LaborerWorklog {
  id: string;
  date: string;
  workerName: string;
  lotId: string;
  taskDescription: string; // ej. "Desmalezado manual en bordes", "Estiba y embolsado de grano", "Banderillero"
  daysWorked: number; // Cantidad de jornales (días)
  dailyRateBs: number; // Tarifa diaria ej. Bs 140/día
  totalCostBs: number; // daysWorked * dailyRateBs
  isPaid: boolean;
  notes?: string | undefined;
}

export interface FieldScouting {
  id: string;
  date: string;
  lotId: string;
  phenologicalStage: string; // ej. "V4 (Vegetativo)", "R1 (Inicio Floración)", "R5 (Llenado de grano)"
  pestName?: string | undefined; // ej. "Gusano Cogollero", "Falsa Medidora", "Picudo"
  pestSeverity: "Ninguna" | "Baja" | "Media" | "Umbral de Daño Económico";
  weedPressure: "Controlada" | "Media (Focos aislados)" | "Alta (Requiere desecación)";
  disease?: string | undefined; // ej. "Roya Asiática de la Soya", "Tizón Foliar"
  recommendedAction: string; // ej. "Aplicación urgente Cipermetrina", "Monitorear en 48 hrs"
  supplyRecommendedId?: string | undefined;
  notes?: string | undefined;
}

export const initialFuelTank: FuelTankInfo = {
  capacityLiters: 25000,
  monthlyQuotaLiters: 20000,
};

export const initialSupplies: Supply[] = [
  { id: "s0", name: "Diésel Oíl (Tanque Estancia)", category: "Combustibles", stock: 14200, minStock: 3000, unit: "Litros", unitCost: 3.72 },
  { id: "s1", name: "Semilla Soya RR 6.2 (Bolsas)", category: "Semillas", stock: 1200, minStock: 500, unit: "Kilos", unitCost: 12.5 },
  { id: "s2", name: "Semilla Maíz Híbrido DK", category: "Semillas", stock: 180, minStock: 300, unit: "Kilos", unitCost: 31.0 },
  { id: "s3", name: "Urea Granulada 46%", category: "Fertilizantes", stock: 3500, minStock: 1000, unit: "Kilos", unitCost: 4.3 },
  { id: "s4", name: "Fosfato Diamónico (DAP)", category: "Fertilizantes", stock: 640, minStock: 800, unit: "Kilos", unitCost: 5.9 },
  { id: "s5", name: "Cipermetrina 25% EC", category: "Insecticidas", stock: 95, minStock: 40, unit: "Litros", unitCost: 64.0 },
  { id: "s6", name: "Clorpirifós 48% CE", category: "Insecticidas", stock: 22, minStock: 30, unit: "Litros", unitCost: 80.0 },
  { id: "s7", name: "Glifosato Concentrado 62%", category: "Herbicidas", stock: 410, minStock: 150, unit: "Litros", unitCost: 37.5 },
];

export const initialLots: Lot[] = [
  { id: "l1", name: "Lote Norte A", hectares: 120, crop: "Soya", status: "Crecimiento", location: "Sector Pailón" },
  { id: "l2", name: "Lote Norte B", hectares: 85, crop: "Maíz", status: "Siembra", location: "Sector Pailón" },
  { id: "l3", name: "La Esperanza", hectares: 210, crop: "Soya", status: "Cosecha", location: "Cuatro Cañadas" },
  { id: "l4", name: "El Bajío", hectares: 64, crop: "Sorgo", status: "Crecimiento", location: "San Julián" },
  { id: "l5", name: "Parcela Río", hectares: 45, crop: "Trigo", status: "Barbecho", location: "Montero" },
];

export const initialMachines: Machine[] = [
  {
    id: "m1",
    name: "John Deere 6155J",
    type: "Tractor",
    hourmeter: 4320,
    status: "Operativa",
    hourlyCost: 315, // Bs 315/h
    serviceIntervalHours: 250,
    lastServiceHourmeter: 4250,
    fuelAverageLitersPerHour: 14.5,
  },
  {
    id: "m2",
    name: "New Holland T7.240",
    type: "Tractor",
    hourmeter: 2875,
    status: "Mantenimiento",
    hourlyCost: 290, // Bs 290/h
    serviceIntervalHours: 250,
    lastServiceHourmeter: 2750,
    fuelAverageLitersPerHour: 15.0,
  },
  {
    id: "m3",
    name: "Case Axial-Flow 8250",
    type: "Cosechadora",
    hourmeter: 1980,
    status: "Operativa",
    hourlyCost: 840, // Bs 840/h
    serviceIntervalHours: 250,
    lastServiceHourmeter: 1750,
    fuelAverageLitersPerHour: 32.0,
  },
  {
    id: "m4",
    name: "Jacto Uniport 3030",
    type: "Pulverizador",
    hourmeter: 3410,
    status: "Operativa",
    hourlyCost: 420, // Bs 420/h
    serviceIntervalHours: 250,
    lastServiceHourmeter: 3250,
    fuelAverageLitersPerHour: 18.0,
  },
];

export const initialUsages: MachineUsage[] = [
  {
    id: "u1",
    date: "2026-10-03",
    machineId: "m4",
    lotId: "l1",
    operator: "Juan Rojas",
    laborType: "Pulverización / Fumigación",
    startHours: 3390,
    endHours: 3398,
    supplyId: "s5",
    supplyQty: 30,
    dieselLiters: 144,
    operatingCost: 3360,
    costPerHectare: 28,
  },
  {
    id: "u2",
    date: "2026-10-07",
    machineId: "m1",
    lotId: "l2",
    operator: "Carlos Vaca",
    laborType: "Siembra directa",
    startHours: 4300,
    endHours: 4312,
    supplyId: "s2",
    supplyQty: 420,
    dieselLiters: 174,
    operatingCost: 3780,
    costPerHectare: 44.5,
  },
  {
    id: "u3",
    date: "2026-10-12",
    machineId: "m3",
    lotId: "l3",
    operator: "Luis Peña",
    laborType: "Cosecha mecanizada",
    startHours: 1962,
    endHours: 1980,
    dieselLiters: 576,
    operatingCost: 15120,
    costPerHectare: 72,
  },
  {
    id: "u4",
    date: "2026-10-15",
    machineId: "m4",
    lotId: "l4",
    operator: "Juan Rojas",
    laborType: "Pulverización / Fumigación",
    startHours: 3398,
    endHours: 3410,
    supplyId: "s7",
    supplyQty: 90,
    dieselLiters: 216,
    operatingCost: 5040,
    costPerHectare: 78.75,
  },
  {
    id: "u5",
    date: "2026-10-16",
    machineId: "m1",
    lotId: "l1",
    operator: "Carlos Vaca",
    laborType: "Fertilización",
    startHours: 4312,
    endHours: 4320,
    supplyId: "s3",
    supplyQty: 600,
    dieselLiters: 116,
    operatingCost: 2520,
    costPerHectare: 21,
  },
];

export const initialLedger: LedgerEntry[] = [
  { id: "e1", date: "2026-10-02", description: "Compra Cipermetrina 25% (100 L)", category: "Insumos", type: "egreso", amount: 6400 },
  { id: "e2", date: "2026-10-03", description: "Fumigación Lote Norte A (8h Jacto Uniport)", category: "Maquinaria", type: "egreso", amount: 3360, lotId: "l1" },
  { id: "e3", date: "2026-10-05", description: "Jornales siembra lote Maíz", category: "Jornales", type: "egreso", amount: 9450, lotId: "l2" },
  { id: "e4", date: "2026-10-12", description: "Liquidación venta soya – 180 t (ADM Bolivia)", category: "Venta de Cosecha", type: "ingreso", amount: 504000, lotId: "l3" },
  { id: "e5", date: "2026-10-12", description: "Cosecha La Esperanza (18h Case Axial-Flow)", category: "Maquinaria", type: "egreso", amount: 15120, lotId: "l3" },
  { id: "e6", date: "2026-10-14", description: "Compra Urea 46% (3.500 Kg YPFB)", category: "Insumos", type: "egreso", amount: 15050 },
  { id: "e7", date: "2026-10-18", description: "Jornales mantenimiento y aceitado de implementos", category: "Jornales", type: "egreso", amount: 4480 },
  { id: "e8", date: "2026-09-20", description: "Venta maíz chulpi – 40 t", category: "Venta de Cosecha", type: "ingreso", amount: 68600, lotId: "l2" },
];

export const initialFuelTransactions: FuelTransaction[] = [
  {
    id: "f1",
    date: "2026-10-01",
    type: "ingreso",
    liters: 10000,
    pricePerLiter: 3.72,
    totalCostBs: 37200,
    destinationOrSource: "YPFB Refinería Guillermo Elder (Cisterna B-SISA)",
    invoiceNumber: "FC-99482",
    notes: "Descarga completa en tanque cisterna principal",
  },
  {
    id: "f2",
    date: "2026-10-03",
    type: "despacho",
    liters: 144,
    pricePerLiter: 3.72,
    totalCostBs: 535.68,
    destinationOrSource: "Jacto Uniport 3030",
    machineId: "m4",
    operator: "Juan Rojas",
    notes: "Fumigación Lote Norte A",
  },
  {
    id: "f3",
    date: "2026-10-07",
    type: "despacho",
    liters: 174,
    pricePerLiter: 3.72,
    totalCostBs: 647.28,
    destinationOrSource: "John Deere 6155J",
    machineId: "m1",
    operator: "Carlos Vaca",
    notes: "Siembra directa Lote Norte B",
  },
  {
    id: "f4",
    date: "2026-10-12",
    type: "despacho",
    liters: 576,
    pricePerLiter: 3.72,
    totalCostBs: 2142.72,
    destinationOrSource: "Case Axial-Flow 8250",
    machineId: "m3",
    operator: "Luis Peña",
    notes: "Jornada completa de cosecha Lote La Esperanza",
  },
];

export const initialHarvestDeliveries: HarvestDelivery[] = [
  {
    id: "h1",
    ticketNumber: "TK-48201",
    date: "2026-10-12",
    lotId: "l3",
    crop: "Soya",
    siloDestination: "ADM Bolivia (Silo Pailón)",
    driver: "Wilfredo Choque",
    truckPlate: "3042-BTY",
    grossWeightKg: 42500,
    tareWeightKg: 14500,
    netWeightKg: 28000,
    moisturePercent: 13.2,
    impurityPercent: 1.1,
    deductionKg: 280,
    payableWeightKg: 27720,
    payableTons: 27.72,
    pricePerTonBs: 2800,
    totalAmountBs: 77616,
    status: "Liquidado",
    notes: "Grano sano, sin descuento de quebrado",
  },
  {
    id: "h2",
    ticketNumber: "TK-48202",
    date: "2026-10-12",
    lotId: "l3",
    crop: "Soya",
    siloDestination: "ADM Bolivia (Silo Pailón)",
    driver: "René Mamani",
    truckPlate: "2581-XKP",
    grossWeightKg: 43100,
    tareWeightKg: 14700,
    netWeightKg: 28400,
    moisturePercent: 13.8,
    impurityPercent: 1.3,
    deductionKg: 340,
    payableWeightKg: 28060,
    payableTons: 28.06,
    pricePerTonBs: 2800,
    totalAmountBs: 78568,
    status: "Liquidado",
    notes: "Segunda carga camión Volvo F12",
  },
];

export const initialMaintenanceRecords: MaintenanceRecord[] = [
  {
    id: "mnt-1",
    machineId: "m1",
    date: "2026-09-15",
    hourmeter: 4250,
    serviceType: "Service 250h",
    mechanic: "Pedro Salazar (Taller Central)",
    costBs: 2450,
    partsReplaced: "Filtro de aceite John Deere, filtro combustible primario, 22 L aceite motor 15W40",
    notes: "Engrase completo de barra de tiro y tren delantero",
  },
  {
    id: "mnt-2",
    machineId: "m4",
    date: "2026-09-28",
    hourmeter: 3250,
    serviceType: "Service 250h",
    mechanic: "Pedro Salazar",
    costBs: 2100,
    partsReplaced: "Filtros de combustible, limpieza general de picos y boquillas TeeJet",
    notes: "Calibración de caudalímetro y manómetro",
  },
];

export const initialRainfalls: RainfallRecord[] = [
  {
    id: "rf-1",
    date: "2026-10-18",
    lotId: "l1",
    millimeters: 42.0,
    durationHours: 3.5,
    soilCondition: "Saturado / Anegado (Esperar 48h)",
    notes: "Frente de tormenta del sur con viento moderado",
  },
  {
    id: "rf-2",
    date: "2026-10-14",
    lotId: "l3",
    millimeters: 18.5,
    durationHours: 1.5,
    soilCondition: "Óptimo para labores",
    notes: "Lluvia serena y uniforme",
  },
  {
    id: "rf-3",
    date: "2026-10-08",
    lotId: undefined, // Estación Meteorológica Central Estancia
    millimeters: 28.0,
    durationHours: 2.0,
    soilCondition: "Humedad adecuada",
    notes: "Registro general del pluviómetro del campamento",
  },
  {
    id: "rf-4",
    date: "2026-10-02",
    lotId: "l2",
    millimeters: 35.0,
    durationHours: 3.0,
    soilCondition: "Humedad adecuada",
    notes: "Excelente recarga para siembra de maíz",
  },
];

export const initialLaborers: LaborerWorklog[] = [
  {
    id: "lab-1",
    date: "2026-10-19",
    workerName: "Faustino Callisaya",
    lotId: "l1",
    taskDescription: "Desmalezado manual y corte de malezas resistentes en bordes",
    daysWorked: 2,
    dailyRateBs: 150,
    totalCostBs: 300,
    isPaid: true,
    notes: "Cuadrilla Sector Pailón",
  },
  {
    id: "lab-2",
    date: "2026-10-17",
    workerName: "Dionicio Choque",
    lotId: "l2",
    taskDescription: "Regulado de tolvas y apoyo en siembra directa",
    daysWorked: 3,
    dailyRateBs: 160,
    totalCostBs: 480,
    isPaid: true,
    notes: "Jornal de apoyo siembra de maíz",
  },
  {
    id: "lab-3",
    date: "2026-10-15",
    workerName: "Zenón Mamani",
    lotId: "l3",
    taskDescription: "Apoyo en tolva y muestreo de grano en cosecha",
    daysWorked: 2.5,
    dailyRateBs: 150,
    totalCostBs: 375,
    isPaid: false,
    notes: "Pendiente liquidación de fin de semana",
  },
];

export const initialScoutings: FieldScouting[] = [
  {
    id: "sc-1",
    date: "2026-10-20",
    lotId: "l1",
    phenologicalStage: "R1 (Inicio de floración)",
    pestName: "Falsa Medidora (Chrysodeixis includens)",
    pestSeverity: "Media",
    weedPressure: "Controlada",
    disease: "Ninguna",
    recommendedAction: "Monitoreo en 48 hrs y preparar pulverizadora con Cipermetrina 25% si supera umbral",
    supplyRecommendedId: "s5",
    notes: "Promedio de 6 orugas por metro lineal en tercio medio",
  },
  {
    id: "sc-2",
    date: "2026-10-19",
    lotId: "l2",
    phenologicalStage: "V4 (Cuatro hojas desplegadas)",
    pestName: "Gusano Cogollero (Spodoptera frugiperda)",
    pestSeverity: "Umbral de Daño Económico",
    weedPressure: "Media (Focos aislados)",
    disease: "Ninguna",
    recommendedAction: "Aplicación inmediata insecticida de contacto + regulador de crecimiento",
    supplyRecommendedId: "s5",
    notes: "18% de plantas con raspado y daño visible en cogollo",
  },
  {
    id: "sc-3",
    date: "2026-10-16",
    lotId: "l4",
    phenologicalStage: "V6 (Vegetativo Sorgo)",
    pestSeverity: "Ninguna",
    weedPressure: "Controlada",
    disease: "Ninguna",
    recommendedAction: "Estado vegetativo óptimo, sin necesidad de intervención",
    notes: "Cierre de entresurco uniforme, excelente vigor",
  },
];

/**
 * Formateador de moneda oficial para Bolivia (Bs / BOB).
 * Ejemplos: "Bs 1.500" o "Bs 1.500,50"
 */
export const currency = (n: number, withDecimals = false): string => {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 2,
  }).format(n);
};

/**
 * Formateador bimonetario que alterna entre Bolivianos (Bs) y Dólares Americanos (USD).
 */
export const formatMoney = (
  amountBs: number,
  currencyMode: CurrencyMode = "BOB",
  exchangeRate = 6.96,
  withDecimals = false
): string => {
  if (currencyMode === "USD") {
    const usd = amountBs / (exchangeRate > 0 ? exchangeRate : 6.96);
    return `$ ${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: withDecimals ? 2 : 0,
      maximumFractionDigits: withDecimals ? 2 : 2,
    }).format(usd)} USD`;
  }
  return currency(amountBs, withDecimals);
};

export const number = (n: number): string => new Intl.NumberFormat("es-BO").format(n);
export const isLowStock = (s: Supply): boolean => s.stock < s.minStock;
export const uid = (): string => Math.random().toString(36).slice(2, 9);

/**
 * Utilidad de exportación a archivo CSV compatible con Excel y UTF-8 (BOM).
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const processCell = (value: string | number) => {
    let str = value === null || value === undefined ? "" : String(value);
    if (str.search(/("|,|\n)/g) >= 0) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent =
    "\uFEFF" +
    [headers.map(processCell).join(","), ...rows.map((row) => row.map(processCell).join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  try {
    link.click();
  } catch {
    // Entorno de pruebas o SSR sin motor de descarga completo
  }
  document.body.removeChild(link);
}
