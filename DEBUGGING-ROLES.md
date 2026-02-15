# Cómo verificar y arreglar el problema de roles

## Paso 1: Verificar los logs

Ejecuta la aplicación:
```bash
npm run dev
```

Inicia sesión con el usuario delegado y observa:

### En la consola del navegador (DevTools):
- Busca logs que digan `[Login] Role data received:`
- Verifica qué rol se está recibiendo

### En la terminal del servidor Node:
- Busca logs que digan `[API /auth/role]`
- Verifica el `User ID` y el `Profile error` si hay alguno

## Paso 2: Soluciones rápidas (elige una)

### Opción A: Agregar rol en user_metadata (MÁS RÁPIDA) ⭐

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Users**
4. Busca y haz click en el usuario delegado
5. En la sección **User Metadata**, edita el JSON y agrega:
   ```json
   {
     "role": "delegate"
   }
   ```
6. Guarda y vuelve a hacer login

### Opción B: Arreglar las políticas RLS

1. Ve a **SQL Editor** en Supabase
2. Copia y pega el contenido de `fix-rls-policies.sql`
3. Ejecuta el script
4. Verifica que el usuario tenga un registro en `profiles`:
   ```sql
   SELECT id, role, email FROM profiles 
   JOIN auth.users ON auth.users.id = profiles.id;
   ```

### Opción C: Crear el perfil si no existe

Si el usuario NO tiene registro en `profiles`, créalo:

```sql
-- Primero obtén el UUID del usuario
SELECT id, email FROM auth.users WHERE email = 'tu-email@ejemplo.com';

-- Luego crea el perfil (reemplaza el UUID)
INSERT INTO profiles (id, document, full_name, role)
VALUES (
  'uuid-del-usuario-aqui',
  'doc123',
  'Nombre del Delegado',
  'delegate'
);
```

## Paso 3: Limpiar logs de debug

Una vez que funcione, elimina los logs temporales en:
- `components/login-form.tsx` (remove console.log y el setError temporal)
- `app/api/auth/role/route.ts` (remove console.log statements)

## Verificación final

Haz login con cada tipo de usuario y verifica que redirija a:
- **Admin** → `/dashboard/admin`
- **Delegate** → `/dashboard/delegate`
- **Voter** → `/dashboard/voter`

Si intentas acceder a un dashboard que no corresponde a tu rol, deberías ser redirigido automáticamente al correcto.
