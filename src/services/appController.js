import { renderNavbar } from './appRenderService.js';
import { gerarLayoutDashboard } from './dashboardViewService.js';
import { inicializarGraficoAnalitico } from './chartService.js';
import { buscarDadosDispositivo } from './apiService.js';
import {
  carregarCacheSnapshot,
  carregarSessaoLocal,
  salvarSessaoLocal,
  toCachedResponse,
} from './cacheService.js';
import { obterTelemetriaMockada, obterHistoricoMockado } from './mockService.js';
import { sanitizarEntradaData, sanitizarDuracaoIrrigacao } from './cardHelpers.js';

const JANELA_PADRAO_HORAS = 48;

let estadoApp = {
  cenarioAtual: 'offline',
  filtroDataAtivo: false,
  filtrosVisibilidade: {
    umid_solo: true, umid_ar: true, temp: true, luz: true, ph: true,
    chuva: true, alerta: true, irrigacao: true
  },
  configAgrupamento: { unidade: 'minuto', fator: 1 },
  configData: {
    inicio: '',
    fim: '',
    fimControleManual: false
  },
  limitesData: { min: '', max: '' },
  telemetriaAtual: null,
  telemetriaAnterior: null,          // Passo 4 — base para cálculo de delta
  dadosGraficoTimelineBrutos: [],
  dadosGraficoTimelineAgrupados: [],
  pontoSelecionado: null,
  timestampInicio: Date.now(),        // Passo 7 — base para cálculo de uptime
  ultimoComando: null,                // Passo 7 — último comando enviado
  logErros: [],                       // Passo 9 — log acumulado (máx. 20 entradas)
  duracaoIrrigacaoSeg: 60,            // Passo 8 — duração de irrigação configurável
  fetchedAt: null,
};

let chartInstance = null;
let agendadorTimeout = null;
let estaCarregando = false;

/**
 * Passo 9 — Adiciona entrada ao log de erros/eventos acumulado.
 * Mantém máximo de 20 entradas (mais recentes no topo).
 * ISO 27002 8.16: rastreabilidade de ações no sistema.
 *
 * @param {'ERR'|'WARN'|'OK'|'CMD'} nivel
 * @param {string} mensagem
 */
function adicionarLogErro(nivel, mensagem) {
  const timestamp = new Date().toLocaleTimeString('pt-BR', { hour12: false });
  estadoApp.logErros.unshift({ nivel, mensagem, timestamp });
  if (estadoApp.logErros.length > 20) estadoApp.logErros.pop();
  persistirSessaoLocal();
}

function persistirSessaoLocal() {
  salvarSessaoLocal({
    timestampInicio: estadoApp.timestampInicio,
    logErros: estadoApp.logErros,
    filtrosVisibilidade: estadoApp.filtrosVisibilidade,
    configAgrupamento: estadoApp.configAgrupamento,
    filtroDataAtivo: estadoApp.filtroDataAtivo,
    configData: estadoApp.configData,
    duracaoIrrigacaoSeg: estadoApp.duracaoIrrigacaoSeg,
    ultimoComando: estadoApp.ultimoComando,
  });
}

function restaurarSessaoLocal() {
  const sessao = carregarSessaoLocal();
  if (!sessao) return;
  if (sessao.timestampInicio) estadoApp.timestampInicio = sessao.timestampInicio;
  if (Array.isArray(sessao.logErros)) estadoApp.logErros = sessao.logErros;
  if (sessao.filtrosVisibilidade) estadoApp.filtrosVisibilidade = sessao.filtrosVisibilidade;
  if (sessao.configAgrupamento) estadoApp.configAgrupamento = sessao.configAgrupamento;
  if (typeof sessao.filtroDataAtivo === 'boolean') estadoApp.filtroDataAtivo = sessao.filtroDataAtivo;
  if (sessao.configData) estadoApp.configData = { ...estadoApp.configData, ...sessao.configData };
  if (sessao.duracaoIrrigacaoSeg) estadoApp.duracaoIrrigacaoSeg = sessao.duracaoIrrigacaoSeg;
  if (sessao.ultimoComando) estadoApp.ultimoComando = sessao.ultimoComando;
}

function aplicarPayloadNoEstado(payload) {
  estadoApp.telemetriaAnterior = estadoApp.telemetriaAtual;
  estadoApp.cenarioAtual = payload.cenario || 'offline';
  estadoApp.telemetriaAtual = payload.telemetria;
  estadoApp.dadosGraficoTimelineBrutos = payload.historico || [];
  estadoApp.fetchedAt = payload.fetchedAt ?? null;
}

function comandoBloqueado() {
  return estadoApp.cenarioAtual === 'offline' || estadoApp.cenarioAtual.endsWith('-cached');
}

const navContainer  = document.getElementById('nav-container');
const appContainer  = document.getElementById('app-container');

