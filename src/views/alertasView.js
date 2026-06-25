import { renderPageShell, renderEstadoLoading, renderEstadoErro, renderEstadoVazio } from '../services/uiStateService.js';
import { escapeHtml } from '../services/cardHelpers.js';
import {
  formatarTipoAlerta,
  formatarSeveridade,
} from '../services/alertasService.js';
import { getCanteiros } from '../services/canteirosService.js';

export function renderAlertasView({ estado, alertas = [], filtros = {}, erro = null }) {
  if (estado === 'loading') return renderEstadoLoading('Carregando alertas...');
  if (estado === 'error') return renderEstadoErro(erro || 'Falha ao carregar alertas', 'btn-retry-alertas');

  const canteiros = getCanteiros();
  const tipos = ['todos', 'umidade', 'temperatura', 'sensor', 'offline'];
  const periodos = [
    { v: 1, l: '24h' },
    { v: 7, l: '7 dias' },
    { v: 30, l: '30 dias' },
    { v: 0, l: 'Todos' },
  ];

  const filtrosHtml = `
  <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-wrap gap-3 font-mono text-[11px]">
    <label class="flex flex-col gap-1">
      <span class="text-slate-400 uppercase text-[9px]">Canteiro</span>
      <select id="filtro-alerta-canteiro" class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1">
        <option value="todos" ${filtros.canteiroId === 'todos' ? 'selected' : ''}>Todos</option>
        ${canteiros.map(c => {
          const label = c.fonteApi ? escapeHtml(c.nome) : `${escapeHtml(c.nome)} (sem sensor)`;
          return `<option value="${c.id}" ${filtros.canteiroId === c.id ? 'selected' : ''}>${label}</option>`;
        }).join('')}
      </select>
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-slate-400 uppercase text-[9px]">Tipo</span>
      <select id="filtro-alerta-tipo" class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1">
        ${tipos.map(t => `<option value="${t}" ${filtros.tipo === t ? 'selected' : ''}>${t === 'todos' ? 'Todos' : formatarTipoAlerta(t)}</option>`).join('')}
      </select>
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-slate-400 uppercase text-[9px]">Período</span>
      <select id="filtro-alerta-periodo" class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1">
        ${periodos.map(p => `<option value="${p.v}" ${String(filtros.periodoDias) === String(p.v) ? 'selected' : ''}>${p.l}</option>`).join('')}
      </select>
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-slate-400 uppercase text-[9px]">Severidade</span>
      <select id="filtro-alerta-severidade" class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1">
        <option value="todos">Todos</option>
        <option value="alta">Alta</option>
        <option value="media">Média</option>
        <option value="info">Info</option>
      </select>
    </label>
    <button id="btn-aplicar-filtros-alertas" class="self-end bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded">Filtrar</button>
  </div>`;
  if (estado === 'empty' || alertas.length === 0) {
    return renderPageShell('Alertas', 'Notificações do sistema de monitoramento', `
      ${filtrosHtml}
      ${renderEstadoVazio('Nenhum alerta no período', 'Ajuste os filtros ou aguarde novas leituras dos sensores.')}
    `);
  }

  const listaHtml = alertas.map(a => {
    const cor = a.severidade === 'alta' ? 'border-red-300 dark:border-red-800' :
      a.severidade === 'media' ? 'border-yellow-300 dark:border-yellow-800' :
        'border-slate-200 dark:border-slate-800';
    const dot = a.severidade === 'alta' ? 'bg-red-500' :
      a.severidade === 'media' ? 'bg-yellow-500' : 'bg-blue-400';
    const dataFmt = new Date(a.timestamp).toLocaleString('pt-BR');

    return `
      <div class="bg-white dark:bg-[#0f172a] border ${cor} rounded-lg p-4 flex gap-3 items-start">
        <span class="h-2.5 w-2.5 rounded-full ${dot} mt-1 shrink-0"></span>
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap justify-between gap-2">
            <span class="font-bold text-sm text-slate-800 dark:text-white">${escapeHtml(a.mensagem)}</span>
            <span class="text-[10px] font-mono text-slate-400">${dataFmt}</span>
          </div>
          <div class="text-[11px] font-mono text-slate-500 mt-1 flex flex-wrap gap-3">
            <span>${escapeHtml(a.canteiroNome)}</span>
            <span>${formatarTipoAlerta(a.tipo)}</span>
            <span>Severidade: ${formatarSeveridade(a.severidade)}</span>
            ${a.valor != null ? `<span>Valor: ${a.valor}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  return renderPageShell('Alertas', `${alertas.length} notificação(ões) encontrada(s)`, `
    ${filtrosHtml}
    <div class="space-y-3">${listaHtml}</div>
  `);
}

export function lerFiltrosAlertasDoDOM() {
  return {
    canteiroId: document.getElementById('filtro-alerta-canteiro')?.value || 'todos',
    tipo: document.getElementById('filtro-alerta-tipo')?.value || 'todos',
    periodoDias: parseInt(document.getElementById('filtro-alerta-periodo')?.value || '7', 10),
    severidade: document.getElementById('filtro-alerta-severidade')?.value || 'todos',
  };
}
