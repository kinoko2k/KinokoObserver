const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const spotifyClientId = 'c652fc20223f4a1e80d0fb9d2b0a1a8a';
const spotifyClientSecret = '1bd6f72e56f74f60af8d77b99640b9ff';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spotify')
        .setDescription('Spotifyで曲を検索し、情報を表示します。')
        .addStringOption(option =>
            option.setName('曲名')
                .setDescription('検索する曲のタイトル')
                .setRequired(true)),

    async execute(interaction) {
        const trackName = interaction.options.getString('曲名');

        const tokenUrl = 'https://accounts.spotify.com/api/token';

        try {
            const tokenResponse = await axios.post(tokenUrl, null, {
                params: {
                    grant_type: 'client_credentials'
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64')}`
                }
            });

            const accessToken = tokenResponse.data.access_token;

            const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(trackName)}&type=track`;

            const response = await axios.get(searchUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const trackData = response.data.tracks.items[0];

            if (trackData) {
                const embed = new EmbedBuilder()
                    .setColor('#1DB954')
                    .setTitle(trackData.name)
                    .setURL(trackData.external_urls.spotify)
                    .setDescription(`アーティスト: ${trackData.artists.map(artist => artist.name).join(', ')}\nアルバム: ${trackData.album.name}`)
                    .setImage(trackData.album.images[0].url)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ content: `曲 "${trackName}" が見つかりませんでした。`, ephemeral: true });
            }
        } catch (error) {
            console.error('Failed to fetch Spotify data:', error);
            await interaction.reply({ content: 'Spotify情報の取得中にエラーが発生しました。', ephemeral: true });
        }
    },
};