-- ==============================================================================
-- AGROADMIN BOLIVIA — ESQUEMA RELACIONAL COMPLETO PARA SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Ejecuta este script completo en el SQL Editor de tu consola de Supabase.
-- Incluye: Tablas, Relaciones (FKs), Índices, Funciones Transaccionales (RPC),
-- Políticas de Seguridad (RLS) y Datos Iniciales (Seeds).
-- ==============================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABLA: CONFIGURACIÓN GENERAL (app_settings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  currency_mode TEXT NOT NULL DEFAULT 'BOB' CHECK (currency_mode IN ('BOB', 'USD')),
  exchange_rate NUMERIC(8, 4) NOT NULL DEFAULT 6.9600,
  fuel_tank_capacity_liters NUMERIC(10, 2) NOT NULL DEFAULT 25000.00,
  fuel_tank_monthly_quota_liters NUMERIC(10, 2) NOT NULL DEFAULT 15000.00,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. TABLA: LOTES (lots)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  hectares NUMERIC(10, 2) NOT NULL CHECK (hectares > 0),
  crop TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Siembra', 'Crecimiento', 'Cosecha', 'Barbecho')),
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. TABLA: INVENTARIO DE INSUMOS (supplies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Semillas', 'Fertilizantes', 'Insecticidas', 'Herbicidas', 'Combustibles')),
  stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  min_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('Litros', 'Kilos', 'Unidades')),
  unit_cost_bs NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. TABLA: MAQUINARIA (machines)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Tractor', 'Cosechadora', 'Pulverizador')),
  hourmeter NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('Operativa', 'Mantenimiento', 'Fuera de servicio')),
  hourly_cost_bs NUMERIC(10, 2) NOT NULL DEFAULT 0,
  service_interval_hours NUMERIC(10, 2) NOT NULL DEFAULT 250,
  last_service_hourmeter NUMERIC(10, 2) NOT NULL DEFAULT 0,
  fuel_average_liters_per_hour NUMERIC(8, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. TABLA: USOS DE MAQUINARIA (machine_usages)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS machine_usages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL,
  machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,
  operator TEXT NOT NULL,
  labor_type TEXT NOT NULL,
  start_hours NUMERIC(10, 2) NOT NULL,
  end_hours NUMERIC(10, 2) NOT NULL,
  supply_id TEXT REFERENCES supplies(id) ON DELETE SET NULL,
  supply_qty NUMERIC(10, 2),
  diesel_liters NUMERIC(10, 2),
  operating_cost_bs NUMERIC(12, 2),
  cost_per_hectare_bs NUMERIC(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_hourmeter_order CHECK (end_hours >= start_hours)
);

CREATE INDEX IF NOT EXISTS idx_machine_usages_date ON machine_usages(date);
CREATE INDEX IF NOT EXISTS idx_machine_usages_machine ON machine_usages(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_usages_lot ON machine_usages(lot_id);

-- ------------------------------------------------------------------------------
-- 6. TABLA: TRANSACCIONES DE COMBUSTIBLE (fuel_transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fuel_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ingreso', 'despacho')),
  liters NUMERIC(10, 2) NOT NULL,
  price_per_liter_bs NUMERIC(8, 2) NOT NULL,
  total_cost_bs NUMERIC(12, 2) NOT NULL,
  destination_or_source TEXT NOT NULL,
  machine_id TEXT REFERENCES machines(id) ON DELETE SET NULL,
  operator TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_tx_date ON fuel_transactions(date);

-- ------------------------------------------------------------------------------
-- 7. TABLA: ENTREGAS DE COSECHA A SILOS / BALANZA (harvest_deliveries)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS harvest_deliveries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ticket_number TEXT NOT NULL,
  date DATE NOT NULL,
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,
  crop TEXT NOT NULL,
  silo_destination TEXT NOT NULL,
  driver TEXT NOT NULL,
  truck_plate TEXT NOT NULL,
  gross_weight_kg NUMERIC(12, 2) NOT NULL,
  tare_weight_kg NUMERIC(12, 2) NOT NULL,
  net_weight_kg NUMERIC(12, 2) NOT NULL,
  moisture_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  impurity_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  deduction_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payable_weight_kg NUMERIC(12, 2) NOT NULL,
  payable_tons NUMERIC(10, 2) NOT NULL,
  price_per_ton_bs NUMERIC(10, 2) NOT NULL,
  total_amount_bs NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Liquidado', 'En silo')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_harvest_lot ON harvest_deliveries(lot_id);
CREATE INDEX IF NOT EXISTS idx_harvest_date ON harvest_deliveries(date);

-- ------------------------------------------------------------------------------
-- 8. TABLA: MANTENIMIENTO DE MAQUINARIA (maintenance_records)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hourmeter NUMERIC(10, 2) NOT NULL,
  service_type TEXT NOT NULL,
  mechanic TEXT NOT NULL,
  cost_bs NUMERIC(12, 2) NOT NULL,
  parts_replaced TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_machine ON maintenance_records(machine_id);

-- ------------------------------------------------------------------------------
-- 9. TABLA: PLUVIÓMETRO (rainfall_records)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rainfall_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL,
  lot_id TEXT REFERENCES lots(id) ON DELETE SET NULL,
  millimeters NUMERIC(8, 2) NOT NULL,
  duration_hours NUMERIC(6, 2),
  soil_condition TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rainfall_date ON rainfall_records(date);

-- ------------------------------------------------------------------------------
-- 10. TABLA: PLANILLA DE JORNALES (laborer_worklogs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS laborer_worklogs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL,
  worker_name TEXT NOT NULL,
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,
  task_description TEXT NOT NULL,
  days_worked NUMERIC(6, 2) NOT NULL,
  daily_rate_bs NUMERIC(10, 2) NOT NULL,
  total_cost_bs NUMERIC(12, 2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_laborer_lot ON laborer_worklogs(lot_id);
CREATE INDEX IF NOT EXISTS idx_laborer_date ON laborer_worklogs(date);

-- ------------------------------------------------------------------------------
-- 11. TABLA: SANIDAD VEGETAL Y SCOUTING (field_scoutings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_scoutings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL,
  lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,
  phenological_stage TEXT NOT NULL,
  pest_name TEXT,
  pest_severity TEXT NOT NULL CHECK (pest_severity IN ('Ninguna', 'Baja', 'Media', 'Umbral de Daño Económico')),
  weed_pressure TEXT NOT NULL DEFAULT 'Controlada',
  disease TEXT,
  recommended_action TEXT NOT NULL DEFAULT '',
  supply_recommended_id TEXT REFERENCES supplies(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_lot ON field_scoutings(lot_id);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estancia_id TEXT NOT NULL DEFAULT 'estancia-san-jose',
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Insumos', 'Maquinaria', 'Jornales', 'Venta de Cosecha', 'Combustibles', 'Mantenimiento')),
  type TEXT NOT NULL CHECK (type IN ('ingreso', 'egreso')),
  amount_bs NUMERIC(14, 2) NOT NULL,
  lot_id TEXT REFERENCES lots(id) ON DELETE SET NULL,
  is_reversal BOOLEAN NOT NULL DEFAULT false,
  reversal_of_id TEXT REFERENCES ledger_entries(id) ON DELETE SET NULL,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(date);
CREATE INDEX IF NOT EXISTS idx_ledger_category ON ledger_entries(category);

-- ------------------------------------------------------------------------------
-- 13. TABLA: PERMISOS Y RESOLUCIONES B-SISA (bsisa_permits)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bsisa_permits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estancia_id TEXT NOT NULL DEFAULT 'estancia-san-jose',
  permit_number TEXT NOT NULL,
  permit_type TEXT NOT NULL,
  issued_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  monthly_quota_liters NUMERIC(10, 2),
  authorized_station TEXT,
  machine_id TEXT REFERENCES machines(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('Vigente', 'Por vencer', 'Vencido', 'En trámite')),
  document_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bsisa_expiry ON bsisa_permits(expiry_date);
CREATE INDEX IF NOT EXISTS idx_bsisa_machine ON bsisa_permits(machine_id);

-- ------------------------------------------------------------------------------
-- 14. TABLA: FLOTA DE VEHÍCULOS (vehicles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  estancia_id TEXT NOT NULL DEFAULT 'estancia-san-jose',
  name TEXT NOT NULL,
  plate TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('Camioneta 4x4', 'Motocicleta', 'Cuadratrack / UTV', 'Camión Utilitario')),
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('Gasolina Especial', 'Gasolina Premium', 'Diésel Vehicular', 'Gasolina 91')),
  current_km NUMERIC(12, 2) NOT NULL DEFAULT 0,
  average_km_per_liter NUMERIC(6, 2) NOT NULL DEFAULT 9.0,
  tank_capacity_liters NUMERIC(6, 2) NOT NULL DEFAULT 70,
  last_oil_change_km NUMERIC(12, 2) NOT NULL DEFAULT 0,
  oil_interval_km NUMERIC(10, 2) NOT NULL DEFAULT 5000,
  last_brake_change_km NUMERIC(12, 2) NOT NULL DEFAULT 0,
  brake_interval_km NUMERIC(10, 2) NOT NULL DEFAULT 20000,
  last_air_filter_change_km NUMERIC(12, 2) NOT NULL DEFAULT 0,
  air_filter_interval_km NUMERIC(10, 2) NOT NULL DEFAULT 5000,
  last_tire_change_km NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tire_interval_km NUMERIC(10, 2) NOT NULL DEFAULT 40000,
  assigned_driver TEXT,
  image_url TEXT,
  emoji TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);

-- ------------------------------------------------------------------------------
-- 15. TABLA: BITÁCORA DE COMBUSTIBLE VEHICULAR (vehicle_fuel_logs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_fuel_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  odometer_km NUMERIC(12, 2) NOT NULL,
  liters NUMERIC(8, 2) NOT NULL,
  price_per_liter_bs NUMERIC(6, 2) NOT NULL,
  total_cost_bs NUMERIC(10, 2) NOT NULL,
  fuel_type TEXT NOT NULL,
  station TEXT NOT NULL,
  driver TEXT NOT NULL,
  full_tank BOOLEAN NOT NULL DEFAULT true,
  calculated_km_per_liter NUMERIC(6, 2),
  cost_per_km_bs NUMERIC(6, 2),
  receipt_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_fuel_veh ON vehicle_fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_fuel_date ON vehicle_fuel_logs(date);

-- ------------------------------------------------------------------------------
-- 16. TABLA: HISTORIAL DE MANTENIMIENTO Y REPUESTOS (vehicle_maintenance_logs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_maintenance_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  odometer_km NUMERIC(12, 2) NOT NULL,
  service_type TEXT NOT NULL,
  parts_replaced TEXT NOT NULL,
  cost_bs NUMERIC(10, 2) NOT NULL,
  workshop_or_mechanic TEXT NOT NULL,
  invoice_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_maint_veh ON vehicle_maintenance_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maint_date ON vehicle_maintenance_logs(date);

-- ==============================================================================
-- 13. FUNCIÓN RPC TRANSACCIONAL: REGISTRO DE USO DE MAQUINARIA (ACID)
-- ==============================================================================
CREATE OR REPLACE FUNCTION register_machine_usage_tx(
  p_date DATE,
  p_machine_id TEXT,
  p_lot_id TEXT,
  p_operator TEXT,
  p_labor_type TEXT,
  p_start_hours NUMERIC,
  p_end_hours NUMERIC,
  p_supply_id TEXT DEFAULT NULL,
  p_supply_qty NUMERIC DEFAULT 0,
  p_diesel_liters NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_hours NUMERIC;
  v_machine RECORD;
  v_lot RECORD;
  v_operating_cost NUMERIC;
  v_cost_per_ha NUMERIC := NULL;
  v_usage_id TEXT;
  v_ledger_id TEXT;
  v_supply RECORD;
BEGIN
  -- Validaciones
  IF p_end_hours < p_start_hours THEN
    RAISE EXCEPTION 'El horómetro final (%) no puede ser menor al horómetro inicial (%)', p_end_hours, p_start_hours;
  END IF;

  SELECT * INTO v_machine FROM machines WHERE id = p_machine_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Máquina % no encontrada', p_machine_id;
  END IF;

  SELECT * INTO v_lot FROM lots WHERE id = p_lot_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote % no encontrado', p_lot_id;
  END IF;

  v_hours := p_end_hours - p_start_hours;
  v_operating_cost := ROUND(v_hours * v_machine.hourly_cost_bs, 2);

  IF v_lot.hectares > 0 THEN
    v_cost_per_ha := ROUND(v_operating_cost / v_lot.hectares, 2);
  END IF;

  -- Descontar insumo con validación de stock si aplica
  IF p_supply_id IS NOT NULL AND p_supply_qty > 0 THEN
    SELECT * INTO v_supply FROM supplies WHERE id = p_supply_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insumo % no encontrado', p_supply_id;
    END IF;
    IF v_supply.stock < p_supply_qty THEN
      RAISE EXCEPTION 'Stock insuficiente de % (Disponible: %, Requerido: %)', v_supply.name, v_supply.stock, p_supply_qty;
    END IF;
    UPDATE supplies SET stock = stock - p_supply_qty WHERE id = p_supply_id;
  END IF;

  -- Actualizar horómetro de la máquina
  UPDATE machines SET hourmeter = p_end_hours WHERE id = p_machine_id;

  -- Generar IDs
  v_usage_id := gen_random_uuid()::text;
  v_ledger_id := gen_random_uuid()::text;

  -- Insertar uso de máquina
  INSERT INTO machine_usages (
    id, date, machine_id, lot_id, operator, labor_type,
    start_hours, end_hours, supply_id, supply_qty, diesel_liters,
    operating_cost_bs, cost_per_hectare_bs, notes
  ) VALUES (
    v_usage_id, p_date, p_machine_id, p_lot_id, p_operator, p_labor_type,
    p_start_hours, p_end_hours, p_supply_id, p_supply_qty, p_diesel_liters,
    v_operating_cost, v_cost_per_ha, p_notes
  );

  -- Insertar egreso en Libro Diario Contable
  INSERT INTO ledger_entries (
    id, date, description, category, type, amount_bs, lot_id
  ) VALUES (
    v_ledger_id,
    p_date,
    format('Labor: %s (%s hrs con %s)', p_labor_type, v_hours, v_machine.name),
    'Maquinaria',
    'egreso',
    v_operating_cost,
    p_lot_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'usage_id', v_usage_id,
    'hours_operated', v_hours,
    'operating_cost_bs', v_operating_cost,
    'cost_per_hectare_bs', v_cost_per_ha,
    'ledger_id', v_ledger_id
  );
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 14. TABLA DE AUDITORÍA Y TRAZABILIDAD (audit_logs & CDC)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  performed_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_table_audit() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_ledger ON ledger_entries;
CREATE TRIGGER trg_audit_ledger
  AFTER INSERT OR UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION log_table_audit();

DROP TRIGGER IF EXISTS trg_audit_usages ON machine_usages;
CREATE TRIGGER trg_audit_usages
  AFTER INSERT OR UPDATE OR DELETE ON machine_usages
  FOR EACH ROW EXECUTE FUNCTION log_table_audit();

DROP TRIGGER IF EXISTS trg_audit_supplies ON supplies;
CREATE TRIGGER trg_audit_supplies
  AFTER INSERT OR UPDATE OR DELETE ON supplies
  FOR EACH ROW EXECUTE FUNCTION log_table_audit();

-- ==============================================================================
-- 15. SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvest_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rainfall_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE laborer_worklogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_scoutings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bsisa_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso completo para usuarios autenticados y clave anónima de la estancia
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'app_settings', 'lots', 'supplies', 'machines', 'machine_usages',
      'fuel_transactions', 'harvest_deliveries', 'maintenance_records',
      'rainfall_records', 'laborer_worklogs', 'field_scoutings', 'ledger_entries',
      'audit_logs', 'bsisa_permits', 'vehicles', 'vehicle_fuel_logs', 'vehicle_maintenance_logs'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public access to %I" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public access to %I" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END;
$$;

-- ==============================================================================
-- 15. SEED DATA INICIAL (DATOS DE ARRANQUE PARA SANTA CRUZ, BOLIVIA)
-- ==============================================================================

-- Configuración Inicial
INSERT INTO app_settings (id, currency_mode, exchange_rate, fuel_tank_capacity_liters, fuel_tank_monthly_quota_liters)
VALUES ('default', 'BOB', 6.9600, 25000.00, 15000.00)
ON CONFLICT (id) DO NOTHING;

-- Lotes
INSERT INTO lots (id, name, hectares, crop, status, location) VALUES
  ('lot-1', 'Lote 1 - El Porvenir Norte', 120.00, 'Soya (DM 3312)', 'Crecimiento', 'Zona Pailón'),
  ('lot-2', 'Lote 2 - Santa María Sur', 85.00, 'Maíz (Dekalb 7088)', 'Siembra', 'Zona Cuatro Cañadas'),
  ('lot-3', 'Lote 3 - La Esperanza Este', 150.00, 'Soya (Don Mario 6.2)', 'Cosecha', 'Zona Montero'),
  ('lot-4', 'Lote 4 - El Bajío Oeste', 90.00, 'Barbecho Químico', 'Barbecho', 'Zona San José')
ON CONFLICT (id) DO NOTHING;

-- Insumos
INSERT INTO supplies (id, name, category, stock, min_stock, unit, unit_cost_bs) VALUES
  ('sup-1', 'Glifosato 48% SL (Roundup)', 'Herbicidas', 650.00, 200.00, 'Litros', 55.00),
  ('sup-2', 'Cipermetrina 25 EC', 'Insecticidas', 180.00, 50.00, 'Litros', 85.00),
  ('sup-3', 'Semilla Soya Fiscalizada DM 3312', 'Semillas', 4500.00, 1000.00, 'Kilos', 12.50),
  ('sup-4', 'Fertilizante Urea 46%', 'Fertilizantes', 8500.00, 2000.00, 'Kilos', 4.80),
  ('sup-5', 'Diésel Oíl B-SISA ANH', 'Combustibles', 14200.00, 3000.00, 'Litros', 3.72)
ON CONFLICT (id) DO NOTHING;

-- Maquinaria
INSERT INTO machines (id, name, type, hourmeter, status, hourly_cost_bs, service_interval_hours, last_service_hourmeter, fuel_average_liters_per_hour) VALUES
  ('mach-1', 'Tractor John Deere 6155J', 'Tractor', 1240.50, 'Operativa', 315.00, 250.00, 1200.00, 16.50),
  ('mach-2', 'Tractor Case Puma 215', 'Tractor', 2185.00, 'Operativa', 410.00, 250.00, 2000.00, 22.00),
  ('mach-3', 'Cosechadora New Holland CR 7.90', 'Cosechadora', 890.00, 'Operativa', 840.00, 250.00, 750.00, 34.00),
  ('mach-4', 'Pulverizador Autopropulsado Jacto Uniport 3030', 'Pulverizador', 1420.00, 'Operativa', 380.00, 250.00, 1250.00, 14.00)
ON CONFLICT (id) DO NOTHING;

-- Combustible: Carga inicial de cisterna
INSERT INTO fuel_transactions (id, date, type, liters, price_per_liter_bs, total_cost_bs, destination_or_source, invoice_number, notes) VALUES
  ('ft-init-1', CURRENT_DATE - INTERVAL '15 days', 'ingreso', 10000.00, 3.72, 37200.00, 'YPFB Refinería Guillermo Elder Bell', 'FAC-99412', 'Carga cisterna ANH B-SISA')
ON CONFLICT (id) DO NOTHING;

-- Asiento contable de carga inicial
INSERT INTO ledger_entries (id, date, description, category, type, amount_bs) VALUES
  ('led-init-1', CURRENT_DATE - INTERVAL '15 days', 'Compra de 10.000 L Diésel ANH B-SISA (Factura #FAC-99412)', 'Combustibles', 'egreso', 37200.00)
ON CONFLICT (id) DO NOTHING;

-- Permisos y Resoluciones B-SISA Iniciales
INSERT INTO bsisa_permits (id, permit_number, permit_type, issued_date, expiry_date, monthly_quota_liters, authorized_station, status, notes) VALUES
  ('bp-1', 'RA-ANH-ULCR-2026/0488', 'Resolución de Cupo ANH (Cisterna Estancia)', '2026-01-15', '2026-12-31', 20000.00, 'Estación de Servicio Pailón Norte / YPFB', 'Vigente', 'Cupo de 20.000 L/mes aprobado para campaña de siembra y cosecha de verano'),
  ('bp-2', 'RFID-B-SISA-77421', 'Roseta RFID B-SISA (Maquinaria Agrícola)', '2025-11-20', '2026-11-20', NULL, 'Red Nacional Surtidores B-SISA', 'Vigente', 'Inspección técnica anual aprobada en taller móvil ANH Montero (John Deere 6155J)'),
  ('bp-3', 'RFID-B-SISA-66019', 'Roseta RFID B-SISA (Maquinaria Agrícola)', '2025-11-05', '2026-11-05', NULL, 'Red Nacional Surtidores B-SISA', 'Por vencer', 'Agendar inspección técnica de la ANH para Cosechadora Case antes de que expire'),
  ('bp-4', 'HR-DGSC-SCZ-99120', 'Hoja de Ruta / Transporte DGSC', '2026-10-18', '2026-10-25', 10000.00, 'Refinería Guillermo Elder Bell a Estancia San José', 'Vigente', 'Autorización de traslado en camión cisterna propio de 10.000 L')
ON CONFLICT (id) DO NOTHING;

-- Flota de Vehículos Iniciales
INSERT INTO vehicles (id, name, plate, type, fuel_type, current_km, average_km_per_liter, tank_capacity_liters, last_oil_change_km, oil_interval_km, last_brake_change_km, brake_interval_km, last_air_filter_change_km, air_filter_interval_km, last_tire_change_km, tire_interval_km, assigned_driver, emoji, image_url, notes) VALUES
  ('v1', 'Toyota Hilux 4x4 (Administración & Gerencia)', '4021-NBS', 'Camioneta 4x4', 'Diésel Vehicular', 118450.00, 11.20, 80.00, 114200.00, 7500.00, 102000.00, 25000.00, 112000.00, 6000.00, 85000.00, 45000.00, 'Ing. Roberto Paz (Administrador)', '🛻', 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1000&q=80', 'Camioneta de viajes a ciudad y supervisión central de campos'),
  ('v2', 'Nissan Frontier 4x4 (Agronomía & Monitoreo)', '3815-KPT', 'Camioneta 4x4', 'Gasolina Especial', 164200.00, 9.40, 75.00, 160500.00, 5000.00, 148000.00, 20000.00, 159000.00, 5000.00, 130000.00, 40000.00, 'Ing. Walter Mendoza (Agrónomo)', '🛻', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80', 'Vehículo de campo pesado para monitoreo de plagas y suelos'),
  ('v3', 'Honda XR 250 Tornado (Recorredor de Lotes)', '2240-XTR', 'Motocicleta', 'Gasolina Especial', 32800.00, 28.50, 12.00, 30800.00, 3000.00, 26000.00, 15000.00, 30000.00, 40000.00, 20000.00, 20000.00, 'Zenón Mamani (Capataz)', '🏍️', 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1000&q=80', 'Recorrido diario de linderos, compuertas y pluviómetros'),
  ('v4', 'Can-Am Outlander 450 (Cuadratrack Pulverización)', 'S/P-CUAD-01', 'Cuadratrack / UTV', 'Gasolina Especial', 14650.00, 12.00, 20.00, 13500.00, 2500.00, 11000.00, 10000.00, 13200.00, 3000.00, 8000.00, 15000.00, 'Juan Rojas (Operador)', '🏎️', 'https://images.unsplash.com/photo-1579227114347-15d08fc37cae?auto=format&fit=crop&w=1000&q=80', 'Acceso a lotes anegados y apoyo en pulverización terrestre'),
  ('v5', 'Isuzu FTR 15t (Camión Apoyo & Taller Móvil)', '1940-YUB', 'Camión Utilitario', 'Diésel Vehicular', 245800.00, 4.80, 200.00, 238000.00, 10000.00, 22000.00, 35000.00, 240000.00, 8000.00, 210000.00, 50000.00, 'Pedro Salazar (Mecánico Jefe)', '🚛', 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1000&q=80', 'Transporte de tambores de aceite, repuestos pesados y auxilio de maquinaria')
ON CONFLICT (plate) DO NOTHING;

-- Bitácoras iniciales de combustible
INSERT INTO vehicle_fuel_logs (id, vehicle_id, date, odometer_km, liters, price_per_liter_bs, total_cost_bs, fuel_type, station, driver, full_tank, calculated_km_per_liter, cost_per_km_bs, notes) VALUES
  ('vf-1', 'v1', '2026-10-18', 118450.00, 70.00, 3.72, 260.40, 'Diésel Vehicular', 'Surtidor Pailón Norte / YPFB', 'Ing. Roberto Paz', true, 11.20, 0.33, 'Viaje ida y vuelta a oficinas de CAO Santa Cruz'),
  ('vf-2', 'v2', '2026-10-19', 164200.00, 65.00, 3.74, 243.10, 'Gasolina Especial', 'Estación de Servicio Cuatro Cañadas', 'Ing. Walter Mendoza', true, 9.40, 0.40, 'Recorrido monitoreo de chinches y roya en lotes 1 y 3')
ON CONFLICT (id) DO NOTHING;

-- Fin del script
