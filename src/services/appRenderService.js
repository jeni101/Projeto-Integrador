export function renderNavbar(cenarioAtual) {
  const isOffline = cenarioAtual === 'offline';
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return `
    <nav class="bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg">
      <div class="flex items-center gap-8">
        <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black tracking-tight text-lg select-none">
          <span>🌱</span> <span>[ Logo ]</span>
        </div>
        <div class="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <a href="#" class="text-slate-900 dark:text-white border-b-2 border-blue-500 pb-1">Home</a>
          <span class="text-slate-300 dark:text-slate-700">•</span>
          <a href="#" class="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Histórico</a>
          <span class="text-slate-300 dark:text-slate-700">•</span>
          <a href="#" class="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Crescimento</a>
          <span class="text-slate-300 dark:text-slate-700">•</span>
          <a href="#" class="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Sensores</a>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <button id="btn-toggle-tema" title="Alternar tema claro/escuro"
          class="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 text-lg leading-none transition-colors cursor-pointer">
          ${isDark ? '☀️' : '🌙'}
        </button>
        <div class="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer text-sm">🔔</div>
        <div class="flex items-center gap-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-1 rounded-md">
          <span class="h-2 w-2 rounded-full ${isOffline ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}"></span>
          <span class="text-[10px] font-mono font-bold tracking-widest ${isOffline ? 'text-red-400' : 'text-emerald-400'} uppercase">
            [ ${isOffline ? 'Offline' : 'Online'} ]
          </span>
        </div>
      </div>
    </nav>
  `;
}

export function renderCardSensor(titulo, valor, unidade, estadoCard, descricaoStatus, accent = {}) {
  const isOffline = estadoCard === 'offline';
  const isFalha = estadoCard === 'parcial' && (valor === null || valor === undefined);
  const icone = accent.icone || '📊';
  const corValor = accent.corValor || 'text-slate-900 dark:text-white';
  const corBarra = accent.corBarra || 'bg-slate-300 dark:bg-slate-700';

  return `
    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-lg flex h-32 relative shadow-md overflow-hidden">
      <div class="w-1.5 shrink-0 ${corBarra}"></div>
      <div class="flex flex-col justify-between p-4 flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">${titulo}</span>
          <span class="text-sm leading-none">${icone}</span>
        </div>
        <div class="my-1">
          ${isOffline ? `<p class="text-xs text-slate-500 italic">Dispositivo Offline</p>` :
            isFalha ? `<p class="text-xs font-bold text-amber-500">Falha no Sensor</p>` :
            `<p class="text-3xl font-black ${corValor} tracking-tight font-mono leading-none">${valor}<span class="text-xs font-normal text-slate-400 ml-0.5">${unidade}</span></p>`
          }
        </div>
        <div class="text-[10px] text-slate-500 font-medium truncate">
          "${isOffline ? 'Inacessível' : isFalha ? 'Erro I2C' : descricaoStatus}"
        </div>
      </div>
    </div>`;
}

