# PR A1.8 — Descrição mínima

## Resumo vs A1.7

A1.7 entregava uma única tela (Principal) parcialmente funcional. A1.8 completa o dashboard com **4 telas E2E**, camada `dataService` plugável (API real no canteiro Alface/A + mock de fallback para offline), threat model, observabilidade instrumentada, testes ampliados e release RC `v0.2.0-dashboard-rc`.

## Novas telas / funcionalidades

- **Principal** — status dos canteiros, relatório de irrigações (7 dias), estados loading/error/empty/success
- **Alertas** — lista filtrável (canteiro, tipo, período); umidade < 30%
- **Histórico** — tabela paginada + export CSV
- **Canteiros** — CRUD com validação e sanitização XSS

## Execução local

```bash
npm install
npm run preview          # http://localhost:3000/#/principal
npm test
npm run test:e2e:install && npm run test:e2e
```

## Diff de stack

- **Sem mudança de framework** (vanilla JS + Tailwind CDN + Chart.js)
- **Adicionado:** Playwright (devDependency) para E2E
- **Novos módulos:** `routerService`, `dataService`, `observabilityService`, views em `src/views/`

## Documentação

- [release-2.md](releases/release-2.md)
- [threat-model.md](../dashboard/threat-model.md)
- [observability-dashboard.md](../ops/observability-dashboard.md)
- Evidências: `docs/dashboard/evidencias/`
