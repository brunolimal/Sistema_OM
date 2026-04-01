import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; // Importação da conexão com o banco
import { 
  Play, Pause, CheckCircle2, Clock, Plus, Wrench, User, Factory,
  Search, BarChart3, ListTodo, ChevronDown, ChevronUp, FileText,
  CalendarDays, AlertTriangle, Package, Settings, Users, ArrowRightLeft, Target, Trash2, Download
} from 'lucide-react';

// Listas simuladas para os formulários
const MOCK_PRODUCTS = ['Escora Metálica 3m', 'Escora Metálica 4m', 'Andaime Tubular 1x1.5m', 'Forcado Duplo', 'Sapata Ajustável', 'Tubo 6m', 'Abraçadeira Fixa', 'Plataforma Metálica'];
const MOCK_WORKERS = ['Carlos Silva', 'Roberto Gomes', 'Ana Costa', 'João Pedro', 'Marcos Paulo', 'Lucas Lima'];
const MOCK_SECTORS = ['Soldagem', 'Pintura', 'Mecânica', 'Montagem', 'Manutenção Geral', 'Usinagem'];

export default function App() {
  // O estado inicial agora é vazio, pois os dados virão do banco
  const [oms, setOms] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('Todas');
  const [search, setSearch] = useState('');

  // View States
  const [currentView, setCurrentView] = useState('oms');
  const [omToFinish, setOmToFinish] = useState(null);
  
  // Manage Team State
  const [omToManageTeam, setOmToManageTeam] = useState(null);
  const [manageSelectedWorker, setManageSelectedWorker] = useState('');
  const [manageSelectedSector, setManageSelectedSector] = useState('');

  // States para Nova OM
  const [newTitle, setNewTitle] = useState('');
  const [newObjective, setNewObjective] = useState('Manutenção');
  const [newCriticality, setNewCriticality] = useState('Programada');
  const [newAssignee, setNewAssignee] = useState('');
  const [newSector, setNewSector] = useState(MOCK_SECTORS[0]);
  
  // States para Produtos da Nova OM
  const [newProducts, setNewProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState(MOCK_PRODUCTS[0]);
  const [currentQty, setCurrentQty] = useState(1);

  // --- INTEGRAÇÃO COM SUPABASE ---
  useEffect(() => {
    fetchOms();
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOms = async () => {
    const { data, error } = await supabase
      .from('oms')
      .select('*')
      .order('createdat', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar OMs:', error);
      return;
    }

    if (data) {
      // Traduz os dados do banco para o formato que a interface espera
      const formattedData = data.map(dbOm => ({
        id: dbOm.id,
        title: dbOm.title || '',
        sectors: dbOm.sector ? dbOm.sector.split(', ') : [],
        assignees: dbOm.assignee ? dbOm.assignee.split(', ') : [],
        objective: dbOm.objective || 'Manutenção',
        criticality: dbOm.criticality || 'Programada',
        products: dbOm.products || [],
        status: dbOm.status || 'pending',
        timeLogs: dbOm.timelogs || [],
        createdAt: dbOm.createdat
      }));
      setOms(formattedData);
    }
  };

  const updateOmInDatabase = async (id, updates) => {
    const { error } = await supabase.from('oms').update(updates).eq('id', id);
    if (!error) fetchOms(); 
  };
  // -------------------------------

  // Helpers de Tempo
  const calculateTotalTime = (timeLogs) => {
    let total = 0;
    timeLogs.forEach(log => {
      if (log.end) total += (log.end - log.start);
      else total += (currentTime - log.start);
    });
    return total;
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (isoString) => new Date(isoString).toLocaleDateString('pt-BR');

  // Função para Exportar para Excel (CSV)
  const exportToCSV = () => {
    const headers = ['Código', 'Data Criação', 'Descrição', 'Objetivo', 'Criticidade', 'Setores', 'Responsáveis', 'Produtos', 'Status', 'Tempo Executado'];

    const rows = oms.map(om => {
      const date = formatDate(om.createdAt);
      const productsStr = om.products.map(p => `${p.quantity}x ${p.name}`).join(' | ');
      const totalTimeStr = formatTime(calculateTotalTime(om.timeLogs));
      
      const statusPt = om.status === 'pending' ? 'Pendente' : 
                       om.status === 'in_progress' ? 'Em Andamento' : 
                       om.status === 'paused' ? 'Pausado' : 'Concluído';

      return [
        om.id,
        date,
        `"${om.title}"`,
        om.objective,
        om.criticality,
        `"${om.sectors.join(', ')}"`,
        `"${om.assignees.join(', ')}"`,
        `"${productsStr}"`,
        statusPt,
        totalTimeStr
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_Producao_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ações Principais no Banco
  const handleStart = (id) => {
    const om = oms.find(o => o.id === id);
    if (om.assignees.length === 0) {
      alert("Por favor, selecione um responsável antes de iniciar a OM.");
      return;
    }
    const newLogs = [...om.timeLogs, { start: Date.now(), end: null }];
    updateOmInDatabase(id, { status: 'in_progress', timelogs: newLogs });
  };

  const handlePause = (id) => {
    const om = oms.find(o => o.id === id);
    const updatedLogs = [...om.timeLogs];
    const lastLog = updatedLogs[updatedLogs.length - 1];
    if (lastLog && !lastLog.end) lastLog.end = Date.now();
    
    updateOmInDatabase(id, { status: 'paused', timelogs: updatedLogs });
  };

  const confirmFinish = () => {
    if (!omToFinish) return;
    const om = oms.find(o => o.id === omToFinish);
    const updatedLogs = [...om.timeLogs];
    const lastLog = updatedLogs[updatedLogs.length - 1];
    if (lastLog && !lastLog.end) lastLog.end = Date.now();
    
    updateOmInDatabase(omToFinish, { status: 'completed', timelogs: updatedLogs });
    setOmToFinish(null);
  };

  // Funções de Criação de OM
  const handleAddProduct = () => {
    if (currentQty > 0) {
      const existingProduct = newProducts.find(p => p.name === currentProduct);
      if (existingProduct) {
        setNewProducts(newProducts.map(p => p.name === currentProduct ? { ...p, quantity: p.quantity + Number(currentQty) } : p));
      } else {
        setNewProducts([...newProducts, { name: currentProduct, quantity: Number(currentQty) }]);
      }
      setCurrentQty(1);
    }
  };

  const handleRemoveProduct = (name) => {
    setNewProducts(newProducts.filter(p => p.name !== name));
  };

  const handleCreateOM = async (e) => {
    e.preventDefault();
    if (!newTitle) return;

    // Gera o ID pegando o maior número atual, ou começa no 1001
    const currentMaxId = oms.length > 0 
      ? Math.max(...oms.map(o => parseInt(o.id.replace('OM-', '')) || 0))
      : 1000;
    const newId = `OM-${currentMaxId + 1}`;

    const insertData = {
      id: newId,
      title: newTitle,
      sector: newSector,
      assignee: newAssignee,
      objective: newObjective,
      criticality: newCriticality,
      products: newProducts,
      status: 'pending',
      timelogs: []
    };

    const { error } = await supabase.from('oms').insert([insertData]);

    if (!error) {
      fetchOms();
      setIsModalOpen(false);
      setNewTitle('');
      setNewAssignee('');
      setNewProducts([]);
      setNewObjective('Manutenção');
      setNewCriticality('Programada');
    } else {
      alert("Erro ao salvar no banco: " + error.message);
    }
  };

  // Funções de Gerenciamento de Equipe
  const assignWorkerDirectly = (omId, workerName) => {
    if (!workerName) return;
    const om = oms.find(o => o.id === omId);
    const newAssignees = [...om.assignees, workerName].join(', ');
    updateOmInDatabase(omId, { assignee: newAssignees });
  };

  const handleAddTeamMember = () => {
    if (!omToManageTeam) return;
    const om = oms.find(o => o.id === omToManageTeam.id);
    
    const newAssignees = manageSelectedWorker && !om.assignees.includes(manageSelectedWorker) 
      ? [...om.assignees, manageSelectedWorker].join(', ') : om.assignees.join(', ');
      
    const newSectors = manageSelectedSector && !om.sectors.includes(manageSelectedSector)
      ? [...om.sectors, manageSelectedSector].join(', ') : om.sectors.join(', ');
    
    updateOmInDatabase(om.id, { assignee: newAssignees, sector: newSectors });
    setManageSelectedWorker('');
    setManageSelectedSector('');
    setOmToManageTeam(null);
  };

  const handleRemoveTeamMember = (omId, type, itemToRemove) => {
    const om = oms.find(o => o.id === omId);
    if (type === 'worker') {
      const newAssignees = om.assignees.filter(w => w !== itemToRemove).join(', ');
      updateOmInDatabase(omId, { assignee: newAssignees });
    }
    if (type === 'sector') {
      const newSectors = om.sectors.filter(s => s !== itemToRemove).join(', ');
      updateOmInDatabase(omId, { sector: newSectors });
    }
  };

  // Filtros
  const filteredOms = oms.filter(om => {
    const searchLower = search.toLowerCase();
    const matchesSearch = om.title.toLowerCase().includes(searchLower) || 
                          om.id.toLowerCase().includes(searchLower) ||
                          om.assignees.some(a => a.toLowerCase().includes(searchLower));
    
    if (filter === 'Todas') return matchesSearch;
    if (filter === 'Pendentes') return om.status === 'pending' && matchesSearch;
    if (filter === 'Em Andamento') return (om.status === 'in_progress' || om.status === 'paused') && matchesSearch;
    if (filter === 'Concluídas') return om.status === 'completed' && matchesSearch;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-500 p-2 rounded-lg">
              <Factory size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Mais Escoramentos</h1>
              <p className="text-xs text-slate-300">Produção & Manutenção</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setCurrentView('oms')}
              className={`px-4 py-2 rounded-md font-medium flex items-center transition-colors ${currentView === 'oms' ? 'bg-orange-500 text-white shadow' : 'text-slate-300 hover:text-white'}`}
            >
              <ListTodo size={18} className="mr-2" /> Ordens
            </button>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-2 rounded-md font-medium flex items-center transition-colors ${currentView === 'dashboard' ? 'bg-orange-500 text-white shadow' : 'text-slate-300 hover:text-white'}`}
            >
              <BarChart3 size={18} className="mr-2" /> Dashboard
            </button>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium flex items-center transition-colors shadow-sm"
          >
            <Plus size={18} className="mr-2" /> Nova OM
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {currentView === 'oms' ? (
          <>
            {/* Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
              <div className="flex items-center bg-white p-2 rounded-lg shadow-sm border border-gray-200 w-full md:w-auto">
                <Search size={20} className="text-gray-400 ml-2" />
                <input 
                  type="text" 
                  placeholder="Buscar por código, título ou colaborador..." 
                  className="bg-transparent border-none focus:ring-0 outline-none ml-2 w-full md:w-72 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex space-x-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                {['Todas', 'Pendentes', 'Em Andamento', 'Concluídas'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      filter === f ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* OM Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredOms.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                  Nenhuma Ordem de Manutenção encontrada.
                </div>
              ) : (
                filteredOms.map(om => {
                  const totalTime = calculateTotalTime(om.timeLogs);
                  return (
                    <div key={om.id} className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden flex flex-col transition-all hover:shadow-md ${
                      om.criticality === 'Imediata' && om.status !== 'completed' ? 'border-l-red-500' : 'border-l-blue-500'
                    }`}>
                      {/* Card Header */}
                      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">
                            {om.id}
                          </span>
                          <h3 className="mt-2 font-bold text-gray-800 text-lg leading-tight pr-4">
                            {om.title}
                          </h3>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                          om.status === 'pending' ? 'bg-gray-200 text-gray-700' :
                          om.status === 'in_progress' ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300 animate-pulse' :
                          om.status === 'paused' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {om.status === 'pending' && 'Pendente'}
                          {om.status === 'in_progress' && 'Em Andamento'}
                          {om.status === 'paused' && 'Pausado'}
                          {om.status === 'completed' && 'Concluído'}
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 flex-grow space-y-4">
                        
                        {/* Badges: Objetivo e Criticidade */}
                        <div className="flex space-x-2">
                          <span className="flex items-center text-xs font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded">
                            <Target size={12} className="mr-1"/> {om.objective}
                          </span>
                          <span className={`flex items-center text-xs font-medium px-2 py-1 rounded ${
                            om.criticality === 'Imediata' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            <AlertTriangle size={12} className="mr-1"/> {om.criticality}
                          </span>
                        </div>

                        {/* Produtos List */}
                        {om.products && om.products.length > 0 && (
                          <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                            <p className="text-xs font-bold text-orange-800 mb-2 flex items-center">
                              <Package size={14} className="mr-1"/> Produtos da OM
                            </p>
                            <ul className="text-sm space-y-1">
                              {om.products.map((p, i) => (
                                <li key={i} className="flex justify-between text-gray-700 border-b border-orange-200/50 pb-1 last:border-0 last:pb-0">
                                  <span>{p.name}</span>
                                  <span className="font-bold bg-white px-2 rounded text-orange-600 shadow-sm">{p.quantity} un</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Setores e Colaboradores */}
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <Wrench size={16} className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                            <div className="text-sm text-gray-600 flex flex-wrap gap-1">
                              {om.sectors.length > 0 ? om.sectors.map(s => (
                                <span key={s} className="bg-gray-100 px-2 py-0.5 rounded text-xs border border-gray-200">{s}</span>
                              )) : <span className="text-gray-400 italic">Sem setor definido</span>}
                            </div>
                          </div>
                          
                          <div className="flex items-start pt-1">
                            <Users size={16} className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                            <div className="text-sm text-gray-600 flex-grow">
                              {om.assignees.length > 0 ? (
                                <div className="flex flex-wrap gap-1 items-center">
                                  {om.assignees.map(a => (
                                    <span key={a} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-100">{a}</span>
                                  ))}
                                  {om.status !== 'completed' && (
                                    <button 
                                      onClick={() => { setOmToManageTeam(om); setIsModalOpen(false); }}
                                      className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline flex items-center"
                                    >
                                      <ArrowRightLeft size={12} className="mr-1"/> Gerenciar Equipe
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <select 
                                    className="text-xs border border-gray-300 rounded p-1 flex-grow outline-none focus:border-blue-500"
                                    onChange={(e) => assignWorkerDirectly(om.id, e.target.value)}
                                    defaultValue=""
                                  >
                                    <option value="" disabled>Selecione seu nome para assumir...</option>
                                    {MOCK_WORKERS.map(w => <option key={w} value={w}>{w}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Timer Display */}
                        <div className={`mt-2 p-3 rounded-lg flex flex-col justify-center border ${
                          om.status === 'in_progress' ? 'bg-slate-900 border-slate-800 text-white shadow-inner' : 'bg-gray-50 border-gray-200 text-gray-800'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Clock size={18} className={`mr-2 ${om.status === 'in_progress' ? 'text-blue-400 animate-spin-slow' : 'text-gray-500'}`} />
                              <span className="text-sm font-bold uppercase tracking-wide">Tempo Total</span>
                            </div>
                            <span className="font-mono font-bold text-xl tracking-wider">
                              {formatTime(totalTime)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="p-4 bg-gray-50 border-t border-gray-200 flex space-x-2">
                        {om.status === 'pending' && (
                          <button 
                            onClick={() => handleStart(om.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-md font-bold flex justify-center items-center transition-all shadow-sm"
                          >
                            <Play size={18} className="mr-2" /> INICIAR PRODUÇÃO
                          </button>
                        )}

                        {om.status === 'in_progress' && (
                          <>
                            <button 
                              onClick={() => handlePause(om.id)}
                              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-md font-bold flex justify-center items-center transition-all shadow-sm"
                            >
                              <Pause size={18} className="mr-2" /> PAUSAR
                            </button>
                            <button 
                              onClick={() => setOmToFinish(om.id)}
                              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-md font-bold flex justify-center items-center transition-all shadow-sm"
                            >
                              <CheckCircle2 size={18} className="mr-2" /> FINALIZAR
                            </button>
                          </>
                        )}

                        {om.status === 'paused' && (
                          <>
                            <button 
                              onClick={() => handleStart(om.id)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md font-bold flex justify-center items-center transition-all shadow-sm"
                            >
                              <Play size={18} className="mr-2" /> RETOMAR
                            </button>
                            <button 
                              onClick={() => setOmToFinish(om.id)}
                              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-md font-bold flex justify-center items-center transition-all shadow-sm"
                            >
                              <CheckCircle2 size={18} className="mr-2" /> FINALIZAR
                            </button>
                          </>
                        )}

                        {om.status === 'completed' && (
                          <div className="w-full text-center text-sm font-bold text-slate-500 flex items-center justify-center py-2 bg-gray-100 rounded-md">
                            <CheckCircle2 size={18} className="mr-2" /> PRODUÇÃO FINALIZADA
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* --- DASHBOARD VIEW --- */
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
              <BarChart3 className="mr-3 text-orange-500" /> Visão Geral da Produção
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-b-4 border-b-blue-500">
                <h3 className="text-gray-500 text-sm font-bold mb-2 uppercase tracking-wider">OMs Ativas / Total</h3>
                <p className="text-3xl font-bold text-gray-800">
                  {oms.filter(o => o.status !== 'completed').length} <span className="text-xl text-gray-400">/ {oms.length}</span>
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-b-4 border-b-orange-500">
                <h3 className="text-gray-500 text-sm font-bold mb-2 uppercase tracking-wider">Total de Produtos</h3>
                <p className="text-3xl font-bold text-orange-600">
                  {oms.reduce((acc, om) => acc + om.products.reduce((sum, p) => sum + p.quantity, 0), 0)} <span className="text-lg text-gray-500 font-normal">unidades</span>
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-b-4 border-b-red-500">
                <h3 className="text-gray-500 text-sm font-bold mb-2 uppercase tracking-wider">Críticas (Imediato)</h3>
                <p className="text-3xl font-bold text-red-600">
                  {oms.filter(o => o.criticality === 'Imediata' && o.status !== 'completed').length}
                </p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 text-white">
                <h3 className="text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider">Tempo Geral (Fábrica)</h3>
                <p className="text-3xl font-bold font-mono text-green-400">
                  {formatTime(oms.reduce((acc, om) => acc + calculateTotalTime(om.timeLogs), 0))}
                </p>
              </div>
            </div>

            {/* Relatório Detalhado */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <FileText className="mr-2 text-slate-600" /> Relatório Detalhado de Produção
                </h3>
                <button 
                  onClick={exportToCSV}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-bold text-sm flex items-center transition-colors shadow-sm"
                >
                  <Download size={16} className="mr-2" /> Exportar Planilha Excel
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
                      <th className="p-4 font-bold">Código / Data</th>
                      <th className="p-4 font-bold">Descrição & Objetivo</th>
                      <th className="p-4 font-bold">Responsáveis / Setor</th>
                      <th className="p-4 font-bold">Produtos Fabricados/Mantidos</th>
                      <th className="p-4 font-bold text-center">Status</th>
                      <th className="p-4 font-bold text-right">Tempo Executado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {oms.map(om => {
                      const totalTime = calculateTotalTime(om.timeLogs);
                      return (
                        <tr key={om.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 align-top">
                            <div className="font-bold text-slate-800">{om.id}</div>
                            <div className="text-xs text-gray-500 mt-1">{formatDate(om.createdAt)}</div>
                            {om.criticality === 'Imediata' && <span className="text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-bold mt-1 inline-block">URGENTE</span>}
                          </td>
                          <td className="p-4 align-top">
                            <div className="font-semibold text-gray-800">{om.title}</div>
                            <div className="text-xs text-gray-500 mt-1 bg-gray-100 inline-block px-2 py-0.5 rounded border border-gray-200">{om.objective}</div>
                          </td>
                          <td className="p-4 align-top">
                            <div className="font-medium text-gray-700">{om.assignees.length > 0 ? om.assignees.join(', ') : '-'}</div>
                            <div className="text-xs text-gray-500 mt-1">{om.sectors.join(', ')}</div>
                          </td>
                          <td className="p-4 align-top">
                            <ul className="space-y-1">
                              {om.products.map((p, i) => (
                                <li key={i} className="text-xs text-gray-700 flex justify-between bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                  <span>{p.name}</span>
                                  <strong className="ml-2 text-orange-700">{p.quantity}</strong>
                                </li>
                              ))}
                              {om.products.length === 0 && <span className="text-gray-400 text-xs italic">-</span>}
                            </ul>
                          </td>
                          <td className="p-4 text-center align-top">
                            <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold inline-block ${
                              om.status === 'pending' ? 'bg-gray-200 text-gray-600' :
                              om.status === 'in_progress' ? 'bg-blue-600 text-white' :
                              om.status === 'paused' ? 'bg-orange-200 text-orange-800' :
                              'bg-green-100 text-green-800 border border-green-200'
                            }`}>
                              {om.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-right align-top font-mono font-bold text-slate-700 text-base">
                            {formatTime(totalTime)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: CRIAR NOVA OM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center"><Plus className="mr-2" size={20}/> Emitir Nova Ordem (OM)</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleCreateOM} className="p-6 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Título / Descrição Geral</label>
                  <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Soldagem do lote B..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Objetivo</label>
                  <select value={newObjective} onChange={(e) => setNewObjective(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Manutenção">Manutenção</option>
                    <option value="Fabricação">Fabricação</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Criticidade</label>
                  <select value={newCriticality} onChange={(e) => setNewCriticality(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 outline-none">
                    <option value="Programada">Programada</option>
                    <option value="Imediata">Imediata (Urgente)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Setor Inicial</label>
                  <select value={newSector} onChange={(e) => setNewSector(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white outline-none">
                    {MOCK_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Responsável Inicial</label>
                  <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white outline-none">
                    <option value="">Deixar em aberto (Opcional)</option>
                    {MOCK_WORKERS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              <div className="border border-orange-200 rounded-lg overflow-hidden">
                <div className="bg-orange-50 p-3 border-b border-orange-200 flex items-center">
                  <Package className="text-orange-600 mr-2" size={18}/>
                  <h3 className="font-bold text-orange-800 text-sm">Produtos Relacionados à OM</h3>
                </div>
                <div className="p-4">
                  <div className="flex space-x-2 mb-4">
                    <select value={currentProduct} onChange={(e) => setCurrentProduct(e.target.value)} className="flex-grow border border-gray-300 rounded-md px-3 py-2 bg-white outline-none text-sm">
                      {MOCK_PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input type="number" min="1" value={currentQty} onChange={(e) => setCurrentQty(e.target.value)} className="w-20 border border-gray-300 rounded-md px-3 py-2 outline-none text-sm" placeholder="Qtd"/>
                    <button type="button" onClick={handleAddProduct} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-bold text-sm transition-colors">
                      Adicionar
                    </button>
                  </div>
                  
                  {newProducts.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                      {newProducts.map((prod, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 border-b border-gray-100 last:border-0 text-sm">
                          <span className="font-medium text-gray-700">{prod.name}</span>
                          <div className="flex items-center space-x-3">
                            <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 font-bold">{prod.quantity} un</span>
                            <button type="button" onClick={() => handleRemoveProduct(prod.name)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic text-center py-2">Nenhum produto adicionado. Adicione acima se necessário.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-bold transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md font-bold transition-colors shadow-sm flex items-center">
                  <CheckCircle2 size={18} className="mr-2"/> Emitir Ordem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GERENCIAR EQUIPE */}
      {omToManageTeam && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center"><Users className="mr-2" size={20}/> Gerenciar Equipe da OM</h2>
              <button onClick={() => setOmToManageTeam(null)} className="text-blue-200 hover:text-white transition-colors">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="text-sm text-gray-600 border-b pb-4">
                Você está gerenciando a ordem: <br/>
                <strong className="text-gray-900">{omToManageTeam.id} - {omToManageTeam.title}</strong>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="text-xs font-bold text-blue-800 uppercase mb-3">Adicionar / Transferir</h3>
                <div className="space-y-3">
                  <select value={manageSelectedWorker} onChange={(e) => setManageSelectedWorker(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm outline-none">
                    <option value="">Selecione um Colaborador...</option>
                    {MOCK_WORKERS.filter(w => !omToManageTeam.assignees.includes(w)).map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <select value={manageSelectedSector} onChange={(e) => setManageSelectedSector(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm outline-none">
                    <option value="">Selecione um Setor (Opcional)...</option>
                    {MOCK_SECTORS.filter(s => !omToManageTeam.sectors.includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={handleAddTeamMember} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold text-sm transition-colors">
                    Adicionar à OM
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Equipe Atual Trabalhando</h3>
                <div className="space-y-2">
                  {omToManageTeam.assignees.map(a => (
                    <div key={a} className="flex justify-between items-center bg-white border border-gray-200 p-2 rounded text-sm">
                      <span className="font-medium text-gray-700"><User size={14} className="inline mr-1 text-gray-400"/> {a}</span>
                      <button onClick={() => handleRemoveTeamMember(omToManageTeam.id, 'worker', a)} className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 bg-red-50 rounded">Remover</button>
                    </div>
                  ))}
                  {omToManageTeam.sectors.map(s => (
                    <div key={s} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-2 rounded text-sm">
                      <span className="font-medium text-gray-600"><Wrench size={14} className="inline mr-1 text-gray-400"/> Setor: {s}</span>
                      <button onClick={() => handleRemoveTeamMember(omToManageTeam.id, 'sector', s)} className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 bg-red-50 rounded">Remover</button>
                    </div>
                  ))}
                  {omToManageTeam.assignees.length === 0 && omToManageTeam.sectors.length === 0 && (
                    <p className="text-sm text-gray-400 italic text-center">Ninguém alocado nesta OM.</p>
                  )}
                </div>
              </div>

              <button onClick={() => setOmToManageTeam(null)} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-lg font-bold transition-colors">
                Concluir Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR FINALIZAÇÃO */}
      {omToFinish && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Finalizar Produção?</h2>
            <p className="text-gray-600 mb-6 text-sm">
              Tem certeza que deseja finalizar esta Ordem? O tempo total será consolidado permanentemente.
            </p>
            <div className="flex justify-center space-x-3">
              <button onClick={() => setOmToFinish(null)} className="px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-bold transition-colors w-full">
                Cancelar
              </button>
              <button onClick={confirmFinish} className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md font-bold transition-colors w-full">
                Sim, Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}