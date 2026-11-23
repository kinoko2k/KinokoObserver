const {
    Client,
    Events,
    GatewayIntentBits,
    EmbedBuilder,
} = require("discord.js");
const { token, botLogChannelId } = require("./config.json");
const fs = require('fs');
const path = require('path');

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

    if (botLogChannelId) {
        const logChannel = c.channels.cache.get(botLogChannelId);
        if (logChannel) {
            const startupEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Bot 起動ログ')
                .setDescription(`${c.user.tag} が起動しました。`)
                .setTimestamp();

            try {
                await logChannel.send({ embeds: [startupEmbed] });
            } catch (error) {
                console.error(`起動ログを送信できませんでした。${error}`);
            }
        }
    }
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
