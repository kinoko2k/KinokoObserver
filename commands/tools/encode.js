const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('encode')
        .setDescription('指定されたテキストをエンコードします。')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('エンコードするテキスト')
                .setRequired(true)
        ),
    async execute(interaction) {
        const text = interaction.options.getString('text');
        const result = encodeURIComponent(text);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('エンコード結果')
            .setDescription(result);

        await interaction.reply({ embeds: [embed] });
    }
};