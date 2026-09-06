# CyberGuard

CyberGuard is a Discord security bot with anti-scam detection, automated enforcement, security audit logs, staff controls, and an optional support-ticket module.

## Features

- Scam and compromised-account message detection
- Automatic suspicious-message removal and bans
- Administrator and staff-role protection
- Persistent trusted-user allowlist
- Security status and scan commands
- Security Operations Center panel
- Optional support ticket panel with routed queues
- Ticket transcripts and audit logging
- Slash command registration workflow
- PM2-ready production hosting for 24/7 uptime

## Requirements

- Node.js 18+
- A Discord bot token
- A Discord server where you can add the bot

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the sample environment file:
   ```bash
   cp .env.example .env
   ```
3. Fill in your bot values in `.env`.
4. Register the slash commands:
   ```bash
   npm run deploy
   ```
5. Build the bot:
   ```bash
   npm run build
   ```
6. Start the bot in production mode:
   ```bash
   npm run start:prod
   ```

## 24/7 Hosting

PM2 keeps the bot alive only while the machine running it is powered on. For uptime while your Mac is off, deploy the included `Dockerfile` to a VPS or a cloud worker such as Railway. Add every variable from `.env.example` to the host's environment-variable settings; never upload `.env` or paste the token into source control.

For a VPS:

```bash
npm install
npm run build
npm run start:prod
```

PM2 will restart the bot automatically if it crashes.

For Railway:

1. Create a new project from this repository.
2. Add the environment variables from `.env.example` in the Railway service settings.
3. Deploy. Railway will build the Dockerfile and restart the worker if it exits.

## Environment Variables

- `DISCORD_TOKEN`: Your Discord bot token
- `CLIENT_ID`: Your application client ID
- `GUILD_ID`: The guild where slash commands should be deployed
- `STAFF_ROLE_ID`: Staff/admin role allowed to manage tickets
- `TICKETS_CATEGORY_ID`: Category to create ticket channels under
- `LOG_CHANNEL_ID`: Optional logs channel for ticket events
- `SERVER_NAME`: Custom server name used in the branded support embeds
- `ACCENT_COLOR`: Brand accent color in hex format, e.g. `5865F2` or `#5865F2`
- `LOGO_URL`: Optional URL for the server logo used in the support panel
- `VERIFIED_ROLE_ID`: Role granted by the verification panel
- `ALT_ACCOUNT_DAYS`: Account age threshold for staff review, default `7`
- `RAID_JOIN_THRESHOLD`: Joins required to trigger raid containment, default `5`
- `RAID_WINDOW_SECONDS`: Raid detection window, default `20`
- `ANTI_NUKE_THRESHOLD`: Destructive actions before lockdown, default `3`

## Slash Commands

- `/serverpin <serverlink>` - Creates or updates a private `server-updates` channel for CyberGuard Staff

`SERVER_PIN_CHANNEL_ID` can point to an existing private channel, such as a pin channel. After `/serverpinconfig` is used, CyberGuard refreshes the invite embed every 60 seconds. It cannot regenerate an invite belonging to another server unless CyberGuard is installed in that destination server.
- `/security panel` - Posts the CyberGuard Security Operations Center panel
- `/security status` - Shows active protection and configuration
- `/security scan` - Runs a security scan summary
- `/security allow <user>` - Adds a trusted user
- `/security remove <user>` - Removes a trusted user
- `/security ban <user> [reason]` - Manually bans a user
- `/security globalban <user> [reason]` - Blocks a user across CyberGuard servers
- `/security globalunban <user>` - Removes a global block
- `/security globalstatus` - Shows the global blocklist status
- `/ticket setup` - Posts the support panel in a channel
- `/ticket close` - Closes the active ticket
- `/ticket add <user>` - Adds a user to the ticket
- `/ticket remove <user>` - Removes a user from the ticket

## Invite CyberGuard

Share this invite link with server owners. They can add CyberGuard without using any security commands; protection starts automatically after installation:

`https://discord.com/oauth2/authorize?client_id=1546214488137670789&scope=bot%20applications.commands&permissions=126100`

The invite requests only the permissions needed for message protection, audit logging, moderation, embeds, and optional tickets. Security and ticket slash commands are restricted by default to server managers and channel managers.

## Notes

The security layer is the primary product. Tickets remain available as an optional support workflow.
