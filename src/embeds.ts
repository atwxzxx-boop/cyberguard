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
    if (config.logoUrl.startsWith('http://') || config.logoUrl.startsWith('https://')) {
      embed.setThumbnail(config.logoUrl);
    }
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
        inline: true,
      },
      {
        name: '🌐 Network Assistance',
        value: 'Connectivity, access, network, and technical assistance.',
        inline: true,
      },
      {
        name: '👥 HR / SHR',
        value: 'Private people-support requests handled by the HR / SHR team.',
        inline: true,
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
        inline: true,
      },
      {
        name: '⚡ Automated Response',
        value: 'Suspicious content is removed, dangerous accounts can be blocked, raid bursts trigger containment, and destructive audit activity can activate lockdown.',
        inline: true,
      },
      {
        name: '🔐 Staff Controls',
        value: '`/security status`  •  `/security scan`  •  `/security lockdown`  •  `/security unlock`  •  `/security globalban`  •  `/security globalunban`',
        inline: true,
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
      { name: 'Account', value: `${user.tag}\nID: ${user.id}`, inline: true },
      { name: 'Reason', value: reason, inline: true },
      { name: 'Servers updated', value: `${affectedServers}`, inline: true },
      { name: 'Next step', value: 'Contact the server owner if you believe this action was made in error.', inline: false },
    ), 'Global Enforcement');

  if (config.securityBannerUrl.startsWith('http')) {
    embed.setImage(config.securityBannerUrl);
  }

  return embed;
}

export function createGlobalBanListEmbed(entries: Array<{ tag: string; userId: string; reason: string; createdAt: number }>) {
  const preview = entries.slice(-10).reverse();
  const value = preview.length > 0
    ? preview.map((entry) => `• **${entry.tag}** \`${entry.userId}\`\n  ${entry.reason} • <t:${Math.floor(entry.createdAt / 1000)}:R>`).join('\n')
    : 'The CyberGuard global blocklist is currently empty.';

  return applyBranding(new EmbedBuilder()
    .setColor(colors.neutral)
    .setAuthor({ name: `${brandName()} Global Trust & Safety` })
    .setTitle('🌐 Global Blocklist')
    .setDescription('Accounts listed here are blocked from participating CyberGuard servers where ban permissions are available.')
    .addFields(
      { name: 'Active blocks', value: `${entries.length}`, inline: true },
      { name: 'Displayed', value: `${preview.length}`, inline: true },
      { name: 'Policy', value: 'Staff-managed', inline: true },
      { name: 'Recent entries', value, inline: false },
    ), 'Global Enforcement');
}

export function createGlobalBanRemovedEmbed(user: User, removedServers: number) {
  return applyBranding(new EmbedBuilder()
    .setColor(colors.success)
    .setAuthor({ name: `${brandName()} Global Trust & Safety` })
    .setTitle('✅ Global Block Removed')
    .setDescription(`${user.tag} was removed from the CyberGuard global blocklist.`)
    .addFields(
      { name: 'Account', value: `${user.tag}\n\`${user.id}\``, inline: true },
      { name: 'Servers updated', value: `${removedServers}`, inline: true },
      { name: 'Status', value: 'Eligible to rejoin participating servers', inline: false },
    ), 'Global Enforcement');
}

export function createServerUpdateEmbed(inviteLink: string) {
  return applyBranding(new EmbedBuilder()
    .setColor(colors.primary)
    .setAuthor({ name: `${brandName()} Private Server Updates` })
    .setTitle('📡 Server Update Channel')
    .setDescription('This private channel contains the configured server invite link for authorized CyberGuard staff.')
    .addFields(
      { name: 'Server invite', value: inviteLink, inline: true },
      { name: 'Access policy', value: 'CyberGuard Staff only', inline: true },
    ), 'Server Configuration');
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
    .setTitle('⛔ CyberGuard access denied')
    .setDescription(message), 'System Message');
}

export function createSuccessEmbed(message: string) {
  return applyBranding(new EmbedBuilder()
    .setColor(colors.success)
    .setTitle('✅ Completed successfully')
    .setDescription(message), 'System Message');
}
