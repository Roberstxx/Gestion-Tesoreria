# Gestión de Tesorería

Aplicación de control de ingresos y gastos con panel de indicadores, gráficos y reportes. Incluye un repositorio de datos intercambiable (local/Firebase) y validaciones para mantener consistencia en las métricas y gráficas.

## ✨ Características

- Registro de movimientos (ingresos, donaciones, inversiones, gastos).
- Gráficas de saldo semanal, ingresos vs gastos y top categorías.
- Estadísticas mensuales y comparativos.
- Exportación de reportes en PDF/CSV.
- Capa de datos preparada para Firebase (Firestore) o almacenamiento local.
- Login con Firebase Authentication (solo correo/contraseña).

## 🧱 Tecnologías

- React + TypeScript + Vite
- Tailwind + shadcn/ui
- Recharts

## 🚀 Inicio rápido

```bash
npm install
npm run dev
```

## 🗂️ Proveedor de datos

La app soporta dos modos de datos:

| Proveedor | Descripción | Estado |
| --- | --- | --- |
| `local` | LocalStorage para desarrollo rápido. | ⚠️ Opcional |
| `firebase` | Firestore para producción. | ✅ Activo por defecto |

Configura el proveedor en el archivo `.env`:

```bash
VITE_DATA_PROVIDER=firebase
# o
VITE_DATA_PROVIDER=local
```

## 🔧 Configuración Firebase (Firestore)

1. Crea un proyecto en Firebase y habilita **Firestore**.
2. Copia las credenciales de tu app web y crea un `.env` siguiendo `.env.example` (incluye `measurementId` si usas Analytics).
3. Cambia `VITE_DATA_PROVIDER=firebase`.

## 🔐 Login con Firebase Authentication

La app usa **solo inicio de sesión** (sin registro). El alta de usuarios se gestiona desde Firebase.

1. Activa el proveedor **Email/Password** en Firebase Authentication.
2. Crea los usuarios desde la consola de Firebase.
3. Inicia sesión en `/login` con las credenciales configuradas.

### Estructura esperada en Firestore

Colecciones:

- `transactions`
- `categories`
- `periods`
- `settings` (documento `app`)

Campos principales:

**transactions**
- `id`, `type`, `amount`, `date`, `categoryId`, `description`, `tags`, `paymentMethod`, `receipt`, `createdAt`, `updatedAt`

**categories**
- `id`, `name`, `type`, `isDefault`

**periods**
- `id`, `name`, `startDate`, `endDate`, `initialFund`, `createdAt`

**settings/app**
- `currentPeriodId`, `hasCompletedOnboarding`, `theme`

## ✅ Consistencia de datos

Antes de usar los datos, la app normaliza la información para mantener las gráficas consistentes:

- Elimina transacciones inválidas (monto <= 0, fecha inválida, tipo desconocido).
- Normaliza fechas a `yyyy-MM-dd`.
- Crea categorías de respaldo `Sin categoría` por tipo si hace falta.
- Asegura que `currentPeriodId` apunte a un periodo válido.
- Normaliza la entrada antes de guardar movimientos en la base de datos.

La normalización se ejecuta al leer el snapshot y garantiza que las métricas no se rompan.

## 🧪 Scripts

```bash
npm run dev
npm run build
npm run lint
```

## 🧩 Ubicación del repositorio de datos

- `src/data/treasuryRepository.ts`: interfaz base
- `src/data/localTreasuryRepository.ts`: implementación LocalStorage
- `src/data/firebase/treasuryRepository.ts`: implementación Firestore
- `src/utils/consistency.ts`: normalización y consistencia

---

Si necesitas ayuda para conectar reglas de seguridad o autenticación en Firebase, dímelo y te dejo la plantilla lista.
