import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Wrench, 
  User, 
  Factory,
  Search,
  BarChart3,
  ListTodo,
  ChevronDown,
  ChevronUp,
  FileText,
  CalendarDays
} from 'lucide-react';

// Dados iniciais simulando o banco de dados da Mais Escoramentos
const initialOMs = [
  {
    id: 'OM-1001',
    title: 'Solda e recuperação de Escoras Metálicas (Lote A)',
    sector: 'Soldagem',
    assignee: 'Carlos Silva',
    status: 'pending', // pending, in_progress, paused, completed
    timeLogs: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'OM-1002',
    title: 'Pintura de Andaimes Tubulares',
    sector: 'Pintura',
    assignee: 'Roberto Gomes',
    status: 'paused',
    timeLogs: [
      { start: Date.now() - 3600000, end: Date.now() - 1800000 } // Trabalhou 30 min e pausou
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'OM-1003',
    title: 'Inspeção e lubrificação de forcados',
    sector: 'Manutenção Geral',
    assignee: 'Ana Costa',
    status: 'in_progress',
    timeLogs: [
      { start: Date.now() - 1200000, end: null } // Trabalhando há 20 min
    ],
    createdAt: new Date().toISOString(),
  }
];

export default function App() {
  const [oms, setOms] = useState(initialOMs);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('Todas');
  const [search, setSearch] = useState('');

  // Novos estados adicionados
  const [currentView, setCurrentView] = useState('oms'); // 'oms' ou 'dashboard'
  const [omToFinish, setOmToFinish] = useState(null); // Para o modal de confirmação
  const [expandedDashOm, setExpandedDashOm] = useState(null); // Para expandir detalhes na tabela do dash

  // Estados para o formulário de nova OM
  const [newTitle, setNewTitle] = useState('');
  const [newSector, setNewSector] = useState('Soldagem');
  const [newAssignee, setNewAssignee] = useState('');

  // Atualiza o relógio a cada segundo para re-renderizar os cronômetros das OMs em andamento
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Função para calcular o tempo total gasto em uma OM em milissegundos
  const calculateTotalTime = (timeLogs) => {
    let total = 0;
    timeLogs.forEach(log => {
      if (log.end) {
        total += (log.end - log.start);
      } else {
        total += (currentTime - log.start);
      }
    });
    return total;
  };

  // Formata milissegundos para HH:MM:SS
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Nova função para formatar hora do relógio (Ex: 14:30)
  const formatClockTime = (ms) => {
    if (!ms) return '--:--';
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Função para formatar data (Ex: 25/10/2023)
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR');
  };

  // Ações do Colaborador
  const handleStart = (id) => {
    setOms(oms.map(om => {
      if (om.id === id) {
        return {
          ...om,
          status: 'in_progress',
          timeLogs: [...om.timeLogs, { start: Date.now(), end: null }]
        };
      }
      return om;
    }));
  };

  const handlePause = (id) => {
    setOms(oms.map(om => {
      if (om.id === id) {
        const updatedLogs = [...om.timeLogs];
        const lastLog = updatedLogs[updatedLogs.length - 1];
        if (lastLog && !lastLog.end) {
          lastLog.end = Date.now();
        }
        return { ...om, status: 'paused', timeLogs: updatedLogs };
      }
      return om;
    }));
  };

  const handleFinishClick = (id) => {
    setOmToFinish(id); // Abre o modal em vez de usar window.confirm
  };

  const confirmFinish = () => {
    if (!omToFinish) return;
    
    setOms(oms.map(om => {
      if (om.id === omToFinish) {
        const updatedLogs = [...om.timeLogs];
        const lastLog = updatedLogs[updatedLogs.length - 1];
        // Se estava rodando, fecha o tempo atual
        if (lastLog && !lastLog.end) {
          lastLog.end = Date.now();
        }
        return { ...om, status: 'completed', timeLogs: updatedLogs };
      }
      return om;
    }));
    setOmToFinish(null);
  };

  const handleCreateOM = (e) => {
    e.preventDefault();
    if (!newTitle || !newAssignee) return;

    const newOM = {
      id: `OM-${1000 + oms.length + 1}`,
      title: newTitle,
      sector: newSector,
      assignee: newAssignee,
      status: 'pending',
      timeLogs: [],
      createdAt: new Date().toISOString(),
    };

    setOms([newOM, ...oms]);
    setIsModalOpen(false);
    setNewTitle('');
    setNewAssignee('');
    setNewSector('Soldagem');
  };

  // Filtros
  const filteredOms = oms.filter(om => {
    const matchesSearch = om.title.toLowerCase().includes(search.toLowerCase()) || 
                          om.assignee.toLowerCase().includes(search.toLowerCase()) ||
                          om.id.toLowerCase().includes(search.toLowerCase());
    if (filter === 'Todas') return matchesSearch;
    if (filter === 'Pendentes') return om.status === 'pending' && matchesSearch;
    if (filter === 'Em Andamento') return (om.status === 'in_progress' || om.status === 'paused') && matchesSearch;
    if (filter === 'Concluídas') return om.status === 'completed' && matchesSearch;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-500 p-2 rounded-lg">
              <Wrench size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Mais Escoramentos</h1>
              <p className="text-xs text-blue-200">Gestão de Ordens de Manutenção</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-blue-800 p-1 rounded-lg">
            <button 
              onClick={() => setCurrentView('oms')}
              className={`px-4 py-2 rounded-md font-medium flex items-center transition-colors ${currentView === 'oms' ? 'bg-white text-blue-900 shadow' : 'text-blue-100 hover:text-white'}`}
            >
              <ListTodo size={18} className="mr-2" />
              Ordens
            </button>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-2 rounded-md font-medium flex items-center transition-colors ${currentView === 'dashboard' ? 'bg-white text-blue-900 shadow' : 'text-blue-100 hover:text-white'}`}
            >
              <BarChart3 size={18} className="mr-2" />
              Dashboard
            </button>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium flex items-center transition-colors shadow-sm"
          >
            <Plus size={18} className="mr-2" />
            Nova OM
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
                  placeholder="Buscar por código, título ou nome..." 
                  className="bg-transparent border-none focus:ring-0 outline-none ml-2 w-full md:w-64 text-sm"
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
                      filter === f 
                        ? 'bg-blue-100 text-blue-800 border-blue-200 border' 
                        : 'bg-white text-gray-600 border-gray-200 border hover:bg-gray-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashboard Stats (Resumo na tela principal) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-gray-400">
                <p className="text-sm text-gray-500 mb-1">Pendentes</p>
                <p className="text-2xl font-bold text-gray-800">{oms.filter(o => o.status === 'pending').length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                <p className="text-sm text-gray-500 mb-1">Em Andamento</p>
                <p className="text-2xl font-bold text-blue-600">{oms.filter(o => o.status === 'in_progress').length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-orange-400">
                <p className="text-sm text-gray-500 mb-1">Pausadas</p>
                <p className="text-2xl font-bold text-orange-500">{oms.filter(o => o.status === 'paused').length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
                <p className="text-sm text-gray-500 mb-1">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{oms.filter(o => o.status === 'completed').length}</p>
              </div>
            </div>

            {/* OM Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOms.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  Nenhuma Ordem de Manutenção encontrada com os filtros atuais.
                </div>
              ) : (
                filteredOms.map(om => {
                  const totalTime = calculateTotalTime(om.timeLogs);
                  const formattedTime = formatTime(totalTime);

                  return (
                    <div key={om.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-all hover:shadow-md">
                      {/* Card Header */}
                      <div className={`p-4 border-b ${
                        om.status === 'completed' ? 'bg-green-50' : 
                        om.status === 'in_progress' ? 'bg-blue-50' : 
                        om.status === 'paused' ? 'bg-orange-50' : 'bg-gray-50'
                      }`}>
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
                            {om.id}
                          </span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            om.status === 'pending' ? 'bg-gray-200 text-gray-700' :
                            om.status === 'in_progress' ? 'bg-blue-200 text-blue-800 animate-pulse' :
                            om.status === 'paused' ? 'bg-orange-200 text-orange-800' :
                            'bg-green-200 text-green-800'
                          }`}>
                            {om.status === 'pending' && 'Pendente'}
                            {om.status === 'in_progress' && 'Em Andamento'}
                            {om.status === 'paused' && 'Pausado'}
                            {om.status === 'completed' && 'Concluído'}
                          </span>
                        </div>
                        <h3 className="mt-3 font-semibold text-gray-800 leading-tight">
                          {om.title}
                        </h3>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 flex-grow space-y-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Factory size={16} className="mr-2 text-gray-400" />
                          {om.sector}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <User size={16} className="mr-2 text-gray-400" />
                          {om.assignee}
                        </div>
                        
                        {/* Timer Display */}
                        <div className={`mt-4 p-3 rounded-lg flex flex-col justify-center ${
                          om.status === 'in_progress' ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-800'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Clock size={18} className="mr-2" />
                              <span className="text-sm font-medium">Tempo Gasto:</span>
                            </div>
                            <span className="font-mono font-bold text-lg tracking-wider">
                              {formattedTime}
                            </span>
                          </div>
                          
                          {/* Histórico de Apontamentos */}
                          {om.timeLogs.length > 0 && (
                            <div className={`mt-3 pt-3 border-t text-xs space-y-1 ${om.status === 'in_progress' ? 'border-blue-700 text-blue-200' : 'border-gray-200 text-gray-500'}`}>
                              <p className="font-semibold mb-1">Registro de Horários:</p>
                              {om.timeLogs.map((log, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span>Início: {formatClockTime(log.start)}</span>
                                  <span>Fim: {log.end ? formatClockTime(log.end) : 'Rodando...'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="p-4 bg-gray-50 border-t border-gray-100 flex space-x-2">
                        {om.status === 'pending' && (
                          <button 
                            onClick={() => handleStart(om.id)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium flex justify-center items-center transition-colors"
                          >
                            <Play size={18} className="mr-2" /> Iniciar
                          </button>
                        )}

                        {om.status === 'in_progress' && (
                          <>
                            <button 
                              onClick={() => handlePause(om.id)}
                              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-md font-medium flex justify-center items-center transition-colors"
                            >
                              <Pause size={18} className="mr-2" /> Pausar
                            </button>
                            <button 
                              onClick={() => handleFinishClick(om.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-medium flex justify-center items-center transition-colors"
                            >
                              <CheckCircle2 size={18} className="mr-2" /> Finalizar
                            </button>
                          </>
                        )}

                        {om.status === 'paused' && (
                          <>
                            <button 
                              onClick={() => handleStart(om.id)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium flex justify-center items-center transition-colors"
                            >
                              <Play size={18} className="mr-2" /> Retomar
                            </button>
                            <button 
                              onClick={() => handleFinishClick(om.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-medium flex justify-center items-center transition-colors"
                            >
                              <CheckCircle2 size={18} className="mr-2" /> Finalizar
                            </button>
                          </>
                        )}

                        {om.status === 'completed' && (
                          <div className="w-full text-center text-sm font-medium text-green-700 flex items-center justify-center py-2">
                            <CheckCircle2 size={18} className="mr-2" />
                            Manutenção Finalizada
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <BarChart3 className="mr-3 text-orange-500" /> Dashboard de Produtividade
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-gray-500 text-sm font-medium mb-2">Total de OMs</h3>
                <p className="text-3xl font-bold text-gray-800">{oms.length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-gray-500 text-sm font-medium mb-2">OMs Concluídas</h3>
                <p className="text-3xl font-bold text-green-600">{oms.filter(o => o.status === 'completed').length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-gray-500 text-sm font-medium mb-2">Taxa de Conclusão</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {oms.length > 0 ? Math.round((oms.filter(o => o.status === 'completed').length / oms.length) * 100) : 0}%
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-gray-500 text-sm font-medium mb-2">Tempo Total Registrado</h3>
                <p className="text-3xl font-bold text-orange-500">
                  {formatTime(oms.reduce((acc, om) => acc + calculateTotalTime(om.timeLogs), 0))}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Tempo por Setor */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Tempo Investido por Setor</h3>
                <div className="space-y-4">
                  {['Soldagem', 'Pintura', 'Mecânica', 'Montagem', 'Manutenção Geral'].map(sector => {
                    const sectorOms = oms.filter(o => o.sector === sector);
                    const sectorTime = sectorOms.reduce((acc, om) => acc + calculateTotalTime(om.timeLogs), 0);
                    const totalTime = oms.reduce((acc, om) => acc + calculateTotalTime(om.timeLogs), 0);
                    const percentage = totalTime > 0 ? (sectorTime / totalTime) * 100 : 0;
                    
                    if (sectorTime === 0) return null;

                    return (
                      <div key={sector}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{sector}</span>
                          <span className="text-gray-500">{formatTime(sectorTime)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                  {oms.reduce((acc, om) => acc + calculateTotalTime(om.timeLogs), 0) === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Nenhum tempo registrado ainda.</p>
                  )}
                </div>
              </div>

              {/* Status Geral */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Status Geral das OMs</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Em Andamento', count: oms.filter(o => o.status === 'in_progress').length, color: 'bg-blue-500' },
                    { label: 'Pausadas', count: oms.filter(o => o.status === 'paused').length, color: 'bg-orange-500' },
                    { label: 'Pendentes', count: oms.filter(o => o.status === 'pending').length, color: 'bg-gray-400' },
                    { label: 'Concluídas', count: oms.filter(o => o.status === 'completed').length, color: 'bg-green-500' }
                  ].map(stat => (
                    <div key={stat.label} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${stat.color} mr-3`}></div>
                        <span className="text-gray-700">{stat.label}</span>
                      </div>
                      <span className="font-bold text-gray-800">{stat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Relatório Detalhado (NOVO) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <FileText className="mr-2 text-blue-600" /> Relatório Detalhado de Manutenções
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wider">
                      <th className="p-4 font-semibold">Código / Data</th>
                      <th className="p-4 font-semibold">Descrição</th>
                      <th className="p-4 font-semibold">Responsável</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Tempo de Execução</th>
                      <th className="p-4 font-semibold text-center">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {oms.map(om => {
                      const totalTime = calculateTotalTime(om.timeLogs);
                      const isExpanded = expandedDashOm === om.id;
                      
                      return (
                        <React.Fragment key={om.id}>
                          <tr 
                            className={`hover:bg-blue-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50' : ''}`}
                            onClick={() => setExpandedDashOm(isExpanded ? null : om.id)}
                          >
                            <td className="p-4">
                              <div className="font-bold text-gray-800">{om.id}</div>
                              <div className="text-xs text-gray-500 flex items-center mt-1">
                                <CalendarDays size={12} className="mr-1"/> {formatDate(om.createdAt)}
                              </div>
                            </td>
                            <td className="p-4 font-medium text-gray-800">{om.title}</td>
                            <td className="p-4 text-gray-600">
                              <div className="flex items-center">
                                <User size={14} className="mr-1 text-gray-400"/> {om.assignee}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{om.sector}</div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold inline-block ${
                                om.status === 'pending' ? 'bg-gray-200 text-gray-700' :
                                om.status === 'in_progress' ? 'bg-blue-200 text-blue-800' :
                                om.status === 'paused' ? 'bg-orange-200 text-orange-800' :
                                'bg-green-200 text-green-800'
                              }`}>
                                {om.status === 'pending' && 'Pendente'}
                                {om.status === 'in_progress' && 'Em Andamento'}
                                {om.status === 'paused' && 'Pausado'}
                                {om.status === 'completed' && 'Concluído'}
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-blue-600 text-base">
                              {formatTime(totalTime)}
                            </td>
                            <td className="p-4 text-center">
                              <button className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-white shadow-sm">
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </button>
                            </td>
                          </tr>
                          
                          {/* Detalhes Expandidos (Histórico de Tempo da Tabela) */}
                          {isExpanded && (
                            <tr className="bg-blue-50/50 border-b-2 border-blue-100">
                              <td colSpan="6" className="p-0">
                                <div className="p-6 py-5">
                                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                                    <Clock size={16} className="mr-2 text-blue-500"/> Histórico de Sessões de Trabalho
                                  </h4>
                                  {om.timeLogs.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">Nenhum tempo apontado para esta manutenção ainda.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                      {om.timeLogs.map((log, idx) => {
                                        const logDuration = log.end ? (log.end - log.start) : (currentTime - log.start);
                                        return (
                                          <div key={idx} className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm flex flex-col hover:border-blue-300 transition-colors">
                                            <span className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wider">Sessão {idx + 1}</span>
                                            <div className="flex justify-between text-sm mb-1">
                                              <span className="text-gray-500">Início:</span>
                                              <strong className="text-gray-800">{formatClockTime(log.start)}</strong>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                              <span className="text-gray-500">Fim:</span>
                                              <strong className="text-gray-800">{log.end ? formatClockTime(log.end) : 'Rodando...'}</strong>
                                            </div>
                                            <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                                              <span className="text-gray-500">Duração</span>
                                              <span className="font-mono font-bold text-blue-600 text-sm">{formatTime(logDuration)}</span>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Nova OM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">Criar Nova Ordem de Manutenção</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-blue-200 hover:text-white">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateOM} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Serviço</label>
                <input 
                  type="text" 
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Troca de roldanas do andaime..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Setor</label>
                <select 
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="Soldagem">Soldagem</option>
                  <option value="Pintura">Pintura</option>
                  <option value="Mecânica">Mecânica</option>
                  <option value="Montagem">Montagem</option>
                  <option value="Manutenção Geral">Manutenção Geral</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador Responsável</label>
                <input 
                  type="text" 
                  required
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  placeholder="Nome do funcionário"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  Criar OM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Finalização */}
      {omToFinish && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Finalizar Manutenção?</h2>
            <p className="text-gray-600 mb-6 text-sm">
              Tem certeza que deseja finalizar esta Ordem de Manutenção? O tempo total será consolidado e não poderá ser alterado.
            </p>
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => setOmToFinish(null)}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors w-full"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmFinish}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors w-full"
              >
                Sim, Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}