# Page Decision: Home (Dashboard Principal)

**Status:** Accepted  
**Data:** 2026-04-23  
**Autores:** Gustavo, Philipe, Luis G., Victor, Jenifer  
**RFC de referência:** RFC-XXX (A1.4) — [`docs/rfc/rfc-xxx.md`](../rfc/rfc-xxx.md)  
**Atividade:** A1.7 — Entrega E2E de 1 tela do dashboard  

---

## 1. Telas candidatas avaliadas

As 4 telas previstas na RFC (seção 7) avaliadas pelos três eixos exigidos pela A1.7:

| Tela | UC atendido | Risco Técnico | Complexidade | Aprendizado Gerado | Score |
| --- | --- | --- | --- | --- | --- |
| **Home (Dashboard)** | UC-01 | 🔴 Alto | 🔴 Alta | 🟢 Muito Alto | ★★★ |
| Histórico | UC-02 | 🟡 Médio | 🟡 Média | 🟡 Médio | ★★ |
| Controle de Irrigação | UC-03 | 🟡 Médio | 🟡 Média | 🟡 Médio | ★★ |
| Configurações | UC-XX | 🟢 Baixo | 🟢 Baixa | 🔴 Baixo | ★ |

**Critérios de pontuação:**

- **Risco técnico:** dependências de WebSocket, múltiplos sensores simultâneos, estados de falha concorrentes, ação de escrita (irrigação manual).
- **Complexidade:** quantidade de componentes distintos, variação de estados visuais, composição do layout.
- **Aprendizado gerado:** o quanto fechar essa tela valida decisões que se propagam para todas as demais.

---

## 2. Tela escolhida

**Home — tela principal do dashboard de monitoramento da horta comunitária.**

É a primeira tela que o administrador/cuidador vê ao abrir o sistema. Agrega em uma única view: leituras em tempo real dos sensores (umidade do solo, umidade do ar, temperatura), condições climáticas atuais, gráfico de tendências com filtro de período, alertas ativos por severidade, status do dispositivo e conexão MQTT, ação rápida de irrigação manual com duração configurável, status da bomba e tabela de erros do sistema.

Atende diretamente ao **UC-01** (monitoramento em tempo real) e parcialmente ao **UC-03** (irrigação manual via Ação Rápida).

---

## 3. Justificativa (risco / complexidade / aprendizado)

### 3.1 Risco — por que enfrentar agora

A Home concentra simultaneamente os três maiores riscos técnicos do projeto:

- **WebSocket em tempo real:** a RFC (seção 4) define Socket.IO para atualização do dashboard. A Home é a tela que mais depende disso — múltiplos painéis precisam reagir a cada evento recebido. Resolver o contrato de eventos WebSocket aqui evita que Histórico e Controle sejam construídos sobre uma abstração ainda não validada.
- **Dados parciais e sensor offline:** o badge "Offline" já visível no wireframe mostra que esse estado é esperado em produção. O sistema opera em ambiente externo com instabilidade de conectividade (risco mapeado na RFC seção 8). A tela precisa renderizar leituras parciais de forma coerente — não silenciar o erro, não travar.
- **Ação de escrita com feedback de estado:** o botão "Iniciar Irrigação" dispara o fluxo completo: Frontend → HTTP → Backend NestJS → MQTT → ESP32 → Relé → Bomba (Cenário 2, RFC seção 5.2). Esse ciclo precisa de estados de loading, sucesso e falha visíveis. Resolver esse padrão aqui significa que a tela de Controle recebe o padrão pronto.

> Se o WebSocket travar ou o mock não refletir o shape real dos eventos, é melhor descobrir na A1.7 — não depois de três telas construídas sobre a mesma abstração.

### 3.2 Complexidade — por que ela força o design system a existir

A Home obriga a construção de componentes reutilizados em todas as outras telas:

