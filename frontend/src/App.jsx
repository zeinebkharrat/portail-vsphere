import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  ShieldCheck, ShieldAlert, CheckCircle, XCircle, RefreshCw, Server,
  Sun, Moon, Search, Wrench, Download, ChevronRight, X, Menu,
  FileText, Edit3, Check, Zap, Printer, FileSpreadsheet, TrendingUp, PieChart
} from 'lucide-react';

function App() {
  const [auditData, setAuditData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedVmDetails, setSelectedVmDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('TOUTES');
  const [actionMessage, setActionMessage] = useState(null);

  const API_URL = `http://${window.location.hostname}:8000/api/audit`;
  const REMEDIATE_BASE_URL = `http://${window.location.hostname}:8000/api/v1/remediate`;

  const fetchAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(API_URL);
      const data = response.data?.data || response.data || [];
      const list = Array.isArray(data) ? data : [];
      setAuditData(list);

      const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const compCount = list.filter(vm => getFullRulesList(vm).every(r => r.passed)).length;
      const rate = list.length > 0 ? Math.round((compCount / list.length) * 100) : 0;

      setHistoryData(prev => [
        ...prev.slice(-9),
        { time: now, rate: rate, count: list.length }
      ]);
    } catch (err) {
      setError("Impossible de contacter le serveur FastAPI.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  // Fonction générique de Remédiation
  const handleRemediate = async (endpoint, payload, defaultSuccessMessage) => {
    setActionMessage(`Remédiation vSphere en cours...`);
    try {
      const response = await axios.post(`${REMEDIATE_BASE_URL}/${endpoint}`, payload);
      setActionMessage(`Succès : ${response.data?.message || defaultSuccessMessage}`);
      await fetchAudit();
    } catch (err) {
      setActionMessage(`Erreur : ${err.response?.data?.detail || "Échec de la remédiation."}`);
    } finally {
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  // Évaluation des 10 règles de conformité
  const getFullRulesList = (vm) => {
    if (!vm) return [];

    const cpus = vm.num_cpu ?? vm.cpu ?? 0;
    const ram = vm.memory_mb ?? vm.ram ?? 0;
    const ip = vm.ip_address ?? vm.ip ?? "Indisponible";
    const portgroup = vm.portgroup ?? "Indisponible";
    const osName = vm.guest_os ?? '';

    const whitelistedOS = ["Ubuntu", "Linux", "Windows Server", "Red Hat", "Debian"];
    const osPass = Boolean(osName) && whitelistedOS.some(os => osName.toLowerCase().includes(os.toLowerCase()));

    const namePass = vm.name ? /^vm-/i.test(vm.name) : false;
    const networkPass = portgroup !== 'Indisponible' && portgroup !== 'N/A' && portgroup !== '';
    const dnsPass = ip !== 'Indisponible' && ip !== 'N/A' && ip !== '' && ip !== '127.0.0.1';
    const tagsPass = Array.isArray(vm.tags) && vm.tags.length > 0;
    const resPass = cpus > 0 && cpus <= 8 && ram > 0 && ram <= 32768;
    const snapPass = !(vm.has_old_snapshots ?? false);
    const activePass = vm.power_state === 'poweredOn';
    const toolsPass = vm.tools_status === 'guestToolsRunning' || (ip !== "Indisponible" && ip !== "N/A");
    const adPass = vm.domain_joined ?? true;

    return [
      { id: 1, title: "1. Convention de Nommage", category: "Nommage", passed: namePass, detail: namePass ? "Préfixe 'vm-' conforme" : `Nom '${vm.name}' non conforme` },
      { id: 2, title: "2. Réseau / Portgroup", category: "Réseau", passed: networkPass, detail: networkPass ? `Portgroup: '${portgroup}'` : "Aucun portgroup valide" },
      { id: 3, title: "3. Déclaration DNS", category: "Réseau", passed: dnsPass, detail: dnsPass ? `IP: ${ip}` : "IP ou FQDN manquant" },
      { id: 4, title: "4. Tags vSphere", category: "Gouvernance", passed: tagsPass, detail: tagsPass ? `Tags: ${vm.tags.join(', ')}` : "Aucun tag affecté" },
      { id: 5, title: "5. OS Liste Blanche", category: "Système", passed: osPass, detail: osPass ? `OS: ${osName}` : `OS non autorisé` },
      { id: 6, title: "6. Allocation vCPU/RAM", category: "Ressources", passed: resPass, detail: `${cpus} vCPU / ${ram} Mo RAM` },
      { id: 7, title: "7. Snapshots Anciens", category: "Stockage", passed: snapPass, detail: snapPass ? "Snapshots OK" : "Snapshot présent" },
      { id: 8, title: "8. Activité Machine", category: "Supervision", passed: activePass, detail: activePass ? "Machine en ligne" : "Machine hors tension" },
      { id: 9, title: "9. VMware Tools", category: "Système", passed: toolsPass, detail: toolsPass ? "Tools fonctionnels" : "Tools inactifs" },
      { id: 10, title: "10. Inscription AD", category: "Sécurité", passed: adPass, detail: adPass ? "Inscrite au domaine AD" : "Absente de l'AD" },
    ];
  };

  const getCategoryStats = () => {
    const categories = {};
    auditData.forEach(vm => {
      const rules = getFullRulesList(vm);
      rules.forEach(r => {
        if (!categories[r.category]) categories[r.category] = { total: 0, passed: 0 };
        categories[r.category].total += 1;
        if (r.passed) categories[r.category].passed += 1;
      });
    });
    return Object.keys(categories).map(cat => ({
      category: cat,
      rate: Math.round((categories[cat].passed / categories[cat].total) * 100)
    }));
  };

  const totalVMs = auditData.length;
  const compliantVMs = auditData.filter(vm => getFullRulesList(vm).every(r => r.passed)).length;
  const nonCompliantVMs = totalVMs - compliantVMs;
  const compliancePercentage = totalVMs > 0 ? Math.round((compliantVMs / totalVMs) * 100) : 0;

  const filteredVMs = auditData.filter(vm => {
    const name = vm?.name || '';
    const rules = getFullRulesList(vm);
    const isPass = rules.every(r => r.passed);
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesFilter = true;
    if (filterStatus === 'CONFORMES') matchesFilter = isPass;
    if (filterStatus === 'NON_CONFORMES') matchesFilter = !isPass;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className={`min-h-screen font-sans ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* NAVBAR */}
      <nav className={`px-8 py-4 border-b flex justify-between items-center sticky top-0 z-40 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <Server className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold">Portail SecOps vSphere</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl border">
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
          <button onClick={fetchAudit} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>
      </nav>

      {/* DASHBOARD CONTENT */}
      <main className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* CARTE MESSAGE D'ACTION */}
        {actionMessage && (
          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-600 p-4 rounded-xl flex items-center gap-3">
            <Wrench className="w-5 h-5 animate-bounce" />
            <span className="text-xs font-bold">{actionMessage}</span>
          </div>
        )}

        {/* CARTES KPIS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <p className="text-xs text-slate-400 uppercase font-bold">Total Machines</p>
            <p className="text-3xl font-black mt-2">{totalVMs}</p>
          </div>
          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <p className="text-xs text-emerald-500 uppercase font-bold">Conformes</p>
            <p className="text-3xl font-black mt-2 text-emerald-500">{compliantVMs}</p>
          </div>
          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <p className="text-xs text-rose-500 uppercase font-bold">Non Conformes</p>
            <p className="text-3xl font-black mt-2 text-rose-500">{nonCompliantVMs}</p>
          </div>
          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <p className="text-xs text-blue-500 uppercase font-bold">Taux de Conformité</p>
            <p className="text-3xl font-black mt-2 text-blue-500">{compliancePercentage}%</p>
          </div>
        </div>

        {/* TABLEAU DES MACHINES ET REMÉDIATION */}
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h2 className="text-base font-bold mb-4">Inventaire & Actions de Remédiation</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                  <th className="p-3">Machine</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">IP / Réseau</th>
                  <th className="p-3">Actions de Correction en 1-Clic</th>
                </tr>
              </thead>
              <tbody>
                {filteredVMs.map((vm, index) => {
                  const rules = getFullRulesList(vm);
                  const isCompliant = rules.every(r => r.passed);

                  return (
                    <tr key={index} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-bold">{vm.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${isCompliant ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {isCompliant ? 'CONFORME' : 'NON CONFORME'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{vm.ip_address} ({vm.portgroup})</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          
                          {/* 1. Fix Nom */}
                          {!rules.find(r => r.id === 1)?.passed && (
                            <button
                              onClick={() => handleRemediate('rename', { vm_name: vm.name }, "Nom corrigé avec préfixe vm-")}
                              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded text-[10px] font-bold"
                            >
                              <Zap className="w-3 h-3" /> Fix Nom
                            </button>
                          )}

                          {/* 2. Purger Snapshots */}
                          {!rules.find(r => r.id === 7)?.passed && (
                            <button
                              onClick={() => handleRemediate('delete-snapshots', { vm_name: vm.name }, "Snapshots purgés.")}
                              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded text-[10px] font-bold"
                            >
                              <Zap className="w-3 h-3" /> Purger Snapshots
                            </button>
                          )}

                          {/* 3. Reboot Tools */}
                          {!rules.find(r => r.id === 9)?.passed && (
                            <button
                              onClick={() => handleRemediate('reboot-tools', { vm_name: vm.name }, "Redémarrage lancé.")}
                              className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-[10px] font-bold"
                            >
                              <Zap className="w-3 h-3" /> Reboot Tools
                            </button>
                          )}

                          {/* 4. Attribuer Tag */}
                          {!rules.find(r => r.id === 4)?.passed && (
                            <button
                              onClick={() => handleRemediate('add-tag', { vm_name: vm.name }, "Tag rattaché.")}
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px] font-bold"
                            >
                              <Zap className="w-3 h-3" /> Ajouter Tag
                            </button>
                          )}

                          {isCompliant && <span className="text-slate-400 text-[10px]">Aucune action requise</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
