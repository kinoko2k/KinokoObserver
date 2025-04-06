const { REST, Routes } = require('discord.js');

const helpFile = require('./commands/bot/help.js');
const aboutFile = require('./commands/bot/about.js');
const { applicationId, guildId, token } = require('./config.json');


const commands = [
    helpFile.data.toJSON(),
    aboutFile.data.toJSON()
    ];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('サーバー固有のコマンドを登録中...');
        await rest.put(
            Routes.applicationGuildCommands(applicationId, guildId),
            { body: commands },
        );
        console.log('サーバー固有のコマンドが登録されました！');
    } catch (error) {
        console.error('コマンドの登録中にエラーが発生しました:', error);
    }
})();