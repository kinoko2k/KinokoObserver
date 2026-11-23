const { Events, EmbedBuilder } = require('discord.js');
const { messageLogChannelId } = require('../config.json');

module.exports = [
    {
        name: Events.MessageDelete,
        async execute(message) {
            if (!message.guild || message.author?.bot || !messageLogChannelId) return;

            const logChannel = message.guild.channels.cache.get(messageLogChannelId);
            if (!logChannel) return;

            const deleteEmbed = new EmbedBuilder()
                .setColor('#FF4B4B')
                .setTitle('メッセージ削除ログ')
                .addFields(
                    {
                        name: 'ユーザー',
                        value: message.author ? `${message.author} (${message.author.tag})` : '不明',
                        inline: true,
                    },
                    {
                        name: 'チャンネル',
                        value: `${message.channel}`,
                        inline: true,
                    },
                    {
                        name: '削除された内容',
                        value: message.content ? message.content.slice(0, 1024) : '（テキストなし）',
                        inline: false,
                    }
                )
                .setFooter({
                    text: `メッセージID: ${message.id} | ユーザーID: ${message.author?.id || '不明'}`,
                })
                .setTimestamp();

            if (message.author) {
                deleteEmbed.setThumbnail(message.author.displayAvatarURL({ size: 256 }));
            }

            const attachments = message.attachments?.map(attachment => attachment.url) || [];
            if (attachments.length > 0) {
                deleteEmbed.addFields({
                    name: '削除された添付ファイル',
                    value: attachments.join('\n').slice(0, 1024),
                    inline: false,
                });
                deleteEmbed.setImage(attachments[0]);
            }

            try {
                await logChannel.send({ embeds: [deleteEmbed] });
            } catch (error) {
                console.error(`メッセージ削除ログが送信できませんでした。${error}`);
            }
        },
    },
    {
        name: Events.MessageUpdate,
        async execute(oldMessage, newMessage) {
            if (!newMessage.guild || newMessage.author?.bot || !messageLogChannelId) return;
            if (oldMessage.content === newMessage.content) return;

            const logChannel = newMessage.guild.channels.cache.get(messageLogChannelId);
            if (!logChannel) return;

            const updateEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('メッセージ編集ログ')
                .addFields(
                    {
                        name: 'ユーザー',
                        value: newMessage.author ? `${newMessage.author} (${newMessage.author.tag})` : '不明',
                        inline: true,
                    },
                    {
                        name: 'チャンネル',
                        value: `${newMessage.channel} ([メッセージへ移動](${newMessage.url}))`,
                        inline: true,
                    },
                    {
                        name: '編集前の内容',
                        value: oldMessage.content ? oldMessage.content.slice(0, 1024) : '（テキストなし / 未キャッシュ）',
                        inline: false,
                    },
                    {
                        name: '編集後の内容',
                        value: newMessage.content ? newMessage.content.slice(0, 1024) : '（テキストなし）',
                        inline: false,
                    }
                )
                .setFooter({
                    text: `メッセージID: ${newMessage.id} | ユーザーID: ${newMessage.author?.id || '不明'}`,
                })
                .setTimestamp();

            if (newMessage.author) {
                updateEmbed.setThumbnail(newMessage.author.displayAvatarURL({ size: 256 }));
            }

            try {
                await logChannel.send({ embeds: [updateEmbed] });
            } catch (error) {
                console.error(`メッセージ編集ログが送信できませんでした。${error}`);
            }
        },
    },
];
