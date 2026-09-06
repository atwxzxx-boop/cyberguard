import {
  Client,
  GatewayIntentBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  Collection,
  GuildMember,
  TextChannel,
  AttachmentBuilder,
  EmbedBuilder,
  Message,
  AuditLogEvent,
  Guild,
} from 'discord.js';
import { config, validateConfig } from './config';
import { loadGlobalBans, loadGuildSecurity, loadTickets, loadTrustedUserIds, saveGlobalBans, saveGuildSecurity, saveTicket, saveTranscript, saveTrustedUserIds, updateTicketStatus } from './db';
import {
  createSupportPanelEmbed,
  createSecurityPanelEmbed,
  createGlobalBanEmbed,
  createTicketOpenedEmbed,
  createTicketCloseEmbed,
  createStaffLogEmbed,
  createSuccessEmbed,
  createErrorEmbed,
} from './embeds';

validateConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

const ticketCounter = new Collection<string, number>();
const trustedUsers = new Set<string>();
const globalBans = new Map<string, { userId: string; tag: string; reason: string; createdAt: number }>();
const joinWindows = new Map<string, number[]>();
const spamWindows = new Map<string, number[]>();
const destructiveActions = new Map<string, number[]>();
const lockedGuilds = new Set<string>();
const guildSecurity = new Map<string, { staffRoleId: string; logChannelId: string; blacklistChannelId: string; raidAlertsChannelId: string }>();
const suspiciousPatterns = [
  /discord(?:\.gg|app\.com\/invite)\//i,
  /free\s*(?:nitro|steam|gift|reward|skins)/i,
  /claim\s*(?:your|a|free)\s*(?:nitro|reward|gift)/i,
  /verify\s*(?:your|this)\s*(?:account|discord|server)/i,
  /click\s*(?:here|now|the\s+link)/i,
  /dm\s*(?:me|us)\s*(?:for|to)\s*(?:nitro|gift|support)/i,
  /account\s*(?:suspended|disabled|security|verification)/i,
  /giveaway/i,
  /steal|crypto|wallet|restore.*account/i,
  /@everyone\s*@here/i,
];

function isTrustedUser(userId: string) {
  return trustedUsers.has(userId);
}

function isSuspiciousSecurityMessage(message: Message) {
  if (message.author.bot || !message.guild || isTrustedUser(message.author.id)) return false;

  const content = message.content.trim();
  if (!content) return false;

  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  const repeatedSpam = /(.)\1{8,}/i.test(content);
  const matchedPatterns = suspiciousPatterns.filter((pattern) => pattern.test(content)).length;
  const hasLink = /https?:\/\//i.test(content);
  const hasMassMentions = mentionCount >= 3;
  const hasUrgency = /\b(?:urgent|immediately|now|limited|last chance)\b/i.test(content);
  const riskScore = matchedPatterns + (hasLink ? 1 : 0) + (hasMassMentions ? 2 : 0) + (hasUrgency ? 1 : 0) + (repeatedSpam ? 1 : 0);

  return riskScore >= 3;
}

function recentEvents(events: Map<string, number[]>, key: string, windowMs: number) {
  const cutoff = Date.now() - windowMs;
  const current = (events.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
  current.push(Date.now());
  events.set(key, current);
  return current.length;
}

async function setGuildLockdown(guildId: string, enabled: boolean) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return 0;

  let changedChannels = 0;
  for (const channel of guild.channels.cache.values()) {
    if (!channel.isTextBased() || !('permissionOverwrites' in channel)) continue;
    try {
      if (enabled) {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }, { reason: 'CyberGuard security lockdown' });
      } else {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }, { reason: 'CyberGuard security lockdown lifted' });
      }
      changedChannels += 1;
    } catch {
      // Continue if a channel cannot be changed.
    }
  }

  if (enabled) lockedGuilds.add(guildId);
  else lockedGuilds.delete(guildId);
  return changedChannels;
}

