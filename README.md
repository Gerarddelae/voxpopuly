# 🗳️ VoxPopuly - Plataforma de Votación Digital Moderna

Una **plataforma web intuida y segura** para gestionar procesos electorales locales con total transparencia y facilidad. VoxPopuly permite que organizaciones, asociaciones y eventos realicen votaciones de forma moderna, segura y con resultados en tiempo real.

---

## ✨ ¿Qué es VoxPopuly?

VoxPopuly es una solución completa de votación digital diseñada para **eventos electorales locales** donde se requiere:
- ✅ Gestión centralizada de procesos electorales
- ✅ Múltiples puntos de votación distribuidos
- ✅ Control de participantes autorizados
- ✅ Votaciones con candidatos organizados en planchas
- ✅ Resultados en tiempo real y análisis
- ✅ Experiencia de voto simple y anónima

---

## 🎯 Características Principales

### 👨‍💼 Para Administradores
- Crear y gestionar eventos electorales
- Configurar múltiples puntos de votación
- Registrar y validar votantes autorizados
- Crear candidaturas organizadas por planchas
- Asignar delegados a puntos de votación
- Importar votantes en lote (bulk upload)
- Panel de análisis y estadísticas en tiempo real

### 🕵️ Para Delegados
- Supervisar votación en su punto asignado
- Monitoreo en vivo de participación
- Acceso a estadísticas parciales
- Dashboard con información actualizada

### 🗳️ Para Votantes
- Interfaz simple y clara para votar
- Proceso de voto rápido y anónimo
- Selección de candidatos organizados por plancha
- Confirmación segura del voto

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| **Frontend** | Next.js (App Router), React 18, TypeScript |
| **Estilos** | Tailwind CSS + UI Components personalizados |
| **Backend/BD** | Supabase (PostgreSQL) |
| **Autenticación** | Supabase Auth |
| **Tiempo Real** | Supabase Realtime |
| **Despliegue** | Vercel / Entorno Serverless |

---

## �️ Configuración de la Base de Datos

El proyecto utiliza migraciones de Supabase para gestionar el esquema de la base de datos. Las migraciones se encuentran en la carpeta `supabase/migrations/` y incluyen:

- ✅ Creación de tablas (elections, voting_points, voters, slates, etc.)
- ✅ Configuración de políticas de Row Level Security (RLS)
- ✅ Extensiones PostgreSQL necesarias
- ✅ Funciones y triggers

### Aplicar Migraciones

**Primera vez o en desarrollo:**
```bash
# Vincular proyecto local con proyecto remoto de Supabase
supabase link --project-ref=tu_project_ref

# Aplicar todas las migraciones
supabase db push
```

**Para sincronizar cambios remotos:**
```bash
# Descargar cambios del servidor remoto
supabase db pull
```

**Para crear nuevas migraciones locales:**
```bash
supabase migration new nombre_migracion
```

---

## �📦 Instalación Rápida

### Requisitos Previos
- Node.js 18+
- npm o pnpm
- Supabase CLI (`npm install -g supabase`)
- Proyecto Supabase creado en [supabase.com](https://supabase.com)

### Pasos

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd voxpopuly
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crear archivo `.env.local` con credenciales de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

4. **Aplicar migraciones de Supabase**
```bash
# Asegúrate de tener Supabase CLI instalado
npm install -g supabase

# Sincronizar con el proyecto remoto
supabase link --project-ref=tu_project_ref

# Aplicar las migraciones a tu base de datos
supabase db push
```

**Nota:** Las migraciones se encuentran en `supabase/migrations/` y contienen el esquema completo de la base de datos (tablas, funciones, políticas RLS, etc.).

5. **Ejecutar el servidor de desarrollo**
```bash
npm run dev
```

6. **Acceder a la aplicación**
Abrir [http://localhost:3000](http://localhost:3000) en tu navegador

---

## 📁 Estructura del Proyecto

```
voxpopuly/
├── app/                    # App Router de Next.js
│   ├── api/               # Rutas API
│   ├── auth/              # Páginas de autenticación
│   └── dashboard/         # Dashboards por rol
├── components/            # Componentes React reutilizables
│   ├── admin/             # Componentes de administración
│   ├── dashboard/         # Componentes de dashboard
│   └── ui/                # UI primitivos
├── lib/                   # Utilidades y lógica compartida
│   ├── auth/              # Lógica de autenticación
│   └── supabase/          # Cliente y utilidades de Supabase
├── hooks/                 # Custom hooks
├── store/                 # Estado de la aplicación
└── supabase/              # Migraciones y configuración
```

---

## 🚀 Funcionalidades Clave

- **Gestión Multiusuario**: Roles diferenciados (Admin, Delegado, Votante)
- **Seguridad**: Autenticación integrada, votación anónima
- **Escalabilidad**: Soporta múltiples puntos de votación simultáneamente
- **Tiempo Real**: Actualización instantánea de resultados
- **Interfaz Responsiva**: Funciona en desktop, tablet y móvil
- **Importación en Lote**: Carga masiva de votantes

---

## 📊 Documentación de Implementación

El proyecto incluye documentación detallada de desarrollo:
- [HU01-IMPLEMENTATION.md](HU01-IMPLEMENTATION.md)
- [HU02-IMPLEMENTATION.md](HU02-IMPLEMENTATION.md)
- [HU03-IMPLEMENTATION.md](HU03-IMPLEMENTATION.md)
- [HU04-IMPLEMENTATION.md](HU04-IMPLEMENTATION.md)
- [HU05-IMPLEMENTATION.md](HU05-IMPLEMENTATION.md)
- [HU05-SUPABASE-SETUP.md](HU05-SUPABASE-SETUP.md)

---

## 🔧 Problemas Comunes

### Error: "Migraciones no aplicadas"
Si ves errores de tablas no encontradas:
```bash
# Verifica que estés vinculado al proyecto correcto
supabase projects list

# Aplica las migraciones
supabase db push
```

### Error: "No permission para aplicar migraciones"
Asegúrate de usar las credenciales correctas de Supabase y que tu usuario tenga permisos de administrador en el proyecto.

### Variables de entorno no configuradas
En desarrollo, crea `.env.local` con las claves de tu proyecto Supabase. En producción, configúralas en tu plataforma de hosting (Vercel, etc.).

---

## 📧 Contacto y Soporte

Para preguntas o soporte, por favor contactar al equipo de desarrollo.

---

**Hecho con ❤️ para democracias locales más transparentes**




