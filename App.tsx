import React, { useState, useEffect, useMemo } from 'react';
import { COMMUNES_40, DATASETS } from './constants';
import { fetchDpeByCommune, fetchAllCommunes, downloadAsCsv } from './services/ademeService';
import { DpeResult, FetchStatus } from './types';
import { DpeCharts } from './components/DpeCharts';
import { 
  Download, 
  Loader2, 
  MapPin, 
  Database,
  LayoutDashboard,
  Globe,
  Calendar,
  Home,
  Filter,
  CheckCircle
} from 'lucide-react';

const COLORS: Record<string, string> = {
  'A': 'bg-green-500',
  'B': 'bg-lime-500',
  'C': 'bg-yellow-500',
  'D': 'bg-orange-500',
  'E': 'bg-red-500',
  'F': 'bg-red-700',
  'G': 'bg-red-900',
};

// Mise à jour de l'année de départ à 2026
const YEARS = ["Toutes", ...Array.from({ length: 16 }, (_, i) => (2026 - i).toString())];

const App: React.FC = () => {
  const [selectedCommune, setSelectedCommune] = useState<string>(COMMUNES_40[0]);
  const [datasetId, setDatasetId] = useState<string>(DATASETS[0].id);
  const [selectedYear, setSelectedYear] = useState<string>("Toutes");
  const [rawData, setRawData] = useState<DpeResult[]>([]);
  const [status, setStatus] = useState<FetchStatus>(FetchStatus.IDLE);
  const [lastExported, setLastExported] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [isGlobalExporting, setIsGlobalExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{current: number, total: number}>({ current: 0, total: 0 });

  useEffect(() => {
    handleFetch(selectedCommune, datasetId);
  }, [selectedCommune, datasetId]);

  const handleFetch = async (commune: string, dsId: string) => {
    setStatus(FetchStatus.LOADING);
    try {
      const response = await fetchDpeByCommune(commune, 2000, dsId); 
      setRawData(response.results);
      setTotalRecords(response.total);
      setStatus(FetchStatus.SUCCESS);
    } catch (err: any) {
      setStatus(FetchStatus.ERROR);
    }
  };

  const filteredData = useMemo(() => {
    if (selectedYear === "Toutes") return rawData;
    return rawData.filter(item => {
      if (!item.date_etablissement_dpe) return false;
      return item.date_etablissement_dpe.startsWith(selectedYear);
    });
  }, [rawData, selectedYear]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const validConso = filteredData.filter(d => d.conso_5_usages_m2_an > 0);
    const avgConso = validConso.length > 0 
      ? validConso.reduce((acc, curr) => acc + curr.conso_5_usages_m2_an, 0) / validConso.length 
      : 0;
    const passoires = filteredData.filter(d => ['F', 'G'].includes(d.etiquette_dpe)).length;
    return { 
      avgConso: Math.round(avgConso), 
      passoires, 
      percentPassoires: Math.round((passoires / filteredData.length) * 100) 
    };
  }, [filteredData]);

  const handleDownload = (data: DpeResult[], name: string) => {
    downloadAsCsv(data, name);
    setLastExported(name);
    setTimeout(() => setLastExported(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 font-sans">
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white pb-24 pt-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <nav className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-lg">
                <Globe size={24} />
              </div>
              <span className="text-2xl font-bold tracking-tight italic">DPE<span className="text-emerald-400">Hub</span></span>
            </div>
            <div className="flex items-center gap-4">
              {lastExported && (
                <div className="bg-emerald-500/20 border border-emerald-500/50 px-4 py-2 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Téléchargement lancé</span>
                </div>
              )}
              <button 
                onClick={() => handleDownload(filteredData, `dpe_${selectedCommune}_${selectedYear}_2026.csv`)} 
                className="bg-emerald-500 hover:bg-emerald-600 px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95"
              >
                <Download size={16} /> Exporter (.csv)
              </button>
            </div>
          </nav>
          <div className="max-w-3xl">
            <h1 className="text-5xl font-extrabold mb-6 leading-[1.1]">Prospection <span className="text-emerald-400">DPE 2026</span></h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">Accès aux dernières mises à jour de l'ADEME. Données triées par date d'établissement.</p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 -mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100 sticky top-6">
              <div className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><MapPin size={16} /> Sélection Ville</h2>
                <select value={selectedCommune} onChange={(e) => setSelectedCommune(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer">
                  {COMMUNES_40.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><Filter size={16} /> Année du diagnostic</h2>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full p-4 bg-emerald-50 border-emerald-100 rounded-xl text-emerald-800 font-bold focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer">
                  {YEARS.map(y => <option key={y} value={y}>{y === "Toutes" ? "Historique (Tous)" : y}</option>)}
                </select>
              </div>
              <div className="mb-8">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><Database size={16} /> Base ADEME</h2>
                <div className="space-y-2">
                  {DATASETS.map(ds => (
                    <button key={ds.id} onClick={() => setDatasetId(ds.id)} className={`w-full p-3 rounded-lg text-left text-xs transition-all border ${datasetId === ds.id ? 'bg-slate-100 border-slate-300 text-slate-900 font-bold' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}>{ds.name}</button>
                  ))}
                </div>
              </div>
              <button 
                onClick={async () => { 
                  setIsGlobalExporting(true); 
                  const results = await fetchAllCommunes(COMMUNES_40, datasetId, (c, t) => setExportProgress({current: c, total: t})); 
                  handleDownload(results, "Export_Global_Complet_2026.csv"); 
                  setIsGlobalExporting(false); 
                }} 
                disabled={isGlobalExporting} 
                className="w-full bg-slate-900 hover:bg-black text-white p-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-md"
              >
                {isGlobalExporting ? <Loader2 className="animate-spin" /> : <Download size={18} />}
                {isGlobalExporting ? `Récupération ${exportProgress.current}/${exportProgress.total}` : "Export Global (40 communes)"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8 pb-20">
            {status === FetchStatus.SUCCESS && stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1 italic">Conso Moyenne</p>
                  <p className="text-3xl font-black text-slate-800">{stats.avgConso} <span className="text-sm font-normal text-slate-400">kWh/m²</span></p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1 italic">Passoires F/G</p>
                  <p className="text-3xl font-black text-rose-500">{stats.passoires}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1 italic">Incidence thermique</p>
                  <p className="text-3xl font-black text-slate-800">{stats.percentPassoires}%</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><LayoutDashboard size={18} /> Statut Énergétique Global</h3>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold uppercase tracking-widest">{filteredData.length} Dossiers</span>
              </div>
              {status === FetchStatus.LOADING ? <div className="h-48 flex flex-col items-center justify-center text-slate-400 italic"><Loader2 className="animate-spin mb-4" /> Chargement des graphiques...</div> : <DpeCharts data={filteredData} />}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><Home size={18} className="text-emerald-500" /> Liste des diagnostics les plus récents</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase">
                      <th className="p-4">Adresse</th>
                      <th className="p-4">Date de DPE</th>
                      <th className="p-4 text-center">DPE</th>
                      <th className="p-4 text-right">Surface</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {status === FetchStatus.LOADING ? (
                      <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic font-medium">Récupération des données ADEME 2026...</td></tr>
                    ) : filteredData.length === 0 ? (
                      <tr><td colSpan={4} className="p-12 text-center text-slate-400">Aucun résultat trouvé pour cette sélection.</td></tr>
                    ) : (
                      filteredData.slice(0, 500).map((item) => (
                        <tr key={item._id} className="hover:bg-emerald-50/30 transition-colors group cursor-default">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-800">{item.adresse_brut || "Adresse masquée"}</span>
                              <span className="text-xs text-slate-400">{item.code_postal} {item.commune_brut}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-slate-500">
                            <div className="flex items-center gap-2 font-medium">
                              <Calendar size={14} className="text-emerald-400" />
                              {item.date_etablissement_dpe ? new Date(item.date_etablissement_dpe).toLocaleDateString('fr-FR') : "N/A"}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block w-8 h-8 leading-8 rounded-lg text-white font-black text-sm shadow-sm ${COLORS[item.etiquette_dpe] || 'bg-slate-300'}`}>
                              {item.etiquette_dpe}
                            </span>
                          </td>
                          <td className="p-4 text-right text-sm font-semibold text-slate-600">{item.surface_habitable || 0} m²</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;