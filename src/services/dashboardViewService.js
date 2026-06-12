import { renderCardSensor, renderSidePanels } from './appRenderService.js';

export function gerarLayoutDashboard({
  telemetriaAtual, pontoSelecionado, cenarioAtual,
  filtrosVisibilidade, configAgrupamento, configData, limitesData
}) {

  const statusBadge = cenarioAtual === 'offline'
    ? `<span class="text-amber-400 font-bold tracking-wide">◉ SIMULAÇÃO</span>`
    : cenarioAtual === 'render-live'
      ? `<span class="text-cyan-400 font-bold tracking-wide">● RENDER</span>`
      : `<span class="text-emerald-400 font-bold tracking-wide">● AZURE</span>`;

  const obterDado = (ponto, telemetria, campoSnake, campoCamel) =>
    ponto?.[campoSnake] ?? telemetria?.[campoCamel] ?? telemetria?.[campoSnake] ?? 0;

  const d = {
    umidade_solo_pct: obterDado(pontoSelecionado, telemetriaAtual, 'umidade_solo_pct', 'umidadeSoloPorcentagem'),
    umidade_ar_pct:   obterDado(pontoSelecionado, telemetriaAtual, 'umidade_ar_pct',   'umidadeAr'),
    temperatura_c:    obterDado(pontoSelecionado, telemetriaAtual, 'temperatura_c',    'temperatura'),
    ph_solo:          obterDado(pontoSelecionado, telemetriaAtual, 'ph_solo',           'pHSolo'),
    vazao_gotejamento:obterDado(pontoSelecionado, telemetriaAtual, 'vazao_gotejamento','vazaoGotejamentoLh'),
    irrigacao_ativa:  telemetriaAtual?.statusIrrigacao === 'LIGADO' || telemetriaAtual?.statusIrrigacao === 'LIGADA',
    status_bomba_manual: telemetriaAtual?.controleManualAtivo ?? false,
    luz_pct:          pontoSelecionado?.luminosidade_lux ?? telemetriaAtual?.luzSolar ?? 0,
  };

  const estacaoBruta = pontoSelecionado?.estacao    || telemetriaAtual?.estacao    || '---';
  const ceuBruto     = pontoSelecionado?.condicao_ceu || telemetriaAtual?.condicaoCeu || '---';

  const iconeEstacao = { verao: '☀️', inverno: '❄️', outono: '🍂', primavera: '🌸' };
  const iconeCeu = { ensolarado: '☀️', nublado: '☁️', chuvoso: '🌧️' };

  const calcularEstacaoHemisferioSul = () => {
    const mes = new Date().getMonth();
    if (mes === 11 || mes <= 1) return 'VERAO';
    if (mes >= 2 && mes <= 4)   return 'OUTONO';
    if (mes >= 5 && mes <= 7)   return 'INVERNO';
    return 'PRIMAVERA';
  };

  const estacaoTexto = estacaoBruta === '---' ? calcularEstacaoHemisferioSul() : estacaoBruta;
  const ceuTexto     = ceuBruto === '---' ? 'N/D' : ceuBruto;

  const estIcon = iconeEstacao[estacaoTexto?.toLowerCase()] || '🌿';
  const ceuIcon = iconeCeu[ceuTexto?.toLowerCase()] || '☁️';

  const legendaFaixas = `
    <div class="flex items-center gap-4 text-[10px] font-mono text-slate-500 dark:text-slate-400">
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-3 h-3 rounded-sm" style="background:rgba(14,165,233,0.25)"></span>
        Chuva
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-3 h-3 rounded-sm" style="background:rgba(16,185,129,0.28)"></span>
        Irrigação
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-3 h-2 border-t-2 border-dashed border-purple-500"></span>
        pH (norm.)
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-3 h-2 border-t-2 border-dashed border-yellow-400"></span>
        Luz Solar
      </span>
    </div>`;

  return `
    <!-- Cabeçalho de status -->
    <div class="w-full font-mono text-[10px] text-slate-500 dark:text-slate-400 flex justify-between items-center mb-3 px-1">
      <span>Telemetry Router: <span class="text-slate-700 dark:text-slate-200 font-bold">esp32-horta-01</span></span>
      <span>API: ${statusBadge}</span>
    </div>

    <div class="w-full space-y-5">

      <!-- ═══════════════════════════════════════════════
           PAINEL PRINCIPAL — GRÁFICO
      ════════════════════════════════════════════════ -->
      <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden">

        <!-- Topo do painel: título + badges contextuais -->
        <div class="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h2 class="text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 font-mono">
              Centro Analítico · Dados Históricos
            </h2>
            <p class="text-[9px] font-mono text-slate-400 mt-0.5">Failover Azure → Render → Mock offline</p>
          </div>
          <div class="flex items-center gap-2 font-mono text-[10px]">
            <span class="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md font-bold">
              ${estIcon} ${estacaoTexto.toUpperCase()}
            </span>
            <span class="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md font-bold">
              ${ceuIcon} ${ceuTexto.toUpperCase()}
            </span>
          </div>
        </div>

        <!-- Controles: filtro de data + agrupamento -->
        <div class="flex flex-wrap items-center gap-3 px-5 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400 text-[10px] uppercase tracking-wide">Início</span>
            <input type="datetime-local" id="filtro-data-inicio"
              min="2026-06-04T16:58"
              value="${configData.inicio}"
              class="w-44 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-slate-800 dark:text-slate-200 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500">
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400 text-[10px] uppercase tracking-wide">Fim</span>
            <input type="datetime-local" id="filtro-data-fim"
              min="2026-06-04T16:58"
              value="${configData.fimControleManual ? configData.fim : ''}"
              class="w-44 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-slate-800 dark:text-slate-200 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500">
          </div>
          <button id="btn-aplicar-datas"
            class="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold px-3 py-0.5 rounded text-[11px] transition-colors">
            Filtrar
          </button>
          <button id="btn-limpar-datas"
            class="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-3 py-0.5 rounded text-[11px] transition-colors">
            ● Live
          </button>
          <div class="flex items-center gap-1.5 ml-auto">
            <span class="text-slate-400 text-[10px] uppercase tracking-wide">Agrupar</span>
            <select id="select-unidade-tempo"
              class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-1.5 py-0.5 text-[11px] font-mono focus:outline-none">
              <option value="minuto"  ${configAgrupamento.unidade === 'minuto'  ? 'selected' : ''}>Minutos</option>
              <option value="hora"    ${configAgrupamento.unidade === 'hora'    ? 'selected' : ''}>Horas</option>
              <option value="dia"     ${configAgrupamento.unidade === 'dia'     ? 'selected' : ''}>Dias</option>
            </select>
          </div>
        </div>

        <!-- Checkboxes de séries -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2.5 border-b border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
          <span class="text-slate-400 text-[9px] uppercase tracking-widest mr-1 font-bold">Séries:</span>
          ${[
            { id: 'umid_solo', cor: 'accent-emerald-500', label: 'Umid. Solo'   },
            { id: 'umid_ar',   cor: 'accent-sky-500',     label: 'Umid. Ar'     },
            { id: 'temp',      cor: 'accent-red-500',     label: 'Temperatura'  },
            { id: 'luz',       cor: 'accent-yellow-500',  label: 'Luz Solar'    },
            { id: 'ph',        cor: 'accent-purple-500',  label: 'pH Solo'      },
          ].map(s => `
            <label class="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              <input type="checkbox" data-series="${s.id}" ${filtrosVisibilidade[s.id] ? 'checked' : ''} class="chk-visibilidade ${s.cor}">
              <span>${s.label}</span>
            </label>`).join('')}
          <span class="ml-auto">${legendaFaixas}</span>
        </div>

        <!-- Dica de interação / ponto selecionado -->
        ${pontoSelecionado
          ? `<div class="px-5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
               <span>📍</span>
               <span>Ponto selecionado: <strong>${pontoSelecionado.horario ?? '--:--:--'}</strong> — clique em outro ponto para mudar.</span>
             </div>`
          : `<div class="px-5 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 text-[10px] font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
               <span>ℹ️</span>
               <span>Clique em um ponto do gráfico para inspecionar aquele momento nos cartões abaixo.</span>
             </div>`
        }

        <!-- Mini-telemetria inline (ponto selecionado ou último) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-slate-100 dark:divide-slate-800/80 border-b border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
          <div class="flex flex-col px-4 py-2.5">
            <span class="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">pH Solo</span>
            <span class="text-purple-500 font-bold text-sm">${d.ph_solo}</span>
          </div>
          <div class="flex flex-col px-4 py-2.5">
            <span class="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Vazão</span>
            <span class="text-blue-500 font-bold text-sm">${d.vazao_gotejamento} <span class="text-[10px] font-normal">L/h</span></span>
          </div>
          <div class="flex flex-col px-4 py-2.5">
            <span class="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Controle</span>
            <span class="font-bold text-sm ${d.status_bomba_manual ? 'text-amber-500' : 'text-slate-400'}">${d.status_bomba_manual ? 'MANUAL' : 'AUTO'}</span>
          </div>
          <div class="flex flex-col px-4 py-2.5">
            <span class="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Luz Solar</span>
            <span class="text-yellow-500 font-bold text-sm">${d.luz_pct}<span class="text-[10px] font-normal">%</span></span>
          </div>
        </div>

        <!-- Canvas do gráfico — altura generosa -->
        <div class="px-4 pt-3 pb-4" style="height: 420px;">
          <canvas id="analiseChart"></canvas>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════
           CARDS DE SENSORES + PAINÉIS LATERAIS
      ════════════════════════════════════════════════ -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div class="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          ${renderCardSensor('Umid. Solo', d.umidade_solo_pct, '%', cenarioAtual, d.umidade_solo_pct <= 55 ? 'Solo Seco' : 'Úmido', { icone: '🌱', corValor: 'text-emerald-600 dark:text-emerald-400', corBarra: 'bg-emerald-500' })}
          ${renderCardSensor('Umid. Ar',   d.umidade_ar_pct,   '%', cenarioAtual, 'Agradável', { icone: '💧', corValor: 'text-sky-600 dark:text-sky-400', corBarra: 'bg-sky-500' })}
          ${renderCardSensor('Temperatura',d.temperatura_c,    '°C',cenarioAtual, 'Estável', { icone: '🌡️', corValor: 'text-red-600 dark:text-red-400', corBarra: 'bg-red-500' })}
        </div>
        <div class="grid grid-cols-1 gap-4">
          ${renderSidePanels(d, cenarioAtual, d.status_bomba_manual)}
        </div>
      </div>

    </div>
  `;
}
