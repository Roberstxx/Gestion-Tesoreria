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

> Variables mínimas requeridas para conexión (Auth + Firestore): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`.


## 🔐 Login con Firebase Authentication

La app usa **solo inicio de sesión** (sin registro). El alta de usuarios se gestiona desde Firebase.

1. Activa el proveedor **Email/Password** en Firebase Authentication.
2. Crea los usuarios desde la consola de Firebase.
3. Inicia sesión en `/login` con las credenciales configuradas.

> Nota: para login con correo/contraseña no necesitas OAuth popup/redirect. Si en consola ves el mensaje de dominio no autorizado para OAuth, agrega tu dominio en **Firebase Console → Authentication → Settings → Authorized domains** si planeas usar proveedores sociales o popup/redirect en el futuro.

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


## 🔒 Reglas de Firestore (compatibles con esta app)

La app guarda todo bajo la ruta del usuario autenticado:

- `users/{uid}/transactions`
- `users/{uid}/categories`
- `users/{uid}/periods`
- `users/{uid}/settings/app`

Reglas recomendadas:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /{allPaths=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

> Si ves errores `permission-denied`, confirma que el usuario inició sesión y que el `uid` autenticado coincide con la ruta `users/{uid}`.

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