| Componente | Onde é reusado |
| --- | --- |
| `<MetricGauge />` | Sensores, Histórico |
| `<TrendChart />` | Histórico (versão expandida) |
| `<AlertCard />` | Qualquer tela com sistema de alertas |
| `<StatusBadge />` | Controle, Sensores, Configurações |
| `<DeviceStatus />` | Controle, Configurações |
| `<QuickAction />` | Controle de Irrigação |
| `<ErrorTable />` | Log global |

Começar por Configurações produziria componentes de CRUD usados apenas lá. A Home gera a **biblioteca base** do dashboard inteiro.

### 3.3 Aprendizado — o que esta tela valida que as outras não validam

1. **Shape dos eventos WebSocket:** o mock define o formato de `SensorReading`, `AlertItem` e `DeviceStatus` que o backend NestJS via Socket.IO vai precisar emitir. Gaps no contrato são descobertos antes da integração real.
2. **Comportamento sob estado offline:** o sistema opera em ambiente com conectividade instável (risco da RFC seção 8). Implementar e testar esse estado na tela mais visível estabelece o padrão de degradação graceful para todo o dashboard.
3. **Decisão de biblioteca de gráfico:** o `TrendChart` com múltiplas séries, dois eixos Y e filtro de período (30min / 1h / 6h / 24h) é o caso mais exigente do projeto. Escolher a biblioteca aqui — com o caso mais difícil — garante que a escolha escala para o Histórico.
4. **Padrão de atualização via WebSocket:** a RFC define Socket.IO para tempo real. O mock simula esse comportamento. Se o intervalo de atualização revelar problema de performance no gráfico com re-renders frequentes, o problema é resolvido antes de afetar as outras telas.

### 3.4 Por que as outras telas não foram escolhidas

- **Histórico (UC-02):** depende de filtros de período com paginação e consultas ao InfluxDB. A spec de como os dados históricos são agrupados (por hora, por dia) não está fechada na RFC. Construir agora significa construir sobre premissas que podem mudar.
- **Controle de Irrigação (UC-03):** a ação de escrita já é coberta pelo `<QuickAction />` da Home. Isolar essa tela como primeira entrega não acrescentaria aprendizado além do que a Home já força — e perderia todos os componentes de leitura que o restante precisa.
- **Configurações (UC-XX):** CRUD de regras de irrigação automática. Baixo risco, baixa complexidade, baixo aprendizado. Fechar primeiro seria otimizar o que não é crítico.

---

## 4. Wireframe da versão implementada

> O wireframe reflete **exatamente** o que está sendo implementado.

**Arquivo:** `docs/dashboard/wireframes/home-v1.png`

