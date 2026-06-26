/**

 * Serviço de alertas: derivação de regras + filtros.

 * Alertas derivados apenas do canteiro Alface (API).

 */



import {

  THRESHOLD_UMIDADE_ALERTA,

  THRESHOLD_TEMP_ALERTA,

  CANTEIRO_API_ID,

} from './mockService.js';

import { getCanteiroPorId } from './canteirosService.js';



function nomeCanteiro(canteiroId) {

  return getCanteiroPorId(canteiroId)?.nome || `Canteiro ${canteiroId}`;

}



export function derivarAlertasDeLeitura(leitura, canteiroId = CANTEIRO_API_ID) {

  const alertas = [];

  if (!leitura || canteiroId !== CANTEIRO_API_ID) return alertas;



  const nome = nomeCanteiro(canteiroId);

  const ts = leitura.dataHora || new Date().toISOString();



  const umid = leitura.umidadeSoloPorcentagem ?? leitura.umidade_solo_pct;

  if (typeof umid === 'number' && umid < THRESHOLD_UMIDADE_ALERTA) {

    alertas.push({

      id: `live-umid-${canteiroId}-${ts}`,

      canteiroId,

      canteiroNome: nome,

      tipo: 'umidade',

      severidade: 'media',  // severidade ta aqui 

      mensagem: `Umidade do solo abaixo de ${THRESHOLD_UMIDADE_ALERTA}%`,

      timestamp: ts,

      valor: umid,

      limiar: THRESHOLD_UMIDADE_ALERTA,

    });

  }



  const temp = leitura.temperatura ?? leitura.temperatura_c;

  if (typeof temp === 'number' && temp > THRESHOLD_TEMP_ALERTA) {

    alertas.push({

      id: `live-temp-${canteiroId}-${ts}`,

      canteiroId,

      canteiroNome: nome,

      tipo: 'temperatura',

      severidade: 'alta',

      mensagem: `Temperatura acima de ${THRESHOLD_TEMP_ALERTA}°C`,

      timestamp: ts,

      valor: temp,

      limiar: THRESHOLD_TEMP_ALERTA,

    });

  }



  if (leitura.leituraSuspeita || (typeof temp === 'number' && temp >= 85)) {

    alertas.push({

      id: `live-suspeito-${canteiroId}-${ts}`,

      canteiroId,

      canteiroNome: nome,

      tipo: 'sensor',

      severidade: 'alta',

      mensagem: 'Leitura DHT22 suspeita (sentinel 85°C)',

      timestamp: ts,

      valor: temp,

      limiar: 84.9,

    });

  }



  if (leitura.sensorOffline) {

    alertas.push({

      id: `live-offline-${canteiroId}-${ts}`,

      canteiroId,

      canteiroNome: nome,

      tipo: 'offline',

      severidade: 'alta',

      mensagem: 'Sensor offline ou sem resposta',

      timestamp: ts,

      valor: null,

      limiar: null,

    });

  }



  return alertas;

}


/** Varre histórico da API em busca de leituras que violaram thresholds */

export function derivarAlertasDeHistorico(historico = [], maxAlertas = 20) {

  const alertas = [];

  const vistos = new Set();



  for (const leitura of historico) {

    for (const a of derivarAlertasDeLeitura(leitura, CANTEIRO_API_ID)) {

      const chave = `${a.tipo}-${a.timestamp}`;

      if (vistos.has(chave)) continue;

      vistos.add(chave);

      alertas.push({ ...a, id: `hist-${a.tipo}-${a.timestamp}` });

    }

  }



  return alertas

    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    .slice(0, maxAlertas);

}


// aqui 
//como ta funcionando? ele reduz o numero de alertas a cada if q passa 
export function filtrarAlertas(alertas, { canteiroId, tipo, periodoDias, severidade } = {}) {
// recebe lista de de alertas e retorna os que passam nos filtros
  let lista = [...alertas]; // copia lista original 



  if (canteiroId && canteiroId !== 'todos') {

    lista = lista.filter(a => a.canteiroId === canteiroId);
  // filtra por canteiro 
  }



  if (tipo && tipo !== 'todos') {

    lista = lista.filter(a => a.tipo === tipo);
//  alertas daquele tipo 
  }



  if (periodoDias && periodoDias > 0) {
// filtro de tempo 
    const corte = Date.now() - periodoDias * 24 * 60 * 60 * 1000;
//  data limite da sua procura 
    lista = lista.filter(a => new Date(a.timestamp).getTime() >= corte);
// mostra os alertas no tempo escolhido 
  }

  if (severidade && severidade !== 'todos') {
    const sev = severidade.toLowerCase().trim();
  
    lista = lista.filter(a =>
      (a.severidade || '').toLowerCase().trim() === sev
    );
  
  }
  // minha mudanca basiacamente segue a mesma logica de 
  // afunilamento e so afunila ainda mais prla severidade escolhida 


  return lista.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
// ordena do mais recente p mais antigo 
}



export function obterAlertasCompletos(telemetriaAtual = null, historico = []) {

  const live = telemetriaAtual

    ? derivarAlertasDeLeitura(telemetriaAtual, CANTEIRO_API_ID)

    : [];

  const historicos = derivarAlertasDeHistorico(historico);

  const map = new Map();

  [...live, ...historicos].forEach(a => map.set(a.id, a));

  return [...map.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

}



export function formatarTipoAlerta(tipo) {

  const map = {

    umidade: 'Umidade',

    temperatura: 'Temperatura',

    sensor: 'Sensor',

    offline: 'Offline',

  };

  return map[tipo] || tipo;

}


// converter od dados em texto 
export function formatarSeveridade(sev) {

  const map = { alta: 'Alta', media: 'Média', info: 'Info' };

  return map[sev] || sev;

}


