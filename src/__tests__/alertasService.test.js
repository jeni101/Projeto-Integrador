import { filtrarAlertas, derivarAlertasDeLeitura, obterAlertasCompletos } from '../services/alertasService.js';
import { obterHistoricoMockado } from '../services/mockService.js';

describe('alertasService', () => {
  test('derivarAlertasDeLeitura dispara alerta quando umidade < 30%', () => {
    const alertas = derivarAlertasDeLeitura({
      dataHora: '2026-06-14T10:00:00Z',
      umidadeSoloPorcentagem: 25,
      temperatura: 22,
    }, 'A');

    expect(alertas.some(a => a.tipo === 'umidade')).toBe(true);
    expect(alertas.find(a => a.tipo === 'umidade').valor).toBe(25);
  });

  test('derivarAlertasDeLeitura ignora canteiros sem API', () => {
    const alertas = derivarAlertasDeLeitura({
      umidadeSoloPorcentagem: 25,
      temperatura: 22,
    }, 'B');
    expect(alertas).toHaveLength(0);
  });

  test('filtrarAlertas por canteiro A', () => {
    const todos = obterAlertasCompletos({
      umidadeSoloPorcentagem: 25,
      temperatura: 22,
      dataHora: new Date().toISOString(),
    }, obterHistoricoMockado().slice(-50));
    const filtrados = filtrarAlertas(todos, { canteiroId: 'A' });
    expect(filtrados.every(a => a.canteiroId === 'A')).toBe(true);
  });

  test('filtrarAlertas retorna empty para canteiro sem alertas', () => {
    const todos = obterAlertasCompletos(null, []);
    const filtrados = filtrarAlertas(todos, { canteiroId: 'B' });
    expect(filtrados).toHaveLength(0);
  });
});