```.
┌──────────────────────────────────────────────────────────────────────────┐
│  [🌱 Logo]   HOME • HISTÓRICO • CRESCIMENTO • SENSORES        [🔔] [Offline] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ Umid. Solo   │  │ Umid. Ar     │  │ Temperatura  │  │ Condições   │  │
│  │ gauge — 40%  │  │ gauge — 25%  │  │ gauge — 15°C │  │ Vento 2.4   │  │
│  │ "Úmido"      │  │ "Seco"       │  │ "Agradável"  │  │ Chuva 0mm   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │ Pressão 1013│  │
│                                                          │ UV Moderado │  │
│  ┌────────────────────────────────────┐ └─────────────┘  │
│  │ Tendências em tempo real           │ ┌──────────────────────┐        │
│  │ [30min]  [1h]  [6h]  [24h]        │ │ ⚠ Alertas            │        │
│  │                                    │ │ 🟡 Umid. solo baixa  │        │
│  │  gráfico multisérie                │ │ 🔴 Reservatório crit.│        │
│  │  eixo Y esq: %  |  eixo Y dir: °C │ │ 🟢 Sistema normal    │        │
│  │                                    │ │ [Ver todos os alertas]│        │
│  └────────────────────────────────────┘ └──────────────────────┘        │
│                                                                           │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────┐  │
│  │ Tabela de Erros      │  │ ⚙ Status Dispositivo  │  │ 💧 Ação Rápida│  │
│  │ (erros do sistema)   │  │ Estado:    IDLE        │  │ Duração: [60] │  │
│  │                      │  │ Conexão:   Online      │  │ [▶ Iniciar]  │  │
│  │                      │  │ MQTT:      Conectado   │  ├───────────────┤  │
│  │                      │  │ Últ. cmd:  Nenhum      │  │ 🪣 Status    │  │
│  │                      │  │ Ligado há: 2d 4h       │  │ Bomba deslig.│  │
│  └──────────────────────┘  └──────────────────────┘  └───────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Escopo da v1 (implementado):**

- Cards de métricas com gauge animado (Umid. Solo, Umid. Ar, Temperatura)
- Bloco de Condições Atuais (Vento, Chuva, Pressão, Índice UV)
- Gráfico de Tendências com filtro de período (30min / 1h / 6h / 24h)
- Painel de Alertas com severidade (info / atenção / crítico)
- Status do Dispositivo (Estado, Conexão, MQTT, Último comando, Uptime)
- Ação Rápida de Irrigação com input de duração e botão de acionamento
- Status da Bomba
- Tabela de Erros do sistema

**Fora do escopo da v1 (entra na A1.8):**

- Conexão WebSocket real com o backend NestJS + Socket.IO
- Integração com InfluxDB (hoje: mock isolado e plugável)
- Filtro de período customizado no gráfico
- Histórico completo de erros com paginação

---

## 5. Estados visuais cobertos

Os 4 estados obrigatórios da A1.7 estão marcados com ✅. Os demais são específicos do domínio da Home.

| # | Estado | O que aparece para o usuário |
| --- | --- | --- |
| ✅ 1 | **Carregando** | Skeleton loader nos 3 cards de métrica e no gráfico; spinner no header com "Atualizando..."; painéis de alerta e status com placeholder cinza |
| ✅ 2 | **Sucesso (dados completos)** | Todos os gauges preenchidos com valores realistas, gráfico multisérie renderizado, alertas listados por severidade, status Online/Conectado |
| ✅ 3 | **Erro de fetch** | Banner não-bloqueante no topo: "Não foi possível atualizar os dados. Última leitura: 12:30:45" com botão "Tentar novamente"; badge "Offline" ativo no header; valores anteriores permanecem visíveis em cinza |
| ✅ 4 | **Dado vazio / parcial** | Sensor com falha exibe `--` no gauge com badge vermelho "Sem leitura"; gráfico renderiza apenas as séries disponíveis, marcando a ausente com tracejado e tooltip "Sensor sem resposta"; demais cards funcionam normalmente |
| 5 | **Alerta crítico ativo** | AlertCard com borda vermelha e ícone de perigo; sem modal bloqueante — o usuário continua operando o dashboard |
| 6 | **Irrigação em andamento** | Botão muda para "Irrigando... (45s)" com contagem regressiva; input de duração desabilitado; Status da Bomba atualiza para "Bomba ligada" em verde |

---

## 6. Estrutura de mock

**Shape dos dados** (alinhado ao contrato WebSocket definido na RFC seção 5.2 — Cenário 1):

**Valores mockados realistas:**

- Umidade do Solo: 40% — "Úmido" (faixa pós-irrigação recente)
- Umidade do Ar: 25% — "Seco" (justifica alerta ativo)
- Temperatura: 15°C — "Agradável" (manhã de outono)
- Tendências: 30 pontos em 30 minutos com variação de ±3% (não valores fixos)
- Timestamps coerentes: série começa em `now - 30min`, incrementos de 1 minuto

**Plano de migração para API real — 1 arquivo, 1 variável de ambiente:**

```typescript
// src/services/homeService.ts
const dataSource = import.meta.env.VITE_USE_MOCK === "true"
  ? () => import("../mocks/home.mock").then(m => m.sensorsMock)
  : () => socketClient.on("sensor_reading", handler);
