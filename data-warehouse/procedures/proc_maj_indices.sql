CREATE OR REPLACE PROCEDURE dwh.proc_maj_indices()
LANGUAGE plpgsql
AS $$
BEGIN
  -- TODO: recalculer/aggréger les indices à partir de l'OLTP et des résultats AHP.
  RAISE NOTICE 'proc_maj_indices à implémenter';
END;
$$;