async function monitorDestructiveAction(guild: Guild | null, auditType: AuditLogEvent, label: string) {
  if (!guild) return;

  try {
    const auditLogs = await guild.fetchAuditLogs({ type: auditType, limit: 1 });
    const entry = auditLogs.entries.first();
    const executorId = entry?.executor?.id;
    if (!executorId || executorId === client.user?.id || isTrustedUser(executorId)) return;

    const count = recentEvents(destructiveActions, `${guild.id}:${executorId}`, 30000);
    await logSecurityEvent(guild.id, '⚠️ Server Change Detected', `${label} was recorded in the audit log.`, { tag: entry.executor?.tag ?? 'Unknown', id: executorId });

    if (count >= config.antiNukeThreshold && !lockedGuilds.has(guild.id)) {
      const changedChannels = await setGuildLockdown(guild.id, true);
      await logSecurityEvent(guild.id, '🚨 Anti-Nuke Lockdown', `${count} destructive actions were detected from one executor. Public messaging was restricted across ${changedChannels} channels.`);
    }
  } catch (error) {
    console.error('Audit log security monitor failed:', error);
  }
}

async function handleVerification(interaction: Parameters<typeof client.on>[1] extends (arg: infer I) => any ? I : never) {
  if (!interaction.guild || !config.verifiedRoleId || !interaction.member || !(interaction.member instanceof GuildMember)) return;
  const role = interaction.guild.roles.cache.get(config.verifiedRoleId);
  if (!role || !interaction.member.manageable) return;

  try {
    await interaction.member.roles.add(role, 'CyberGuard verification');
    await interaction.reply({ embeds: [createSuccessEmbed('Verification complete. You now have access to the verified areas of this server.')], ephemeral: true });
  } catch {
    await interaction.reply({ embeds: [createErrorEmbed('Verification is not configured correctly. Ask a server administrator to check the verified role.')], ephemeral: true });
  }
}

async function logSecurityEvent(guildId: string, title: string, description: string, user?: { tag: string; id: string }) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const configuredLogChannelId = guildSecurity.get(guildId)?.logChannelId || config.logChannelId;
  const targetChannel = guild.channels.cache.get(configuredLogChannelId) ?? guild.channels.cache.find((channel) => channel.isTextBased() && channel.name.includes('security'));
  if (!targetChannel || !targetChannel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle(title)
    .setDescription(description)
    .addFields(
      user ? { name: 'User', value: `${user.tag} (<@${user.id}>)`, inline: false } : { name: 'User', value: 'Unknown', inline: false },
      { name: 'Server', value: guild.name, inline: true },
      { name: 'Time', value: new Date().toISOString(), inline: true }
    )
    .setTimestamp();

  await targetChannel.send({ embeds: [embed] });
}

async function provisionSecurityWorkspace(interaction: Parameters<typeof client.on>[1] extends (arg: infer I) => any ? I : never) {
  if (!interaction.guild || !(interaction.member instanceof GuildMember) || !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    await interaction.reply({ embeds: [createErrorEmbed('Only server managers can create the CyberGuard security workspace.')], ephemeral: true });
    return;
  }

  const category = interaction.options.getChannel('category', true);
  if (category.type !== ChannelType.GuildCategory) {
    await interaction.reply({ embeds: [createErrorEmbed('Please choose a server category.')], ephemeral: true });
    return;
  }

  const guild = interaction.guild;
  const staffRole = await guild.roles.create({ name: 'CyberGuard Staff', reason: 'CyberGuard security workspace setup' });
  await interaction.member.roles.add(staffRole, 'CyberGuard security workspace setup');
  const privateOverwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    { id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
  ];
  const createSecurityChannel = (name: string) => guild.channels.create({ name, type: ChannelType.GuildText, parent: category.id, permissionOverwrites: privateOverwrites });
  const [logChannel, blacklistChannel, raidAlertsChannel] = await Promise.all([
    createSecurityChannel('security-logs'),
    createSecurityChannel('blacklist'),
    createSecurityChannel('raid-alerts'),
  ]);
  const settings = { staffRoleId: staffRole.id, logChannelId: logChannel.id, blacklistChannelId: blacklistChannel.id, raidAlertsChannelId: raidAlertsChannel.id };
  guildSecurity.set(guild.id, settings);
  await saveGuildSecurity(Object.fromEntries(guildSecurity));

  await logSecurityEvent(guild.id, '🛡️ Security Workspace Created', `CyberGuard created the security workspace for ${guild.name}.`);
  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(config.accentColor).setTitle('🛡️ CyberGuard Workspace Ready').setDescription('Your server security workspace is configured. CyberGuard will use the generated staff role and channels for protection events.').addFields({ name: 'Staff role', value: `<@&${staffRole.id}>`, inline: true }, { name: 'Security logs', value: `<#${logChannel.id}>`, inline: true }, { name: 'Blacklist', value: `<#${blacklistChannel.id}>`, inline: true }, { name: 'Raid alerts', value: `<#${raidAlertsChannel.id}>`, inline: true }).setTimestamp()],
    ephemeral: true,
  });
}

