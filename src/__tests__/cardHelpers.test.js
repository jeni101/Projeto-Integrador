import {
  calcularStatusUmidadeSolo,
  calcularStatusUmidadeAr,
  calcularStatusTemperatura,
  calcularProgressBarPct,
  calcularDelta,
  formatarTimestamp,
  formatarUptime,
  formatarDuracaoIrrigacao,
  sanitizarEntradaData,
  sanitizarDuracaoIrrigacao,
  escapeHtml,
  sanitizarTextoCanteiro,
  validarCanteiro,
} from '../services/cardHelpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// calcularStatusUmidadeSolo
// ─────────────────────────────────────────────────────────────────────────────
describe('calcularStatusUmidadeSolo', () => {
  test('retorna "Solo muito seco" para valor <= 30', () => {
    expect(calcularStatusUmidadeSolo(0)).toBe('Solo muito seco');
    expect(calcularStatusUmidadeSolo(30)).toBe('Solo muito seco');
  });

  test('retorna "Solo seco" para 31–55', () => {
    expect(calcularStatusUmidadeSolo(31)).toBe('Solo seco');
    expect(calcularStatusUmidadeSolo(55)).toBe('Solo seco');
  });

  test('retorna "Umido" para 56–85', () => {
    expect(calcularStatusUmidadeSolo(56)).toBe('Umido');
    expect(calcularStatusUmidadeSolo(85)).toBe('Umido');
    expect(calcularStatusUmidadeSolo(63.5)).toBe('Umido');
  });

  test('retorna "Saturado" para > 85', () => {
    expect(calcularStatusUmidadeSolo(86)).toBe('Saturado');
    expect(calcularStatusUmidadeSolo(100)).toBe('Saturado');
  });

  test('retorna "N/D" para valores inválidos', () => {
    expect(calcularStatusUmidadeSolo(null)).toBe('N/D');
    expect(calcularStatusUmidadeSolo(undefined)).toBe('N/D');
    expect(calcularStatusUmidadeSolo('texto')).toBe('N/D');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcularStatusUmidadeAr
// ─────────────────────────────────────────────────────────────────────────────
describe('calcularStatusUmidadeAr', () => {
  test('retorna "Ar seco" para valor < 40', () => {
    expect(calcularStatusUmidadeAr(0)).toBe('Ar seco');
    expect(calcularStatusUmidadeAr(39)).toBe('Ar seco');
  });

  test('retorna "Agradavel" para 40–80', () => {
    expect(calcularStatusUmidadeAr(40)).toBe('Agradavel');
    expect(calcularStatusUmidadeAr(61)).toBe('Agradavel');
    expect(calcularStatusUmidadeAr(80)).toBe('Agradavel');
  });

  test('retorna "Muito umido" para > 80', () => {
    expect(calcularStatusUmidadeAr(81)).toBe('Muito umido');
    expect(calcularStatusUmidadeAr(100)).toBe('Muito umido');
  });

  test('retorna "N/D" para valores inválidos', () => {
    expect(calcularStatusUmidadeAr(null)).toBe('N/D');
    expect(calcularStatusUmidadeAr(undefined)).toBe('N/D');
    expect(calcularStatusUmidadeAr('nublado')).toBe('N/D');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcularStatusTemperatura
// ─────────────────────────────────────────────────────────────────────────────
describe('calcularStatusTemperatura', () => {
  test('retorna "Frio" para < 10°C', () => {
    expect(calcularStatusTemperatura(-5)).toBe('Frio');
    expect(calcularStatusTemperatura(9)).toBe('Frio');
  });

  test('retorna "Estavel" para 10–28°C', () => {
    expect(calcularStatusTemperatura(10)).toBe('Estavel');
    expect(calcularStatusTemperatura(19.5)).toBe('Estavel');
    expect(calcularStatusTemperatura(28)).toBe('Estavel');
  });

  test('retorna "Quente" para 28–35°C (exclusive)', () => {
    expect(calcularStatusTemperatura(29)).toBe('Quente');
    expect(calcularStatusTemperatura(35)).toBe('Quente');
  });

  test('retorna "Critico" para > 35°C', () => {
    expect(calcularStatusTemperatura(36)).toBe('Critico');
    expect(calcularStatusTemperatura(50)).toBe('Critico');
  });

  test('retorna "N/D" para valores inválidos', () => {
    expect(calcularStatusTemperatura(null)).toBe('N/D');
    expect(calcularStatusTemperatura(undefined)).toBe('N/D');
    expect(calcularStatusTemperatura('quente')).toBe('N/D');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcularProgressBarPct
// ─────────────────────────────────────────────────────────────────────────────
describe('calcularProgressBarPct', () => {
  test('mapeia % diretamente (min=0, max=100)', () => {
    expect(calcularProgressBarPct(0)).toBe(0);
    expect(calcularProgressBarPct(50)).toBe(50);
    expect(calcularProgressBarPct(100)).toBe(100);
    expect(calcularProgressBarPct(63.5)).toBe(63.5);
  });

  test('clamp a 0 quando valor abaixo do min', () => {
    expect(calcularProgressBarPct(-10)).toBe(0);
  });

  test('clamp a 100 quando valor acima do max', () => {
    expect(calcularProgressBarPct(110)).toBe(100);
  });

  test('mapeia temperatura (min=0, max=50)', () => {
    expect(calcularProgressBarPct(25, 0, 50)).toBe(50);
    expect(calcularProgressBarPct(0, 0, 50)).toBe(0);
    expect(calcularProgressBarPct(50, 0, 50)).toBe(100);
  });

  test('retorna 0 para entradas inválidas', () => {
    expect(calcularProgressBarPct(null)).toBe(0);
    expect(calcularProgressBarPct(undefined)).toBe(0);
  });

  test('retorna 0 quando max <= min', () => {
    expect(calcularProgressBarPct(50, 100, 50)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcularDelta
// ─────────────────────────────────────────────────────────────────────────────
describe('calcularDelta', () => {
  test('calcula delta positivo corretamente', () => {
    expect(calcularDelta(60, 63.5)).toBe(3.5);
  });

  test('calcula delta negativo corretamente', () => {
    expect(calcularDelta(65, 61.2)).toBe(-3.8);
  });

  test('retorna 0 quando valores são iguais', () => {
    expect(calcularDelta(50, 50)).toBe(0);
  });

  test('retorna null quando anterior é null', () => {
    expect(calcularDelta(null, 63.5)).toBeNull();
  });

  test('retorna null quando anterior é undefined', () => {
    expect(calcularDelta(undefined, 63.5)).toBeNull();
  });

  test('retorna null quando atual é null', () => {
    expect(calcularDelta(60, null)).toBeNull();
  });

  test('retorna null quando tipos não são numéricos', () => {
    expect(calcularDelta('60', 63)).toBeNull();
    expect(calcularDelta(60, '63')).toBeNull();
  });

  test('resultado arredondado a 1 casa decimal', () => {
    expect(calcularDelta(60.123, 63.456)).toBe(3.3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatarTimestamp
// ─────────────────────────────────────────────────────────────────────────────
describe('formatarTimestamp', () => {
  test('formata ISO string para HH:MM', () => {
    // Fixa timezone para evitar flakiness em CI
    const resultado = formatarTimestamp('2026-06-13T14:32:00.000Z');
    expect(resultado).toMatch(/^\d{2}:\d{2}$/);
  });

  test('retorna "--:--" para null', () => {
    expect(formatarTimestamp(null)).toBe('--:--');
  });

  test('retorna "--:--" para undefined', () => {
    expect(formatarTimestamp(undefined)).toBe('--:--');
  });

  test('retorna "--:--" para string vazia', () => {
    expect(formatarTimestamp('')).toBe('--:--');
  });

  test('retorna "--:--" para data inválida', () => {
    expect(formatarTimestamp('nao-e-data')).toBe('--:--');
  });

  test('retorna "--:--" para tipo não-string', () => {
    expect(formatarTimestamp(123456789)).toBe('--:--');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatarUptime
// ─────────────────────────────────────────────────────────────────────────────
describe('formatarUptime', () => {
  test('retorna "0d 0h" para valores inválidos', () => {
    expect(formatarUptime(null)).toBe('0d 0h');
    expect(formatarUptime(undefined)).toBe('0d 0h');
    expect(formatarUptime(0)).toBe('0d 0h');
  });

  test('calcula uptime de 2 dias e 4 horas', () => {
    const agora = Date.now();
    const inicio = agora - (2 * 24 * 60 * 60 * 1000) - (4 * 60 * 60 * 1000);
    expect(formatarUptime(inicio)).toBe('2d 4h');
  });

  test('calcula uptime de 0 dias e 3 horas', () => {
    const agora = Date.now();
    const inicio = agora - (3 * 60 * 60 * 1000);
    expect(formatarUptime(inicio)).toBe('0d 3h');
  });

  test('nunca retorna valores negativos (inicioMs no futuro)', () => {
    const resultado = formatarUptime(Date.now() + 100000);
    expect(resultado).toBe('0d 0h');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatarDuracaoIrrigacao
// ─────────────────────────────────────────────────────────────────────────────
describe('formatarDuracaoIrrigacao', () => {
  test('exibe segundos para valores < 60s', () => {
    expect(formatarDuracaoIrrigacao(30)).toBe('30s');
    expect(formatarDuracaoIrrigacao(59)).toBe('59s');
  });

  test('converte para minutos para valores >= 60s', () => {
    expect(formatarDuracaoIrrigacao(60)).toBe('1m');
    expect(formatarDuracaoIrrigacao(120)).toBe('2m');
    expect(formatarDuracaoIrrigacao(300)).toBe('5m');
  });

  test('retorna "0s" para valores inválidos', () => {
    expect(formatarDuracaoIrrigacao(0)).toBe('0s');
    expect(formatarDuracaoIrrigacao(null)).toBe('0s');
    expect(formatarDuracaoIrrigacao(-10)).toBe('0s');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sanitizarEntradaData — ISO 27001 A.14.2.5
// ─────────────────────────────────────────────────────────────────────────────
describe('sanitizarEntradaData', () => {
  test('aceita formato datetime-local válido', () => {
    expect(sanitizarEntradaData('2026-06-13T14:30')).toBe('2026-06-13T14:30');
  });

  test('rejeita string vazia', () => {
    expect(sanitizarEntradaData('')).toBe('');
  });

  test('rejeita null e undefined', () => {
    expect(sanitizarEntradaData(null)).toBe('');
    expect(sanitizarEntradaData(undefined)).toBe('');
  });

  test('rejeita tentativa de injeção com script', () => {
    expect(sanitizarEntradaData('<script>alert(1)</script>')).toBe('');
  });

  test('rejeita formato de data alternativo', () => {
    expect(sanitizarEntradaData('13/06/2026 14:30')).toBe('');
    expect(sanitizarEntradaData('2026-06-13')).toBe('');
  });

  test('rejeita data inválida mesmo com formato correto', () => {
    expect(sanitizarEntradaData('2026-13-45T99:99')).toBe('');
  });

  test('remove espaços extras (trim)', () => {
    expect(sanitizarEntradaData('  2026-06-13T14:30  ')).toBe('2026-06-13T14:30');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sanitizarDuracaoIrrigacao — ISO 27002 8.2
// ─────────────────────────────────────────────────────────────────────────────
describe('sanitizarDuracaoIrrigacao', () => {
  test('aceita valores permitidos', () => {
    expect(sanitizarDuracaoIrrigacao(30)).toBe(30);
    expect(sanitizarDuracaoIrrigacao(60)).toBe(60);
    expect(sanitizarDuracaoIrrigacao(120)).toBe(120);
    expect(sanitizarDuracaoIrrigacao(300)).toBe(300);
  });

  test('rejeita valor fora da lista — retorna 60 (padrão seguro)', () => {
    expect(sanitizarDuracaoIrrigacao(999)).toBe(60);
    expect(sanitizarDuracaoIrrigacao(0)).toBe(60);
    expect(sanitizarDuracaoIrrigacao(-1)).toBe(60);
  });

  test('converte string numérica válida', () => {
    expect(sanitizarDuracaoIrrigacao('120')).toBe(120);
  });

  test('rejeita string não-numérica — retorna 60', () => {
    expect(sanitizarDuracaoIrrigacao('abc')).toBe(60);
  });

  test('rejeita null e undefined — retorna 60', () => {
    expect(sanitizarDuracaoIrrigacao(null)).toBe(60);
    expect(sanitizarDuracaoIrrigacao(undefined)).toBe(60);
  });

  test('aceita lista customizada de valores permitidos', () => {
    expect(sanitizarDuracaoIrrigacao(10, [10, 20, 30])).toBe(10);
    expect(sanitizarDuracaoIrrigacao(15, [10, 20, 30])).toBe(60);
  });
});

describe('escapeHtml', () => {
  test('escapa tags script', () => {
    expect(escapeHtml('<script>alert(1)</script>')).not.toContain('<script>');
    expect(escapeHtml('<script>alert(1)</script>')).toContain('&lt;');
  });
});

describe('sanitizarTextoCanteiro', () => {
  test('remove caracteres perigosos', () => {
    expect(sanitizarTextoCanteiro('  Horta <b>A</b>  ')).not.toContain('<');
    expect(sanitizarTextoCanteiro('<script>x</script>')).not.toMatch(/script/i);
  });
});

describe('validarCanteiro', () => {
  test('rejeita área zero', () => {
    const r = validarCanteiro({ nome: 'Test', cultura: 'Alface', area_m2: 0 });
    expect(r.valido).toBe(false);
  });

  test('aceita canteiro válido', () => {
    const r = validarCanteiro({ nome: 'Horta A', cultura: 'Tomate', area_m2: 4.5 });
    expect(r.valido).toBe(true);
    expect(r.area_m2).toBe(4.5);
  });
});
