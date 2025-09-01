const {
    Client,
    Events,
    GatewayIntentBits,
    SimpleShardingStrategy,
    EmbedBuilder,
    REST,
    Routes,
} = require("discord.js");
const { token, config } = require("./config.json");
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const birthdayChecker = require('./events/birthday-checker');

const commands = [
    require("./commands/bot/about.js"),
    require("./commands/bot/ping.js"),
    require("./commands/minecraft/mcid.js"),
    require('./commands/tools/encode.js'),
    require('./commands/tools/wiki.js'),
    require('./commands/tools/spotify.js'),
    require("./applications/report.js")
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
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (
        !interaction.isChatInputCommand() &&
        !interaction.isMessageContextMenuCommand()
    )
        return;

    const command = commands.find(
        (cmd) => cmd.data.name === interaction.commandName
    );

    if (command) {
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "コマンド実行時にエラーになりました。",
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: "コマンド実行時にエラーになりました。",
                    ephemeral: true,
                });
            }
        }
    } else {
        console.error(
            `${interaction.commandName}というコマンドには対応していません。`
        );
    }
});

// 0時に誕生日のユーザをチェックする
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    schedule.scheduleJob('0 0 * * *', () => {
        birthdayChecker.checkBirthdays(client);
    });
    birthdayChecker.checkBirthdays(client);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'コマンドの実行中にエラーが発生しました。', ephemeral: true });
    }
});

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.id === "302050872383242240") {
        if (
            message.embeds[0] &&
            message.embeds[0].color === 2406327 &&
            message.embeds[0].url === "https://disboard.org/" &&
            (message.embeds[0].description.match(/表示順をアップしたよ/) ||
                message.embeds[0].description.match(/Bump done/) ||
                message.embeds[0].description.match(/Bump effectué/) ||
                message.embeds[0].description.match(/Bump fatto/) ||
                message.embeds[0].description.match(/Podbito serwer/) ||
                message.embeds[0].description.match(/Успешно поднято/) ||
                message.embeds[0].description.match(/갱신했어/) ||
                message.embeds[0].description.match(/Patlatma tamamlandı/))
        ) {
            const guild = await Guild.findByPk(message.guild.id);

            if (guild && guild.bump === 1) {
                const m = await message.channel.send("ここメッセージ");
                setTimeout(() => {
                    m.delete();
                }, 7200000);

                setTimeout(() => {
                    message.channel.send("ここメッセージ");
                }, 7200000);
            }
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.guild.id !== '1314566090453549108') return;
    const logChannel = message.guild.channels.cache.get('1336245247235063860');
    if (!logChannel) {
        console.error('ログチャンネルが見つかりません。');
        return;
    }

    let logMessage = `📩 **メッセージログ**\n👤 ユーザー: ${message.author.tag}\n📍 チャンネル: ${message.channel.name}\n💬 内容: ${message.content || "（テキストなし）"}`;

    const attachments = message.attachments.map(attachment => attachment.url);
    if (attachments.length > 0) {
        logMessage += `\n🖼️ 添付画像:`;
        attachments.forEach(url => logMessage += `\n${url}`);
    }

    logChannel.send(logMessage);
});

client.on('messageDelete', async (message) => {
    if (!message.guild || message.guild.id !== '1314566090453549108') return;
    const logChannel = message.guild.channels.cache.get('1336246859378724894');
    if (!logChannel) {
        console.error('ログチャンネルが見つかりません。');
        return;
    }

    let logMessage = `🗑️ **メッセージ削除ログ**\n👤 ユーザー: ${message.author?.tag || "不明"}\n📍 チャンネル: ${message.channel.name}\n💬 削除された内容: ${message.content || "（テキストなし）"}`;

    const attachments = message.attachments?.map(attachment => attachment.url) || [];
    if (attachments.length > 0) {
        logMessage += `\n🖼️ 削除された画像:`;
        attachments.forEach(url => logMessage += `\n${url}`);
    }

    logChannel.send(logMessage);
});

client.login(token);
