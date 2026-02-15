# Guía Rápida: Asignar Votante a Punto de Votación

## El problema
El votante no puede ver su punto de votación ni votar porque:
1. No está asignado en la tabla `voters`, O
2. La elección no está activa (`is_active = false`), O
3. **Faltan políticas RLS** para que votantes puedan leer `voting_points` y `elections`

## Solución (como Administrador)

### Opción 1: Desde la interfaz web (RECOMENDADO)

1. **Login como admin** en http://localhost:3000

2. **Ir a "Puntos de Votación"** en el menú lateral

3. **Hacer clic en el punto de votación** donde quieres asignar al votante

4. **Ir a la pestaña "Votantes"**

5. **Hacer clic en "Asignar votantes"**

6. **Buscar y seleccionar el votante** por nombre o documento

7. **Hacer clic en "Asignar"**

8. **Verificar que la elección esté activa:**
   - Ir a "Elections" en el menú
   - Verificar que el badge diga "Activa" (no "Inactiva")
   - Si está inactiva, hacer clic en la elección y marcarla como activa

### Opción 2: Desde Supabase SQL Editor

Si prefieres hacerlo directamente en la base de datos:

```sql
-- 1. Ver votantes disponibles
SELECT id, full_name, email, document
FROM profiles
WHERE role = 'voter';

-- 2. Ver puntos de votación disponibles
SELECT vp.id, vp.name, e.title as election
FROM voting_points vp
JOIN elections e ON e.id = vp.election_id;

-- 3. Asignar votante a punto (REEMPLAZA los IDs)
INSERT INTO voters (profile_id, voting_point_id, has_voted)
VALUES (
  'PROFILE-ID-DEL-VOTANTE',     -- ID del paso 1
  'VOTING-POINT-ID',            -- ID del paso 2
  false
)
ON CONFLICT DO NOTHING;

-- 4. Activar la elección
UPDATE elections
SET is_active = true
WHERE id = 'ELECTION-ID';

-- 5. Verificar asignación
SELECT 
  p.full_name as votante,
  vp.name as punto,
  e.title as eleccion,
  e.is_active as activa,
  v.has_voted as ya_voto
FROM voters v
JOIN profiles p ON p.id = v.profile_id
JOIN voting_points vp ON vp.id = v.voting_point_id
JOIN elections e ON e.id = vp.election_id;
```

---

## ⚠️ IMPORTANTE: Políticas RLS para Votantes

Si el votante **SÍ está asignado** pero **NO ve el nombre del punto ni las fechas** (aparecen vacías):

### Síntoma
```
Punto de votación: (vacío)
Periodo: N/A - N/A
Planchas disponibles: 1  ← La plancha SÍ aparece
```

### Causa
Faltan políticas RLS en `voting_points` y `elections` para que votantes puedan leerlas.

### Solución
Ejecutar **fix-voter-rls-policies.sql** en Supabase SQL Editor:

```bash
# El archivo contiene las políticas necesarias
fix-voter-rls-policies.sql
```

Esto creará:
- ✅ Política para que votantes vean su `voting_point` asignado
- ✅ Política para que votantes vean la `election` correspondiente

### Verificar que funcionó
Después de ejecutar el SQL, refresca la página del votante y deberías ver:
- ✅ Nombre del punto de votación
- ✅ Fechas de inicio y fin de la elección
- ✅ Título de la elección

---

## Verificación

Después de asignar el votante:

1. **Logout y login nuevamente** como votante

2. **Ir al dashboard del votante** (se carga automáticamente)

3. **Deberías ver:**
   - Nombre del punto de votación
   - Periodo de la elección
   - Planchas disponibles para votar

## Troubleshooting

### "Punto de votación:" aparece vacío (pero SÍ veo planchas)
**Problema:** Faltan políticas RLS
- ✅ Ejecuta `fix-voter-rls-policies.sql` en Supabase
- ✅ Refresca la página del votante
- ✅ Ahora deberías ver el nombre del punto y las fechas

### "No estás asignado a ningún punto de votación"
- ✅ Ejecuta el paso 3 del SQL (INSERT INTO voters)
- ✅ Verifica con el paso 5 (SELECT query)

### "La elección no está activa en este momento"
- ✅ Ejecuta el paso 4 del SQL (UPDATE elections)
- ✅ Verifica que `is_active = true`

### "No hay planchas disponibles"
- ✅ Como admin, ve al punto de votación
- ✅ Pestaña "Planchas" → Crear al menos una plancha
- ✅ Agregar candidatos a la plancha

### Fechas aparecen como "Invalid Date"
- ✅ Verifica que la elección tenga fechas válidas:
  ```sql
  UPDATE elections
  SET 
    start_date = '2026-02-01',
    end_date = '2026-02-28'
  WHERE id = 'ELECTION-ID';
  ```

## Flujo completo para testing

```sql
-- Script completo para setup rápido de prueba

-- 1. Activar elección
UPDATE elections
SET is_active = true
WHERE title = 'TU-ELECCION';  -- Reemplaza con el título de tu elección

-- 2. Asignar votante
INSERT INTO voters (profile_id, voting_point_id, has_voted)
SELECT 
  p.id,
  vp.id,
  false
FROM profiles p
CROSS JOIN voting_points vp
WHERE p.email = 'votante@example.com'  -- Reemplaza con el email del votante
AND vp.name = 'Mesa 1'                 -- Reemplaza con el nombre del punto
LIMIT 1
ON CONFLICT DO NOTHING;

-- 3. Verificar
SELECT 
  p.email as votante_email,
  vp.name as punto,
  e.title as eleccion,
  e.is_active,
  (SELECT COUNT(*) FROM slates WHERE voting_point_id = vp.id) as planchas
FROM voters v
JOIN profiles p ON p.id = v.profile_id
JOIN voting_points vp ON vp.id = v.voting_point_id
JOIN elections e ON e.id = vp.election_id
WHERE p.email = 'votante@example.com';
```

---

**Nota:** Usa la Opción 1 (interfaz web) si HU04 está implementada correctamente.
