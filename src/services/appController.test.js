import { renderNavbar } from './appRenderService.js';
import { gerarLayoutDashboard } from './dashboardViewService.js';
import { inicializarGraficoAnalitico } from './chartService.js';
import { filtrarAlertas, obterAlertasCompletos } from './services/alertasService.js';
import { renderAlertasView, lerFiltrosAlertasDoDOM } from './views/alertasView.js';


const URL_AZURE_PRINCIPAL = 'https://horta-api-htggarb3eagagpgm.brazilsouth-01.azurewebsites.net';
const URL_RENDER_FALLBACK = 'https://server-horta.onrender.com';
let API_BASE_URL = URL_AZURE_PRINCIPAL;

let cenarioAtual = 'normal';
let simularErroConexao = false;

let filtrosVisibilidade = {
  umid_solo: true, umid_ar: true, temp: true, luz: true, ph: true,
  chuva: true, alerta: true, irrigacao: true
};

let configAgrupamento = { unidade: 'minuto', fator: 5 };

const agoraData = new Date();
const ontemData = new Date(agoraData.getTime() - (24 * 60 * 60 * 1000));
let configData = {
  inicio: ontemData.toISOString().slice(0, 16),
  fim: agoraData.toISOString().slice(0, 16)
};

let telemetriaAtual = null;
let dadosGraficoTimelineBrutos = []; 
let dadosGraficoTimelineAgrupados = [];
let pontoSelecionado = null; 
let chartInstance = null;
let temporizadorUI = null;

const navContainer = document.getElementById('nav-container');
const appContainer = document.getElementById('app-container');

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

async function buscarDadosDaAPI() {
  if (simularErroConexao) throw new Error("Simulação de Erro Ativa");

  try {
    const [resTelemetria, resHistorico] = await Promise.all([
      fetchWithTimeout(`${API_BASE_URL}/api/aquisicao/avancada`),
      fetchWithTimeout(`${API_BASE_URL}/api/historico/completo?minutosAtras=2880`)
    ]);

    if (!resTelemetria.ok || !resHistorico.ok) throw new Error("Erro nos endpoints da Azure");

    const dadosTelemetria = await resTelemetria.json();
    const dadosHistorico = await resHistorico.json();

    telemetriaAtual = dadosTelemetria.aquisicao_avancada.find(p => p.id !== 1) || dadosTelemetria.aquisicao_avancada[0];
    dadosGraficoTimelineBrutos = (dadosHistorico.dashboardData || []).filter(p => p.id !== 1);

    processarAgrupamentoETempo();
    configurarProximaAtualizacao(telemetriaAtual?.dataHora);

  } catch (error) {
    if (API_BASE_URL === URL_RENDER_FALLBACK) throw error; 

    console.warn("⚠️ Chaveando para o Fallback...", error);
    API_BASE_URL = URL_RENDER_FALLBACK;
    
    const [resTelemetriaFb, resHistoricoFb] = await Promise.all([
      fetchWithTimeout(`${API_BASE_URL}/api/aquisicao/avancada`),
      fetchWithTimeout(`${API_BASE_URL}/api/historico/completo?minutosAtras=2880`)
    ]);

    const dadosTelemetria = await resTelemetriaFb.json();
    const dadosHistorico = await resHistoricoFb.json();

    telemetriaAtual = dadosTelemetria.aquisicao_avancada.find(p => p.id !== 1) || dadosTelemetria.aquisicao_avancada[0];
    dadosGraficoTimelineBrutos = (dadosHistorico.dashboardData || []).filter(p => p.id !== 1);
    
    processarAgrupamentoETempo();
    configurarProximaAtualizacao(telemetriaAtual?.dataHora);
  }
}

