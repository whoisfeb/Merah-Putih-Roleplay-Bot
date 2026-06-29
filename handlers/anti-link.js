const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType,
    MessageFlags 
} = require('discord.js');

const ADMIN_ROLE_IDS = ['112233'];
const BAD_LINKS = ["free-nitro", "discord-gift", "steam-promo", "bit.ly/badlink", "https://discord.gg", "https://discord.com", "discord.gg", "cherry-girls"];

const imageCache = new Map(); 
const SPAM_WINDOW = 10000; // 10 detik

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

module.exports = async (message, CONFIG) => {
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
            imageCache.delete(message.author.id); 
        }
    }

    // Eksekusi Pelanggaran
    if (hasBadLink || isSpamImage) {
        try {
            // Mengunci data teks asli dan mention pengirim sebelum dihapus
            const isiPesanAsli = content;
            const pengirim = message.author;

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
                .setDescription(`Pesan Anda ${triggerReason}. Klik tombol dalam 30 detik.`);

            // DISINI PERBAIKANNYA: Menampilkan teks sesuai keinginan Anda
            // PASTIKAN BARIS INI DIGANTI SEPERTI INI:
const sentMessage = await message.channel.send({
    content: `**Post by:** ${pengirim}\n\n${isiPesanAsli || '*[Hanya Gambar]*'}`,
    embeds: message.embeds.length > 0 ? message.embeds.map(e => EmbedBuilder.from(e)) : [askEmbed],
    components: [row]
});


            const collector = sentMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30000 
            });

            let isActioned = false;
            const harusHapusGambar = isSpamImage; 

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== pengirim.id) {
                    return interaction.reply({ 
                        content: 'Tombol ini bukan untuk Anda!', 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                isActioned = true;
                collector.stop();

                if (interaction.customId === 'confirm_human') {
                    await interaction.reply({ 
                        content: hasBadLink ? 'Pesan sedang dikirim ulang...' : 'Gambar Anda aman dan tidak dihapus.', 
                        flags: [MessageFlags.Ephemeral] 
                    }).catch(() => {});
                    
                    if (hasBadLink && content) {
                        await interaction.channel.send({ content: content }).catch(() => {});
                    }
                    
                    await sentMessage.delete().catch(() => {});
                } else {
                    if (harusHapusGambar) await message.delete().catch(() => {}); 
                    await applyAutoTimeout(message.member, sentMessage, triggerReason);
                }
            });

            collector.on('end', async (collected, reason) => {
                if (!isActioned && reason === 'time') {
                    if (harusHapusGambar) await message.delete().catch(() => {}); 
                    await applyAutoTimeout(message.member, sentMessage, triggerReason);
                }
            });

        } catch (error) {
            console.error('[ERROR]', error);
        }
    }
};