async function handleSecurityBan(message: Message, reason: string) {
  if (!message.guild || !message.member) return;
  const botMember = message.guild.members.me;
  if (!botMember?.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
  if (
    message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
    (config.staffRoleId && message.member.roles.cache.has(config.staffRoleId))
  ) return;
  if (!message.member.manageable || !message.member.bannable) return;

  try {
    await message.delete();
    await message.guild.bans.create(message.author.id, {
      reason: `Security bot: ${reason}`,
      deleteMessageSeconds: 86400,
    });

    await logSecurityEvent(
      message.guild.id,
      '🚨 Compromised Account Detected',
      `A suspicious message was blocked and the account was banned automatically.`,
      { tag: message.author.tag, id: message.author.id }
    );

    try {
      await message.author.send(
        'Your Discord account was automatically banned from this server because it sent suspicious or malicious content associated with a compromised account. If this was a mistake, contact the server admin.'
      );
    } catch {
      // Ignore DM failures.
    }
  } catch (error) {
    console.error('Security auto-ban failed:', error);
  }
}

async function handleSecurityCommand(interaction: Parameters<typeof client.on>[1] extends (arg: infer I) => any ? I : never) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'security') return;

  const member = interaction.member as GuildMember | null;
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === 'setup') {
    if (interaction.options.getString('pin') !== config.securityPin) {
      await interaction.reply({ embeds: [createErrorEmbed('Invalid security PIN. The security workspace was not created.')], ephemeral: true });
      return;
    }
    await provisionSecurityWorkspace(interaction as never);
    return;
  }

  const guildSettings = interaction.guild ? guildSecurity.get(interaction.guild.id) : undefined;
  const securityStaffRoleId = guildSettings?.staffRoleId || config.staffRoleId;
  if (!member || !securityStaffRoleId || !member.roles.cache.has(securityStaffRoleId)) {
    await interaction.reply({ embeds: [createErrorEmbed('Security controls are restricted to the configured security staff role.')], ephemeral: true });
    return;
  }

  const protectedCommands = new Set(['allow', 'remove', 'ban', 'globalban', 'globalunban', 'lockdown', 'unlock']);
  if (protectedCommands.has(subcommand) && interaction.options.getString('pin') !== config.securityPin) {
    await interaction.reply({ embeds: [createErrorEmbed('Invalid security PIN. This action was not performed.')], ephemeral: true });
    return;
  }

  if (subcommand === 'panel') {
    await interaction.reply({ embeds: [createSecurityPanelEmbed()] });
    return;
  }

  if (subcommand === 'verify') {
    const verifyButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('security_verify')
        .setLabel('Verify Account')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
    );
    const embed = new EmbedBuilder()
      .setColor(config.accentColor)
      .setTitle('✅ Server Verification')
      .setDescription('Click the button below to verify your account and unlock the verified server areas.')
      .setFooter({ text: `${config.serverName} • CyberGuard Verification` })
      .setTimestamp();
    await interaction.reply({ embeds: [embed], components: [verifyButton] });
    return;
  }

  if (subcommand === 'lockdown' || subcommand === 'unlock') {
    const enabled = subcommand === 'lockdown';
    const changedChannels = await setGuildLockdown(interaction.guild?.id ?? '', enabled);
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(enabled ? 0xed4245 : 0x57f287)
        .setTitle(enabled ? '🔒 Security Lockdown Active' : '🔓 Security Lockdown Lifted')
        .setDescription(enabled ? 'Public message sending has been restricted while staff investigate the incident.' : 'Normal message sending has been restored.')
        .addFields({ name: 'Channels updated', value: `${changedChannels}`, inline: true }, { name: 'Action', value: enabled ? 'Raid containment' : 'Recovery', inline: true })
        .setTimestamp()],
      ephemeral: true,
    });
    return;
  }

  if (subcommand === 'status') {
    const guild = interaction.guild;
    const embed = new EmbedBuilder()
      .setColor(config.accentColor)
      .setTitle('🛡️ Security Status')
      .setDescription(`Protection is active for ${guild?.name ?? 'this server'}.`)
      .addFields(
        { name: 'Auto-ban', value: 'Enabled', inline: true },
        { name: 'Scam detection', value: 'Enabled', inline: true },
        { name: 'Invite filtering', value: 'Enabled', inline: true },
        { name: 'Trusted users', value: `${trustedUsers.size}`, inline: true },
        { name: 'Log channel', value: config.logChannelId ? `<#${config.logChannelId}>` : 'Not configured', inline: false },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (subcommand === 'globalstatus') {
    const embed = new EmbedBuilder()
      .setColor(config.accentColor)
      .setTitle('🌐 CyberGuard Global Blocklist')
      .setDescription('Accounts on this list are blocked from every server where CyberGuard has permission to ban.')
      .addFields(
        { name: 'Blocked accounts', value: `${globalBans.size}`, inline: true },
        { name: 'Connected servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Enforcement', value: 'Active on member join', inline: true },
      )
      .setFooter({ text: `${config.serverName} • Restricted security control` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (subcommand === 'globalban') {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'Global security block';
    const record = { userId: targetUser.id, tag: targetUser.tag, reason, createdAt: Date.now() };
    globalBans.set(targetUser.id, record);
    await saveGlobalBans([...globalBans.values()]);

    let affectedServers = 0;
    for (const guild of client.guilds.cache.values()) {
      try {
        if (guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
          await guild.members.ban(targetUser.id, { reason: `CyberGuard global block: ${reason}` });
          affectedServers += 1;
        }
      } catch {
        // Continue enforcing in other connected servers.
      }
    }

    try {
      await targetUser.send({ embeds: [createGlobalBanEmbed(targetUser, reason, affectedServers)] });
    } catch {
      console.warn(`Unable to DM globally blocked user ${targetUser.id}.`);
    }

    await logSecurityEvent(
      interaction.guild?.id ?? '',
      '🌐 Global Security Block Applied',
      `A global security block was added by ${interaction.user.tag}. Reason: ${reason}`,
      { tag: targetUser.tag, id: targetUser.id }
    );

    await interaction.reply({
      embeds: [createGlobalBanEmbed(targetUser, reason, affectedServers)],
      ephemeral: true,
    });
    return;
  }

  if (subcommand === 'globalunban') {
    const targetUser = interaction.options.getUser('user', true);
    globalBans.delete(targetUser.id);
    await saveGlobalBans([...globalBans.values()]);

    let removedServers = 0;
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.members.unban(targetUser.id, 'CyberGuard global block removed');
        removedServers += 1;
      } catch {
        // The user may not be banned in every server.
      }
    }

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('🌐 Global Security Block Removed').setDescription(`${targetUser.tag} was removed from the CyberGuard global blocklist.`).addFields({ name: 'Servers updated', value: `${removedServers}`, inline: true })],
      ephemeral: true,
    });
  }

  if (subcommand === 'allow') {
    const targetUser = interaction.options.getUser('user', true);
    trustedUsers.add(targetUser.id);
    await saveTrustedUserIds(trustedUsers);

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('✅ Trusted User Added').setDescription(`${targetUser.tag} is now trusted and exempt from security auto-bans.`)],
      ephemeral: true,
    });
    return;
  }

  if (subcommand === 'remove') {
    const targetUser = interaction.options.getUser('user', true);
    trustedUsers.delete(targetUser.id);
    await saveTrustedUserIds(trustedUsers);

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xfaa61a).setTitle('⚠️ Trusted User Removed').setDescription(`${targetUser.tag} has been removed from the trusted list.`)],
      ephemeral: true,
    });
    return;
  }

  if (subcommand === 'ban') {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'Manual security ban';

    if (!interaction.guild) {
      await interaction.reply({ embeds: [createErrorEmbed('This command can only be used in a server.')], ephemeral: true });
      return;
    }

    if (!interaction.guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      await interaction.reply({ embeds: [createErrorEmbed('I do not have permission to ban members.')], ephemeral: true });
      return;
    }

    await interaction.guild.members.ban(targetUser, { reason: `Security command: ${reason}` });
    await interaction.reply({
      embeds: [createSuccessEmbed(`${targetUser.tag} was banned for security reasons.`)],
      ephemeral: true,
    });
    return;
  }

  if (subcommand === 'scan') {
    const suspiciousMembers = interaction.guild?.members.cache.filter(
      (member: GuildMember) =>
        member.joinedTimestamp &&
        Date.now() - member.joinedTimestamp < 1000 * 60 * 60 * 24 * 7 &&
        member.user.username.toLowerCase().includes('bot') === false
    ).size ?? 0;

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.accentColor).setTitle('🧪 Security Scan').setDescription('The server is protected with automatic scam and compromised-account monitoring.').addFields({ name: 'New member check', value: `${suspiciousMembers} recent members are under review`, inline: true }, { name: 'Protection', value: 'Active', inline: true })],
      ephemeral: true,
    });
  }
}

