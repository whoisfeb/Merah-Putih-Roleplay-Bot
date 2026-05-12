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
    if (isAdmin) return;

    const content = message.content.toLowerCase();
    const hasBadLink = BAD_LINKS.some(link => content.includes(link));

    if (hasBadLink) {
        try {
            // Hapus pesan yang mengandung link berbahaya segera
            await message.delete();

            // Membuat Tombol Konfirmasi
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_human')
                        .setLabel('Ya, Saya Manusia')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('confirm_bot')
                        .setLabel('Bukan/Hukum Saya')
                        .setStyle(ButtonStyle.Danger)
                );

            const askEmbed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setTitle('🛡️ Deteksi Link Berbahaya')
                .setDescription(`${message.author}, pesan Anda mengandung link yang dilarang.\n\nJika Anda **manusia**, silakan klik tombol **Ya** dalam 30 detik untuk menghindari timeout.\n\nJika diklik **Bukan** atau **Diabaikan**, Anda akan di-timeout otomatis.`);

            const sentMessage = await message.channel.send({
                content: `${message.author}`,
                embeds: [askEmbed],
                components: [row]
            });

            // Membuat kolektor untuk menangani klik tombol
            const collector = sentMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30000 // Waktu tunggu 30 detik
            });

            let isActioned = false;

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: 'Tombol ini bukan untuk Anda!', ephemeral: true });
                }

                isActioned = true;

                if (interaction.customId === 'confirm_human') {
                    // Jika klik YES
                    await interaction.reply({ content: 'Konfirmasi diterima. Jangan ulangi mengirim link tersebut!', ephemeral: true });
                    await sentMessage.delete().catch(() => {});
                    collector.stop();
                } else {
                    // Jika klik NO
                    await interaction.deferUpdate();
                    await applyAutoTimeout(message.member, sentMessage);
                    collector.stop();
                }
            });

            collector.on('end', async () => {
                // Jika waktu habis (diabaikan)
                if (!isActioned) {
                    await applyAutoTimeout(message.member, sentMessage);
                }
            });

        } catch (error) {
            console.error('Error:', error);
        }
    }
});

// Fungsi pembantu untuk menerapkan timeout
async function applyAutoTimeout(member, botMessage) {
    try {
        const duration = 30 * 60 * 1000; // 30 Menit
        await member.timeout(duration, 'Auto-mod: Gagal verifikasi/Spam link');

        const timeoutEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`🚫 **${member.user.tag}** otomatis di-timeout (30 menit) karena terdeteksi sebagai bot/spam.`);

        await botMessage.edit({ embeds: [timeoutEmbed], components: [] });
        
        // Hapus pesan bot setelah 10 detik
        setTimeout(() => botMessage.delete().catch(() => {}), 10000);
    } catch (err) {
        console.error('Gagal Timeout:', err);
    }
}

client.once('ready', () => {
    console.log(`Bot login sebagai ${client.user.tag}`);
});

client.login(CONFIG.TOKEN);
