const { REST, Routes } = require('discord.js');
const { applicationId, token, guildIds } = require('./config.json');
const fs = require('fs');
const path = require('path');

const guildCommands = [
    require('./commands/bot/about.js').data.toJSON(),
    require('./commands/bot/ping.js').data.toJSON(),
    require('./commands/minecraft/mcid.js').data.toJSON(),
    require('./commands/tools/encode.js').data.toJSON(),
    require('./commands/tools/wiki.js').data.toJSON(),
    require('./commands/tools/spotify.js').data.toJSON(),
    require("./commands/settings/setup.js").data.toJSON(),
    require("./commands/settings/suggestion.js").data.toJSON(),
];

const appPath = path.join(__dirname, 'applications');
const appFiles = fs.readdirSync(appPath).filter(file => file.endsWith('.js'));

for (const file of appFiles) {
    const command = require(path.join(appPath, file));
    if ('data' in command && 'execute' in command) {
        guildCommands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        for (const guildId of guildIds) {
            console.log(`ギルドコマンドを登録中（Guild ID: ${guildId}）...`);
            await rest.put(
                Routes.applicationGuildCommands(applicationId, guildId),
                { body: guildCommands },
            );
            console.log(`ギルドコマンドが登録されました！（Guild ID: ${guildId}）`);
        }
    } catch (error) {
        console.error('コマンドの登録中にエラーが発生しました:', error);
    }
})();
