/**
 * Canteiro real monitorado pela API (ESP32 / Azure / Render).
 * Demais canteiros são cadastrados manualmente pelo usuário (sem telemetria).
 */

export const CANTEIRO_API_ID = 'A';

export const CANTEIRO_REAL = {
  id: CANTEIRO_API_ID,
  nome: 'Canteiro Alface',
  cultura: 'Alface',
  area_m2: 4.5,
  sensores: 3,
  offline: false,
  fonteApi: true,
};

export const CULTURAS_VALIDAS = ['Alface', 'Tomate', 'Manjericão', 'Cenoura', 'Rúcula', 'Pimentão'];

const THRESHOLD_UMIDADE_ALERTA = 30;
const THRESHOLD_TEMP_ALERTA = 35;

export function obterCenarioForcado() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('cenario');
  if (fromUrl) return fromUrl;
  return localStorage.getItem('phorta-cenario-forcado') || null;
}

export function definirCenarioForcado(cenario) {
  if (cenario) localStorage.setItem('phorta-cenario-forcado', cenario);
  else localStorage.removeItem('phorta-cenario-forcado');
}

export function obterTelemetriaMockada(canteiroId = CANTEIRO_API_ID) {
  const cenario = obterCenarioForcado();
  if (canteiroId !== CANTEIRO_API_ID) return null;
  if (cenario === 'offline') {
    return null;
  }

  const agora = new Date();
  const base = {
    canteiroId: CANTEIRO_API_ID,
    dataHora: agora.toISOString(),
    umidadeSoloPorcentagem: cenario === 'suspeito' ? 85.0 : 28.5,
    umidadeAr: 61.2,
    temperatura: cenario === 'suspeito' ? 85.0 : 19.5,
    luzSolar: 72,
    pHSolo: 6.2,
    statusIrrigacao: 'DESLIGADO',
    controleManualAtivo: false,
    vazaoGotejamentoLh: 0,
    estacao: 'INVERNO',
    condicaoCeu: 'ENSOLARADO',
    sensorOffline: cenario === 'parcial',
    leituraSuspeita: cenario === 'suspeito',
  };

  if (cenario === 'parcial') {
    base.temperatura = null;
    base.umidadeAr = null;
  }

  return base;
}

export function obterHistoricoMockado(canteiroId = CANTEIRO_API_ID) {
  if (canteiroId !== CANTEIRO_API_ID) return [];
  const agora = new Date();
  const cenario = obterCenarioForcado();
  const dados = [];

  for (let i = 2880; i >= 0; i -= 15) {
    const dataPonto = new Date(agora.getTime() - i * 60 * 1000);
    const umidadeSolo = parseFloat((62 + Math.sin(i / 110) * 6 + Math.random() * 1.5).toFixed(1));
    const temp = cenario === 'suspeito' && i < 60
      ? 85.0
      : parseFloat((18 + Math.sin(i / 220) * 3 + Math.random() * 0.8).toFixed(1));

    dados.push({
      id: i,
      canteiroId: CANTEIRO_API_ID,
      dataHora: dataPonto.toISOString(),
      umidadeSoloPorcentagem: cenario === 'parcial' && i < 120 ? null : umidadeSolo,
      umidadeAr: parseFloat((60 + Math.cos(i / 130) * 4 + Math.random() * 1.5).toFixed(1)),
      temperatura: temp,
      luzSolar: parseFloat(Math.min(100, Math.abs(40 + Math.sin(i / 50) * 35 + 40)).toFixed(1)),
      pHSolo: parseFloat((6.1 + Math.sin(i / 600) * 0.15).toFixed(2)),
      estaChovendo: Math.sin(i / 300) > 0.75,
      alertaCriticoAlface: umidadeSolo < THRESHOLD_UMIDADE_ALERTA,
      statusIrrigacao: Math.sin(i / 160) < -0.85 ? 'LIGADO' : 'DESLIGADO',
      vazaoGotejamentoLh: Math.sin(i / 160) < -0.85 ? 2.5 : 0,
      controleManualAtivo: false,
      estacao: 'INVERNO',
      condicaoCeu: 'ENSOLARADO',
      sensorOffline: cenario === 'offline' || (cenario === 'parcial' && i < 120),
      leituraSuspeita: temp >= 85.0,
    });
  }
  return dados;
}

export { THRESHOLD_UMIDADE_ALERTA, THRESHOLD_TEMP_ALERTA };
