import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  Car,
  Fuel,
  Wrench,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Download,
  Search,
  Sliders,
  DollarSign,
  ShieldAlert,
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  Settings,
  Radio,
  RotateCcw,
  Maximize2,
  TrendingUp,
  Flame,
  Check,
  Volume2,
  VolumeX,
  Lightbulb,
  FileText,
  BatteryCharging,
  Wifi,
  Navigation,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAgro } from "@/lib/agro-store";
import {
  formatMoney,
  currency,
  number,
  exportToCsv,
  computeVehicleWear,
  getVehicleDefaultEmoji,
  getVehicleDefaultImage,
  type Vehicle,
  type VehicleType,
  type VehicleFuelType,
  type VehicleServiceType,
  type RoadCondition,
} from "@/lib/agro-data";
import {
  uploadVehiclePhoto,
  getCloudinaryConfig,
  setCloudinaryConfig,
  buildCloudinaryUrl,
} from "@/lib/cloudinary";
import { PageHeader, Panel, Pill, StatCard, Field, selectClass } from "@/components/agro/ui";

/**
 * Sintetizador Web Audio nativo para retroalimentación táctil EV tipo Tesla
 * (cero dependencias de librerías externas o archivos de sonido descargables)
 */
function playTeslaChime(type: "gear" | "toggle" | "horn" | "engine", soundOn = true) {
  if (!soundOn || typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "gear") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "toggle") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } else if (type === "horn") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(392, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } else if (type === "engine") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch {
    // Silencio si el navegador no permite AudioContext automático sin interacción
  }
}

export const Route = createFileRoute("/vehiculos")({
  head: () => ({
    meta: [
      { title: "Vehículos, Flota & Cabina Digital Tesla · AgroAdmin Bolivia" },
      {
        name: "description",
        content:
          "Cockpit digital futurista estilo Tesla, telemetría de odómetro, registro de gasolina y diésel, rendimiento km/L, cambio de aceite y calculadora inteligente de desgaste prematuro.",
      },
    ],
  }),
  component: VehiculosRoute,
});

