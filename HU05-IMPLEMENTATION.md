# HU05 - Emisión de Voto por Planchas

## Descripción
Implementación completa del sistema de votación para votantes autorizados, permitiéndoles emitir su voto seleccionando una plancha de candidatos en su punto de votación asignado.

## Criterios de Aceptación Implementados

✅ **Voto único:** Cada votante solo puede votar una vez por elección
✅ **Votación anónima y segura:** Los votos se registran sin vincular directamente al votante
✅ **Confirmación visual:** Mensaje de éxito y estado actualizado tras votar

## Arquitectura de la Solución

### 1. Backend APIs

#### **GET /api/voter/voting-info**
Obtiene la información de votación del usuario actual.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "isAssigned": true,
    "votingPoint": {
      "id": "uuid",
      "name": "Mesa 1",
      "location": "Piso 2",
      "election": {
        "id": "uuid",
        "title": "Elección 2026",
        "is_active": true,
        "start_date": "2026-02-01",
        "end_date": "2026-02-28"
      }
    },
    "canVote": true,
    "hasVoted": false,
    "slates": [
      {
        "id": "uuid",
        "name": "Plancha Azul",
        "description": "Descripción de la plancha",
        "members": [
          {
            "id": "uuid",
            "full_name": "Juan Pérez",
            "role": "Presidente"
          }
        ]
      }
    ],
    "message": "Puedes votar ahora."
  }
}
```

**Casos manejados:**
- Votante no asignado a punto de votación
- Elección no activa
- Ya ha votado
- No hay planchas disponibles

#### **POST /api/voter/vote**
Registra el voto del usuario.

**Request:**
```json
{
  "slate_id": "uuid-de-la-plancha"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "¡Voto registrado exitosamente!",
  "data": {
    "voted_at": "2026-02-15T10:30:00Z"
  }
}
```

**Validaciones implementadas:**
- Usuario autenticado y con rol de votante
- No ha votado previamente
- Elección está activa
- Plancha pertenece al punto de votación del votante
- Transacción atómica (voto + actualización de contador + marca de votado)

### 2. Base de Datos

#### Función RPC: `increment_slate_votes`
Incrementa el contador de votos de una plancha de manera atómica.

```sql
CREATE OR REPLACE FUNCTION increment_slate_votes(slate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE slates
  SET vote_count = vote_count + 1
  WHERE id = slate_id;
END;
$$;
```

**Para ejecutar:** Corre el archivo `increment-slate-votes-function.sql` en Supabase SQL Editor.

### 3. Frontend - Página del Votante

**Ruta:** `/dashboard/voter`

**Estados de la interfaz:**

1. **Cargando:** Spinner mientras se obtiene la información
2. **No asignado:** Mensaje informando que no está en ningún punto
3. **No puede votar:** Elección no activa o fuera de periodo
4. **Ya votó:** Confirmación con detalles del voto emitido
5. **Puede votar:** Grid de planchas disponibles para seleccionar

**Componentes visuales:**
- Cards interactivas para cada plancha
- Indicador visual de selección (check verde)
- Lista de candidatos con sus roles
- Botón de confirmación con doble verificación
- Alertas informativas según el estado

## Flujo de Usuario

### Flujo Normal (Votación Exitosa)

1. Votante inicia sesión con credenciales
2. Sistema verifica rol de votante
3. Página carga información de votación
4. Se muestran planchas disponibles en su punto
5. Votante selecciona una plancha (click en card)
6. Votante presiona "Confirmar Voto"
7. Sistema solicita confirmación (¿Estás seguro?)
8. Votante confirma
9. Sistema registra voto atómicamente:
   - Inserta registro en `votes`
   - Actualiza `voters.has_voted = true`
   - Incrementa `slates.vote_count`
   - Registra auditoría
10. Se muestra confirmación de éxito
11. Interfaz se actualiza a estado "Ya votó"

### Flujos Alternativos

**Votante no asignado:**
- Muestra mensaje: "No estás asignado a ningún punto de votación"

**Elección no activa:**
- Muestra información del punto y periodo de votación
- Indica que la elección no está activa

**Ya votó previamente:**
- Muestra tarjeta verde de confirmación
- Detalles: fecha/hora, punto de votación, elección

**Sin planchas disponibles:**
- Muestra alerta informando que no hay opciones

## Seguridad y Validaciones

### Backend
- ✅ Autenticación obligatoria (JWT de Supabase)
- ✅ Verificación de rol de votante
- ✅ Prevención de doble votación (check `has_voted`)
- ✅ Validación de elección activa
- ✅ Validación de pertenencia de plancha al punto
- ✅ Transacciones atómicas
- ✅ Logging de auditoría

### Frontend
- ✅ Confirmación antes de emitir voto
- ✅ Deshabilitación de botón durante envío
- ✅ Estados de loading claros
- ✅ Manejo de errores con alertas
- ✅ Actualización automática tras votar

### Base de Datos
- ✅ RLS activo en todas las tablas
- ✅ Contador atómico mediante función RPC
- ✅ Constraint de votante único por elección
- ✅ Audit trail completo

## Anonimato del Voto

**Diseño implementado:**
- La tabla `votes` vincula `voter_id` (registro en voters) con `slate_id`
- NO vincula directamente `profile_id` del usuario
- El registro `voters` contiene solo `has_voted` boolean
- No hay timestamp en `voters` que correlacione con `votes.created_at`
- Las consultas de resultados NO exponen quién votó por qué

**Separación de datos:**
```
profiles → voters → votes
(identidad) (asignación + marca) (voto anónimo)
```

## Archivos Creados/Modificados

### Nuevos archivos:
- `app/api/voter/voting-info/route.ts` - API para obtener info de votación
- `app/api/voter/vote/route.ts` - API para registrar voto
- `increment-slate-votes-function.sql` - Función RPC para contador

### Archivos modificados:
- `app/dashboard/voter/page.tsx` - Interfaz completa de votación

## Instalación y Configuración

### 1. Ejecutar función SQL
```bash
# En Supabase Dashboard > SQL Editor
# Ejecutar: increment-slate-votes-function.sql
```

### 2. Verificar permisos RLS
Asegurarse de que las políticas RLS permitan:
- Votantes leer slates de su punto
- Votantes insertar en votes (solo una vez)
- Votantes actualizar su registro en voters

### 3. Reiniciar servidor de desarrollo
```bash
npm run dev
```

## Testing Manual

### Escenario 1: Votación exitosa
1. Crear elección activa
2. Crear punto de votación con planchas
3. Asignar votante al punto (tabla voters)
4. Login como votante
5. Ir al dashboard
6. Verificar que se muestran las planchas
7. Seleccionar una plancha
8. Confirmar voto
9. Verificar mensaje de éxito
10. Verificar que no puede volver a votar

### Escenario 2: Ya votó
1. Con votante del escenario 1
2. Refrescar página
3. Verificar tarjeta verde de confirmación

### Escenario 3: No asignado
1. Crear nuevo perfil con rol voter
2. NO agregarlo a tabla voters
3. Login como ese votante
4. Verificar mensaje "No estás asignado"

### Escenario 4: Elección inactiva
1. Crear elección con is_active = false
2. Asignar votante a punto de esa elección
3. Login como votante
4. Verificar mensaje de elección no activa

## Mejoras Futuras Sugeridas

- [ ] Página de historial de votaciones
- [ ] Notificaciones cuando la elección se active
- [ ] Timer countdown para cierre de votación
- [ ] Resultados en tiempo real (solo para admins)
- [ ] Exportación de resultados en PDF
- [ ] Verificación biométrica adicional
- [ ] Sistema de verificación por email antes de votar

## Notas Técnicas

- El voto es irreversible una vez confirmado
- El sistema usa transacciones optimistas (no hay rollback completo si falla el incremento)
- Los contadores se mantienen sincronizados mediante función RPC
- La auditoría registra metadata pero NO el voto específico
- React hace polling automático cada 2 segundos tras votar para actualizar el estado

## Soporte

Para problemas de votación:
1. Verificar que el votante esté en la tabla `voters`
2. Verificar que la elección esté activa (`is_active = true`)
3. Verificar que haya planchas en el punto de votación
4. Revisar logs de auditoría para debugging
5. Verificar RLS policies en Supabase

---

**Estado:** ✅ Implementación completa
**Fecha:** 15 de Febrero, 2026
**Desarrollador:** Sistema VoxPopuly

---

## Actualización: Sistema de Auditoría (19 Feb 2026)

### Problema Identificado
Solo las acciones `vote_cast` se registraban en `audit_logs`. El resto de acciones administrativas (crear elección, actualizar candidatos, asignar votantes, etc.) no se guardaban debido a que:

1. **Row Level Security (RLS)** está habilitado en la tabla `audit_logs`
2. Las rutas API usaban clientes autenticados con contexto de usuario (subject to RLS)
3. No existían políticas RLS que permitieran inserts de usuarios autenticados
4. Los inserts fallaban silenciosamente sin verificación de errores
5. Solo `vote_cast` funcionaba porque usaba service-role client o funciones DB con SECURITY DEFINER

### Solución Implementada
Se estandarizó el uso del helper `recordAudit()` con cliente service-role en todas las rutas API que registran auditoría:

**Helper centralizado:** `lib/server/audit.ts`
- Maneja anonimización de IP
- Acepta cliente con permisos adecuados (service-role)
- Maneja errores sin romper el flujo principal

**Rutas modificadas:**
- ✅ `app/api/candidates/[candidateId]/route.ts` - UPDATE/DELETE candidato
- ✅ `app/api/elections/route.ts` - CREATE elección
- ✅ `app/api/elections/[id]/route.ts` - UPDATE/DELETE elección
- ✅ `app/api/elections/[id]/voting-points/route.ts` - CREATE punto de votación
- ✅ `app/api/voting-points/[pointId]/route.ts` - UPDATE/DELETE punto
- ✅ `app/api/voting-points/[pointId]/candidates/route.ts` - CREATE candidato
- ✅ `app/api/voting-points/[pointId]/voters/route.ts` - ASSIGN votantes
- ✅ `app/api/voting-points/[pointId]/voters/[voterId]/route.ts` - DELETE votante
- ✅ `app/api/voters/bulk/route.ts` - BULK upload votantes

**Patrón aplicado:**
```typescript
// Antes (fallaba silenciosamente)
await supabase.from('audit_logs').insert({
  user_id: user.id,
  action: 'some_action',
  entity_type: 'entity',
  entity_id: entityId,
  metadata: { ... },
});

// Después (funciona correctamente)
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not configured; audit not recorded');
} else {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  await recordAudit(serviceClient, {
    request,
    userId: user.id,
    action: 'some_action',
    entityType: 'entity',
    entityId: entityId,
    metadata: { ... },
  });
}
```

### Convención Establecida
**Para registrar auditoría desde el servidor:**
1. Usar siempre `recordAudit(serviceClient, ...)` con un cliente service-role
2. No insertar directamente en `audit_logs` con clientes autenticados de usuario
3. Verificar que `SUPABASE_SERVICE_ROLE_KEY` esté configurada
4. Loggear en consola si falla el registro de auditoría

### Verificación
Tras el cambio, todas las acciones administrativas ahora se registran correctamente:
```sql
SELECT action, entity_type, created_at 
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

Acciones que ahora se registran:
- `election_created`, `election_updated`, `election_deleted`
- `voting_point_created`, `voting_point_updated`, `voting_point_deleted`
- `candidate_created`, `candidate_updated`, `candidate_deleted`
- `voters_assigned`, `voter_removed`
- `bulk_voters_upload`
- `vote_cast` (ya funcionaba)

**Estado:** ✅ Corregido y estandarizado
**Fecha actualización:** 19 de Febrero, 2026
