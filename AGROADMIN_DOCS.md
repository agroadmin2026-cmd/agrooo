# AgroAdmin Bolivia — Arquitectura y Entrega Enterprise

Sistema Integral de Gestión Agrícola y Contabilidad de Campo (ERP) adaptado específicamente para el sector agroindustrial boliviano (Santa Cruz, Montero, Pailón, Cuatro Cañadas).

---

## 1. Desacople y Entorno Local (Zero Lovable)

- **Eliminación Total de Lovable**: Se removieron carpetas de telemetría (`.lovable/`), runtime de Bun (`bunfig.toml`, `bun.lock`), utilidades de error-reporting y scripts externos en `index.html`.
- **Configuración de NPM Robusta**: Se resolvió el conflicto de peer-dependencies de React 19 / Vite mediante `.npmrc` (`legacy-peer-deps=true`), permitiendo instalaciones limpias con `npm install`.
- **Compilación TypeScript y Enrutador**: Cero errores de compilación con `npx tsc --noEmit` y sincronización automática del árbol de rutas de TanStack Router (`src/routeTree.gen.ts`).

---

## 2. Localización Bimonetaria de Bolivia (`Bs` y `USD`)

- **Gestión Bimonetaria en Tiempo Real**: Selector dinámico en la cabecera para alternar entre **Bolivianos (`Bs` / `BOB`)** y **Dólares Americanos (`USD` / `$`)**.
- **Tipo de Cambio Configurable**: Tipo de cambio editable en vivo (por defecto Oficial `6,96` o mercado de insumos/paralelo `8,50`).
- **Valores y Precios de Mercado Real en Bolivia**:
  - Diésel Oíl subvencionado ANH B-SISA: **Bs 3,72 / Litro**.
  - Tarifas operativas de maquinaria por horómetro: Tractores 155-215 HP a **Bs 315 - 410 / hora**, Cosechadoras axiales a **Bs 840 / hora**.
  - Insumos agrícolas (Cipermetrina, Glifosato, Urea, DAP, Semilla fiscalizada) cotizados en moneda nacional y convertible a USD.

---

## 3. Módulos Implementados al 100%

### A. Maquinaria, Horómetros y Vales de Labor (`/maquinaria`)

- **Formulario Inteligente `UsageDialog`**:
  - Auto-sincronización del horómetro inicial con el horómetro actual de la máquina.
  - Validación en vivo de horómetro final ($H_{fin} \ge H_{ini}$).
  - Cálculo automático de horas operadas y costo de labor ($Horas \times Tarifa$).
  - Estimación de consumo de diésel ($L/h$) y costo total de combustible.
  - Descuento opcional y validación de stock de insumos agrícolas (fertilizante, semilla, fitosanitario).
  - Cálculo en tiempo real de costo por hectárea ($Bs/ha$).
- **Ficha Imprimible de Labor `LaborReceiptModal`**: Vale oficial de campo con firma de operador, supervisor y desglose de costos.
- **Control de Mantenimientos Preventivos (250 horas)**: Barras de progreso de desgaste de horas hasta el próximo servicio de motor/filtros con registro de costos al libro contable.

### B. Cisterna de Diésel y Cupo B-SISA (`/combustible`)

- Medidor gráfico de nivel de cisterna de estancia (Capacidad: 25.000 L).
- Monitoreo de cupo mensual asignado por la Agencia Nacional de Hidrocarburos (ANH B-SISA).
- Registro dual de transacciones:
  - **Ingreso (Carga a Cisterna)**: Aumenta stock e imputa egreso contable directo con número de factura fiscal.
  - **Despacho a Maquinaria**: Imputa litros consumidos por máquina y descuenta del tanque central.
- Exportación del libro de combustibles a formato **CSV / Excel** con codificación UTF-8 BOM.

### C. Cosecha y Liquidación de Silos / Balanza (`/cosecha`)

- Registro de comprobantes de balanza en silos receptores (ADM Pailón, Gravetal, Cargill, Silo Cuatro Cañadas).
- Fórmula de balanza agrícola:
  - $\text{Neto} = \text{Peso Bruto} - \text{Tara}$
  - $\text{Líquido Pagable} = \text{Neto} - \text{Merma por Humedad e Impurezas}$
