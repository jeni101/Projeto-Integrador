/**
 * Helpers reutilizáveis para estados visuais: loading, success, error, empty.
 */

export function renderEstadoLoading(mensagem = 'Carregando dados...') {
  return `
    <div class="flex flex-col items-center justify-center py-20 gap-4" data-ui-state="loading">
      <div class="h-10 w-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
      <p class="text-sm font-mono text-slate-500 dark:text-slate-400">${mensagem}</p>
    </div>`;
}

export function renderEstadoErro(mensagem, onRetryId = 'btn-retry') {
  return `
    <div class="flex flex-col items-center justify-center py-16 gap-4 text-center px-4" data-ui-state="error">
      <span class="text-4xl">⚠️</span>
      <h2 class="text-lg font-bold text-red-600 dark:text-red-400">Erro ao carregar</h2>
      <p class="text-sm font-mono text-slate-500 dark:text-slate-400 max-w-md">${mensagem}</p>
      <button id="${onRetryId}" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded text-sm">
        Tentar novamente
      </button>
    </div>`;
}

export function renderEstadoVazio(titulo, descricao = '') {
  return `
    <div class="flex flex-col items-center justify-center py-16 gap-3 text-center px-4" data-ui-state="empty">
      <span class="text-4xl opacity-40">📭</span>
      <h2 class="text-base font-bold text-slate-600 dark:text-slate-300">${titulo}</h2>
      ${descricao ? `<p class="text-sm font-mono text-slate-400 max-w-md">${descricao}</p>` : ''}
    </div>`;
}

export function renderPageShell(titulo, subtitulo, conteudo) {
  return `
    <div class="w-full space-y-4" data-ui-state="success">
      <div class="px-1">
        <h1 class="text-lg font-black tracking-tight text-slate-800 dark:text-white">${titulo}</h1>
        ${subtitulo ? `<p class="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">${subtitulo}</p>` : ''}
      </div>
      ${conteudo}
    </div>`;
}
