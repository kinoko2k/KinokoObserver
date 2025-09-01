const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('このBotについての情報を表示します。'),

    async execute(interaction) {
        const pages = [
            new EmbedBuilder()
                .setColor('#00ffaad0')
                .setTitle('KinokoObserver')
                .setDescription('なんか作った。')
        ];

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Twitter@kinoko1216')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://twitter.com/kinoko1216'),
                new ButtonBuilder()
                    .setLabel('note@kinoko1216')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://note.com/kinoko1216'),
            );

        let currentPageIndex = 0;

        await interaction.reply({ embeds: [pages[currentPageIndex]], components: [row1] });

        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            if (i.customId === 'previous') {
                currentPageIndex = (currentPageIndex - 1 + pages.length) % pages.length;
                await i.update({ embeds: [pages[currentPageIndex]], components: [row1] });
            } else if (i.customId === 'next') {
                currentPageIndex = (currentPageIndex + 1) % pages.length;
                await i.update({ embeds: [pages[currentPageIndex]], components: [row1] });
            }
        });

        collector.on('end', collected => {
            interaction.editReply({ components: [] }).catch(console.error);
        });
    },
};
