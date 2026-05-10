const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    CLIENT_ID: '1496812134141526096', 
    GUILD_ID: '1392382455876550796',
};

const ADMIN_ROLE_IDS = [
    '1392382455981412398',
    '1392382455981412393',
    '1392382455981412397',
    '1392382455947989066'
];

const BAD_LINKS = ["free-nitro", "discord-gift", "steam-promo", "bit.ly/badlink", "https://discord.gg/", "https://discord.com/invite", "discord.gg", "cherry-girls"];

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // --- CEK APAKAH USER ADALAH ADMIN ---
    const isAdmin = message.member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id));
    
    // Jika admin yang mengirim link, abaikan (tidak dihapus/timeout)
    if (isAdmin) return;

    const content = message.content.toLowerCase();
    const hasBadLink = BAD_LINKS.some(link => content.includes(link));

    if (hasBadLink) {
        try {
            await message.delete();

            const duration = 30 * 60 * 1000; // 30 Menit
            await message.member.timeout(duration, 'Auto-mod: Link Phishing');

            const warningEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`⚠️ ${message.author.tag} otomatis di-timeout karena mengirim link mencurigakan.`);

            const sentMessage = await message.channel.send({ embeds: [warningEmbed] });
            setTimeout(() => sentMessage.delete(), 10000);

        } catch (error) {
            console.error('Error:', error);
        }
    }
});

client.login(CONFIG.TOKEN);
