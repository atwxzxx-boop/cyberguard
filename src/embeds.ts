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
  return applyBranding(new EmbedBuilder()
    .setColor(colors.primary)
    .setAuthor({ name: `${brandName()} Support Portal` })
    .setTitle('How can we help?')
    .setDescription('Private, organized support for questions, reports, and account assistance.')
    .addFields(
      {
        name: '🎫 Request support',
        value: 'Choose the support queue that best matches your request. Your private ticket will be routed automatically.',
        inline: true,
      },
      {
        name: '🛡️ Protected process',
        value: 'Your ticket is visible only to you and authorized staff members.',
        inline: true,
      },
      {
        name: 'Before you submit',
        value: 'Include a clear summary, relevant screenshots or logs, and any useful IDs. One issue per ticket helps us respond faster.',
        inline: false,
      }
    )
    .setColor(colors.primary), 'Support Portal');
}

export function createSecurityPanelEmbed() {
  const brandName = config.serverName || 'Security Operations';

  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(`🛡️ ${brandName} Security Operations`)
    .setDescription('**Active protection against scam messages, compromised accounts, and coordinated spam.**')
    .addFields(
      {
        name: '🧠 Detection Layer',
        value: 'Analyzes high-risk scam language, fake verification prompts, malicious invitations, mass mentions, and spam behavior.',
        inline: false,
      },
      {
        name: '⚡ Automated Response',
        value: 'Suspicious messages are removed, evidence is logged, and accounts that meet the security threshold are banned.',
        inline: false,
      },
      {
        name: '🔐 Staff Controls',
        value: '`/security status`  •  `/security scan`  •  `/security allow`  •  `/security remove`  •  `/security ban`',
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

  if (config.logoUrl) {
    embed.setThumbnail(config.logoUrl);
  }

  return embed;
}

export function createTicketOpenedEmbed(user: User, ticketNumber: number) {
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