function processarAgrupamentoETempo() {
  const dataInicioRef = new Date(configData.inicio).getTime();
  const dataFimRef = new Date(configData.fim).getTime();

  let filtrados = dadosGraficoTimelineBrutos.filter(p => {
    if (!p.dataHora) return false;
    const dataPonto = new Date(p.dataHora.replace(/-/g, '/')).getTime();
    return dataPonto >= dataInicioRef && dataPonto <= dataFimRef;
  });

  const fator = parseInt(configAgrupamento.fator) || 1;
  const unidade = configAgrupamento.unidade;
  let buckets = {};

  filtrados.forEach(p => {
    const dt = new Date(p.dataHora.replace(/-/g, '/'));
    let chaveBucket = "";
    
    if (unidade === 'segundo') {
      const segAgrupado = Math.floor(dt.getSeconds() / fator) * fator;
      dt.setSeconds(segAgrupado, 0);
      chaveBucket = dt.toISOString();
    } else if (unidade === 'minuto') {
      const minAgrupado = Math.floor(dt.getMinutes() / fator) * fator;
      dt.setMinutes(minAgrupado, 0, 0);
      chaveBucket = dt.toISOString();
    } else { 
      const horaAgrupada = Math.floor(dt.getHours() / fator) * fator;
      dt.setHours(horaAgrupada, 0, 0, 0);
      chaveBucket = dt.toISOString();
    }

    if (!buckets[chaveBucket]) buckets[chaveBucket] = [];
    buckets[chaveBucket].push(p);
  });

  dadosGraficoTimelineAgrupados = Object.keys(buckets).sort().map(chave => {
    const lista = buckets[chave];
    const dataExibicao = new Date(chave);
    const dataHoraString = `${dataExibicao.toLocaleDateString('pt-BR')} ${dataExibicao.toLocaleTimeString('pt-BR')}`;

    const soma = lista.reduce((acc, curr) => {
      acc.umidadeSolo += curr.umidadeSoloPorcentagem || 0;
      acc.umidadeAr += curr.umidadeAr || 0;
      acc.temperatura += curr.temperatura || 0;
      acc.luz += curr.luzSolar || 0;
      acc.ph += curr.pHSolo || 7;
      acc.chuva += curr.estaChovendo ? 1 : 0;
      acc.alerta += curr.alertaCriticoAlface ? 1 : 0;
      acc.irrigacao += curr.statusIrrigacao === "LIGADO" ? 1 : 0;
      return acc;
    }, { umidadeSolo: 0, umidadeAr: 0, temperatura: 0, luz: 0, ph: 0, chuva: 0, alerta: 0, irrigacao: 0 });

    const total = lista.length;

    return {
      dataHora: dataHoraString,
      umidadeSoloPorcentagem: parseFloat((soma.umidadeSolo / total).toFixed(1)),
      umidadeAr: parseFloat((soma.umidadeAr / total).toFixed(1)),
      temperatura: parseFloat((soma.temperatura / total).toFixed(1)),
      luzSolar: parseFloat((soma.luz / total).toFixed(1)),
      pHSolo: parseFloat((soma.ph / total).toFixed(2)),
      estaChovendo: (soma.chuva / total) >= 0.5,
      alertaCriticoAlface: (soma.alerta / total) >= 0.5,
      statusIrrigacao: (soma.irrigacao / total) >= 0.5 ? "LIGADO" : "DESLIGADO",
      intensidadeChuva: lista[0].intensidadeChuva,
      vazaoGotejamentoLh: lista[0].vazaoGotejamentoLh,
      controleManualAtivo: lista[0].controleManualAtivo,
      estacao: lista[0].estacao,
      condicaoCeu: lista[0].condicaoCeu
    };
  });
}

function configurarProximaAtualizacao(dataHoraUltimoRegistro) {
  if (temporizadorUI) clearTimeout(temporizadorUI);
  let intervaloPadraoMs = 60000;

  if (dataHoraUltimoRegistro) {
    const stringDataFormatada = dataHoraUltimoRegistro.replace(/-/g, '/');
    const dataUltimoLog = new Date(stringDataFormatada);
    const agora = new Date();
    const diferencaMs = agora.getTime() - dataUltimoLog.getTime();
    
    if (diferencaMs > 0 && diferencaMs < 60000) {
      intervaloPadraoMs = (60000 - diferencaMs) + 1000;
    }
  }
  temporizadorUI = setTimeout(processarCicloUI, intervaloPadraoMs);
}

async function processarCicloUI() {
  navContainer.innerHTML = renderNavbar(cenarioAtual);
  const isOffline = cenarioAtual === 'offline' || !telemetriaAtual;

  try {
    if (cenarioAtual === 'offline') {
      telemetriaAtual = null;
      renderizarInterfaceCompleta(true);
      return;
    }

    await buscarDadosDaAPI();

    if (!pontoSelecionado && telemetriaAtual) {
      sincronizarPontoSelecionado(telemetriaAtual);
    }

    renderizarInterfaceCompleta(false);

  } catch (error) {
    console.error("[UI ENGINE ERROR]:", error);
    renderizarTelaErro();
  }
}

