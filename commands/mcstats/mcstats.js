const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mysql = require('mysql2/promise');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mcstats')
        .setDescription('Minecraftサーバーのプレイヤーステータスを表示します')
        .addStringOption(option =>
            option.setName('player')
                .setDescription('MCIDを入力してください')
                .setRequired(true)),

    async execute(interaction) {
        const mcid = interaction.options.getString('player');

        // 処理に時間がかかる可能性があるため、先に応答を保留する
        await interaction.deferReply();

        let connection;
        try {
            // mcstats_dbの設定を使用してデータベース接続
            connection = await mysql.createConnection({
                host: config.mcstats_db.host,
                user: config.mcstats_db.user,
                password: config.mcstats_db.password,
                database: config.mcstats_db.database
            });

            // player_dataテーブルからデータを取得
            const [rows] = await connection.execute(
                'SELECT * FROM player_data WHERE mcid = ?',
                [mcid]
            );

            if (rows.length === 0) {
                await interaction.editReply({ content: `プレイヤー **${mcid}** のデータが見つかりませんでした。` });
                return;
            }

            const data = rows[0];

            // 最終ログイン日時のフォーマット
            let lastLogin = data.last_login;
            if (lastLogin instanceof Date) {
                lastLogin = lastLogin.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            }

            // オンラインステータスの表示 (1=オンライン, 0=オフラインと仮定)
            const isOnline = data.online ? '🟢 オンライン' : '🔴 オフライン';

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`${data.mcid} のステータス`)
                // ユーザーアイコンとして表示
                .setThumbnail(`https://mc-heads.net/avatar/${data.mcid}`)
                .addFields(
                    { name: 'MCID', value: data.mcid || '不明', inline: true },
                    { name: 'ランク', value: data.luckperms_group || 'なし', inline: true },
                    { name: 'レベル', value: String(data.level || 0), inline: true },
                    { name: 'ステータス', value: isOnline, inline: true },
                    { name: '最終ログイン', value: String(lastLogin || '不明'), inline: true },
                    { name: 'Twitter', value: data.twitter || '未設定', inline: true },
                    { name: 'ひとこと', value: data.owner_words || 'なし', inline: false },
                    { name: 'UUID', value: data.uuid || '不明', inline: false },
                    { name: 'ID', value: String(data.id), inline: true }
                )
                .setFooter({ text: 'KinokoServer Survival Stats' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Database error:', error);
            if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                await interaction.editReply({ content: 'データベースへのアクセスが拒否されました。設定を確認してください。' });
            } else if (error.code === 'ER_BAD_DB_ERROR') {
                await interaction.editReply({ content: '指定されたデータベースが見つかりません。' });
            } else if (error.code === 'ER_NO_SUCH_TABLE') {
                await interaction.editReply({ content: 'テーブルが見つかりません。' });
            } else {
                await interaction.editReply({ content: 'データベースエラーが発生しました。' });
            }
        } finally {
            if (connection) await connection.end();
        }
    },
};