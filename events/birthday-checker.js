const mysql = require('mysql2/promise');
const config = require('../config.json');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'birthdayChecker',

    async checkBirthdays(client) {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        try {
            const connection = await mysql.createConnection({
                host: config.mysql.host,
                user: config.mysql.user,
                password: config.mysql.password,
                database: config.mysql.database
            });

            const [rows] = await connection.execute(
                'SELECT user_id FROM birthday WHERE birth_month = ? AND birth_day = ?',
                [month, day]
            );

            await connection.end();

            if (rows.length > 0) {
                const birthdayChannel = await client.channels.fetch(config.birthdayChannelId);

                for (const row of rows) {
                    try {
                        const user = await client.users.fetch(row.user_id);

                        const birthdayEmbed = new EmbedBuilder()
                            .setColor(0xFF69B4)
                            .setTitle('🎂 お誕生日おめでとうございます！ 🎉')
                            .setDescription(`今日は <@${row.user_id}> さんの誕生日です！`)
                            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                            .setFooter({ text: `${month}月${day}日` })
                            .setTimestamp();

                        await birthdayChannel.send({ embeds: [birthdayEmbed] });
                    } catch (userError) {
                        console.error(`Error fetching user ${row.user_id}:`, userError);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking birthdays:', error);
        }
    }
};