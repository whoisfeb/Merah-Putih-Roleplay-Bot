const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType,
    MessageFlags 
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

const imageCache = new Map(); 
const SPAM_WINDOW = 10000; // 10 detik

client.once('ready', () => console.log(`Bot Guard Online: ${client.user.tag}`));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const isAdmin = message.member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id));
    if (isAdmin) return;

    const content = message.content; 
    const lowerContent = content.toLowerCase();
    
    // 1. Deteksi Link
    const hasBadLink = BAD_LINKS.some(link => lowerContent.includes(link));

    // 2. Deteksi Gambar
    const hasImage = message.attachments.some(att => att.contentType?.startsWith('image/')) || 
                     message.embeds.some(emb => emb.data.type === 'image' || emb.data.image);

    let isSpamImage = false;

    if (hasImage) {
        const now = Date.now();
        if (!imageCache.has(message.author.id)) {
            imageCache.set(message.author.id, []);
        }

        const userTimestamps = imageCache.get(message.author.id);
        const activeTimestamps = userTimestamps.filter(time => now - time < SPAM_WINDOW);
        
        activeTimestamps.push(now);
        imageCache.set(message.author.id, activeTimestamps);

        if (activeTimestamps.length > 2) {
            isSpamImage = true;
            imageCache.delete(message.author.id); // Reset cache jika terdeteksi spam
        }
    }

    // Eksekusi Pelanggaran
    if (hasBadLink || isSpamImage) {
        try {
            // JIKA LINK: Hapus pesan langsung. JIKA GAMBAR: Jangan hapus dulu!
            if (hasBadLink) {
                await message.delete().catch(() => {});
            }

            const triggerReason = hasBadLink ? 'mengandung link mencurigakan' : 'mengirim terlalu banyak gambar (Spam)';
            const titleEmbed = hasBadLink ? '🛡️ Deteksi Link' : '🖼️ Deteksi Spam Gambar';

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_human')
                        .setLabel(hasBadLink ? 'Ya, Kirim Pesan Saya' : 'Konfirmasi (Biarkan Gambar)')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('confirm_bot')
                        .setLabel(hasBadLink ? 'Bukan/Hukum Saya' : 'Batal & Hapus Gambar')
                        .setStyle(ButtonStyle.Danger)
                );

            const askEmbed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setTitle(titleEmbed)
                .setDescription(`${message.author}, pesan Anda ${triggerReason}. Klik tombol dalam 30 detik.`);

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
                    // JIKA KLIK HIJAU
                    await interaction.reply({ 
                        content: hasBadLink ? 'Pesan sedang dikirim ulang...' : 'Gambar Anda aman dan tidak dihapus.', 
                        flags: [MessageFlags.Ephemeral] 
                    }).catch(() => {});
                    
                    if (hasBadLink && content) {
                        await interaction.channel.send({ content: content }).catch(() => {});
                    }
                    
                    await sentMessage.delete().catch(() => {});
                } else {
                    // JIKA KLIK MERAH (BATAL)
                    if (isSpamImage) await message.delete().catch(() => {}); // Hapus gambarnya di sini
                    await applyAutoTimeout(message.member, sentMessage, triggerReason);
                }
            });

            collector.on('end', async (collected, reason) => {
                // JIKA DIABAIKAN (TIMEOUT TIMEOUT)
                if (!isActioned && reason === 'time') {
                    if (isSpamImage) await message.delete().catch(() => {}); // Hapus gambarnya di sini
                    await applyAutoTimeout(message.member, sentMessage, triggerReason);
                }
            });

        } catch (error) {
            console.error('[ERROR]', error);
        }
    }
});

async function applyAutoTimeout(member, botMessage, reason) {
    try {
        const duration = 30 * 60 * 1000;
        await member.timeout(duration, `Auto-mod: ${reason}`).catch(() => {});

        const timeoutEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`⚠️ ${member.user.tag} otomatis di-timeout karena ${reason}.`);

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
