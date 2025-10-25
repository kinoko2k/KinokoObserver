const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggestion')
        .setDescription('意見箱を設置します。'),

    async execute(interaction) {
        // このコマンドは管理者のみが実行できるように制限することを推奨します
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'このコマンドを実行する権限がありません。', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('サーバーへのご意見・ご提案')
            .setDescription('下のボタンを押して、サーバーへの意見や提案を送信してください。\n投稿された意見は匿名で投票にかけられます。');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_suggestion_modal')
                    .setLabel('意見を投稿する')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝')
            );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '意見箱を設置しました。', ephemeral: true });
    },
};