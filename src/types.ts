export type TicketStatus = 'open' | 'closed';

export type TicketRecord = {
  id: string;
  ticketNumber: number;
  ownerId: string;
  ownerTag: string;
  channelId: string;
  guildId: string;
  status: TicketStatus;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
};

export type BotBranding = {
  serverName: string;
  accentColor: number;
  logoUrl?: string;
};
