const {
    Client,
    Events,
    GatewayIntentBits,
    SimpleShardingStrategy,
    EmbedBuilder,
} = require("discord.js");
const { token } = require("./config.json");
// const { sequelize, Guild } = require('./models');

const commands = [
    require("./commands/bot/help.js"),
    require("./commands/bot/about.js"),
    require("./app/report.js"),
];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
    ],
});

client.once(Events.ClientReady, async (c) => {
    console.log(`準備OKです! ${c.user.tag}がログインします。`);

    client.user.setPresence({
        activities: [{ name: "/", type: "PLAYING" }],
        status: "online",
    });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (
        !interaction.isChatInputCommand() &&
        !interaction.isMessageContextMenuCommand()
    )
        return;

    const command = commands.find(
        (cmd) => cmd.data.name === interaction.commandName
    );

    if (command) {
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "コマンド実行時にエラーになりました。",
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: "コマンド実行時にエラーになりました。",
                    ephemeral: true,
                });
            }
        }
    } else {
        console.error(
            `${interaction.commandName}というコマンドには対応していません。`
        );
    }
});

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.id === "302050872383242240") {
        if (
            message.embeds[0] &&
            message.embeds[0].color === 2406327 &&
            message.embeds[0].url === "https://disboard.org/" &&
            (message.embeds[0].description.match(/表示順をアップしたよ/) ||
                message.embeds[0].description.match(/Bump done/) ||
                message.embeds[0].description.match(/Bump effectué/) ||
                message.embeds[0].description.match(/Bump fatto/) ||
                message.embeds[0].description.match(/Podbito serwer/) ||
                message.embeds[0].description.match(/Успешно поднято/) ||
                message.embeds[0].description.match(/갱신했어/) ||
                message.embeds[0].description.match(/Patlatma tamamlandı/))
        ) {
            const guild = await Guild.findByPk(message.guild.id);

            if (guild && guild.bump === 1) {
                const m = await message.channel.send("ここメッセージ");
                setTimeout(() => {
                    m.delete();
                }, 7200000);

                setTimeout(() => {
                    message.channel.send("ここメッセージ");
                }, 7200000);
            }
        }
    }
});

client.login(token);
