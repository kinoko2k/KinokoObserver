const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        // メッセージにguildプロパティがあるか、またはguildが特定のIDと一致するか確認
        if (!message.guild || message.guild.id !== '1274617838212218893') return;

        const logChannel = message.guild.channels.cache.get('1413210179402727454');
        if (!logChannel) return;

        let logMessage = `🗑️ **メッセージ削除ログ**\n👤 ユーザー: ${message.author?.tag || "不明"}\n📍 チャンネル: ${message.channel.name}\n💬 削除された内容: ${message.content || "（テキストなし）"}`;

        const attachments = message.attachments?.map(attachment => attachment.url) || [];
        if (attachments.length > 0) {
            logMessage += `\n🖼️ 削除された画像:`;
            attachments.forEach(url => logMessage += `\n${url}`);
        }

        logChannel.send(logMessage);
    },
};
