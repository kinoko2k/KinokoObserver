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

    // ボタンインタラクションの処理
    if (interaction.isButton()) {
        // 意見投稿モーダルを開くボタン
        if (interaction.customId.startsWith('open_suggestion_modal_')) {
            const type = interaction.customId.endsWith('anonymous') ? 'anonymous' : 'named';

            const modal = new ModalBuilder()
                .setCustomId(`suggestion_modal_${type}`)
                .setTitle('ご意見・ご提案');

            const titleInput = new TextInputBuilder()
                .setCustomId('suggestion_title')
                .setLabel("タイトル")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('意見の要点を簡潔に記入してください。')
                .setRequired(true);

            const descriptionInput = new TextInputBuilder()
                .setCustomId('suggestion_description')
                .setLabel("説明")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('サーバーをより良くするための具体的なアイデアを自由にお書きください。')
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
            const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
            modal.addComponents(firstActionRow, secondActionRow);

            await interaction.showModal(modal);
        }
        // 他のボタン処理があればここに追加
        return;
    }

    // モーダル送信の処理
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('suggestion_modal_')) {
            const isAnonymous = interaction.customId.endsWith('anonymous');
            const title = interaction.fields.getTextInputValue('suggestion_title');
            const description = interaction.fields.getTextInputValue('suggestion_description');
            const suggestionText = `**${title}**\n\n${description}`;

            // URLが含まれているかチェック
            const urlRegex = /https?:\/\/[^\s]+/g;
            if (urlRegex.test(title) || urlRegex.test(description)) {
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
                .setTitle(title)
                .setDescription(description)
                .setFooter({ text: 'この意見に投票してください' });

            if (!isAnonymous) {
                suggestionEmbed.setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });
            }

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
            await interaction.reply({ content: 'ご意見ありがとうございます！投稿が完了しました。', ephemeral: true });

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

                if (!isAnonymous) {
                    resultEmbed.setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });
                }

                if (approveCount >= 5) {
                    resultEmbed.setColor(0x00FF00).addFields({ name: '結果', value: '賛成多数で可決されました。' });
                } else if (rejectCount >= 5) {
                    resultEmbed.setColor(0xFF0000).addFields({ name: '結果', value: '反対多数で否決されました。' });
                } else {
                    resultEmbed.setColor(0x808080).addFields({ name: '結果', value: '規定票数に達さず投票が終了しました。' });
                }

                await resultChannel.send({ embeds: [resultEmbed] });

                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('suggestion_approve_disabled').setLabel(`賛成 (${approveCount})`).setStyle(ButtonStyle.Success).setEmoji('⭕').setDisabled(true),
                        new ButtonBuilder().setCustomId('suggestion_reject_disabled').setLabel(`反対 (${rejectCount})`).setStyle(ButtonStyle.Danger).setEmoji('❌').setDisabled(true)
                    );

                try {
                    await sentMessage.edit({ components: [disabledRow] });
                } catch (error) {
                    if (error.code === 10008) { // Unknown Message
                        console.log(`投票メッセージ (ID: ${sentMessage.id}) は既に削除されていたため、編集をスキップしました。`);
                    } else {
                        console.error('投票メッセージの編集中に予期せぬエラーが発生しました:', error);
                    }
                }
            });
        }
    }
});

client.on('messageCreate', async (message) => {
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
