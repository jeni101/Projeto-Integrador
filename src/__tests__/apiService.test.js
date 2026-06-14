/**
 * Testes unitários para apiService.js.
 * Cobre: normalizarRegistro (puro) e buscarDadosDispositivo (com mock de fetch).
 */
import { normalizarRegistro, buscarDadosDispositivo } from '../services/apiService.js';

jest.mock('../services/cacheService.js', () => ({
  carregarCacheSnapshot: jest.fn(),
  salvarCacheSnapshot: jest.fn().mockResolvedValue(undefined),
  toCachedResponse: jest.fn((snapshot) => ({
    telemetria: snapshot.telemetria,
    historico: snapshot.historico,
    cenario: `${(snapshot.cenario || 'normal').replace(/-cached$/, '')}-cached`,
    fetchedAt: snapshot.fetchedAt,
    fromCache: true,
  })),
}));

import {
  carregarCacheSnapshot,
  salvarCacheSnapshot,
} from '../services/cacheService.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de mock
// ─────────────────────────────────────────────────────────────────────────────

const mockRegistro = {
  id: 1,
  dataHora: '2026-06-13T14:00:00.000Z',
  umidadeSoloPorcentagem: 63.5,
  temperatura: 19.5,
  umidadeAr: 61.2,
  pHSolo: 6.2,
  luzSolar: 72,
  statusIrrigacao: 'DESLIGADO',
  estaChovendo: false,
  vazaoGotejamentoLh: 0,
  controleManualAtivo: false,
  estacao: 'INVERNO',
  condicaoCeu: 'ENSOLARADO',
};

function criarFetchMock(dados, ok = true, status = 200) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => dados,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// buscarDadosDispositivo — testes com mock de fetch
// ─────────────────────────────────────────────────────────────────────────────
describe('buscarDadosDispositivo', () => {
  beforeEach(() => {
    carregarCacheSnapshot.mockResolvedValue(null);
    salvarCacheSnapshot.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('retorna dados da API principal (Azure) quando disponível', async () => {
    global.fetch = criarFetchMock([mockRegistro]);

    const resultado = await buscarDadosDispositivo();

    expect(resultado.cenario).toBe('normal');
    expect(resultado.historico).toHaveLength(1);
    expect(resultado.telemetria.umidadeSoloPorcentagem).toBe(63.5);
  });

  test('retorna dados do fallback (Render) quando Azure falha', async () => {
    let chamadas = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      chamadas++;
      if (chamadas === 1) return Promise.reject(new Error('Azure timeout'));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [mockRegistro],
      });
    });

    const resultado = await buscarDadosDispositivo();

    expect(resultado.cenario).toBe('render-live');
    expect(resultado.historico).toHaveLength(1);
  });

  test('retorna cenário offline quando ambas as APIs falham', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Sem conexão'));

    const resultado = await buscarDadosDispositivo();

    expect(resultado.cenario).toBe('offline');
    expect(resultado.historico).toHaveLength(0);
    expect(resultado.telemetria).toBeNull();
  });

  test('retorna cache quando APIs falham mas snapshot existe', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Sem conexão'));
    carregarCacheSnapshot.mockResolvedValue({
      telemetria: mockRegistro,
      historico: [mockRegistro],
      cenario: 'normal',
      fetchedAt: Date.now(),
    });

    const resultado = await buscarDadosDispositivo();

    expect(resultado.cenario).toBe('normal-cached');
    expect(resultado.fromCache).toBe(true);
    expect(resultado.historico).toHaveLength(1);
  });

  test('salva snapshot após fetch bem-sucedido', async () => {
    global.fetch = criarFetchMock([mockRegistro]);

    await buscarDadosDispositivo();

    expect(salvarCacheSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        cenario: 'normal',
        historico: expect.any(Array),
      })
    );
  });

  test('retorna offline quando API retorna HTTP 500', async () => {
    global.fetch = criarFetchMock({}, false, 500);

    const resultado = await buscarDadosDispositivo();

    expect(resultado.cenario).toBe('offline');
  });

  test('retorna offline quando histórico está vazio em ambas as APIs', async () => {
    global.fetch = criarFetchMock([]);

    const resultado = await buscarDadosDispositivo();

    expect(resultado.cenario).toBe('offline');
  });

  test('aceita formato { dashboardData: [...] } da API', async () => {
    global.fetch = criarFetchMock({ dashboardData: [mockRegistro] });

    const resultado = await buscarDadosDispositivo();

    expect(resultado.cenario).toBe('normal');
    expect(resultado.historico).toHaveLength(1);
  });
});

