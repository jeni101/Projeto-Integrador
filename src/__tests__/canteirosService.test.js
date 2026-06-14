import {

  createCanteiro,

  updateCanteiro,

  deleteCanteiro,

  getCanteiros,

  CANTEIRO_API_ID,

} from '../services/canteirosService.js';



const STORAGE_KEY = 'phorta-canteiros';



beforeEach(() => {

  localStorage.clear();

});



describe('canteirosService CRUD', () => {

  test('inicializa apenas com canteiro Alface da API', () => {

    const lista = getCanteiros();

    expect(lista).toHaveLength(1);

    expect(lista[0].id).toBe(CANTEIRO_API_ID);

    expect(lista[0].cultura).toBe('Alface');

    expect(lista[0].fonteApi).toBe(true);

  });



  test('createCanteiro valida campos obrigatórios', () => {

    const r = createCanteiro({ nome: '', cultura: 'Alface', area_m2: 0 });

    expect(r.ok).toBe(false);

    expect(r.erros.length).toBeGreaterThan(0);

  });



  test('createCanteiro persiste canteiro adicional', () => {

    const r = createCanteiro({

      id: 'B',

      nome: 'Canteiro Tomate',

      cultura: 'Tomate',

      area_m2: 2.5,

      sensores: 3,

    });

    expect(r.ok).toBe(true);

    expect(getCanteiros()).toHaveLength(2);

    expect(r.canteiro.fonteApi).toBe(false);

  });



  test('createCanteiro sanitiza XSS no nome', () => {

    const r = createCanteiro({

      nome: '<script>alert(1)</script>',

      cultura: 'Tomate',

      area_m2: 3,

    });

    expect(r.ok).toBe(true);

    expect(r.canteiro.nome).not.toContain('<');

    expect(r.canteiro.nome).not.toMatch(/script/i);

  });



  test('createCanteiro bloqueia ID reservado da API', () => {

    const r = createCanteiro({ id: 'A', nome: 'Outro', cultura: 'Tomate', area_m2: 3 });

    expect(r.ok).toBe(false);

  });



  test('updateCanteiro altera cultura de canteiro manual', () => {

    createCanteiro({ id: 'B', nome: 'B1', cultura: 'Alface', area_m2: 2 });

    const r = updateCanteiro('B', { nome: 'B1', cultura: 'Tomate', area_m2: 2 });

    expect(r.ok).toBe(true);

    expect(getCanteiros().find(c => c.id === 'B').cultura).toBe('Tomate');

  });



  test('deleteCanteiro impede excluir canteiro da API', () => {

    const r = deleteCanteiro(CANTEIRO_API_ID);

    expect(r.ok).toBe(false);

    expect(getCanteiros()).toHaveLength(1);

  });



  test('deleteCanteiro remove canteiro manual', () => {

    createCanteiro({ id: 'B', nome: 'B1', cultura: 'Tomate', area_m2: 2 });

    const r = deleteCanteiro('B');

    expect(r.ok).toBe(true);

    expect(getCanteiros()).toHaveLength(1);

  });



  test('migração remove seeds mock B/C/D legados e preserva canteiros do usuário', () => {

    localStorage.setItem(STORAGE_KEY, JSON.stringify([

      { id: 'A', nome: 'Canteiro Alface', cultura: 'Alface', area_m2: 4.5, sensores: 3, fonteApi: true },

      { id: 'B', nome: 'Canteiro B', cultura: 'Tomate', area_m2: 3, sensores: 3 },

      { id: 'C', nome: 'Canteiro C', cultura: 'Manjericão', area_m2: 2, sensores: 2 },

      { id: 'D', nome: 'Canteiro D', cultura: 'Cenoura', area_m2: 2.5, sensores: 2 },

      { id: 'B', nome: 'Canteiro Tomate', cultura: 'Tomate', area_m2: 2, sensores: 1, criadoPeloUsuario: true },

    ]));

    const lista = getCanteiros();

    expect(lista).toHaveLength(2);

    expect(lista.find(c => c.id === 'A' && c.fonteApi)).toBeDefined();

    expect(lista.find(c => c.nome === 'Canteiro B')).toBeUndefined();

    expect(lista.find(c => c.nome === 'Canteiro Tomate')).toBeDefined();

  });

});


