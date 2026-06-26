/**
 * cardHelpers.js
 * Funções puras auxiliares para os cards e painéis do dashboard.
 *
 * Todas as funções aqui são PURAS: sem efeitos colaterais, sem acesso ao DOM,
 * sem dependências externas — facilitando testes unitários e reutilização.
 *
 * Controles de segurança aplicados (ISO 27001 A.14.2.5 / ISO 27002 8.28):
 *  - Todas as entradas do usuário passam por sanitização antes de uso.
 *  - Nenhum dado sensível é logado ou persistido por estas funções.
 *  - Inputs numéricos são verificados quanto a tipo e faixa válida.
 */

import { CULTURAS_VALIDAS } from './mockService.js';

// ─────────────────────────────────────────────────────────────────────────────
// Passo 2 — Status dinâmico por threshold
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna descrição textual do status da umidade do solo.
 * @param {number|null} valor - Porcentagem (0–100).
 * @returns {string}
 */
export function calcularStatusUmidadeSolo(valor) {
  if (valor === null || valor === undefined || typeof valor !== 'number') return 'N/D';
  if (valor <= 30) return 'Solo muito seco';
  if (valor <= 55) return 'Solo seco';
  if (valor <= 85) return 'Umido';
  return 'Saturado';
}

/**
 * Retorna descrição textual do status da umidade do ar.
 * @param {number|null} valor - Porcentagem (0–100).
 * @returns {string}
 */
export function calcularStatusUmidadeAr(valor) {
  if (valor === null || valor === undefined || typeof valor !== 'number') return 'N/D';
  if (valor < 40) return 'Ar seco';
  if (valor > 80) return 'Muito umido';
  return 'Agradavel';
}

/**
 * Retorna descrição textual do status da temperatura.
 * @param {number|null} valor - Graus Celsius.
 * @returns {string}
 */
export function calcularStatusTemperatura(valor) {
  if (valor === null || valor === undefined || typeof valor !== 'number') return 'N/D';
  if (valor < 10) return 'Frio';
  if (valor > 35) return 'Critico';
  if (valor > 28) return 'Quente';
  return 'Estavel';
}

// ─────────────────────────────────────────────────────────────────────────────
// Passo 1 — Barra de progresso
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converte um valor para porcentagem de preenchimento da barra de progresso.
 * Clamp entre 0 e 100.
 * @param {number} valor
 * @param {number} [min=0]
 * @param {number} [max=100]
 * @returns {number} Valor entre 0 e 100.
 */
export function calcularProgressBarPct(valor, min = 0, max = 100) {
  if (valor === null || valor === undefined || typeof valor !== 'number') return 0;
  if (max <= min) return 0;
  const pct = ((valor - min) / (max - min)) * 100;
  return Math.min(100, Math.max(0, parseFloat(pct.toFixed(1))));
}

// ─────────────────────────────────────────────────────────────────────────────
// Passo 4 — Indicador de tendência (delta)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a diferença entre leitura anterior e atual.
 * Retorna null quando não há leitura anterior disponível.
 * @param {number|null} anterior
 * @param {number|null} atual
 * @returns {number|null}
 */
export function calcularDelta(anterior, atual) {
  if (anterior === null || anterior === undefined) return null;
  if (atual === null || atual === undefined) return null;
  if (typeof anterior !== 'number' || typeof atual !== 'number') return null;
  return parseFloat((atual - anterior).toFixed(1));
}

// ─────────────────────────────────────────────────────────────────────────────
// Passo 3 — Timestamp de última atualização
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formata uma string ISO de dataHora para exibição compacta "HH:MM".
 * Retorna '--:--' em caso de valor inválido ou ausente.
 * @param {string|null} dataHora - ISO string ou formato variado.
 * @returns {string}
 */
