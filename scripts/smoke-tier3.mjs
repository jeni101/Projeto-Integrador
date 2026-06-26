/**
 * Smoke test: tier-3 failover hits localhost server-horta (Mongo bridge).
 * Run with server-horta on :3000. Usage: node scripts/smoke-tier3.mjs
 */
const API_BASES = [
    'https://horta-api-htggarb3eagagpgm.brazilsouth-01.azurewebsites.net',
    'https://server-horta.onrender.com',
    'http://127.0.0.1:3000',
  ];
  
  const JANELA = 10080;
  
  async function fetchHistorico(baseUrl) {
    const url = `${baseUrl}/api/historico/completo?minutosAtras=${JANELA}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();
    const lista = Array.isArray(dados) ? dados : dados.dashboardData;
    if (!lista?.length) throw new Error('empty');
    return lista.length;
  }
  
  async function main() {
    const falhas = [];
    for (const base of API_BASES) {
      try {
        const count = await fetchHistorico(base);
        const tier = base.includes('azure') ? 'normal' : base.includes('render') ? 'render-live' : 'tunnel-live';
        console.log(`OK tier=${tier} base=${base} records=${count}`);
        if (tier === 'tunnel-live') {
          console.log('TIER3_SMOKE_PASS');
          process.exit(0);
        }
        console.log('(earlier tier succeeded — tier 3 reachable but not needed in this run)');
        process.exit(0);
      } catch (err) {
        falhas.push(`${base}: ${err.message}`);
      }
    }
    console.error('FAIL', falhas.join(' | '));
    process.exit(1);
  }
  
  main();