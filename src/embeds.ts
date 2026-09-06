import { EmbedBuilder, GuildMember, User } from 'discord.js';
import { config } from './config';

const colors = {
  primary: config.accentColor,
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xfaa61a,
  neutral: 0x99aab5,
};

const brandName = () => config.serverName || 'CyberGuard';

function applyBranding(embed: EmbedBuilder, footer = 'CyberGuard Security Operations') {
  embed.setFooter({ text: `${brandName()} • ${footer}` }).setTimestamp();

  if (config.logoUrl) {
    embed.setThumbnail(config.logoUrl);
  }

  return embed;
}

export function createSupportPanelEmbed() {
  const embed = applyBranding(new EmbedBuilder()
    .setColor(colors.primary)
    .setAuthor({ name: `${brandName()} Security & Support` })
    .setTitle('Support Command Center')
    .setDescription('CyberGuard protects this server while giving you a direct line to the right support team. Select a queue below to open a private case.')
    .addFields(
      {
        name: '🎫 General Support',
        value: 'Questions, reports, account help, and everyday assistance.',
        inline: false,
      },
      {
        name: '🌐 Network Assistance',
        value: 'Connectivity, access, network, and technical assistance.',
        inline: false,
      },
      {
        name: '👥 HR / SHR',
        value: 'Private people-support requests handled by the HR / SHR team.',
        inline: false,
      },
      {
        name: '🛡️ Before you open a case',
        value: 'Share a clear summary, relevant screenshots or logs, and useful IDs. One issue per ticket helps us respond faster.',
        inline: false,
      }
    ), 'Support Command Center');

  if (config.securityBannerUrl.startsWith('http')) {
    embed.setImage(config.securityBannerUrl);
  }

  return embed;
}

export function createSecurityPanelEmbed() {
  const brandName = config.serverName || 'Security Operations';

  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(`🛡️ ${brandName} Security Operations`)
    .setDescription('**CyberGuard monitors this server continuously and responds to coordinated threats before they spread.**')
    .addFields(
      {
        name: '🧠 Threat Detection',
        value: 'Scam and fake-verification detection, anti-spam controls, suspicious account review, raid burst detection, and persistent global blocklist enforcement.',
        inline: false,
      },
      {
        name: '⚡ Automated Response',
        value: 'Suspicious content is removed, dangerous accounts can be blocked, raid bursts trigger containment, and destructive audit activity can activate lockdown.',
        inline: false,
      },
      {
        name: '🔐 Staff Controls',
        value: '`/security status`  •  `/security scan`  •  `/security lockdown`  •  `/security unlock`  •  `/security globalban`  •  `/security globalunban`',
        inline: false,
      },
      {
        name: '📡 Operational Requirements',
        value: 'The bot needs Message Content, View Audit Log, Manage Messages, and Ban Members permissions. Review security logs after every automated action.',
        inline: false,
      },
    )
    .setFooter({ text: `${brandName} • Security Operations Center` })
    .setTimestamp();

  if (config.securityBannerUrl.startsWith('http')) {
    embed.setImage(config.securityBannerUrl);
  }

  return embed;
}

export function createGlobalBanEmbed(user: User, reason: string, affectedServers: number) {
  const embed = applyBranding(new EmbedBuilder()
    .setColor(colors.danger)
    .setAuthor({ name: `${brandName()} Global Trust & Safety` })
    .setTitle('🌐 Global Security Block')
    .setDescription('This account has been placed on the CyberGuard global security blocklist.')
    .addFields(
      { name: 'Account', value: `${user.tag}\nID: ${user.id}`, inline: false },
      { name: 'Reason', value: reason, inline: true },
      { name: 'Servers updated', value: `${affectedServers}`, inline: true },
      { name: 'What happens next', value: 'CyberGuard will prevent this account from joining participating servers. Contact the server owner if you believe this action was made in error.', inline: false },
    ), 'Global Enforcement');

  if (config.securityBannerUrl.startsWith('http')) {
    embed.setImage(config.securityBannerUrl);
  }

  return embed;
}

export function createTicketOpenedEmbed(user: User, ticketNumber: number, ticketType = 'General Support') {
  return applyBranding(new EmbedBuilder()
    .setColor(colors.primary)
    .setAuthor({ name: `${brandName()} Support` })
    .setTitle('✅ Ticket received')
    .setDescription(`Welcome, ${user}. Your private support workspace is ready. A team member will review your request as soon as possible.`)
    .addFields(
      {
        name: 'Ticket reference',
        value: `#${ticketNumber}`,
        inline: true,
      },
      {
        name: 'Support queue',
        value: ticketType,
        inline: true,
      },
      {
        name: 'Current status',
        value: 'Awaiting review',
        inline: true,
      },
      {
        name: 'Next step',
        value: 'Describe the issue clearly, then remain available for staff questions. Please do not open duplicate tickets.',
        inline: false,
      }
    )
    .setColor(colors.primary), 'Ticketing System');
}

export function createTicketCloseEmbed(user: User, closedBy: GuildMember | User) {
  return applyBranding(new EmbedBuilder()
    .setColor(colors.danger)
    .setAuthor({ name: `${brandName()} Support` })
    .setTitle('🔒 Ticket closed')
    .setDescription('This support request has been closed and its transcript has been prepared for the staff record.')
    .addFields(
      {
        name: 'Opened by',
        value: user.tag,
        inline: true,
      },
      {
        name: 'Closed by',
        value: closedBy instanceof User ? closedBy.tag : closedBy.user.tag,
        inline: true,
      },
      {
        name: 'Transcript',
        value: 'A downloadable transcript is attached below for your records.',
        inline: false,
      },
    )
    .setColor(colors.danger), 'Ticketing System');
}

export function createStaffLogEmbed(title: string, description: string) {
  return applyBranding(new EmbedBuilder()
    .setColor(colors.neutral)
    .setAuthor({ name: `${brandName()} Audit Log` })
    .setTitle(`📋 ${title}`)
    .setDescription(description)
    .setColor(colors.neutral), 'Audit Trail');
}

export function createErrorEmbed(message: string) {
  return applyBranding(new EmbedBuilder()
    .setColor(colors.danger)
    .setTitle('❌ Action unavailable')
    .setDescription(message), 'System Message');
}

export function createSuccessEmbed(message: string) {
  return applyBranding(new EmbedBuilder()
    .setColor(colors.success)
    .setTitle('✅ Completed successfully')
    .setDescription(message), 'System Message');
}
