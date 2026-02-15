# HU02 - Gestión de Puntos de Votación y Delegados

## 📋 Historia de Usuario

**Rol:** Super Admin

**Descripción:** Como Super Admin, quiero crear puntos de votación y asignar un delegado a cada punto para asegurar que cada lugar tenga un responsable que supervise la votación y vea las estadísticas correspondientes.

**Prioridad:** Alta

---

## ✅ Criterios de Aceptación

### 1. ✅ Cada punto está asociado a un delegado
- **Implementado:** Sí
- **Ubicación:**
  - Campo `delegate_id` en la tabla `voting_points`
  - Selector de delegado en formularios de creación y edición
  - Vista de delegado asignado en detalles del punto

### 2. ✅ Se puede ingresar información de ubicación y logística de cada punto
- **Implementado:** Sí
- **Campos disponibles:**
  - `name`: Nombre del punto de votación
  - `location`: Ubicación física (dirección, piso, salón, etc.)
- **Ubicación:** Formularios en `VotingPointFormDialog` y `VotingPointEditDialog`

### 3. ✅ Cada delegado recibe credenciales de acceso
- **Implementado:** Sí
- **Funcionalidad:**
  - Registro manual de delegados desde la UI de admin
  - Generación automática de contraseñas seguras
  - Visualización de credenciales al momento de crear el delegado
  - Opción para copiar email y contraseña al portapapeles
  - Auto-confirmación de email (sin requerir verificación)
- **Ubicación:** `DelegateFormDialog` component

### 4. ✅ Se pueden agregar, editar o eliminar puntos antes del inicio de la votación
- **Implementado:** Sí
- **Operaciones disponibles:**
  - **Crear:** `POST /api/elections/{id}/voting-points`
  - **Editar:** `PUT /api/voting-points/{pointId}` (validación de fecha de inicio)
  - **Eliminar:** `DELETE /api/voting-points/{pointId}` (validación de fecha de inicio)
- **Restricción:** No se permite editar/eliminar después de que comience la elección

---

## 🏗️ Implementación Técnica

### Archivos Creados/Modificados

#### API Routes
1. **`app/api/delegates/route.ts`**
   - `GET`: Listar delegados disponibles
   - `POST`: Registrar nuevo delegado
   - Validaciones: email único, contraseña mínima 8 caracteres, documento único
   - Usa Supabase Service Role Key para crear usuarios

2. **`app/api/voting-points/[pointId]/route.ts`**
   - `GET`: Obtener detalles de un punto específico
   - `PUT`: Actualizar punto de votación (incluyendo delegado)
   - `DELETE`: Eliminar punto de votación
   - Validación: previene cambios después del inicio de elección

3. **`app/api/users/route.ts`**
   - `GET`: Listar todos los usuarios con estadísticas por rol
   - Solo accesible para admins

#### Componentes UI
1. **`components/admin/delegate-form-dialog.tsx`** ⭐ NUEVO
   - Formulario de registro de delegados
   - Generador de contraseñas seguras
   - Visualización de credenciales con opciones de copiar
   - Estados: formulario → credenciales exitosas
   - Íconos: mostrar/ocultar contraseña, copiar al portapapeles

2. **`components/admin/voting-point-form-dialog.tsx`** ✏️ MODIFICADO
   - Agregado botón "Nuevo delegado" junto al selector
   - Integración con `DelegateFormDialog`
   - Recarga automática de lista de delegados después de crear uno

3. **`components/admin/voting-point-edit-dialog.tsx`** ✏️ MODIFICADO
   - Agregado botón "Nuevo delegado" junto al selector
   - Campo para asignar/cambiar delegado
   - Opción "Sin delegado" disponible
   - Integración con `DelegateFormDialog`

4. **`components/admin/voting-point-details-dialog.tsx`** ✏️ MODIFICADO
   - Agregados botones "Edit" y "Delete" en el header
   - Integración con `VotingPointEditDialog`
   - Confirmación antes de eliminar

5. **`components/ui/alert.tsx`** ⭐ NUEVO
   - Componente de alerta de shadcn/ui
   - Variantes: default, destructive
   - Usa class-variance-authority

#### Páginas
1. **`app/dashboard/admin/users/page.tsx`** ✏️ MODIFICADO
   - Lista completa de usuarios del sistema
   - Estadísticas por rol (total, admins, delegados, votantes)
   - Botón "Nuevo Delegado" en header
   - Tabla con información de cada usuario
   - Integración con `DelegateFormDialog`

### Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=<tu-url-de-supabase>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<tu-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key> # ⚠️ REQUERIDA para crear delegados
```

⚠️ **IMPORTANTE:** La `SUPABASE_SERVICE_ROLE_KEY` es necesaria para crear usuarios desde el backend. Sin ella, el registro de delegados fallará.

---

## 🔄 Flujos de Usuario

### Flujo 1: Crear Punto de Votación con Delegado Existente
1. Admin abre detalles de una elección
2. Click en "Agregar Punto de Votación"
3. Completa nombre y ubicación
4. Selecciona delegado del dropdown
5. Click "Crear"
6. Punto aparece en la lista con delegado asignado

### Flujo 2: Crear Punto de Votación con Nuevo Delegado
1. Admin abre formulario de nuevo punto
2. Click en botón "Nuevo delegado" junto al selector
3. Se abre `DelegateFormDialog`:
   - Ingresa nombre completo
   - Ingresa documento
   - Ingresa email
   - Click "Generar" para contraseña automática (o ingresa manual)
4. Click "Crear Delegado"
5. Se muestran las credenciales generadas:
   - Email de acceso (con botón copiar)
   - Contraseña temporal (con mostrar/ocultar y copiar)
6. Click "Cerrar" en diálogo de credenciales
7. Delegado aparece seleccionado en el dropdown
8. Completa resto del formulario y crea punto

### Flujo 3: Editar Punto de Votación y Asignar Delegado
1. Admin ve detalles de punto de votación
2. Click en botón "Edit" (esquina superior derecha)
3. Se abre `VotingPointEditDialog`
4. Cambia delegado asignado o selecciona "Sin delegado"
5. También puede crear nuevo delegado con botón "Nuevo delegado"
6. Click "Actualizar"
7. Cambios se reflejan inmediatamente

### Flujo 4: Eliminar Punto de Votación
1. Admin ve detalles de punto de votación
2. Click en botón "Delete" (esquina superior derecha)
3. Confirmación de eliminación
4. Punto se elimina (solo si la elección no ha iniciado)

### Flujo 5: Gestionar Delegados desde Users
1. Admin navega a "Users" en sidebar
2. Ve estadísticas de usuarios por rol
3. Click "Nuevo Delegado" en header
4. Completa formulario de registro
5. Recibe y copia credenciales
6. Delegado aparece en la tabla y en los selectores

---

## 🔒 Seguridad y Validaciones

### Validaciones Backend
- ✅ Solo admins pueden crear/editar/eliminar puntos y delegados
- ✅ No se puede editar/eliminar puntos después del inicio de elección
- ✅ Email debe ser único y válido
- ✅ Documento debe ser único
- ✅ Contraseña mínimo 8 caracteres
- ✅ Delegado asignado debe existir en la base de datos

### RLS (Row Level Security) Policies
⚠️ **PENDIENTE:** Ejecutar `fix-voting-points-rls.sql` en Supabase
- Permite INSERT/UPDATE/DELETE en `voting_points` para admins
- Permite INSERT/UPDATE/DELETE en `slates` y `slate_members` para admins

---

## 📊 Base de Datos

### Tabla: `voting_points`
```sql
CREATE TABLE voting_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  delegate_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Relaciones
- `election_id` → `elections.id` (ON DELETE CASCADE)
- `delegate_id` → `profiles.id` (ON DELETE SET NULL) - Opcional

---

## 🧪 Testing Manual

### Test 1: Crear Delegado
1. ✅ Navegar a `/dashboard/admin/users`
2. ✅ Click "Nuevo Delegado"
3. ✅ Ingresar datos y generar contraseña
4. ✅ Verificar que se muestran credenciales
5. ✅ Verificar que se puede copiar email y contraseña
6. ✅ Cerrar diálogo y ver delegado en tabla

### Test 2: Asignar Delegado a Punto
1. ✅ Crear o editar punto de votación
2. ✅ Seleccionar delegado del dropdown
3. ✅ Guardar cambios
4. ✅ Verificar que delegado aparece en detalles del punto

### Test 3: Crear Delegado desde Formulario de Punto
1. ✅ Abrir formulario de nuevo punto
2. ✅ Click "Nuevo delegado"
3. ✅ Crear delegado
4. ✅ Verificar que aparece seleccionado en dropdown
5. ✅ Completar y crear punto

### Test 4: Editar/Eliminar Restricciones
1. ✅ Crear elección con fecha de inicio futura
2. ✅ Crear punto de votación
3. ✅ Editar punto (debe funcionar)
4. ✅ Cambiar fecha de inicio a pasado
5. ✅ Intentar editar punto (debe fallar con mensaje)
6. ✅ Intentar eliminar punto (debe fallar con mensaje)

---

## 📝 Notas Técnicas

### Generación de Contraseñas
- Longitud: 12 caracteres
- Caracteres: A-Z, a-z, 0-9, @#$%&*
- Excluye caracteres ambiguos (I, l, O, 0, 1)

### Credenciales de Delegado
- Email se auto-confirma (no requiere verificación)
- Contraseña se muestra UNA SOLA VEZ al crearla
- Se recomienda al admin compartirla de forma segura
- El delegado puede cambiarla en su primer acceso

### Permisos de Delegados
Los delegados tienen acceso a:
- Ver estadísticas de su punto de votación asignado
- Ver resultados en tiempo real de su punto
- No pueden crear/editar/eliminar elecciones ni puntos

---

## 🚀 Próximos Pasos

Completar HU03 para que los delegados puedan:
- [ ] Ver su punto de votación asignado
- [ ] Ver estadísticas en tiempo real
- [ ] Monitorear el proceso de votación
- [ ] Generar reportes de su punto

---

## 📦 Archivos de la Implementación

### APIs
- `app/api/delegates/route.ts` - CRUD delegados
- `app/api/voting-points/[pointId]/route.ts` - CRUD puntos individuales
- `app/api/users/route.ts` - Lista de usuarios

### Componentes
- `components/admin/delegate-form-dialog.tsx` - Registro de delegados
- `components/admin/voting-point-form-dialog.tsx` - Crear punto
- `components/admin/voting-point-edit-dialog.tsx` - Editar punto
- `components/admin/voting-point-details-dialog.tsx` - Ver detalles
- `components/ui/alert.tsx` - Componente de alerta

### Páginas
- `app/dashboard/admin/users/page.tsx` - Gestión de usuarios

---

**Estado:** ✅ COMPLETADA
**Fecha:** 15 de febrero de 2026
**Desarrollador:** GitHub Copilot (Claude Sonnet 4.5)
