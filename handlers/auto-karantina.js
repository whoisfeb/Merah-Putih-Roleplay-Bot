const { EmbedBuilder } = require('discord.js');

// ============================================
// CONFIG - SESUAIKAN DENGAN SERVER ANDA
// ============================================
const KARANTINA_CONFIG = {
    KARANTINA_CHANNEL_ID: '1392382459621933114',
    FACTION_ROLE_IDS: [
        '1392382455914172492',
        '1392382455914172491',
        '1392382455876550804',
        '1392382455914172490',
        '1392382455876550800',
        '1392382455876550802',
        '1392382455876550801',
        '1392382455876550803',
    ],
    KARANTINA_ROLE_ID: '1392382455914172494',
    TEAM_ROLE_ID: '1392382455947989066',
};

// ============================================
// FUNCTION PARSE MESSAGE (support multiple users)
// ============================================
function parseKarantinaMessage(content) {
    try {
        const lines = content.split('\n').map(line => line.trim());

        const result = {
            isValid: false,
            users: [],
            faction: null,
            waktuKarantina: null,
            reason: null
        };

        if (!lines[0] || !lines[0].toUpperCase().includes('LOGS KARANTINA')) {
            return result;
        }

        for (let line of lines) {
            if (line.toUpperCase().startsWith('USER :')) {
                const userPart = line.substring(6).trim();

                // 1) Cari semua mention <@123> atau <@!123>
                const mentionRegex = /<@!?\s*(\d{5,20})\s*>/g;
                const mentionMatches = [];
                let m;
                while ((m = mentionRegex.exec(userPart)) !== null) {
                    mentionMatches.push(m[1]);
                }

                if (mentionMatches.length > 0) {
                    result.users = mentionMatches;
                } else {
                    // 2) fallback: split by whitespace/comma; ambil token yang berupa angka (ID) atau username/tag
                    const parts = userPart.split(/[,\s]+/).map(p => p.trim()).filter(Boolean);
                    // prefer numeric parts as IDs
                    const ids = parts.filter(p => /^\d{5,20}$/.test(p));
                    if (ids.length > 0) {
                        result.users = ids;
                    } else {
                        // treat remaining parts as textual identifiers
                        result.users = parts;
                    }
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

        if (result.users.length > 0 && result.faction && result.waktuKarantina && result.reason) {
            result.isValid = true;
        }

        return result;
    } catch (error) {
        console.error('[AUTO-KARANTINA] Error parsing message:', error);
        return { isValid: false, users: [], faction: null, waktuKarantina: null, reason: null };
    }
}

// ============================================
// SETUP AUTO KARANTINA HANDLER
// ============================================
function setupAutoKarantinaHandler(client) {
    client.on('messageCreate', async (message) => {
        try {
            if (message.channelId !== KARANTINA_CONFIG.KARANTINA_CHANNEL_ID) return;
            if (message.author.bot) return;

            const karantinaData = parseKarantinaMessage(message.content);

            console.log('[AUTO-KARANTINA] Format valid ditemukan, memproses...');
            console.log('[AUTO-KARANTINA] Parsed users:', karantinaData.users);

            if (!karantinaData.isValid) return;

            const guild = message.guild;
            const results = [];

            for (const userIdentifier of karantinaData.users) {
                console.log(`\n[AUTO-KARANTINA] ========== Processing: ${userIdentifier} ==========`);
                
                const res = {
                    identifier: userIdentifier,
                    found: false,
                    tag: null,
                    oldNickname: null,
                    newNickname: null,
                    rolesRemoved: [],
                    karantinaRoleAdded: false,
                    error: null
                };

                let member = null;
                try {
                    // Try fetch by ID (if numeric)
                    if (/^\d+$/.test(userIdentifier)) {
                        try {
                            console.log(`[AUTO-KARANTINA] Attempting fetch by ID...`);
                            member = await guild.members.fetch(userIdentifier);
                            console.log(`[AUTO-KARANTINA] ✅ Fetch by ID success`);
                        } catch (err) {
                            console.log(`[AUTO-KARANTINA] ❌ Fetch by ID failed: ${err.code} - ${err.message}`);
                            member = null;
                        }
                    }

                    // fallback: search cache by username, tag, or nickname (case-insensitive)
                    if (!member) {
                        console.log(`[AUTO-KARANTINA] Searching in cache...`);
                        const lower = userIdentifier.toLowerCase();
                        member = guild.members.cache.find(m => {
                            const username = m.user.username.toLowerCase();
                            const tag = `${m.user.username}#${m.user.discriminator}`.toLowerCase();
                            const nick = (m.nickname || '').toLowerCase();
                            return username === lower || tag === lower || nick === lower;
                        }) || null;

                        if (member) {
                            console.log(`[AUTO-KARANTINA] ✅ Found in cache: ${member.user.tag}`);
                        } else {
                            console.log(`[AUTO-KARANTINA] ❌ NOT found in cache`);
                        }
                    }

                    if (!member) {
                        console.log(`[AUTO-KARANTINA] ⚠️  Member tidak ditemukan, SKIP`);
                        res.error = 'Member tidak ditemukan di guild';
                        results.push(res);
                        continue;
                    }

                    res.found = true;
                    res.tag = member.user.tag;

                    // old nickname
                    const currentDisplayName = member.nickname || member.user.username;
                    res.oldNickname = currentDisplayName;

                    // compute baseName and newNickname (normalize existing '|' and prefix)
                    let parts = currentDisplayName.split('|').map(p => p.trim()).filter(Boolean);
                    let baseName;
                    if (parts.length > 1) {
                        if (parts[0].toUpperCase() === 'KARANTINA') {
                            baseName = parts.slice(1).join(' | ');
                        } else {
                            baseName = parts[parts.length - 1];
                        }
                    } else {
                        baseName = parts[0];
                    }
                    if (!baseName) baseName = member.user.username;
                    baseName = baseName.trim();
                    const prefix = 'KARANTINA | ';
                    let newNick = `${prefix}${baseName}`;
                    if (newNick.length > 32) {
                        const allowed = 32 - prefix.length;
                        baseName = baseName.slice(0, allowed);
                        newNick = `${prefix}${baseName}`;
                    }
                    res.newNickname = newNick;

                    // set nickname if different
                    if (currentDisplayName !== newNick) {
                        try {
                            console.log(`[AUTO-KARANTINA] Setting nickname: ${newNick}`);
                            await member.setNickname(newNick);
                            console.log(`[AUTO-KARANTINA] ✅ Nickname set success`);
                        } catch (err) {
                            console.error(`[AUTO-KARANTINA] ❌ setNickname failed: ${err.code} - ${err.message}`);
                            // do not abort; continue with roles
                        }
                    } else {
                        console.log(`[AUTO-KARANTINA] ℹ️  Nickname already matches`);
                    }

                    // remove faction roles
                    console.log(`[AUTO-KARANTINA] Removing faction roles...`);
                    for (const roleId of KARANTINA_CONFIG.FACTION_ROLE_IDS) {
                        if (member.roles.cache.has(roleId)) {
                            try {
                                const role = guild.roles.cache.get(roleId);
                                const roleName = role ? role.name : roleId;
                                console.log(`[AUTO-KARANTINA]   Removing ${roleName}...`);
                                await member.roles.remove(roleId);
                                res.rolesRemoved.push(roleName);
                                console.log(`[AUTO-KARANTINA]   ✅ Removed ${roleName}`);
                            } catch (err) {
                                console.error(`[AUTO-KARANTINA]   ❌ Failed to remove: ${err.code} - ${err.message}`);
                            }
                        }
                    }

                    // add karantina role
                    console.log(`[AUTO-KARANTINA] Adding karantina role...`);
                    const karRole = guild.roles.cache.get(KARANTINA_CONFIG.KARANTINA_ROLE_ID);
                    if (karRole) {
                        try {
                            console.log(`[AUTO-KARANTINA]   Adding role: ${karRole.name}`);
                            await member.roles.add(KARANTINA_CONFIG.KARANTINA_ROLE_ID);
                            res.karantinaRoleAdded = true;
                            console.log(`[AUTO-KARANTINA] ✅ Karantina role added`);
                        } catch (err) {
                            console.error(`[AUTO-KARANTINA] ❌ Failed to add karantina role: ${err.code} - ${err.message}`);
                        }
                    } else {
                        console.error('[AUTO-KARANTINA] ❌ Karantina role NOT FOUND in guild');
                    }

                    console.log(`[AUTO-KARANTINA] ========== DONE: ${member.user.tag} ==========\n`);

                } catch (err) {
                    console.error('[AUTO-KARANTINA] ❌ Unexpected error:', err);
                    res.error = String(err.message || err);
                }

                results.push(res);
                
                // Add delay untuk menghindari rate limit (optional, uncomment jika perlu)
                // await new Promise(r => setTimeout(r, 500));
            } // ← TUTUP FOR LOOP

            // Send one summary embed (for clarity)
            try {
                console.log(`[AUTO-KARANTINA] Sending summary embed...`);
                
                const lines = results.map(r => {
                    if (!r.found) return `• ${r.identifier} — ❌ ${r.error || 'tidak ditemukan'}`;
                    const removed = r.rolesRemoved.length ? r.rolesRemoved.join(', ') : 'Tidak ada';
                    return `• ${r.tag} — ✅\n    - Nama Lama: ${r.oldNickname}\n    - Nama Baru: ${r.newNickname}\n    - Roles Dihapus: ${removed}\n    - Karantina Role: ${r.karantinaRoleAdded ? 'Ya' : 'Tidak'}`;
                }).join('\n\n');

                // Truncate jika terlalu panjang
                const description = lines.length > 4096 ? lines.substring(0, 4093) + '...' : lines;

                const summaryEmbed = new EmbedBuilder()
                    .setTitle('Auto Karantina - Summary')
                    .setColor(0xFF6B6B)
                    .setDescription(description)
                    .setTimestamp()
                    .setFooter({ text: 'Auto Karantina System' });

                await message.channel.send({
                    content: `<@&${KARANTINA_CONFIG.TEAM_ROLE_ID}>`,
                    embeds: [summaryEmbed]
                });
                
                console.log(`[AUTO-KARANTINA] ✅ Summary embed sent`);
            } catch (err) {
                console.error('[AUTO-KARANTINA] ❌ gagal mengirim summary embed:', err.code, err.message);
            }

            console.log('[AUTO-KARANTINA] ✅ ALL DONE! Hasil:', results);

        } catch (error) {
            console.error('[AUTO-KARANTINA] ❌ Error di handler:', error);
        }
    }); // ← TUTUP client.on

    console.log('[AUTO-KARANTINA] Handler berhasil di-setup!');
} // ← TUTUP FUNCTION

module.exports = { setupAutoKarantinaHandler, KARANTINA_CONFIG };