async function getNextTicketNumber(guildId: string) {
  const existing = await loadTickets();
  const guildTickets = existing.filter((ticket) => ticket.guildId === guildId);
  const current = guildTickets.length + 1;
  ticketCounter.set(guildId, current);
  return current;
}

async function logTicketEvent(guildId: string, message: string) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const logChannel = guild.channels.cache.get(config.logChannelId);
  if (logChannel?.isTextBased()) {
    await logChannel.send({ embeds: [createStaffLogEmbed('Ticket Event', message)] });
  }
}

function isTicketChannel(channel: { type?: ChannelType; name?: string } | null | undefined): channel is TextChannel {
  return channel?.type === ChannelType.GuildText && channel.name?.startsWith('ticket-') === true;
}

function canManageTickets(member: GuildMember | null | undefined) {
  if (!(member instanceof GuildMember)) return false;
  return member.permissions.has(PermissionsBitField.Flags.ManageChannels);
}

async function handleCloseTicket(interaction: Parameters<typeof client.on>[1] extends (arg: infer I) => any ? I : never) {
  const channel = interaction.channel;
  if (!isTicketChannel(channel)) {
    await interaction.reply({
      embeds: [createErrorEmbed('This command can only be used inside a ticket channel.')],
      ephemeral: true,
    });
    return;
  }

  if (!canManageTickets(interaction.member as GuildMember | null)) {
    await interaction.reply({
      embeds: [createErrorEmbed('You need the Manage Channels permission to close tickets.')],
      ephemeral: true,
    });
    return;
  }

  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const transcript = sorted
    .map((message) => {
      const safeText = message.content || '(no message content)';
      const attachments = message.attachments.size > 0 ? `\nAttachments: ${message.attachments.map((attachment) => attachment.name || attachment.url).join(', ')}` : '';
      return `[${new Date(message.createdTimestamp).toISOString()}] ${message.author.tag}: ${safeText}${attachments}`;
    })
    .join('\n\n');

  const transcriptPath = await saveTranscript(`${channel.id}-${Date.now()}`, transcript);
  const attachment = new AttachmentBuilder(transcriptPath, {
    name: `${channel.name}-transcript.txt`,
  });

  const closeEmbed = createTicketCloseEmbed(interaction.user, interaction.member as GuildMember)
    .setTitle('🔒 Ticket Closed & Transcript Saved')
    .setDescription('This ticket was closed and a professional transcript download has been prepared.');

  await channel.send({ embeds: [closeEmbed], files: [attachment] });
  await channel.setName(`closed-${channel.name.replace('ticket-', '')}`);
  await updateTicketStatus(channel.id, 'closed');

  await interaction.reply({
    embeds: [createSuccessEmbed('Ticket closed successfully.')],
    ephemeral: true,
  });

  if (config.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor(config.accentColor)
        .setTitle('📄 Ticket Transcript Export')
        .setDescription(`Transcript for ${channel.name} was generated and attached.`)
        .addFields(
          { name: 'Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Closed By', value: interaction.user.tag, inline: true },
          { name: 'Records', value: `${sorted.length.toString()} messages`, inline: true }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed], files: [attachment] });
    }
  }

  await logTicketEvent(interaction.guild.id, `Ticket ${channel.name} was closed by ${interaction.user.tag}. Transcript saved.`);
}