function sincronizarPontoSelecionado(p) {
  pontoSelecionado = {
    horario: p.dataHora ? p.dataHora.split(' ')[1] : '--:--:--',
    temperatura_c: p.temperaturaCelsius ?? p.temperatura,
    luminosidade_lux: p.luminosidadeSolarPorcentagem ?? p.luzSolar,
    umidade_ar_pct: p.umidadeArPorcentagem ?? p.umidadeAr,
    umidade_solo_pct: p.umidadeSoloPorcentagem,
    irrigacao_ativa: p.statusIrrigacao === "LIGADO",
    ph_solo: p.pHSolo,
    vazao_gotejamento: p.vazaoGotejamentoLh, // Corrigido erro de referência "p" sem escopo aqui!
    controle_manual: p.controleManualAtivo,
    estacao: p.estacao,
    condicao_ceu: p.condicaoCeu
  };
}

function renderizarInterfaceCompleta(isOffline) {
  appContainer.innerHTML = gerarLayoutDashboard({
    telemetriaAtual, pontoSelecionado, cenarioAtual, isOffline, simularErroConexao,
    filtrosVisibilidade, configAgrupamento, configData
  });

  const canvasCtx = document.getElementById('analiseChart');
  if (!canvasCtx) return;
  
  chartInstance = inicializarGraficoAnalitico(canvasCtx, dadosGraficoTimelineAgrupados, chartInstance, (pontoBruto) => {
    sincronizarPontoSelecionado(pontoBruto);
    renderizarInterfaceCompleta(false);
  });

  if (chartInstance) {
    chartInstance.data.datasets.forEach(dataset => {
      const chaveVisibilidade = dataset.id;
      dataset.hidden = !filtrosVisibilidade[chaveVisibilidade];
    });
    chartInstance.update('none'); 
  }

  vincularEventos();
}

function renderizarTelaErro() {
  appContainer.innerHTML = `
    <div class="bg-red-950/20 border border-red-900/40 p-5 rounded-lg shadow-xl mt-4 max-w-[99%] mx-auto">
      <h3 class="text-red-400 font-mono font-bold text-sm flex items-center gap-2">⚠️ Uncaught SyntaxError: HTTP Request Failure</h3>
      <button id="btn-retry" class="mt-3 px-3 py-1 bg-red-900 text-red-200 font-mono text-xs rounded">Retry Connection</button>
    </div>`;
  document.getElementById('btn-retry')?.addEventListener('click', processarCicloUI);
}

async function alternarEstadoBomba(bombaManualAtiva) {
  try {
    const payload = bombaManualAtiva ? { automatico: true } : { ligar: true, automatico: false };
    await fetch(`${API_BASE_URL}/api/controle/irrigacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    await processarCicloUI();
  } catch (err) {
    console.error("Erro ao enviar comando de irrigação:", err);
  }
}

function vincularEventos() {
  document.getElementById('btn-aplicar-filtros-alertas')
  ?.addEventListener('click', () => {
    const filtros = lerFiltrosAlertasDoDOM();

    const todosAlertas = obterAlertasCompletos(telemetriaAtual, dadosGraficoTimelineBrutos);

    const filtrados = filtrarAlertas(todosAlertas, filtros);

    appContainer.innerHTML = renderAlertasView({
      estado: 'success',
      alertas: filtrados,
      filtros,
    });
 
  });

  document.getElementById('select-unidade-tempo')?.addEventListener('change', (e) => {
    configAgrupamento.unidade = e.target.value;
    processarAgrupamentoETempo();
    renderizarInterfaceCompleta(false);
  });

  document.getElementById('input-fator-tempo')?.addEventListener('change', (e) => {
    configAgrupamento.fator = Math.max(1, parseInt(e.target.value) || 1);
    processarAgrupamentoETempo();
    renderizarInterfaceCompleta(false);
  });

  document.getElementById('btn-aplicar-datas')?.addEventListener('click', () => {
    configData.inicio = document.getElementById('filtro-data-inicio').value;
    configData.fim = document.getElementById('filtro-data-fim').value;
    processarAgrupamentoETempo();
    renderizarInterfaceCompleta(false);
  });

  const btnBomba = document.getElementById('btn-toggle-bomba');
  if (btnBomba) {
    btnBomba.addEventListener('click', () => {
      const bombaManualAtiva = telemetriaAtual?.atuadores.controleManualAtivo || false;
      alternarEstadoBomba(bombaManualAtiva);
    });
  }

  document.querySelectorAll('.btn-cenario').forEach(btn => {
    btn.addEventListener('click', (e) => {
      cenarioAtual = e.target.getAttribute('data-cenario');
      simularErroConexao = false;
      processarCicloUI();
    });
  });

  const btnToggleError = document.getElementById('btn-toggle-error');
  if (btnToggleError) {
    btnToggleError.addEventListener('click', () => {
      simularErroConexao = !simularErroConexao;
      processarCicloUI();
    });
  }
}

processarCicloUI();
