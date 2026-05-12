const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType 
} = require('discord.js');

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

const ADMIN_ROLE_IDS = ['1392382455981412398', '1392382455981412393', '1392382455981412397', '1392382455947989066'];
const BAD_LINKS = ["free-nitro", "discord-gift", "steam-promo", "bit.ly/badlink", "https://discord.gg", "https://discord.com", "discord.gg", "cherry-girls"];

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const isAdmin = message.member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id));
    if (isAdmin) return;

    const content = message.content; 
    const lowerContent = content.toLowerCase();
    const hasBadLink = BAD_LINKS.some(link => lowerContent.includes(link));

    if (hasBadLink) {
        try {
            await message.delete();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_human')
                        .setLabel('Ya, Kirim Pesan Saya')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('confirm_bot')
                        .setLabel('Bukan/Hukum Saya')
                        .setStyle(ButtonStyle.Danger)
                );

            const askEmbed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setTitle('🛡️ Deteksi Link')
                .setDescription(`${message.author}, pesan Anda terdeteksi mengandung link. Klik tombol di bawah jika Anda ingin tetap mengirimnya.`);

            const sentMessage = await message.channel.send({
                content: `${message.author}`,
                embeds: [askEmbed],
                components: [row]
            });

            const collector = sentMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30000 
            });

            let isActioned = false;

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: 'Tombol ini bukan untuk Anda!', ephemeral: true });
                }

                isActioned = true;

                if (interaction.customId === 'confirm_human') {
                    // Mengirim ulang pesan original saja
                    await interaction.channel.send({ content: content });
                    
                    await interaction.reply({ content: 'Pesan terkirim.', ephemeral: true });
                    await sentMessage.delete().catch(() => {});
                    collector.stop();
                } else {
                    await interaction.deferUpdate();
                    await applyAutoTimeout(message.member, sentMessage);
                    collector.stop();
                }
            });

            collector.on('end', async () => {
                if (!isActioned) {
                    await applyAutoTimeout(message.member, sentMessage);
                }
            });

        } catch (error) {
            console.error('Error:', error);
        }
    }
});

async function applyAutoTimeout(member, botMessage) {
    try {
        const duration = 30 * 60 * 1000;
        await member.timeout(duration, 'Auto-mod: Gagal verifikasi link');

        const timeoutEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`🚫 **${member.user.tag}** di-timeout otomatis karena terdeteksi sebagai spam.`);

        await botMessage.edit({ embeds: [timeoutEmbed], components: [] });
        setTimeout(() => botMessage.delete().catch(() => {}), 5000);
    } catch (err) {
        console.error('Gagal Timeout:', err);
    }
}

client.once('ready', () => console.log(`Bot online: ${client.user.tag}`));
client.login(CONFIG.TOKEN);