async function handleTicketMemberAction(interaction: Parameters<typeof client.on>[1] extends (arg: infer I) => any ? I : never, subcommand: 'add' | 'remove') {
  const channel = interaction.channel;
  const targetUser = interaction.options.getUser('user');

  if (!isTicketChannel(channel)) {
    await interaction.reply({
      embeds: [createErrorEmbed('This command can only be used inside a valid ticket channel.')],
      ephemeral: true,
    });
    return;
  }

  if (!targetUser) {
    await interaction.reply({
      embeds: [createErrorEmbed('Please specify a valid user.')],
      ephemeral: true,
    });
    return;
  }

  if (!canManageTickets(interaction.member as GuildMember | null)) {
    await interaction.reply({
      embeds: [createErrorEmbed('You need the Manage Channels permission to manage ticket members.')],
      ephemeral: true,
    });
    return;
  }

  if (subcommand === 'add') {
    await channel.permissionOverwrites.edit(targetUser, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    await interaction.reply({
      embeds: [createSuccessEmbed(`${targetUser.tag} was added to this ticket.`)],
      ephemeral: true,
    });
    return;
  }

  await channel.permissionOverwrites.edit(targetUser, {
    ViewChannel: false,
    SendMessages: false,
    ReadMessageHistory: false,
  });

  await interaction.reply({
    embeds: [createSuccessEmbed(`${targetUser.tag} was removed from this ticket.`)],
    ephemeral: true,
  });
}

async function handleOpenTicket(
  interaction: Parameters<typeof client.on>[1] extends (arg: infer I) => any ? I : never,
  ticketType: 'general' | 'network' | 'hr-shr' = 'general'
) {
  const { guild, user } = interaction;

  if (!guild) {
    await interaction.reply({
      embeds: [createErrorEmbed('This action can only be used in a server.')],
      ephemeral: true,
    });
    return;
  }

  const categoryIds = {
    general: config.generalSupportCategoryId,
    network: config.networkAssistanceCategoryId,
    'hr-shr': config.hrShrCategoryId,
  };
  const categoryId = categoryIds[ticketType] || config.ticketsCategoryId;
  const category = guild.channels.cache.get(categoryId);
  if (category?.type !== ChannelType.GuildCategory) {
    await interaction.reply({
      embeds: [createErrorEmbed('The ticket category is not configured correctly.')],
      ephemeral: true,
    });
    return;
  }

  const ticketNumber = await getNextTicketNumber(guild.id);
  const typeSlug = ticketType === 'hr-shr' ? 'hr-shr' : ticketType;
  const typeLabel = ticketType === 'network' ? 'Network Assistance' : ticketType === 'hr-shr' ? 'HR / SHR' : 'General Support';
  const channelName = `ticket-${typeSlug}-${user.username.toLowerCase()}-${ticketNumber}`;

  const createdChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: ['ViewChannel'] },
      { id: user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
    ],
  });

  await saveTicket({
    id: `ticket-${ticketNumber}-${createdChannel.id}`,
    ticketNumber,
    ownerId: user.id,
    ownerTag: user.tag,
    channelId: createdChannel.id,
    guildId: guild.id,
    status: 'open',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    closedAt: null,
  });

  await createdChannel.send({
    content: `${user}, welcome to your support ticket. Please describe your issue and a staff member will assist soon.`,
    embeds: [createTicketOpenedEmbed(user, ticketNumber, typeLabel)],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('ticket_guidelines')
        .setLabel('Guidelines')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📘'),
    )],
  });

  await interaction.reply({
    content: `Your ticket has been created: <#${createdChannel.id}>`,
    ephemeral: true,
  });

  await logTicketEvent(guild.id, `${ticketType.toUpperCase()} ticket #${ticketNumber} created for ${user.tag} in <#${createdChannel.id}>.`);
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.once('ready', async () => {
  for (const userId of await loadTrustedUserIds()) {
    trustedUsers.add(userId);
  }
  for (const record of await loadGlobalBans()) {
    globalBans.set(record.userId, record);
  }
  for (const [guildId, settings] of Object.entries(await loadGuildSecurity())) {
    guildSecurity.set(guildId, settings);
  }
});

