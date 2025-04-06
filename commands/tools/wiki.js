const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wiki')
        .setDescription('Wikipediaから情報を取得します')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('検索する単語を指定してください')
                .setRequired(true)
        ),

    async execute(interaction) {
        const query = interaction.options.getString('query');

        try {
            const response = await axios.get(`https://ja.wikipedia.org/w/api.php`, {
                params: {
                    action: 'query',
                    prop: 'extracts',
                    format: 'json',
                    exintro: '',
                    explaintext: '',
                    titles: query,
                },
            });

            const pageId = Object.keys(response.data.query.pages)[0];
            const page = response.data.query.pages[pageId];

            if (page.missing) {
                return interaction.reply('該当するページが見つかりませんでした。');
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(page.title)
                .setURL(`https://ja.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/\s/g, '_'))}`)
                .setAuthor({ name: 'Powered by Wikipedia', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/32px-Wikipedia-logo-v2.svg.png' });

            if (page.extract.length > 0) {
                embed.setDescription(page.extract.length > 2048 ? `${page.extract.slice(0, 2045)}...` : page.extract);
            } else {
                embed.setDescription('該当する結果は見つかりませんでした。');
            }

            interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            interaction.reply('Wikipediaの情報を取得する際にエラーが発生しました。');
        }
    }
};