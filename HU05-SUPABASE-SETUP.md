# Configuración necesaria en Supabase para HU05

## 1. Ejecutar la función RPC

En Supabase Dashboard > SQL Editor, ejecuta este script:

```sql
-- Función para incrementar el contador de votos de una plancha de manera atómica
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

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION increment_slate_votes(uuid) TO authenticated;
```

## 2. Verificar políticas RLS para la tabla `votes`

Asegúrate de que existan estas políticas:

### INSERT - Permitir a votantes crear votos
```sql
CREATE POLICY "Voters can insert their own votes"
ON votes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM voters
    WHERE voters.id = votes.voter_id
    AND voters.profile_id = auth.uid()
    AND voters.has_voted = false
  )
);
```

### SELECT - Solo admins pueden ver votos individuales
```sql
CREATE POLICY "Only admins can view votes"
ON votes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

## 3. Políticas RLS para la tabla `slates`

### SELECT - Votantes pueden ver planchas de su punto
```sql
CREATE POLICY "Voters can view slates from their voting point"
ON slates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM voters
    WHERE voters.profile_id = auth.uid()
    AND voters.voting_point_id = slates.voting_point_id
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'delegate')
  )
);
```

## 4. Políticas RLS para la tabla `voters`

### SELECT - Usuarios pueden ver su propio registro
```sql
CREATE POLICY "Users can view their own voter record"
ON voters FOR SELECT
TO authenticated
USING (
  voters.profile_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### UPDATE - Usuarios pueden actualizar su marca de votado
```sql
CREATE POLICY "Users can update their own voter record"
ON voters FOR UPDATE
TO authenticated
USING (voters.profile_id = auth.uid())
WITH CHECK (voters.profile_id = auth.uid());
```

## 5. Verificación final

Ejecuta este query para verificar que todo está bien configurado:

```sql
-- Ver políticas de votes
SELECT * FROM pg_policies WHERE tablename = 'votes';

-- Ver políticas de slates
SELECT * FROM pg_policies WHERE tablename = 'slates';

-- Ver políticas de voters
SELECT * FROM pg_policies WHERE tablename = 'voters';

-- Verificar que la función existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'increment_slate_votes';
```

## 6. Datos de prueba

Para testing, asegúrate de tener:

```sql
-- 1. Una elección activa
UPDATE elections SET is_active = true WHERE id = 'tu-eleccion-id';

-- 2. Un votante asignado a un punto (ejemplo)
INSERT INTO voters (profile_id, voting_point_id, has_voted)
VALUES ('profile-id-del-votante', 'voting-point-id', false);

-- 3. Al menos una plancha en ese punto
-- (Esto se hace desde la interfaz de admin)
```

---

**Importante:** Ejecuta estos scripts en orden y verifica cada paso antes de continuar.