export function VehiculosRoute() {
  const {
    vehicles,
    vehicleFuelLogs,
    vehicleMaintenanceLogs,
    upsertVehicle,
    addVehicleFuelLog,
    addVehicleMaintenanceLog,
    updateVehiclePhoto,
    currencyMode,
    exchangeRate,
  } = useAgro();

  // Navigation tab state
  const [selectedTab, setSelectedTab] = useState<string>("flota");
  const [vehicleSearch, setVehicleSearch] = useState<string>("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedCockpitVehicleId, setSelectedCockpitVehicleId] = useState<string>(
    vehicles[0]?.id || "v1",
  );

  // Dialogs state
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [cloudinarySettingsOpen, setCloudinarySettingsOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicleForPhoto, setSelectedVehicleForPhoto] = useState<Vehicle | null>(null);

  // Cloudinary Settings Form
  const [cCloudName, setCCloudName] = useState(() => getCloudinaryConfig().cloudName);
  const [cUploadPreset, setCUploadPreset] = useState(() => getCloudinaryConfig().uploadPreset || "");
  const [cApiKey, setCApiKey] = useState(() => getCloudinaryConfig().apiKey || "");
  const [cApiSecret, setCApiSecret] = useState(() => getCloudinaryConfig().apiSecret || "");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // File input refs for camera and file upload
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tesla Interactive Cyber-Cockpit State
  const [activeGear, setActiveGear] = useState<"P" | "R" | "N" | "D">("P");
  const [simulatedSpeed, setSimulatedSpeed] = useState<number>(0);
  const [headlightsOn, setHeadlightsOn] = useState<boolean>(false);
  const [diffLockOn, setDiffLockOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [driveMode, setDriveMode] = useState<"standard" | "eco" | "barro">("standard");
  const [tpmsDialogOpen, setTpmsDialogOpen] = useState<boolean>(false);
  const [docDialogOpen, setDocDialogOpen] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectGear = (gear: "P" | "R" | "N" | "D") => {
    setActiveGear(gear);
    playTeslaChime("gear", soundEnabled);
    if (gear === "D") {
      setSimulatedSpeed(38);
      toast.info("Marcha D (Drive) · Telemetría y tracción activadas", { duration: 1600 });
    } else if (gear === "R") {
      setSimulatedSpeed(6);
      toast.info("Marcha R (Retroceso) · Guía visual de maniobra activa", { duration: 1600 });
    } else if (gear === "P") {
      setSimulatedSpeed(0);
      toast.info("Marcha P (Park) · Freno electrónico de mano bloqueado", { duration: 1600 });
    } else {
      setSimulatedSpeed(0);
      toast.info("Marcha N (Neutro)", { duration: 1600 });
    }
  };

  const handleToggleSpeed = () => {
    if (activeGear === "P") {
      handleSelectGear("D");
    } else if (simulatedSpeed < 65) {
      setSimulatedSpeed((s) => s + 15);
      playTeslaChime("engine", soundEnabled);
    } else {
      setSimulatedSpeed(25);
      playTeslaChime("toggle", soundEnabled);
    }
  };

  // Fuel Dialog Form State
  const [fuelVehicleId, setFuelVehicleId] = useState<string>("");
  const [fuelDate, setFuelDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [fuelType, setFuelType] = useState<VehicleFuelType>("Gasolina Especial");
  const [fuelLiters, setFuelLiters] = useState<number>(65);
  const [fuelPricePerLiterBs, setFuelPricePerLiterBs] = useState<number>(3.74);
  const [fuelOdometerKm, setFuelOdometerKm] = useState<number>(0);
  const [fuelStation, setFuelStation] = useState<string>("Surtidor Pailón Norte / YPFB");
  const [fuelDriver, setFuelDriver] = useState<string>("");
  const [fuelFullTank, setFuelFullTank] = useState<boolean>(true);
  const [fuelNotes, setFuelNotes] = useState<string>("");

  // Maintenance Dialog Form State
  const [maintVehicleId, setMaintVehicleId] = useState<string>("");
  const [maintDate, setMaintDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [maintServiceType, setMaintServiceType] = useState<VehicleServiceType>("Cambio de Aceite y Filtros");
  const [maintOdometerKm, setMaintOdometerKm] = useState<number>(0);
  const [maintPartsReplaced, setMaintPartsReplaced] = useState<string>("");
  const [maintWorkshop, setMaintWorkshop] = useState<string>("Taller Central Estancia");
  const [maintCostBs, setMaintCostBs] = useState<number>(480);
  const [maintNotes, setMaintNotes] = useState<string>("");

  // Vehicle Profile Form State
  const [vehName, setVehName] = useState<string>("");
  const [vehPlate, setVehPlate] = useState<string>("");
  const [vehType, setVehType] = useState<VehicleType>("Camioneta 4x4");
  const [vehFuelType, setVehFuelType] = useState<VehicleFuelType>("Gasolina Especial");
  const [vehCurrentKm, setVehCurrentKm] = useState<number>(0);
  const [vehAvgKmPerLiter, setVehAvgKmPerLiter] = useState<number>(9.5);
  const [vehTankCapLiters, setVehTankCapLiters] = useState<number>(75);
  const [vehOilIntervalKm, setVehOilIntervalKm] = useState<number>(5000);
  const [vehAirFilterIntervalKm, setVehAirFilterIntervalKm] = useState<number>(5000);
  const [vehBrakeIntervalKm, setVehBrakeIntervalKm] = useState<number>(20000);
  const [vehTireIntervalKm, setVehTireIntervalKm] = useState<number>(40000);
  const [vehDriver, setVehDriver] = useState<string>("");
  const [vehEmoji, setVehEmoji] = useState<string>("🛻");
  const [vehImageUrl, setVehImageUrl] = useState<string>("");
  const [vehNotes, setVehNotes] = useState<string>("");

  // Smart Wear Calculator State
  const [calcVehicleId, setCalcVehicleId] = useState<string>(vehicles[0]?.id || "");
  const [calcRoadCondition, setCalcRoadCondition] = useState<RoadCondition>("Tierra y Ripio con Polvo");
  const [calcMonthlyKm, setCalcMonthlyKm] = useState<number>(2800);
  const [calcLoadSeverity, setCalcLoadSeverity] = useState<number>(1.15); // 1.0 standard, 1.15 cargo, 1.30 towing

  // Active vehicle for the panoramic cockpit HUD
  const cockpitVehicle = useMemo(() => {
    return (
      vehicles.find((v) => v.id === selectedCockpitVehicleId) ||
      vehicles[0] ||
      null
    );
  }, [vehicles, selectedCockpitVehicleId]);

  // KPIs
  const totalFleetCount = vehicles.length;
  const totalOdometer = vehicles.reduce((sum, v) => sum + v.currentKm, 0);
  const totalFuelCostBs = vehicleFuelLogs.reduce((sum, f) => sum + f.totalCostBs, 0);
  const totalFuelLiters = vehicleFuelLogs.reduce((sum, f) => sum + f.liters, 0);

  const logsWithEfficiency = vehicleFuelLogs.filter((f) => (f.calculatedKmPerLiter ?? 0) > 0);
  const avgEfficiencyKmPerL =
    logsWithEfficiency.length > 0
      ? logsWithEfficiency.reduce((sum, f) => sum + (f.calculatedKmPerLiter || 0), 0) / logsWithEfficiency.length
      : 0;

  // Fleet wear alerts
  const fleetAlerts = useMemo(() => {
    return vehicles.flatMap((v) => {
      const wear = computeVehicleWear(v, "Tierra y Ripio con Polvo");
      const alertsList: Array<{ vehicle: Vehicle; component: string; message: string; urgent: boolean }> = [];
      if (wear.oil.alertMessage) {
        alertsList.push({
          vehicle: v,
          component: wear.oil.name,
          message: wear.oil.alertMessage,
          urgent: wear.oil.status === "Cambio urgente",
        });
      }
      if (wear.airFilter.alertMessage) {
        alertsList.push({
          vehicle: v,
          component: wear.airFilter.name,
          message: wear.airFilter.alertMessage,
          urgent: wear.airFilter.status === "Cambio urgente",
        });
      }
      if (wear.brakes.alertMessage) {
        alertsList.push({
          vehicle: v,
          component: wear.brakes.name,
          message: wear.brakes.alertMessage,
          urgent: wear.brakes.status === "Cambio urgente",
        });
      }
      if (wear.tires.alertMessage) {
        alertsList.push({
          vehicle: v,
          component: wear.tires.name,
          message: wear.tires.alertMessage,
          urgent: wear.tires.status === "Cambio urgente",
        });
      }
      return alertsList;
    });
  }, [vehicles]);

  // Selected vehicle for calculator
  const selectedCalcVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === calcVehicleId) || vehicles[0];
  }, [vehicles, calcVehicleId]);

  // Predictive calculations for selected vehicle in calculator
  const calcWear = useMemo(() => {
    if (!selectedCalcVehicle) return null;
    const baseWear = computeVehicleWear(selectedCalcVehicle, calcRoadCondition);
    const effectiveMonthlyKm = calcMonthlyKm * calcLoadSeverity;
    const daysUntilOil = Math.max(
      1,
      Math.round((baseWear.oil.kmRemaining / (effectiveMonthlyKm / 30))),
    );

    const projectedMonthlyOilCostBs = (effectiveMonthlyKm / selectedCalcVehicle.oilIntervalKm) * 500;
    const projectedFuelMonthlyLiters =
      effectiveMonthlyKm / (selectedCalcVehicle.averageKmPerLiter || 9.0);
    const projectedFuelMonthlyBs =
      projectedFuelMonthlyLiters * (selectedCalcVehicle.fuelType === "Diésel Vehicular" ? 3.72 : 3.74);

    return {
      baseWear,
      effectiveMonthlyKm,
      daysUntilOil,
      dustSeverityFactor: baseWear.wearFactor,
      projectedMonthlyOilCostBs,
      projectedFuelMonthlyBs,
      projectedFuelMonthlyLiters,
    };
  }, [selectedCalcVehicle, calcRoadCondition, calcMonthlyKm, calcLoadSeverity]);

  // Filtered vehicles list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchType = selectedTypeFilter === "all" || v.type === selectedTypeFilter;
      const q = vehicleSearch.toLowerCase();
      const matchSearch =
        !vehicleSearch ||
        v.plate.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        (v.assignedDriver?.toLowerCase().includes(q) ?? false);
      return matchType && matchSearch;
    });
  }, [vehicles, selectedTypeFilter, vehicleSearch]);

  // Open Fuel Dialog
  const handleOpenFuelDialog = (vId?: string) => {
    const targetVeh = vehicles.find((v) => v.id === vId) || vehicles[0];
    if (targetVeh) {
      setFuelVehicleId(targetVeh.id);
      setFuelOdometerKm(targetVeh.currentKm + 450);
      setFuelType(targetVeh.fuelType);
      setFuelPricePerLiterBs(targetVeh.fuelType === "Diésel Vehicular" ? 3.72 : 3.74);
      setFuelDriver(targetVeh.assignedDriver || "Conductor General");
    }
    setFuelDialogOpen(true);
  };

  // Open Maintenance Dialog
  const handleOpenMaintenanceDialog = (vId?: string, defaultService?: VehicleServiceType) => {
    const targetVeh = vehicles.find((v) => v.id === vId) || vehicles[0];
    if (targetVeh) {
      setMaintVehicleId(targetVeh.id);
      setMaintOdometerKm(targetVeh.currentKm);
      if (defaultService) setMaintServiceType(defaultService);
      setMaintCostBs(
        defaultService === "Cambio de Aceite y Filtros"
          ? 520
          : defaultService === "Filtro de Aire / Combustible"
          ? 220
          : defaultService === "Pastillas y Discos de Freno"
          ? 400
          : 600,
      );
      setMaintPartsReplaced(
        defaultService === "Cambio de Aceite y Filtros"
          ? "Aceite multigrado 15W40 + Filtro de aceite Mann"
          : defaultService === "Filtro de Aire / Combustible"
          ? "Filtro de aire para polvo de zafra Mann / Donaldson"
          : "Servicio preventivo de flota",
      );
    }
    setMaintenanceDialogOpen(true);
  };

  // Open Vehicle Profile Dialog
  const handleOpenVehicleDialog = (v?: Vehicle) => {
    if (v) {
      setEditingVehicle(v);
      setVehName(v.name);
      setVehPlate(v.plate);
      setVehType(v.type);
      setVehFuelType(v.fuelType);
      setVehCurrentKm(v.currentKm);
      setVehAvgKmPerLiter(v.averageKmPerLiter);
      setVehTankCapLiters(v.tankCapacityLiters);
      setVehOilIntervalKm(v.oilIntervalKm);
      setVehAirFilterIntervalKm(v.airFilterIntervalKm);
      setVehBrakeIntervalKm(v.brakeIntervalKm);
      setVehTireIntervalKm(v.tireIntervalKm);
      setVehDriver(v.assignedDriver || "");
      setVehEmoji(v.emoji || getVehicleDefaultEmoji(v.type));
      setVehImageUrl(v.imageUrl || getVehicleDefaultImage(v.type));
      setVehNotes(v.notes || "");
    } else {
      setEditingVehicle(null);
      setVehName("");
      setVehPlate("");
      setVehType("Camioneta 4x4");
      setVehFuelType("Gasolina Especial");
      setVehCurrentKm(0);
      setVehAvgKmPerLiter(9.5);
      setVehTankCapLiters(75);
      setVehOilIntervalKm(5000);
      setVehAirFilterIntervalKm(5000);
      setVehBrakeIntervalKm(20000);
      setVehTireIntervalKm(40000);
      setVehDriver("");
      setVehEmoji("🛻");
      setVehImageUrl(getVehicleDefaultImage("Camioneta 4x4"));
      setVehNotes("");
    }
    setVehicleDialogOpen(true);
  };

  // Open Photo Dialog
  const handleOpenPhotoDialog = (v: Vehicle) => {
    setSelectedVehicleForPhoto(v);
    setPhotoDialogOpen(true);
  };

  // Upload or process captured photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedVehicleForPhoto) return;

    try {
      setIsUploadingPhoto(true);
      toast.info("Procesando foto del vehículo...");
      const result = await uploadVehiclePhoto(file);
      updateVehiclePhoto(selectedVehicleForPhoto.id, result.url);
      toast.success(
        result.provider === "cloudinary"
          ? "¡Foto subida a Cloudinary exitosamente!"
          : "¡Foto optimizada y guardada en el vehículo!",
      );
      setPhotoDialogOpen(false);
    } catch (err) {
      toast.error("Error al procesar la foto");
      console.error(err);
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  // Save Cloudinary configuration
  const handleSaveCloudinary = (e: React.FormEvent) => {
    e.preventDefault();
    setCloudinaryConfig(cCloudName, cUploadPreset, cApiKey, cApiSecret);
    toast.success("Configuración de Cloudinary guardada");
    setCloudinarySettingsOpen(false);
  };

  // Submit Fuel Log
  const handleSaveFuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelVehicleId) {
      toast.error("Seleccione un vehículo");
      return;
    }
    if (fuelLiters <= 0) {
      toast.error("Los litros deben ser mayores a 0");
      return;
    }

    const selectedV = vehicles.find((v) => v.id === fuelVehicleId);
    if (selectedV && fuelOdometerKm < selectedV.currentKm) {
      toast.error(
        `El odómetro no puede ser inferior al actual (${number(selectedV.currentKm)} km)`,
      );
      return;
    }

    const totalCost = Math.round(fuelLiters * fuelPricePerLiterBs * 100) / 100;

    addVehicleFuelLog({
      vehicleId: fuelVehicleId,
      date: fuelDate,
      odometerKm: fuelOdometerKm,
      liters: fuelLiters,
      pricePerLiterBs: fuelPricePerLiterBs,
      fuelType,
      station: fuelStation,
      driver: fuelDriver || selectedV?.assignedDriver || "Conductor",
      fullTank: fuelFullTank,
      notes: fuelNotes,
    });

    toast.success("¡Carga de combustible registrada!", {
      description: `${fuelLiters} L (${formatMoney(totalCost, currencyMode, exchangeRate)}) imputados como egreso en Contabilidad.`,
    });
    setFuelDialogOpen(false);
  };

  // Submit Maintenance Log
  const handleSaveMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintVehicleId) {
      toast.error("Seleccione un vehículo");
      return;
    }
    if (maintCostBs <= 0) {
      toast.error("El costo debe ser mayor a 0");
      return;
    }

    addVehicleMaintenanceLog({
      vehicleId: maintVehicleId,
      date: maintDate,
      odometerKm: maintOdometerKm,
      serviceType: maintServiceType,
      partsReplaced: maintPartsReplaced,
      costBs: maintCostBs,
      workshopOrMechanic: maintWorkshop,
      notes: maintNotes,
    });

    toast.success("¡Mantenimiento preventivo registrado!", {
      description: `Contador de desgaste reiniciado y egreso imputado en Contabilidad (Mantenimiento).`,
    });
    setMaintenanceDialogOpen(false);
  };

  // Submit Vehicle
  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehPlate.trim() || !vehName.trim()) {
      toast.error("Complete nombre y placa");
      return;
    }

    const targetId = editingVehicle ? editingVehicle.id : `v-${Date.now()}`;
    const newVehicle: Vehicle = {
      id: targetId,
      name: vehName.trim(),
      plate: vehPlate.trim().toUpperCase(),
      type: vehType,
      fuelType: vehFuelType,
      currentKm: Number(vehCurrentKm),
      averageKmPerLiter: Number(vehAvgKmPerLiter),
      tankCapacityLiters: Number(vehTankCapLiters),
      lastOilChangeKm: editingVehicle?.lastOilChangeKm ?? Number(vehCurrentKm),
      oilIntervalKm: Number(vehOilIntervalKm),
      lastBrakeChangeKm: editingVehicle?.lastBrakeChangeKm ?? Number(vehCurrentKm),
      brakeIntervalKm: Number(vehBrakeIntervalKm),
      lastAirFilterChangeKm: editingVehicle?.lastAirFilterChangeKm ?? Number(vehCurrentKm),
      airFilterIntervalKm: Number(vehAirFilterIntervalKm),
      lastTireChangeKm: editingVehicle?.lastTireChangeKm ?? Number(vehCurrentKm),
      tireIntervalKm: Number(vehTireIntervalKm),
      assignedDriver: vehDriver.trim() || undefined,
      emoji: vehEmoji || getVehicleDefaultEmoji(vehType),
      imageUrl: vehImageUrl || getVehicleDefaultImage(vehType),
      notes: vehNotes.trim() || undefined,
    };

    upsertVehicle(newVehicle);
    toast.success(editingVehicle ? "Vehículo actualizado" : "Nuevo vehículo incorporado a la flota");
    setVehicleDialogOpen(false);
  };

  // Export Fuel Logs CSV
  const handleExportFuelLogs = () => {
    exportToCsv(
      "bitacora_combustible_flota",
      [
        "Fecha",
        "Vehículo",
        "Combustible",
        "Litros",
        "Precio/L (Bs)",
        "Total (Bs)",
        "Total (USD)",
        "Odómetro (km)",
        "Rendimiento (km/L)",
        "Costo/km (Bs)",
        "Surtidor",
        "Conductor",
      ],
      vehicleFuelLogs.map((f) => {
        const v = vehicles.find((x) => x.id === f.vehicleId);
        return [
          f.date,
          v ? `${v.plate} - ${v.name}` : f.vehicleId,
          f.fuelType,
          f.liters,
          f.pricePerLiterBs,
          f.totalCostBs,
          (f.totalCostBs / exchangeRate).toFixed(2),
          f.odometerKm,
          f.calculatedKmPerLiter ? f.calculatedKmPerLiter.toFixed(1) : "N/D",
          f.costPerKmBs ? f.costPerKmBs.toFixed(2) : "N/D",
          f.station,
          f.driver,
        ];
      }),
    );
    toast.success("Bitácora de combustible exportada en CSV");
  };

  // Export Maintenance Logs CSV
  const handleExportMaintenanceLogs = () => {
    exportToCsv(
      "bitacora_mantenimiento_repuestos_flota",
      [
        "Fecha",
        "Vehículo",
        "Tipo de Servicio",
        "Odómetro (km)",
        "Repuestos y Trabajos",
        "Taller / Mecánico",
        "Costo (Bs)",
        "Costo (USD)",
      ],
      vehicleMaintenanceLogs.map((m) => {
        const v = vehicles.find((x) => x.id === m.vehicleId);
        return [
          m.date,
          v ? `${v.plate} - ${v.name}` : m.vehicleId,
          m.serviceType,
          m.odometerKm,
          m.partsReplaced,
          m.workshopOrMechanic,
          m.costBs,
          (m.costBs / exchangeRate).toFixed(2),
        ];
      }),
    );
    toast.success("Historial de mantenimientos y repuestos exportado en CSV");
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <PageHeader
        title="Vehículos, Flota & Cabina Digital Tesla"
        subtitle="Cockpit panorámico digital con telemetría de odómetro, registro de gasolina y diésel, rendimiento km/L, cambio de aceite y calculadora inteligente de repuestos bajo condiciones de campo."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCloudinarySettingsOpen(true)}
              className="gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              title="Configurar Cloudinary para almacenamiento en la nube"
            >
              <Settings className="size-3.5" />
              <span>Cloudinary</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenVehicleDialog()}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="size-3.5" />
              <span>Nuevo Vehículo</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenMaintenanceDialog()}
              className="gap-1.5 text-xs font-semibold"
            >
              <Wrench className="size-3.5 text-amber-500" />
              <span>Registrar Mantenimiento</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleOpenFuelDialog()}
              className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Fuel className="size-3.5" />
              <span>Cargar Combustible</span>
            </Button>
          </div>
        }
      />

      {/* COCKPIT PANORÁMICO DIGITAL ESTILO TESLA CYBER-INSTRUMENT CLUSTER */}
      {cockpitVehicle && (
        <div className="relative overflow-hidden rounded-2xl bg-[#090d16] text-white border border-cyan-500/30 shadow-[0_12px_45px_rgba(0,0,0,0.7)] p-4 sm:p-6 transition-all">
          {/* Luz ambiental superior y resplandor de pantalla táctil */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-3/4 h-36 bg-gradient-to-b from-cyan-500/25 via-sky-500/10 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-transparent to-black/80 pointer-events-none" />

          {/* BARRA SUPERIOR ESTILO TESLA OS: Reloj en vivo, GPS RTK, Red 4G, Batería 12V y Selector de Chofer */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider text-cyan-400">
                <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                TELEMETRÍA TESLA OS 12
              </span>
              <span className="text-white/30">·</span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-white/70">
                <Wifi className="size-3 text-emerald-400" />
                <span>4G LTE</span>
              </span>
              <span className="text-white/30">·</span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-white/70">
                <Navigation className="size-3 text-cyan-400" />
                <span>RTK ±2cm (San José)</span>
              </span>
            </div>

            {/* Selector rápido de vehículo estilo Cyber-Tabs */}
            <div className="flex items-center gap-1.5 bg-black/70 p-1 rounded-lg border border-white/10">
              <span className="text-[10px] text-white/50 px-1 font-semibold uppercase">Vehículo:</span>
              <div className="flex items-center gap-1 overflow-x-auto max-w-[260px] sm:max-w-none">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedCockpitVehicleId(v.id);
                      playTeslaChime("toggle", soundEnabled);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                      v.id === cockpitVehicle.id
                        ? "bg-cyan-500 text-black shadow-[0_0_14px_rgba(6,182,212,0.7)]"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span>{v.emoji || getVehicleDefaultEmoji(v.type)}</span>
                    <span>{v.plate}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reloj y Sensores Auxiliares en Barra Superior */}
            <div className="flex items-center gap-2.5 font-mono text-[11px] text-white/70">
              <span className="hidden md:inline-flex items-center gap-1 text-white/60">
                <BatteryCharging className="size-3.5 text-cyan-400" /> 14.2V Óptimo
              </span>
              <span className="hidden sm:inline text-white/30">·</span>
              <span className="text-cyan-300 font-bold">{currentTimeStr || "19:00"}</span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title={soundEnabled ? "Silenciar audio táctil" : "Activar audio táctil"}
              >
                {soundEnabled ? <Volume2 className="size-3.5 text-cyan-400" /> : <VolumeX className="size-3.5 text-white/40" />}
              </button>
            </div>
          </div>

          {/* CUERPO CENTRAL DEL COCKPIT: INSTRUMENT CLUSTER */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center py-4 sm:py-6">
            {/* LADO IZQUIERDO: VELOCÍMETRO DIGITAL HUD & AUTONOMÍA */}
            <div className="lg:col-span-3 flex flex-col justify-between space-y-4 text-center lg:text-left">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-mono text-cyan-400 font-bold flex items-center justify-center lg:justify-start gap-1.5">
                  <Zap className="size-3 text-cyan-400" />
                  <span>Velocímetro / Horómetro</span>
                </span>
                <div className="flex items-baseline justify-center lg:justify-start gap-2 mt-1">
                  <span className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                    {simulatedSpeed}
                  </span>
                  <span className="font-mono text-xs uppercase text-white/60 font-bold">KM/H</span>
                  {activeGear !== "P" && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold animate-pulse">
                      MARCHA {activeGear}
                    </span>
                  )}
                </div>

                {/* Barra de Flujo / Power Band estilo Tesla (Cyan potencia / Verde regen) */}
                <div className="w-full max-w-[220px] h-1.5 bg-white/10 rounded-full mx-auto lg:mx-0 mt-2 overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-300 ${
                      activeGear === "D"
                        ? "w-3/4 bg-gradient-to-r from-cyan-400 to-sky-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                        : activeGear === "R"
                        ? "w-1/3 bg-amber-400"
                        : "w-0 bg-transparent"
                    }`}
                  />
                </div>

                {/* Gatillo de Test de Telemetría Dinámica */}
                {activeGear === "D" && (
                  <button
                    type="button"
                    onClick={handleToggleSpeed}
                    className="mt-2 text-[10px] font-mono text-cyan-400 hover:text-cyan-200 underline block"
                  >
                    Acelerar / Probar Telemetría ({simulatedSpeed} km/h)
                  </button>
                )}
              </div>

              {/* Odómetro & Autonomía Estimada */}
              <div className="space-y-2 bg-white/[0.04] p-3 rounded-xl border border-white/10 backdrop-blur">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Odómetro Total:</span>
                  <span className="font-mono font-bold text-white tracking-wider">
                    {number(cockpitVehicle.currentKm)} km
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Autonomía Est.:</span>
                  <span className="font-mono font-bold text-cyan-400 flex items-center gap-1">
                    <Fuel className="size-3 text-cyan-400" />~
                    {Math.round(cockpitVehicle.tankCapacityLiters * cockpitVehicle.averageKmPerLiter)} km
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-white/50 pt-1 border-t border-white/10">
                  <span>Rendimiento:</span>
                  <span className="font-mono font-semibold text-white/80">
                    {cockpitVehicle.averageKmPerLiter} km/L
                  </span>
                </div>
              </div>
            </div>

            {/* CENTRO: HOLOGRAMA 3D DEL VEHÍCULO CON HAZ DE LUCES Y CONTROLES RÁPIDOS */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center relative group">
              {/* Haz de piso estilo showroom Tesla */}
              <div className="absolute inset-x-8 bottom-12 h-24 bg-gradient-to-t from-cyan-500/20 via-sky-500/10 to-transparent rounded-full blur-xl pointer-events-none" />

              {/* Haz de luces frontales si están encendidas */}
              {headlightsOn && (
                <div className="absolute inset-x-4 bottom-14 h-36 bg-gradient-to-t from-amber-300/30 via-yellow-100/15 to-transparent rounded-full blur-2xl pointer-events-none animate-pulse" />
              )}

              {/* Insignia y Badges de Estado */}
              <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-mono">
                  <span className="text-lg">{cockpitVehicle.emoji || getVehicleDefaultEmoji(cockpitVehicle.type)}</span>
                  <span className="font-bold text-white uppercase tracking-wider">{cockpitVehicle.plate}</span>
                  <span className="text-white/40">·</span>
                  <span className="text-cyan-300 font-semibold">{cockpitVehicle.type}</span>
                </div>

                {diffLockOn && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-[10px] font-mono text-red-300 font-bold animate-pulse">
                    <ShieldAlert className="size-3" /> 4x4 LOCK
                  </span>
                )}

                {headlightsOn && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-[10px] font-mono text-amber-300 font-bold">
                    <Lightbulb className="size-3" /> FAENA ON
                  </span>
                )}
              </div>

              {/* Render 3D / Foto del Vehículo con Reflejo */}
              <div className="relative w-full max-w-md h-52 sm:h-60 flex items-center justify-center overflow-hidden rounded-xl">
                <img
                  src={buildCloudinaryUrl(
                    cockpitVehicle.imageUrl || getVehicleDefaultImage(cockpitVehicle.type),
                  )}
                  alt={cockpitVehicle.name}
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)] transition-transform duration-500 group-hover:scale-105"
                />

                {/* Guía de Retroceso Asistida en Marcha R */}
                {activeGear === "R" && (
                  <div className="absolute inset-x-8 bottom-2 flex flex-col items-center pointer-events-none opacity-85">
                    <div className="w-3/4 border-b-2 border-dashed border-emerald-400 my-0.5" />
                    <div className="w-2/3 border-b-2 border-dashed border-amber-400 my-0.5" />
                    <div className="w-1/2 border-b-2 border-red-500 my-0.5" />
                    <span className="text-[9px] font-mono text-red-400 tracking-wider font-bold">
                      GUÍA RETROCESO ASISTIDO
                    </span>
                  </div>
                )}

                {/* Botón flotante para captura de fotos Cloudinary */}
                <button
                  type="button"
                  onClick={() => handleOpenPhotoDialog(cockpitVehicle)}
                  className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black text-cyan-400 hover:text-cyan-300 border border-cyan-500/50 text-xs font-semibold backdrop-blur shadow-lg transition-all"
                  title="Tomar foto con la cámara del celular o subir archivo a Cloudinary"
                >
                  <Camera className="size-3.5" />
                  <span>Tomar / Cambiar Foto</span>
                </button>
              </div>

              {/* Nombre y chofer */}
              <div className="text-center mt-1">
                <h3 className="font-bold text-base sm:text-lg text-white tracking-wide">
                  {cockpitVehicle.name}
                </h3>
                <p className="text-xs text-white/60">
                  Responsable: <strong className="text-cyan-300">{cockpitVehicle.assignedDriver || "General"}</strong> · Tanque:{" "}
                  <strong>{cockpitVehicle.tankCapacityLiters} L</strong> ({cockpitVehicle.fuelType})
                </p>
              </div>

              {/* BARRA DE CONTROLES RÁPIDOS ESTILO TESLA (TOYBOX) */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-3 border-t border-white/10 w-full">
                {/* Luces Faena Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setHeadlightsOn(!headlightsOn);
                    playTeslaChime("toggle", soundEnabled);
                    toast.info(`Luces de faena ${!headlightsOn ? "encendidas" : "apagadas"}`, { duration: 1400 });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    headlightsOn
                      ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.7)]"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Lightbulb className="size-3.5" />
                  <span>Luces Faena: {headlightsOn ? "ON" : "OFF"}</span>
                </button>

                {/* Bloqueo Diferencial 4x4 */}
                <button
                  type="button"
                  onClick={() => {
                    setDiffLockOn(!diffLockOn);
                    playTeslaChime("toggle", soundEnabled);
                    toast.info(`Diferencial 4x4 ${!diffLockOn ? "bloqueado (Modo Fango)" : "desbloqueado"}`, { duration: 1400 });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    diffLockOn
                      ? "bg-red-500 text-white border-red-400 shadow-[0_0_14px_rgba(239,68,68,0.7)]"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <ShieldAlert className="size-3.5" />
                  <span>Bloqueo Dif: {diffLockOn ? "LOCK" : "LIBRE"}</span>
                </button>

                {/* Presión TPMS */}
                <button
                  type="button"
                  onClick={() => {
                    setTpmsDialogOpen(true);
                    playTeslaChime("toggle", soundEnabled);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white text-xs font-semibold transition-all"
                >
                  <Gauge className="size-3.5 text-cyan-400" />
                  <span>Presión TPMS (32 PSI)</span>
                </button>

                {/* Bocina Claxon */}
                <button
                  type="button"
                  onClick={() => {
                    playTeslaChime("horn", soundEnabled);
                    toast.info("¡Bocina activada!", { duration: 1000 });
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white text-xs font-semibold transition-all"
                  title="Sonar bocina de faena"
                >
                  <Volume2 className="size-3.5 text-sky-400" />
                  <span>Bocina</span>
                </button>

                {/* Ficha Legal SOAT / B-SISA */}
                <button
                  type="button"
                  onClick={() => {
                    setDocDialogOpen(true);
                    playTeslaChime("toggle", soundEnabled);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white text-xs font-semibold transition-all"
                >
                  <FileText className="size-3.5 text-emerald-400" />
                  <span>SOAT / B-SISA</span>
                </button>
              </div>
            </div>

            {/* LADO DERECHO: SELECTOR DE MARCHAS TÁCTIL TESLA Y MODOS DE CONDUCCIÓN */}
            <div className="lg:col-span-3 flex flex-col justify-between space-y-4 text-center lg:text-right">
              {/* Selector de Transmisión Táctil Tesla */}
              <div>
                <span className="text-[10px] uppercase tracking-widest font-mono text-cyan-400 font-bold block">
                  Transmisión / Marcha Táctil
                </span>
                <div className="flex items-center justify-center lg:justify-end gap-2 mt-1.5">
                  {(["P", "R", "N", "D"] as const).map((gear) => (
                    <button
                      key={gear}
                      type="button"
                      onClick={() => handleSelectGear(gear)}
                      className={`size-9 grid place-items-center rounded-lg font-mono text-sm font-bold border transition-all ${
                        activeGear === gear
                          ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.8)] scale-105"
                          : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                      title={`Seleccionar marcha ${gear}`}
                    >
                      {gear}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Modos de Terreno Agro */}
              <div>
                <span className="text-[10px] uppercase tracking-widest font-mono text-white/50 font-bold block mb-1">
                  Modo de Terreno
                </span>
                <div className="grid grid-cols-3 gap-1 bg-black/60 p-1 rounded-lg border border-white/10 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setDriveMode("eco");
                      playTeslaChime("toggle", soundEnabled);
                    }}
                    className={`py-1 rounded font-semibold transition-all ${
                      driveMode === "eco"
                        ? "bg-emerald-500 text-black font-bold shadow-sm"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Eco
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDriveMode("standard");
                      playTeslaChime("toggle", soundEnabled);
                    }}
                    className={`py-1 rounded font-semibold transition-all ${
                      driveMode === "standard"
                        ? "bg-cyan-500 text-black font-bold shadow-sm"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    4WD
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDriveMode("barro");
                      setDiffLockOn(true);
                      playTeslaChime("toggle", soundEnabled);
                    }}
                    className={`py-1 rounded font-semibold transition-all ${
                      driveMode === "barro"
                        ? "bg-amber-500 text-black font-bold shadow-sm"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Barro
                  </button>
                </div>
              </div>

              {/* Telemetría de Próximo Servicio */}
              <div className="space-y-2 bg-white/[0.04] p-3 rounded-xl border border-white/10 backdrop-blur">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Modo Tracción:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {cockpitVehicle.type === "Motocicleta"
                      ? "2x1 Cadena"
                      : diffLockOn
                      ? "4x4 Bloqueo (4L)"
                      : "4x4 Alta (4H)"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Caminos Estancia:</span>
                  <span className="font-mono text-amber-400 font-semibold flex items-center gap-1">
                    <Flame className="size-3 text-amber-400" /> Ripio / Polvo
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-white/50 pt-1 border-t border-white/10">
                  <span>Próximo Servicio:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ~{Math.max(0, cockpitVehicle.oilIntervalKm - (cockpitVehicle.currentKm - cockpitVehicle.lastOilChangeKm))} km
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TELEMETRÍA INFERIOR: BARRAS LÁSER DE SALUD MECÁNICA */}
          {(() => {
            const wear = computeVehicleWear(cockpitVehicle, "Tierra y Ripio con Polvo");
            return (
              <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs">
                {/* Aceite de Motor */}
                <div className="bg-black/50 p-2.5 rounded-xl border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/70">Aceite Motor</span>
                    <span className="font-mono font-bold text-cyan-400">{wear.oil.percentRemaining}%</span>
                  </div>
                  <Progress
                    value={wear.oil.percentRemaining}
                    className="h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-emerald-400"
                  />
                  <span className="text-[10px] text-white/50 block font-mono">
                    {number(wear.oil.kmRemaining)} km restantes
                  </span>
                </div>

                {/* Filtro de Aire */}
                <div className="bg-black/50 p-2.5 rounded-xl border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/70">Filtro de Aire</span>
                    <span
                      className={`font-mono font-bold ${
                        wear.airFilter.status === "Cambio urgente"
                          ? "text-red-400"
                          : wear.airFilter.status === "Atención preventiva"
                          ? "text-amber-400"
                          : "text-cyan-400"
                      }`}
                    >
                      {wear.airFilter.percentRemaining}%
                    </span>
                  </div>
                  <Progress
                    value={wear.airFilter.percentRemaining}
                    className={`h-1.5 ${
                      wear.airFilter.status === "Cambio urgente"
                        ? "[&>div]:bg-red-500"
                        : wear.airFilter.status === "Atención preventiva"
                        ? "[&>div]:bg-amber-400"
                        : "[&>div]:bg-cyan-400"
                    }`}
                  />
                  <span className="text-[10px] text-white/50 block font-mono">
                    {wear.airFilter.status === "Cambio urgente" ? "Polvo crítico" : `${number(wear.airFilter.kmRemaining)} km`}
                  </span>
                </div>

                {/* Frenos */}
                <div className="bg-black/50 p-2.5 rounded-xl border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/70">Frenos / Balatas</span>
                    <span className="font-mono font-bold text-sky-400">{wear.brakes.percentRemaining}%</span>
                  </div>
                  <Progress value={wear.brakes.percentRemaining} className="h-1.5 [&>div]:bg-sky-400" />
                  <span className="text-[10px] text-white/50 block font-mono">
                    {number(wear.brakes.kmRemaining)} km restantes
                  </span>
                </div>

                {/* Neumáticos */}
                <div className="bg-black/50 p-2.5 rounded-xl border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/70">Banda Neumáticos</span>
                    <span className="font-mono font-bold text-slate-300">{wear.tires.percentRemaining}%</span>
                  </div>
                  <Progress value={wear.tires.percentRemaining} className="h-1.5 [&>div]:bg-slate-400" />
                  <span className="text-[10px] text-white/50 block font-mono">
                    {number(wear.tires.kmRemaining)} km restantes
                  </span>
                </div>
              </div>
            );
          })()}

          {/* DOCK INFERIOR ESTILO TESLA OS: Acceso Directo de Aplicaciones */}
          <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-4 mt-4 pt-3 border-t border-white/10 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setSelectedTab("flota")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                selectedTab === "flota"
                  ? "bg-white/15 text-white border-white/30"
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Car className="size-3.5 text-cyan-400" />
              <span>Flota</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenFuelDialog(cockpitVehicle.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all font-medium"
            >
              <Fuel className="size-3.5 text-amber-400" />
              <span>Cargar Combustible</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMaintenanceDialog(cockpitVehicle.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all font-medium"
            >
              <Wrench className="size-3.5 text-amber-500" />
              <span>Mantenimiento</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenPhotoDialog(cockpitVehicle)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 transition-all font-semibold"
            >
              <Camera className="size-3.5" />
              <span>Foto Celular</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab("calculadora")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                selectedTab === "calculadora"
                  ? "bg-white/15 text-white border-white/30"
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Sliders className="size-3.5 text-sky-400" />
              <span>Calculadora</span>
            </button>

            <button
              type="button"
              onClick={() => setCloudinarySettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all font-medium"
              title="Ajustes Cloudinary"
            >
              <Settings className="size-3.5" />
              <span className="hidden sm:inline">Cloudinary</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Superiores del Sistema */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Flota de Apoyo"
          value={`${totalFleetCount} Vehículos`}
          hint={`${vehicles.filter((v) => v.type === "Camioneta 4x4").length} Camionetas · ${vehicles.filter((v) => v.type === "Motocicleta").length} Moto · ${vehicles.filter((v) => v.type === "Cuadratrack / UTV").length} UTV`}
          icon={Car}
          tone="primary"
        />
        <StatCard
          label="Kilometraje Flota"
          value={`${number(totalOdometer)} km`}
          hint="Telemetría total consolidada"
          icon={Gauge}
          tone="accent"
        />
        <StatCard
          label="Gasto Combustible Flota"
          value={formatMoney(totalFuelCostBs, currencyMode, exchangeRate)}
          hint={`${number(totalFuelLiters)} Litros · Imputado en Contabilidad`}
          icon={Fuel}
          tone="warning"
        />
        <StatCard
          label="Rendimiento Promedio"
          value={avgEfficiencyKmPerL > 0 ? `${avgEfficiencyKmPerL.toFixed(1)} km/L` : "N/D"}
          hint={`Costo aprox.: Bs ${(3.74 / (avgEfficiencyKmPerL || 1)).toFixed(2)} por km`}
          icon={TrendingUp}
          tone="success"
        />
      </div>

      {/* Alerta de Desgaste si existe algún componente crítico */}
      {fleetAlerts.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                {fleetAlerts.length} Diagnóstico(s) Predictivo(s) de Desgaste Acelerado
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                {fleetAlerts[0]?.vehicle.plate} ({fleetAlerts[0]?.vehicle.name}): {fleetAlerts[0]?.message}
              </p>
            </div>
          </div>
          {fleetAlerts[0] && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const alertItem = fleetAlerts[0];
                if (alertItem) handleOpenMaintenanceDialog(alertItem.vehicle.id);
              }}
              className="shrink-0 bg-background/80 hover:bg-background text-xs font-semibold border-amber-500/40"
            >
              Atender Servicio
            </Button>
          )}
        </div>
      )}

      {/* Tabs Principales */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <TabsList className="bg-muted/70 p-1">
            <TabsTrigger value="flota" className="gap-2 text-xs font-semibold">
              <Car className="size-3.5" />
              <span>Flota & Tarjetas Visuales</span>
            </TabsTrigger>
            <TabsTrigger value="calculadora" className="gap-2 text-xs font-semibold">
              <Sparkles className="size-3.5 text-primary" />
              <span>Calculadora Predictiva</span>
            </TabsTrigger>
            <TabsTrigger value="combustible" className="gap-2 text-xs font-semibold">
              <Fuel className="size-3.5" />
              <span>Cargas de Combustible ({vehicleFuelLogs.length})</span>
            </TabsTrigger>
            <TabsTrigger value="mantenimiento" className="gap-2 text-xs font-semibold">
              <Wrench className="size-3.5" />
              <span>Mantenimientos & Repuestos ({vehicleMaintenanceLogs.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: FLOTA & TARJETAS VISUALES */}
        <TabsContent value="flota" className="space-y-4 pt-2">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa, nombre, chofer..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className={`${selectClass} w-auto text-xs`}
              >
                <option value="all">Todos los Tipos</option>
                <option value="Camioneta 4x4">Camioneta 4x4 (🛻)</option>
                <option value="Motocicleta">Motocicleta (🏍️)</option>
                <option value="Cuadratrack / UTV">Cuadratrack / UTV (🏎️)</option>
                <option value="Camión Utilitario">Camión Utilitario (🚛)</option>
              </select>
            </div>

            <div className="text-xs text-muted-foreground">
              Mostrando <strong className="text-foreground">{filteredVehicles.length}</strong> de{" "}
              {vehicles.length} vehículos
            </div>
          </div>

          {/* Grid de Tarjetas de Vehículos estilo Tesla / Ingeniero Senior */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVehicles.map((v) => {
              const wear = computeVehicleWear(v, "Tierra y Ripio con Polvo");
              const lastFuel = vehicleFuelLogs.filter((f) => f.vehicleId === v.id)[0];
              const isUrgent =
                wear.oil.status === "Cambio urgente" ||
                wear.airFilter.status === "Cambio urgente" ||
                wear.brakes.status === "Cambio urgente";
              const isWarning =
                wear.oil.status === "Atención preventiva" ||
                wear.airFilter.status === "Atención preventiva" ||
                wear.brakes.status === "Atención preventiva";

              return (
                <Panel
                  key={v.id}
                  className="p-5 flex flex-col justify-between hover:border-primary/40 transition-all hover:shadow-md"
                >
                  <div className="space-y-4">
                    {/* Header de la Tarjeta con Foto/Render */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{v.emoji || getVehicleDefaultEmoji(v.type)}</span>
                            <span className="font-mono text-sm font-extrabold px-2 py-0.5 rounded bg-muted border border-border text-foreground tracking-wider">
                              {v.plate}
                            </span>
                            <Pill tone={isUrgent ? "danger" : isWarning ? "warning" : "success"}>
                              {isUrgent ? "Atención Crítica" : isWarning ? "Servicio Próximo" : "Excelente Estado"}
                            </Pill>
                          </div>
                          <h3 className="text-base font-bold text-foreground mt-1.5">{v.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {v.type} · Responsable: <strong>{v.assignedDriver || "General"}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedCockpitVehicleId(v.id)}
                            className="text-xs text-cyan-500 hover:text-cyan-400 p-1"
                            title="Ver en pantalla principal Cockpit Tesla"
                          >
                            <Maximize2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenVehicleDialog(v)}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors p-1"
                            title="Editar parámetros del vehículo"
                          >
                            <Sliders className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* Miniatura del Vehículo con Botón de Foto */}
                      <div className="relative h-32 w-full rounded-xl overflow-hidden bg-black/40 border border-border flex items-center justify-center group/img">
                        <img
                          src={v.imageUrl || getVehicleDefaultImage(v.type)}
                          alt={v.name}
                          className="max-h-full max-w-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover/img:scale-105"
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoDialog(v)}
                          className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-black/75 hover:bg-black text-cyan-400 border border-cyan-500/40 text-[10px] font-semibold backdrop-blur transition-all"
                          title="Tomar foto o subir imagen"
                        >
                          <Camera className="size-3" />
                          <span>Foto</span>
                        </button>
                      </div>
                    </div>

                    {/* Odómetro & Combustible */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/50">
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Odómetro Actual</span>
                        <span className="font-mono font-bold text-sm text-foreground">
                          {number(v.currentKm)} km
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Combustible / Tanque</span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Fuel className="size-3 text-primary" />
                          {v.fuelType} ({v.tankCapacityLiters}L)
                        </span>
                      </div>
                      {lastFuel && (
                        <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Último consumo medido:</span>
                          <strong className="text-foreground">
                            {lastFuel.calculatedKmPerLiter
                              ? `${lastFuel.calculatedKmPerLiter.toFixed(1)} km/L`
                              : `${v.averageKmPerLiter} km/L est.`}{" "}
                            {lastFuel.costPerKmBs ? `(Bs ${lastFuel.costPerKmBs.toFixed(2)}/km)` : ""}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Barras de Desgaste Predictivo de Componentes */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Gauge className="size-3.5 text-primary" />
                          Salud de Componentes Clave
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Condición Ripio / Polvo
                        </span>
                      </div>

                      {/* Aceite de Motor */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">
                            Aceite Motor ({v.oilIntervalKm} km)
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              wear.oil.status === "Cambio urgente"
                                ? "text-destructive"
                                : wear.oil.status === "Atención preventiva"
                                ? "text-amber-500"
                                : "text-emerald-500"
                            }`}
                          >
                            {wear.oil.percentRemaining}% vida útil ({number(wear.oil.kmRemaining)} km)
                          </span>
                        </div>
                        <Progress
                          value={wear.oil.percentRemaining}
                          className={`h-2 ${
                            wear.oil.status === "Cambio urgente"
                              ? "[&>div]:bg-destructive"
                              : wear.oil.status === "Atención preventiva"
                              ? "[&>div]:bg-amber-500"
                              : "[&>div]:bg-emerald-500"
                          }`}
                        />
                      </div>

                      {/* Filtro de Aire */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Filtro de Aire (Saturación Polvo)</span>
                          <span
                            className={`font-mono font-bold ${
                              wear.airFilter.status === "Cambio urgente"
                                ? "text-destructive"
                                : wear.airFilter.status === "Atención preventiva"
                                ? "text-amber-500"
                                : "text-emerald-500"
                            }`}
                          >
                            {wear.airFilter.percentRemaining}% restante ({number(wear.airFilter.kmRemaining)} km)
                          </span>
                        </div>
                        <Progress
                          value={wear.airFilter.percentRemaining}
                          className={`h-1.5 ${
                            wear.airFilter.status === "Cambio urgente"
                              ? "[&>div]:bg-destructive"
                              : wear.airFilter.status === "Atención preventiva"
                              ? "[&>div]:bg-amber-500"
                              : "[&>div]:bg-emerald-500"
                          }`}
                        />
                      </div>

                      {/* Pastillas de Freno */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Pastillas y Discos de Freno</span>
                          <span className="font-mono text-muted-foreground">
                            {wear.brakes.percentRemaining}% ({number(wear.brakes.kmRemaining)} km)
                          </span>
                        </div>
                        <Progress value={wear.brakes.percentRemaining} className="h-1.5 [&>div]:bg-sky-500" />
                      </div>

                      {/* Neumáticos */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Banda de Rodadura Neumáticos</span>
                          <span className="font-mono text-muted-foreground">
                            {wear.tires.percentRemaining}% ({number(wear.tires.kmRemaining)} km)
                          </span>
                        </div>
                        <Progress value={wear.tires.percentRemaining} className="h-1.5 [&>div]:bg-slate-500" />
                      </div>
                    </div>

                    {/* Mensaje de alerta predictiva si existe */}
                    {(wear.oil.alertMessage || wear.airFilter.alertMessage) && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
                        <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
                        <div>
                          <strong>Diagnóstico Predictivo:</strong>{" "}
                          {wear.oil.alertMessage || wear.airFilter.alertMessage}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones Rápidas del Card */}
                  <div className="pt-4 mt-3 border-t border-border grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenFuelDialog(v.id)}
                      className="text-xs font-semibold gap-1.5"
                    >
                      <Fuel className="size-3.5 text-primary" />
                      <span>Cargar Gasolina</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenMaintenanceDialog(v.id)}
                      className="text-xs font-semibold gap-1.5"
                    >
                      <Wrench className="size-3.5 text-amber-500" />
                      <span>Mantenimiento</span>
                    </Button>
                  </div>
                </Panel>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 2: CALCULADORA INTELIGENTE DE DESGASTE PREDICTIVO */}
        <TabsContent value="calculadora" className="space-y-6 pt-2">
          <Panel className="p-6 border-primary/20 shadow-lg">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Controles de Entrada */}
              <div className="flex-1 space-y-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary mb-2">
                    <Sparkles className="size-3" />
                    Algoritmo de Telemetría Agrícola
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Simulador Inteligente de Desgaste y Repuestos Prematuros
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Modela la degradación acelerada de fluidos y piezas de fricción según la severidad de caminos
                    de tierra, polvo en suspensión de zafra y peso de carga en la estancia.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Selector de Vehículo */}
                  <Field label="Vehículo a Simular">
                    <select
                      value={calcVehicleId}
                      onChange={(e) => setCalcVehicleId(e.target.value)}
                      className={selectClass}
                    >
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.emoji || getVehicleDefaultEmoji(v.type)} {v.plate} - {v.name} ({v.type}) · {number(v.currentKm)} km
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Condición de los Caminos */}
                  <Field label="Condición de los Caminos Predominante">
                    <select
                      value={calcRoadCondition}
                      onChange={(e) => setCalcRoadCondition(e.target.value as RoadCondition)}
                      className={selectClass}
                    >
                      <option value="Asfalto y Carretera">
                        Asfalto y Carretera Pavimentada (Factor Desgaste: 1.0x Normal)
                      </option>
                      <option value="Tierra y Ripio con Polvo">
                        Tierra y Ripio con Polvo de Zafra (Factor Desgaste: 1.35x Acelerado)
                      </option>
                      <option value="Barro / Zafra Pesada">
                        Barro / Huella Pesada de Cosecha (Factor Desgaste: 1.50x Severo)
                      </option>
                    </select>
                  </Field>

                  {/* Kilometraje Proyectado por Mes */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">Recorrido Mensual Estimado:</span>
                      <span className="font-mono font-bold text-primary">{number(calcMonthlyKm)} km / mes</span>
                    </div>
                    <input
                      type="range"
                      min={500}
                      max={7000}
                      step={100}
                      value={calcMonthlyKm}
                      onChange={(e) => setCalcMonthlyKm(Number(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>500 km (Patrullaje liviano)</span>
                      <span>3,500 km (Uso intenso)</span>
                      <span>7,000 km (Zafra continua)</span>
                    </div>
                  </div>

                  {/* Severidad de Carga */}
                  <Field label="Severidad de Carga y Arrastre">
                    <select
                      value={calcLoadSeverity}
                      onChange={(e) => setCalcLoadSeverity(Number(e.target.value))}
                      className={selectClass}
                    >
                      <option value={1.0}>Sin carga (Solo conductor / supervisión de lotes)</option>
                      <option value={1.15}>Carga moderada (Herramientas, tambores de aceite, repuestos)</option>
                      <option value={1.3}>Carga pesada / Arrastre de carro cisterna o tolva en campo</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* Panel de Resultados del Diagnóstico */}
              <div className="flex-1 rounded-2xl bg-muted/40 p-5 border border-border flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                    <ShieldAlert className="size-4 text-primary" />
                    Proyección de Desgaste e Impacto Contable
                  </h4>

                  {calcWear && (
                    <div className="space-y-4">
                      {/* Tarjetas resumen */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-background border border-border">
                          <span className="text-muted-foreground block text-[11px]">Próximo Cambio Aceite</span>
                          <span className="text-lg font-bold font-mono text-foreground mt-0.5 block">
                            En {calcWear.daysUntilOil} días
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({number(calcWear.baseWear.oil.kmRemaining)} km restantes)
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-background border border-border">
                          <span className="text-muted-foreground block text-[11px]">Degradación de Filtro</span>
                          <span className="text-lg font-bold font-mono text-amber-500 mt-0.5 block">
                            +{((calcWear.dustSeverityFactor - 1) * 100).toFixed(0)}% polvo
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Cambio sugerido cada{" "}
                            {selectedCalcVehicle
                              ? number(
                                  Math.round(selectedCalcVehicle.airFilterIntervalKm / calcWear.dustSeverityFactor),
                                )
                              : "--"}{" "}
                            km
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-background border border-border">
                          <span className="text-muted-foreground block text-[11px]">
                            Gasto Combustible Proyectado
                          </span>
                          <span className="text-lg font-bold font-mono text-foreground mt-0.5 block">
                            {formatMoney(calcWear.projectedFuelMonthlyBs, currencyMode, exchangeRate)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {number(Math.round(calcWear.projectedFuelMonthlyLiters))} Litros / mes
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-background border border-border">
                          <span className="text-muted-foreground block text-[11px]">Provisión Mantenimiento</span>
                          <span className="text-lg font-bold font-mono text-foreground mt-0.5 block">
                            {formatMoney(calcWear.projectedMonthlyOilCostBs, currencyMode, exchangeRate)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Presupuesto preventivo mensual
                          </span>
                        </div>
                      </div>

                      {/* Dictamen Técnico de Ingeniería Senior */}
                      <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-primary">
                          <Sparkles className="size-4" />
                          <span>Recomendación Técnica del Ingeniero Mecánico:</span>
                        </div>
                        <p className="text-foreground/90 text-[11px] leading-relaxed">
                          Debido a la exposición de {calcRoadCondition.toLowerCase()} con una severidad de{" "}
                          {calcLoadSeverity > 1 ? "carga pesada" : "carga estándar"}, la vida útil del aceite de
                          motor se acorta a intervalos de{" "}
                          <strong>
                            {selectedCalcVehicle
                              ? number(
                                  Math.round(selectedCalcVehicle.oilIntervalKm / (calcWear.dustSeverityFactor > 1.2 ? 1.15 : 1.0)),
                                )
                              : "--"}{" "}
                            km
                          </strong>
                          . El elemento filtrante de aire acumula micro-partículas abrasivas que pueden rayar las camisas
                          de los cilindros; se aconseja inspección con sopleteado semanal y cambio prematuro antes de los{" "}
                          {selectedCalcVehicle
                            ? number(Math.round(selectedCalcVehicle.airFilterIntervalKm / calcWear.dustSeverityFactor))
                            : "--"}{" "}
                          km.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedCalcVehicle && (
                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleOpenMaintenanceDialog(selectedCalcVehicle.id, "Cambio de Aceite y Filtros")
                      }
                      className="gap-2 text-xs font-bold"
                    >
                      <Wrench className="size-3.5" />
                      <span>Agendar Mantenimiento para {selectedCalcVehicle.plate}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </TabsContent>

        {/* TAB 3: BITÁCORA DE CARGAS DE COMBUSTIBLE */}
        <TabsContent value="combustible" className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Bitácora de Cargas de Combustible Vehicular
              </h3>
              <p className="text-xs text-muted-foreground">
                Cada carga genera automáticamente su asiento de egreso contable en la categoría "Combustibles".
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportFuelLogs}
                className="gap-1.5 text-xs font-semibold"
              >
                <Download className="size-3.5" />
                <span>Exportar CSV</span>
              </Button>
              <Button
                size="sm"
                onClick={() => handleOpenFuelDialog()}
                className="gap-1.5 text-xs font-bold"
              >
                <Plus className="size-3.5" />
                <span>Registrar Carga</span>
              </Button>
            </div>
          </div>

          <Panel className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/70 text-muted-foreground border-b border-border uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Vehículo</th>
                  <th className="p-3">Combustible</th>
                  <th className="p-3 text-right">Litros</th>
                  <th className="p-3 text-right">Precio/L</th>
                  <th className="p-3 text-right">Total (Bs / USD)</th>
                  <th className="p-3 text-right">Odómetro</th>
                  <th className="p-3 text-right">Rendimiento</th>
                  <th className="p-3">Surtidor / Estación</th>
                  <th className="p-3">Conductor</th>
                  <th className="p-3 text-center">Contabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vehicleFuelLogs.map((log) => {
                  const v = vehicles.find((x) => x.id === log.vehicleId);
                  return (
                    <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-medium whitespace-nowrap">{log.date}</td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span>{v?.emoji || "🚗"}</span>
                          <span>{v?.plate || log.vehicleId}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{v?.name}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Fuel className="size-3 text-primary" />
                          {log.fuelType}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold">{number(log.liters)} L</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">
                        Bs {log.pricePerLiterBs.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-foreground">
                          {formatMoney(log.totalCostBs, currencyMode, exchangeRate)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Bs {log.totalCostBs.toFixed(2)}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">{number(log.odometerKm)} km</td>
                      <td className="p-3 text-right font-mono whitespace-nowrap">
                        {log.calculatedKmPerLiter ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                            {log.calculatedKmPerLiter.toFixed(1)} km/L
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Carga parcial</span>
                        )}
                        {log.costPerKmBs && (
                          <span className="block text-[10px] text-muted-foreground">
                            Bs {log.costPerKmBs.toFixed(2)}/km
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground max-w-xs truncate">{log.station}</td>
                      <td className="p-3 font-medium text-foreground">{log.driver}</td>
                      <td className="p-3 text-center">
                        <Pill tone="success" className="text-[10px]">
                          Egreso: Combustibles
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </TabsContent>

        {/* TAB 4: BITÁCORA DE MANTENIMIENTO Y REPUESTOS */}
        <TabsContent value="mantenimiento" className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Historial de Mantenimientos, Aceite y Repuestos
              </h3>
              <p className="text-xs text-muted-foreground">
                Control de piezas sustituidas, talleres y registro automático de egresos contables en "Mantenimiento".
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportMaintenanceLogs}
                className="gap-1.5 text-xs font-semibold"
              >
                <Download className="size-3.5" />
                <span>Exportar CSV</span>
              </Button>
              <Button
                size="sm"
                onClick={() => handleOpenMaintenanceDialog()}
                className="gap-1.5 text-xs font-bold"
              >
                <Plus className="size-3.5" />
                <span>Registrar Mantenimiento</span>
              </Button>
            </div>
          </div>

          <Panel className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/70 text-muted-foreground border-b border-border uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Vehículo</th>
                  <th className="p-3">Tipo de Servicio</th>
                  <th className="p-3">Detalle / Repuestos Sustituidos</th>
                  <th className="p-3 text-right">Odómetro</th>
                  <th className="p-3">Taller / Mecánico</th>
                  <th className="p-3 text-right">Costo Total</th>
                  <th className="p-3 text-center">Contabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {vehicleMaintenanceLogs.map((m) => {
                  const v = vehicles.find((x) => x.id === m.vehicleId);
                  return (
                    <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-medium whitespace-nowrap">{m.date}</td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span>{v?.emoji || "🚗"}</span>
                          <span>{v?.plate || m.vehicleId}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{v?.name}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Pill
                          tone={
                            m.serviceType.includes("Aceite")
                              ? "primary"
                              : m.serviceType.includes("Filtro")
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {m.serviceType}
                        </Pill>
                      </td>
                      <td className="p-3 font-medium text-foreground max-w-sm">{m.partsReplaced}</td>
                      <td className="p-3 text-right font-mono">{number(m.odometerKm)} km</td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{m.workshopOrMechanic}</td>
                      <td className="p-3 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-foreground">
                          {formatMoney(m.costBs, currencyMode, exchangeRate)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Bs {m.costBs.toFixed(2)}</div>
                      </td>
                      <td className="p-3 text-center">
                        <Pill tone="success" className="text-[10px]">
                          Egreso: Mantenimiento
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </TabsContent>
      </Tabs>

      {/* DIÁLOGO: TOMAR FOTO CON CÁMARA O SUBIR A CLOUDINARY */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="size-5 text-cyan-500" />
              <span>Foto del Vehículo ({selectedVehicleForPhoto?.plate})</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Toma una fotografía directa desde la cámara de tu smartphone o sube una imagen de la estancia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Indicador de conexión Cloudinary */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/80">
                  Cloudinary: <strong className="text-cyan-300 font-mono">{cCloudName || "kmcpa5z4"}</strong> (CDN Activo)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhotoDialogOpen(false);
                  setCloudinarySettingsOpen(true);
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-200 underline"
              >
                Configurar Llaves
              </button>
            </div>

            {/* Vista previa actual */}
            <div className="h-44 w-full rounded-xl bg-black/60 border border-border flex items-center justify-center overflow-hidden relative">
              <img
                src={buildCloudinaryUrl(
                  selectedVehicleForPhoto?.imageUrl ||
                    getVehicleDefaultImage(selectedVehicleForPhoto?.type || "Camioneta 4x4"),
                )}
                alt="Vista previa"
                className="max-h-full max-w-full object-contain filter drop-shadow-md"
              />
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-xs text-cyan-400 gap-2">
                  <span className="size-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Subiendo a Cloudinary...</span>
                </div>
              )}
            </div>

            {/* Inputs ocultos para Cámara y Archivo */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="gap-2 font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm"
              >
                <Camera className="size-4" />
                <span>Tomar con Cámara</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="gap-2 font-semibold"
              >
                <Upload className="size-4" />
                <span>Elegir Archivo</span>
              </Button>
            </div>

            {/* Renders predeterminados de catálogo */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                O asignar imagen predeterminada de alta resolución:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedVehicleForPhoto) {
                      updateVehiclePhoto(
                        selectedVehicleForPhoto.id,
                        getVehicleDefaultImage("Camioneta 4x4"),
                      );
                      toast.success("Foto asignada: Camioneta 4x4");
                      setPhotoDialogOpen(false);
                    }
                  }}
                  className="p-1.5 rounded-lg border text-center hover:border-cyan-500 text-[11px] bg-muted/40 font-medium"
                >
                  🛻 Hilux 4x4
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedVehicleForPhoto) {
                      updateVehiclePhoto(
                        selectedVehicleForPhoto.id,
                        getVehicleDefaultImage("Motocicleta"),
                      );
                      toast.success("Foto asignada: Moto Tornado");
                      setPhotoDialogOpen(false);
                    }
                  }}
                  className="p-1.5 rounded-lg border text-center hover:border-cyan-500 text-[11px] bg-muted/40 font-medium"
                >
                  🏍️ Moto XR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedVehicleForPhoto) {
                      updateVehiclePhoto(
                        selectedVehicleForPhoto.id,
                        getVehicleDefaultImage("Cuadratrack / UTV"),
                      );
                      toast.success("Foto asignada: Cuadratrack Can-Am");
                      setPhotoDialogOpen(false);
                    }
                  }}
                  className="p-1.5 rounded-lg border text-center hover:border-cyan-500 text-[11px] bg-muted/40 font-medium"
                >
                  🏎️ Cuadratrack
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPhotoDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: CONFIGURACIÓN DE CLOUDINARY */}
      <Dialog open={cloudinarySettingsOpen} onOpenChange={setCloudinarySettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-5 text-primary" />
              <span>Conectar Almacenamiento Cloudinary</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configura tu cuenta de Cloudinary para almacenar fotos de la flota en la nube con CDN global. Si lo
              dejas vacío, el sistema utilizará compresión WebP local ultrarrápida.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCloudinary} className="space-y-3.5 py-2">
            <Field label="Cloud Name">
              <Input
                value={cCloudName}
                onChange={(e) => setCCloudName(e.target.value)}
                placeholder="ej: kmcpa5z4"
                className="h-9 text-xs font-mono"
                required
              />
            </Field>

            <Field label="API Key">
              <Input
                value={cApiKey}
                onChange={(e) => setCApiKey(e.target.value)}
                placeholder="ej: 365934627122888"
                className="h-9 text-xs font-mono"
              />
            </Field>

            <Field label="API Secret (Para subida autenticada SHA-1 directa)">
              <Input
                type="password"
                value={cApiSecret}
                onChange={(e) => setCApiSecret(e.target.value)}
                placeholder="ej: dz-8ysV-iUIiSNR4PgZTxtFfoKk"
                className="h-9 text-xs font-mono"
              />
            </Field>

            <Field label="Upload Preset (Opcional si usas API Secret)">
              <Input
                value={cUploadPreset}
                onChange={(e) => setCUploadPreset(e.target.value)}
                placeholder="ej: agroadmin_preset"
                className="h-9 text-xs font-mono"
              />
            </Field>

            <div className="p-3 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground space-y-1">
              <strong className="text-foreground block">Conexión Directa Verificada</strong>
              <p>
                Tu cuenta <strong className="text-cyan-400 font-mono">kmcpa5z4</strong> está preconfigurada con subida firmada SHA-1 directa. Las fotos tomadas desde tu teléfono se guardan en el bucket con URL estándar y CDN global inmediata.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCloudinarySettingsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="font-bold">
                Guardar Configuración
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: REGISTRAR CARGA DE COMBUSTIBLE */}
      <Dialog open={fuelDialogOpen} onOpenChange={setFuelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="size-5 text-primary" />
              <span>Registrar Carga de Combustible</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registra la recarga en surtidor o bidón, actualiza el kilometraje y genera el egreso contable
              automático.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFuel} className="space-y-3.5 py-2">
            <Field label="Vehículo">
              <select
                value={fuelVehicleId}
                onChange={(e) => {
                  setFuelVehicleId(e.target.value);
                  const sel = vehicles.find((v) => v.id === e.target.value);
                  if (sel) {
                    setFuelType(sel.fuelType);
                    setFuelPricePerLiterBs(sel.fuelType === "Diésel Vehicular" ? 3.72 : 3.74);
                    setFuelOdometerKm(sel.currentKm + 450);
                    setFuelDriver(sel.assignedDriver || "Conductor General");
                  }
                }}
                className={selectClass}
                required
              >
                <option value="">Seleccione vehículo...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.emoji || "🚗"} {v.plate} - {v.name} ({v.type})
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha">
                <Input
                  type="date"
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </Field>

              <Field label="Tipo de Combustible">
                <select
                  value={fuelType}
                  onChange={(e) => {
                    const t = e.target.value as VehicleFuelType;
                    setFuelType(t);
                    setFuelPricePerLiterBs(
                      t === "Diésel Vehicular" ? 3.72 : t === "Gasolina Premium" ? 4.79 : 3.74,
                    );
                  }}
                  className={selectClass}
                >
                  <option value="Gasolina Especial">Gasolina Especial (Bs 3.74)</option>
                  <option value="Gasolina Premium">Gasolina Premium (Bs 4.79)</option>
                  <option value="Diésel Vehicular">Diésel Vehicular (Bs 3.72)</option>
                  <option value="Gasolina 91">Gasolina 91 (Bs 4.40)</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Litros Cargados">
                <Input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </Field>

              <Field label="Precio por Litro (Bs)">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={fuelPricePerLiterBs}
                  onChange={(e) => setFuelPricePerLiterBs(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </Field>
            </div>

            <div className="p-3 rounded-lg bg-muted/60 border border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Total a Desembolsar:</span>
              <div className="text-right">
                <span className="font-mono font-bold text-foreground text-sm">
                  Bs {(fuelLiters * fuelPricePerLiterBs).toFixed(2)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  ($ {((fuelLiters * fuelPricePerLiterBs) / exchangeRate).toFixed(2)} USD)
                </span>
              </div>
            </div>

            <Field label="Odómetro Actual al Cargar (km)">
              <Input
                type="number"
                min="0"
                value={fuelOdometerKm}
                onChange={(e) => setFuelOdometerKm(Number(e.target.value))}
                className="h-9 text-xs font-mono"
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Surtidor / Estación">
                <Input
                  value={fuelStation}
                  onChange={(e) => setFuelStation(e.target.value)}
                  placeholder="Surtidor Pailón Norte..."
                  className="h-9 text-xs"
                />
              </Field>

              <Field label="Conductor / Responsable">
                <Input
                  value={fuelDriver}
                  onChange={(e) => setFuelDriver(e.target.value)}
                  placeholder="Nombre de chofer..."
                  className="h-9 text-xs"
                />
              </Field>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="fullTankCheck"
                checked={fuelFullTank}
                onChange={(e) => setFuelFullTank(e.target.checked)}
                className="rounded accent-primary"
              />
              <label htmlFor="fullTankCheck" className="text-xs text-foreground cursor-pointer select-none">
                Tanque Lleno (Permite calcular rendimiento exacto de km/L)
              </label>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              <span>
                Se registrará un egreso en Contabilidad en la categoría <strong>"Combustibles"</strong>.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setFuelDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="font-bold">
                Guardar Carga
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: REGISTRAR MANTENIMIENTO Y REPUESTOS */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="size-5 text-amber-500" />
              <span>Registrar Mantenimiento y Repuestos</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registra el cambio de aceite, filtros o pastillas de freno. Restablece el contador de desgaste e
              imputa el egreso en Contabilidad.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMaintenance} className="space-y-3.5 py-2">
            <Field label="Vehículo">
              <select
                value={maintVehicleId}
                onChange={(e) => {
                  setMaintVehicleId(e.target.value);
                  const sel = vehicles.find((v) => v.id === e.target.value);
                  if (sel) setMaintOdometerKm(sel.currentKm);
                }}
                className={selectClass}
                required
              >
                <option value="">Seleccione vehículo...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.emoji || "🚗"} {v.plate} - {v.name} ({v.type})
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha">
                <Input
                  type="date"
                  value={maintDate}
                  onChange={(e) => setMaintDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </Field>

              <Field label="Tipo de Servicio">
                <select
                  value={maintServiceType}
                  onChange={(e) => setMaintServiceType(e.target.value as VehicleServiceType)}
                  className={selectClass}
                >
                  <option value="Cambio de Aceite y Filtros">Cambio de Aceite y Filtros</option>
                  <option value="Filtro de Aire / Combustible">Filtro de Aire / Combustible</option>
                  <option value="Pastillas y Discos de Freno">Pastillas y Discos de Freno</option>
                  <option value="Neumáticos y Alineación">Neumáticos y Alineación</option>
                  <option value="Amortiguadores y Suspensión">Amortiguadores y Suspensión</option>
                  <option value="Mantenimiento General / Taller">Mantenimiento General / Taller</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Odómetro al Servicio (km)">
                <Input
                  type="number"
                  min="0"
                  value={maintOdometerKm}
                  onChange={(e) => setMaintOdometerKm(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </Field>

              <Field label="Costo Total (Bs)">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={maintCostBs}
                  onChange={(e) => setMaintCostBs(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </Field>
            </div>

            <Field label="Detalle de Repuestos y Trabajos">
              <Input
                value={maintPartsReplaced}
                onChange={(e) => setMaintPartsReplaced(e.target.value)}
                placeholder="Ej: Aceite sintético 15W40 + Filtro Mann W940 + Arandela"
                className="h-9 text-xs"
                required
              />
            </Field>

            <Field label="Taller / Mecánico">
              <Input
                value={maintWorkshop}
                onChange={(e) => setMaintWorkshop(e.target.value)}
                placeholder="Taller Central Estancia / Toyosa"
                className="h-9 text-xs"
              />
            </Field>

            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              <span>
                Se registrará un egreso en Contabilidad en la categoría <strong>"Mantenimiento"</strong>.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setMaintenanceDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="font-bold">
                Guardar Mantenimiento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: CREAR / EDITAR VEHÍCULO */}
      <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="size-5 text-primary" />
              <span>{editingVehicle ? "Editar Ficha de Vehículo" : "Nuevo Vehículo en Flota"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configura los parámetros mecánicos, intervalos de cambio de aceite y tipo de combustible.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVehicle} className="space-y-3.5 py-2">
            <div className="grid grid-cols-4 gap-2">
              <Field label="Emoji">
                <select
                  value={vehEmoji}
                  onChange={(e) => setVehEmoji(e.target.value)}
                  className={selectClass}
                >
                  <option value="🛻">🛻 Camioneta</option>
                  <option value="🏍️">🏍️ Moto</option>
                  <option value="🏎️">🏎️ UTV/Quad</option>
                  <option value="🚛">🚛 Camión</option>
                  <option value="🚜">🚜 Apoyo</option>
                  <option value="🚙">🚙 Jeep</option>
                </select>
              </Field>

              <div className="col-span-2">
                <Field label="Nombre / Identificador">
                  <Input
                    value={vehName}
                    onChange={(e) => setVehName(e.target.value)}
                    placeholder="Toyota Hilux 4x4..."
                    className="h-9 text-xs"
                    required
                  />
                </Field>
              </div>

              <Field label="Placa">
                <Input
                  value={vehPlate}
                  onChange={(e) => setVehPlate(e.target.value)}
                  placeholder="4021-NBS"
                  className="h-9 text-xs font-mono uppercase"
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Tipo de Vehículo">
                <select
                  value={vehType}
                  onChange={(e) => {
                    const t = e.target.value as VehicleType;
                    setVehType(t);
                    setVehEmoji(getVehicleDefaultEmoji(t));
                  }}
                  className={selectClass}
                >
                  <option value="Camioneta 4x4">Camioneta 4x4</option>
                  <option value="Motocicleta">Motocicleta</option>
                  <option value="Cuadratrack / UTV">Cuadratrack / UTV</option>
                  <option value="Camión Utilitario">Camión Utilitario</option>
                </select>
              </Field>

              <Field label="Combustible">
                <select
                  value={vehFuelType}
                  onChange={(e) => setVehFuelType(e.target.value as VehicleFuelType)}
                  className={selectClass}
                >
                  <option value="Gasolina Especial">Gasolina Especial</option>
                  <option value="Gasolina Premium">Gasolina Premium</option>
                  <option value="Diésel Vehicular">Diésel Vehicular</option>
                  <option value="Gasolina 91">Gasolina 91</option>
                </select>
              </Field>

              <Field label="Odómetro Actual (km)">
                <Input
                  type="number"
                  min="0"
                  value={vehCurrentKm}
                  onChange={(e) => setVehCurrentKm(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Rendimiento Est. (km/L)">
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={vehAvgKmPerLiter}
                  onChange={(e) => setVehAvgKmPerLiter(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </Field>

              <Field label="Tanque (Litros)">
                <Input
                  type="number"
                  min="5"
                  value={vehTankCapLiters}
                  onChange={(e) => setVehTankCapLiters(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </Field>

              <Field label="Intervalo Aceite (km)">
                <Input
                  type="number"
                  min="1000"
                  step="500"
                  value={vehOilIntervalKm}
                  onChange={(e) => setVehOilIntervalKm(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Intervalo Filtro Aire (km)">
                <Input
                  type="number"
                  min="2000"
                  step="500"
                  value={vehAirFilterIntervalKm}
                  onChange={(e) => setVehAirFilterIntervalKm(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </Field>

              <Field label="Conductor / Responsable">
                <Input
                  value={vehDriver}
                  onChange={(e) => setVehDriver(e.target.value)}
                  placeholder="Ing. Roberto Paz"
                  className="h-9 text-xs"
                />
              </Field>
            </div>

            <Field label="URL de Imagen o Foto">
              <Input
                value={vehImageUrl}
                onChange={(e) => setVehImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... o DataURL"
                className="h-9 text-xs font-mono"
              />
            </Field>

            <Field label="Notas Técnicas">
              <Input
                value={vehNotes}
                onChange={(e) => setVehNotes(e.target.value)}
                placeholder="Observaciones de uso en caminos rurales..."
                className="h-9 text-xs"
              />
            </Field>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setVehicleDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="font-bold">
                {editingVehicle ? "Actualizar Vehículo" : "Guardar Vehículo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: MONITOREO DE PRESIÓN DE NEUMÁTICOS (TPMS) */}
      <Dialog open={tpmsDialogOpen} onOpenChange={setTpmsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#090d16] text-white border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Gauge className="size-5 text-cyan-400" />
              <span>Monitoreo de Neumáticos TPMS ({cockpitVehicle?.plate})</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Presión en tiempo real de los 4 neumáticos calibrada para caminos rurales y asfalto.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Diagrama de Chasis */}
            <div className="relative mx-auto w-64 h-72 rounded-2xl bg-black/60 border border-white/10 p-3 flex flex-col justify-between">
              {/* Eje Delantero */}
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-white/5 border border-cyan-500/40 text-center w-24">
                  <span className="text-[10px] text-white/50 block">Del. Izq</span>
                  <span className="font-mono text-base font-bold text-cyan-400">32.0 PSI</span>
                  <span className="text-[9px] text-emerald-400 block">34°C · Normal</span>
                </div>

                <div className="h-10 w-8 border-t-2 border-white/20" />

                <div className="p-2.5 rounded-xl bg-white/5 border border-cyan-500/40 text-center w-24">
                  <span className="text-[10px] text-white/50 block">Del. Der</span>
                  <span className="font-mono text-base font-bold text-cyan-400">32.0 PSI</span>
                  <span className="text-[9px] text-emerald-400 block">34°C · Normal</span>
                </div>
              </div>

              {/* Centro de gravedad */}
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  <span>Calibración Óptima</span>
                </div>
              </div>

              {/* Eje Trasero */}
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-white/5 border border-cyan-500/40 text-center w-24">
                  <span className="text-[10px] text-white/50 block">Tras. Izq</span>
                  <span className="font-mono text-base font-bold text-cyan-400">35.5 PSI</span>
                  <span className="text-[9px] text-emerald-400 block">36°C · Carga</span>
                </div>

                <div className="h-10 w-8 border-b-2 border-white/20" />

                <div className="p-2.5 rounded-xl bg-white/5 border border-cyan-500/40 text-center w-24">
                  <span className="text-[10px] text-white/50 block">Tras. Der</span>
                  <span className="font-mono text-base font-bold text-cyan-400">35.5 PSI</span>
                  <span className="text-[9px] text-emerald-400 block">36°C · Carga</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
              <span className="font-semibold text-white block">Recomendación de Presión de Inflado:</span>
              <p className="text-[11px] text-white/70">
                • <strong>Caminos de tierra o ripio:</strong> Mantener en 30-32 PSI para amortiguar vibraciones.
                <br />
                • <strong>Carretera pavimentada o carga pesada en tolva:</strong> 35-38 PSI para evitar sobrecalentamiento de banda.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTpmsDialogOpen(false)}
              className="bg-transparent text-white border-white/20 hover:bg-white/10"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: FICHA TÉCNICA, SOAT & TAG B-SISA */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#090d16] text-white border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <FileText className="size-5 text-emerald-400" />
              <span>Ficha Legal, SOAT & B-SISA ({cockpitVehicle?.plate})</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Documentación oficial y cupos de combustible autorizados ante la ANH y YPFB.
            </DialogDescription>
          </DialogHeader>

          {cockpitVehicle && (
            <div className="py-3 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block">Tag B-SISA (ANH)</span>
                  <span className="font-mono font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="size-3 text-emerald-400" /> HABILITADO
                  </span>
                  <span className="text-[10px] text-white/60 block mt-0.5">
                    Cupo: {cockpitVehicle.fuelType === "Diésel Vehicular" ? "1.200 L/mes" : "600 L/mes"}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block">Seguro SOAT 2026</span>
                  <span className="font-mono font-bold text-cyan-400 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="size-3 text-cyan-400" /> VIGENTE
                  </span>
                  <span className="text-[10px] text-white/60 block mt-0.5">Univida · Póliza Nacional</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span className="text-white/60">Identificador / Modelo:</span>
                  <span className="font-semibold text-white">{cockpitVehicle.name}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span className="text-white/60">Placa Oficial:</span>
                  <span className="font-mono font-bold text-cyan-300">{cockpitVehicle.plate}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span className="text-white/60">Tipo & Tracción:</span>
                  <span className="text-white font-medium">{cockpitVehicle.type}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span className="text-white/60">Combustible Asignado:</span>
                  <span className="text-white font-medium">{cockpitVehicle.fuelType}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span className="text-white/60">Capacidad Tanque:</span>
                  <span className="font-mono text-white font-bold">{cockpitVehicle.tankCapacityLiters} Litros</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Chofer / Responsable:</span>
                  <span className="text-cyan-300 font-semibold">{cockpitVehicle.assignedDriver || "Ing. Roberto Paz"}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 flex items-center gap-2 text-[11px] text-cyan-200">
                <Radio className="size-4 shrink-0 text-cyan-400" />
                <span>Tarjeta vinculada a la cuenta de gastos operativos de Estancia San José.</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDocDialogOpen(false)}
              className="bg-transparent text-white border-white/20 hover:bg-white/10"
            >
              Cerrar Ficha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
