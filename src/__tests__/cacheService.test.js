/**
 * Testes unitários para cacheService.js.
 */
import {
  CACHE_TTL_MS,
  SESSION_STORAGE_KEY,
  carregarCacheSnapshot,
  carregarSessaoLocal,
  formatarIdadeCache,
  limparCacheSnapshot,
  salvarCacheSnapshot,
  salvarSessaoLocal,
  snapshotExpirado,
  toCachedResponse,
} from '../services/cacheService.js';

const mockPayload = {
  telemetria: { id: 1, umidadeSoloPorcentagem: 60 },
  historico: [{ id: 1, dataHora: '2026-06-13T14:00:00.000Z' }],
  cenario: 'render-live',
};

beforeEach(async () => {
  localStorage.clear();
  await limparCacheSnapshot();
});

describe('snapshotExpirado', () => {
  test('retorna true quando fetchedAt está ausente', () => {
    expect(snapshotExpirado({})).toBe(true);
  });

  test('retorna false dentro do TTL', () => {
    expect(snapshotExpirado({ fetchedAt: Date.now() }, CACHE_TTL_MS)).toBe(false);
  });

  test('retorna true após TTL', () => {
    const old = Date.now() - CACHE_TTL_MS - 1000;
    expect(snapshotExpirado({ fetchedAt: old }, CACHE_TTL_MS)).toBe(true);
  });
});

describe('formatarIdadeCache', () => {
  test('formata minutos e horas', () => {
    expect(formatarIdadeCache(Date.now() - 5 * 60000)).toBe('5 min');
    expect(formatarIdadeCache(Date.now() - 90 * 60000)).toBe('1h');
  });
});

describe('salvarCacheSnapshot / carregarCacheSnapshot', () => {
  test('persiste e recupera snapshot via fallback localStorage', async () => {
    await salvarCacheSnapshot({ ...mockPayload, fetchedAt: Date.now() });
    const loaded = await carregarCacheSnapshot();
    expect(loaded).not.toBeNull();
    expect(loaded.cenario).toBe('render-live');
    expect(loaded.historico).toHaveLength(1);
  });

  test('retorna null quando snapshot expirou', async () => {
    await salvarCacheSnapshot({
      ...mockPayload,
      fetchedAt: Date.now() - CACHE_TTL_MS - 1000,
    });
    const loaded = await carregarCacheSnapshot();
    expect(loaded).toBeNull();
  });
});

describe('toCachedResponse', () => {
  test('marca cenário como cached e inclui fromCache', () => {
    const snapshot = { ...mockPayload, fetchedAt: 1000 };
    const res = toCachedResponse(snapshot);
    expect(res.cenario).toBe('render-live-cached');
    expect(res.fromCache).toBe(true);
    expect(res.fetchedAt).toBe(1000);
  });
});

describe('sessão local', () => {
  test('salva e restaura preferências de sessão', () => {
    salvarSessaoLocal({
      timestampInicio: 12345,
      logErros: [{ nivel: 'OK', mensagem: 'teste', timestamp: '10:00:00' }],
      filtrosVisibilidade: { umid_solo: false },
    });
    const sessao = carregarSessaoLocal();
    expect(sessao.timestampInicio).toBe(12345);
    expect(sessao.logErros).toHaveLength(1);
    expect(sessao.filtrosVisibilidade.umid_solo).toBe(false);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeTruthy();
  });
});
