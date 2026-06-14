import { gerarCsvLeituras } from '../views/historicoView.js';

import { derivarAlertasDeLeitura } from '../services/alertasService.js';

import { getRelatorioAgregado, getHistoricoLeituras, setCachedPayload } from '../services/dataService.js';

import { obterHistoricoMockado } from '../services/mockService.js';



describe('principalView / relatório', () => {

  test('getRelatorioAgregado inclui canteiro API com irrigações do histórico', async () => {

    const historico = obterHistoricoMockado();

    setCachedPayload({

      telemetria: historico[historico.length - 1],

      historico,

      cenario: 'normal',

    });



    const agg = await getRelatorioAgregado({ periodo: 7 });

    expect(agg.length).toBeGreaterThanOrEqual(1);

    const alface = agg.find(c => c.canteiroId === 'A');

    expect(alface).toBeDefined();

    expect(alface.nome).toContain('Alface');

  });



  test('alerta de umidade dispara abaixo de 30% (requisito A1.8)', () => {

    const alertas = derivarAlertasDeLeitura({

      umidadeSoloPorcentagem: 29,

      temperatura: 20,

      dataHora: new Date().toISOString(),

    });

    expect(alertas.some(a => a.tipo === 'umidade' && a.valor === 29)).toBe(true);

  });



  test('getHistoricoLeituras retorna vazio para canteiro sem sensor', async () => {

    const historico = obterHistoricoMockado();

    setCachedPayload({ telemetria: historico[historico.length - 1], historico, cenario: 'normal' });

    const r = await getHistoricoLeituras({ canteiroId: 'B', page: 1, pageSize: 20 });

    expect(r.items).toEqual([]);

    expect(r.total).toBe(0);

  });

});



describe('historicoView CSV', () => {

  test('gerarCsvLeituras inclui header correto', () => {

    const csv = gerarCsvLeituras([

      {

        dataHora: '2026-06-14T10:00:00Z',

        canteiroId: 'A',

        temperatura: 22,

        umidadeAr: 60,

        umidadeSoloPorcentagem: 55,

        luzSolar: 80,

      },

    ]);

    expect(csv).toContain('dataHora,canteiro,temperatura');

    expect(csv).toContain('2026-06-14T10:00:00Z');

    expect(csv).toContain(',A,');

  });



  test('gerarCsvLeituras inclui flags offline/suspeito', () => {

    const csv = gerarCsvLeituras([

      { dataHora: '2026-01-01T00:00:00Z', canteiroId: 'A', sensorOffline: true, leituraSuspeita: true },

    ]);

    expect(csv).toContain('offline|suspeito');

  });

});


