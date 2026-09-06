import fs from 'node:fs/promises';
import path from 'node:path';
import type { TicketRecord } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'tickets.json');
const TRANSCRIPTS_DIR = path.join(process.cwd(), 'data', 'transcripts');

type SecurityState = {
  trustedUserIds: string[];
  globalBans: Array<{ userId: string; tag: string; reason: string; createdAt: number }>;
  guildSecurity: Record<string, { staffRoleId: string; logChannelId: string; blacklistChannelId: string; raidAlertsChannelId: string; configPinHash?: string }>;
};

async function ensureDatabase() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });

  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ tickets: [] }, null, 2), 'utf8');
  }
}

async function ensureTranscriptDirectory() {
  await fs.mkdir(TRANSCRIPTS_DIR, { recursive: true });
}

export async function loadTickets(): Promise<TicketRecord[]> {
  await ensureDatabase();

  const raw = await fs.readFile(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{"tickets":[]}');
  return Array.isArray(parsed.tickets) ? parsed.tickets : [];
}

export async function saveTicket(ticket: TicketRecord) {
  const tickets = await loadTickets();
  const index = tickets.findIndex((item) => item.id === ticket.id);

  if (index >= 0) {
    tickets[index] = ticket;
  } else {
    tickets.push(ticket);
  }

  await fs.writeFile(DB_PATH, JSON.stringify({ tickets }, null, 2), 'utf8');
}

export async function findTicketByChannelId(channelId: string) {
  const tickets = await loadTickets();
  return tickets.find((ticket) => ticket.channelId === channelId) ?? null;
}

export async function updateTicketStatus(channelId: string, status: 'open' | 'closed') {
  const tickets = await loadTickets();
  const index = tickets.findIndex((ticket) => ticket.channelId === channelId);

  if (index === -1) return null;

  tickets[index] = {
    ...tickets[index],
    status,
    closedAt: status === 'closed' ? Date.now() : null,
    updatedAt: Date.now(),
  };

  await fs.writeFile(DB_PATH, JSON.stringify({ tickets }, null, 2), 'utf8');
  return tickets[index];
}

export async function saveTranscript(ticketId: string, content: string) {
  await ensureTranscriptDirectory();
  const transcriptPath = path.join(TRANSCRIPTS_DIR, `${ticketId}.txt`);
  await fs.writeFile(transcriptPath, content, 'utf8');
  return transcriptPath;
}

export async function loadTrustedUserIds(): Promise<string[]> {
  await ensureDatabase();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{}') as SecurityState;
  return Array.isArray(parsed.trustedUserIds) ? parsed.trustedUserIds : [];
}

export async function saveTrustedUserIds(userIds: Iterable<string>) {
  await ensureDatabase();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{}') as Record<string, unknown>;
  parsed.trustedUserIds = [...new Set(userIds)];
  await fs.writeFile(DB_PATH, JSON.stringify(parsed, null, 2), 'utf8');
}

export async function loadGlobalBans(): Promise<SecurityState['globalBans']> {
  await ensureDatabase();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{}') as SecurityState;
  return Array.isArray(parsed.globalBans) ? parsed.globalBans : [];
}

export async function saveGlobalBans(globalBans: SecurityState['globalBans']) {
  await ensureDatabase();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{}') as Record<string, unknown>;
  parsed.globalBans = globalBans;
  await fs.writeFile(DB_PATH, JSON.stringify(parsed, null, 2), 'utf8');
}

export async function loadGuildSecurity() {
  await ensureDatabase();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{}') as SecurityState;
  return parsed.guildSecurity ?? {};
}

export async function saveGuildSecurity(guildSecurity: SecurityState['guildSecurity']) {
  await ensureDatabase();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{}') as Record<string, unknown>;
  parsed.guildSecurity = guildSecurity;
  await fs.writeFile(DB_PATH, JSON.stringify(parsed, null, 2), 'utf8');
}
