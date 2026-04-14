import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase'; // MANTENDO A CONEXÃO COM O SUPABASE!
import { 
  Play, Pause, CheckCircle2, Clock, Plus, Wrench, User, Factory,
  Search, BarChart3, ListTodo, ChevronDown, ChevronUp, FileText,
  CalendarDays, AlertTriangle, Package, Settings, Users, ArrowRightLeft, Target, Trash2, Download, AlignLeft, Edit, Upload, FileSpreadsheet
} from 'lucide-react';

export default function App() {
  const [oms, setOms] = useState([]); 
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('Todas');
  const [search, setSearch] = useState('');

  const [currentView, setCurrentView] = useState('oms'); 
  const [omToFinish, setOmToFinish] = useState(null);
  const [omToDelete, setOmToDelete] = useState(null);
  const [expandedCards, setExpandedCards] = useState([]);
  
  // --- ESTADOS DE CONFIGURAÇÃO (Listas Dinâmicas puxadas do banco) ---
  const [products, setProducts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [sectors, setSectors] = useState([]);

  const [newProductInput, setNewProductInput] = useState('');
  const [newWorkerInput, setNewWorkerInput] = useState('');
  const [newSectorInput, setNewSectorInput] = useState('');
  const fileInputRef = useRef(null); 

  // Update/Manage OM State
  const [omToUpdate, setOmToUpdate] = useState(null);
  const [manageSelectedWorker, setManageSelectedWorker] = useState('');
  const [manageSelectedWorkerCode, setManageSelectedWorkerCode] = useState('');
  const [manageSelectedSector, setManageSelectedSector] = useState('');
  const [manageSelectedProduct, setManageSelectedProduct] = useState('');
  const [manageSelectedQty, setManageSelectedQty] = useState(1);

  // States for Start/Resume Action
  const [omToStart, setOmToStart] = useState(null);
  const [actionWorker, setActionWorker] = useState('');
  const [actionWorkerCode, setActionWorkerCode] = useState('');
  const [actionSector, setActionSector] = useState('');
  const [actionProduct, setActionProduct] = useState('');
  const [actionQty, setActionQty] = useState(1);

  // States para Nova OM
  const [newTitle, setNewTitle] = useState('');
  const [newObjective, setNewObjective] = useState('Manutenção');
  const [newCriticality, setNewCriticality] = useState('Programada');
  const [newObservation, setNewObservation] = useState('');
  const [newSector, setNewSector] = useState('');
  
  // States para Produtos da Nova OM
  const [newProducts, setNewProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState('');
  const [currentQty, setCurrentQty] = useState(1);

  // --- INTEGRAÇÃO SUPABASE & SYNC ---
  useEffect(() => {
    fetchOms();
    fetchSettings();
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (data) {
      setProducts(data.products || []);
      setSectors(data.sectors || []);
      setWorkers(data.workers || []);
    }
  };

  const saveSettingsToSupabase = async (newProducts, newSectors, newWorkers) => {
    const { error } = await supabase.from('settings').upsert([
      { id: 1, products: newProducts, sectors: newSectors, workers: newWorkers }
    ]);
    if (error) {
      console.error("Erro ao salvar configurações na nuvem:", error);
      alert("⚠️ ERRO AO SALVAR NA NUVEM!\nO Supabase bloqueou o envio. Verifique se você criou a política RLS (Liberar tudo) para a tabela 'settings'.");
    }
  };

  const fetchOms = async () => {
    try {
      const { data, error } = await supabase.from('oms').select('*');
      if (data && !error) {
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
          createdAt: dbOm.createdat || dbOm.created_at || new Date().toISOString()
        }));
        
        formattedData.sort((a, b) => {
          const numA = parseInt(a.id.replace('OM-', '')) || 0;
          const numB = parseInt(b.id.replace('OM-', '')) || 0;
          return numB - numA;
        });
        setOms(formattedData);
      }
    } catch (err) {
      console.error("Erro na busca: ", err);
    }
  };

  const updateOmInDatabase = async (id, updates) => {
    try {
      const { error } = await supabase.from('oms').update(updates).eq('id', id);
      if (error) {
        console.error("Erro Supabase:", error);
        fetchOms(); 
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const deleteOmFromDatabase = async (id) => {
    try {
      const { error } = await supabase.from('oms').delete().eq('id', id);
      if (error) {
        alert("Erro ao excluir no banco de dados: " + error.message);
        fetchOms(); 
      } else {
        setOmToDelete(null);
      }
    } catch (err) {
      console.error(err);
    }
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

  const toggleCard = (id) => {
    setExpandedCards(prev => prev.includes(id) ? prev.filter(cardId => cardId !== id) : [...prev, id]);
  };

  const getActiveTasks = (om) => {
    const taskMap = new Map();
    om.timeLogs.forEach((log, i) => {
      const key = log.taskId || `${log.worker}-${log.sector}-${log.product}-${log.quantity}`;
      if (!taskMap.has(key)) taskMap.set(key, []);
      taskMap.get(key).push({...log, originalIndex: i});
    });

    const activeTasks = [];
    taskMap.forEach((logs, key) => {
       const lastLog = logs[logs.length - 1];
       if (!lastLog.isFinished) {
          const taskTime = logs.reduce((acc, l) => acc + (l.end ? l.end - l.start : currentTime - l.start), 0);
          activeTasks.push({ taskId: key, ...lastLog, taskTime });
       }
    });
    return activeTasks;
  };

  const loadXlsxLibrary = async () => {
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Falha ao carregar a biblioteca Excel'));
        document.head.appendChild(script);
      });
    }
    return window.XLSX;
  };

  const exportToExcel = async () => {
    try {
      const XLSX = await loadXlsxLibrary();
      const headers = ['Código', 'Data Criação', 'Descrição', 'Objetivo', 'Criticidade', 'Observação', 'Tipo de Serviço', 'Responsável', 'Produtos', 'Status', 'Hora Início', 'Hora Fim', 'Tempo Executado'];
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
            const startTimeStr = formatClockTime(log.start);
            const endTimeStr = log.end ? formatClockTime(log.end) : 'Rodando...';
            
            rows.push([
              om.id, date, om.title, om.objective, om.criticality, om.observation || '',
              log.sector || '-', log.worker || '-', sessionProduct, statusPt, startTimeStr, endTimeStr, logTimeStr
            ]);
          });
        } else {
          rows.push([
            om.id, date, om.title, om.objective, om.criticality, om.observation || '',
            om.sectors.join(', ') || '-', om.assignees.join(', ') || '-', productsStr, statusPt, '-', '-', '00:00:00'
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

  // --- Ações de Start/Pause/Resume INDIVIDUALIZADAS ---
  const handleStartClick = (id) => {
    const om = oms.find(o => o.id === id);
    setOmToStart(om);
    setActionWorker(workers[0] || '');
    setActionWorkerCode('');
    setActionSector(sectors[0] || '');
    setActionProduct(om.products && om.products.length > 0 ? om.products[0].name : '');
    setActionQty(1);
  };

  const confirmStartAction = async (e) => {
    e.preventDefault();
    if (!omToStart || !actionWorker || !actionWorkerCode || !actionSector) return;

    if (actionProduct) {
      const productInOm = omToStart.products.find(p => p.name === actionProduct);
      if (productInOm && Number(actionQty) > productInOm.quantity) {
        alert(`A quantidade solicitada não pode ser maior do que a estipulada na OM original (${productInOm.quantity} un).`);
        return;
      }
    }

    const om = oms.find(o => o.id === omToStart.id);
    const finalWorkerName = `${actionWorker} (Cód: ${actionWorkerCode})`;
    
    const newAssigneesArr = !om.assignees.includes(finalWorkerName) ? [...om.assignees, finalWorkerName] : om.assignees;
    const newSectorsArr = !om.sectors.includes(actionSector) ? [...om.sectors, actionSector] : om.sectors;
    
    const newLogs = [...om.timeLogs, { 
      start: Date.now(), 
      end: null, 
      worker: finalWorkerName, 
      sector: actionSector,
      product: actionProduct,
      quantity: Number(actionQty),
      taskId: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      isFinished: false
    }];

    setOms(oms.map(o => o.id === om.id ? { 
      ...o, 
      status: 'in_progress', 
      assignees: newAssigneesArr, 
      sectors: newSectorsArr, 
      timeLogs: newLogs 
    } : o));
    setOmToStart(null);

    await updateOmInDatabase(om.id, { 
      status: 'in_progress', 
      assignee: newAssigneesArr.join(', '), 
      sector: newSectorsArr.join(', '), 
      timelogs: newLogs 
    });
  };

  const handlePauseTask = async (omId, taskId) => {
    const om = oms.find(o => o.id === omId);
    const updatedLogs = [...om.timeLogs];
    for (let i = updatedLogs.length - 1; i >= 0; i--) {
      const log = updatedLogs[i];
      const key = log.taskId || `${log.worker}-${log.sector}-${log.product}-${log.quantity}`;
      if (key === taskId) {
        if (!log.end) log.end = Date.now();
        break;
      }
    }
    const isSomeoneElseWorking = updatedLogs.some(log => !log.end);
    const newStatus = isSomeoneElseWorking ? 'in_progress' : 'paused';

    setOms(oms.map(o => o.id === omId ? { ...o, status: newStatus, timeLogs: updatedLogs } : o));
    await updateOmInDatabase(omId, { status: newStatus, timelogs: updatedLogs });
  };

  const handleResumeTask = async (omId, taskId) => {
    const om = oms.find(o => o.id === omId);
    const updatedLogs = [...om.timeLogs];
    let lastTaskLog = null;
    
    for (let i = updatedLogs.length - 1; i >= 0; i--) {
      const log = updatedLogs[i];
      const key = log.taskId || `${log.worker}-${log.sector}-${log.product}-${log.quantity}`;
      if (key === taskId) {
        lastTaskLog = log;
        break;
      }
    }

    if (lastTaskLog) {
      updatedLogs.push({
        start: Date.now(),
        end: null,
        worker: lastTaskLog.worker,
        sector: lastTaskLog.sector,
        product: lastTaskLog.product,
        quantity: lastTaskLog.quantity,
        taskId: lastTaskLog.taskId || taskId,
        isFinished: false
      });
    }

    setOms(oms.map(o => o.id === omId ? { ...o, status: 'in_progress', timeLogs: updatedLogs } : o));
    await updateOmInDatabase(omId, { status: 'in_progress', timelogs: updatedLogs });
  };

  const handleFinishTask = async (omId, taskId) => {
    const om = oms.find(o => o.id === omId);
    const updatedLogs = [...om.timeLogs];
    for (let i = updatedLogs.length - 1; i >= 0; i--) {
      const log = updatedLogs[i];
      const key = log.taskId || `${log.worker}-${log.sector}-${log.product}-${log.quantity}`;
      if (key === taskId) {
        if (!log.end) log.end = Date.now();
        log.isFinished = true; 
        break;
      }
    }
    const isSomeoneElseWorking = updatedLogs.some(log => !log.end);
    const newStatus = isSomeoneElseWorking ? 'in_progress' : 'paused';

    setOms(oms.map(o => o.id === omId ? { ...o, status: newStatus, timeLogs: updatedLogs } : o));
    await updateOmInDatabase(omId, { status: newStatus, timelogs: updatedLogs });
  };

  const confirmFinish = async () => {
    if (!omToFinish) return;
    const om = oms.find(o => o.id === omToFinish);
    const updatedLogs = om.timeLogs.map(log => {
      const finishedLog = { ...log, isFinished: true };
      if (!finishedLog.end) finishedLog.end = Date.now();
      return finishedLog;
    });

    setOms(oms.map(o => o.id === omToFinish ? { ...o, status: 'completed', timeLogs: updatedLogs } : o));
    setOmToFinish(null);

    await updateOmInDatabase(om.id, { status: 'completed', timelogs: updatedLogs });
  };

  const confirmDeleteOM = () => {
    if (!omToDelete) return;
    setOms(oms.filter(o => o.id !== omToDelete));
    deleteOmFromDatabase(omToDelete);
  };

  // --- Funções de Configurações (Settings) ---
  const handleAddSettingItem = (type) => {
    let updatedP = [...products];
    let updatedS = [...sectors];
    let updatedW = [...workers];

    if (type === 'product' && newProductInput.trim() && !products.includes(newProductInput.trim())) {
      updatedP.push(newProductInput.trim());
      setProducts(updatedP);
      setNewProductInput('');
    }
    if (type === 'worker' && newWorkerInput.trim() && !workers.includes(newWorkerInput.trim())) {
      updatedW.push(newWorkerInput.trim());
      setWorkers(updatedW);
      setNewWorkerInput('');
    }
    if (type === 'sector' && newSectorInput.trim() && !sectors.includes(newSectorInput.trim())) {
      updatedS.push(newSectorInput.trim());
      setSectors(updatedS);
      setNewSectorInput('');
    }
    saveSettingsToSupabase(updatedP, updatedS, updatedW);
  };

  const handleRemoveSettingItem = (type, item) => {
    let updatedP = [...products];
    let updatedS = [...sectors];
    let updatedW = [...workers];

    if (type === 'product') { updatedP = updatedP.filter(p => p !== item); setProducts(updatedP); }
    if (type === 'worker') { updatedW = updatedW.filter(w => w !== item); setWorkers(updatedW); }
    if (type === 'sector') { updatedS = updatedS.filter(s => s !== item); setSectors(updatedS); }

    saveSettingsToSupabase(updatedP, updatedS, updatedW);
  };

  const downloadSettingsTemplate = async () => {
    try {
      const XLSX = await loadXlsxLibrary();
      const headers = ['Produtos', 'Tipos de Serviço', 'Colaboradores'];
      const rows = [
        ['Escora Exemplo 3m', 'Soldagem', 'João Exemplo'],
        ['Andaime Exemplo', 'Pintura', 'Maria Exemplo']
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Importacao");
      
      worksheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 30 }];
      XLSX.writeFile(workbook, `Modelo_Importacao_Configuracoes.xlsx`);
    } catch (error) {
      alert("Erro ao gerar o modelo. Tente novamente.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const XLSX = await loadXlsxLibrary();
      const reader = new FileReader();

      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let importedProducts = [];
        let importedSectors = [];
        let importedWorkers = [];

        data.forEach(row => {
          const prod = row['Produtos'] || row['Produto'] || row[' Produtos '];
          const sec = row['Tipos de Serviço'] || row['Tipo de Serviço'] || row['Setores'] || row['Setor'];
          const work = row['Colaboradores'] || row['Colaborador'] || row[' Colaboradores '];

          if (prod && String(prod).trim() !== '') importedProducts.push(String(prod).trim());
          if (sec && String(sec).trim() !== '') importedSectors.push(String(sec).trim());
          if (work && String(work).trim() !== '') importedWorkers.push(String(work).trim());
        });

        const finalProducts = [...new Set([...products, ...importedProducts])];
        const finalSectors = [...new Set([...sectors, ...importedSectors])];
        const finalWorkers = [...new Set([...workers, ...importedWorkers])];

        setProducts(finalProducts);
        setSectors(finalSectors);
        setWorkers(finalWorkers);

        saveSettingsToSupabase(finalProducts, finalSectors, finalWorkers);

        alert(`Importação concluída com sucesso!\n\nForam lidos e enviados para a nuvem:\n- ${importedProducts.length} novos Produtos\n- ${importedSectors.length} novos Tipos de Serviço\n- ${importedWorkers.length} novos Colaboradores`);
        if(fileInputRef.current) fileInputRef.current.value = '';
      };
      
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Erro ao importar Excel:", error);
      alert("Erro ao ler o arquivo. Certifique-se de que é um Excel válido.");
    }
  };

  // --- Criação e Edição de OM Otimizadas ---
  const handleAddProduct = () => {
    if (currentQty > 0 && currentProduct) {
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

    const newOMFrontend = {
      id: newId,
      title: newTitle,
      sectors: newSector ? [newSector] : [],
      assignees: [],
      objective: newObjective,
      criticality: newCriticality,
      observation: newObservation,
      products: newProducts,
      status: 'pending',
      timeLogs: [],
      createdAt: new Date().toISOString()
    };

    setOms([newOMFrontend, ...oms]);
    setIsModalOpen(false);
    setNewTitle('');
    setNewObservation('');
    setNewProducts([]);
    setNewObjective('Manutenção');
    setNewCriticality('Programada');

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
      timelogs: [],
      createdat: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('oms').insert([insertData]);
      if (error) {
        alert("Erro ao salvar no banco: " + error.message);
        fetchOms(); 
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDataToOm = async (type) => {
    if (!omToUpdate) return;
    const om = oms.find(o => o.id === omToUpdate.id);
    let updates = {};

    let tempAssignees = [...om.assignees];
    let tempSectors = [...om.sectors];
    let tempProducts = [...om.products];

    if (type === 'worker' && manageSelectedWorker && manageSelectedWorkerCode) {
      const finalManageWorker = `${manageSelectedWorker} (Cód: ${manageSelectedWorkerCode})`;
      if (!tempAssignees.includes(finalManageWorker)) {
        tempAssignees.push(finalManageWorker);
        updates.assignee = tempAssignees.join(', ');
      }
    }
    if (type === 'sector' && manageSelectedSector && !tempSectors.includes(manageSelectedSector)) {
      tempSectors.push(manageSelectedSector);
      updates.sector = tempSectors.join(', ');
    }
    if (type === 'product' && manageSelectedProduct && manageSelectedQty > 0) {
      const existing = tempProducts.find(p => p.name === manageSelectedProduct);
      if (existing) {
        tempProducts = tempProducts.map(p => p.name === manageSelectedProduct ? { ...p, quantity: p.quantity + Number(manageSelectedQty) } : p);
      } else {
        tempProducts.push({ name: manageSelectedProduct, quantity: Number(manageSelectedQty) });
      }
      updates.products = tempProducts;
    }

    if (Object.keys(updates).length > 0) {
      setOms(oms.map(o => o.id === om.id ? { ...o, assignees: tempAssignees, sectors: tempSectors, products: tempProducts } : o));
      setOmToUpdate(prev => ({...prev, assignees: tempAssignees, sectors: tempSectors, products: tempProducts}));
      
      await updateOmInDatabase(om.id, updates);
    }

    setManageSelectedWorker('');
    setManageSelectedWorkerCode('');
    setManageSelectedSector('');
    setManageSelectedQty(1);
  };

  const handleRemoveDataFromOm = async (omId, type, itemToRemove) => {
    const om = oms.find(o => o.id === omId);
    let tempAssignees = om.assignees.filter(w => w !== itemToRemove);
    let tempSectors = om.sectors.filter(s => s !== itemToRemove);
    let tempProducts = om.products.filter(p => p.name !== itemToRemove);
    
    let updates = {};
    if (type === 'worker') updates.assignee = tempAssignees.join(', ');
    if (type === 'sector') updates.sector = tempSectors.join(', ');
    if (type === 'product') updates.products = tempProducts;

    setOms(oms.map(o => o.id === om.id ? { ...o, assignees: tempAssignees, sectors: tempSectors, products: tempProducts } : o));
    setOmToUpdate(prev => ({...prev, assignees: tempAssignees, sectors: tempSectors, products: tempProducts}));

    await updateOmInDatabase(omId, updates);
  };

  const updateProductQtyInOm = async (omId, productName, newQty) => {
    if(newQty < 1) return;
    const om = oms.find(o => o.id === omId);
    const newProducts = om.products.map(p => p.name === productName ? { ...p, quantity: Number(newQty) } : p);
    
    setOms(oms.map(o => o.id === omId ? { ...o, products: newProducts } : o));
    setOmToUpdate(prev => ({...prev, products: newProducts}));

    await updateOmInDatabase(omId, { products: newProducts });
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
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-12">
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

          <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-lg flex-wrap gap-y-2 justify-center">
            <button 
              onClick={() => setCurrentView('oms')}
              className={`px-4 py-2 rounded-md font-medium flex items-center transition-colors ${currentView === 'oms' ? 'bg-orange-500 text-white shadow' : 'text-slate-300 hover:text-white'}`}
            >
              <ListTodo size={18} className="mr-2 hidden sm:block" /> Ordens
            </button>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-2 rounded-md font-medium flex items-center transition-colors ${currentView === 'dashboard' ? 'bg-orange-500 text-white shadow' : 'text-slate-300 hover:text-white'}`}
            >
              <BarChart3 size={18} className="mr-2 hidden sm:block" /> Dashboard
            </button>
            <button 
              onClick={() => {
                // Solicita a senha ao clicar
                const pass = window.prompt("Digite a senha para acessar as Configurações:");
                if (pass === "4993") {
                  setCurrentView('settings');
                } else if (pass !== null) {
                  alert("Senha incorreta. Acesso negado.");
                }
              }}
              className={`px-4 py-2 rounded-md font-medium flex items-center transition-colors ${currentView === 'settings' ? 'bg-orange-500 text-white shadow' : 'text-slate-300 hover:text-white'}`}
            >
              <Settings size={18} className="mr-2 hidden sm:block" /> Configurações
            </button>
          </div>

          <button 
            onClick={() => {
              setNewSector(sectors[0] || '');
              setCurrentProduct(products[0] || '');
              setIsModalOpen(true);
            }}
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
                  const isExpanded = expandedCards.includes(om.id);
                  const activeTasks = getActiveTasks(om);
                  const allSectorsToDisplay = Array.from(new Set([...om.sectors, ...om.timeLogs.map(l => l.sector).filter(Boolean)]));

                  return (
                    <div key={om.id} className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden flex flex-col transition-all hover:shadow-md ${
                      om.criticality === 'Imediata' && om.status !== 'completed' ? 'border-l-red-500' : 'border-l-blue-500'
                    }`}>
                      <div className="p-4 flex-grow flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-1 rounded shadow-sm">
                              {om.id}
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium flex items-center">
                              <CalendarDays size={12} className="mr-1"/> {formatDate(om.createdAt)}
                            </span>
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                            om.status === 'pending' ? 'bg-gray-200 text-gray-700' :
                            om.status === 'in_progress' ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300' :
                            om.status === 'paused' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {om.status === 'pending' && 'Pendente'}
                            {om.status === 'in_progress' && 'Em Andamento'}
                            {om.status === 'paused' && 'Pausado'}
                            {om.status === 'completed' && 'Concluído'}
                          </span>
                        </div>

                        <h3 className="font-bold text-gray-800 text-lg leading-tight mb-3">
                          {om.title}
                        </h3>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="flex items-center text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded">
                            <Target size={12} className="mr-1"/> {om.objective}
                          </span>
                          {om.criticality === 'Imediata' && (
                            <span className="flex items-center text-[11px] font-medium bg-red-100 text-red-700 px-2 py-1 rounded">
                              <AlertTriangle size={12} className="mr-1"/> Imediata
                            </span>
                          )}
                        </div>

                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center flex-wrap gap-1">
                            <Wrench size={14} className="mr-1 text-gray-400 flex-shrink-0" />
                            <span className="text-[11px] font-bold text-gray-500 uppercase mr-1">Serviço:</span>
                            {om.sectors.length > 0 ? om.sectors.map(s => (
                              <span key={s} className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-700 border border-gray-200">{s}</span>
                            )) : <span className="text-gray-400 text-xs italic">Não definido</span>}
                          </div>
                          <div className="flex space-x-1 shrink-0 ml-2">
                            {om.status !== 'completed' && (
                              <button 
                                onClick={() => { 
                                  setManageSelectedProduct(products[0] || '');
                                  setManageSelectedSector(sectors[0] || '');
                                  setManageSelectedWorker(workers[0] || '');
                                  setOmToUpdate(om); 
                                  setIsModalOpen(false); 
                                }}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded transition-colors"
                              >
                                <Edit size={10} className="mr-1"/> Editar
                              </button>
                            )}
                            <button 
                              onClick={() => setOmToDelete(om.id)}
                              className="text-[10px] font-bold text-red-600 hover:text-red-800 flex items-center bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded transition-colors"
                              title="Excluir OM"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>

                        {om.observation && (
                          <div className="mb-3 bg-amber-50 p-2.5 rounded-md border border-amber-100/50">
                            <p className="text-[10px] font-bold text-amber-800 mb-1 flex items-center uppercase">
                              <AlignLeft size={12} className="mr-1"/> Observação
                            </p>
                            <p className="text-xs text-gray-700">{om.observation}</p>
                          </div>
                        )}

                        {om.products && om.products.length > 0 && (
                          <div className="mb-4">
                            <p className="text-[10px] font-bold text-gray-500 mb-1.5 flex items-center uppercase">
                              <Package size={12} className="mr-1"/> Materiais da OM
                            </p>
                            <div className="space-y-1">
                              {om.products.map((p, i) => (
                                <div key={i} className="flex justify-between items-center text-xs text-gray-700 bg-orange-50/50 px-2 py-1.5 rounded border border-orange-100">
                                  <span className="font-medium truncate pr-2">{p.name}</span>
                                  <span className="font-bold text-orange-600 shrink-0 bg-white px-1.5 py-0.5 rounded shadow-sm border border-orange-100">{p.quantity} un</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeTasks.length > 0 && (
                          <div className="mb-4 pt-3 border-t border-gray-100">
                            <p className="text-[10px] font-bold text-blue-600 uppercase mb-2 flex items-center">
                              <Play size={12} className="mr-1"/> Painel de Execução ({activeTasks.length})
                            </p>
                            <div className="space-y-2">
                              {activeTasks.map(task => (
                                <div key={task.taskId} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border p-2.5 rounded-lg shadow-sm transition-colors ${
                                  !task.end ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                                }`}>
                                  <div className="flex flex-col mb-2 sm:mb-0 w-full sm:w-auto overflow-hidden">
                                    <span className="text-xs font-bold text-gray-800 truncate">
                                      {task.worker} <span className="text-gray-500 font-normal">({task.sector})</span>
                                    </span>
                                    {task.product && (
                                      <span className={`text-[10px] font-bold mt-0.5 ${!task.end ? 'text-blue-700 animate-pulse' : 'text-gray-500'}`}>
                                        {!task.end ? '⏳ Rodando:' : '⏸ Pausado:'} {task.quantity}x {task.product}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex space-x-1.5 w-full sm:w-auto mt-2 sm:mt-0">
                                    {!task.end ? (
                                      <button 
                                        onClick={() => handlePauseTask(om.id, task.taskId)}
                                        className="flex-1 sm:flex-none bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1.5 rounded text-[10px] font-bold transition-colors flex items-center justify-center"
                                      >
                                        <Pause size={12} className="mr-1" /> PAUSAR
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => handleResumeTask(om.id, task.taskId)}
                                        className="flex-1 sm:flex-none bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1.5 rounded text-[10px] font-bold transition-colors flex items-center justify-center"
                                      >
                                        <Play size={12} className="mr-1" /> RETOMAR
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handleFinishTask(om.id, task.taskId)}
                                      className="flex-1 sm:flex-none bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1.5 rounded text-[10px] font-bold transition-colors flex items-center justify-center"
                                    >
                                      <CheckCircle2 size={12} className="mr-1" /> CONCLUIR
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className={`mt-auto p-3 rounded-lg flex items-center justify-between border ${
                          om.status === 'in_progress' ? 'bg-slate-900 border-slate-800 text-white shadow-inner' : 'bg-gray-50 border-gray-200 text-gray-800'
                        }`}>
                          <div className="flex items-center">
                            <Clock size={16} className={`mr-2 ${om.status === 'in_progress' ? 'text-blue-400 animate-spin-slow' : 'text-gray-500'}`} />
                            <span className="text-xs font-bold uppercase tracking-wide">Tempo Total da OM</span>
                          </div>
                          <span className="font-mono font-bold text-xl tracking-wider">
                            {formatTime(totalTime)}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => toggleCard(om.id)}
                        className="w-full py-2 bg-white border-y border-gray-100 text-[11px] font-bold text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex justify-center items-center transition-colors uppercase tracking-wider"
                      >
                        {isExpanded ? (
                          <><ChevronUp size={14} className="mr-1"/> Ocultar Histórico Completo</>
                        ) : (
                          <><ChevronDown size={14} className="mr-1"/> Ver Histórico Completo</>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-4 bg-slate-50 space-y-4 border-b border-gray-200 shadow-inner">
                          
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[11px] font-bold text-gray-500 uppercase flex items-center">
                                <Users size={12} className="mr-1"/> Equipe Envolvida Historicamente
                              </p>
                              <div className="flex space-x-1">
                                {om.status !== 'completed' && (
                                  <button 
                                    onClick={() => { 
                                      setManageSelectedProduct(products[0] || '');
                                      setManageSelectedSector(sectors[0] || '');
                                      setManageSelectedWorker(workers[0] || '');
                                      setOmToUpdate(om); 
                                      setIsModalOpen(false); 
                                    }}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded transition-colors"
                                  >
                                    <Edit size={10} className="mr-1"/> Atualizar Dados
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="bg-white p-2.5 rounded border border-gray-200 shadow-sm">
                              <div className="flex items-start">
                                <User size={14} className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                                <div className="text-sm text-gray-600 flex flex-wrap gap-1">
                                  {om.assignees.length > 0 ? om.assignees.map(a => (
                                    <span key={a} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-100">{a}</span>
                                  )) : <span className="text-gray-400 italic text-xs">Ninguém trabalhou nesta OM ainda.</span>}
                                </div>
                              </div>
                            </div>
                          </div>

                          {allSectorsToDisplay.length > 0 && (
                            <div>
                              <p className="text-[11px] font-bold text-gray-500 mb-2 uppercase flex items-center">
                                <BarChart3 size={12} className="mr-1"/> Resumo e Logs por Serviço
                              </p>
                              <div className="space-y-3">
                                {allSectorsToDisplay.map(sector => {
                                  const logs = om.timeLogs.filter(l => l.sector === sector);
                                  const sectorTime = logs.reduce((acc, l) => acc + (l.end ? l.end - l.start : currentTime - l.start), 0);
                                  
                                  return (
                                    <div key={sector} className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden text-sm">
                                      <div className="flex justify-between items-center bg-slate-100 p-2 border-b border-gray-200">
                                        <span className="font-bold text-slate-700">{sector}</span>
                                        <div className="text-right">
                                          <span className="block text-[9px] text-gray-500 uppercase font-bold">Tempo Gasto</span>
                                          <span className="font-mono font-bold text-slate-800 text-xs">{formatTime(sectorTime)}</span>
                                        </div>
                                      </div>
                                      
                                      {logs.length > 0 ? (
                                        <div className="p-2 space-y-2 bg-white">
                                          {logs.map((log, idx) => (
                                            <div key={idx} className={`p-2 rounded border ${
                                              log.isFinished ? 'bg-gray-50 border-gray-200 text-gray-500 opacity-80' : 'bg-blue-50 border-blue-200 text-slate-800'
                                            }`}>
                                              <div className="flex justify-between items-start mb-1">
                                                <strong className="text-xs">{log.worker}</strong>
                                                <span className="font-mono text-[10px] text-gray-500">
                                                  {formatClockTime(log.start)} - {log.end ? formatClockTime(log.end) : 'Agora'}
                                                </span>
                                              </div>
                                              <div className="flex justify-between items-center mt-1">
                                                {log.product ? (
                                                  <span className={`font-bold text-[10px] ${log.isFinished ? 'text-gray-500' : 'text-orange-600'}`}>
                                                    ↳ {log.quantity}x {log.product}
                                                  </span>
                                                ) : <span />}
                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                                  log.isFinished ? 'bg-gray-200 text-gray-500' : 
                                                  (log.end ? 'bg-orange-100 text-orange-600' : 'bg-blue-200 text-blue-700')
                                                }`}>
                                                  {log.isFinished ? 'Concluído' : (log.end ? 'Pausado' : 'Executando')}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="p-3 text-center text-xs text-gray-400 italic">Nenhum apontamento feito.</div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-4 bg-white flex space-x-2 border-t border-gray-100">
                        {om.status !== 'completed' ? (
                          <>
                            <button 
                              onClick={() => handleStartClick(om.id)}
                              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-md font-bold flex justify-center items-center transition-all shadow-sm text-xs"
                            >
                              <Plus size={16} className="mr-2" /> NOVO TRABALHO
                            </button>
                            <button 
                              onClick={() => {
                                if (activeTasks.length > 0) {
                                  alert('Existem trabalhos não concluídos. Conclua todas as tarefas individuais no "Painel de Execução" antes de encerrar a OM.');
                                  return;
                                }
                                setOmToFinish(om.id);
                              }}
                              className={`flex-none py-2.5 px-4 rounded-md font-bold flex justify-center items-center transition-all shadow-sm text-xs ${
                                activeTasks.length > 0 
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                                  : 'bg-red-100 hover:bg-red-200 text-red-700'
                              }`}
                              title={activeTasks.length > 0 ? "Conclua todos os trabalhos pendentes antes de encerrar" : "Encerrar OM inteira"}
                            >
                              <CheckCircle2 size={16} className={activeTasks.length > 0 ? "mr-1 opacity-50" : "mr-1"} /> ENCERRAR OM
                            </button>
                          </>
                        ) : (
                          <div className="w-full text-center text-xs font-bold text-slate-500 flex items-center justify-center py-2.5 bg-gray-50 rounded-md border border-gray-200">
                            <CheckCircle2 size={16} className="mr-2" /> OM ENCERRADA
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : currentView === 'dashboard' ? (
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
                      <th className="p-4 font-bold">Responsáveis / Serviço</th>
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
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
              <Settings className="mr-3 text-orange-500" /> Configurações do Sistema
            </h2>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 border-l-4 border-l-green-500">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center">
                <FileSpreadsheet className="mr-2 text-green-600" size={20}/> Importação em Lote
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Adicione múltiplos Equipamentos, Tipos de Serviço e Colaboradores de uma só vez utilizando uma planilha Excel. Os novos itens serão adicionados à sua lista sem apagar os que já existem.
              </p>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={downloadSettingsTemplate} 
                  className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-bold text-sm transition-colors border border-gray-300"
                >
                  <Download size={16} className="mr-2"/> Baixar Planilha Modelo
                </button>
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                />
                <button 
                  onClick={() => fileInputRef.current.click()} 
                  className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-bold text-sm transition-colors shadow-sm"
                >
                  <Upload size={16} className="mr-2"/> Importar Planilha Preenchida
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center border-b pb-2"><Package className="mr-2 text-orange-500" size={18}/> Equipamentos / Produtos</h3>
                <div className="flex mb-4">
                  <input 
                    type="text" 
                    value={newProductInput} 
                    onChange={e => setNewProductInput(e.target.value)} 
                    placeholder="Ex: Viga de Alumínio"
                    className="flex-grow border border-gray-300 rounded-l-md p-2 text-sm outline-none focus:border-orange-500" 
                  />
                  <button onClick={() => handleAddSettingItem('product')} className="bg-orange-500 text-white px-3 rounded-r-md text-sm font-bold hover:bg-orange-600">Add</button>
                </div>
                <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {products.map(p => (
                    <li key={p} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 text-sm">
                      <span className="text-gray-700 truncate">{p}</span>
                      <button onClick={() => handleRemoveSettingItem('product', p)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                    </li>
                  ))}
                  {products.length === 0 && <li className="text-sm text-gray-400 italic">Nenhum item cadastrado.</li>}
                </ul>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center border-b pb-2"><Wrench className="mr-2 text-blue-500" size={18}/> Tipos de Serviço</h3>
                <div className="flex mb-4">
                  <input 
                    type="text" 
                    value={newSectorInput} 
                    onChange={e => setNewSectorInput(e.target.value)} 
                    placeholder="Ex: Logística"
                    className="flex-grow border border-gray-300 rounded-l-md p-2 text-sm outline-none focus:border-blue-500" 
                  />
                  <button onClick={() => handleAddSettingItem('sector')} className="bg-blue-600 text-white px-3 rounded-r-md text-sm font-bold hover:bg-blue-700">Add</button>
                </div>
                <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {sectors.map(s => (
                    <li key={s} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 text-sm">
                      <span className="text-gray-700 truncate">{s}</span>
                      <button onClick={() => handleRemoveSettingItem('sector', s)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                    </li>
                  ))}
                  {sectors.length === 0 && <li className="text-sm text-gray-400 italic">Nenhum serviço cadastrado.</li>}
                </ul>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center border-b pb-2"><Users className="mr-2 text-green-500" size={18}/> Funções</h3>
                <div className="flex mb-4">
                  <input 
                    type="text" 
                    value={newWorkerInput} 
                    onChange={e => setNewWorkerInput(e.target.value)} 
                    placeholder="Ex: Meio Oficial Pintor"
                    className="flex-grow border border-gray-300 rounded-l-md p-2 text-sm outline-none focus:border-green-500" 
                  />
                  <button onClick={() => handleAddSettingItem('worker')} className="bg-green-600 text-white px-3 rounded-r-md text-sm font-bold hover:bg-green-700">Add</button>
                </div>
                <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {workers.map(w => (
                    <li key={w} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 text-sm">
                      <span className="text-gray-700 truncate">{w}</span>
                      <button onClick={() => handleRemoveSettingItem('worker', w)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                    </li>
                  ))}
                  {workers.length === 0 && <li className="text-sm text-gray-400 italic">Nenhuma função cadastrada.</li>}
                </ul>
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
                    <option value="CARGA/DESCARGA">CARGA/DESCARGA</option>
                    <option value="SERVIÇOS GERAIS">SERVIÇOS GERAIS</option>
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
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Tipo de Serviço</label>
                  <select value={newSector} onChange={(e) => setNewSector(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white outline-none">
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
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
                      {products.map(p => <option key={p} value={p}>{p}</option>)}
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

      {/* MODAL: INICIAR / RETOMAR OM */}
      {omToStart && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="bg-slate-800 text-white p-4 flex items-center shrink-0">
              <Plus className="mr-2" size={20}/>
              <h2 className="text-lg font-bold">Iniciar Novo Trabalho</h2>
            </div>
            <form onSubmit={confirmStartAction} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Informe seus dados para registrar o tempo na OM <strong>{omToStart.id}</strong>:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Função</label>
                  <select required value={actionWorker} onChange={(e) => setActionWorker(e.target.value)} className="w-full border border-gray-300 rounded p-2 outline-none focus:border-blue-500">
                    <option value="" disabled>Selecione a função...</option>
                    {workers.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cód. Colaborador</label>
                  <select required value={actionWorkerCode} onChange={(e) => setActionWorkerCode(e.target.value)} className="w-full border border-gray-300 rounded p-2 outline-none focus:border-blue-500">
                    <option value="" disabled>Cód...</option>
                    {Array.from({length: 40}, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Serviço Atual</label>
                <select required value={actionSector} onChange={(e) => setActionSector(e.target.value)} className="w-full border border-gray-300 rounded p-2 outline-none focus:border-blue-500">
                  <option value="" disabled>Selecione o serviço...</option>
                  {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {omToStart.products && omToStart.products.length > 0 && (
                <div className="flex space-x-2 bg-orange-50 p-3 rounded-lg border border-orange-100 mt-2">
                  <div className="flex-grow">
                    <label className="block text-xs font-bold text-orange-800 uppercase mb-1">Produto Alvo</label>
                    <select 
                      value={actionProduct} 
                      onChange={(e) => {
                        setActionProduct(e.target.value);
                        setActionQty(1); 
                      }} 
                      className="w-full border border-orange-200 rounded p-2 outline-none focus:border-orange-500 text-sm bg-white"
                    >
                      <option value="">Nenhum específico</option>
                      {omToStart.products.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-bold text-orange-800 uppercase mb-1">Qtd</label>
                    <input 
                      type="number" 
                      min="1" 
                      max={omToStart.products.find(p => p.name === actionProduct)?.quantity || 1}
                      value={actionQty} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const maxAllow = omToStart.products.find(p => p.name === actionProduct)?.quantity || 1;
                        if (val > maxAllow) {
                          setActionQty(maxAllow);
                        } else {
                          setActionQty(e.target.value);
                        }
                      }} 
                      className="w-full border border-orange-200 rounded p-2 outline-none focus:border-orange-500 text-sm" 
                    />
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

      {/* MODAL: ATUALIZAR DADOS DA OM */}
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
                    {products.map(p => <option key={p} value={p}>{p}</option>)}
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
                <h3 className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center border-b pb-1"><Users size={14} className="mr-1"/> Funções & Colaboradores</h3>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-3 mt-2">
                  <select value={manageSelectedWorker} onChange={(e) => setManageSelectedWorker(e.target.value)} className="flex-grow border border-gray-300 rounded p-1.5 text-xs outline-none">
                    <option value="">Selecione a Função...</option>
                    {workers.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <select value={manageSelectedWorkerCode} onChange={(e) => setManageSelectedWorkerCode(e.target.value)} className="w-24 border border-gray-300 rounded p-1.5 text-xs outline-none">
                    <option value="">Cód...</option>
                    {Array.from({length: 40}, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  <button onClick={() => handleAddDataToOm('worker')} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700 sm:w-auto w-full">Incluir</button>
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
                <h3 className="text-xs font-bold text-gray-600 uppercase mb-2 flex items-center border-b pb-1"><Wrench size={14} className="mr-1"/> Serviços Envolvidos</h3>
                <div className="flex space-x-2 mb-3 mt-2">
                  <select value={manageSelectedSector} onChange={(e) => setManageSelectedSector(e.target.value)} className="flex-grow border border-gray-300 rounded p-1.5 text-xs outline-none">
                    <option value="">Selecione um Serviço...</option>
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => handleAddDataToOm('sector')} className="bg-slate-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-700">Incluir</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {omToUpdate.sectors.map(s => (
                    <span key={s} className="bg-gray-100 border border-gray-300 text-gray-700 text-xs px-2 py-1 rounded flex items-center">
                      {s} <button onClick={() => handleRemoveDataFromOm(omToUpdate.id, 'sector', s)} className="ml-2 text-gray-400 hover:text-red-500">✕</button>
                    </span>
                  ))}
                  {omToUpdate.sectors.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum serviço.</p>}
                </div>
              </div>

              <button onClick={() => setOmToUpdate(null)} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-colors shadow-sm">
                Concluir Edição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR FINALIZAÇÃO DA OM */}
      {omToFinish && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Encerrar a OM Inteira?</h2>
            <p className="text-gray-600 mb-6 text-sm">
              Atenção: Ao encerrar a OM, o tempo total será consolidado permanentemente. Qualquer pessoa da equipe que ainda estiver trabalhando terá o tempo fechado automaticamente.
            </p>
            <div className="flex justify-center space-x-3">
              <button onClick={() => setOmToFinish(null)} className="px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-bold transition-colors w-full">
                Cancelar
              </button>
              <button onClick={confirmFinish} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-bold transition-colors w-full">
                Sim, Encerrar OM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DA OM */}
      {omToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Excluir Ordem?</h2>
            <p className="text-gray-600 mb-6 text-sm">
              Tem certeza que deseja excluir a <strong>{omToDelete}</strong> permanentemente? Esta ação não pode ser desfeita e todos os tempos registrados serão perdidos.
            </p>
            <div className="flex justify-center space-x-3">
              <button onClick={() => setOmToDelete(null)} className="px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-bold transition-colors w-full">
                Cancelar
              </button>
              <button onClick={confirmDeleteOM} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-bold transition-colors w-full">
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}