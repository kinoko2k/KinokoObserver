const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');

// 説明したい単語と内容をこのMapに追加・編集してください
const dictionary = new Map([
    ['discord', 'わーお！'],
]);

module.exports = {
    name: 'dictionaryHandler',

    /**
     * メッセージ作成イベントを処理し、辞書の単語を検出します
     * @param {import('discord.js').Message} message 
     */
    async handleMessageCreate(message) {
        // ボットのメッセージは無視
        if (message.author.bot) return;

        // Mapからキー（単語）の配列を取得
        const triggerWords = [...dictionary.keys()];

        // メッセージに含まれる単語を探す (大文字・小文字を区別しない)
        const foundWord = triggerWords.find(word => message.content.toLowerCase().includes(word));

        if (foundWord) {
            // 単語が見つかったらボタンを作成
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`show_definition_${foundWord}`) // ボタンにユニークなIDを設定
                        .setLabel(`「${foundWord}」の説明を見る`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔍')
                );

            // ボタン付きのメッセージを返信
            await message.reply({
                // content: `おや、「${foundWord}」という単語を見つけました！`, // 必要であればこの行のコメントを外してください
                components: [row]
            });
        }
    },

    /**
     * インタラクション作成イベントを処理し、ボタンのクリックに応答します
     * @param {import('discord.js').Interaction} interaction 
     */
    async handleInteractionCreate(interaction) {
        // ボタンクリック以外のインタラクションは無視
        if (!interaction.isButton()) return;

        // customIdが 'show_definition_' で始まるかチェック
        if (interaction.customId.startsWith('show_definition_')) {
            // customIdから単語を抽出 (例: 'show_definition_discord' -> 'discord')
            const word = interaction.customId.split('_')[2];

            // Mapから単語の説明を取得
            const definition = dictionary.get(word);

            if (definition) {
                // ボタンを押したユーザーにのみ説明を送信
                await interaction.reply({
                    content: `**${word}** の説明:\n${definition}`,
                    ephemeral: true // これで他の人には見えなくなります
                });
            } else {
                await interaction.reply({
                    content: 'エラー: この単語の説明が見つかりませんでした。',
                    ephemeral: true
                });
            }
        }
    }
};