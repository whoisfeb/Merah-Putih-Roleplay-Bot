const { EmbedBuilder } = require('discord.js');

// ============================================
// CONFIG - SESUAIKAN DENGAN SERVER ANDA
// ============================================
const KARANTINA_CONFIG = {
    KARANTINA_CHANNEL_ID: '1392382459621933114', // Channel logs karantina
    FACTION_ROLE_IDS: [
        '1392382455914172492', // role petinggi pemda
        '1392382455914172491', // role petinggi pemda
        '1392382455876550804', // role petinggi medis
        '1392382455914172490', // role petinggi resto
        '1392382455876550800', // role pemda
        '1392382455876550802', // role polda
        '1392382455876550801', // role medis
        '1392382455876550803',  // role resto
    ],
    KARANTINA_ROLE_ID: '1392382455914172494',
    TEAM_ROLE_ID: '1392382455947989066', // Role yang di-mention
};

// ============================================
// FUNCTION PARSE MESSAGE
// ============================================
function parseKarantinaMessage(content) {
    try {
        const lines = content.split('\n').map(line => line.trim());
        
        const result = {
            isValid: false,
            user: null,
            faction: null,
            waktuKarantina: null,
            reason: null
        };

        // Cek apakah pesan dimulai dengan "LOGS KARANTINA"
        if (!lines[0].toUpperCase().includes('LOGS KARANTINA')) {
            return result;
        }

        // Parse setiap line
        for (let line of lines) {
            if (line.toUpperCase().startsWith('USER :')) {
                const userPart = line.substring(6).trim();
                // Extract user ID dari mention format <@USER_ID>
                const userMatch = userPart.match(/<@!?(\d+)>/);
                if (userMatch) {
                    result.user = userMatch[1];
                } else {
                    result.user = userPart;
                }
            }
            else if (line.toUpperCase().startsWith('FACTION :')) {
                result.faction = line.substring(9).trim();
            }
            else if (line.toUpperCase().startsWith('WAKTU KARANTINA :')) {
                result.waktuKarantina = line.substring(17).trim();
            }
            else if (line.toUpperCase().startsWith('REASON :')) {
                result.reason = line.substring(8).trim();
            }
        }

        // Validasi semua field terisi
        if (result.user && result.faction && result.waktuKarantina && result.reason) {
            result.isValid = true;
        }

        return result;
    } catch (error) {
        console.error('[AUTO-KARANTINA] Error parsing message:', error);
        return { isValid: false, user: null, faction: null, waktuKarantina: null, reason: null };
    }
}

