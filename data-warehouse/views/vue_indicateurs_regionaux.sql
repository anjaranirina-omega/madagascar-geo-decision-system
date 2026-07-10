CREATE OR REPLACE VIEW dwh.vue_indicateurs_regionaux AS
SELECT l.region, r.libelle AS type_risque, t.annee, t.mois,
       AVG(f.indice_risque) AS risque_moyen,
       AVG(f.indice_vulnerabilite) AS vulnerabilite_moyenne,
       COUNT(*) FILTER (WHERE f.niveau_alerte = 'CRITIQUE') AS nb_zones_critiques
FROM dwh.fait_vulnerabilite f
JOIN dwh.dim_localisation l ON l.id_localisation = f.id_localisation
JOIN dwh.dim_risque r ON r.id_risque = f.id_risque
JOIN dwh.dim_temps t ON t.id_temps = f.id_temps
GROUP BY l.region, r.libelle, t.annee, t.mois;
