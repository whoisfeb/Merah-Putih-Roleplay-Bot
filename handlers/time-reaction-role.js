module.exports = (client) => {
    
    // 1. EVENT: Membuat pesan reaction role via chat
    // Format ketik di Discord: !mreaction [Emoji] [@Role] [Keterangan Teks]
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.content.startsWith('!')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

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
                // Ditambahkan trim untuk memastikan format teks footer konsisten
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
    });

    // 2. EVENT: Mendeteksi klik reaksi (UNTUK MENAMBAH ROLE)
    client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) return; 

        // Struktur WAJIB untuk membaca pesan lama setelah bot restart
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
