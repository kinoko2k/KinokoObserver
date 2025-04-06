const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('ボットの応答速度を確認します。'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🏓 Pong!')
            .setDescription('応答速度は`' + latency + 'ms`' + 'です。')
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });
    },
};