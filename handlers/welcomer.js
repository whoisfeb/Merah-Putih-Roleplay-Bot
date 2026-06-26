// ==========================================
// HANDLER WELCOMER - ALL IN ONE FILE
// ==========================================

const { EmbedBuilder, ActivityType } = require('discord.js');

// GANTI ID DI BAWAH INI DENGAN ID CHANNEL WELCOME SERVER ANDA
const CHANNEL_WELCOME_ID = '1392382456589717555';

// ==========================================
// HELPER FUNCTION: UPDATE BOT STATUS REAL-TIME
// ==========================================
async function updateBotStatus(guild) {
    try {
        if (!guild) return;

        // Ambil data member terbaru agar kalkulasi akurat (menghindari cache lama)
        await guild.members.fetch();

        const totalMembers = guild.memberCount;
        const totalBots = guild.members.cache.filter(member => member.user.bot).size;
        const totalHumans = totalMembers - totalBots;

        // Mengubah status kehadiran bot menjadi PLAYING beserta rincian statistik kustom
        guild.client.user.setPresence({
            activities: [{ 
                name: 'Ottibonynyo Mods', 
                type: ActivityType.Playing,
                state: `Total: ${totalMembers} | User: ${totalHumans} | Bot: ${totalBots}`
            }],
            status: 'online',
        });
        console.log(`[STATUS UPDATE] Diperbarui otomatis -> Total: ${totalMembers} | User: ${totalHumans} | Bot: ${totalBots}`);
    } catch (err) {
        console.error('[STATUS ERROR] Gagal memperbarui status di welcomer:', err);
    }
}

// ==========================================
// MAIN HANDLER FUNCTION
// ==========================================

async function setupWelcomerHandler(client) {
    
    // ==========================================
    // EVENT: MEMBER MASUK
    // ==========================================

    client.on('guildMemberAdd', async (member) => {
        const channel = member.guild.channels.cache.get(CHANNEL_WELCOME_ID);
        
        // Panggil fungsi pembantu untuk update status
        await updateBotStatus(member.guild);

        if (!channel) {
            console.log(`⚠️ Channel welcome tidak ditemukan!`);
            return;
        }

        const totalMember = member.guild.memberCount;

        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('Merah Putih Roleplay - Welcome')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `Hey, Welcome <@${member.id}>\n\n` +
                `・ Silahkan ambil role anda di <#1392382456589717559>\n\n` +
                `・ Jika <#1392382456589717559> tidak muncul silahkan klik <#1514831379941294190>\n\n` +
                `・ Buat akun/UCP di channel <#1392382456589717561>\n\n` +
                `**Member ke:** #${totalMember}`
            )
            .setFooter({ text: `Merah Putih Roleplay • Total: ${totalMember} Member` })
            .setTimestamp();

        try {
            await channel.send({ 
                content: `Selamat datang <@${member.id}>! Kamu adalah member ke-${totalMember}`, 
                embeds: [welcomeEmbed] 
            });
            console.log(`✅ Welcome message sent untuk ${member.user.tag}`);
        } catch (err) {
            console.error("❌ Gagal mengirim pesan welcome:", err);
        }
    });

    // ==========================================
    // EVENT: MEMBER KELUAR
    // ==========================================

    client.on('guildMemberRemove', async (member) => {
        const channel = member.guild.channels.cache.get(CHANNEL_WELCOME_ID);
        
        // Panggil fungsi pembantu untuk update status
        await updateBotStatus(member.guild);

        if (!channel) {
            console.log(`⚠️ Channel log keluar tidak ditemukan!`);
            return;
        }

        const totalMember = member.guild.memberCount;

        const leaveEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Merah Putih Roleplay - Member Keluar')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `Selamat tinggal **${member.user.tag}**\n\n` +
                `Sayang sekali kamu harus pergi. Semoga harimu menyenangkan!\n\n` +
                `**Sisa Member:** ${totalMember}`
            )
            .setFooter({ text: `Merah Putih Roleplay • Total: ${totalMember} Member` })
            .setTimestamp();

        try {
            await channel.send({ 
                content: `**${member.user.tag}** baru saja meninggalkan server.`, 
                embeds: [leaveEmbed] 
            });
            console.log(`✅ Leave message sent untuk ${member.user.tag}`);
        } catch (err) {
            console.error("❌ Gagal mengirim pesan leave:", err);
        }
    });

    console.log('✅ Welcomer Handler berhasil dimuat!');
}

// ==========================================
// EXPORT HANDLER
// ==========================================

module.exports = { setupWelcomerHandler };
