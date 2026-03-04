const { Events, EmbedBuilder } = require('discord.js');
const { welcomeChannelId } = require('../config.json');
const path = require('path');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (!welcomeChannelId || welcomeChannelId === "YOUR_WELCOME_CHANNEL_ID") {
            const botLogChannel = member.guild.channels.cache.find(channel => channel.name.includes('bot-log') || channel.name.includes('log'));
            if(botLogChannel) console.log("Welcome Channel ID is not set in config.json.");
            return;
        }

        const channel = member.guild.channels.cache.get(welcomeChannelId);
        if (!channel) {
            console.error(`ID ${welcomeChannelId} の Welcome チャンネルが見つかりませんでした。`);
            return;
        }

        const accountCreationDate = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`; // 相対時間表示
        const joinDate = `<t:${Math.floor(member.joinedAt / 1000)}:F>`; // フル日付表示

        const welcomeEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('👋 新しいメンバーが参加しました！')
            .setDescription(`${member} さん、ようこそ **${member.guild.name}** へ！`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: 'ユーザー名', value: `${member.user.tag}`, inline: true },
                { name: 'ユーザーID', value: `${member.id}`, inline: true },
                { name: 'アカウント作成日', value: `${accountCreationDate}`, inline: true },
                { name: '参加日時', value: `${joinDate}`, inline: false }
            )
            .setFooter({ text: `ID: ${member.id}` })
            .setTimestamp();

        try {
            await channel.send({ embeds: [welcomeEmbed] });
        } catch (error) {
            console.error(`Failed to send welcome message: ${error}`);
        }
    },
};
