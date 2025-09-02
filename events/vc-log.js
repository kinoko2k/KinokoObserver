const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

// VC参加時間を記録するためのMap
const voiceSessions = new Map();

module.exports = {
    name: 'voiceLogger',

    /**
     * VC状態変更時のログ処理
     * @param {VoiceState} oldState - 変更前のボイス状態
     * @param {VoiceState} newState - 変更後のボイス状態
     */
    async logVoiceStateUpdate(oldState, newState) {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return; // ボットは除外

        const guild = newState.guild || oldState.guild;
        const logChannel = guild.channels.cache.get(config.voiceLogChannelId);

        if (!logChannel) {
            console.error('VCログチャンネルが見つかりません。');
            return;
        }

        const now = new Date();
        const timestamp = Math.floor(now.getTime() / 1000);

        // VC参加の場合
        if (!oldState.channel && newState.channel) {
            // 参加時間を記録
            voiceSessions.set(member.id, {
                joinTime: now,
                channelName: newState.channel.name
            });

            const joinEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // 緑色
                .setTitle('📞 VC参加ログ')
                .setDescription(`${member.displayName}さんが **${newState.channel.name}** に参加しました！`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setTimestamp(now)
                .setFooter({ text: `<t:${timestamp}:F>` });

            await logChannel.send({ embeds: [joinEmbed] });
        }
        // VC退出の場合
        else if (oldState.channel && !newState.channel) {
            const session = voiceSessions.get(member.id);
            let durationText = '時間不明';

            if (session) {
                const duration = now - session.joinTime;
                const hours = Math.floor(duration / (1000 * 60 * 60));
                const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((duration % (1000 * 60)) / 1000);

                if (hours > 0) {
                    durationText = `${hours}時間${minutes}分${seconds}秒`;
                } else if (minutes > 0) {
                    durationText = `${minutes}分${seconds}秒`;
                } else {
                    durationText = `${seconds}秒`;
                }

                // セッション情報を削除
                voiceSessions.delete(member.id);
            }

            const leaveEmbed = new EmbedBuilder()
                .setColor(0xFF0000) // 赤色
                .setTitle('📞 VC退出ログ')
                .setDescription(`${member.displayName}さんが **${oldState.channel.name}** から退出しました。`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setTimestamp(now)
                .setFooter({ text: `接続時間: ${durationText} | <t:${timestamp}:F>` });

            await logChannel.send({ embeds: [leaveEmbed] });
        }
        // チャンネル移動の場合
        else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            // 移動時は前のチャンネルの情報を更新
            const session = voiceSessions.get(member.id);
            if (session) {
                session.channelName = newState.channel.name;
            } else {
                // セッション情報がない場合は新規作成
                voiceSessions.set(member.id, {
                    joinTime: now,
                    channelName: newState.channel.name
                });
            }

            const moveEmbed = new EmbedBuilder()
                .setColor(0xFFFF00) // 黄色
                .setTitle('📞 VCチャンネル移動ログ')
                .setDescription(`${member.displayName}さんが **${oldState.channel.name}** から **${newState.channel.name}** に移動しました。`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setTimestamp(now)
                .setFooter({ text: `<t:${timestamp}:F>` });

            await logChannel.send({ embeds: [moveEmbed] });
        }
    },

    /**
     * ボット起動時にVC接続中のユーザーの情報を初期化
     * @param {Client} client - Discordクライアント
     */
    async initializeVoiceSessions(client) {
        for (const guild of client.guilds.cache.values()) {
            for (const channel of guild.channels.cache.values()) {
                if (channel.type === 2 && channel.members) { // VoiceChannel
                    for (const member of channel.members.values()) {
                        if (!member.user.bot) {
                            voiceSessions.set(member.id, {
                                joinTime: new Date(),
                                channelName: channel.name
                            });
                        }
                    }
                }
            }
        }
        console.log('VCセッション情報を初期化しました。');
    }
};