describe('normalizarRegistro', () => {
  test('normaliza campos nested do formato avançado da API', () => {
    const log = {
      id: 10,
      dataHora: '2026-06-13T14:00:00.000Z',
      condicoes_ambientais: {
        temperaturaCelsius: 22.5,
        umidadeArPorcentagem: 65.0,
        luminosidadeSolarPorcentagem: 80,
        estaChovendo: false,
        estacao: 'INVERNO',
        condicaoCeu: 'ENSOLARADO',
      },
      sensores_solo: {
        umidadeSoloPorcentagem: 70.0,
        pHSolo: 6.3,
      },
      atuadores: {
        statusIrrigacao: 'DESLIGADO',
        vazaoGotejamentoLh: 0,
        controleManualAtivo: false,
      },
    };

    const result = normalizarRegistro(log);

    expect(result.id).toBe(10);
    expect(result.temperatura).toBe(22.5);
    expect(result.umidadeAr).toBe(65.0);
    expect(result.luzSolar).toBe(80);
    expect(result.umidadeSoloPorcentagem).toBe(70.0);
    expect(result.pHSolo).toBe(6.3);
    expect(result.statusIrrigacao).toBe('DESLIGADO');
    expect(result.vazaoGotejamentoLh).toBe(0);
    expect(result.estaChovendo).toBe(false);
    expect(result.estacao).toBe('INVERNO');
    expect(result.condicaoCeu).toBe('ENSOLARADO');
    expect(result.controleManualAtivo).toBe(false);
  });

  test('normaliza campos flat (formato legado)', () => {
    const log = {
      id: 5,
      dataHora: '2026-06-13T10:00:00.000Z',
      umidadeSoloPorcentagem: 55.0,
      temperatura: 19.5,
      umidadeAr: 60.0,
      pHSolo: 6.1,
      luzSolar: 72,
      statusIrrigacao: 'LIGADO',
      estaChovendo: false,
      vazaoGotejamentoLh: 2.5,
      controleManualAtivo: true,
      estacao: 'INVERNO',
      condicaoCeu: 'NUBLADO',
    };

    const result = normalizarRegistro(log);

    expect(result.umidadeSoloPorcentagem).toBe(55.0);
    expect(result.temperatura).toBe(19.5);
    expect(result.umidadeAr).toBe(60.0);
    expect(result.pHSolo).toBe(6.1);
    expect(result.luzSolar).toBe(72);
    expect(result.statusIrrigacao).toBe('LIGADO');
  });

  test('aplica valores padrão quando campos estão ausentes', () => {
    const result = normalizarRegistro({ id: 1, dataHora: '2026-01-01T00:00:00Z' });

    expect(result.umidadeSoloPorcentagem).toBe(0);
    expect(result.temperatura).toBe(0);
    expect(result.umidadeAr).toBe(0);
    expect(result.pHSolo).toBe(7.0);
    expect(result.luzSolar).toBe(0);
    expect(result.statusIrrigacao).toBe('DESLIGADO');
    expect(result.estaChovendo).toBe(false);
    expect(result.controleManualAtivo).toBe(false);
    expect(result.estacao).toBe('---');
    expect(result.condicaoCeu).toBe('---');
  });

  test('statusIrrigacao: converte inteiro 1 para "LIGADO"', () => {
    const result = normalizarRegistro({ id: 1, dataHora: '2026-01-01T00:00:00Z', statusIrrigacao: 1 });
    expect(result.statusIrrigacao).toBe('LIGADO');
  });

  test('statusIrrigacao: converte inteiro 0 para "DESLIGADO"', () => {
    const result = normalizarRegistro({ id: 1, dataHora: '2026-01-01T00:00:00Z', statusIrrigacao: 0 });
    expect(result.statusIrrigacao).toBe('DESLIGADO');
  });

  test('estaChovendo: converte inteiro 1 para true', () => {
    const result = normalizarRegistro({ id: 1, dataHora: '2026-01-01T00:00:00Z', estaChovendo: 1 });
    expect(result.estaChovendo).toBe(true);
  });

  test('preserva dataHora original', () => {
    const data = '2026-06-13T14:30:00.000Z';
    const result = normalizarRegistro({ id: 1, dataHora: data });
    expect(result.dataHora).toBe(data);
  });

  test('campos nested têm prioridade sobre campos flat', () => {
    const log = {
      id: 1,
      dataHora: '2026-01-01T00:00:00Z',
      temperatura: 10,
      condicoes_ambientais: { temperaturaCelsius: 25 },
    };
    const result = normalizarRegistro(log);
    expect(result.temperatura).toBe(25);
  });
});
