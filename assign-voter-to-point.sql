-- Script para asignar votante a punto de votación
-- Ejecutar en Supabase SQL Editor

-- 1. Primero, verifica qué puntos de votación existen
SELECT 
  vp.id,
  vp.name,
  vp.location,
  e.title as election_title,
  e.is_active
FROM voting_points vp
JOIN elections e ON e.id = vp.election_id
ORDER BY e.title, vp.name;

-- 2. Verifica qué perfiles tienen rol 'voter'
SELECT 
  id,
  full_name,
  email,
  document,
  role
FROM profiles
WHERE role = 'voter';

-- 3. Asignar un votante a un punto de votación
-- REEMPLAZA estos valores con los IDs reales de tu base de datos:
INSERT INTO voters (profile_id, voting_point_id, has_voted)
VALUES (
  'TU-PROFILE-ID-DEL-VOTANTE',  -- ID del perfil con rol 'voter'
  'TU-VOTING-POINT-ID',         -- ID del punto de votación
  false                          -- No ha votado aún
)
ON CONFLICT (profile_id, voting_point_id) DO NOTHING;

-- 4. Activar la elección (si no está activa)
UPDATE elections
SET is_active = true
WHERE id = 'TU-ELECTION-ID';

-- 5. Verificar que el votante quedó asignado correctamente
SELECT 
  v.id,
  p.full_name,
  p.email,
  vp.name as voting_point,
  e.title as election,
  e.is_active,
  v.has_voted
FROM voters v
JOIN profiles p ON p.id = v.profile_id
JOIN voting_points vp ON vp.id = v.voting_point_id
JOIN elections e ON e.id = vp.election_id
WHERE p.role = 'voter';
