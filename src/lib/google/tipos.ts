/**
 * Só os campos da Google Calendar API v3 que o Folga realmente usa.
 *
 * Declarados à mão de propósito: puxar o pacote `googleapis` (ou até o
 * `@googleapis/calendar`) traria quatro dependências transitivas para tipar
 * seis endpoints. Aqui o custo é este arquivo.
 */

export interface DataHoraGoogle {
  /** 'YYYY-MM-DD' — presente só em evento de dia inteiro. */
  date?: string;
  /** RFC3339. Na escrita mandamos sem offset, com `timeZone` ao lado. */
  dateTime?: string;
  timeZone?: string;
}

export interface ConvidadoGoogle {
  email?: string;
  displayName?: string;
  optional?: boolean;
  organizer?: boolean;
  /** true no convidado que é a conta conectada. */
  self?: boolean;
  responseStatus?: string; // needsAction | declined | tentative | accepted
  comment?: string;
}

export interface EventoGoogle {
  id?: string;
  status?: string; // confirmed | tentative | cancelled
  htmlLink?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: DataHoraGoogle;
  end?: DataHoraGoogle;
  attendees?: ConvidadoGoogle[];
  organizer?: { email?: string; displayName?: string; self?: boolean };
  creator?: { email?: string; self?: boolean };
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[];
    createRequest?: { requestId?: string; status?: { statusCode?: string } };
  };
  recurringEventId?: string;
  recurrence?: string[];
}

export interface ListaEventosGoogle {
  items?: EventoGoogle[];
  nextPageToken?: string;
  timeZone?: string;
}

/** Resposta do endpoint de token (oauth2.googleapis.com/token). */
export interface TokensGoogle {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
}
