import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; // Mantendo a conexão com o banco!
import { 
  Play, Pause, CheckCircle2, Clock, Plus, Wrench, User, Factory,
  Search, BarChart3, ListTodo, ChevronDown, ChevronUp, FileText,
  CalendarDays, AlertTriangle, Package, Settings, Users, ArrowRightLeft, Target, Trash2, Download, AlignLeft, Edit
} from 'lucide-react';

const MOCK_PRODUCTS = ['Escora Metálica 3m', 'Escora Metálica 4m', 'Andaime Tubular 1x1.5m', 'Forcado Duplo', 'Sapata Ajustável', 'Tubo 6m', 'Abraçadeira Fixa', 'Plataforma Metálica'];
const MOCK_WORKERS = ['Carlos Silva', 'Roberto Gomes', 'Ana Costa', 'João Pedro', 'Marcos Paulo', 'Lucas Lima'];
const MOCK_SECTORS = ['Soldagem', 'Pintura', 'Mecânica', 'Montagem', 'Manutenção Geral', 'Usinagem'];

export default function App() {
  const [oms, setOms] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('Todas');
  const [search, setSearch] = useState('');

  const [currentView, setCurrentView] = useState('oms');
  const [omToFinish, setOmToFinish] = useState(null);
  
  const [omToUpdate, setOmToUpdate] = useState(null);
  const [manageSelectedWorker, setManageSelectedWorker] = useState('');
  const [manageSelectedSector, setManageSelectedSector] = useState('');
  const [manageSelectedProduct, setManageSelectedProduct] = useState(MOCK_PRODUCTS[0]);
  const [manageSelectedQty, setManageSelectedQty] = useState(1);

  const [omToStart, setOmToStart] = useState(null);
  const [actionWorker, setActionWorker] = useState('');
  const [actionSector, setActionSector] = useState('');
  const [actionProduct, setActionProduct] = useState('');
  const [actionQty, setActionQty] = useState(1);

  const [newTitle, setNewTitle] = useState('');
  const [newObjective, setNewObjective] = useState('Manutenção');
  const [newCriticality, setNewCriticality] = useState('Programada');
  const [newObservation, setNewObservation] = useState('');
  const [newSector, setNewSector] = useState(MOCK_SECTORS[0]);
  const [newProducts, setNewProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState(MOCK_PRODUCTS[0]);
  const [currentQty, setCurrentQty] = useState(1);

  // --- INTEGRAÇÃO SUPABASE ---
  useEffect(() => {
    fetchOms();
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOms = async () => {
    const { data, error } = await supabase.from('oms').select('*').order('createdat', { ascending: false });
    if (data) {
      const formattedData = data.map(dbOm => ({
        id: dbOm.id,
        title: dbOm.title || '',
        sectors: dbOm.sector ? dbOm.sector.split(', ').filter(Boolean) : [],
        assignees: dbOm.assignee ? dbOm.assignee.split(', ').filter(Boolean) : [],
        objective: dbOm.objective || 'Manutenção',
        criticality: dbOm.criticality || 'Programada',
        observation: dbOm.observation || '',
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
  // ---------------------------

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

  const formatClockTime = (ms) => {
    if (!ms) return '--:--';
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => new Date(isoString).toLocaleDateString('pt-BR');

  const exportToExcel = async () => {
    try {
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Falha ao carregar a biblioteca Excel'));
          document.head.appendChild(script);
        });
      }
      const XLSX = window.XLSX;
      const headers = ['Código', 'Data Criação', 'Descrição', 'Objetivo', 'Criticidade', 'Observação', 'Setor', 'Responsável', 'Produtos', 'Status', 'Tempo Executado'];
      const rows = [];

      oms.forEach(om => {
        const date = formatDate(om.createdAt);
        const productsStr = om.products.map(p => `${p.quantity}x ${p.name}`).join(' | ');
        const statusPt = om.status === 'pending' ? 'Pendente' : 
                         om.status === 'in_progress' ? 'Em Andamento' : 
                         om.status === 'paused' ? 'Pausado' : 'Concluído';

        if (om.timeLogs && om.timeLogs.length > 0) {
          om.timeLogs.forEach(log => {
            const logTimeMs = log.end ? (log.end - log.start) : (currentTime - log.start);
            const logTimeStr = formatTime(logTimeMs);
            const sessionProduct = log.product ? `${log.quantity}x ${log.product}` : productsStr;
            
            rows.push([
              om.id, date, om.title, om.objective, om.criticality, om.observation || '',
              log.sector || '-', log.worker || '-', sessionProduct, statusPt, logTimeStr
            ]);
          });
        } else {
          rows.push([
            om.id, date, om.title, om.objective, om.criticality, om.observation || '',
            om.sectors.join(', ') || '-', om.assignees.join(', ') || '-', productsStr, statusPt, '00:00:00'
          ]);
        }
      });

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "RelatorioProducao");
      
      const wscols = headers.map(() => ({ wch: 20 }));
      worksheet['!cols'] = wscols;

      XLSX.writeFile(workbook, `Relatorio_Producao_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
    } catch (error) {
      console.error("Erro ao gerar Excel:", error);
      alert("Não foi possível carregar o exportador Excel no momento. Tente novamente.");
    }
  };

  const handleStartClick = (id) => {
    const om = oms.find(o => o.id === id);
    setOmToStart(om);
    setActionWorker('');
    setActionSector('');
    setActionProduct(om.products && om.products.length > 0 ? om.products[0].name : '');
    setActionQty(1);
  };

  const confirmStartAction = (e) => {
    e.preventDefault();
    if (!omToStart || !actionWorker || !actionSector) return;

    const om = oms.find(o => o.id === omToStart.id);
    const newAssignees = !om.assignees.includes(actionWorker) ? [...om.assignees, actionWorker].join(', ') : om.assignees.join(', ');
    const newSectors = !om.sectors.includes(actionSector) ? [...om.sectors, actionSector].join(', ') : om.sectors.join(', ');
    
    const newLogs = [...om.timeLogs, { 
      start: Date.now(), 
      end: null, 
      worker: actionWorker, 
      sector: actionSector,
      product: actionProduct,
      quantity: Number(actionQty)
    }];

    updateOmInDatabase(om.id, { status: 'in_progress', assignee: newAssignees, sector: newSectors, timelogs: newLogs });
    setOmToStart(null);
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

  const handleCreateOM = async (e) => {
    e.preventDefault();
    if (!newTitle) return;

    const currentMaxId = oms.length > 0 
      ? Math.max(...oms.map(o => parseInt(o.id.replace('OM-', '')) || 0))
      : 1000;
    const newId = `OM-${currentMaxId + 1}`;

    const insertData = {
      id: newId,
      title: newTitle,
      sector: newSector,
      assignee: '',
      objective: newObjective,
      criticality: newCriticality,
      observation: newObservation,
      products: newProducts,
      status: 'pending',
      timelogs: []
    };

    const { error } = await supabase.from('oms').insert([insertData]);

    if (!error) {
      fetchOms();
      setIsModalOpen(false);
      setNewTitle('');
      setNewObservation('');
      setNewProducts([]);
      setNewObjective('Manutenção');
      setNewCriticality('Programada');
    } else {
      alert("Erro ao salvar: " + error.message);
    }
  };

  // Funções de Gerenciamento da OM (Modal Atualizar)
  // Como são atualizações diretas, usamos o banco e o fetchOms atualiza a tela
  const handleAddDataToOm = async (type) => {
    if (!omToUpdate) return;
    const om = oms.find(o => o.id === omToUpdate.id);
    let updates = {};

    if (type === 'worker' && manageSelectedWorker && !om.assignees.includes(manageSelectedWorker)) {
      updates.assignee = [...om.assignees, manageSelectedWorker].join(', ');
    }
    if (type === 'sector' && manageSelectedSector && !om.sectors.includes(manageSelectedSector)) {
      updates.sector = [...om.sectors, manageSelectedSector].join(', ');
    }
    if (type === 'product' && manageSelectedProduct && manageSelectedQty > 0) {
      const existing = om.products.find(p => p.name === manageSelectedProduct);
      let newProducts;
      if (existing) {
        newProducts = om.products.map(p => p.name === manageSelectedProduct ? { ...p, quantity: p.quantity + Number(manageSelectedQty) } : p);
      } else {
        newProducts = [...om.products, { name: manageSelectedProduct, quantity: Number(manageSelectedQty) }];
      }
      updates.products = newProducts;
    }

    if (Object.keys(updates).length > 0) {
      await updateOmInDatabase(om.id, updates);
      // Força a atualização do modal local para evitar fechamento
      setOmToUpdate(prev => ({...prev, ...updates, 
        assignees: updates.assignee ? updates.assignee.split(', ') : prev.assignees,
        sectors: updates.sector ? updates.sector.split(', ') : prev.sectors
      }));
    }

    setManageSelectedWorker('');
    setManageSelectedSector('');
    setManageSelectedQty(1);
  };

  const handleRemoveDataFromOm = async (omId, type, itemToRemove) => {
    const om = oms.find(o => o.id === omId);
    let updates = {};

    if (type === 'worker') updates.assignee = om.assignees.filter(w => w !== itemToRemove).join(', ');
    if (type === 'sector') updates.sector = om.sectors.filter(s => s !== itemToRemove).join(', ');
    if (type === 'product') updates.products = om.products.filter(p => p.name !== itemToRemove);

    await updateOmInDatabase(omId, updates);
    setOmToUpdate(prev => ({...prev, ...updates,
        assignees: updates.assignee !== undefined ? (updates.assignee ? updates.assignee.split(', ') : []) : prev.assignees,
        sectors: updates.sector !== undefined ? (updates.sector ? updates.sector.split(', ') : []) : prev.sectors
    }));
  };

  const updateProductQtyInOm = async (omId, productName, newQty) => {
    if(newQty < 1) return;
    const om = oms.find(o => o.id === omId);
    const newProducts = om.products.map(p => p.name === productName ? { ...p, quantity: Number(newQty) } : p);
    
    await updateOmInDatabase(omId, { products: newProducts });
    setOmToUpdate(prev => ({...prev, products: newProducts}));
  };

  const filteredOms = oms.filter(om => {
    const searchLower = search.toLowerCase();
    const searchableText = [
      om.title, om.id, om.objective, om.criticality, om.observation,
      ...om.assignees, ...om.sectors, ...om.products.map(p => p.name)
    ].join(' ').toLowerCase();

    const matchesSearch = searchableText.includes(searchLower);
    
    if (filter === 'Todas') return matchesSearch;
    if (filter === 'Pendentes') return om.status === 'pending' && matchesSearch;
    if (filter === 'Em Andamento') return (om.status === 'in_progress' || om.status === 'paused') && matchesSearch;
    if (filter === 'Concluídas') return om.status === 'completed' && matchesSearch;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'oms' ? (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
              <div className="flex items-center bg-white p-2 rounded-lg shadow-sm border border-gray-200 w-full md:w-auto">
                <Search size={20} className="text-gray-400 ml-2" />
                <input 
                  type="text" 
                  placeholder="Buscar por código, título, observação..." 
                  className="bg-transparent border-none focus:ring-0 outline-none ml-2 w-full md:w-80 text-sm"
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
                      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">
                              {om.id}
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium flex items-center">
                              <CalendarDays size={12} className="mr-1"/> {formatDate(om.createdAt)}
                            </span>
                          </div>
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

                      <div className="p-4 flex-grow space-y-4">
                        {om.observation && (
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100/50">
                            <p className="text-xs font-bold text-amber-800 mb-1 flex items-center">
                              <AlignLeft size={14} className="mr-1"/> Observações
                            </p>
                            <p className="text-sm text-gray-700 italic">{om.observation}</p>
                          </div>
                        )}

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

                        <div className="space-y-2">
                          <div className="flex items-start">
                            <Wrench size={16} className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                            <div className="text-sm text-gray-600 flex flex-wrap gap-1">
                              {om.sectors.length > 0 ? om.sectors.map(s => (
                                <span key={s} className="bg-gray-100 px-2 py-0.5 rounded text-xs border border-gray-200">{s}</span>
                              )) : <span className="text-gray-400 italic">Nenhum setor alocado</span>}
                            </div>
                          </div>
                          
                          <div className="flex items-start pt-1">
                            <Users size={16} className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                            <div className="text-sm text-gray-600 flex flex-wrap gap-1 items-center w-full">
                              {om.assignees.length > 0 ? om.assignees.map(a => (
                                <span key={a} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-100">{a}</span>
                              )) : <span className="text-gray-400 italic">Sem responsável</span>}
                              
                              {om.status !== 'completed' && (
                                <button 
                                  onClick={() => { setOmToUpdate(om); setIsModalOpen(false); }}
                                  className="ml-auto text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center bg-white border border-slate-200 px-2 py-1 rounded shadow-sm"
                                >
                                  <Edit size={12} className="mr-1"/> Atualizar Dados
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {om.timeLogs.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Histórico de Ações</p>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                              {om.timeLogs.map((log, idx) => (
                                <div key={idx} className="bg-white border border-gray-200 p-2 rounded text-xs text-gray-600 shadow-sm">
                                  <div className="flex items-center text-blue-700 font-medium mb-1">
                                    <Play size={10} className="mr-1"/> Iniciado/Retomado
                                  </div>
                                  <div className="pl-3 mb-1">
                                    {formatClockTime(log.start)} por <strong>{log.worker}</strong> ({log.sector})
                                    {log.product && <div className="text-orange-600 mt-0.5 font-medium">↳ {log.quantity}x {log.product}</div>}
                                  </div>
                                  {log.end && (
                                    <>
                                      <div className="flex items-center text-orange-600 font-medium mb-1 pt-1 border-t border-gray-50">
                                        <Pause size={10} className="mr-1"/> Pausado/Finalizado
                                      </div>
                                      <div className="pl-3">
                                        {formatClockTime(log.end)}
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
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

                      <div className="p-4 bg-gray-50 border-t border-gray-200 flex space-x-2">
                        {om.status === 'pending' && (
                          <button 
                            onClick={() => handleStartClick(om.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-md font-bold flex justify-center items-center transition-all shadow-sm"
                          >
                            <Play size={18} className="mr-2" /> INICIAR
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
                              onClick={() => handleStartClick(om.id)}
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <FileText className="mr-2 text-slate-600" /> Relatório Detalhado de Produção
                </h3>
                <button 
                  onClick={exportToExcel}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-bold text-sm flex items-center transition-colors shadow-sm"
                >
                  <Download size={16} className="mr-2" /> Exportar Planilha XLSX
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
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
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Observações Adicionais</label>
                <textarea 
                  value={newObservation} 
                  onChange={(e) => setNewObservation(e.target.value)}
                  placeholder="Detalhes, alertas, localizações..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none h-20 resize-none"
                />
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

      {/* MODAL: INICIAR / RETOMAR OM (Identificação de Usuário/Setor) */}
      {omToStart && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="bg-blue-600 text-white p-4 flex items-center shrink-0">
              <Play className="mr-2" size={20}/>
              <h2 className="text-lg font-bold">{omToStart.status === 'paused' ? 'Retomar Produção' : 'Iniciar Produção'}</h2>
            </div>
            <form onSubmit={confirmStartAction} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Para prosseguir com a OM <strong>{omToStart.id}</strong>, informe seus dados para o registro de tempo:
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Colaborador</label>
                <select required value={actionWorker} onChange={(e) => setActionWorker(e.target.value)} className="w-full border border-gray-300 rounded p-2 outline-none focus:border-blue-500">
                  <option value="" disabled>Selecione seu nome...</option>
                  {MOCK_WORKERS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Setor Atual</label>
                <select required value={actionSector} onChange={(e) => setActionSector(e.target.value)} className="w-full border border-gray-300 rounded p-2 outline-none focus:border-blue-500">
                  <option value="" disabled>Selecione o setor...</option>
                  {MOCK_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {omToStart.products && omToStart.products.length > 0 && (
                <div className="flex space-x-2 bg-orange-50 p-3 rounded-lg border border-orange-100 mt-2">
                  <div className="flex-grow">
                    <label className="block text-xs font-bold text-orange-800 uppercase mb-1">Produto Alvo (Sessão)</label>
                    <select value={actionProduct} onChange={(e) => setActionProduct(e.target.value)} className="w-full border border-orange-200 rounded p-2 outline-none focus:border-orange-500 text-sm bg-white">
                      <option value="">Nenhum específico</option>
                      {omToStart.products.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-bold text-orange-800 uppercase mb-1">Qtd</label>
                    <input type="number" min="1" value={actionQty} onChange={(e) => setActionQty(e.target.value)} className="w-full border border-orange-200 rounded p-2 outline-none focus:border-orange-500 text-sm" />
                  </div>
                </div>
              )}

              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setOmToStart(null)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded font-bold transition-colors">Cancelar</button>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded font-bold transition-colors shadow-sm">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ATUALIZAR DADOS DA OM (Setores, Pessoas, Quantidades) */}
      {omToUpdate && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-700 text-white p-4 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center"><Edit className="mr-2" size={20}/> Atualizar Dados da OM</h2>
              <button onClick={() => setOmToUpdate(null)} className="text-slate-300 hover:text-white transition-colors">✕</button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="text-sm text-gray-600 border-b pb-3">
                Editando informações da ordem: <strong className="text-gray-900">{omToUpdate.id}</strong>
              </div>

              {/* Gestão de Produtos e Quantidades */}
              <div>
                <h3 className="text-xs font-bold text-orange-600 uppercase mb-2 flex items-center border-b pb-1"><Package size={14} className="mr-1"/> Produtos & Quantidades</h3>
                
                <div className="flex space-x-2 mb-3 mt-2">
                  <select value={manageSelectedProduct} onChange={(e) => setManageSelectedProduct(e.target.value)} className="flex-grow border border-gray-300 rounded p-1.5 text-xs outline-none">
                    {MOCK_PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="number" min="1" value={manageSelectedQty} onChange={(e) => setManageSelectedQty(e.target.value)} className="w-16 border border-gray-300 rounded p-1.5 text-xs outline-none" placeholder="Qtd"/>
                  <button onClick={() => handleAddDataToOm('product')} className="bg-orange-500 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-orange-600">Adicionar</button>
                </div>

                <div className="space-y-1 mt-2">
                  {omToUpdate.products.map(p => (
                    <div key={p.name} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-2 rounded text-sm">
                      <span className="font-medium text-gray-700">{p.name}</span>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="number" min="1" 
                          value={p.quantity} 
                          onChange={(e) => updateProductQtyInOm(omToUpdate.id, p.name, e.target.value)}
                          className="w-16 border border-gray-300 rounded p-1 text-center font-bold text-orange-600 outline-none focus:border-orange-400"
                        />
                        <button onClick={() => handleRemoveDataFromOm(omToUpdate.id, 'product', p.name)} className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                  {omToUpdate.products.length === 0 && <p className="text-xs text-gray-400 italic">Sem produtos.</p>}
                </div>
              </div>

              {/* Gestão de Colaboradores */}
              <div>
                <h3 className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center border-b pb-1"><Users size={14} className="mr-1"/> Colaboradores Responsáveis</h3>
                <div className="flex space-x-2 mb-3 mt-2">
                  <select value={manageSelectedWorker} onChange={(e) => setManageSelectedWorker(e.target.value)} className="flex-grow border border-gray-300 rounded p-1.5 text-xs outline-none">
                    <option value="">Selecione um Colaborador...</option>
                    {MOCK_WORKERS.filter(w => !omToUpdate.assignees.includes(w)).map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <button onClick={() => handleAddDataToOm('worker')} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700">Incluir</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {omToUpdate.assignees.map(a => (
                    <span key={a} className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-2 py-1 rounded flex items-center">
                      {a} <button onClick={() => handleRemoveDataFromOm(omToUpdate.id, 'worker', a)} className="ml-2 text-blue-400 hover:text-red-500">✕</button>
                    </span>
                  ))}
                  {omToUpdate.assignees.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum responsável.</p>}
                </div>
              </div>

              {/* Gestão de Setores */}
              <div>
                <h3 className="text-xs font-bold text-gray-600 uppercase mb-2 flex items-center border-b pb-1"><Wrench size={14} className="mr-1"/> Setores Envolvidos</h3>
                <div className="flex space-x-2 mb-3 mt-2">
                  <select value={manageSelectedSector} onChange={(e) => setManageSelectedSector(e.target.value)} className="flex-grow border border-gray-300 rounded p-1.5 text-xs outline-none">
                    <option value="">Selecione um Setor...</option>
                    {MOCK_SECTORS.filter(s => !omToUpdate.sectors.includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => handleAddDataToOm('sector')} className="bg-slate-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-700">Incluir</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {omToUpdate.sectors.map(s => (
                    <span key={s} className="bg-gray-100 border border-gray-300 text-gray-700 text-xs px-2 py-1 rounded flex items-center">
                      {s} <button onClick={() => handleRemoveDataFromOm(omToUpdate.id, 'sector', s)} className="ml-2 text-gray-400 hover:text-red-500">✕</button>
                    </span>
                  ))}
                  {omToUpdate.sectors.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum setor.</p>}
                </div>
              </div>

              <button onClick={() => setOmToUpdate(null)} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-colors shadow-sm">
                Concluir Edição
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