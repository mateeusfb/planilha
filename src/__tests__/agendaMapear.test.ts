import { describe, it, expect } from 'vitest';
import {
  agruparPorDia,
  corpoDeAtualizacao,
  corpoDeCriacao,
  corpoDeRsvp,
  ehConvitePendente,
  mapearEvento,
  mesclarConvidados,
  validarEntradaEvento,
} from '@/lib/google/mapear';
import type { EventoGoogle } from '@/lib/google/tipos';
import type { AgendaEvento, EntradaEvento } from '@/lib/types';

function eventoGoogle(overrides: Partial<EventoGoogle> = {}): EventoGoogle {
  return {
    id: 'evt-1',
    status: 'confirmed',
    summary: 'Reunião',
    start: { dateTime: '2026-08-25T14:00:00-03:00', timeZone: 'America/Sao_Paulo' },
    end: { dateTime: '2026-08-25T15:00:00-03:00', timeZone: 'America/Sao_Paulo' },
    ...overrides,
  };
}

function entrada(overrides: Partial<EntradaEvento> = {}): EntradaEvento {
  return {
    titulo: 'Reunião',
    inicio: '2026-08-25T14:00',
    fim: '2026-08-25T15:00',
    fuso: 'America/Sao_Paulo',
    ...overrides,
  };
}

describe('mapearEvento', () => {
  it('mapeia um evento com hora', () => {
    const e = mapearEvento(eventoGoogle());
    expect(e.diaInteiro).toBe(false);
    expect(e.titulo).toBe('Reunião');
    expect(e.inicio).toBe('2026-08-25T14:00:00-03:00');
    expect(e.convidados).toEqual([]);
  });

  it('desfaz o fim exclusivo do dia inteiro', () => {
    const e = mapearEvento(
      eventoGoogle({ start: { date: '2026-08-25' }, end: { date: '2026-08-26' } }),
    );
    expect(e.diaInteiro).toBe(true);
    expect(e.inicio).toBe('2026-08-25');
    // O Google diz 26; para o usuário o evento termina no dia 25.
    expect(e.fim).toBe('2026-08-25');
  });

  it('marca ocorrência de evento recorrente', () => {
    expect(mapearEvento(eventoGoogle({ recurringEventId: 'serie-1' })).recorrente).toBe(true);
    expect(mapearEvento(eventoGoogle()).recorrente).toBe(false);
  });

  it('reconhece o organizador pelo self', () => {
    expect(mapearEvento(eventoGoogle({ organizer: { email: 'eu@x.com', self: true } })).souOrganizador).toBe(true);
    expect(mapearEvento(eventoGoogle({ organizer: { email: 'outro@x.com' } })).souOrganizador).toBe(false);
  });

  it('extrai a minha resposta do convidado self', () => {
    const e = mapearEvento(
      eventoGoogle({
        attendees: [
          { email: 'org@x.com', organizer: true, responseStatus: 'accepted' },
          { email: 'eu@x.com', self: true, responseStatus: 'tentative' },
        ],
      }),
    );
    expect(e.minhaResposta).toBe('tentative');
    expect(e.convidados).toHaveLength(2);
  });

  it('trata responseStatus desconhecido como sem resposta', () => {
    const e = mapearEvento(eventoGoogle({ attendees: [{ email: 'a@x.com', responseStatus: 'zzz' }] }));
    expect(e.convidados[0].resposta).toBe('needsAction');
  });

  it('acha o link do Meet no hangoutLink ou no conferenceData', () => {
    expect(mapearEvento(eventoGoogle({ hangoutLink: 'https://meet/abc' })).linkMeet).toBe('https://meet/abc');
    expect(
      mapearEvento(
        eventoGoogle({
          conferenceData: { entryPoints: [{ entryPointType: 'video', uri: 'https://meet/xyz' }] },
        }),
      ).linkMeet,
    ).toBe('https://meet/xyz');
  });

  it('não deixa o título vazio', () => {
    expect(mapearEvento(eventoGoogle({ summary: '   ' })).titulo).toBe('(sem título)');
  });
});

