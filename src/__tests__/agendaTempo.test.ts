import { describe, it, expect } from 'vitest';
import {
  diaDoEvento,
  horaDoEvento,
  inicioDaSemana,
  inicioDoDia,
  janelaDeIntervalo,
  janelaDoMes,
  offsetDoFuso,
  paraDataHoraGoogle,
  paraDiaInteiroGoogle,
  paraInputLocal,
  primeiroDiaDoMesSeguinte,
  somarDias,
} from '@/lib/google/tempo';

const SP = 'America/Sao_Paulo';

describe('offsetDoFuso', () => {
  it('devolve o offset de São Paulo', () => {
    expect(offsetDoFuso(SP, new Date('2026-08-15T12:00:00Z'))).toBe('-03:00');
  });

  it('devolve +00:00 para UTC', () => {
    expect(offsetDoFuso('UTC', new Date('2026-08-15T12:00:00Z'))).toBe('+00:00');
  });
});

describe('somarDias', () => {
  it('soma e subtrai atravessando o mês', () => {
    expect(somarDias('2026-08-31', 1)).toBe('2026-09-01');
    expect(somarDias('2026-09-01', -1)).toBe('2026-08-31');
  });

  it('atravessa o ano', () => {
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('respeita ano bissexto', () => {
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('janelaDoMes', () => {
  it('cobre o mês inteiro com offset do fuso', () => {
    expect(janelaDoMes('2026-08', SP)).toEqual({
      timeMin: '2026-08-01T00:00:00-03:00',
      timeMax: '2026-09-01T00:00:00-03:00',
    });
  });

  it('vira o ano em dezembro', () => {
    expect(janelaDoMes('2026-12', SP).timeMax.startsWith('2027-01-01')).toBe(true);
  });
});

describe('primeiroDiaDoMesSeguinte', () => {
  it('avança um mês', () => {
    expect(primeiroDiaDoMesSeguinte('2026-08')).toBe('2026-09-01');
    expect(primeiroDiaDoMesSeguinte('2026-12')).toBe('2027-01-01');
  });
});

describe('janelaDeIntervalo', () => {
  it('trata o fim como inclusivo', () => {
    // Quem pede até 31/08 espera ver o dia 31 inteiro.
    expect(janelaDeIntervalo('2026-08-01', '2026-08-31', SP).timeMax).toBe(
      '2026-09-01T00:00:00-03:00',
    );
  });
});

describe('inicioDoDia', () => {
  it('gera RFC3339 com offset', () => {
    expect(inicioDoDia('2026-08-25', SP)).toBe('2026-08-25T00:00:00-03:00');
  });
});

describe('paraDataHoraGoogle', () => {
  it('não coloca offset nem Z — o timeZone é quem manda', () => {
    const r = paraDataHoraGoogle('2026-08-25T14:00', SP);
    expect(r).toEqual({ dateTime: '2026-08-25T14:00:00', timeZone: SP });
    expect(r.dateTime).not.toContain('Z');
    expect(r.dateTime).not.toContain('+');
  });

  it('aceita entrada que já tem segundos', () => {
    expect(paraDataHoraGoogle('2026-08-25T14:00:30', SP).dateTime).toBe('2026-08-25T14:00:30');
  });
});

describe('paraDiaInteiroGoogle', () => {
  it('usa fim exclusivo — o dia seguinte ao último dia', () => {
    expect(paraDiaInteiroGoogle('2026-08-25')).toEqual({
      start: { date: '2026-08-25' },
      end: { date: '2026-08-26' },
    });
  });

  it('cobre o intervalo inteiro quando há data final', () => {
    expect(paraDiaInteiroGoogle('2026-08-25', '2026-08-27').end).toEqual({ date: '2026-08-28' });
  });
});

describe('diaDoEvento', () => {
  it('usa o fuso, não UTC', () => {
    // 02:00Z de 26/08 ainda é dia 25 em São Paulo.
    expect(diaDoEvento('2026-08-26T02:00:00Z', SP)).toBe('2026-08-25');
  });

  it('devolve a data crua quando é dia inteiro', () => {
    expect(diaDoEvento('2026-08-25', SP)).toBe('2026-08-25');
  });
});

describe('horaDoEvento', () => {
  it('converte para o fuso', () => {
    expect(horaDoEvento('2026-08-25T17:00:00Z', SP)).toBe('14:00');
  });

  it('é vazio em dia inteiro', () => {
    expect(horaDoEvento('2026-08-25', SP)).toBe('');
  });
});

describe('paraInputLocal', () => {
  it('devolve o formato do input datetime-local', () => {
    expect(paraInputLocal('2026-08-25T17:00:00Z', SP)).toBe('2026-08-25T14:00');
  });
});

describe('inicioDaSemana', () => {
  it('volta para a segunda-feira', () => {
    // 2026-08-19 é uma quarta.
    expect(inicioDaSemana('2026-08-19')).toBe('2026-08-17');
  });

  it('trata domingo como fim da semana', () => {
    // 2026-08-23 é um domingo.
    expect(inicioDaSemana('2026-08-23')).toBe('2026-08-17');
  });

  it('é idempotente na própria segunda', () => {
    expect(inicioDaSemana('2026-08-17')).toBe('2026-08-17');
  });
});
