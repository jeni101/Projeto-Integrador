import {
  carregarCacheSnapshot,
  salvarCacheSnapshot,
  toCachedResponse,
} from './cacheService.js';

const PRIMARY_API = 'https://horta-api-htggarb3eagagpgm.brazilsouth-01.azurewebsites.net';
const FALLBACK_API = 'https://server-horta.onrender.com';

export const JANELA_HISTORICO_MINUTOS = 10080;

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export function normalizarRegistro(log) {
  const ca = log.condicoes_ambientais || {};
  const ss = log.sensores_solo || {};
  const at = log.atuadores || {};
  return {
    id: log.id,
    dataHora: log.dataHora,
    umidadeSoloPorcentagem: ss.umidadeSoloPorcentagem ?? log.umidadeSoloPorcentagem ?? 0,
    temperatura: ca.temperaturaCelsius ?? log.temperatura ?? 0,
    umidadeAr: ca.umidadeArPorcentagem ?? log.umidadeAr ?? 0,
    pHSolo: ss.pHSolo ?? log.pHSolo ?? 7.0,
    luzSolar: ca.luminosidadeSolarPorcentagem ?? log.luzSolar ?? 0,
    statusIrrigacao: at.statusIrrigacao ?? (
      log.statusIrrigacao === 1 || log.statusIrrigacao === 'LIGADO' ? "LIGADO" : "DESLIGADO"
    ),
    estaChovendo: ca.estaChovendo ?? (log.estaChovendo === 1 || log.estaChovendo === true),
    vazaoGotejamentoLh: at.vazaoGotejamentoLh ?? (log.statusIrrigacao === 1 ? 2.0 : 0),
    controleManualAtivo: at.controleManualAtivo ?? false,
    estacao: ca.estacao ?? log.estacao ?? "---",
    condicaoCeu: ca.condicaoCeu ?? log.condicaoCeu ?? "---"
  };
}

async function obterHistoricoCompleto(baseUrl) {
  const url = `${baseUrl}/api/historico/completo?minutosAtras=${JANELA_HISTORICO_MINUTOS}`;
  console.log(`📡 Buscando histórico completo: ${url}`);

  const resposta = await fetchWithTimeout(url);

  if (!resposta.ok) {
    throw new Error(`HTTP ${resposta.status} em ${baseUrl}`);
  }

  const dados = await resposta.json();

  let lista = [];
  if (Array.isArray(dados)) {
    lista = dados;
  } else if (Array.isArray(dados.dashboardData)) {
    lista = dados.dashboardData;
  }

  if (lista.length === 0) {
    throw new Error(`Histórico vazio em ${baseUrl}`);
  }

  console.log(`✅ ${lista.length} registros recebidos de ${baseUrl}`);
  return lista.map(normalizarRegistro);
}

async function tentarBuscarApis() {
  try {
    const historico = await obterHistoricoCompleto(PRIMARY_API);
    const ultimaLeitura = historico[historico.length - 1];
    return {
      telemetria: ultimaLeitura,
      historico,
      cenario: 'normal',
    };
  } catch (err) {
    console.warn(`⚠️ Azure falhou: ${err.message}. Tentando Render...`);
  }

  try {
    const historico = await obterHistoricoCompleto(FALLBACK_API);
    const ultimaLeitura = historico[historico.length - 1];
    return {
      telemetria: ultimaLeitura,
      historico,
      cenario: 'render-live',
    };
  } catch (err) {
    console.error(`💥 Render também falhou: ${err.message}.`);
  }

  return null;
}

export async function buscarDadosDispositivo(options = {}) {
  const { preferCache = false } = options;
  const cached = await carregarCacheSnapshot();

  if (preferCache && cached) {
    return toCachedResponse(cached);
  }

  const fresh = await tentarBuscarApis();
  if (fresh) {
    const fetchedAt = Date.now();
    await salvarCacheSnapshot({ ...fresh, fetchedAt });
    return { ...fresh, fetchedAt, fromCache: false };
  }

  if (cached) {
    console.warn('APIs indisponíveis — usando último snapshot em cache');
    return toCachedResponse(cached);
  }

  return {
    telemetria: null,
    historico: [],
    cenario: 'offline',
    fromCache: false,
  };
}
