const { Events } = require('discord.js');
const config = require('../config.json');
const welcomeChannelId = config.welcomeChannelId || config.welcomechannelID;

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (!welcomeChannelId || welcomeChannelId === "welcomechannelID") {
            const botLogChannel = member.guild.channels.cache.find(channel => channel.name.includes('bot-log') || channel.name.includes('log'));
            if(botLogChannel) console.log("参加メッセージ送信チャンネルIDが見つかりませんでした。");
            return;
        }

        const channel = member.guild.channels.cache.get(welcomeChannelId);
        if (!channel) {
            console.error(`${welcomeChannelId}のチャンネルIDが見つかりませんでした。`);
            return;
        }

        try {
            await channel.send(`${member}(${member.id})さんが、参加しました。`);
        } catch (error) {
            console.error(`メッセージが送信できませんでした。${error}`);
        }
    },
};
