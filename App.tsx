import React, { useState, useEffect, useMemo, useRef } from 'react';
import { COMMUNES_40, DATASETS } from './constants';
import { fetchDpeByCommune, fetchAllCommunes, downloadAsCsv } from './ademeService';
import { DpeResult, FetchStatus } from './types';
import { DpeCharts } from './DpeCharts';
import { DpeMap, DpeMapRef } from './DpeMap';
import { 
  Download, 
  Loader2, 
  Database,
  Home,
  Search,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

const COLORS_BADGE: Record<string, string> = {
  'A': 'bg-[#00a374]', 
  'B': 'bg-[#54b45f]', 
  'C': 'bg-[#a7c14a]',
  'D': 'bg-[#f2c619]', 
  'E': 'bg-[#eb8113]', 
  'F': 'bg-[#d13813]', 
  'G': 'bg-[#b11313]',
};

const DEFAULT_YEAR = "2025";
const YEARS = ["Toutes", ...Array.from({ length: 16 }, (_, i) => (2026 - i).toString())];
const ITEMS_PER_PAGE = 10;

const App: React.FC = () => {
  const mapRef = useRef<DpeMapRef>(null);
  const [selectedCommune, setSelectedCommune] = useState<string>("Longwy");
  const [datasetId, setDatasetId] = useState<string>(DATASETS[0].id);
  const [selectedYear, setSelectedYear] = useState<string>(DEFAULT_YEAR);
  const [rawData, setRawData] = useState<DpeResult[]>([]);
  const [status, setStatus] = useState<FetchStatus>(FetchStatus.IDLE);
  const [isGlobalExporting, setIsGlobalExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{current: number, total: number}>({ current: 0, total: 0 });
  
  const [currentPage, setCurrentPage] = useState(1);

  // Déclencher le chargement quand la commune OU le dataset change
  useEffect(() => {
    handleFetch(selectedCommune, datasetId);
  }, [selectedCommune, datasetId]);

  // Réinitialiser la page quand on change de filtres
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedCommune, datasetId]);

  const handleFetch = async (commune: string, dsId: string) => {
    // Vider les données précédentes pour éviter les mélanges visuels
    setRawData([]);
    setStatus(FetchStatus.LOADING);
    try {
      const response = await fetchDpeByCommune(commune, 1500, dsId); 
      setRawData(response.results);
      setStatus(FetchStatus.SUCCESS);
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setStatus(FetchStatus.ERROR);
    }
  };

  const filteredData = useMemo(() => {
    if (!rawData) return [];
    if (selectedYear === "Toutes") return rawData;
    return rawData.filter(item => item.date_etablissement_dpe?.startsWith(selectedYear));
  }, [rawData, selectedYear]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return { avgUbat: 0, passoires: 0, incidence: 0 };
    const validUbat = filteredData.filter(d => d.ubat && d.ubat > 0);
    const totalUbat = validUbat.reduce((acc, curr) => acc + (curr.ubat || 0), 0);
    const passoires = filteredData.filter(d => d.etiquette_dpe === 'F' || d.etiquette_dpe === 'G').length;
    return {
      avgUbat: validUbat.length > 0 ? (totalUbat / validUbat.length).toFixed(2) : "0.00",
      passoires: passoires,
      incidence: Math.round((passoires / filteredData.length) * 100)
    };
  }, [filteredData]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handleLocateOnMap = (item: DpeResult) => {
    if (item.latitude && item.longitude && mapRef.current) {
      const mapElement = document.getElementById('map-section');
      if (mapElement) mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mapRef.current.focusOn(item.latitude, item.longitude, item._id);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleGlobalExport = async () => {
    setIsGlobalExporting(true); 
    const results = await fetchAllCommunes(COMMUNES_40, datasetId, (c, t) => setExportProgress({current: c, total: t})); 
    downloadAsCsv(results, "Prospection_EVALUO_Global.csv"); 
    setIsGlobalExporting(false); 
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans">
      <header className="bg-[#2563eb] text-white shadow-xl sticky top-0 z-[1001]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tighter uppercase">EVALUO</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleGlobalExport}
              disabled={isGlobalExporting}
              className="bg-[#1e293b] text-white hover:bg-black px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2 shadow-sm disabled:opacity-70"
            >
              {isGlobalExporting ? <Loader2 className="animate-spin" size={14} /> : <Database size={14} />}
              {isGlobalExporting ? `EXPORT ${exportProgress.current}/${exportProgress.total}` : "EXPORT GLOBAL"}
            </button>
            <button 
              onClick={() => downloadAsCsv(filteredData, `export_${selectedCommune}.csv`)}
              className="bg-white text-[#2563eb] hover:bg-slate-100 px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2 shadow-sm"
            >
              <Download size={14} /> EXPORTER .CSV
            </button>
          </div>
        </div>
      </header>

      <div className="bg-[#2563eb] text-white pt-8 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight uppercase">Prospection DPE 2026</h1>
          <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">Accès aux dernières mises à jour de l'ADEME. Données triées par date d'établissement.</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 -mt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-[2rem] shadow-2xl p-6 border border-slate-100">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-[#2563eb] mb-3 block tracking-widest">Source des Données</label>
                  <div className="space-y-2">
                    {DATASETS.map((ds) => (
                      <button
                        key={ds.id}
                        onClick={() => setDatasetId(ds.id)}
                        className={`w-full text-left p-4 rounded-2xl text-[11px] font-bold transition-all border shadow-sm ${
                          datasetId === ds.id 
                          ? 'bg-slate-50 border-blue-200 text-slate-900 ring-2 ring-blue-500/10' 
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        {ds.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="text-[10px] font-black uppercase text-[#2563eb] mb-2 block tracking-widest">Secteur Cible</label>
                  <select value={selectedCommune} onChange={(e) => setSelectedCommune(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#2563eb] transition-all appearance-none cursor-pointer">
                    {COMMUNES_40.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[#2563eb] mb-2 block tracking-widest">Période DPE</label>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#2563eb] transition-all appearance-none cursor-pointer">
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-xl p-6 border border-slate-100 overflow-hidden">
               <DpeCharts data={filteredData} />
            </div>
          </div>

          <div className="lg:col-span-9 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-50 flex flex-col justify-between h-32">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubat Moyen (Isolation)</span>
                  <div className="group relative">
                    <HelpCircle size={12} className="text-slate-300 cursor-help" />
                    <div className="absolute hidden group-hover:block bg-slate-800 text-white text-[8px] p-2 rounded-lg w-40 -left-40 top-0 z-50">
                      Coefficient de déperdition thermique moyen. Plus il est bas, plus le bâtiment est isolé.
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#1e293b]">{stats.avgUbat}</span>
                  <span className="text-xs font-bold text-slate-400">W/m².K</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-50 flex flex-col justify-between h-32">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passoires F/G</span>
                  <div className="group relative">
                    <HelpCircle size={12} className="text-slate-300 cursor-help" />
                    <div className="absolute hidden group-hover:block bg-slate-800 text-white text-[8px] p-2 rounded-lg w-40 -left-40 top-0 z-50">
                      Nombre de logements classés F ou G, considérés comme énergivores.
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#ef4444]">{stats.passoires}</span>
                  <span className="text-xs font-bold text-slate-400">logements</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-50 flex flex-col justify-between h-32">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incidence Thermique</span>
                  <div className="group relative">
                    <AlertTriangle size={12} className="text-slate-300 cursor-help" />
                    <div className="absolute hidden group-hover:block bg-slate-800 text-white text-[8px] p-2 rounded-lg w-40 -left-40 top-0 z-50">
                      Pourcentage de passoires thermiques (F/G) sur l'ensemble des diagnostics du secteur.
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#1e293b]">{stats.incidence}%</span>
                </div>
              </div>
            </div>

            <div id="map-section" className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
              <DpeMap ref={mapRef} data={filteredData} centerCommune={selectedCommune} />
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-black text-[#1e293b] text-xs flex items-center gap-2 uppercase tracking-tighter"><Home size={16} className="text-[#2563eb]" /> Opportunités de Prospection</h3>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-sm">
                    <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 transition-all"><ChevronLeft size={16} /></button>
                    <span className="text-[10px] font-black px-2 text-slate-500 uppercase">P. {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 transition-all"><ChevronRight size={16} /></button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                      <th className="p-6">Adresse & Date</th>
                      <th className="p-6 text-center w-20">DPE</th>
                      <th className="p-6">Bâtiment & Construction</th>
                      <th className="p-6">Type Chauffage Principal</th>
                      <th className="p-6 text-right w-24">Surface</th>
                      <th className="p-6 text-center w-20">Carte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {status === FetchStatus.LOADING ? (
                      <tr><td colSpan={6} className="p-20 text-center animate-pulse text-[10px] font-black text-slate-300 uppercase tracking-widest">Chargement des données EVALUO...</td></tr>
                    ) : paginatedData.map((item) => (
                      <tr key={item._id} className="group hover:bg-slate-50/50 transition-all">
                        <td className="p-6">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-800 uppercase leading-tight group-hover:text-[#2563eb] transition-colors">{item.adresse_brut || "Adresse NC"}</span>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.code_postal} {item.commune_brut}</span>
                              <span className="text-[9px] font-bold text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-full">{formatDate(item.date_etablissement_dpe)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <span className={`inline-block w-9 h-9 leading-9 rounded-xl text-white font-black text-xs shadow-lg transform transition-transform group-hover:scale-110 ${COLORS_BADGE[item.etiquette_dpe] || 'bg-slate-300'}`}>
                            {item.etiquette_dpe}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">{item.type_batiment}</span>
                            <span className="text-[9px] font-bold text-slate-400">Constr. : {item.annee_construction}</span>
                            <span className="text-[9px] font-bold text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-fit">Ubat: {item.ubat?.toFixed(2) || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="max-w-[180px]">
                            <span className="text-[10px] font-bold text-slate-600 uppercase bg-white px-3 py-1.5 rounded-xl border border-slate-200 inline-block leading-relaxed whitespace-normal break-words shadow-sm">
                              {item.type_chauffage}
                            </span>
                          </div>
                        </td>
                        <td className="p-6 text-right text-xs font-black text-slate-700">{item.surface_habitable} m²</td>
                        <td className="p-6 text-center">
                          <button onClick={() => handleLocateOnMap(item)} className="p-3 rounded-2xl bg-white text-[#2563eb] border border-slate-100 hover:bg-[#2563eb] hover:text-white transition-all shadow-md group-hover:shadow-blue-100">
                            <Search size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="p-8 bg-slate-50/30 flex justify-center items-center gap-4 border-t border-slate-50">
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="text-[10px] font-black uppercase text-slate-400 hover:text-[#2563eb] disabled:opacity-20 flex items-center gap-2">
                    <ChevronLeft size={16} /> Précédent
                  </button>
                  <div className="flex gap-2">
                    {[...Array(Math.min(3, totalPages))].map((_, i) => {
                      let p = currentPage;
                      if (currentPage === 1) p = i + 1;
                      else if (currentPage === totalPages) p = totalPages - 2 + i;
                      else p = currentPage - 1 + i;
                      if (p <= 0 || p > totalPages) return null;
                      return (
                        <button key={p} onClick={() => setCurrentPage(p)} className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === p ? 'bg-[#2563eb] text-white shadow-xl shadow-blue-200' : 'bg-white text-slate-400 border border-slate-100'}`}>{p}</button>
                      );
                    })}
                  </div>
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="text-[10px] font-black uppercase text-slate-400 hover:text-[#2563eb] disabled:opacity-20 flex items-center gap-2">
                    Suivant <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