```

Trocar para integração real = `VITE_USE_MOCK=false` no `.env.production`. Nenhum componente muda.

---

## 7. Decisão de stack

Itens já definidos na RFC são referenciados. Itens novos são documentados aqui como atualização de ADR.

| Decisão | Escolha | Definido em | Justificativa |
| --- | --- | --- | --- |
| Framework frontend | React 18.2 | RFC seção 4 | Interface reativa e dinâmica |
| Comunicação tempo real | Socket.IO 4.7 | RFC seção 4 | Atualização em tempo real no dashboard |
| Banco de séries temporais | InfluxDB 2.7 | RFC seção 4 / ADR-002 | Otimizado para dados de sensores em alta frequência |
| **Biblioteca de gráfico** | **Recharts** | **Este documento** | Suporte nativo a múltiplos eixos Y e séries mistas; API declarativa compatível com React; menor bundle que Chart.js para o caso de uso de linha temporal com re-renders frequentes via Socket.IO. Alternativas descartadas: Chart.js (API imperativa, conflita com o modelo React); Visx (baixo nível, custo de desenvolvimento desproporcional para o prazo) |
| **Gerenciador de estado** | **React useState + useReducer** | **Este documento** | Sem necessidade de estado global na v1 — dados chegam por socket isolado por componente. Zustand entra na A1.8 se o evento WebSocket global precisar alimentar múltiplas telas simultaneamente |
| **Fetch / estado assíncrono** | **TanStack Query (React Query)** | **Este documento** | Cache automático, refetch em intervalo configurável, estados de loading/error/success nativos — elimina boilerplate que seria escrito manualmente para os 4 estados obrigatórios da A1.7 |

> Recharts, useReducer e TanStack Query não constavam na RFC original. Esta seção registra essas três decisões como atualização de ADR. Nenhuma contradiz a stack definida — são escolhas de camada de apresentação que a RFC deixou em aberto.

---

## 8. Rastreabilidade requisito → tela → teste

| Requisito (UC) | Componente na tela | Teste | Estado coberto |
| --- | --- | --- | --- |
| UC-01: Monitoramento em tempo real | `<MetricGauge />`, `<TrendChart />` | `home.test.tsx` — render com dados válidos | Sucesso |
| UC-01: Sensor offline | Badge "Offline" + gauge com `--` | `home.test.tsx` — render em estado offline | Parcial |
| UC-01: Fetch falhou | Banner de erro não-bloqueante | `home.test.tsx` — render em estado de erro | Erro de fetch |
| UC-01: Carregando | Skeleton nos cards e gráfico | `home.test.tsx` — render em estado loading | Carregando |
| UC-03: Irrigação manual | `<QuickAction />` + botão | `irrigation.test.tsx` — click + estado loading | Ação em andamento |
| —: Alertas por severidade | `<AlertCard />` | `alerts.test.tsx` — render crítico/atenção/info | Sucesso / Alerta |

> Cada teste deve estar ancorado em uma linha da matriz risco→teste da A1.6.  
> Log de execução: `docs/dashboard/evidencias/home-test-run.log`

---

## 9. Definition of Done

- [ ] Os 6 estados visuais da seção 5 renderizam sem erro no browser
- [ ] `git clone` + `npm install` + `npm run dev` funciona sem configuração adicional
- [ ] Camada de fetch isolada — trocar mock por Socket.IO real não altera nenhum componente
- [ ] ≥1 teste rodando validando comportamento real (não snapshot vazio), ancorado na A1.6
- [ ] Log de execução do teste em `docs/dashboard/evidencias/home-test-run.log`
- [ ] Dados mockados realistas (temperaturas em faixa plausível, timestamps coerentes)
- [ ] Layout não quebra em viewport mobile (≥375px)
- [ ] Commits seguem a convenção declarada na A1.5
- [ ] PR com descrição seguindo o template da equipe
- [ ] Review aprovado por outro membro (sem self-merge)
- [ ] Tag `v0.1.0-dashboard` criada no Git
- [ ] `docs/releases/release-1.md` preenchido com rastreabilidade
