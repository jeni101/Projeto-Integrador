# Threat Model — Dashboard PHorta (A1.8)

**Escopo:** interface web do dashboard (`index.html` + `src/services/*`).  
**Complementa:** threat model geral do sistema IoT (ESP32, MQTT, API).

---

## 1. Ativos

| Ativo | Descrição | Localização |
|-------|-----------|-------------|
| Leituras de sensores | Temperatura, umidade, luminosidade, pH | Resposta `/api/historico/completo`, cache IndexedDB |
| Eventos de irrigação | Histórico agregado (API) e comandos manuais | `dataService.js` (`contarIrrigacoesDoHistorico`), painel Ação Rápida; `mockService.js` só em fallback de telemetria do canteiro A |
| Dados de canteiros | Nome, cultura, área | `localStorage` (`phorta-canteiros`) |
| Endpoints consumidos | Azure + Render APIs | `apiService.js` |
| Sessão local | Filtros, logs, preferências | `localStorage` / IndexedDB |
| Credenciais | Não há auth no dashboard v0.2 | — |

---

## 2. Ameaças concretas e mitigações

### A1 — XSS via nome de canteiro

**Cenário:** atacante cadastra canteiro com `<script>alert(1)</script>`; nome renderizado sem escape compromete sessão do operador.

| | |
|---|---|
| **Mitigação aplicada** | `sanitizarTextoCanteiro()` remove tags; `escapeHtml()` em toda renderização dinâmica (`canteirosView.js`, `alertasView.js`, `dashboardViewService.js`) |
| **Evidência** | `src/__tests__/cardHelpers.test.js` — teste de XSS em data; `src/__tests__/canteirosService.test.js` |

### A2 — Injeção em filtros de data/histórico

**Cenário:** payload malicioso em `<input type="datetime-local">` ou query string manipulada para quebrar parser ou injetar em logs.

| | |
|---|---|
| **Mitigação aplicada** | `sanitizarEntradaData()` aceita apenas `YYYY-MM-DDTHH:MM`; rejeita `<script>` e formatos inválidos |
| **Evidência** | `cardHelpers.test.js` — suite `sanitizarEntradaData` |

### A3 — Exposição de URLs/endpoints em logs de produção

**Cenário:** `console.log` com URLs completas ou tokens vazados em observabilidade.

| | |
|---|---|
| **Mitigação aplicada** | `observabilityService.js` emite JSON estruturado sem credenciais; URLs de API não são logadas pelo observability layer |
| **Dívida técnica** | `apiService.js` ainda loga URL em dev (`console.log 📡`). **Risco aceito:** ambiente acadêmico, sem secrets na URL. **Plano Marco 4:** redact URLs em produção via flag `DEBUG` |

### A4 — Dados em trânsito sem TLS

**Cenário:** MITM entre browser e API Azure/Render.

| | |
|---|---|
| **Mitigação aplicada** | Endpoints usam `https://`; deploy Vercel força HTTPS |
| **Headers** | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` em `vercel.json` |

---

## 3. Dívida técnica registrada

| Item | Justificativa | Plano |
|------|---------------|-------|
| CSP (Content-Security-Policy) completo | Tailwind CDN + Chart.js CDN exigem `unsafe-inline` parcial | ADR futuro com bundler local |
| Auth JWT no dashboard | Fora do escopo v0.2 (mock/API pública de leitura) | Marco 4 com middleware |
| Rate limiting no frontend | Não aplicável em SPA estática | Backend |

---

## 4. Evidência de scanning (SCA)

Execução: `npm audit --audit-level=moderate` em 14/06/2026.

Resultado salvo em: [`evidencias/npm-audit-a18.txt`](evidencias/npm-audit-a18.txt)

Dependências diretas: Jest, Babel (dev only). Superfície de ataque em produção limitada a assets estáticos servidos pela Vercel.
