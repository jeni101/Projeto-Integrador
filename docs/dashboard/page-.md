# Dashboard — Estrutura de Mock


## Visão geral

A camada de mock permite desenvolver e testar o dashboard sem depender da API real ou do hardware ESP32. A troca entre mock e API real exige alteração em **1 arquivo apenas**.

---

## Estrutura de arquivos

```
src/
├── types/
│   └── sensor.ts          ← contratos TypeScript de todos os sensores
├── mocks/
│   └── sensorData.ts      ← dados mockados com os 4 cenários
└── services/
    └── sensorService.ts   ← ÚNICO arquivo a alterar para ir a produção
```

---

## Como trocar para a API real

Abra `src/services/sensorService.ts` e altere a constante:

```ts
// desenvolvimento (padrão)
const USE_MOCK = true;

// produção
const USE_MOCK = false;
```

Nenhum outro arquivo precisa ser modificado.

---

## Sensores cobertos

| Sensor | Campo | Faixa válida | RF |
|--------|-------|-------------|-----|
| DHT22 — temperatura | `temperatura_c` | -40°C a 80°C | RF-003 |
| DHT22 — umidade do ar | `umidade_ar_pct` | 0–100% | RF-003 |
| Capacitivo de solo | `umidade_solo_pct` | 0–100% | RF-002 |
| LDR | `luminosidade_lux` | 10–10.000 lux | RF-004 |
| Bateria solar | `bateria_pct` | 0–100% | RF-007 |

---

## Cenários de mock

### `normal`
Leituras dentro das faixas nominais. Simula tarde ensolarada com solo adequadamente irrigado.

| Campo | Valor base | Amplitude |
|-------|-----------|-----------|
| `temperatura_c` | 28.5°C | ±0.5 |
| `umidade_ar_pct` | 65% | ±1.0 |
| `umidade_solo_pct` | 42% | ±1.5 |
| `luminosidade_lux` | 4200 lux | ±100 |
| `bateria_pct` | 78% | ±1.0 |

---

### `pico`
Valores próximos aos limites máximos dos sensores. Útil para testar alertas e regras de irrigação automática (UC-03). Solo abaixo do threshold de 30% — dispara irrigação.

| Campo | Valor base | Observação |
|-------|-----------|-----------|
| `temperatura_c` | 79°C | Próximo ao limite RF-003 (80°C) |
| `umidade_ar_pct` | 97% | Umidade crítica |
| `umidade_solo_pct` | 12% | Abaixo do threshold UC-03 (30%) |
| `luminosidade_lux` | 9800 lux | Próximo ao limite RF-004 |
| `bateria_pct` | 22% | Bateria baixa |

---

### `offline`
ESP32 perdeu conexão Wi-Fi. Todos os campos de sensor retornam `null`. O timestamp preserva o momento da última leitura válida (5 minutos atrás). O dashboard deve exibir estado de indisponibilidade sem crashar.

```ts
{
  temperatura_c:    null,
  umidade_ar_pct:   null,
  umidade_solo_pct: null,
  luminosidade_lux: null,
  bateria_pct:      null,
}
```

---

### `parcial`
LDR com falha de leitura (componente ou conexão com defeito). DHT22 e solo continuam operando. O dashboard deve renderizar `–` no widget de luminosidade, não lançar erro.

```ts
{
  temperatura_c:    26.0,  // operando
  umidade_ar_pct:   70.0,  // operando
  umidade_solo_pct: 55.0,  // operando
  luminosidade_lux: null,  // LDR indisponível
  bateria_pct:      85.0,  // operando
}
```

---

## Histórico simulado

`historicoMock` em `sensorData.ts` exporta uma sequência de 6 leituras cobrindo ~10 minutos de operação real:

| Offset | Cenário | Evento simulado |
|--------|---------|----------------|
| -10 min | normal | operação normal |
| -8 min | normal | operação normal |
| -6 min | normal | operação normal |
| -4 min | parcial | LDR falha |
| -2 min | offline | dispositivo perde conexão |
| agora | normal | reconexão e leitura enviada |

Útil para popular gráficos de série temporal no dashboard (UC-01).

---

## API pública do sensorService

```ts
// Leitura atual (mock ou API real)
fetchSensorData(cenario?: CenarioMock): Promise<ResultadoFetch>

// Histórico de leituras
fetchHistoricoSensores(): Promise<ResultadoFetch & { historico?: PayloadMock[] }>

// Verifica se mock está ativo (exibir badge no dashboard)
isMockAtivo(): boolean
```

---

## Contratos de versão

| Versão | Schema | Status |
|--------|--------|--------|
| v0.1 | `device_id / sensor / valor / timestamp` | ✅ em uso — adaptador em `sensorService.ts` |
| v0.2 | campos separados por grandeza física | ⏳ pendente — rastreado em P-03 |

Ao migrar para v0.2, remover a função `adaptarRespostaV1()` de `sensorService.ts`. Nenhum outro arquivo é afetado.

---

## Rastreabilidade

| Artefato | UC | Risco da matriz |
|----------|----|----------------|
| cenário `offline` | UC-01 FE-01-A | #2 (buffer NVS) |
| cenário `pico` | UC-03 FP P2 | #6 (null < 30 em JS) |
| cenário `parcial` | UC-01 FP P7–10 | #3 (await WebSocket) |
| `adaptarRespostaV1()` | UC-01 | P-03 (migração schema) |