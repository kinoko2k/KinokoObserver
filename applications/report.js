const { ContextMenuCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { reportChannelId } = require('../config.json');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('お問い合わせ')
        .setType(3),

    async execute(interaction) {
        const message = interaction.targetMessage;

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('メッセージを報告しますか？')
            .setDescription(`以下の[メッセージ](${message.url})を報告しますか？\n\n\`\`\`${message.content}\`\`\``)
            .setFooter({ text: `送信者: ${message.author.tag}` });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('report_confirm')
                    .setLabel('送信する')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('report_cancel')
                    .setLabel('送信しない')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'report_confirm') {
                const reportEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('メッセージが報告されました！')
                    .setDescription(`以下の[メッセージ](${message.url})が報告されました。\n\n\`\`\`${message.content}\`\`\``)
                    .addFields(
                        { name: 'サーバーID', value: interaction.guild.id, inline: true },
                        { name: 'チャンネルID', value: message.channel.id, inline: true },
                        { name: 'メッセージID', value: message.id, inline: true },
                        { name: 'メッセージ送信者', value: message.author.tag + '(`' + message.author.id + '`)', inline: true },
                        { name: '報告者', value: interaction.user.tag + '(`' + interaction.user.id + '`)', inline: true }
                    )
                    .setTimestamp();

                const reportChannel = interaction.guild.channels.cache.get(reportChannelId);
                if (reportChannel) {
                    await reportChannel.send({ embeds: [reportEmbed] });
                }

                if (!interaction.deferred && !interaction.replied) {
                    await i.update({ content: '報告が送信されました！', components: [], ephemeral: true });
                } else {
                    await interaction.followUp({ content: '報告が送信されました！', ephemeral: true });
                }
            } else if (i.customId === 'report_cancel') {
                if (!interaction.deferred && !interaction.replied) {
                    await i.update({ content: '報告がキャンセルされました。', components: [], ephemeral: true });
                } else {
                    await interaction.followUp({ content: '報告がキャンセルされました。', ephemeral: true });
                }
            }

            await interaction.editReply({ components: [] });
        });

        collector.on('end', collected => {
            if (collected.size === 0 && !interaction.replied) {
                interaction.editReply({ content: 'タイムアウトしました。', components: [], ephemeral: true });
            }
        });
    }
};