export function renderSidePanels(dados, cenarioAtual, bombaManualAtiva) {
  const isOffline = cenarioAtual === 'offline';
  const modoBombaAtivo = isOffline ? false : (dados.irrigacao_ativa || bombaManualAtiva);

  return `
    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 p-4 rounded-lg shadow-md space-y-3">
      <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">⚠️ Alertas</div>
      <div class="space-y-2 text-[11px] font-mono">
        <div class="flex items-center gap-2 p-1.5 rounded bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-900">
          <span class="h-2 w-2 rounded-full ${!isOffline && dados.umidade_solo_pct <= 52 ? 'bg-yellow-500' : 'bg-slate-300 dark:bg-slate-800'}"></span>
          <span class="${!isOffline && dados.umidade_solo_pct <= 52 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}">Umid. solo baixa</span>
        </div>
        <div class="flex items-center gap-2 p-1.5 rounded bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-900 text-slate-400 dark:text-slate-600">
          <span class="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-800"></span>
          <span>Reservatório crit.</span>
        </div>
        <div class="flex items-center gap-2 p-1.5 rounded bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-900 ${isOffline ? 'text-slate-400 dark:text-slate-600' : 'text-emerald-600 dark:text-emerald-500 font-bold'}">
          <span class="h-2 w-2 rounded-full ${isOffline ? 'bg-slate-300 dark:bg-slate-800' : 'bg-emerald-500'}"></span>
          <span>Sistema normal</span>
        </div>
        <div class="text-[9px] text-blue-500 dark:text-blue-400 hover:underline cursor-pointer pt-1">[Ver todos os alertas]</div>
      </div>
    </div>

    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 p-4 rounded-lg shadow-md flex flex-col justify-between h-36">
      <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tabela de Erros (sistema)</div>
      <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded p-2 h-20 overflow-y-auto font-mono text-[9px] text-slate-500 space-y-1">
        ${isOffline ? `<p class="text-red-500">[ERR] esp32 timeout disconnect</p>` : 
          cenarioAtual === 'parcial' ? `<p class="text-yellow-600">[WARN] ldr barramento fallow</p>` :
          `<p class="text-slate-500 dark:text-slate-600">[OK] mqtt broker connected</p><p class="text-slate-500 dark:text-slate-600">[OK] wifi RSSI -45dBm</p>`
        }
      </div>
    </div>

    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 p-4 rounded-lg shadow-md text-[11px] font-mono space-y-1 text-slate-500 dark:text-slate-400">
      <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans mb-1">⚙️ Status Dispositivo</div>
      <div class="flex justify-between border-b border-slate-200 dark:border-slate-900 pb-0.5"><span>Estado:</span><span class="text-slate-900 dark:text-white font-bold">${isOffline ? 'OFFLINE' : modoBombaAtivo ? 'IRRIGANDO' : 'IDLE'}</span></div>
      <div class="flex justify-between border-b border-slate-200 dark:border-slate-900 pb-0.5"><span>Conexão:</span><span class="text-slate-700 dark:text-slate-300">${isOffline ? 'Offline' : 'Online'}</span></div>
      <div class="flex justify-between border-b border-slate-200 dark:border-slate-900 pb-0.5"><span>MQTT:</span><span class="text-slate-700 dark:text-slate-300">${isOffline ? 'Desconectado' : 'Conectado'}</span></div>
      <div class="flex justify-between border-b border-slate-200 dark:border-slate-900 pb-0.5"><span>Últ. cmd:</span><span class="text-slate-500">Nenhum</span></div>
      <div class="flex justify-between"><span>Ligado há:</span><span class="text-slate-500">${isOffline ? '0d 0h' : '2d 4h'}</span></div>
    </div>

    <div class="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 p-4 rounded-lg shadow-md flex flex-col justify-between h-36">
      <div>
        <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">💧 Ação Rápida</div>
        <p class="text-[10px] text-slate-500">Duração: <span class="text-slate-700 dark:text-slate-300 font-mono">[60s]</span></p>
      </div>
      <button id="btn-toggle-bomba" ${isOffline ? 'disabled' : ''} class="w-full py-1.5 rounded font-mono text-[11px] font-bold uppercase tracking-wider transition-all border ${
        modoBombaAtivo 
          ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400' 
          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-20'
      }">
        [ ${modoBombaAtivo ? '■ Parar' : '► Iniciar'} ]
      </button>
      <div class="border-t border-slate-200 dark:border-slate-900 pt-1.5 flex justify-between items-center text-[10px]">
        <span class="text-slate-500 font-mono">Status Válvula:</span>
        <span class="font-bold uppercase tracking-tight ${modoBombaAtivo ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}">
          ${modoBombaAtivo ? 'Bomba ligada' : 'Bomba deslig.'}
        </span>
      </div>
    </div>
  `;
}

export function renderControlesTeste(cenarioAtual, simularErroConexao) {
  return `
    <div class="bg-slate-950 border border-slate-900 p-4 rounded-lg space-y-2">
      <div class="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Mecanismo de Homologação (Simular Estados do Dispositivo)</div>
      <div class="flex flex-wrap gap-2">
        ${['normal', 'pico', 'offline', 'parcial'].map(c => `
          <button data-cenario="${c}" class="btn-cenario px-2.5 py-1 text-[10px] font-mono rounded border ${cenarioAtual === c && !simularErroConexao ? 'bg-blue-950 text-blue-400 border-blue-800' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}">${c.toUpperCase()}</button>
        `).join('')}
        <button id="btn-toggle-error" class="px-2.5 py-1 text-[10px] font-mono rounded border ${simularErroConexao ? 'bg-red-950 text-red-400 border-red-800' : 'bg-slate-900/40 text-red-900/60 border-red-950 hover:bg-red-950/20'}">SIMULAR ERRO HTTP API</button>
      </div>
    </div>`;
}
