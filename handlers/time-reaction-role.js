const { EmbedBuilder } = require('discord.js');

// ==================== CONFIGURATION ====================
// Ganti angka di bawah ini dengan ID Role yang boleh menggunakan perintah !mreaction, !stopmreaction, dan !startmreaction
const ALLOWED_ROLE_ID = '1514189664863518811'; 
// =======================================================

module.exports = (client) => {
    
    // 1. EVENT: Mendeteksi pesan chat (!mreaction, !stopmreaction, dan !startmreaction)
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.content.startsWith('!')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Daftar perintah yang butuh validasi role khusus
        const reactionCommands = ['mreaction', 'stopmreaction', 'startmreaction'];

        if (reactionCommands.includes(command)) {
            // Cek apakah member memiliki ID Role khusus yang diizinkan
            if (!message.member.roles.cache.has(ALLOWED_ROLE_ID)) {
                return message.reply('❌ Kamu tidak memiliki role yang diizinkan untuk menggunakan perintah ini!');
            }
        }

        // ==================== PERINTAH: !mreaction ====================
        if (command === 'mreaction') {
            const emoji = args[0];       
            const roleMention = args[1]; 
            const description = args.slice(2).join(' '); 

            if (!emoji || !roleMention || !description) {
                return message.reply('Format salah! Gunakan: `!mreaction [Emoji] [@Role] [Keterangan]`\nContoh: `!mreaction 🎉 @Role SPESIAL 10K MEMBER`');
            }

            const roleId = roleMention.replace(/[<@&>]/g, '');
            const role = await message.guild.roles.fetch(roleId).catch(() => null);
            if (!role) return message.reply('Role tidak ditemukan! Pastikan kamu tag rolenya.');

            const embed = {
                title: '📌 KLAIM ROLE KAMU',
                description: `${description}\n\n👉 Klik emoji **${emoji}** di bawah ini untuk mengambil peran!`,
                color: 0xffaa00,
                footer: { text: `RoleID:${roleId}` } 
            };

            try {
                const reactionMessage = await message.channel.send({ embeds: [embed] });
                await reactionMessage.react(emoji); 
                await message.delete().catch(() => {}); 
            } catch (error) {
                console.error('Gagal membuat pesan:', error);
            }
        }

        // ==================== PERINTAH: !stopmreaction ====================
        if (command === 'stopmreaction') {
            const targetMessageId = args[0];
            if (!targetMessageId) {
                return message.reply('Format salah! Gunakan: `!stopmreaction [MessageID]`\nContoh: `!stopmreaction 123456789012345678`');
            }

            try {
                const targetMessage = await message.channel.messages.fetch(targetMessageId).catch(() => null);
                
                if (!targetMessage) {
                    return message.reply('❌ Pesan tidak ditemukan di channel ini! Periksa kembali ID pesan Anda.');
                }

                if (!targetMessage.embeds || targetMessage.embeds.length === 0) {
                    return message.reply('❌ Pesan tersebut tidak memiliki embed pemicu.');
                }

                const oldEmbed = targetMessage.embeds[0];
                
                if (!oldEmbed.footer || !oldEmbed.footer.text || !oldEmbed.footer.text.startsWith('RoleID:')) {
                    return message.reply('❌ Pesan ini bukan pesan Reaction Role aktif atau sudah dinonaktifkan sebelumnya.');
                }

                const updatedDescription = oldEmbed.description 
                    ? oldEmbed.description.replace(/👉 Klik emoji.*/g, '🛑 *Pendaftaran role ini sudah ditutup.*') 
                    : '🛑 *Pendaftaran role ini sudah ditutup.*';

                const disabledEmbed = {
                    title: oldEmbed.title || '📌 KLAIM ROLE KAMU',
                    description: updatedDescription,
                    color: 0xcc0000, 
                    footer: { text: 'Pendaftaran Ditutup' } 
                };

                await targetMessage.edit({ embeds: [disabledEmbed] });
                await targetMessage.reactions.removeAll().catch(() => 
                    console.log('Gagal menghapus reaksi otomatis. Pastikan bot memiliki izin ManageMessages.')
                );
                await message.delete().catch(() => {});

            } catch (error) {
                console.error('Gagal menghentikan mreaction:', error);
                message.reply('❌ Terjadi kesalahan internal saat mencoba menghentikan fungsi reaksi.');
            }
        }

        // ==================== PERINTAH: !startmreaction ====================
        if (command === 'startmreaction') {
            const targetMessageId = args[0];
            const emoji = args[1];
            const roleMention = args[2];

            if (!targetMessageId || !emoji || !roleMention) {
                return message.reply('Format salah! Gunakan: `!startmreaction [MessageID] [Emoji] [@Role]`\nContoh: `!startmreaction 123456789012345678 🎉 @Role SPESIAL`');
            }

            try {
                const targetMessage = await message.channel.messages.fetch(targetMessageId).catch(() => null);
                
                if (!targetMessage) {
                    return message.reply('❌ Pesan tidak ditemukan di channel ini! Periksa kembali ID pesan Anda.');
                }

                if (!targetMessage.embeds || targetMessage.embeds.length === 0) {
                    return message.reply('❌ Pesan tersebut tidak memiliki embed pemicu.');
                }

                const roleId = roleMention.replace(/[<@&>]/g, '');
                const role = await message.guild.roles.fetch(roleId).catch(() => null);
                if (!role) return message.reply('❌ Role tidak ditemukan! Pastikan kamu tag rolenya.');

                const oldEmbed = targetMessage.embeds[0];
                const newDescriptionArgs = args.slice(3).join(' ');
                let updatedDescription = newDescriptionArgs || oldEmbed.description || '';
                
                updatedDescription = updatedDescription.replace(/🛑 \*Pendaftaran role ini sudah ditutup\.\*/g, '');
                if (!updatedDescription.includes('👉 Klik emoji')) {
                    updatedDescription = `${updatedDescription.trim()}\n\n👉 Klik emoji **${emoji}** di bawah ini untuk mengambil peran!`;
                }

                const activeEmbed = {
                    title: oldEmbed.title || '📌 KLAIM ROLE KAMU',
                    description: updatedDescription,
                    color: 0xffaa00, 
                    footer: { text: `RoleID:${roleId}` } 
                };

                await targetMessage.edit({ embeds: [activeEmbed] });
                await targetMessage.react(emoji);
                await message.delete().catch(() => {});

            } catch (error) {
                console.error('Gagal memulai ulang mreaction:', error);
                message.reply('❌ Terjadi kesalahan internal saat mencoba mengaktifkan kembali fungsi reaksi.');
            }
        }
    });

    // 2. EVENT: Mendeteksi klik reaksi (UNTUK MENAMBAH ROLE)
    client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) return; 

        if (reaction.partial) { try { await reaction.fetch(); } catch (error) { return; } }
        if (reaction.message.partial) { try { await reaction.message.fetch(); } catch (error) { return; } }

        const message = reaction.message;
        if (!message.embeds || message.embeds.length === 0) return;
        
        const embed = message.embeds[0];
        if (!embed.footer || !embed.footer.text || !embed.footer.text.startsWith('RoleID:')) return;

        const roleId = embed.footer.text.replace('RoleID:', '').trim();
        const guild = message.guild;
        if (!guild) return;

        try {
            const member = await guild.members.fetch(user.id).catch(() => null);
            const role = await guild.roles.fetch(roleId).catch(() => null);

            if (member && role) {
                await member.roles.add(role);
                console.log(`[SUCCESS] Berhasil memberikan role ${role.name} kepada ${user.tag}`);
            }
        } catch (err) {
            console.error('Gagal memberikan role:', err);
        }
    });

    // 3. EVENT: Mendeteksi lepas reaksi (UNTUK MENCABUT ROLE)
    client.on('messageReactionRemove', async (reaction, user) => {
        if (user.bot) return; 

        if (reaction.partial) { try { await reaction.fetch(); } catch (error) { return; } }
        if (reaction.message.partial) { try { await reaction.message.fetch(); } catch (error) { return; } }

        const message = reaction.message;
        if (!message.embeds || message.embeds.length === 0) return;
        
        const embed = message.embeds[0];
        if (!embed.footer || !embed.footer.text || !embed.footer.text.startsWith('RoleID:')) return;

        const roleId = embed.footer.text.replace('RoleID:', '').trim();
        const guild = message.guild;
        if (!guild) return;

        try {
            const member = await guild.members.fetch(user.id).catch(() => null);
            const role = await guild.roles.fetch(roleId).catch(() => null);

            if (member && role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                console.log(`[SUCCESS] Berhasil mencabut role ${role.name} dari ${user.tag}`);
            }
        } catch (err) {
            console.error('Gagal mencabut role:', err);
        }
    });
};
