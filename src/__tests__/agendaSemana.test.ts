import { describe, it, expect } from 'vitest';
import {
  diasDaSemana,
  minutosDoDia,
  montarSemana,
  rotuloColuna,
  rotuloDaSemana,
} from '@/lib/google/semana';
import type { AgendaEvento } from '@/lib/types';

const SP = 'America/Sao_Paulo';
const SEMANA = diasDaSemana('2026-08-17'); // segunda a domingo

function evento(over: Partial<AgendaEvento> = {}): AgendaEvento {
  return {
    id: Math.random().toString(36).slice(2),
    titulo: 'Reunião',
    diaInteiro: false,
    inicio: '2026-08-17T14:00:00-03:00',
    fim: '2026-08-17T15:00:00-03:00',
    souOrganizador: true,
    convidados: [],
    recorrente: false,
    ...over,
  };
}

describe('minutosDoDia', () => {
  it('converte para o fuso da conta, não o do servidor', () => {
    // 17:00Z é 14:00 em São Paulo → 840 min.
    expect(minutosDoDia('2026-08-17T17:00:00Z', SP)).toBe(840);
    expect(minutosDoDia('2026-08-17T17:00:00Z', 'UTC')).toBe(1020);
  });

  it('trata meia-noite como zero', () => {
    expect(minutosDoDia('2026-08-17T00:00:00-03:00', SP)).toBe(0);
  });
});

describe('diasDaSemana', () => {
  it('devolve sete dias a partir da segunda', () => {
    expect(SEMANA).toHaveLength(7);
    expect(SEMANA[0]).toBe('2026-08-17');
    expect(SEMANA[6]).toBe('2026-08-23');
  });
});

describe('montarSemana — posicionamento', () => {
  it('coloca o evento no dia e no horário certos', () => {
    const { porDia } = montarSemana([evento()], SEMANA, SP);
    const blocos = porDia['2026-08-17'];
    expect(blocos).toHaveLength(1);
    expect(blocos[0].inicioMin).toBe(840);
    expect(blocos[0].fimMin).toBe(900);
    expect(blocos[0].colunas).toBe(1);
  });

  it('ignora evento fora da semana', () => {
    const fora = evento({ inicio: '2026-09-02T14:00:00-03:00', fim: '2026-09-02T15:00:00-03:00' });
    const { porDia } = montarSemana([fora], SEMANA, SP);
    expect(Object.values(porDia).flat()).toHaveLength(0);
  });

  it('dá duração mínima a evento relâmpago, para dar para clicar', () => {
    const curto = evento({
      inicio: '2026-08-17T14:00:00-03:00',
      fim: '2026-08-17T14:05:00-03:00',
    });
    const bloco = montarSemana([curto], SEMANA, SP).porDia['2026-08-17'][0];
    expect(bloco.fimMin - bloco.inicioMin).toBeGreaterThanOrEqual(20);
  });
});

describe('montarSemana — sobreposição', () => {
  it('divide a largura entre dois eventos no mesmo horário', () => {
    const a = evento({ inicio: '2026-08-17T14:00:00-03:00', fim: '2026-08-17T15:00:00-03:00' });
    const b = evento({ inicio: '2026-08-17T14:30:00-03:00', fim: '2026-08-17T15:30:00-03:00' });
    const blocos = montarSemana([a, b], SEMANA, SP).porDia['2026-08-17'];

    expect(blocos.every(x => x.colunas === 2)).toBe(true);
    expect(new Set(blocos.map(x => x.coluna))).toEqual(new Set([0, 1]));
  });

  it('não divide quando um termina antes do outro começar', () => {
    const a = evento({ inicio: '2026-08-17T09:00:00-03:00', fim: '2026-08-17T10:00:00-03:00' });
    const b = evento({ inicio: '2026-08-17T10:00:00-03:00', fim: '2026-08-17T11:00:00-03:00' });
    const blocos = montarSemana([a, b], SEMANA, SP).porDia['2026-08-17'];
    expect(blocos.every(x => x.colunas === 1)).toBe(true);
  });

  it('reaproveita a coluna livre em vez de somar largura à toa', () => {
    // A 09–12 · B 09–10 · C 10:30–11 → C cabe na coluna que B liberou.
    const a = evento({ inicio: '2026-08-17T09:00:00-03:00', fim: '2026-08-17T12:00:00-03:00' });
    const b = evento({ inicio: '2026-08-17T09:00:00-03:00', fim: '2026-08-17T10:00:00-03:00' });
    const c = evento({ inicio: '2026-08-17T10:30:00-03:00', fim: '2026-08-17T11:00:00-03:00' });
    const blocos = montarSemana([a, b, c], SEMANA, SP).porDia['2026-08-17'];

    expect(blocos.every(x => x.colunas === 2)).toBe(true);
    const porId = new Map(blocos.map(x => [x.evento.id, x]));
    expect(porId.get(b.id)!.coluna).toBe(porId.get(c.id)!.coluna);
    expect(porId.get(a.id)!.coluna).not.toBe(porId.get(b.id)!.coluna);
  });

  it('três simultâneos viram três colunas', () => {
    const eventos = [0, 1, 2].map(i =>
      evento({
        inicio: `2026-08-17T14:0${i}:00-03:00`,
        fim: '2026-08-17T16:00:00-03:00',
      }),
    );
    const blocos = montarSemana(eventos, SEMANA, SP).porDia['2026-08-17'];
    expect(blocos.every(x => x.colunas === 3)).toBe(true);
  });

  it('sobreposições em dias diferentes não se misturam', () => {
    const seg = evento({ inicio: '2026-08-17T14:00:00-03:00', fim: '2026-08-17T15:00:00-03:00' });
    const ter = evento({ inicio: '2026-08-18T14:00:00-03:00', fim: '2026-08-18T15:00:00-03:00' });
    const { porDia } = montarSemana([seg, ter], SEMANA, SP);
    expect(porDia['2026-08-17'][0].colunas).toBe(1);
    expect(porDia['2026-08-18'][0].colunas).toBe(1);
  });
});