function converterStringBrParaDate(stringBr) {
  try {
    if (!stringBr || !stringBr.includes('/')) return new Date();
    const partes = stringBr.trim().split(' ');
    const [dia, mes, ano] = partes[0].split('/').map(Number);
    const [hora, min]     = (partes[1] || '00:00').split(':').map(Number);
    return new Date(ano || 2026, mes - 1, dia, hora || 0, min || 0, 0);
  } catch { return new Date(); }
}

function formatarDateParaStringBr(d) {
  if (!d || isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parsearDataHora(valor) {
  if (!valor) return NaN;
  if (typeof valor === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor))
      return new Date(valor + ':00-03:00').getTime();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(valor))
      return new Date(valor.replace(' ', 'T') + '-03:00').getTime();
    if (/^\d{2}\/\d{2}\/\d{4}/.test(valor))
      return converterStringBrParaDate(valor).getTime();
    if (/^\d{4}\/\d{2}\/\d{2}/.test(valor))
      return new Date(valor.replace(/\//g, '-').replace(' ', 'T')).getTime();
  }
  return new Date(valor).getTime();
}

async function atualizarEstadoDados() {
  if (estaCarregando) return;
  estaCarregando = true;

  try {
    const payload = await buscarDadosDispositivo();

    aplicarPayloadNoEstado(payload);

    if (!estadoApp.dadosGraficoTimelineBrutos?.length) {
      adicionarLogErro('WARN', 'Histórico vazio — usando mock local');
      estadoApp.dadosGraficoTimelineBrutos = obterHistoricoMockado();
      estadoApp.cenarioAtual = 'offline';
      estadoApp.fetchedAt = null;
    }
    if (!estadoApp.telemetriaAtual) {
      estadoApp.telemetriaAtual = obterTelemetriaMockada();
    }

    const origem = payload.fromCache ? 'cache' : 'rede';
    adicionarLogErro('OK', `${estadoApp.dadosGraficoTimelineBrutos.length} registros | ${estadoApp.cenarioAtual} (${origem})`);

  } catch (err) {
    adicionarLogErro('ERR', `Falha na API: ${err.message}`);
    const cached = await carregarCacheSnapshot();
    if (cached) {
      aplicarPayloadNoEstado(toCachedResponse(cached));
      adicionarLogErro('WARN', 'Recuperado do cache local após erro');
    } else {
      estadoApp.cenarioAtual = 'offline';
      estadoApp.fetchedAt = null;
      estadoApp.dadosGraficoTimelineBrutos = obterHistoricoMockado();
      estadoApp.telemetriaAtual = obterTelemetriaMockada();
    }
  } finally {
    estaCarregando = false;
  }

  const agora = new Date();
  estadoApp.limitesData.max = formatarDateParaStringBr(agora);
  if (!estadoApp.configData.fimControleManual) {
    estadoApp.configData.fim = estadoApp.limitesData.max;
  }

  processarAgrupamentoETempo();
}

function processarAgrupamentoETempo() {
  const brutos = estadoApp.dadosGraficoTimelineBrutos;
  if (!brutos?.length) return;

  let filtrados;

  if (estadoApp.filtroDataAtivo && estadoApp.configData.inicio) {
    const ini = parsearDataHora(estadoApp.configData.inicio);
    const fim = estadoApp.configData.fimControleManual
      ? parsearDataHora(estadoApp.configData.fim)
      : Date.now();
    filtrados = brutos.filter(p => {
      const ts = parsearDataHora(p.dataHora);
      return !isNaN(ts) && ts >= ini && ts <= fim;
    });
    console.log(`🔍 Filtro manual: ${filtrados.length} pontos`);
  } else {
    const corte = Date.now() - JANELA_PADRAO_HORAS * 60 * 60 * 1000;
    filtrados = brutos.filter(p => {
      const ts = parsearDataHora(p.dataHora);
      return !isNaN(ts) && ts >= corte;
    });
    console.log(`📊 Janela ${JANELA_PADRAO_HORAS}h: ${filtrados.length} pontos`);
  }

  if (!filtrados.length) {
    console.warn('⚠️ Nenhum ponto no intervalo. Amostra:', brutos[0]?.dataHora);
    estadoApp.dadosGraficoTimelineAgrupados = [];
    return;
  }

  const factor = parseInt(estadoApp.configAgrupamento.fator) || 1;
  const unit   = estadoApp.configAgrupamento.unidade;
  const buckets = {};

  filtrados.forEach(p => {
    const dt = new Date(parsearDataHora(p.dataHora));
    if (unit === 'minuto')      dt.setMinutes(Math.floor(dt.getMinutes() / factor) * factor, 0, 0);
    else if (unit === 'hora')   dt.setHours(Math.floor(dt.getHours() / factor) * factor, 0, 0, 0);
    else if (unit === 'dia')    dt.setHours(0, 0, 0, 0);
    else                        dt.setMinutes(Math.floor(dt.getMinutes() / factor) * factor, 0, 0);
    const k = dt.toISOString();
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(p);
  });

  estadoApp.dadosGraficoTimelineAgrupados = Object.keys(buckets).sort().map(chave => {
    const lista  = buckets[chave];
    const total  = lista.length;
    const dt     = new Date(chave);
    const soma   = lista.reduce((a, c) => ({
      s: a.s + (c.umidadeSoloPorcentagem || 0),
      ar: a.ar + (c.umidadeAr || 0),
      t: a.t + (c.temperatura || 0),
      l: a.l + (c.luzSolar || 0),
      p: a.p + (c.pHSolo || 7),
    }), { s:0, ar:0, t:0, l:0, p:0 });

    return {
      dataHora:              `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour12: false })}`,
      umidadeSoloPorcentagem: parseFloat((soma.s  / total).toFixed(1)),
      umidadeAr:              parseFloat((soma.ar / total).toFixed(1)),
      temperatura:            parseFloat((soma.t  / total).toFixed(1)),
      luzSolar:               parseFloat((soma.l  / total).toFixed(1)),
      pHSolo:                 parseFloat((soma.p  / total).toFixed(2)),
      estaChovendo:           lista[0]?.estaChovendo        || false,
      statusIrrigacao:        lista[0]?.statusIrrigacao     || 'DESLIGADO',
      vazaoGotejamentoLh:     lista[0]?.vazaoGotejamentoLh  || 0,
      controleManualAtivo:    lista[0]?.controleManualAtivo || false,
      estacao:                lista[0]?.estacao             || '---',
      condicaoCeu:            lista[0]?.condicaoCeu         || '---',
    };
  });

  console.log(`✅ ${estadoApp.dadosGraficoTimelineAgrupados.length} buckets gerados`);
}

function sincronizarPontoSelecionado(p) {
  estadoApp.pontoSelecionado = {
    horario:           p.dataHora?.split(' ')[1] ?? '--:--:--',
    temperatura_c:     p.temperatura     ?? p.temperaturaCelsius ?? 0,
    luminosidade_lux:  p.luzSolar        ?? 0,
    umidade_ar_pct:    p.umidadeAr       ?? 0,
    umidade_solo_pct:  p.umidadeSoloPorcentagem ?? 0,
    irrigacao_ativa:   p.statusIrrigacao === 'LIGADO',
    ph_solo:           p.pHSolo          || 7,
    vazao_gotejamento: p.vazaoGotejamentoLh || 0,
    controle_manual:   p.controleManualAtivo || false,
    estacao:           p.estacao         || '---',
    condicao_ceu:      p.condicaoCeu     || '---',
  };
}

function renderizarInterfaceCompleta() {
  if (!appContainer) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  appContainer.innerHTML = gerarLayoutDashboard({
    telemetriaAtual:      estadoApp.telemetriaAtual,
    telemetriaAnterior:   estadoApp.telemetriaAnterior,
    pontoSelecionado:     estadoApp.pontoSelecionado,
    cenarioAtual:         estadoApp.cenarioAtual,
    filtrosVisibilidade:  estadoApp.filtrosVisibilidade,
    configAgrupamento:    estadoApp.configAgrupamento,
    configData:           estadoApp.configData,
    limitesData:          estadoApp.limitesData,
    timestampInicio:      estadoApp.timestampInicio,
    fetchedAt:              estadoApp.fetchedAt,
    ultimoComando:        estadoApp.ultimoComando,
    logErros:             estadoApp.logErros,
    duracaoIrrigacaoSeg:  estadoApp.duracaoIrrigacaoSeg,
  });

  const canvas = document.getElementById('analiseChart');
  if (!canvas) return;

  chartInstance = inicializarGraficoAnalitico(
    canvas,
    estadoApp.dadosGraficoTimelineAgrupados,
    chartInstance,
    (ponto) => { sincronizarPontoSelecionado(ponto); renderizarInterfaceCompleta(); }
  );

  if (chartInstance) {
    chartInstance.data.datasets.forEach(ds => {
      ds.hidden = !estadoApp.filtrosVisibilidade[ds.id];
    });
    chartInstance.update('none');
  }

  vincularEventosDashboard();
}

function vincularEventosDashboard() {
  document.querySelectorAll('.chk-visibilidade').forEach(chk => {
    chk.addEventListener('change', e => {
      const id = e.target.getAttribute('data-series');
      estadoApp.filtrosVisibilidade[id] = e.target.checked;
      persistirSessaoLocal();
      if (chartInstance) {
        const ds = chartInstance.data.datasets.find(d => d.id === id);
        if (ds) { ds.hidden = !e.target.checked; chartInstance.update(); }
      }
    });
  });

  // Agrupamento temporal
  document.getElementById('select-unidade-tempo')?.addEventListener('change', e => {
    estadoApp.configAgrupamento.unidade = e.target.value;
    persistirSessaoLocal();
    processarAgrupamentoETempo();
    renderizarInterfaceCompleta();
  });

  document.getElementById('input-fator-tempo')?.addEventListener('change', e => {
    estadoApp.configAgrupamento.fator = Math.max(1, parseInt(e.target.value) || 1);
    persistirSessaoLocal();
    processarAgrupamentoETempo();
    renderizarInterfaceCompleta();
  });

  document.getElementById('btn-aplicar-datas')?.addEventListener('click', () => {
    // ISO 27001 A.14.2.5 — sanitizar entrada do usuário antes de usar
    const ini = sanitizarEntradaData(document.getElementById('filtro-data-inicio')?.value);
    const fim = sanitizarEntradaData(document.getElementById('filtro-data-fim')?.value);
    if (!ini) return;
    estadoApp.configData.inicio           = ini;
    estadoApp.configData.fim              = fim || '';
    estadoApp.configData.fimControleManual = !!(fim && fim !== '');
    estadoApp.filtroDataAtivo             = true;
    persistirSessaoLocal();
    processarAgrupamentoETempo();
    renderizarInterfaceCompleta();
  });

  document.getElementById('btn-limpar-datas')?.addEventListener('click', () => {
    estadoApp.filtroDataAtivo              = false;
    estadoApp.configData.inicio            = '';
    estadoApp.configData.fim               = '';
    estadoApp.configData.fimControleManual = false;
    persistirSessaoLocal();
    processarAgrupamentoETempo();
    renderizarInterfaceCompleta();
  });

  // Passo 8 — Duração de irrigação configurável com sanitização (ISO 27002 8.2)
  document.getElementById('select-duracao-irrigacao')?.addEventListener('change', e => {
    estadoApp.duracaoIrrigacaoSeg = sanitizarDuracaoIrrigacao(e.target.value);
    persistirSessaoLocal();
  });

  // Passo 7 — Botão de irrigação: registrar último comando
  document.getElementById('btn-toggle-bomba')?.addEventListener('click', () => {
    if (comandoBloqueado()) return;
    const bombaAtiva = estadoApp.telemetriaAtual?.statusIrrigacao === 'LIGADO';
    const cmd = bombaAtiva
      ? 'Parar irrigação'
      : `Iniciar irrigação (${estadoApp.duracaoIrrigacaoSeg}s)`;
    estadoApp.ultimoComando = cmd;
    adicionarLogErro('CMD', cmd);
    renderizarInterfaceCompleta();
  });
}

async function processarCicloDadosEUI() {
  await atualizarEstadoDados();
  if (!estadoApp.pontoSelecionado && estadoApp.telemetriaAtual) {
    sincronizarPontoSelecionado(estadoApp.telemetriaAtual);
  }
  renderizarInterfaceCompleta();
  // Atualiza navbar com cenário atual
  if (navContainer) {
    navContainer.innerHTML = renderNavbar(estadoApp.cenarioAtual);
  }
}

function agendarProximaAtualizacao() {
  if (agendadorTimeout) clearTimeout(agendadorTimeout);
  const agora = new Date();
  const msAteVirada = 60000 - (agora.getSeconds() * 1000 + agora.getMilliseconds());
  agendadorTimeout = setTimeout(async () => {
    if (!estadoApp.configData.fimControleManual) {
      await processarCicloDadosEUI();
    }
    agendarProximaAtualizacao();
  }, msAteVirada + 30000);
}

function vincularToggleTema() {
  document.addEventListener('click', e => {
    if (e.target.closest('#btn-toggle-tema')) {
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme',
        document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      if (navContainer) {
        navContainer.innerHTML = renderNavbar(estadoApp.cenarioAtual);
      }
      renderizarInterfaceCompleta();
    }
  });
}

async function inicializarOrquestrador() {
  restaurarSessaoLocal();

  if (navContainer) {
    navContainer.innerHTML = renderNavbar(estadoApp.cenarioAtual);
  }

  const cached = await carregarCacheSnapshot();
  if (cached) {
    aplicarPayloadNoEstado(toCachedResponse(cached));
    processarAgrupamentoETempo();
    if (estadoApp.telemetriaAtual) {
      sincronizarPontoSelecionado(estadoApp.telemetriaAtual);
    }
    renderizarInterfaceCompleta();
    if (navContainer) {
      navContainer.innerHTML = renderNavbar(estadoApp.cenarioAtual);
    }
  }

  vincularToggleTema();
  await processarCicloDadosEUI();
  agendarProximaAtualizacao();
}

inicializarOrquestrador();