describe('ehConvitePendente', () => {
  const base: AgendaEvento = {
    id: '1', titulo: 'x', diaInteiro: false, inicio: '', fim: '',
    souOrganizador: false, convidados: [], recorrente: false,
  };

  it('é pendente quando sou convidado e não respondi', () => {
    expect(ehConvitePendente({ ...base, minhaResposta: 'needsAction' })).toBe(true);
  });

  it('não é pendente se já respondi', () => {
    expect(ehConvitePendente({ ...base, minhaResposta: 'accepted' })).toBe(false);
  });

  it('não é pendente no meu próprio evento', () => {
    expect(ehConvitePendente({ ...base, souOrganizador: true, minhaResposta: 'needsAction' })).toBe(false);
  });
});

describe('agruparPorDia', () => {
  it('agrupa e ordena por dia', () => {
    const eventos = [
      { id: 'b', inicio: '2026-08-26' },
      { id: 'a', inicio: '2026-08-25' },
      { id: 'c', inicio: '2026-08-25' },
    ] as AgendaEvento[];

    const grupos = agruparPorDia(eventos, e => e.inicio);
    expect(grupos.map(g => g.dia)).toEqual(['2026-08-25', '2026-08-26']);
    expect(grupos[0].eventos.map(e => e.id)).toEqual(['a', 'c']);
  });
});

describe('validarEntradaEvento', () => {
  it('aceita uma entrada completa', () => {
    expect(validarEntradaEvento(entrada())).toBeNull();
  });

  it('exige título', () => {
    expect(validarEntradaEvento(entrada({ titulo: '  ' }))).toMatch(/título/i);
  });

  it('recusa fim antes do início', () => {
    expect(validarEntradaEvento(entrada({ fim: '2026-08-25T13:00' }))).toMatch(/depois do início/i);
  });

  it('recusa e-mail malformado', () => {
    expect(validarEntradaEvento(entrada({ convidados: [{ email: 'sem-arroba' }] }))).toMatch(/não parece válido/i);
  });

  it('recusa mais de 100 convidados', () => {
    const muitos = Array.from({ length: 101 }, (_, i) => ({ email: `p${i}@x.com` }));
    expect(validarEntradaEvento(entrada({ convidados: muitos }))).toMatch(/máximo/i);
  });

  it('em dia inteiro cobra a data', () => {
    expect(validarEntradaEvento({ titulo: 'x', diaInteiro: true })).toMatch(/dia/i);
  });
});

describe('corpoDeCriacao', () => {
  it('inclui o pedido de Meet só quando foi pedido', () => {
    const com = corpoDeCriacao(entrada({ criarMeet: true }), 'folga-123');
    expect(com.conferenceData).toEqual({
      createRequest: { requestId: 'folga-123', conferenceSolutionKey: { type: 'hangoutsMeet' } },
    });

    expect('conferenceData' in corpoDeCriacao(entrada({ criarMeet: false }), 'folga-123')).toBe(false);
  });

  it('manda dateTime sem offset, com timeZone ao lado', () => {
    const corpo = corpoDeCriacao(entrada(), 'r');
    expect(corpo.start).toEqual({ dateTime: '2026-08-25T14:00:00', timeZone: 'America/Sao_Paulo' });
  });

  it('não manda attendees quando não há convidados', () => {
    expect('attendees' in corpoDeCriacao(entrada(), 'r')).toBe(false);
  });

  it('marca convidado opcional', () => {
    const corpo = corpoDeCriacao(entrada({ convidados: [{ email: 'a@x.com', opcional: true }] }), 'r');
    expect(corpo.attendees).toEqual([{ email: 'a@x.com', optional: true }]);
  });
});

