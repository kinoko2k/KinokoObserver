const {
    Client,
    Events,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Collection,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require("discord.js");
const { token, suggestionChannelId, suggestionResultChannelId } = require("./config.json");
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
require('dotenv').config();

const commands = [
    require("./commands/minecraft/mcid.js"),
    require('./commands/tools/encode.js'),
    require("./commands/settings/suggestion.js"),
    require("./commands/mcstats/mcstats.js"),
];

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

client.commands = new Collection();
const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));
for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(path.join(__dirname, 'commands', folder)).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(__dirname, 'commands', folder, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.on(Events.InteractionCreate, async (interaction) => {
    // スラッシュコマンドの処理
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
        return; // 他の処理に進まないようにする
    }
});

client.login(token);
