export type Unit = "Litros" | "Kilos" | "Unidades";
export type SupplyCategory =
  "Semillas" | "Fertilizantes" | "Insecticidas" | "Herbicidas" | "Combustibles";

export interface Supply {
  id: string;
  name: string;
  category: SupplyCategory;
  stock: number;
  minStock: number;
  unit: Unit;
  unitCost: number; // Expresado en Bolivianos (Bs)
  estanciaId?: string | undefined;
}

export type LotStatus = "Siembra" | "Crecimiento" | "Cosecha" | "Barbecho";
export interface Lot {
  id: string;
  name: string;
  hectares: number;
  crop: string;
  status: LotStatus;
  location?: string | undefined;
  estanciaId?: string | undefined;
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
  estanciaId?: string | undefined;
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

export type LedgerCategory =
  "Insumos" | "Maquinaria" | "Jornales" | "Venta de Cosecha" | "Combustibles" | "Mantenimiento";

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  category: LedgerCategory;
  type: "ingreso" | "egreso";
  amount: number; // En Bs
  lotId?: string | undefined;
  estanciaId?: string | undefined;
  isReversal?: boolean | undefined;
  reversalOfId?: string | undefined;
  reversalReason?: string | undefined;
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

export type BsisaPermitType =
  | "Resolución de Cupo ANH (Cisterna Estancia)"
  | "Roseta RFID B-SISA (Maquinaria Agrícola)"
  | "Hoja de Ruta / Transporte DGSC"
  | "Tarjeta de Compra en Surtidor";

export type BsisaPermitStatus = "Vigente" | "Por vencer" | "Vencido" | "En trámite";

export interface BsisaPermit {
  id: string;
  permitNumber: string; // ej. "RA-ANH-SCZ-2026/0412" o "RFID-JD-6155-BO"
  permitType: BsisaPermitType;
  issuedDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  monthlyQuotaLiters?: number | undefined;
  authorizedStation?: string | undefined; // ej. Surtidor Pailón, YPFB Guillermo Elder
  machineId?: string | undefined; // Si es roseta para un tractor/cosechadora
  status: BsisaPermitStatus;
  documentNumber?: string | undefined;
  notes?: string | undefined;
  estanciaId?: string | undefined;
}

export function getBsisaDaysRemaining(expiryDate: string): number {
  if (!expiryDate) return 0;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function computeBsisaStatus(
  expiryDate: string,
  manualStatus?: BsisaPermitStatus,
): BsisaPermitStatus {
  if (manualStatus === "En trámite") return "En trámite";
  const days = getBsisaDaysRemaining(expiryDate);
  if (days < 0) return "Vencido";
  if (days <= 30) return "Por vencer";
  return "Vigente";
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
  soilCondition:
    | "Óptimo para labores"
    | "Humedad adecuada"
    | "Saturado / Anegado (Esperar 48h)"
    | "Déficit hídrico";
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

// ---------------------------------------------------------------------------
// MÓDULO VEHÍCULOS LIVIANOS, COMBUSTIBLE Y CALCULADORA PREDICTIVA DE REPUESTOS
// ---------------------------------------------------------------------------
export type VehicleType =
  | "Camioneta 4x4"
  | "Motocicleta"
  | "Cuadratrack / UTV"
  | "Camión Utilitario"
  | "Automóvil";

export type VehicleFuelType =
  | "Gasolina Especial"
  | "Gasolina Premium"
  | "Diésel Vehicular";

export interface Vehicle {
  id: string;
  name: string; // ej. "Toyota Hilux 4x4 (Administración)"
  plate: string; // ej. "4021-NBS"
  type: VehicleType;
  fuelType: VehicleFuelType;
  currentKm: number;
  averageKmPerLiter: number; // ej. 11.2 km/L
  tankCapacityLiters: number; // ej. 80 L
  lastOilChangeKm: number;
  oilIntervalKm: number; // ej. 5000 o 7500 km
  lastBrakeChangeKm: number;
  brakeIntervalKm: number; // ej. 25000 km
  lastAirFilterChangeKm: number;
  airFilterIntervalKm: number; // ej. 6000 km
  lastTireChangeKm: number;
  tireIntervalKm: number; // ej. 45000 km
  assignedDriver?: string | undefined;
  imageUrl?: string | undefined;
  emoji?: string | undefined;
  notes?: string | undefined;
}

export function getVehicleDefaultEmoji(type: VehicleType): string {
  switch (type) {
    case "Camioneta 4x4":
      return "🛻";
    case "Motocicleta":
      return "🏍️";
    case "Cuadratrack / UTV":
      return "🏎️";
    case "Camión Utilitario":
      return "🚛";
    default:
      return "🚗";
  }
}

export function getVehicleDefaultImage(type: VehicleType): string {
  switch (type) {
    case "Camioneta 4x4":
      return "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80";
    case "Motocicleta":
      return "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80";
    case "Cuadratrack / UTV":
      return "https://images.unsplash.com/photo-1579227114347-15d08fc37cae?auto=format&fit=crop&w=1200&q=80";
    case "Camión Utilitario":
      return "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80";
    default:
      return "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80";
  }
}

export interface VehicleFuelLog {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  odometerKm: number;
  liters: number;
  pricePerLiterBs: number; // Bs 3.74 (Gasolina) o Bs 3.72 (Diésel)
  totalCostBs: number;
  fuelType: VehicleFuelType;
  station: string; // ej. "Surtidor Pailón Norte / YPFB"
  driver: string;
  fullTank: boolean;
  calculatedKmPerLiter?: number | undefined;
  costPerKmBs?: number | undefined;
  receiptPhotoUrl?: string | undefined;
  notes?: string | undefined;
}

export type VehicleServiceType =
  | "Cambio de Aceite y Filtros"
  | "Pastillas y Discos de Freno"
  | "Filtro de Aire / Combustible"
  | "Amortiguadores y Suspensión"
  | "Neumáticos y Alineación"
  | "Mantenimiento General / Taller";

export interface VehicleMaintenanceLog {
  id: string;
  vehicleId: string;
  date: string;
  odometerKm: number;
  serviceType: VehicleServiceType;
  partsReplaced: string;
  costBs: number;
  workshopOrMechanic: string;
  invoicePhotoUrl?: string | undefined;
  notes?: string | undefined;
}

export type RoadCondition =
  | "Tierra y Ripio con Polvo"
  | "Barro / Zafra Pesada"
  | "Asfalto y Carretera";

export interface ComponentWearStatus {
  name: string;
  percentRemaining: number; // 0% a 100%
  kmRemaining: number;
  status: "Óptimo" | "Atención preventiva" | "Cambio urgente";
  isPrematureAlert: boolean;
  alertMessage?: string | undefined;
}

export function computeVehicleWear(
  vehicle: Vehicle,
  roadCondition: RoadCondition = "Tierra y Ripio con Polvo",
): {
  oil: ComponentWearStatus;
  airFilter: ComponentWearStatus;
  brakes: ComponentWearStatus;
  tires: ComponentWearStatus;
  wearFactor: number;
} {
  const wearFactor =
    roadCondition === "Barro / Zafra Pesada"
      ? 1.5
      : roadCondition === "Tierra y Ripio con Polvo"
        ? 1.35
        : 1.0;

  // 1. Aceite de Motor
  const oilKm = Math.max(0, vehicle.currentKm - vehicle.lastOilChangeKm);
  const effectiveOilInterval = vehicle.oilIntervalKm / (wearFactor > 1.2 ? 1.15 : 1.0);
  const oilRemaining = Math.max(0, effectiveOilInterval - oilKm);
  const oilPercent = Math.max(
    0,
    Math.min(100, Math.round((oilRemaining / effectiveOilInterval) * 100)),
  );
  const oilStatus: ComponentWearStatus["status"] =
    oilRemaining <= 0 ? "Cambio urgente" : oilRemaining <= 1000 ? "Atención preventiva" : "Óptimo";

  // 2. Filtro de Aire (Sufre con polvo severo de cosecha/zafra)
  const airKm = Math.max(0, vehicle.currentKm - vehicle.lastAirFilterChangeKm);
  const effectiveAirInterval = vehicle.airFilterIntervalKm / wearFactor;
  const airRemaining = Math.max(0, effectiveAirInterval - airKm);
  const airPercent = Math.max(
    0,
    Math.min(100, Math.round((airRemaining / effectiveAirInterval) * 100)),
  );
  const airStatus: ComponentWearStatus["status"] =
    airRemaining <= 0 ? "Cambio urgente" : airRemaining <= 800 ? "Atención preventiva" : "Óptimo";
  const airPrematureAlert = wearFactor > 1.2 && airPercent <= 40;

  // 3. Pastillas y Discos de Freno
  const brakeKm = Math.max(0, vehicle.currentKm - vehicle.lastBrakeChangeKm);
  const effectiveBrakeInterval = vehicle.brakeIntervalKm / wearFactor;
  const brakeRemaining = Math.max(0, effectiveBrakeInterval - brakeKm);
  const brakePercent = Math.max(
    0,
    Math.min(100, Math.round((brakeRemaining / effectiveBrakeInterval) * 100)),
  );
  const brakeStatus: ComponentWearStatus["status"] =
    brakeRemaining <= 0 ? "Cambio urgente" : brakeRemaining <= 2000 ? "Atención preventiva" : "Óptimo";

  // 4. Neumáticos
  const tireKm = Math.max(0, vehicle.currentKm - vehicle.lastTireChangeKm);
  const effectiveTireInterval = vehicle.tireIntervalKm / (wearFactor > 1 ? 1.2 : 1.0);
  const tireRemaining = Math.max(0, effectiveTireInterval - tireKm);
  const tirePercent = Math.max(
    0,
    Math.min(100, Math.round((tireRemaining / effectiveTireInterval) * 100)),
  );
  const tireStatus: ComponentWearStatus["status"] =
    tireRemaining <= 0 ? "Cambio urgente" : tireRemaining <= 4000 ? "Atención preventiva" : "Óptimo";

  return {
    oil: {
      name: "Aceite de Motor",
      percentRemaining: oilPercent,
      kmRemaining: Math.round(oilRemaining),
      status: oilStatus,
      isPrematureAlert: oilRemaining <= 1000,
      alertMessage:
        oilRemaining <= 0
          ? "Aceite vencido. Peligro de fricción excesiva y desgaste prematuro de aros/pistón."
          : oilRemaining <= 1000
            ? `Próximo cambio de aceite requerido en ${Math.round(oilRemaining)} km.`
            : undefined,
    },
    airFilter: {
      name: "Filtro de Aire",
      percentRemaining: airPercent,
      kmRemaining: Math.round(airRemaining),
      status: airStatus,
      isPrematureAlert: airPrematureAlert,
      alertMessage: airPrematureAlert
        ? "Polvo de cosecha acelera saturación. Cambiar o sopletear para no ahogar inyección."
        : undefined,
    },
    brakes: {
      name: "Pastillas de Freno",
      percentRemaining: brakePercent,
      kmRemaining: Math.round(brakeRemaining),
      status: brakeStatus,
      isPrematureAlert: brakeRemaining <= 1500,
      alertMessage:
        brakeRemaining <= 1500
          ? `Espesor crítico en pastillas por caminos de tierra abrasivos (${Math.round(brakeRemaining)} km).`
          : undefined,
    },
    tires: {
      name: "Neumáticos",
      percentRemaining: tirePercent,
      kmRemaining: Math.round(tireRemaining),
      status: tireStatus,
      isPrematureAlert: tireRemaining <= 3000,
      alertMessage:
        tireRemaining <= 3000 ? "Banda de rodadura con desgaste acelerado por ripio." : undefined,
    },
    wearFactor,
  };
}

export const initialVehicles: Vehicle[] = [
  {
    id: "v1",
    name: "Toyota Hilux 4x4 (Administración & Gerencia)",
    plate: "4021-NBS",
    type: "Camioneta 4x4",
    fuelType: "Diésel Vehicular",
    currentKm: 118450,
    averageKmPerLiter: 11.2,
    tankCapacityLiters: 80,
    lastOilChangeKm: 114200,
    oilIntervalKm: 7500,
    lastBrakeChangeKm: 102000,
    brakeIntervalKm: 25000,
    lastAirFilterChangeKm: 112000,
    airFilterIntervalKm: 6000,
    lastTireChangeKm: 85000,
    tireIntervalKm: 45000,
    assignedDriver: "Ing. Roberto Paz (Administrador)",
    emoji: "🛻",
    imageUrl: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1000&q=80",
    notes: "Camioneta de viajes a ciudad y supervisión central de campos",
  },
  {
    id: "v2",
    name: "Nissan Frontier 4x4 (Agronomía & Monitoreo)",
    plate: "3815-KPT",
    type: "Camioneta 4x4",
    fuelType: "Gasolina Especial",
    currentKm: 164200,
    averageKmPerLiter: 9.4,
    tankCapacityLiters: 75,
    lastOilChangeKm: 160500,
    oilIntervalKm: 5000,
    lastBrakeChangeKm: 148000,
    brakeIntervalKm: 20000,
    lastAirFilterChangeKm: 159000,
    airFilterIntervalKm: 5000,
    lastTireChangeKm: 130000,
    tireIntervalKm: 40000,
    assignedDriver: "Ing. Walter Mendoza (Agrónomo)",
    emoji: "🛻",
    imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80",
    notes: "Vehículo de campo pesado para monitoreo de plagas y suelos",
  },
  {
    id: "v3",
    name: "Honda XR 250 Tornado (Recorredor de Lotes)",
    plate: "2240-XTR",
    type: "Motocicleta",
    fuelType: "Gasolina Especial",
    currentKm: 32800,
    averageKmPerLiter: 28.5,
    tankCapacityLiters: 12,
    lastOilChangeKm: 30800,
    oilIntervalKm: 3000,
    lastBrakeChangeKm: 26000,
    brakeIntervalKm: 15000,
    lastAirFilterChangeKm: 30000,
    airFilterIntervalKm: 4000,
    lastTireChangeKm: 20000,
    tireIntervalKm: 20000,
    assignedDriver: "Zenón Mamani (Capataz)",
    emoji: "🏍️",
    imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1000&q=80",
    notes: "Recorrido diario de linderos, compuertas y pluviómetros",
  },
  {
    id: "v4",
    name: "Can-Am Outlander 450 (Cuadratrack Pulverización)",
    plate: "S/P-CUAD-01",
    type: "Cuadratrack / UTV",
    fuelType: "Gasolina Especial",
    currentKm: 14650,
    averageKmPerLiter: 12.0,
    tankCapacityLiters: 20,
    lastOilChangeKm: 13500,
    oilIntervalKm: 2500,
    lastBrakeChangeKm: 11000,
    brakeIntervalKm: 10000,
    lastAirFilterChangeKm: 13200,
    airFilterIntervalKm: 3000,
    lastTireChangeKm: 8000,
    tireIntervalKm: 15000,
    assignedDriver: "Juan Rojas (Operador)",
    emoji: "🏎️",
    imageUrl: "https://images.unsplash.com/photo-1579227114347-15d08fc37cae?auto=format&fit=crop&w=1000&q=80",
    notes: "Acceso a lotes anegados y apoyo en pulverización terrestre",
  },
  {
    id: "v5",
    name: "Isuzu FTR 15t (Camión Apoyo & Taller Móvil)",
    plate: "1940-YUB",
    type: "Camión Utilitario",
    fuelType: "Diésel Vehicular",
    currentKm: 245800,
    averageKmPerLiter: 4.8,
    tankCapacityLiters: 200,
    lastOilChangeKm: 238000,
    oilIntervalKm: 10000,
    lastBrakeChangeKm: 220000,
    brakeIntervalKm: 35000,
    lastAirFilterChangeKm: 240000,
    airFilterIntervalKm: 8000,
    lastTireChangeKm: 210000,
    tireIntervalKm: 50000,
    assignedDriver: "Pedro Salazar (Mecánico Jefe)",
    emoji: "🚛",
    imageUrl: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1000&q=80",
    notes: "Transporte de tambores de aceite, repuestos pesados y auxilio de maquinaria",
  },
];

export const initialVehicleFuelLogs: VehicleFuelLog[] = [
  {
    id: "vf-1",
    vehicleId: "v1",
    date: "2026-10-14",
    odometerKm: 117850,
    liters: 70,
    pricePerLiterBs: 3.72,
    totalCostBs: 260.4,
    fuelType: "Diésel Vehicular",
    station: "Surtidor Pailón Norte / YPFB",
    driver: "Ing. Roberto Paz",
    fullTank: true,
    calculatedKmPerLiter: 11.4,
    costPerKmBs: 0.33,
    notes: "Carga tanque lleno para viaje a oficinas Santa Cruz",
  },
  {
    id: "vf-2",
    vehicleId: "v1",
    date: "2026-10-20",
    odometerKm: 118450,
    liters: 55,
    pricePerLiterBs: 3.72,
    totalCostBs: 204.6,
    fuelType: "Diésel Vehicular",
    station: "Surtidor Cuatro Cañadas / YPFB",
    driver: "Ing. Roberto Paz",
    fullTank: true,
    calculatedKmPerLiter: 10.9,
    costPerKmBs: 0.34,
    notes: "Recorrido de inspección zafra de soya",
  },
  {
    id: "vf-3",
    vehicleId: "v2",
    date: "2026-10-12",
    odometerKm: 163650,
    liters: 65,
    pricePerLiterBs: 3.74,
    totalCostBs: 243.1,
    fuelType: "Gasolina Especial",
    station: "Estación de Servicio Pailón",
    driver: "Ing. Walter Mendoza",
    fullTank: true,
    calculatedKmPerLiter: 9.2,
    costPerKmBs: 0.41,
    notes: "Muestreo de suelo y monitoreo en Lote Norte A y B",
  },
  {
    id: "vf-4",
    vehicleId: "v2",
    date: "2026-10-19",
    odometerKm: 164200,
    liters: 58,
    pricePerLiterBs: 3.74,
    totalCostBs: 216.92,
    fuelType: "Gasolina Especial",
    station: "Surtidor Cuatro Cañadas",
    driver: "Ing. Walter Mendoza",
    fullTank: true,
    calculatedKmPerLiter: 9.5,
    costPerKmBs: 0.39,
    notes: "Monitoreo fenológico y evaluación de orugas en La Esperanza",
  },
  {
    id: "vf-5",
    vehicleId: "v3",
    date: "2026-10-16",
    odometerKm: 32800,
    liters: 10,
    pricePerLiterBs: 3.74,
    totalCostBs: 37.4,
    fuelType: "Gasolina Especial",
    station: "Surtidor Pailón",
    driver: "Zenón Mamani",
    fullTank: true,
    calculatedKmPerLiter: 28.0,
    costPerKmBs: 0.13,
    notes: "Carga bidón y tanque de moto para ronda de linderos",
  },
  {
    id: "vf-6",
    vehicleId: "v5",
    date: "2026-10-15",
    odometerKm: 245800,
    liters: 140,
    pricePerLiterBs: 3.72,
    totalCostBs: 520.8,
    fuelType: "Diésel Vehicular",
    station: "Surtidor YPFB Montero",
    driver: "Pedro Salazar",
    fullTank: false,
    notes: "Flete de repuestos y filtros hidráulicos desde Santa Cruz",
  },
];

export const initialVehicleMaintenanceLogs: VehicleMaintenanceLog[] = [
  {
    id: "vm-1",
    vehicleId: "v1",
    date: "2026-09-18",
    odometerKm: 114200,
    serviceType: "Cambio de Aceite y Filtros",
    partsReplaced: "7.5 L Aceite Sintético 5W30 Toyota, filtro de aceite y filtro de combustible diésel",
    costBs: 850,
    workshopOrMechanic: "Lubricentro & Taller Pailón",
    notes: "Cambio regular cada 7.500 km. Niveles de caja y diferencial revisados",
  },
  {
    id: "vm-2",
    vehicleId: "v2",
    date: "2026-10-02",
    odometerKm: 160500,
    serviceType: "Cambio de Aceite y Filtros",
    partsReplaced: "5 L Aceite 10W40 Semisintético, filtro de aceite motor y arandela de cárter",
    costBs: 480,
    workshopOrMechanic: "Taller Central Estancia (Pedro Salazar)",
    notes: "Aceite cambiado en taller propio de la estancia",
  },
  {
    id: "vm-3",
    vehicleId: "v2",
    date: "2026-09-22",
    odometerKm: 159000,
    serviceType: "Filtro de Aire / Combustible",
    partsReplaced: "Filtro de aire de alto flujo para polvo extremo Nissan D40",
    costBs: 280,
    workshopOrMechanic: "Repuestos Autopartes Santa Cruz",
    notes: "Reemplazo preventivo por saturación de polvo en zafra de trigo",
  },
  {
    id: "vm-4",
    vehicleId: "v1",
    date: "2026-08-15",
    odometerKm: 102000,
    serviceType: "Pastillas y Discos de Freno",
    partsReplaced: "Juego de pastillas de freno cerámicas delanteras Toyota Genuine",
    costBs: 920,
    workshopOrMechanic: "Frenos & Embragues Montero",
    notes: "Rectificado leve de discos delanteros y purga de líquido DOT 4",
  },
  {
    id: "vm-5",
    vehicleId: "v3",
    date: "2026-09-10",
    odometerKm: 30800,
    serviceType: "Cambio de Aceite y Filtros",
    partsReplaced: "1.5 L Aceite Motul 4T 20W50 y limpieza de filtro de tamiz",
    costBs: 110,
    workshopOrMechanic: "Mecánica de Motos Pailón",
    notes: "Ajuste y lubricación de cadena de transmisión",
  },
];

export const initialFuelTank: FuelTankInfo = {
  capacityLiters: 25000,
  monthlyQuotaLiters: 20000,
};

export const initialBsisaPermits: BsisaPermit[] = [
  {
    id: "bp-1",
    permitNumber: "RA-ANH-ULCR-2026/0488",
    permitType: "Resolución de Cupo ANH (Cisterna Estancia)",
    issuedDate: "2026-01-15",
    expiryDate: "2026-12-31",
    monthlyQuotaLiters: 20000,
    authorizedStation: "Estación de Servicio Pailón Norte / YPFB",
    status: "Vigente",
    documentNumber: "FOLIO-ANH-7721",
    notes: "Cupo de 20.000 L/mes aprobado para campaña de siembra y cosecha de verano",
  },
  {
    id: "bp-2",
    permitNumber: "RFID-B-SISA-77421",
    permitType: "Roseta RFID B-SISA (Maquinaria Agrícola)",
    issuedDate: "2025-11-20",
    expiryDate: "2026-11-20",
    machineId: "m1",
    authorizedStation: "Red Nacional Surtidores B-SISA",
    status: "Vigente",
    notes: "Inspección técnica anual aprobada en taller móvil ANH Montero",
  },
  {
    id: "bp-3",
    permitNumber: "RFID-B-SISA-66019",
    permitType: "Roseta RFID B-SISA (Maquinaria Agrícola)",
    issuedDate: "2025-11-05",
    expiryDate: "2026-11-05",
    machineId: "m3",
    authorizedStation: "Red Nacional Surtidores B-SISA",
    status: "Por vencer",
    notes: "Agendar inspección técnica de la ANH para Cosechadora Case antes de que expire",
  },
  {
    id: "bp-4",
    permitNumber: "HR-DGSC-SCZ-99120",
    permitType: "Hoja de Ruta / Transporte DGSC",
    issuedDate: "2026-10-18",
    expiryDate: "2026-10-25",
    monthlyQuotaLiters: 10000,
    authorizedStation: "Refinería Guillermo Elder Bell a Estancia San José",
    status: "Vigente",
    notes: "Autorización de traslado en camión cisterna propio de 10.000 L",
  },
  {
    id: "bp-5",
    permitNumber: "RFID-B-SISA-88104",
    permitType: "Roseta RFID B-SISA (Maquinaria Agrícola)",
    issuedDate: "2026-02-15",
    expiryDate: "2027-02-15",
    machineId: "m5",
    authorizedStation: "Red Nacional Surtidores B-SISA",
    status: "Vigente",
    notes: "Inspección técnica al día certificada por ANH Santa Cruz para tractor Massey",
  },
  {
    id: "bp-6",
    permitNumber: "TC-ANH-PROV-3312",
    permitType: "Tarjeta de Compra en Surtidor",
    issuedDate: "2026-03-01",
    expiryDate: "2027-03-01",
    monthlyQuotaLiters: 5000,
    authorizedStation: "Estación de Servicio Cuatro Cañadas / YPFB",
    status: "Vigente",
    notes: "Tarjeta magnética de compra directa en estación autorizada",
  },
];

export const initialSupplies: Supply[] = [
  {
    id: "s0",
    name: "Diésel Oíl (Tanque Estancia)",
    category: "Combustibles",
    stock: 14200,
    minStock: 3000,
    unit: "Litros",
    unitCost: 3.72,
  },
  {
    id: "s1",
    name: "Semilla Soya Don Mario 6.2 RR",
    category: "Semillas",
    stock: 1200,
    minStock: 500,
    unit: "Kilos",
    unitCost: 12.5,
  },
  {
    id: "s2",
    name: "Semilla Maíz Híbrido Dekalb 7088",
    category: "Semillas",
    stock: 180,
    minStock: 300,
    unit: "Kilos",
    unitCost: 31.0,
  },
  {
    id: "s3",
    name: "Urea Granulada 46% (YPFB)",
    category: "Fertilizantes",
    stock: 3500,
    minStock: 1000,
    unit: "Kilos",
    unitCost: 4.3,
  },
  {
    id: "s4",
    name: "Fosfato Diamónico (DAP 18-46-0)",
    category: "Fertilizantes",
    stock: 640,
    minStock: 800,
    unit: "Kilos",
    unitCost: 5.9,
  },
  {
    id: "s5",
    name: "Cipermetrina 25% EC",
    category: "Insecticidas",
    stock: 95,
    minStock: 40,
    unit: "Litros",
    unitCost: 64.0,
  },
  {
    id: "s6",
    name: "Clorpirifós 48% CE",
    category: "Insecticidas",
    stock: 22,
    minStock: 30,
    unit: "Litros",
    unitCost: 80.0,
  },
  {
    id: "s7",
    name: "Glifosato Concentrado 62%",
    category: "Herbicidas",
    stock: 410,
    minStock: 150,
    unit: "Litros",
    unitCost: 37.5,
  },
  {
    id: "s8",
    name: "Semilla Sorgo Granífero Advanta",
    category: "Semillas",
    stock: 450,
    minStock: 200,
    unit: "Kilos",
    unitCost: 18.0,
  },
  {
    id: "s9",
    name: "Cloruro de Potasio (KCl 0-0-60)",
    category: "Fertilizantes",
    stock: 1500,
    minStock: 500,
    unit: "Kilos",
    unitCost: 5.2,
  },
  {
    id: "s10",
    name: "Ampligo 150 ZC (Syngenta)",
    category: "Insecticidas",
    stock: 45,
    minStock: 20,
    unit: "Litros",
    unitCost: 240.0,
  },
  {
    id: "s11",
    name: "2,4-D Amina 720 SL",
    category: "Herbicidas",
    stock: 180,
    minStock: 60,
    unit: "Litros",
    unitCost: 48.0,
  },
];

export const initialLots: Lot[] = [
  {
    id: "l1",
    name: "Lote Norte A",
    hectares: 120,
    crop: "Soya",
    status: "Crecimiento",
    location: "Sector Pailón",
  },
  {
    id: "l2",
    name: "Lote Norte B",
    hectares: 85,
    crop: "Maíz",
    status: "Siembra",
    location: "Sector Pailón",
  },
  {
    id: "l3",
    name: "La Esperanza",
    hectares: 210,
    crop: "Soya",
    status: "Cosecha",
    location: "Cuatro Cañadas",
  },
  {
    id: "l4",
    name: "El Bajío",
    hectares: 64,
    crop: "Sorgo",
    status: "Crecimiento",
    location: "San Julián",
  },
  {
    id: "l5",
    name: "Parcela Río",
    hectares: 45,
    crop: "Trigo",
    status: "Barbecho",
    location: "Montero",
  },
  {
    id: "l6",
    name: "Las Palmeras",
    hectares: 150,
    crop: "Girasol",
    status: "Crecimiento",
    location: "Sector San Pedro",
  },
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
  {
    id: "m5",
    name: "Massey Ferguson 7720S",
    type: "Tractor",
    hourmeter: 1620,
    status: "Operativa",
    hourlyCost: 280, // Bs 280/h
    serviceIntervalHours: 250,
    lastServiceHourmeter: 1500,
    fuelAverageLitersPerHour: 13.8,
  },
  {
    id: "m6",
    name: "John Deere S780",
    type: "Cosechadora",
    hourmeter: 1150,
    status: "Operativa",
    hourlyCost: 890, // Bs 890/h
    serviceIntervalHours: 250,
    lastServiceHourmeter: 1000,
    fuelAverageLitersPerHour: 34.0,
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
    notes: "Aplicación preventiva de insecticida tercio medio en Lote Norte A",
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
    notes: "Siembra directa de maíz Dekalb con humedad de suelo óptima",
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
    notes: "Cosecha primer corte de soya campaña verano en La Esperanza",
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
    notes: "Control de malezas en entresurco de sorgo en El Bajío",
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
    notes: "Aplicación de urea granulada al voleo en Lote Norte A",
  },
  {
    id: "u6",
    date: "2026-10-19",
    machineId: "m5",
    lotId: "l5",
    operator: "Gonzalo Siles",
    laborType: "Preparación de suelo (Rastra / Cincel)",
    startHours: 1608,
    endHours: 1620,
    dieselLiters: 165,
    operatingCost: 3360,
    costPerHectare: 74.67,
    notes: "Descompactación y rastra pesada en suelo arcilloso Parcela Río",
  },
  {
    id: "u7",
    date: "2026-10-18",
    machineId: "m2",
    lotId: "l6",
    operator: "René Morales",
    laborType: "Siembra directa",
    startHours: 2865,
    endHours: 2875,
    dieselLiters: 150,
    operatingCost: 2900,
    costPerHectare: 19.33,
    notes: "Siembra directa de girasol en Lote Las Palmeras",
  },
  {
    id: "u8",
    date: "2026-10-14",
    machineId: "m6",
    lotId: "l1",
    operator: "Mario Alcocer",
    laborType: "Cosecha mecanizada",
    startHours: 1136,
    endHours: 1150,
    dieselLiters: 476,
    operatingCost: 12460,
    costPerHectare: 103.83,
    notes: "Cosecha mecanizada Lote Norte A con plataforma Draper 35ft",
  },
];

export const initialLedger: LedgerEntry[] = [
  {
    id: "e1",
    date: "2026-10-01",
    description: "Compra Diésel Oíl YPFB (10.000 L Cisterna B-SISA)",
    category: "Combustibles",
    type: "egreso",
    amount: 37200,
  },
  {
    id: "e2",
    date: "2026-10-02",
    description: "Compra Cipermetrina 25% (100 L)",
    category: "Insumos",
    type: "egreso",
    amount: 6400,
  },
  {
    id: "e3",
    date: "2026-10-03",
    description: "Fumigación Lote Norte A (8h Jacto Uniport)",
    category: "Maquinaria",
    type: "egreso",
    amount: 3360,
    lotId: "l1",
  },
  {
    id: "e4",
    date: "2026-10-05",
    description: "Jornales apoyo siembra lote Maíz (cuadrilla campo)",
    category: "Jornales",
    type: "egreso",
    amount: 9450,
    lotId: "l2",
  },
  {
    id: "e5",
    date: "2026-10-12",
    description: "Liquidación venta soya – 180 t (ADM Bolivia)",
    category: "Venta de Cosecha",
    type: "ingreso",
    amount: 504000,
    lotId: "l3",
  },
  {
    id: "e6",
    date: "2026-10-12",
    description: "Cosecha La Esperanza (18h Case Axial-Flow)",
    category: "Maquinaria",
    type: "egreso",
    amount: 15120,
    lotId: "l3",
  },
  {
    id: "e7",
    date: "2026-10-14",
    description: "Compra Urea 46% (3.500 Kg YPFB)",
    category: "Insumos",
    type: "egreso",
    amount: 15050,
  },
  {
    id: "e8",
    date: "2026-10-15",
    description: "Service 250h Tractor John Deere 6155J",
    category: "Mantenimiento",
    type: "egreso",
    amount: 2450,
  },
  {
    id: "e9",
    date: "2026-10-18",
    description: "Jornales mantenimiento y aceitado de implementos",
    category: "Jornales",
    type: "egreso",
    amount: 4480,
  },
  {
    id: "e10",
    date: "2026-09-20",
    description: "Venta maíz chulpi – 40 t (Granos del Oriente)",
    category: "Venta de Cosecha",
    type: "ingreso",
    amount: 68600,
    lotId: "l2",
  },
  {
    id: "e11",
    date: "2026-10-19",
    description: "Preparación de suelo Parcela Río (12h Massey Ferguson)",
    category: "Maquinaria",
    type: "egreso",
    amount: 3360,
    lotId: "l5",
  },
  {
    id: "e12",
    date: "2026-10-20",
    description: "Reparación hidráulica New Holland T7.240",
    category: "Mantenimiento",
    type: "egreso",
    amount: 4200,
  },
  {
    id: "e13",
    date: "2026-10-15",
    description: "Liquidación venta soya Lote Norte A (ADM Bolivia)",
    category: "Venta de Cosecha",
    type: "ingreso",
    amount: 78623.8,
    lotId: "l1",
  },
  {
    id: "e14",
    date: "2026-10-14",
    description: "Cosecha mecanizada Lote Norte A (14h John Deere S780)",
    category: "Maquinaria",
    type: "egreso",
    amount: 12460,
    lotId: "l1",
  },
  {
    id: "e15",
    date: "2026-10-17",
    description: "Liquidación venta sorgo granífero (Cargill San Julián)",
    category: "Venta de Cosecha",
    type: "ingreso",
    amount: 38932.5,
    lotId: "l4",
  },
  {
    id: "e16",
    date: "2026-10-18",
    description: "Siembra directa Lote Las Palmeras (10h New Holland)",
    category: "Maquinaria",
    type: "egreso",
    amount: 2900,
    lotId: "l6",
  },
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
    notes: "Descarga completa en tanque cisterna principal autorizada por ANH",
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
  {
    id: "f5",
    date: "2026-10-15",
    type: "despacho",
    liters: 216,
    pricePerLiter: 3.72,
    totalCostBs: 803.52,
    destinationOrSource: "Jacto Uniport 3030",
    machineId: "m4",
    operator: "Juan Rojas",
    notes: "Pulverización y control de malezas El Bajío",
  },
  {
    id: "f6",
    date: "2026-10-19",
    type: "despacho",
    liters: 165,
    pricePerLiter: 3.72,
    totalCostBs: 613.8,
    destinationOrSource: "Massey Ferguson 7720S",
    machineId: "m5",
    operator: "Gonzalo Siles",
    notes: "Preparación de suelo Parcela Río",
  },
  {
    id: "f7",
    date: "2026-10-18",
    type: "despacho",
    liters: 150,
    pricePerLiter: 3.72,
    totalCostBs: 558.0,
    destinationOrSource: "New Holland T7.240",
    machineId: "m2",
    operator: "René Morales",
    notes: "Siembra directa girasol Lote Las Palmeras",
  },
  {
    id: "f8",
    date: "2026-10-14",
    type: "despacho",
    liters: 476,
    pricePerLiter: 3.72,
    totalCostBs: 1770.72,
    destinationOrSource: "John Deere S780",
    machineId: "m6",
    operator: "Mario Alcocer",
    notes: "Cosecha mecanizada soya Lote Norte A",
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
    notes: "Grano sano de primera, sin descuento por quebrado",
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
  {
    id: "h3",
    ticketNumber: "TK-48215",
    date: "2026-10-13",
    lotId: "l3",
    crop: "Soya",
    siloDestination: "Gravetal Bolivia (Silo Pailón)",
    driver: "Gonzalo Flores",
    truckPlate: "1943-UEP",
    grossWeightKg: 41800,
    tareWeightKg: 14200,
    netWeightKg: 27600,
    moisturePercent: 12.9,
    impurityPercent: 0.9,
    deductionKg: 160,
    payableWeightKg: 27440,
    payableTons: 27.44,
    pricePerTonBs: 2820,
    totalAmountBs: 77380.8,
    status: "Liquidado",
    notes: "Excelente peso hectolítrico, bonificación de precio acordada",
  },
  {
    id: "h4",
    ticketNumber: "TK-48230",
    date: "2026-10-14",
    lotId: "l3",
    crop: "Soya",
    siloDestination: "Cargill Bolivia (Silo San Julián)",
    driver: "Mario Alcocer",
    truckPlate: "4120-NRT",
    grossWeightKg: 44200,
    tareWeightKg: 15100,
    netWeightKg: 29100,
    moisturePercent: 14.1,
    impurityPercent: 1.4,
    deductionKg: 410,
    payableWeightKg: 28690,
    payableTons: 28.69,
    pricePerTonBs: 2790,
    totalAmountBs: 80045.1,
    status: "En silo",
    notes: "En proceso de liquidación comercial por lote consolidado",
  },
  {
    id: "h5",
    ticketNumber: "TK-48255",
    date: "2026-09-20",
    lotId: "l2",
    crop: "Maíz",
    siloDestination: "Granos del Oriente (Silo Montero)",
    driver: "Carlos Medina",
    truckPlate: "2291-HYA",
    grossWeightKg: 38500,
    tareWeightKg: 13500,
    netWeightKg: 25000,
    moisturePercent: 14.2,
    impurityPercent: 1.2,
    deductionKg: 300,
    payableWeightKg: 24700,
    payableTons: 24.7,
    pricePerTonBs: 1715,
    totalAmountBs: 42360.5,
    status: "Liquidado",
    notes: "Maíz comercial grano amarillo duro para consumo avícola",
  },
  {
    id: "h6",
    ticketNumber: "TK-48280",
    date: "2026-10-15",
    lotId: "l1",
    crop: "Soya",
    siloDestination: "ADM Bolivia (Silo Pailón)",
    driver: "Juan Pablo Terrazas",
    truckPlate: "3188-BCE",
    grossWeightKg: 42800,
    tareWeightKg: 14600,
    netWeightKg: 28200,
    moisturePercent: 13.0,
    impurityPercent: 1.0,
    deductionKg: 220,
    payableWeightKg: 27980,
    payableTons: 27.98,
    pricePerTonBs: 2810,
    totalAmountBs: 78623.8,
    status: "Liquidado",
    notes: "Entrega cosecha Lote Norte A, grano de alta calidad",
  },
  {
    id: "h7",
    ticketNumber: "TK-48295",
    date: "2026-10-17",
    lotId: "l4",
    crop: "Sorgo",
    siloDestination: "Cargill Bolivia (Silo San Julián)",
    driver: "René Morales",
    truckPlate: "2940-ZPA",
    grossWeightKg: 41200,
    tareWeightKg: 14100,
    netWeightKg: 27100,
    moisturePercent: 13.5,
    impurityPercent: 1.1,
    deductionKg: 250,
    payableWeightKg: 26850,
    payableTons: 26.85,
    pricePerTonBs: 1450,
    totalAmountBs: 38932.5,
    status: "Liquidado",
    notes: "Sorgo granífero seco cosechado en El Bajío",
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
    partsReplaced:
      "Filtro de aceite John Deere, filtro combustible primario, 22 L aceite motor 15W40",
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
  {
    id: "mnt-3",
    machineId: "m3",
    date: "2026-09-10",
    hourmeter: 1750,
    serviceType: "Service 500h",
    mechanic: "Ing. Walter Suárez (Técnico Concesionario)",
    costBs: 5800,
    partsReplaced:
      "Kit filtros hidráulicos, cambio aceite de caja y reductores, revisión de correas y zarandón",
    notes: "Alineación de cuchillas de plataforma flex Draper 40ft previa a cosecha",
  },
  {
    id: "mnt-4",
    machineId: "m2",
    date: "2026-10-18",
    hourmeter: 2875,
    serviceType: "Reparación correctiva",
    mechanic: "Taller Hidráulico Santa Cruz",
    costBs: 4200,
    partsReplaced:
      "Cambio de mangueras de alta presión levante hidráulico, retén de toma de fuerza y sellos",
    notes: "Equipo en prueba de estanqueidad post-reparación en taller",
  },
  {
    id: "mnt-5",
    machineId: "m5",
    date: "2026-09-02",
    hourmeter: 1500,
    serviceType: "Service 250h",
    mechanic: "Pedro Salazar",
    costBs: 2300,
    partsReplaced:
      "Filtro aire secundario, filtro de aceite motor y grasa grafitada de acople",
    notes: "Revisión preventiva de batería y alternador",
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
  {
    id: "rf-5",
    date: "2026-09-24",
    lotId: "l4",
    millimeters: 12.0,
    durationHours: 1.0,
    soilCondition: "Déficit hídrico",
    notes: "Precipitación ligera insuficiente en sector El Bajío",
  },
  {
    id: "rf-6",
    date: "2026-10-21",
    lotId: "l5",
    millimeters: 22.5,
    durationHours: 2.0,
    soilCondition: "Humedad adecuada",
    notes: "Aporte de humedad favorable para acondicionamiento de cama de siembra",
  },
  {
    id: "rf-7",
    date: "2026-10-17",
    lotId: "l6",
    millimeters: 31.0,
    durationHours: 2.5,
    soilCondition: "Humedad adecuada",
    notes: "Precipitación uniforme que favorece la emergencia de girasol",
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
  {
    id: "lab-4",
    date: "2026-10-16",
    workerName: "Eustaquio Gutiérrez",
    lotId: "l4",
    taskDescription: "Limpieza de canales de desagüe y mantenimiento de alambrados",
    daysWorked: 4,
    dailyRateBs: 140,
    totalCostBs: 560,
    isPaid: true,
    notes: "Mantenimiento preventivo por temporada de lluvias",
  },
  {
    id: "lab-5",
    date: "2026-10-18",
    workerName: "Teodoro Huanca",
    lotId: "l1",
    taskDescription: "Banderillero y preparación de caldo para pulverización terrestre",
    daysWorked: 2,
    dailyRateBs: 150,
    totalCostBs: 300,
    isPaid: true,
    notes: "Apoyo en fumigación lote Norte A",
  },
  {
    id: "lab-6",
    date: "2026-10-20",
    workerName: "Braulio Quispe",
    lotId: "l5",
    taskDescription: "Recojo de ramas, tocones y limpieza de cabeceras",
    daysWorked: 3,
    dailyRateBs: 140,
    totalCostBs: 420,
    isPaid: false,
    notes: "Acondicionamiento Parcela Río",
  },
  {
    id: "lab-7",
    date: "2026-10-19",
    workerName: "Santos Condori",
    lotId: "l6",
    taskDescription: "Aporque manual y replante en cabeceras de girasol",
    daysWorked: 2.5,
    dailyRateBs: 150,
    totalCostBs: 375,
    isPaid: true,
    notes: "Cuadrilla Sector San Pedro",
  },
  {
    id: "lab-8",
    date: "2026-10-18",
    workerName: "Mateo Cruz",
    lotId: "l4",
    taskDescription: "Desbroce manual y limpieza de maleza leñosa",
    daysWorked: 3,
    dailyRateBs: 140,
    totalCostBs: 420,
    isPaid: true,
    notes: "Mantenimiento potrero El Bajío",
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
    recommendedAction:
      "Monitoreo en 48 hrs y preparar pulverizadora con Cipermetrina 25% si supera umbral",
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
  {
    id: "sc-4",
    date: "2026-10-18",
    lotId: "l3",
    phenologicalStage: "R6 (Llenado de grano final)",
    pestName: "Chinche Marrón (Euschistus heros)",
    pestSeverity: "Media",
    weedPressure: "Media (Focos aislados)",
    disease: "Roya Asiática (Phakopsora pachyrhizi)",
    recommendedAction:
      "Aplicación preventiva de fungicida triazol + estrobirulina para protección de vainas superiores",
    supplyRecommendedId: "s5",
    notes: "Presencia de focos en estrato inferior por alta humedad relativa post-lluvia",
  },
  {
    id: "sc-5",
    date: "2026-10-21",
    lotId: "l5",
    phenologicalStage: "Barbecho químico",
    pestSeverity: "Ninguna",
    weedPressure: "Alta (Requiere desecación)",
    disease: "Ninguna",
    recommendedAction:
      "Desecación total con Glifosato 62% + 2,4-D Amina antes de la siembra de trigo",
    supplyRecommendedId: "s7",
    notes: "Rebrote de pasto amargo y malezas de hoja ancha en cabeceras",
  },
  {
    id: "sc-6",
    date: "2026-10-21",
    lotId: "l6",
    phenologicalStage: "V8 (Ocho hojas desplegadas)",
    pestName: "Oruga de las hojas (Chlosyne lacinia)",
    pestSeverity: "Baja",
    weedPressure: "Controlada",
    disease: "Ninguna",
    recommendedAction:
      "Monitoreo semanal preventivo. Nivel de defoliación menor al 5% no requiere control químico",
    notes: "Excelente vigor y desarrollo radicular en suelo profundo",
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
  withDecimals = false,
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
    [headers.map(processCell).join(","), ...rows.map((row) => row.map(processCell).join(","))].join(
      "\r\n",
    );

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