- Asiento automático en el Libro Diario Contable como **Ingreso por Venta de Cosecha** asignado al lote correspondiente.
- Exportación a CSV con un clic.

### D. Pluviómetro y Régimen de Precipitaciones (`/lluvias`)

- Registro pluviométrico en milímetros ($\text{mm}$) por lote o estación meteorológica central.
- Acumulado mensual de lluvias y cálculo de promedios por precipitación.
- Indicador técnico de aptitud de suelo para maquinaria y siembra (_Suelo con piso óptimo_ vs _Saturado / Anegado - Esperar 48 hrs_ vs _Déficit hídrico_).
- Exportación de historial pluviométrico a Excel / CSV.

### E. Planilla de Mano de Obra y Jornales de Campo (`/jornales`)

- Registro de labores manuales eventuales (deshierbe, estiba, banderilleros).
- Asignación de días trabajados y tarifa diaria (ej. $\text{Bs 150/día}$).
- Asiento contable automático de egreso en el Libro Diario bajo la categoría **Jornales**.
- Integración directa en el costo de producción del lote ($expensesBs$ y Margen Bruto).
- Botón de alternancia de estado (_Pagado_ vs _Pendiente_) y exportación de planilla a CSV.

### F. Sanidad Vegetal, Scouting y Monitoreo de Plagas (`/monitoreo`)

- Seguimiento agronómico por lote y estadío fenológico (ej. $V4$, $R1$, $R5$).
- Control de umbrales económicos de daño de plagas (_Falsa medidora_, _Gusano cogollero_, _Picudo_).
- Semáforo de alerta crítica para aplicaciones inmediatas de fitosanitarios.
- Vinculación con inventario de insumos para sugerir agroquímicos disponibles.

### G. Rentabilidad y Margen Bruto Agrícola por Lote (`/lotes`)

- Dashboard analítico consolidado por parcela:
  - Rendimiento agrícola en campo: $\text{t/ha}$ ($\text{Toneladas cosechadas} / \text{Superficie}$).
  - Margen Bruto neto: $\text{Ingresos} - (\text{Labores de maquinaria} + \text{Insumos aplicados} + \text{Combustible} + \text{Mano de Obra})$.
  - Margen Bruto unitario en **$\text{Bs/ha}$** y **$\text{USD/ha}$**.
- Vista de detalle por lote con auditoría pormenorizada de cada labor, insumo, jornal y viaje a silo.

### H. Informe Ejecutivo de Cierre de Campaña Imprimible (`CampaignReportModal`)

- Modal formal con membrete oficial de Estancia Agrícola San José (Santa Cruz, Bolivia).
- Formato imprimible y exportable a PDF con `window.print()` y estilos `@media print`.
- Consolidado bimonetario de ingresos, estructura porcentual de costos de campo (insumos, labores, diésel, jornales) y firmas del Ingeniero Agrónomo y Administrador de Estancia.

### I. Contabilidad y Conciliación Fiscal (`/contabilidad`)

- Registro cronológico de ingresos y egresos vinculados a todos los módulos operativos.
- Filtros por categoría (_Maquinaria_, _Combustibles_, _Mantenimiento_, _Venta de Cosecha_, _Jornales_, _Insumos_).
- Botón **Exportar Excel (CSV)** con importes en Bolivianos y Dólares.

---

## 4. Pruebas y Validación de Calidad

- **17 pruebas automáticas pasando al 100%** (`npm test`):
  - `src/test/new-modules.test.tsx` (5 pruebas: Bimonetario, Pluviómetro, Jornales, Margen Bruto con Jornales, Scouting)
  - `src/test/enterprise-modules.test.tsx` (6 pruebas: Diésel B-SISA, Balanza/Silos, Margen Bruto, Mantenimiento 250h, CSV)
  - `src/test/machinery-usage.test.tsx` (5 pruebas: Formulario UsageDialog, horas, combustible, insumos, libro contable)
  - `src/test/app-routing.test.tsx` (1 prueba: Enrutador y árbol de componentes)
- **Cero Errores TypeScript**: `npx tsc --noEmit` completado con código 0.
- **Verificación en Navegador**: Recorrido funcional completo interactivo grabado y validado sin advertencias ni errores de consola.
