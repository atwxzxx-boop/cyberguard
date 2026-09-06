# Discord Ticket Bot

A professional Discord support ticket bot with polished embeds, a ticket panel, and admin controls.

## Features

- Support ticket panel with a branded embed
- Button-based ticket creation
- Ticket ownership validation
- Staff controls for closing tickets
- Optional logging channel for ticket actions
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

## Slash Commands

- `/ticket setup` - Posts the support panel in a channel
- `/ticket close` - Closes the active ticket
- `/ticket add <user>` - Adds a user to the ticket
- `/ticket remove <user>` - Removes a user from the ticket

## Notes

This project is intentionally built as a clean starting point for a production-ready ticket bot. You can expand it with transcript storage, moderation integrations, or a database layer later.
