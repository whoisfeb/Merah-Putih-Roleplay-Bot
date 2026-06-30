const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    
    // 1. EVENT: Mendeteksi pesan chat (!mreaction dan !stopmreaction)
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.content.startsWith('!')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // ==================== PERINTAH: !mreaction ====================
        if (command === 'mreaction') {
            if (!message.member.permissions.has('ManageRoles')) {
                return message.reply('Kamu tidak punya izin (`ManageRoles`) untuk perintah ini.');
            }

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

        // ==================== PERINTAH BARU: !stopmreaction ====================
        if (command === 'stopmreaction') {
            if (!message.member.permissions.has('ManageRoles')) {
                return message.reply('Kamu tidak punya izin (`ManageRoles`) untuk perintah ini.');
            }

            const targetMessageId = args[0];
            if (!targetMessageId) {
                return message.reply('Format salah! Gunakan: `!stopmreaction [MessageID]`\nContoh: `!stopmreaction 123456789012345678`');
            }

            try {
                // Ambil target pesan di channel tempat perintah diketik
                const targetMessage = await message.channel.messages.fetch(targetMessageId).catch(() => null);
                
                if (!targetMessage) {
                    return message.reply('❌ Pesan tidak ditemukan di channel ini! Periksa kembali ID pesan Anda.');
                }

                if (!targetMessage.embeds || targetMessage.embeds.length === 0) {
                    return message.reply('❌ Pesan tersebut tidak memiliki embed pemicu.');
                }

                const oldEmbed = targetMessage.embeds[0];
                
                // Cek apakah pesan tersebut memang buatan sistem mreaction
                if (!oldEmbed.footer || !oldEmbed.footer.text || !oldEmbed.footer.text.startsWith('RoleID:')) {
                    return message.reply('❌ Pesan ini bukan pesan Reaction Role aktif atau sudah dinonaktifkan sebelumnya.');
                }

                // Perbarui isi tampilan embed agar user tahu pendaftaran sudah ditutup
                const updatedDescription = oldEmbed.description 
                    ? oldEmbed.description.replace(/👉 Klik emoji.*/g, '🛑 *Pendaftaran role ini sudah ditutup.*') 
                    : '🛑 *Pendaftaran role ini sudah ditutup.*';

                const disabledEmbed = {
                    title: oldEmbed.title || '📌 KLAIM ROLE KAMU',
                    description: updatedDescription,
                    color: 0xcc0000, // Berubah menjadi merah penanda nonaktif
                    footer: { text: 'Pendaftaran Ditutup' } // Menghapus teks pemicu "RoleID:xxxx"
                };

                // Edit pesan lama dengan data baru
                await targetMessage.edit({ embeds: [disabledEmbed] });

                // Bersihkan semua emoji reaksi yang menempel pada pesan tersebut
                await targetMessage.reactions.removeAll().catch(() => 
                    console.log('Gagal menghapus reaksi otomatis. Pastikan bot memiliki izin ManageMessages.')
                );

                // Hapus pesan teks perintah admin agar chat tetap bersih
                await message.delete().catch(() => {});

            } catch (error) {
                console.error('Gagal menghentikan mreaction:', error);
                message.reply('❌ Terjadi kesalahan internal saat mencoba menghentikan fungsi reaksi.');
            }
        }
    });

    // 2. EVENT: Mendeteksi klik reaksi (UNTUK MENAMBAH ROLE)
    client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) return; 

        if (reaction.partial) {
            try { await reaction.fetch(); } catch (error) { return; }
        }
        if (reaction.message.partial) {
            try { await reaction.message.fetch(); } catch (error) { return; }
        }

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

    // 3. EVENT: Mendeteksi lepas reaksi (UNTUK MENCABUT ROLE JIKA EMOJI DI-UNKLIK)
    client.on('messageReactionRemove', async (reaction, user) => {
        if (user.bot) return; 

        if (reaction.partial) {
            try { await reaction.fetch(); } catch (error) { return; }
        }
        if (reaction.message.partial) {
            try { await reaction.message.fetch(); } catch (error) { return; }
        }

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
