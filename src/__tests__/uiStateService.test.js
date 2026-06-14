import {
  renderEstadoLoading,
  renderEstadoErro,
  renderEstadoVazio,
  renderPageShell,
} from '../services/uiStateService.js';

describe('uiStateService', () => {
  test('renderEstadoLoading inclui spinner', () => {
    expect(renderEstadoLoading()).toContain('animate-spin');
    expect(renderEstadoLoading('Aguarde')).toContain('Aguarde');
  });

  test('renderEstadoErro inclui botão retry', () => {
    expect(renderEstadoErro('Falhou')).toContain('Falhou');
    expect(renderEstadoErro('Falhou', 'btn-x')).toContain('btn-x');
  });

  test('renderEstadoVazio inclui título', () => {
    expect(renderEstadoVazio('Vazio')).toContain('Vazio');
  });

  test('renderPageShell envolve conteúdo', () => {
    const html = renderPageShell('Título', 'Sub', '<p>body</p>');
    expect(html).toContain('Título');
    expect(html).toContain('body');
    expect(html).toContain('data-ui-state="success"');
  });
});
