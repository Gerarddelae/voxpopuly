# HU03 – Gestión de candidatos y planchas

## 📋 Historia de Usuario

**Rol:** Super Admin

**Descripción:** Como Super Admin, quiero agregar candidatos organizados en planchas para cada punto de votación para permitir que los votantes seleccionen un equipo completo de su preferencia.

**Prioridad:** Alta

---

## ✅ Criterios de Aceptación

### 1. ✅ Se pueden crear varias planchas por punto de votación
- **Implementado:** Sí
- **Ubicación:**
  - API: `POST /api/voting-points/[pointId]/slates`
  - Componente: `SlateFormDialog`
  - Integración: Botón "Agregar plancha" en `VotingPointDetailsDialog`
- **Funcionalidad:**
  - Formulario para crear plancha con nombre y descripción
  - Permite agregar candidatos dinámicamente
  - Validación de datos antes de guardar
  - Asociación automática al punto de votación

### 2. ✅ Cada plancha incluye el equipo completo de candidatos
- **Implementado:** Sí
- **Estructura:**
  - Tabla `slates`: Información de la plancha
  - Tabla `slate_members`: Candidatos de cada plancha
  - Relación uno-a-muchos (una plancha puede tener múltiples candidatos)
- **Campos de candidato:**
  - `full_name`: Nombre completo del candidato (requerido)
  - `role`: Cargo o posición en la plancha (opcional)
- **Interfaz:**
  - Agregar/eliminar candidatos dinámicamente
  - Vista de todos los candidatos en cada plancha

### 3. ✅ Se pueden editar o eliminar planchas antes del inicio de la votación
- **Implementado:** Sí
- **Operaciones disponibles:**
  - **Editar:** 
    - API: `PUT /api/slates/[slateId]`
    - Componente: `SlateEditDialog`
    - Permite modificar nombre, descripción y lista completa de candidatos
  - **Eliminar:** 
    - API: `DELETE /api/slates/[slateId]`
    - Confirmación antes de eliminar
    - Eliminación en cascada de candidatos asociados
- **Restricción:** 
  - No se permite editar/eliminar después de que comience la elección
  - Validación en API y frontend

### 4. ✅ Cada plancha está asociada al punto correcto
- **Implementado:** Sí
- **Validación:**
  - Clave foránea `voting_point_id` en tabla `slates`
  - Constraint `unique_slate_per_point` evita nombres duplicados por punto
  - Verificación en API antes de operaciones
- **Visualización:**
  - Planchas mostradas dentro de su punto de votación
  - Organización jerárquica: Elección → Puntos de votación → Planchas → Candidatos

---

## 🏗️ Implementación Técnica

### Estructura de Base de Datos

