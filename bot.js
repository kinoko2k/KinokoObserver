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
    require("./commands/settings/suggestion.js"),
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
        return;
    }

    // ボタンインタラクションの処理
    if (interaction.isButton()) {
        // 意見投稿モーダルを開くボタン
        if (interaction.customId === 'open_suggestion_modal') {
            const modal = new ModalBuilder()
                .setCustomId('suggestion_modal')
                .setTitle('ご意見・ご提案');

            const suggestionInput = new TextInputBuilder()
                .setCustomId('suggestion_input')
                .setLabel("ご意見・ご提案内容")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('サーバーをより良くするためのアイデアを自由にお書きください。')
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(suggestionInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        }

        // 投票ボタンの処理はモーダル送信後のコレクターで行うため、ここでは何もしない
    }

    // モーダル送信の処理
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'suggestion_modal') {
            const suggestionText = interaction.fields.getTextInputValue('suggestion_input');

            // URLが含まれているかチェック
            const urlRegex = /https?:\/\/[^\s]+/g;
            if (urlRegex.test(suggestionText)) {
                await interaction.reply({ content: 'ご意見にURLが含まれているため、投稿を棄却しました。', ephemeral: true });
                return;
            }

            const suggestionChannel = await interaction.client.channels.fetch(suggestionChannelId);

            if (!suggestionChannel) {
                console.error('意見投稿チャンネルが見つかりません。');
                return interaction.reply({ content: 'エラー: 意見投稿チャンネルが見つかりませんでした。', ephemeral: true });
            }

            const suggestionEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('新しい意見が投稿されました')
                .setDescription(suggestionText)
                .setFooter({ text: 'この意見に投票してください' });

            const voteRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('suggestion_approve')
                        .setLabel('賛成 (0)')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('⭕'),
                    new ButtonBuilder()
                        .setCustomId('suggestion_reject')
                        .setLabel('反対 (0)')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

            const sentMessage = await suggestionChannel.send({ embeds: [suggestionEmbed], components: [voteRow] });
            await interaction.reply({ content: 'ご意見ありがとうございます！匿名で投稿されました。', ephemeral: true });

            // 投票の処理
            const filter = i => i.customId === 'suggestion_approve' || i.customId === 'suggestion_reject';
            const collector = sentMessage.createMessageComponentCollector({ filter, time: 86400000 }); // 24時間

            let approveCount = 0;
            let rejectCount = 0;
            const votedUsers = new Set();

            collector.on('collect', async i => {
                if (votedUsers.has(i.user.id)) {
                    await i.reply({ content: '既にこの意見に投票済みです。', ephemeral: true });
                    return;
                }

                if (i.customId === 'suggestion_approve') {
                    approveCount++;
                } else if (i.customId === 'suggestion_reject') {
                    rejectCount++;
                }
                votedUsers.add(i.user.id);

                const updatedRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('suggestion_approve')
                            .setLabel(`賛成 (${approveCount})`)
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('⭕'),
                        new ButtonBuilder()
                            .setCustomId('suggestion_reject')
                            .setLabel(`反対 (${rejectCount})`)
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('❌')
                    );

                await i.update({ components: [updatedRow] });

                // どちらかの票が5に達したら結果を通知
                if (approveCount >= 5 || rejectCount >= 5) {
                    collector.stop('limit_reached');
                }
            });

            collector.on('end', async (collected, reason) => {
                const resultChannel = await interaction.client.channels.fetch(suggestionResultChannelId);
                if (!resultChannel) {
                    console.error('運営チャンネルが見つかりません。');
                    return;
                }

                const resultEmbed = new EmbedBuilder()
                    .setTitle('意見投票の結果')
                    .setDescription(`**元の意見:**\n${suggestionText}`)
                    .addFields(
                        { name: '賛成', value: `${approveCount}票`, inline: true },
                        { name: '反対', value: `${rejectCount}票`, inline: true }
                    )
                    .setTimestamp();

                if (approveCount >= 5) {
                    resultEmbed.setColor(0x00FF00).addFields({ name: '結果', value: '賛成多数で可決されました。' });
                } else if (rejectCount >= 5) {
                    resultEmbed.setColor(0xFF0000).addFields({ name: '結果', value: '反対多数で否決されました。' });
                } else {
                    // タイムアウトした場合
                    resultEmbed.setColor(0x808080).addFields({ name: '結果', value: '規定票数に達さず投票が終了しました。' });
                }

                await resultChannel.send({ embeds: [resultEmbed] });

                // 元のメッセージのボタンを無効化
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('suggestion_approve_disabled')
                            .setLabel(`賛成 (${approveCount})`)
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('⭕')
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('suggestion_reject_disabled')
                            .setLabel(`反対 (${rejectCount})`)
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('❌')
                            .setDisabled(true)
                    );
                await sentMessage.edit({ components: [disabledRow] });
            });
        }
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
