import { AdemeApiResponse, DpeResult } from './types';

const BASE_API_URL = "https://data.ademe.fr/data-fair/api/v1/datasets";

export const fetchDpeByCommune = async (commune: string, size: number = 2000, datasetId: string = "dpe03existant"): Promise<AdemeApiResponse> => {
  const sortField = "-date_etablissement_dpe";
  const isAudun = ["audun-le-tiche", "aumetz", "ottange", "russange", "redange"].includes(commune.toLowerCase());
  const deptFilter = isAudun ? "57*" : "54*";

  const queryFilter = `nom_commune_ban:"${commune}" AND code_postal_ban:${deptFilter}`;

  const params = new URLSearchParams({
    size: size.toString(),
    sort: sortField,
    qs: queryFilter
  });

  try {
    const response = await fetch(`${BASE_API_URL}/${datasetId}/lines?${params.toString()}`);
    if (!response.ok) throw new Error(`Erreur API ADEME (${response.status})`);
    
    const data = await response.json();
    const results = (data.results || []).map((item: any): DpeResult => {
      const id = String(item.n_dpe || item.identifiant_dpe || Math.random().toString(36));
      
      let etiquette = String(item.etiquette_dpe || 'N/A').toUpperCase().trim();
      if (etiquette.length > 1) etiquette = etiquette.charAt(0);
      
      let ges = String(item.etiquette_ges || 'N/A').toUpperCase().trim();
      if (ges.length > 1) ges = ges.charAt(0);

      return {
        _id: id,
        n_dpe: id,
        date_etablissement_dpe: String(item.date_etablissement_dpe || ''),
        etiquette_dpe: etiquette,
        etiquette_ges: ges,
        conso_5_usages_m2_an: Number(item.conso_kwhe_m2_an || 0),
        emission_ges_5_usages_m2_an: Number(item.emission_ges_kg_co2_m2_an || 0),
        adresse_brut: String(item.adresse_ban || item.adresse_brute || 'Adresse NC'),
        commune_brut: String(item.nom_commune_ban || commune),
        code_postal: String(item.code_postal_ban || ''),
        annee_construction: String(item.annee_construction || 'N/A'),
        surface_habitable: Number(item.surface_habitable_logement || item.surface_habitable || 0),
        cout_total_5_usages: Number(item.cout_total_5_usages || 0),
        type_batiment: String(item.type_batiment || 'Non spécifié'),
        type_chauffage: String(item.type_generateur_chauffage_principal || 'Inconnu'),
        latitude: item.latitude || item.lat_ban,
        longitude: item.longitude || item.lon_ban,
        ubat: Number(item.ubat_w_par_m2_k || 0)
      };
    });

    return { total: data.total || 0, results };
  } catch (error: any) {
    console.error("Erreur ADEME Service:", error);
    return { total: 0, results: [] };
  }
};

export const fetchAllCommunes = async (communes: string[], datasetId: string, onProgress?: (count: number, total: number) => void): Promise<DpeResult[]> => {
  const allResults: DpeResult[] = [];
  for (let i = 0; i < communes.length; i++) {
    try {
      await new Promise(r => setTimeout(r, 100));
      const res = await fetchDpeByCommune(communes[i], 1000, datasetId);
      allResults.push(...res.results);
    } catch (e) {}
    if (onProgress) onProgress(i + 1, communes.length);
  }
  return allResults;
};

export const downloadAsCsv = (data: DpeResult[], filename: string) => {
  const headers = ["ID_DPE", "Date", "Commune", "Adresse", "Type", "Chauffage", "DPE", "Surface", "Construction", "Ubat"];
  const rows = [headers.join(";"), ...data.map(r => [r.n_dpe, r.date_etablissement_dpe, r.commune_brut, r.adresse_brut, r.type_batiment, r.type_chauffage, r.etiquette_dpe, r.surface_habitable, r.annee_construction, r.ubat].join(";"))];
  const blob = new Blob(["\ufeff" + rows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};
