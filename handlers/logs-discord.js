// ==========================================
// HANDLER LOGS DISCORD - ALL IN ONE FILE
// ==========================================

const { EmbedBuilder, AuditLogEvent, PermissionFlagsBits } = require('discord.js');

// GANTI ID DI BAWAH INI DENGAN ID CHANNEL LOG SERVER ANDA
const LOG_CHANNEL_ID = '1392382457751539725';

// ==========================================
// HELPER FUNCTION
// ==========================================

function sendLog(guild, embed) {
    if (!guild) return;
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
        logChannel.send({ embeds: [embed] }).catch(err =>
            console.error('❌ Gagal mengirim log:', err)
        );
    }
}

// Safety helpers to avoid Embed field/description length violations
function safeFieldValue(text, max = 1024) {
    if (text === undefined || text === null) return '*Tidak tersedia*';
    const s = String(text);
    if (s.length <= max) return s;
    return s.slice(0, max - 3) + '...';
}
function safeDescription(text, max = 4096) {
    if (text === undefined || text === null) return '';
    const s = String(text);
    if (s.length <= max) return s;
    return s.slice(0, max - 3) + '...';
}

// ==========================================
// MAIN HANDLER FUNCTION
// ==========================================

async function setupLogsHandler(client) {

    // ==========================================
    // SLASH COMMAND HANDLERS
    // ==========================================


    // ==========================================
    // 1. MANAGEMENT MESSAGES (PESAN)
    // ==========================================

    client.on('messageDelete', async (message) => {
        if (!message.guild || message.author?.bot) return;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Pesan Dihapus')
            .setColor('#e74c3c')
            .setDescription(`Pesan dikirim oleh ${message.author || 'User Tidak Diketahui'} di channel ${message.channel} telah dihapus.`)
            .addFields({ name: 'Isi Pesan', value: safeFieldValue(message.content || '*Hanya berisi gambar/file/embed atau pesan terlalu lama sehingga tidak tersimpan di cache.*') })
            .setTimestamp();
        sendLog(message.guild, embed);
    });

    client.on('messageUpdate', async (oldMessage, newMessage) => {
        if (oldMessage.partial) {
            try {
                await oldMessage.fetch();
            } catch (error) {
                console.error('❌ Gagal mengambil data pesan lama dari API:', error);
                return;
            }
        }

        if (!oldMessage.guild || oldMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const penulis = oldMessage.author ? `${oldMessage.author} (${oldMessage.author.tag})` : 'User Tidak Diketahui';

        const embed = new EmbedBuilder()
            .setTitle('✏️ Pesan Diedit')
            .setColor('#f1c40f')
            .setDescription(`Pesan dikirim oleh ${penulis} di channel ${oldMessage.channel} telah diubah.`)
            .addFields(
                { name: 'Sebelum', value: safeFieldValue(oldMessage.content || '*Teks lama tidak dapat dimuat atau berupa file/embed*') },
                { name: 'Sesudah', value: safeFieldValue(newMessage.content || '*Kosong / Hanya File*') }
            )
            .setTimestamp();

        sendLog(newMessage.guild, embed);
    });

    // ==========================================
    // 2. MANAGEMENT CHANNELS & KATEGORI
    // ==========================================

    client.on('channelCreate', async (channel) => {
        if (!channel.guild) return;
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fetchedLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate });
        const logEntry = fetchedLogs.entries.first();
        const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';
        const tipe = channel.type === 4 ? 'Kategori' : 'Channel';

        const embed = new EmbedBuilder()
            .setTitle(`🆕 ${tipe} Dibuat`)
            .setColor('#2ecc71')
            .setDescription(`${tipe} bernama **${channel.name}** (<#${channel.id}>) telah dibuat oleh **${executor}**.`)
            .setTimestamp();
        sendLog(channel.guild, embed);
    });

    client.on('channelDelete', async (channel) => {
        if (!channel.guild) return;
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fetchedLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
        const logEntry = fetchedLogs.entries.first();
        const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';
        const tipe = channel.type === 4 ? 'Kategori' : 'Channel';

        const embed = new EmbedBuilder()
            .setTitle(`🗑️ ${tipe} Dihapus`)
            .setColor('#e74c3c')
            .setDescription(`${tipe} bernama **${channel.name}** telah dihapus oleh **${executor}**.`)
            .setTimestamp();
        sendLog(channel.guild, embed);
    });

    client.on('channelUpdate', async (oldChannel, newChannel) => {
        if (!oldChannel.guild) return;
        await new Promise(resolve => setTimeout(resolve, 1000));

        const embed = new EmbedBuilder().setTimestamp().setColor('#f1c40f');
        const tipeKonten = oldChannel.type === 4 ? 'Kategori' : 'Channel';

        // A. Deteksi Perubahan Izin (Permission Overwrites)
        if (!oldChannel.permissionOverwrites.cache.equals(newChannel.permissionOverwrites.cache)) {
            const oldPerms = oldChannel.permissionOverwrites.cache;
            const newPerms = newChannel.permissionOverwrites.cache;

            if (oldPerms.size === newPerms.size && oldPerms.size > 0) {
                let adaPerubahanReal = false;

                for (const [key, oldPerm] of oldPerms) {
                    const newPerm = newPerms.get(key);
                    if (!newPerm) {
                        adaPerubahanReal = true;
                        break;
                    }
                    if (oldPerm.allow.bitfield !== newPerm.allow.bitfield ||
                        oldPerm.deny.bitfield !== newPerm.deny.bitfield) {
                        adaPerubahanReal = true;
                        break;
                    }
                }

                if (!adaPerubahanReal) {
                    console.log(`⏭️ Skip: Tidak ada perubahan permission yang signifikan di ${newChannel.name}`);
                } else {
                    const fetchedLogs = await oldChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelOverwriteUpdate });
                    const logEntry = fetchedLogs.entries.first();

                    if (!logEntry) {
                        console.log(`⏭️ Skip: Permission berubah tapi tidak ada di audit log`);
                    } else {
                        const executor = logEntry.executor.tag;
                        embed.setTitle(`🔒 Izin (Permission) ${tipeKonten} Diubah`)
                            .setColor('#e67e22')
                            .setDescription(`Hak akses pengaturan pada channel ${newChannel} telah dimodifikasi.`)
                            .addFields(
                                { name: 'Target Saluran', value: safeFieldValue(`**${newChannel.name}**`) },
                                { name: 'Diubah Oleh', value: safeFieldValue(`**${executor}**`) },
                                { name: 'Catatan', value: safeFieldValue('*Periksa pengaturan channel secara langsung untuk melihat detail role/member yang diubah.*') }
                            );
                        sendLog(newChannel.guild, embed);
                    }
                }
            } else if (oldPerms.size !== newPerms.size) {
                const fetchedLogs = await oldChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelOverwriteUpdate });
                const logEntry = fetchedLogs.entries.first();

                if (!logEntry) {
                    console.log(`⏭️ Skip: Permission overwrite berubah tapi tidak ada di audit log`);
                } else {
                    const executor = logEntry.executor.tag;
                    embed.setTitle(`🔒 Izin (Permission) ${tipeKonten} Diubah`)
                        .setColor('#e67e22')
                        .setDescription(`Hak akses pengaturan pada channel ${newChannel} telah dimodifikasi.`)
                        .addFields(
                            { name: 'Target Saluran', value: safeFieldValue(`**${newChannel.name}**`) },
                            { name: 'Diubah Oleh', value: safeFieldValue(`**${executor}**`) },
                            { name: 'Catatan', value: safeFieldValue('*Periksa pengaturan channel secara langsung untuk melihat detail role/member yang diubah.*') }
                        );
                    sendLog(newChannel.guild, embed);
                }
            }
            return;
        }

        // B. Deteksi Perubahan Nama
        if (oldChannel.name !== newChannel.name) {
            const fetchedLogs = await oldChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelUpdate });
            const updateLog = fetchedLogs.entries.first();
            const executor = updateLog ? updateLog.executor.tag : 'Tidak diketahui';

            embed.setTitle(`✏️ Nama ${tipeKonten} Diubah`)
                .setDescription(`Perubahan nama pada ${newChannel}`)
                .addFields(
                    { name: 'Nama Lama', value: safeFieldValue(oldChannel.name), inline: true },
                    { name: 'Nama Baru', value: safeFieldValue(newChannel.name), inline: true },
                    { name: 'Pengubah', value: safeFieldValue(executor) }
                );
            sendLog(newChannel.guild, embed);
        }

        // C. Deteksi Perpindahan Kategori Induk
        if (oldChannel.parentId !== newChannel.parentId) {
            const fetchedLogs = await oldChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelUpdate });
            const updateLog = fetchedLogs.entries.first();
            const executor = updateLog ? updateLog.executor.tag : 'Tidak diketahui';

            const katLama = oldChannel.parent ? oldChannel.parent.name : 'Tanpa Kategori';
            const katBaru = newChannel.parent ? newChannel.parent.name : 'Tanpa Kategori';

            embed.setTitle(`📂 Perpindahan Kategori ${tipeKonten}`)
                .setDescription(`Posisi kategori ${newChannel} telah bergeser.`)
                .addFields(
                    { name: 'Kategori Lama', value: safeFieldValue(katLama), inline: true },
                    { name: 'Kategori Baru', value: safeFieldValue(katBaru), inline: true },
                    { name: 'Pengubah', value: safeFieldValue(executor) }
                );
            sendLog(newChannel.guild, embed);
        }
    });

    // ==========================================
    // 3. MANAGEMENT MEMBERS & MODERASI
    // ==========================================

    client.on('guildMemberAdd', (member) => {
        const embed = new EmbedBuilder()
            .setTitle('📥 Member Masuk')
            .setColor('#2ecc71')
            .setDescription(`${member} (${member.user.tag}) telah bergabung ke dalam server.`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields({ name: 'ID Pengguna', value: safeFieldValue(member.id) })
            .setTimestamp();
        sendLog(member.guild, embed);
    });

    client.on('guildMemberRemove', async (member) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
        const kickLog = fetchedLogs.entries.first();

        let deskripsi = `${member.user.tag} telah meninggalkan server secara mandiri.`;
        let judul = '📤 Member Keluar';
        let warna = '#95a5a6';

        if (kickLog && kickLog.target.id === member.id && (Date.now() - kickLog.createdTimestamp < 5000)) {
            judul = '🥾 Member Ditendang (Kick)';
            warna = '#e67e22';
            deskripsi = `${member} (${member.user.tag}) telah ditendang oleh **${kickLog.executor.tag}**.\n**Alasan:** ${kickLog.reason || 'Tidak ada alasan'}`;
        }

        const embed = new EmbedBuilder().setTitle(judul).setColor(warna).setDescription(safeDescription(deskripsi)).setTimestamp();
        sendLog(member.guild, embed);
    });

    client.on('guildBanAdd', async (ban) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
        const banLog = fetchedLogs.entries.first();
        const executor = banLog ? banLog.executor.tag : 'Tidak diketahui';
        const alasan = banLog ? banLog.reason : 'Tidak ada alasan';

        const embed = new EmbedBuilder()
            .setTitle('🔨 Member Di-Ban')
            .setColor('#d32f2f')
            .setDescription(`${ban.user} (${ban.user.tag}) telah dibanned secara permanen.`)
            .addFields(
                { name: 'Eksekutor', value: safeFieldValue(executor), inline: true },
                { name: 'Alasan', value: safeFieldValue(alasan), inline: true }
            )
            .setTimestamp();
        sendLog(ban.guild, embed);
    });

    client.on('guildBanRemove', async (ban) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove });
        const logEntry = fetchedLogs.entries.first();
        const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';

        const embed = new EmbedBuilder()
            .setTitle('🔓 Blokir Dicabut (Unban)')
            .setColor('#2ecc71')
            .setDescription(`${ban.user.tag} telah di-unban oleh **${executor}**.`)
            .setTimestamp();
        sendLog(ban.guild, embed);
    });

    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        if (oldMember.partial) await oldMember.fetch();

        const embed = new EmbedBuilder().setTimestamp().setColor('#3498db');
        let adaPerubahan = false;

        if (oldMember.nickname !== newMember.nickname) {
            adaPerubahan = true;
            const namaLama = oldMember.nickname || oldMember.user.username;
            const namaBaru = newMember.nickname || newMember.user.username;

            embed.setTitle('🏷️ Perubahan Nama Panggilan Server')
                .setDescription(`Nama panggilan server ${newMember} telah diubah.`)
                .addFields(
                    { name: 'Semula', value: safeFieldValue(`\`${namaLama}\``), inline: true },
                    { name: 'Menjadi', value: safeFieldValue(`\`${namaBaru}\``), inline: true }
                );
        }

        if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
            if (newMember.communicationDisabledUntilTimestamp) {
                adaPerubahan = true;
                const waktuSelesai = new Date(newMember.communicationDisabledUntilTimestamp).toLocaleString('id-ID');
                embed.setTitle('🤫 Member Di-Timeout')
                    .setColor('#e67e22')
                    .setDescription(`${newMember} (${newMember.user.tag}) telah dibungkam (Timeout) sampai **${waktuSelesai}**.`);
            } else {
                adaPerubahan = true;
                embed.setTitle('🔊 Timeout Berakhir')
                    .setColor('#2ecc71')
                    .setDescription(`Masa hukuman Timeout ${newMember} telah dicabut atau selesai.`);
            }
        }

        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        if (oldRoles.size !== newRoles.size) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const fetchedLogs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
            const roleLog = fetchedLogs.entries.first();
            const executor = roleLog ? roleLog.executor : 'Tidak diketahui';

            const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
            const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

            if (addedRoles.size > 0) {
                adaPerubahan = true;
                embed.setTitle('🛡️ Role Diberikan')
                    .setColor('#2ecc71')
                    .setDescription(`Role baru telah ditambahkan ke ${newMember}`)
                    .addFields(
                        { name: 'Role yang Diberi', value: safeFieldValue(addedRoles.map(r => `${r}`).join(', ')) },
                        { name: 'Diberikan Oleh', value: safeFieldValue(`${executor}`) }
                    );
            }

            if (removedRoles.size > 0) {
                adaPerubahan = true;
                embed.setTitle('❌ Role Dicabut')
                    .setColor('#e74c3c')
                    .setDescription(`Role telah dicabut dari ${newMember}`)
                    .addFields(
                        { name: 'Role yang Dicabut', value: safeFieldValue(removedRoles.map(r => `${r}`).join(', ')) },
                        { name: 'Dicabut Oleh', value: safeFieldValue(`${executor}`) }
                    );
            }
        }

        if (adaPerubahan) sendLog(newMember.guild, embed);
    });

    client.on('userUpdate', async (oldUser, newUser) => {
        if (oldUser.username !== newUser.username || oldUser.displayName !== newUser.displayName) {
            const embed = new EmbedBuilder()
                .setTitle('🌍 Perubahan Profil Akun Global')
                .setColor('#9b59b6')
                .setDescription(`User ${newUser} telah memperbarui informasi akun globalnya.`)
                .setTimestamp();

            if (oldUser.username !== newUser.username) {
                embed.addFields(
                    { name: 'Username Lama', value: safeFieldValue(`\`@${oldUser.username}\``), inline: true },
                    { name: 'Username Baru', value: safeFieldValue(`\`@${newUser.username}\``), inline: true }
                );
            }

            if (oldUser.displayName !== newUser.displayName) {
                embed.addFields(
                    { name: 'Display Name Lama', value: safeFieldValue(`\`${oldUser.displayName}\``), inline: true },
                    { name: 'Display Name Baru', value: safeFieldValue(`\`${newUser.displayName}\``), inline: true }
                );
            }

            client.guilds.cache.forEach(guild => {
                if (guild.members.cache.has(newUser.id)) {
                    sendLog(guild, embed);
                }
            });
        }
    });

    // ==========================================
    // 4. MANAGEMENT ROLES (HAK AKSES / WARNA ROLE)
    // ==========================================

    client.on('roleCreate', async (role) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fetchedLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate });
        const logEntry = fetchedLogs.entries.first();
        const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';

        const embed = new EmbedBuilder()
            .setTitle('➕ Role Baru Dibuat')
            .setColor('#2ecc71')
            .setDescription(`Role **${role.name}** telah dibuat oleh **${executor}**.`)
            .setTimestamp();
        sendLog(role.guild, embed);
    });

    client.on('roleDelete', async (role) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fetchedLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
        const logEntry = fetchedLogs.entries.first();
        const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';

        const embed = new EmbedBuilder()
            .setTitle('🔥 Role Dihapus')
            .setColor('#e74c3c')
            .setDescription(`Role **${role.name}** telah dihapus oleh **${executor}**.`)
            .setTimestamp();
        sendLog(role.guild, embed);
    });

    client.on('roleUpdate', async (oldRole, newRole) => {
        if (!oldRole.guild) return;

        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const fetchedLogs = await oldRole.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleUpdate });
            const logEntry = fetchedLogs.entries.first();
            const executor = logEntry ? logEntry.executor.tag : 'Tidak diketahui';

            const oldPerms = oldRole.permissions.toArray();
            const newPerms = newRole.permissions.toArray();

            const permsDitambahkan = newPerms.filter(p => !oldPerms.includes(p));
            const permsDihapus = oldPerms.filter(p => !newPerms.includes(p));

            const embed = new EmbedBuilder()
                .setTitle('🛠️ Izin (Permission) Global Role Diubah')
                .setColor('#9b59b6')
                .setDescription(`Hak akses global untuk role ${newRole} telah diperbarui oleh **${executor}**.`)
                .setTimestamp();

            if (permsDitambahkan.length > 0) {
                embed.addFields({ name: '🟢 Izin Ditambahkan', value: safeFieldValue(`\`${permsDitambahkan.join(', ')}\``) });
            }
            if (permsDihapus.length > 0) {
                embed.addFields({ name: '🔴 Izin Dicabut/Dihapus', value: safeFieldValue(`\`${permsDihapus.join(', ')}\``) });
            }

            sendLog(newRole.guild, embed);
        }
    });

    // ==========================================
    // 5. MANAGEMENT VOICE (AKTIVITAS SUARA)
    // ==========================================

    client.on('voiceStateUpdate', (oldState, newState) => {
        const member = newState.member;
        const embed = new EmbedBuilder().setTimestamp();

        if (!oldState.channelId && newState.channelId) {
            embed.setTitle('🎙️ Masuk Voice Channel')
                .setColor('#2ecc71')
                .setDescription(`${member} (${member.user.tag}) telah masuk ke voice channel <#${newState.channelId}>.`);
            sendLog(newState.guild, embed);
        }
        else if (oldState.channelId && !newState.channelId) {
            embed.setTitle('🔇 Keluar Voice Channel')
                .setColor('#e74c3c')
                .setDescription(`${member} (${member.user.tag}) telah meninggalkan voice channel <#${oldState.channelId}>.`);
            sendLog(oldState.guild, embed);
        }
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            embed.setTitle('🔀 Pindah Voice Channel')
                .setColor('#34495e')
                .setDescription(`${member} (${member.user.tag}) berpindah ruangan voice.`)
                .addFields(
                    { name: 'Dari Room', value: safeFieldValue(`<#${oldState.channelId}>`), inline: true },
                    { name: 'Ke Room', value: safeFieldValue(`<#${newState.channelId}>`), inline: true }
                );
            sendLog(newState.guild, embed);
        }
    });

    console.log('✅ Logs Handler berhasil dimuat!');
}

// ==========================================
// EXPORT HANDLER
// ==========================================

module.exports = { setupLogsHandler };