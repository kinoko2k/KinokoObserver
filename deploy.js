const { REST, Routes } = require('discord.js');
const { applicationId, guildId, token } = require('./config.json');

const globalCommands = [
    require('./commands/bot/ping.js').data.toJSON(),
    require('./commands/minecraft/mcid.js').data.toJSON(),
    require('./commands/tools/encode.js').data.toJSON(),
    require('./commands/tools/hash.js').data.toJSON(),
    require('./commands/tools/post.js').data.toJSON(),
    require('./commands/tools/wiki.js').data.toJSON(),
    require('./commands/tools/spotify.js').data.toJSON(),
    require('./applications/report.js').data.toJSON(),
];

const guildCommands = [
    require('./commands/bot/ping.js').data.toJSON(),
    require('./commands/minecraft/mcid.js').data.toJSON(),
    require('./commands/tools/encode.js').data.toJSON(),
    require('./commands/tools/hash.js').data.toJSON(),
    require('./commands/tools/post.js').data.toJSON(),
    require('./commands/tools/wiki.js').data.toJSON(),
    require('./commands/tools/spotify.js').data.toJSON(),
    require('./applications/report.js').data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('グローバルコマンドを登録中...');
        await rest.put(
            Routes.applicationCommands(applicationId),
            { body: globalCommands },
        );
        console.log('グローバルコマンドが登録されました！');

        console.log('ギルドコマンドを登録中...');
        await rest.put(
            Routes.applicationGuildCommands(applicationId, guildId),
            { body: guildCommands },
        );
        console.log('ギルドコマンドが登録されました！');
    } catch (error) {
        console.error('コマンドの登録中にエラーが発生しました:', error);
    }
})();