export function formatarTimestamp(dataHora) {
  if (!dataHora || typeof dataHora !== 'string') return '--:--';
  try {
    const d = new Date(dataHora);
    if (isNaN(d.getTime())) return '--:--';
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '--:--';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Passo 7 — Uptime calculado
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formata tempo decorrido desde um timestamp de início em "Xd Yh".
 * @param {number} inicioMs - timestamp em ms (Date.now()).
 * @returns {string}
 */
export function formatarUptime(inicioMs) {
  if (!inicioMs || typeof inicioMs !== 'number') return '0d 0h';
  const diff = Math.max(0, Date.now() - inicioMs);
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `${dias}d ${horas}h`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Passo 8 — Formatação de duração de irrigação
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formata segundos em string legível (ex: "60s" → "1m", "30s" → "30s").
 * @param {number} segundos
 * @returns {string}
 */
export function formatarDuracaoIrrigacao(segundos) {
  if (!segundos || typeof segundos !== 'number' || segundos <= 0) return '0s';
  if (segundos < 60) return `${segundos}s`;
  return `${Math.floor(segundos / 60)}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Segurança — ISO 27001 A.14.2.5 / ISO 27002 8.28
// Sanitização de entradas do usuário (campos de data)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitiza e valida input de data no formato datetime-local (YYYY-MM-DDTHH:MM).
 * Retorna string vazia se o formato for inválido ou potencialmente malicioso.
 *
 * ISO 27001 A.14.2.5: validação de entrada em serviços de aplicação.
 * ISO 27002 8.28: programação segura — nunca confiar em entrada do usuário.
 *
 * @param {string|null|undefined} valor
 * @returns {string} Valor sanitizado ou string vazia.
 */
export function sanitizarEntradaData(valor) {
  if (!valor || typeof valor !== 'string') return '';
  const trimado = valor.trim();
  // Aceita apenas o formato exato produzido por <input type="datetime-local">
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimado)) return '';
  // Verifica se a data é efetivamente válida (não apenas o padrão)
  const parsed = new Date(trimado);
  if (isNaN(parsed.getTime())) return '';
  return trimado;
}

/**
 * Sanitiza valores numéricos de duração de irrigação.
 * Aceita apenas valores da lista permitida para evitar manipulação de comandos.
 *
 * ISO 27002 8.2: controle de acesso privilegiado (controle de atuadores).
 *
 * @param {number|string} valor
 * @param {number[]} [valoresPermitidos=[30, 60, 120, 300]]
 * @returns {number} Valor sanitizado ou 60 como padrão seguro.
 */
export function sanitizarDuracaoIrrigacao(valor, valoresPermitidos = [30, 60, 120, 300]) {
  const num = parseInt(valor, 10);
  if (isNaN(num)) return 60;
  if (!valoresPermitidos.includes(num)) return 60;
  return num;
}

/**
 * Escapa caracteres HTML para mitigar XSS ao renderizar texto dinâmico.
 * @param {string|null|undefined} texto
 * @returns {string}
 */
export function escapeHtml(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitiza nome/descrição de canteiro (sem tags HTML).
 * @param {string|null|undefined} valor
 * @returns {string}
 */
export function sanitizarTextoCanteiro(valor) {
  if (!valor || typeof valor !== 'string') return '';
  const trimado = valor.trim().slice(0, 80);
  return trimado
    .replace(/[<>"'`/\\]/g, '')
    .replace(/script/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Valida payload de canteiro para CRUD.
 * @param {object} dados
 * @returns {{ valido: boolean, erros: string[], area_m2?: number }}
 */
export function validarCanteiro(dados) {
  const erros = [];
  const nome = sanitizarTextoCanteiro(dados?.nome);
  if (!nome || nome.length < 2) erros.push('Nome é obrigatório (mín. 2 caracteres)');

  const area = parseFloat(dados?.area_m2);
  if (isNaN(area) || area <= 0) erros.push('Área deve ser maior que zero');

  const cultura = dados?.cultura;
  if (!cultura || !CULTURAS_VALIDAS.includes(cultura)) {
    erros.push('Cultura inválida');
  }

  return {
    valido: erros.length === 0,
    erros,
    area_m2: area,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Agregação de flags de chuva / irrigação (buckets do gráfico)
// ─────────────────────────────────────────────────────────────────────────────

export function pontoComChuva(p) {
  return p?.estaChovendo === true || p?.estaChovendo === 1;
}

export function pontoComIrrigacao(p) {
  return p?.statusIrrigacao === 'LIGADO' || p?.statusIrrigacao === 1;
}

/** Marca bucket se qualquer leitura no intervalo teve chuva ou irrigação. */
export function agregarFlagsBucket(lista) {
  return {
    estaChovendo: lista.some(pontoComChuva),
    statusIrrigacao: lista.some(pontoComIrrigacao) ? 'LIGADO' : 'DESLIGADO',
    controleManualAtivo: lista.some(p => p?.controleManualAtivo || p?.modoIrrigacaoManual),
  };
}

export { CULTURAS_VALIDAS };