```sql
-- Tabla de planchas
CREATE TABLE slates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voting_point_id UUID NOT NULL REFERENCES voting_points(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_slate_per_point UNIQUE (voting_point_id, name)
);

-- Tabla de candidatos/miembros de plancha
CREATE TABLE slate_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slate_id UUID REFERENCES slates(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### API Routes

#### 1. `/api/voting-points/[pointId]/slates/route.ts`

**POST - Crear plancha**
```typescript
Endpoint: POST /api/voting-points/{pointId}/slates
Body: {
  name: string (requerido)
  description?: string
  members?: Array<{
    full_name: string
    role?: string
  }>
}
Response: {
  success: boolean
  data: Slate (con miembros incluidos)
  message: string
}
```

**GET - Listar planchas de un punto**
```typescript
Endpoint: GET /api/voting-points/{pointId}/slates
Response: {
  success: boolean
  data: Slate[] (con miembros incluidos)
}
```

#### 2. `/api/slates/[slateId]/route.ts` ✨ NUEVO

**GET - Obtener plancha específica**
```typescript
Endpoint: GET /api/slates/{slateId}
Response: {
  success: boolean
  data: Slate (con miembros y relaciones)
}
```

**PUT - Actualizar plancha**
```typescript
Endpoint: PUT /api/slates/{slateId}
Body: {
  name: string (requerido)
  description?: string
  members?: Array<{
    full_name: string
    role?: string
  }>
}
Validaciones:
- Usuario autenticado y con rol admin
- Plancha existe
- Elección no ha iniciado
Response: {
  success: boolean
  data: Slate (actualizada con miembros)
  message: string
}
```

**DELETE - Eliminar plancha**
```typescript
Endpoint: DELETE /api/slates/{slateId}
Validaciones:
- Usuario autenticado y con rol admin
- Plancha existe
- Elección no ha iniciado
Response: {
  success: boolean
  message: string
}
```

### Componentes UI

#### 1. `SlateFormDialog` (Existente - Mejorado)

**Ubicación:** `components/admin/slate-form-dialog.tsx`

**Características:**
- Formulario modal para crear nueva plancha
- Campos: nombre (requerido), descripción (opcional)
- Sección dinámica de candidatos:
  - Agregar/eliminar candidatos
  - Campos por candidato: nombre completo, cargo
  - Mínimo 1 candidato (se puede dejar vacío)
- Validación de formulario
- Indicador de carga durante creación

**Props:**
```typescript
interface SlateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  votingPointId: string
  onSuccess: () => void
}
```

#### 2. `SlateEditDialog` ✨ NUEVO

**Ubicación:** `components/admin/slate-edit-dialog.tsx`

**Características:**
- Formulario modal para editar plancha existente
- Pre-carga datos actuales de la plancha y candidatos
- Misma estructura que SlateFormDialog pero para edición
- Actualización completa: reemplaza candidatos existentes
- Validación de formulario
- Indicador de carga durante actualización

**Props:**
```typescript
interface SlateEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slate: SlateWithDetails | null
  onSuccess: () => void
}
```

**Flujo de uso:**
1. Se carga con datos de plancha seleccionada
2. Usuario modifica nombre, descripción o candidatos
3. Al guardar, actualiza la plancha y sus candidatos
4. Refresca vista del punto de votación

#### 3. `VotingPointDetailsDialog` (Actualizado)

**Ubicación:** `components/admin/voting-point-details-dialog.tsx`

**Mejoras implementadas:**
- ✨ Importa `SlateEditDialog`
- ✨ Estado para plancha seleccionada
- ✨ Función `handleEditSlate`: Abre diálogo de edición
- ✨ Función `handleDeleteSlate`: Elimina plancha con confirmación
- ✨ Botones de editar/eliminar en cada plancha:
  - Icono de editar (lápiz)
  - Icono de eliminar (papelera)
  - Tooltips descriptivos
- Diseño mejorado: Badge de votos + botones de acción

**Vista de planchas:**
```
┌─────────────────────────────────────────────┐
│ [Nombre de la plancha]    [X votos] 🖊️ 🗑️ │
│ Descripción de la plancha                   │
├─────────────────────────────────────────────┤
│ Candidatos:                                 │
│  • Nombre Candidato 1        Presidente     │
│  • Nombre Candidato 2        Vicepresidente │
│  • Nombre Candidato 3        Secretario     │
└─────────────────────────────────────────────┘
```

---

## 📁 Archivos Modificados/Creados

### Nuevos archivos
- ✨ `app/api/slates/[slateId]/route.ts` - API para operaciones individuales
- ✨ `components/admin/slate-edit-dialog.tsx` - Componente de edición

### Archivos existentes actualizados
- ✅ `components/admin/voting-point-details-dialog.tsx` - Agregados botones editar/eliminar

### Archivos existentes sin cambios (ya implementados)
- `app/api/voting-points/[pointId]/slates/route.ts` - Crear y listar planchas
- `components/admin/slate-form-dialog.tsx` - Crear planchas
- `lib/types/database.types.ts` - Tipos TypeScript
- `schema.txt` - Esquema de base de datos

---

## 🔒 Seguridad y Validaciones

### Autenticación y Autorización
- ✅ Todas las operaciones requieren autenticación
- ✅ Solo usuarios con rol `admin` pueden crear/editar/eliminar planchas
- ✅ Verificación de permisos en cada endpoint

### Validaciones de Negocio
- ✅ No se puede editar/eliminar plancha después de inicio de elección
- ✅ Validación de que el voting point existe antes de crear plancha
- ✅ Validación de nombre único por punto de votación
- ✅ Validación de datos requeridos (nombre de plancha y candidatos)

### Integridad de Datos
- ✅ Eliminación en cascada: al eliminar plancha se eliminan sus candidatos
- ✅ Constraint de unicidad: `unique_slate_per_point`
- ✅ Foreign keys: relaciones bien definidas

### Auditoría
- ✅ Registro de todas las operaciones en `audit_logs`:
  - `slate_created`
  - `slate_updated`
  - `slate_deleted`
- ✅ Metadatos incluyen: nombre de plancha, voting_point_id

---

## 🎯 Flujo de Uso Completo

### Crear Planchas

1. **Admin accede a vista de elección**
   - Desde dashboard admin
   - Selecciona elección activa

2. **Navega a punto de votación**
   - Click en punto de votación
   - Se abre `VotingPointDetailsDialog`

3. **Crea nueva plancha**
   - Click en "Agregar plancha"
   - Se abre `SlateFormDialog`
   - Ingresa nombre y descripción
   - Agrega candidatos (nombre y cargo)
   - Puede agregar/eliminar candidatos dinámicamente
   - Click en "Crear plancha"
   - Confirmación y actualización automática

### Editar Planchas

1. **Admin visualiza planchas existentes**
   - En `VotingPointDetailsDialog`
   - Lista de planchas con candidatos

2. **Selecciona plancha a editar**
   - Click en icono de editar (lápiz)
   - Se abre `SlateEditDialog`
   - Formulario pre-cargado con datos actuales

3. **Modifica información**
   - Cambia nombre/descripción
   - Modifica candidatos existentes
   - Agrega nuevos candidatos
   - Elimina candidatos no deseados
   - Click en "Guardar cambios"
   - Confirmación y actualización

### Eliminar Planchas

1. **Admin visualiza plancha a eliminar**
   - En `VotingPointDetailsDialog`

2. **Elimina plancha**
   - Click en icono de eliminar (papelera)
   - Confirmación: "¿Estás seguro de eliminar...?"
   - Si confirma: eliminación exitosa
   - Actualización automática de vista

---

## ✅ Notas de Implementación

### Características Especiales

1. **Votación por plancha completa**
   - El sistema está diseñado para votar por planchas, no candidatos individuales
   - Cada voto se registra para toda la plancha
   - Los candidatos son informativos, no votables individualmente

2. **Actualización optimista**
   - Después de crear/editar/eliminar, se refresca automáticamente
   - Estrategia: cerrar y reabrir diálogo (fuerza re-fetch)

3. **UX mejorada**
   - Íconos intuitivos para acciones
   - Tooltips descriptivos
   - Confirmaciones antes de eliminar
   - Mensajes de error claros
   - Indicadores de carga

4. **Escalabilidad**
   - Sin límite de candidatos por plancha
   - Agregar/eliminar dinámicamente
   - Scroll en diálogos para contenido extenso

### Restricciones de Negocio

- ✅ Solo se pueden modificar planchas antes del inicio de la elección
- ✅ Nombres de planchas deben ser únicos por punto de votación
- ✅ Al menos el nombre de la plancha es requerido
- ✅ Candidatos pueden tener o no cargo especificado

---

## 🧪 Testing Manual

### Escenarios de Prueba

1. **Crear plancha sin candidatos** ✅
   - Crear plancha solo con nombre
   - Verificar que se guarde correctamente

2. **Crear plancha con múltiples candidatos** ✅
   - Agregar 5+ candidatos
   - Algunos con cargo, otros sin cargo
   - Verificar todos se guarden

3. **Editar plancha existente** ✅
   - Modificar nombre y descripción
   - Agregar nuevos candidatos
   - Eliminar candidatos existentes
   - Verificar cambios se reflejen

4. **Eliminar plancha** ✅
   - Eliminar plancha con candidatos
   - Verificar eliminación en cascada
   - Verificar ya no aparece en lista

5. **Validaciones** ✅
   - Intentar editar después de inicio de elección → Error
   - Intentar crear plancha con nombre duplicado → Error
   - Intentar acceso sin permisos → Error 403

6. **Nombres duplicados** ✅
   - Intentar crear dos planchas con mismo nombre en mismo punto
   - Verificar error de constraint

---

## 📊 Estado de Implementación

| Criterio de Aceptación | Estado | Completitud |
|------------------------|--------|-------------|
| Crear varias planchas por punto | ✅ | 100% |
| Cada plancha incluye equipo completo | ✅ | 100% |
| Editar/eliminar antes de votación | ✅ | 100% |
| Asociación correcta al punto | ✅ | 100% |

**Estado General: ✅ COMPLETADO AL 100%**

---

## 🚀 Próximos Pasos

La HU03 está completamente implementada. Las siguientes historias de usuario podrían ser:

- **HU04**: Gestión de votantes y registro
- **HU05**: Proceso de votación
- **HU06**: Dashboard de delegado y estadísticas
- **HU07**: Reportes y resultados finales

---

## 📝 Conclusión

La implementación de la HU03 proporciona una gestión completa de planchas y candidatos:

✅ **CRUD completo**: Crear, leer, actualizar y eliminar planchas  
✅ **Interfaz intuitiva**: Diálogos modales con UX optimizada  
✅ **Validaciones robustas**: Seguridad y restricciones de negocio  
✅ **Auditoría**: Registro de todas las operaciones  
✅ **Escalable**: Soporta múltiples planchas y candidatos sin límites  

El sistema está listo para que los Super Admins gestionen las planchas de cada punto de votación de manera eficiente y segura.
