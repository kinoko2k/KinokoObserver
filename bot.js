const {
    Client,
    Events,
    GatewayIntentBits,
} = require("discord.js");
const { token } = require("./config.json");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
    ],
});

client.once(Events.ClientReady, async (c) => {
    console.log(`準備OKです! ${c.user.tag}がログインします。`);

    client.user.setPresence({
        activities: [{ name: "/", type: "PLAYING" }],
        status: "online",
    });

});

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	const events = Array.isArray(event) ? event : [event];
	for (const e of events) {
		if (e.once) {
			client.once(e.name, (...args) => e.execute(...args));
		} else {
			client.on(e.name, (...args) => e.execute(...args));
		}
	}
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`${interaction.commandName} というコマンドは見つかりませんでした。`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'コマンド実行中にエラーが発生しました！', ephemeral: true });
            } else {
                await interaction.reply({ content: 'コマンド実行中にエラーが発生しました！', ephemeral: true });
            }
        }
        return;
    }
});

client.login(token);
