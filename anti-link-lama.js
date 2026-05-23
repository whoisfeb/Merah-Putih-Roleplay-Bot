const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType,
    MessageFlags // Tambahkan ini untuk v14/v15
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

// Gunakan 'clientReady' jika Anda menggunakan versi terbaru untuk menghindari warning
client.once('ready', () => console.log(`Bot Guard Online: ${client.user.tag}`));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const isAdmin = message.member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id));
    if (isAdmin) return;

    const content = message.content; 
    const lowerContent = content.toLowerCase();
    const hasBadLink = BAD_LINKS.some(link => lowerContent.includes(link));

    if (hasBadLink) {
        try {
            await message.delete().catch(() => {});

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
                .setDescription(`${message.author}, pesan Anda mengandung link. Klik tombol di bawah atau Anda akan di-timeout dalam 30 detik.`);

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
                    return interaction.reply({ 
                        content: 'Tombol ini bukan untuk Anda!', 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                isActioned = true;
                collector.stop();

                if (interaction.customId === 'confirm_human') {
                    // 1. Balas interaksi SEGERA agar tidak "Unknown Interaction"
                    await interaction.reply({ 
                        content: 'Pesan sedang dikirim ulang...', 
                        flags: [MessageFlags.Ephemeral] 
                    }).catch(() => {});
                    
                    // 2. Kirim pesan asli
                    await interaction.channel.send({ content: content }).catch(() => {});
                    
                    // 3. Hapus tombol konfirmasi
                    await sentMessage.delete().catch(() => {});
                } else {
                    // Klik tombol merah
                    await applyAutoTimeout(message.member, sentMessage);
                }
            });

            collector.on('end', async (collected, reason) => {
                if (!isActioned && reason === 'time') {
                    await applyAutoTimeout(message.member, sentMessage);
                }
            });

        } catch (error) {
            console.error('[ERROR]', error);
        }
    }
});

async function applyAutoTimeout(member, botMessage) {
    try {
        const duration = 30 * 60 * 1000;
        await member.timeout(duration, 'Auto-mod: Link Mencurigakan').catch(() => {});

        const timeoutEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`⚠️ ${member.user.tag} otomatis di-timeout karena mengirim link mencurigakan.`);

        // Hapus tombol (components: []) agar tidak bisa diklik lagi saat proses timeout
        await botMessage.edit({ 
            content: null, 
            embeds: [timeoutEmbed], 
            components: [] 
        }).catch(() => {});
        
        setTimeout(() => {
            botMessage.delete().catch(() => {});
        }, 10000);

    } catch (err) {
        console.error('[TIMEOUT ERROR]', err);
        botMessage.delete().catch(() => {});
    }
}

client.login(CONFIG.TOKEN);