// ============================================
// SETUP AUTO KARANTINA HANDLER
// ============================================
function setupAutoKarantinaHandler(client) {
    client.on('messageCreate', async (message) => {
        try {
            // Cek apakah pesan di channel karantina
            if (message.channelId !== KARANTINA_CONFIG.KARANTINA_CHANNEL_ID) {
                return;
            }

            // Jangan proses bot messages
            if (message.author.bot) {
                return;
            }

            // Parse pesan
            const karantinaData = parseKarantinaMessage(message.content);

            if (!karantinaData.isValid) {
                return; // Format tidak valid, abaikan
            }

            console.log('[AUTO-KARANTINA] Format valid ditemukan, memproses...');

            // Get user dari guild
            const guild = message.guild;
            let targetMember = null;

            try {
                targetMember = await guild.members.fetch(karantinaData.user);
            } catch (error) {
                console.error('[AUTO-KARANTINA] User tidak ditemukan:', error.message);
                await message.reply({
                    content: `❌ User dengan ID ${karantinaData.user} tidak ditemukan di server!`
                });
                return;
            }

            if (!targetMember) {
                await message.reply({
                    content: `❌ User tidak ditemukan!`
                });
                return;
            }

            // ============================================
            // SIMPAN NAMA LAMA (untuk ditampilkan di embed)
            // ============================================
            const currentDisplayName = targetMember.nickname || targetMember.user.username;
            console.log(`[AUTO-KARANTINA] Nama saat ini: ${currentDisplayName}`);

            // Simpan nama lama yang akan ditampilkan di embed
            const oldNickname = currentDisplayName;

            // ============================================
            // NORMALISASI / EKSTRAKSI BASE NAME
            // - Jika ada '|' ambil bagian setelah '|' terakhir (kecuali prefix 'KARANTINA')
            // - Jika sudah ada prefix 'KARANTINA' (case-insensitive), ambil sisanya tapi tetap normalisasi format
            // ============================================
            let baseName = currentDisplayName;
            const parts = currentDisplayName.split('|').map(p => p.trim()).filter(p => p.length > 0);

            if (parts.length > 1) {
                // Jika bagian pertama adalah KARANTINA -> hapus prefix KARANTINA dan gunakan sisanya
                if (parts[0].toUpperCase() === 'KARANTINA') {
                    baseName = parts.slice(1).join(' | ');
                } else {
                    // Ambil bagian setelah '|' terakhir (misal "MPRP | NAMA" -> "NAMA")
                    baseName = parts[parts.length - 1];
                }
            } else {
                baseName = parts[0];
            }

            if (!baseName || baseName.trim().length === 0) {
                baseName = targetMember.user.username; // fallback ke username akun
            }
            baseName = baseName.trim();

            // Buat nickname baru dan pastikan panjang tidak melebihi 32 karakter (batas Discord)
            const prefix = 'KARANTINA | ';
            let newNickname = `${prefix}${baseName}`;
            if (newNickname.length > 32) {
                const allowed = 32 - prefix.length; // sisa untuk baseName
                baseName = baseName.slice(0, allowed);
                newNickname = `${prefix}${baseName}`;
            }

            // Jika sudah sama (setelah normalisasi), tidak perlu setNickname ulang
            if (currentDisplayName === newNickname) {
                console.log('[AUTO-KARANTINA] Nickname sudah sesuai format karantina, tidak diubah.');
            } else {
                try {
                    await targetMember.setNickname(newNickname);
                    console.log(`[AUTO-KARANTINA] Nama diubah menjadi: ${newNickname}`);
                } catch (error) {
                    console.error('[AUTO-KARANTINA] Gagal mengubah nickname:', error.message);
                }
            }

            // ============================================
            // PROSES: Hapus Role Faction
            // ============================================
            let rolesRemoved = [];
            for (const roleId of KARANTINA_CONFIG.FACTION_ROLE_IDS) {
                const role = guild.roles.cache.get(roleId);
                if (role && targetMember.roles.cache.has(roleId)) {
                    try {
                        await targetMember.roles.remove(roleId);
                        rolesRemoved.push(role.name);
                        console.log(`[AUTO-KARANTINA] Role ${role.name} dihapus dari ${targetMember.user.tag}`);
                    } catch (error) {
                        console.error(`[AUTO-KARANTINA] Gagal menghapus role ${role.name}:`, error.message);
                    }
                }
            }

            // ============================================
            // PROSES: Berikan Role Karantina
            // ============================================
            let karantinaRoleAdded = false;
            const karantinaRole = guild.roles.cache.get(KARANTINA_CONFIG.KARANTINA_ROLE_ID);
            
            if (karantinaRole) {
                try {
                    await targetMember.roles.add(KARANTINA_CONFIG.KARANTINA_ROLE_ID);
                    karantinaRoleAdded = true;
                    console.log(`[AUTO-KARANTINA] Role karantina diberikan ke ${targetMember.user.tag}`);
                } catch (error) {
                    console.error('[AUTO-KARANTINA] Gagal memberikan role karantina:', error.message);
                }
            } else {
                console.error('[AUTO-KARANTINA] Role karantina tidak ditemukan!');
            }

            // ============================================
            // BUAT EMBED KONFIRMASI
            // ============================================
            const confirmEmbed = new EmbedBuilder()
                .setColor(0xFF6B6B)
                .setTitle('✅ AUTO KARANTINA - BERHASIL DIPROSES')
                .addFields(
                    { name: '👤 User', value: `${targetMember.user.tag} (${karantinaData.user})`, inline: true },
                    { name: '🏢 Faction', value: karantinaData.faction, inline: true },
                    { name: '📝 Nama Lama', value: oldNickname, inline: false },
                    { name: '✏️ Nama Baru', value: newNickname, inline: false },
                    { name: '⏱️ Waktu Karantina', value: karantinaData.waktuKarantina, inline: false },
                    { name: '❌ Role Dihapus', value: rolesRemoved.length > 0 ? rolesRemoved.join(', ') : 'Tidak ada', inline: false },
                    { name: '✅ Role Diberikan', value: karantinaRole ? karantinaRole.name : 'Tidak ada', inline: false },
                    { name: '📝 Alasan', value: karantinaData.reason, inline: false }
                )
                .setThumbnail(targetMember.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: 'Auto Karantina System' });

            // Kirim konfirmasi ke channel (mention team role)
            await message.channel.send({
                content: `<@&${KARANTINA_CONFIG.TEAM_ROLE_ID}>`,
                embeds: [confirmEmbed]
            });

            console.log('[AUTO-KARANTINA] Proses selesai untuk user:', targetMember.user.tag);

        } catch (error) {
            console.error('[AUTO-KARANTINA] Error di handler:', error);
        }
    });

    console.log('[AUTO-KARANTINA] Handler berhasil di-setup!');
}

// ============================================
// EXPORT
// ============================================
module.exports = { setupAutoKarantinaHandler, KARANTINA_CONFIG };