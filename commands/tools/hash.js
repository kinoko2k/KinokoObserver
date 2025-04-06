const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hash')
        .setDescription('指定されたテキストをハッシュ化します。')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('ハッシュ化するテキスト')
                .setRequired(true)
        ),
    async execute(interaction) {
        const text = interaction.options.getString('text');
        const result = crypto.createHash('sha256').update(text).digest('hex');

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('ハッシュ化結果')
            .setDescription(result);

        await interaction.reply({ embeds: [embed] });
    }
};