client.on('guildMemberAdd', async (member) => {
  const joinCount = recentEvents(joinWindows, member.guild.id, config.raidWindowSeconds * 1000);
  if (joinCount >= config.raidJoinThreshold && !lockedGuilds.has(member.guild.id)) {
    const changedChannels = await setGuildLockdown(member.guild.id, true);
    await logSecurityEvent(member.guild.id, '🚨 Anti-Raid Lockdown', `${joinCount} accounts joined within ${config.raidWindowSeconds} seconds. CyberGuard restricted public messaging.`, { tag: member.user.tag, id: member.id });
    console.log(`Anti-raid lockdown enabled in ${member.guild.name}; ${changedChannels} channels updated.`);
  }

  const record = globalBans.get(member.id);
  if (record && member.guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers) && member.bannable) {
    try {
      await member.ban({ reason: `CyberGuard global block: ${record.reason}` });
      await logSecurityEvent(member.guild.id, '🌐 Global Block Enforced', 'A globally blocked account was prevented from joining this server.', { tag: member.user.tag, id: member.id });
    } catch (error) {
      console.error('Global block enforcement failed:', error);
    }
    return;
  }

  if (member.user.createdTimestamp > 0 && Date.now() - member.user.createdTimestamp < config.altAccountDays * 86400000) {
    await logSecurityEvent(member.guild.id, '⚠️ New Account Review', `An account younger than ${config.altAccountDays} days joined and was flagged for staff review.`, { tag: member.user.tag, id: member.id });
  }
});

