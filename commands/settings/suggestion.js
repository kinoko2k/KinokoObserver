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
            .setDescription('下のボタンを押して、サーバーへの意見や提案を送信してください。\n投稿された意見は匿名で投票にかけられます。\n⭕❌のどちらかが5票以上集まると、運営に通知されます。');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_suggestion_modal_anonymous')
                    .setLabel('匿名で投稿する')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('open_suggestion_modal_named')
                    .setLabel('記名で投稿する')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👤')
            );

        // 先にephemeralで返信してから、チャンネルにメッセージを送信する
        await interaction.reply({ content: '意見箱を設置しました。', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },
};