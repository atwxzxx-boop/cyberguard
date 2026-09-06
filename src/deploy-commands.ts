import { ChannelType, PermissionsBitField, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config, validateConfig } from './config';

validateConfig();

const commands = [
  new SlashCommandBuilder()
    .setName('security')
    .setDescription('Security and anti-scam controls')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild.toString())
    .addSubcommand((subcommand) =>
      subcommand
        .setName('panel')
        .setDescription('Post the Security Operations Center panel')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .addChannelOption((option) =>
          option
            .setName('category')
            .setDescription('Category where CyberGuard should create its security channels')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('pin').setDescription('Private security PIN').setRequired(true)
        )
        .setName('setup')
        .setDescription('Create the CyberGuard security workspace in this server')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Check the current security protection status')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to trust')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('pin')
            .setDescription('Private security PIN')
            .setRequired(true)
        )
        .setName('allow')
        .setDescription('Allow a trusted user to bypass the security auto-ban checks')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to remove from trusted users')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('pin')
            .setDescription('Private security PIN')
            .setRequired(true)
        )
        .setName('remove')
        .setDescription('Remove a trusted user')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to ban')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('pin')
            .setDescription('Private security PIN')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('reason')
            .setDescription('Reason for the security ban')
            .setRequired(false)
        )
        .setName('ban')
        .setDescription('Ban a user for security reasons')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .addUserOption((option) =>
          option.setName('user').setDescription('The user to block globally').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('pin').setDescription('Private security PIN').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('Reason for the global ban').setRequired(false)
        )
        .setName('globalban')
        .setDescription('Block a user across every server using CyberGuard')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .addUserOption((option) =>
          option.setName('user').setDescription('The user to remove from the global blocklist').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('pin').setDescription('Private security PIN').setRequired(true)
        )
        .setName('globalunban')
        .setDescription('Remove a user from the global CyberGuard blocklist')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('globalstatus').setDescription('Show the global CyberGuard blocklist status')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .addStringOption((option) => option.setName('pin').setDescription('Private security PIN').setRequired(true))
        .setName('lockdown')
        .setDescription('Lock server channels against an active raid')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .addStringOption((option) => option.setName('pin').setDescription('Private security PIN').setRequired(true))
        .setName('unlock')
        .setDescription('Lift the active server lockdown')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('verify')
        .setDescription('Post the CyberGuard verification panel')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('scan')
        .setDescription('Run a quick security scan summary')
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage support tickets')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels.toString())
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Create a ticket panel in the current channel')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('close')
        .setDescription('Close the current ticket channel')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to add to the ticket')
            .setRequired(true)
        )
        .setName('add')
        .setDescription('Add a user to this ticket')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to remove from the ticket')
            .setRequired(true)
        )
        .setName('remove')
        .setDescription('Remove a user from this ticket')
    )
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    if (!config.guildId) {
      throw new Error('GUILD_ID is required for guild-scoped command deployment.');
    }

    console.log('Registering slash commands in guild mode...');
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
      body: commands,
    });

    console.log('Slash commands registered successfully.');
    await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
    console.log('Stale global slash commands cleared.');
  } catch (error: any) {
    console.error('Failed to register slash commands:', error);
  }
})();
