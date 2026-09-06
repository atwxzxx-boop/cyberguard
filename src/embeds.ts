import { EmbedBuilder, GuildMember, User } from 'discord.js';
import { config } from './config';

const colors = {
  primary: config.accentColor,
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xfaa61a,
  neutral: 0x99aab5,
};

export function createSupportPanelEmbed() {
  const brandName = config.serverName || 'Support Center';
  const footerText = `${brandName} Support`;

  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(`${brandName}`)
    .setDescription(`**"Inspired by Nature. Driven by Innovation."**`)
    .addFields(
      {
        name: '🎫 Open a Ticket',
        value: 'Click the button below to create a private support channel for your issue.',
        inline: false,
      },
      {
        name: '📋 Before You Submit',
        value:
          '• Include your username and a clear summary\n• Add screenshots or logs when needed\n• Keep your request concise but detailed',
        inline: false,
      },
      {
        name: '✅ What Happens Next?',
        value: 'A staff member will review your ticket and respond in your private channel.',
        inline: false,
      }
    )
    .setFooter({ text: `${footerText} • Response times may vary` })
    .setTimestamp();

  if (config.logoUrl) {
    embed.setThumbnail(config.logoUrl);
  }

  return embed;
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
  return new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('✅ Support Ticket Created')
    .setDescription(`Thanks for contacting ${config.serverName || 'Support'} — your request is now in progress.`)
    .addFields(
      {
        name: 'Ticket ID',
        value: `#${ticketNumber}`,
        inline: true,
      },
      {
        name: 'Status',
        value: 'Awaiting staff review',
        inline: true,
      },
      {
        name: 'Important',
        value: 'Please describe your issue clearly and provide any relevant details or screenshots.',
        inline: false,
      }
    )
    .setFooter({ text: `${config.serverName || 'Support Center'} • We will get back to you soon` })
    .setTimestamp();
}

export function createTicketCloseEmbed(user: User, closedBy: GuildMember | User) {
  return new EmbedBuilder()
    .setColor(colors.danger)
    .setTitle('🔒 Ticket Closed')
    .setDescription(`This ticket was closed by ${closedBy instanceof User ? closedBy.tag : closedBy.user.tag}.`)
    .addFields(
      {
        name: 'Opened By',
        value: user.tag,
        inline: true,
      },
      {
        name: 'Closed By',
        value: closedBy instanceof User ? closedBy.tag : closedBy.user.tag,
        inline: true,
      }
    )
    .setTimestamp();
}

export function createStaffLogEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setColor(colors.neutral)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

export function createErrorEmbed(message: string) {
  return new EmbedBuilder()
    .setColor(colors.danger)
    .setTitle('❌ Action Failed')
    .setDescription(message);
}

export function createSuccessEmbed(message: string) {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTitle('✅ Success')
    .setDescription(message);
}
