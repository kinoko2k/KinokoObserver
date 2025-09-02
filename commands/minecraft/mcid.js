const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mcidcheck')
        .setDescription('MCIDの情報を取得します。')
        .addStringOption(option =>
            option.setName('mcid')
                .setDescription('Minecraft ID')
                .setRequired(true)),
    async execute(interaction) {
        const mcid = interaction.options.getString('mcid');

        try {
            const response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${mcid}`);
            const data = response.data;

            if (!data) {
                await interaction.reply('そんなやついない！');
                return;
            }

            const uuid = data.id;

            // バージョン選択用のセレクトメニュー
            const versionSelect = new StringSelectMenuBuilder()
                .setCustomId('mcversion')
                .setPlaceholder('Minecraftのバージョンを選択')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('1.20以前')
                        .setDescription('Minecraft 1.20以前のバージョン用コマンド')
                        .setValue('pre_1.21'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('1.21以降')
                        .setDescription('Minecraft 1.21以降のバージョン用コマンド')
                        .setValue('post_1.21')
                );

            const versionRow = new ActionRowBuilder()
                .addComponents(versionSelect);

            // 1.20以前用のコマンド
            const oldCommand = `/give @p minecraft:player_head{SkullOwner:"${data.name}"}`;
            // 1.21以降用のコマンド
            const newCommand = `/give @p minecraft:player_head[profile={name:"${data.name}"}]`;
            // デフォルトは1.20以前のコマンドを表示
            let currentCommand = oldCommand;

            const page1Embed = new EmbedBuilder()
                .setTitle('MCID checker')
                .addFields(
                    { name: 'MCID', value: data.name },
                    { name: 'UUID', value: uuid },
                    { name: 'プレイヤーの頭を取得する (1.20以前)', value: '```' + currentCommand + '```' }
                );

            const page2Embed = new EmbedBuilder()
                .setTitle('MCID checker')
                .setThumbnail(`https://mineskin.eu/avatar/${data.name}`)
                .setImage(`https://mineskin.eu/body/${data.name}`);

            const pageButtonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('previousPage')
                        .setLabel('MCID')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('nextPage')
                        .setLabel('Skin')
                        .setStyle(ButtonStyle.Primary)
                );

            // 最初のページはMCIDとコマンド情報
            let currentPage = 'page1';
            let currentPageEmbed = page1Embed;

            await interaction.reply({
                embeds: [currentPageEmbed],
                components: [pageButtonRow, versionRow]
            });

            // ページ切り替えとバージョン選択のイベントを監視
            const collector = interaction.channel.createMessageComponentCollector({
                time: 60000
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ content: 'このボタンは他の人は使えません。', ephemeral: true });
                    return;
                }

                // ページ切り替えボタンの処理
                if (i.customId === 'nextPage') {
                    currentPage = 'page2';
                    await i.update({
                        embeds: [page2Embed],
                        components: [pageButtonRow, versionRow]
                    });
                } else if (i.customId === 'previousPage') {
                    currentPage = 'page1';
                    // 現在選択されているバージョンのコマンドを使ってEmbedを更新
                    const updatedPage1Embed = new EmbedBuilder()
                        .setTitle('MCID checker')
                        .addFields(
                            { name: 'MCID', value: data.name },
                            { name: 'UUID', value: uuid },
                            {
                                name: `プレイヤーの頭を取得する (${currentCommand === newCommand ? '1.21以降' : '1.20以前'})`,
                                value: '```' + currentCommand + '```'
                            }
                        );

                    await i.update({
                        embeds: [updatedPage1Embed],
                        components: [pageButtonRow, versionRow]
                    });
                }
                // バージョン選択メニューの処理
                else if (i.customId === 'mcversion') {
                    const selectedVersion = i.values[0];

                    if (selectedVersion === 'pre_1.21') {
                        currentCommand = oldCommand;
                    } else if (selectedVersion === 'post_1.21') {
                        currentCommand = newCommand;
                    }

                    // バージョン選択後、表示するページに応じてEmbedを更新
                    if (currentPage === 'page1') {
                        const updatedPage1Embed = new EmbedBuilder()
                            .setTitle('MCID checker')
                            .addFields(
                                { name: 'MCID', value: data.name },
                                { name: 'UUID', value: uuid },
                                {
                                    name: `プレイヤーの頭を取得する (${selectedVersion === 'post_1.21' ? '1.21以降' : '1.20以前'})`,
                                    value: '```' + currentCommand + '```'
                                }
                            );

                        await i.update({
                            embeds: [updatedPage1Embed],
                            components: [pageButtonRow, versionRow]
                        });
                    } else {
                        // Skinページを表示中の場合は、バージョン選択を記録するだけ
                        await i.update({
                            embeds: [page2Embed],
                            components: [pageButtonRow, versionRow]
                        });
                    }
                }
            });

            collector.on('end', () => {
                // コレクターの有効期限が切れたら、インタラクション要素を無効化
                interaction.editReply({
                    components: []
                }).catch(console.error);
            });

        } catch (error) {
            console.error('Error occurred:', error);
            await interaction.reply('エラーが発生しました。');
        }
    },
};