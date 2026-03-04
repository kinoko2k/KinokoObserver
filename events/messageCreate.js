const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (message.guild.id !== '1274617838212218893') return;
        const logChannel = message.guild.channels.cache.get('1413210036041416926');
        if (!logChannel) {
            console.error('ログチャンネルが見つかりません。');
            return;
        }

        let logMessage = `📩 **メッセージログ**\n👤 ユーザー: ${message.author.tag}\n📍 チャンネル: ${message.channel.name}\n💬 内容: ${message.content || "（テキストなし）"}`;

        const attachments = message.attachments.map(attachment => attachment.url);
        if (attachments.length > 0) {
            logMessage += `\n🖼️ 添付画像:`;
            attachments.forEach(url => logMessage += `\n${url}`);
        }

        logChannel.send(logMessage);
    },
};
