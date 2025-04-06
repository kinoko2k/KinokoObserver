const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('post')
        .setDescription('郵便番号で住所を検索します。')
        .addStringOption(option =>
            option.setName('郵便番号')
                .setDescription('検索する郵便番号を入力してください')
                .setRequired(true)),

    async execute(interaction) {
        const postalCode = interaction.options.getString('郵便番号');
        console.log(`Received postal code: ${postalCode}`);

        if (!postalCode) {
            await interaction.reply({ content: '郵便番号を入力してください。', ephemeral: true });
            return;
        }

        try {
            const apiUrl = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${encodeURIComponent(postalCode)}`;

            const response = await axios.get(apiUrl);
            const data = response.data.results;

            if (!data || data.length === 0) {
                await interaction.reply({ content: `郵便番号 "${postalCode}" に一致する住所が見つかりませんでした。`, ephemeral: true });
                return;
            }

            const address = data[0];
            const addressString = `${address.address1} ${address.address2} ${address.address3}`;

            const embed = new EmbedBuilder()
                .setColor('#1DB954')
                .setTitle(`住所: ${postalCode}`)
                .setDescription(addressString)
                .addFields(
                    { name: '都道府県', value: address.address1 || 'N/A', inline: true },
                    { name: '市区町村', value: address.address2 || 'N/A', inline: true },
                    { name: '町域', value: address.address3 || 'N/A', inline: true },
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to fetch address data:', error);
            await interaction.reply({ content: '住所情報の取得中にエラーが発生しました。', ephemeral: true });
        }
    },
};