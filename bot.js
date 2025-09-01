const {
    Client,
    Events,
    GatewayIntentBits,
    SimpleShardingStrategy,
    EmbedBuilder,
    REST,
    Routes,
} = require("discord.js");
const { token } = require("./config.json");
const { SlashCommandBuilder } = require('@discordjs/builders');
// const { sequelize, Guild } = require('./models');

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

const channelId = '1274697066248929360';
function getDateMessage() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 月は0から始まるので+1
    const day = now.getDate();
    const dayOfWeek = now.toLocaleString('ja-JP', { weekday: 'long' });

    const targetDate = new Date(year, 11, 31); // 2025年12月31日
    const diff = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24)); // 残り日数

    return `日付が変わりました。あと2025年は、${diff}日です。\n今日は、${month}月${day}日（${dayOfWeek}）です。`;
}

function sendDailyMessage() {
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();

    setTimeout(() => {
        const channel = client.channels.cache.get(channelId);
        if (channel) {
            channel.send(getDateMessage());
        }
        sendDailyMessage();
    }, msUntilMidnight);
}

client.once('ready', async () => {
    console.log('Bot is ready!');
    sendDailyMessage();
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
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