client.on('guildMemberRemove', async (member) => {
  await logSecurityEvent(member.guild.id, '👋 Member Left', `${member.user.tag} left the server.`, { tag: member.user.tag, id: member.id });
});

client.on('guildBanAdd', async (ban) => {
  await monitorDestructiveAction(ban.guild, AuditLogEvent.MemberBanAdd, 'A member ban');
});

client.on('guildMemberRemove', async (member) => {
  await monitorDestructiveAction(member.guild, AuditLogEvent.MemberKick, 'A member removal or kick');
});

client.on('channelDelete', async (channel) => {
  if (channel.isDMBased()) return;
  await monitorDestructiveAction(channel.guild, AuditLogEvent.ChannelDelete, 'A channel deletion');
});

client.on('roleDelete', async (role) => {
  await monitorDestructiveAction(role.guild, AuditLogEvent.RoleDelete, 'A role deletion');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || !message.member) return;
  if (isTrustedUser(message.author.id)) return;

  if (isSuspiciousSecurityMessage(message)) {
    await handleSecurityBan(message, 'suspicious scam or compromised-account activity detected');
    return;
  }

  const spamCount = recentEvents(spamWindows, `${message.guild.id}:${message.author.id}`, 10000);
  if (spamCount >= 6 && message.member.moderatable) {
    try {
      await message.member.timeout(10 * 60 * 1000, 'CyberGuard anti-spam protection');
      await message.delete();
      await logSecurityEvent(message.guild.id, '⚠️ Anti-Spam Action', 'A member was temporarily timed out after sending messages too quickly.', { tag: message.author.tag, id: message.author.id });
    } catch (error) {
      console.error('Anti-spam action failed:', error);
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.guild) return;

  if (interaction.isChatInputCommand() && interaction.commandName === 'security') {
    await handleSecurityCommand(interaction as never);
    return;
  }

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== 'ticket') return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      const panel = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('open_ticket_general')
          .setLabel('General Support')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎫'),
        new ButtonBuilder()
          .setCustomId('open_ticket_network')
          .setLabel('Network Assistance')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🌐'),
        new ButtonBuilder()
          .setCustomId('open_ticket_hr_shr')
          .setLabel('HR / SHR')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('👥'),
        new ButtonBuilder()
          .setCustomId('view_guidelines')
          .setLabel('Guidelines')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📘'),
        new ButtonBuilder()
          .setCustomId('view_tos')
          .setLabel('Terms')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📄')
      );

      await interaction.reply({
        embeds: [createSupportPanelEmbed()],
        components: [panel],
      });
      return;
    }

    if (subcommand === 'close') {
      await handleCloseTicket(interaction as never);
      return;
    }

    if (subcommand === 'add' || subcommand === 'remove') {
      await handleTicketMemberAction(interaction as never, subcommand);
      return;
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'security_verify') {
      await handleVerification(interaction as never);
      return;
    }

    if (interaction.customId === 'close_ticket') {
      await handleCloseTicket(interaction as never);
      return;
    }

    if (interaction.customId === 'ticket_guidelines') {
      await interaction.reply({
        embeds: [createSupportPanelEmbed().setTitle('📘 Ticket guidelines').setDescription('Please provide a clear summary, relevant screenshots or logs, and any useful IDs. Keep replies focused on this ticket so staff can resolve it efficiently.')],
        ephemeral: true,
      });
      return;
    }

    if (interaction.customId === 'open_ticket' || interaction.customId.startsWith('open_ticket_')) {
      const ticketType = interaction.customId === 'open_ticket_network'
        ? 'network'
        : interaction.customId === 'open_ticket_hr_shr'
          ? 'hr-shr'
          : 'general';
      await handleOpenTicket(interaction as never, ticketType);
      return;
    }

    if (interaction.customId === 'view_guidelines') {
      await interaction.reply({
        embeds: [createSupportPanelEmbed().addFields({
          name: '📘 Support Guidelines',
          value: '• Keep your issue clear and specific\n• Include relevant details, screenshots, and logs\n• Be respectful and concise while waiting for a response',
          inline: false,
        })],
        ephemeral: true,
      });
      return;
    }

    if (interaction.customId === 'view_tos') {
      await interaction.reply({
        embeds: [createSupportPanelEmbed().addFields({
          name: '📄 Support Terms',
          value: '• Support is for official issues and requests only\n• Abuse, spam, or harassment will not be tolerated\n• Staff decisions are final for support resolution',
          inline: false,
        })],
        ephemeral: true,
      });
    }
  }
});

client.login(config.token);
