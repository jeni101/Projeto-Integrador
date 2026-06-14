import {
  gerarRequestId,
  logInfo,
  logError,
  recordScreenRender,
  getMetrics,
  exporMetricsGlobais,
} from '../services/observabilityService.js';

describe('observabilityService', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('gerarRequestId retorna id único', () => {
    const a = gerarRequestId();
    const b = gerarRequestId();
    expect(a).toMatch(/^req_/);
    expect(a).not.toBe(b);
  });

  test('logInfo emite JSON estruturado', () => {
    logInfo('test_event', { screen: 'principal' });
    expect(console.log).toHaveBeenCalled();
    const payload = JSON.parse(console.log.mock.calls[0][0]);
    expect(payload.event).toBe('test_event');
    expect(payload.level).toBe('info');
  });

  test('logError incrementa fetch_error_total', () => {
    const before = getMetrics().fetch_error_total;
    logError('fetch_failed', { error: 'timeout' });
    expect(getMetrics().fetch_error_total).toBe(before + 1);
  });

  test('recordScreenRender armazena durationMs', () => {
    recordScreenRender('alertas', 12.5);
    expect(getMetrics().screen_render_ms.alertas).toBe(12.5);
  });

  test('exporMetricsGlobais define window hook', () => {
    exporMetricsGlobais();
    expect(typeof window.__PHORTA_METRICS__).toBe('function');
  });
});
