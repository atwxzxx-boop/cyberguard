import { PermissionsBitField, REST, Routes, SlashCommandBuilder } from 'discord.js';
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
    const target = config.guildId
      ? Routes.applicationGuildCommands(config.clientId, config.guildId)
      : Routes.applicationCommands(config.clientId);

    console.log(`Registering slash commands in ${config.guildId ? 'guild mode' : 'global mode'}...`);

    await rest.put(target, {
      body: commands,
    });

    console.log('Slash commands registered successfully.');
  } catch (error: any) {
    if (config.guildId && error?.code === 50001) {
      console.warn('Guild registration failed. Falling back to global command registration...');

      try {
        await rest.put(Routes.applicationCommands(config.clientId), {
          body: commands,
        });
        console.log('Slash commands registered globally.');
        return;
      } catch (fallbackError) {
        console.error('Failed to register slash commands globally:', fallbackError);
        return;
      }
    }

    console.error('Failed to register slash commands:', error);
  }
})();
