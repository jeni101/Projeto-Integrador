import { renderPageShell, renderEstadoLoading, renderEstadoErro } from '../services/uiStateService.js';
import { escapeHtml } from '../services/cardHelpers.js';
import { CULTURAS_VALIDAS } from '../services/canteirosService.js';

export function renderCanteirosView({ estado, canteiros = [], formMode = null, formData = {}, erros = [], feedback = null, erro = null }) {
  if (estado === 'loading') return renderEstadoLoading('Carregando canteiros...');
  if (estado === 'error') return renderEstadoErro(erro || 'Falha ao carregar canteiros', 'btn-retry-canteiros');

  const feedbackHtml = feedback
    ? `<div class="px-4 py-2 rounded text-sm font-mono ${feedback.tipo === 'erro' ? 'bg-red-50 dark:bg-red-950 text-red-600' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'}">${escapeHtml(feedback.mensagem)}</div>`
    : '';

  const errosHtml = erros.length
    ? `<ul class="text-red-500 text-sm font-mono list-disc pl-5">${erros.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`
    : '';

  const formHtml = formMode ? `
    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
      <h3 class="font-bold text-sm">${formMode === 'create' ? 'Novo canteiro' : `Editar ${escapeHtml(formData.id || '')}`}</h3>
      ${errosHtml}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
        ${formMode === 'create' ? `
          <label class="flex flex-col gap-1">
            <span class="text-slate-400 text-[9px] uppercase">ID (opcional)</span>
            <input id="form-canteiro-id" maxlength="4" value="${escapeHtml(formData.id || '')}"
              class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1">
          </label>` : ''}
        <label class="flex flex-col gap-1">
          <span class="text-slate-400 text-[9px] uppercase">Nome *</span>
          <input id="form-canteiro-nome" value="${escapeHtml(formData.nome || '')}"
            class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1">
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-slate-400 text-[9px] uppercase">Cultura *</span>
          <select id="form-canteiro-cultura" class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1">
            ${CULTURAS_VALIDAS.map(c => `<option value="${c}" ${formData.cultura === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-slate-400 text-[9px] uppercase">Área (m²) *</span>
          <input id="form-canteiro-area" type="number" step="0.1" min="0.1" value="${formData.area_m2 ?? ''}"
            class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1">
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-slate-400 text-[9px] uppercase">Sensores</span>
          <input id="form-canteiro-sensores" type="number" min="1" max="12" value="${formData.sensores ?? 3}"
            class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1">
        </label>
      </div>
      <div class="flex gap-2">
        <button id="btn-salvar-canteiro" data-mode="${formMode}" data-id="${escapeHtml(formData.id || '')}"
          class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded text-sm">Salvar</button>
        <button id="btn-cancelar-canteiro" class="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-4 py-1.5 rounded text-sm">Cancelar</button>
      </div>
    </div>` : '';

  const listaHtml = canteiros.map(c => `
    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div class="font-bold text-slate-800 dark:text-white">${escapeHtml(c.nome)} <span class="text-slate-400 font-mono text-sm">(${escapeHtml(c.id)})</span>${c.fonteApi ? ' <span class="text-[9px] text-blue-500 font-normal">📡 API</span>' : ''}</div>
        <div class="text-[11px] font-mono text-slate-500 mt-1">
          ${escapeHtml(c.cultura)} · ${c.area_m2} m² · ${c.sensores} sensores
          ${c.fonteApi ? '' : ' · <span class="text-slate-400">sem sensor</span>'}
        </div>
      </div>
      <div class="flex gap-2 shrink-0">
        <button data-action="edit" data-id="${escapeHtml(c.id)}" class="btn-canteiro-action px-3 py-1 text-[11px] font-mono rounded border border-blue-300 dark:border-blue-800 text-blue-600">Editar</button>
        ${c.fonteApi ? '' : `<button data-action="delete" data-id="${escapeHtml(c.id)}" class="btn-canteiro-action px-3 py-1 text-[11px] font-mono rounded border border-red-300 dark:border-red-800 text-red-600">Excluir</button>`}
      </div>
    </div>`).join('');

  return renderPageShell('Cadastro de Canteiros', 'CRUD com validação e persistência local', `
    ${feedbackHtml}
    <div class="flex justify-end">
      <button id="btn-novo-canteiro" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded text-sm">+ Novo canteiro</button>
    </div>
    ${formHtml}
    <div class="space-y-3">${listaHtml}</div>
  `);
}

export function lerFormCanteiroDoDOM(mode) {
  return {
    id: document.getElementById('form-canteiro-id')?.value?.trim(),
    nome: document.getElementById('form-canteiro-nome')?.value,
    cultura: document.getElementById('form-canteiro-cultura')?.value,
    area_m2: document.getElementById('form-canteiro-area')?.value,
    sensores: document.getElementById('form-canteiro-sensores')?.value,
    _mode: mode,
  };
}
