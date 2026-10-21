# AgroAdmin - Enterprise Agricultural & Accounting Management

Sistema web empresarial para la gestión integral agrícola, control de maquinaria, inventarios de insumos y contabilidad operativa en tiempo real.

## Tecnologías

- **Frontend**: React 19, TypeScript, TanStack Router & Start, TanStack Query
- **Estilos**: Tailwind CSS v4, Lucide Icons, Radix UI & Sonner
- **Testing**: Vitest & Testing Library
- **Tooling**: Vite

## Puesta en marcha

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar el entorno de desarrollo:
   ```bash
   npm run dev
   ```
3. Ejecutar suite de pruebas:
   ```bash
   npm test
   ```

## Módulos Principales

- **Maquinaria, Uso y Descuento de Inventario**: Registro de labores, cálculo de horómetros acumulados, deducción reactiva de stock de insumos e imputación automática de egresos operativos al libro contable.
- **Inventario y Depósito**: Stock de semillas, fertilizantes, insecticidas y alertas de punto de reorden.
- **Lotes y Rendimiento**: Seguimiento por hectáreas y estado fenológico de cultivos.
- **Libro Contable**: Control de ingresos y egresos vinculados a labores y compras.
