const { SlashCommandBuilder } = require('@discordjs/builders');
const mysql = require('mysql2/promise');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('各種設定を行います')
        .addSubcommand(subcommand =>
            subcommand
                .setName('birthday')
                .setDescription('誕生日を設定します')
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('誕生日をMM/DD形式で入力してください（例: 05/20）')
                        .setRequired(true))),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'birthday') {
            const dateInput = interaction.options.getString('date');
            const datePattern = /^(\d{1,2})\/(\d{1,2})$/;
            const match = dateInput.match(datePattern);

            if (!match) {
                await interaction.reply({ content: '日付の形式が正しくありません。MM/DD形式で入力してください。例: 05/20', ephemeral: true });
                return;
            }

            const month = parseInt(match[1], 10);
            const day = parseInt(match[2], 10);

            // 日付の妥当性をチェック
            if (month < 1 || month > 12) {
                await interaction.reply({ content: '月は1～12の範囲で入力してください。', ephemeral: true });
                return;
            }

            const daysInMonth = new Date(2025, month, 0).getDate();
            if (day < 1 || day > daysInMonth) {
                await interaction.reply({ content: `${month}月の日は1～${daysInMonth}の範囲で入力してください。`, ephemeral: true });
                return;
            }

            try {
                const connection = await mysql.createConnection({
                    host: config.mysql.host,
                    user: config.mysql.user,
                    password: config.mysql.password,
                    database: config.mysql.database
                });

                await connection.execute(
                    'REPLACE INTO birthday (user_id, birth_month, birth_day) VALUES (?, ?, ?)',
                    [interaction.user.id, month, day]
                );

                await connection.end();

                await interaction.reply({ content: `誕生日を${month}月${day}日に設定しました！`, ephemeral: true });
            } catch (error) {
                console.error('Database error:', error);
                await interaction.reply({ content: 'エラーが発生しました。後でもう一度お試しください。', ephemeral: true });
            }
        }
    },
};