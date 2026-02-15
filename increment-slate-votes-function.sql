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