describe('corpoDeAtualizacao', () => {
  it('não inclui attendees quando o campo não veio — isso zeraria a lista', () => {
    const corpo = corpoDeAtualizacao({ titulo: 'Novo título' });
    expect(corpo).toEqual({ summary: 'Novo título' });
    expect('attendees' in corpo).toBe(false);
  });

  it('inclui o período quando remarca', () => {
    const corpo = corpoDeAtualizacao({
      inicio: '2026-08-26T10:00',
      fim: '2026-08-26T11:00',
      fuso: 'America/Sao_Paulo',
    });
    expect(corpo.start).toEqual({ dateTime: '2026-08-26T10:00:00', timeZone: 'America/Sao_Paulo' });
  });

  it('substitui a lista quando os convidados vieram', () => {
    expect(corpoDeAtualizacao({ convidados: [{ email: 'a@x.com' }] }).attendees).toEqual([
      { email: 'a@x.com' },
    ]);
  });
});

describe('mesclarConvidados', () => {
  const atuais = [
    { email: 'org@x.com', organizer: true, self: true, responseStatus: 'accepted' },
    { email: 'ana@x.com', responseStatus: 'accepted' },
    { email: 'bruno@x.com', responseStatus: 'declined', optional: true },
  ];

  it('preserva a resposta de quem já tinha respondido', () => {
    const r = mesclarConvidados(atuais, [{ email: 'ana@x.com' }, { email: 'bruno@x.com' }]);
    expect(r.find(c => c.email === 'ana@x.com')?.responseStatus).toBe('accepted');
    expect(r.find(c => c.email === 'bruno@x.com')?.responseStatus).toBe('declined');
  });

  it('mantém o organizador mesmo fora da lista nova', () => {
    const r = mesclarConvidados(atuais, [{ email: 'ana@x.com' }]);
    expect(r.map(c => c.email)).toContain('org@x.com');
  });

  it('remove quem saiu da lista', () => {
    const r = mesclarConvidados(atuais, [{ email: 'ana@x.com' }]);
    expect(r.map(c => c.email)).not.toContain('bruno@x.com');
  });

  it('entra sem resposta quem é novo', () => {
    const r = mesclarConvidados(atuais, [{ email: 'novo@x.com' }]);
    expect(r.find(c => c.email === 'novo@x.com')?.responseStatus).toBeUndefined();
  });

  it('casa e-mail ignorando maiúsculas', () => {
    const r = mesclarConvidados(atuais, [{ email: 'ANA@x.com' }]);
    expect(r.find(c => c.email === 'ANA@x.com')?.responseStatus).toBe('accepted');
  });

  it('aplica o opcional vindo da lista nova', () => {
    const r = mesclarConvidados(atuais, [{ email: 'ana@x.com', opcional: true }]);
    expect(r.find(c => c.email === 'ana@x.com')?.optional).toBe(true);
  });
});

describe('corpoDeRsvp', () => {
  const comConvidados = eventoGoogle({
    attendees: [
      { email: 'org@x.com', organizer: true, responseStatus: 'accepted' },
      { email: 'eu@x.com', self: true, responseStatus: 'needsAction' },
      { email: 'outro@x.com', optional: true, responseStatus: 'declined' },
    ],
  });

  it('preserva todos os convidados e muda só o meu status', () => {
    const { attendees } = corpoDeRsvp(comConvidados, 'accepted');
    expect(attendees).toHaveLength(3);
    expect(attendees.find(a => a.email === 'eu@x.com')?.responseStatus).toBe('accepted');
    expect(attendees.find(a => a.email === 'org@x.com')?.responseStatus).toBe('accepted');
    expect(attendees.find(a => a.email === 'outro@x.com')?.responseStatus).toBe('declined');
  });

  it('mantém o flag de opcional dos outros', () => {
    const { attendees } = corpoDeRsvp(comConvidados, 'declined');
    expect(attendees.find(a => a.email === 'outro@x.com')?.optional).toBe(true);
  });

  it('leva o comentário só no meu registro', () => {
    const { attendees } = corpoDeRsvp(comConvidados, 'declined', 'Conflito de agenda');
    expect(attendees.find(a => a.email === 'eu@x.com')?.comment).toBe('Conflito de agenda');
    expect(attendees.find(a => a.email === 'org@x.com')?.comment).toBeUndefined();
  });

  it('reclama quando não sou convidado', () => {
    expect(() => corpoDeRsvp(eventoGoogle(), 'accepted')).toThrow('NAO_SOU_CONVIDADO');
  });
});