describe('montarSemana — virada de meia-noite', () => {
  it('quebra em um bloco por dia', () => {
    const madrugada = evento({
      inicio: '2026-08-17T22:00:00-03:00',
      fim: '2026-08-18T02:00:00-03:00',
    });
    const { porDia } = montarSemana([madrugada], SEMANA, SP);

    const seg = porDia['2026-08-17'][0];
    expect(seg.inicioMin).toBe(1320);
    expect(seg.fimMin).toBe(1440);
    expect(seg.continuaDepois).toBe(true);

    const ter = porDia['2026-08-18'][0];
    expect(ter.inicioMin).toBe(0);
    expect(ter.fimMin).toBe(120);
    expect(ter.continuaAntes).toBe(true);
  });

  it('evento que acaba às 00:00 não vaza para o dia seguinte', () => {
    const ateMeiaNoite = evento({
      inicio: '2026-08-17T22:00:00-03:00',
      fim: '2026-08-18T00:00:00-03:00',
    });
    const { porDia } = montarSemana([ateMeiaNoite], SEMANA, SP);
    expect(porDia['2026-08-17']).toHaveLength(1);
    expect(porDia['2026-08-18']).toHaveLength(0);
  });
});

describe('montarSemana — dia inteiro', () => {
  it('vai para a faixa do topo, não para a grade', () => {
    const feriado = evento({ diaInteiro: true, inicio: '2026-08-19', fim: '2026-08-19' });
    const { porDia, diaInteiroPorDia } = montarSemana([feriado], SEMANA, SP);
    expect(diaInteiroPorDia['2026-08-19']).toHaveLength(1);
    expect(porDia['2026-08-19']).toHaveLength(0);
  });

  it('aparece em todos os dias que cobre', () => {
    const viagem = evento({ diaInteiro: true, inicio: '2026-08-18', fim: '2026-08-20' });
    const { diaInteiroPorDia } = montarSemana([viagem], SEMANA, SP);
    expect(diaInteiroPorDia['2026-08-18']).toHaveLength(1);
    expect(diaInteiroPorDia['2026-08-19']).toHaveLength(1);
    expect(diaInteiroPorDia['2026-08-20']).toHaveLength(1);
    expect(diaInteiroPorDia['2026-08-21']).toHaveLength(0);
  });
});

describe('faixa de horas', () => {
  it('usa o intervalo dos eventos', () => {
    const cedo = evento({ inicio: '2026-08-17T07:30:00-03:00', fim: '2026-08-17T08:00:00-03:00' });
    const tarde = evento({ inicio: '2026-08-19T20:00:00-03:00', fim: '2026-08-19T21:00:00-03:00' });
    const { primeiraHora, ultimaHora } = montarSemana([cedo, tarde], SEMANA, SP);
    expect(primeiraHora).toBe(7);
    expect(ultimaHora).toBe(21);
  });

  it('cai num horário comercial quando a semana está vazia', () => {
    const { primeiraHora, ultimaHora } = montarSemana([], SEMANA, SP);
    expect(primeiraHora).toBe(8);
    expect(ultimaHora).toBe(18);
  });
});

describe('rótulos', () => {
  it('monta o cabeçalho da coluna', () => {
    expect(rotuloColuna('2026-08-17')).toEqual({ semana: 'seg', numero: '17' });
  });

  it('mostra o mês uma vez quando a semana não vira', () => {
    expect(rotuloDaSemana('2026-08-17')).toBe('17 – 23 de agosto');
  });

  it('mostra os dois meses quando a semana vira', () => {
    expect(rotuloDaSemana('2026-08-31')).toBe('31 de ago – 6 de set');
  });
});
