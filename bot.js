const {
    Client,
    Events,
    GatewayIntentBits,
    SimpleShardingStrategy,
    EmbedBuilder,
    Partials,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    Collection,
    ModalSubmitInteraction,
    TextInputComponent,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
} = require("discord.js");
const { token, config } = require("./config.json");
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const birthdayChecker = require('./events/birthday-checker');
const voiceLogger = require('./events/vc-log');
const dictionaryHandler = require('./events/dictionary.js'); 
require('dotenv').config();

const commands = [
    require("./commands/bot/about.js"),
    require("./commands/bot/ping.js"),
    require("./commands/minecraft/mcid.js"),
    require('./commands/tools/encode.js'),
    require('./commands/tools/wiki.js'),
    require('./commands/tools/spotify.js'),
    require("./applications/report.js"),
    require("./commands/settings/setup.js"),
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

    // VCセッション情報を初期化
    await voiceLogger.initializeVoiceSessions(c);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    await voiceLogger.logVoiceStateUpdate(oldState, newState);
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
    // ▼ 新しく追加 ▼
    // 辞書機能のボタンクリックを処理
    await dictionaryHandler.handleInteractionCreate(interaction);

    // 既存のコマンド処理
    if (
        !interaction.isChatInputCommand() &&
        !interaction.isMessageContextMenuCommand()
    ) {
        // ボタン等のインタラクションはここで処理が終わるので、コマンドが見つからないエラーを防ぐ
        if(interaction.isButton()) return; 
        return;
    }

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

client.on('messageCreate', async (message) => {
    await dictionaryHandler.handleMessageCreate(message);
    if (message.author.bot) return;
    if (message.guild.id !== '1274617838212218893') return;
    const logChannel = message.guild.channels.cache.get('1413210036041416926');
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
    // メッセージにguildプロパティがあるか、またはguildが特定のIDと一致するか確認
    if (!message.guild || message.guild.id !== '1274617838212218893') return;

    const logChannel = message.guild.channels.cache.get('1413210179402727454');
    if (!logChannel) return;

    let logMessage = `🗑️ **メッセージ削除ログ**\n👤 ユーザー: ${message.author?.tag || "不明"}\n📍 チャンネル: ${message.channel.name}\n💬 削除された内容: ${message.content || "（テキストなし）"}`;

    const attachments = message.attachments?.map(attachment => attachment.url) || [];
    if (attachments.length > 0) {
        logMessage += `\n🖼️ 削除された画像:`;
        attachments.forEach(url => logMessage += `\n${url}`);
    }

    logChannel.send(logMessage);
});

client.login(token);
