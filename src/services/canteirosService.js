/**
 * CRUD de canteiros com persistência local (mock até Marco 4 / API real).
 * Apenas o Canteiro Alface (id A) vem da API; demais são cadastrados pelo usuário.
 */

import { CANTEIRO_REAL, CANTEIRO_API_ID, CULTURAS_VALIDAS } from './mockService.js';
import { sanitizarTextoCanteiro, validarCanteiro } from './cardHelpers.js';

const STORAGE_KEY = 'phorta-canteiros';

/** IDs do seed antigo (4 canteiros mockados) — removidos na migração */
const LEGACY_AUTO_SEED = [
  { id: 'B', nome: 'Canteiro B' },
  { id: 'C', nome: 'Canteiro C' },
  { id: 'D', nome: 'Canteiro D' },
];

function lerStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function salvarStorage(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

function isLegacyAutoSeed(c) {
  return LEGACY_AUTO_SEED.some(
    leg => leg.id === c.id && leg.nome === c.nome && !c.criadoPeloUsuario
  );
}

function migrarLista(lista) {
  const demais = lista
    .filter(c => c.id !== CANTEIRO_API_ID && !isLegacyAutoSeed(c))
    .map(c => ({ ...c, fonteApi: false }));

  const existente = lista.find(c => c.id === CANTEIRO_API_ID);
  const api = {
    ...CANTEIRO_REAL,
    ...existente,
    fonteApi: true,
    offline: false,
  };

  return [api, ...demais];
}

export function inicializarCanteiros() {
  const stored = lerStorage();
  if (!stored) {
    salvarStorage([{ ...CANTEIRO_REAL }]);
    return;
  }
  salvarStorage(migrarLista(stored));
}

export function getCanteiros() {
  inicializarCanteiros();
  return lerStorage() || [{ ...CANTEIRO_REAL }];
}

export function getCanteiroPorId(id) {
  return getCanteiros().find(c => c.id === id) || null;
}

export function isCanteiroApi(id) {
  return id === CANTEIRO_API_ID;
}

export function createCanteiro(dados) {
  const validacao = validarCanteiro(dados);
  if (!validacao.valido) {
    return { ok: false, erros: validacao.erros };
  }

  const lista = getCanteiros();
  const id = dados.id?.trim().toUpperCase() || gerarId(lista);

  if (id === CANTEIRO_API_ID) {
    return { ok: false, erros: ['O ID "A" é reservado ao canteiro conectado à API'] };
  }

  if (lista.some(c => c.id === id)) {
    return { ok: false, erros: ['ID de canteiro já existe'] };
  }

  const novo = {
    id,
    nome: sanitizarTextoCanteiro(dados.nome),
    cultura: dados.cultura,
    area_m2: validacao.area_m2,
    sensores: parseInt(dados.sensores, 10) || 3,
    offline: false,
    fonteApi: false,
    criadoPeloUsuario: true,
  };

  lista.push(novo);
  salvarStorage(lista);
  return { ok: true, canteiro: novo };
}

export function updateCanteiro(id, dados) {
  const lista = getCanteiros();
  const idx = lista.findIndex(c => c.id === id);
  if (idx === -1) return { ok: false, erros: ['Canteiro não encontrado'] };

  const merged = { ...lista[idx], ...dados, id };
  const validacao = validarCanteiro(merged);
  if (!validacao.valido) return { ok: false, erros: validacao.erros };

  lista[idx] = {
    ...lista[idx],
    nome: sanitizarTextoCanteiro(merged.nome),
    cultura: merged.cultura,
    area_m2: validacao.area_m2,
    sensores: parseInt(merged.sensores, 10) || lista[idx].sensores,
    fonteApi: lista[idx].fonteApi ?? false,
  };

  salvarStorage(lista);
  return { ok: true, canteiro: lista[idx] };
}

export function deleteCanteiro(id) {
  if (id === CANTEIRO_API_ID) {
    return { ok: false, erros: ['O canteiro Alface (API) não pode ser excluído'] };
  }

  const lista = getCanteiros();
  const filtrada = lista.filter(c => c.id !== id);
  if (filtrada.length === lista.length) {
    return { ok: false, erros: ['Canteiro não encontrado'] };
  }
  salvarStorage(filtrada);
  return { ok: true };
}

function gerarId(lista) {
  const letras = 'BCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const l of letras) {
    if (l !== CANTEIRO_API_ID && !lista.some(c => c.id === l)) return l;
  }
  return `C${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

export { CULTURAS_VALIDAS, CANTEIRO_API_ID, CANTEIRO_REAL };
