import dotenv from 'dotenv';

dotenv.config();

function parseAccentColor(value: string | undefined) {
  const safeValue = value?.trim() || '5865F2';

  if (safeValue.startsWith('#')) {
    return Number.parseInt(safeValue.slice(1), 16);
  }

  if (safeValue.startsWith('0x') || safeValue.startsWith('0X')) {
    return Number.parseInt(safeValue.slice(2), 16);
  }

  const normalized = safeValue.length === 6 ? safeValue : safeValue.replace(/[^0-9a-fA-F]/g, '');
  return Number.parseInt(normalized, 16) || 0x5865f2;
}

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',
  staffRoleId: process.env.STAFF_ROLE_ID || '',
  ticketsCategoryId: process.env.TICKETS_CATEGORY_ID || '',
  generalSupportCategoryId: process.env.GENERAL_SUPPORT_CATEGORY_ID || '',
  networkAssistanceCategoryId: process.env.NETWORK_ASSISTANCE_CATEGORY_ID || '',
  hrShrCategoryId: process.env.HR_SHR_CATEGORY_ID || '',
  verifiedRoleId: process.env.VERIFIED_ROLE_ID || '',
  altAccountDays: Number(process.env.ALT_ACCOUNT_DAYS || 7),
  raidJoinThreshold: Number(process.env.RAID_JOIN_THRESHOLD || 5),
  raidWindowSeconds: Number(process.env.RAID_WINDOW_SECONDS || 20),
  antiNukeThreshold: Number(process.env.ANTI_NUKE_THRESHOLD || 3),
  logChannelId: process.env.LOG_CHANNEL_ID || '',
  serverName: process.env.SERVER_NAME || 'Support Center',
  accentColor: parseAccentColor(process.env.ACCENT_COLOR),
  logoUrl: process.env.LOGO_URL || '',
  securityBannerUrl: process.env.SECURITY_BANNER_URL || process.env.LOGO_URL || '',
};

export function validateConfig() {
  const required = ['token', 'clientId', 'guildId', 'staffRoleId', 'ticketsCategoryId'];
  const missingRequired = required.filter((key) => !config[key as keyof typeof config]);

  if (missingRequired.length > 0) {
    throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
  }
}
