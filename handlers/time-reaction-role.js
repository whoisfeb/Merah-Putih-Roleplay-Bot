module.exports = (client) => {
    
    // 1. EVENT: Membuat pesan reaction role via chat
    // Format ketik di Discord: !mreaction [Emoji] [@Role] [Keterangan Teks]
    // Contoh: !mreaction 🎉 @Special 10K Members SPESIAL 10K MEMBER DISCORD
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.content.startsWith('!')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'mreaction') {
            if (!message.member.permissions.has('ManageRoles')) {
                return message.reply('Kamu tidak punya izin (`ManageRoles`) untuk perintah ini.');
            }

            const emoji = args[0];       // Argumen 1: Emoji (misal: 🎉)
            const roleMention = args[1]; // Argumen 2: Tag Role (misal: @Role)
            const description = args.slice(2).join(' '); // Argumen 3 dst: Teks Keterangan

            if (!emoji || !roleMention || !description) {
                return message.reply('Format salah! Gunakan: `!mreaction [Emoji] [@Role] [Keterangan]`\nContoh: `!mreaction 🎉 @Role SPESIAL 10K MEMBER`');
            }

            // Ambil ID Role dari Tag Mention
            const roleId = roleMention.replace(/[<@&>]/g, '');
            
            // Ambil data role langsung dari API Server Discord (Biar kebal bug cache)
            const role = await message.guild.roles.fetch(roleId).catch(() => null);
            if (!role) return message.reply('Role tidak ditemukan! Pastikan kamu tag rolenya.');

            // Buat Tampilan Kotak Pesan (Embed)
            const embed = {
                title: '📌 KLAIM ROLE KAMU',
                description: `${description}\n\n👉 Klik emoji **${emoji}** di bawah ini untuk mengambil peran!`,
                color: 0xffaa00,
                // Kita simpan ID Role di footer agar bot tahu role mana yang harus diberikan saat di-klik
                footer: { text: `RoleID: ${roleId}` }
            };

            try {
                const reactionMessage = await message.channel.send({ embeds: [embed] });
                await reactionMessage.react(emoji); // Tempelkan emoji otomatis di bawah embed
                await message.delete().catch(() => {}); // Hapus ketikan chat perintah asli kamu
            } catch (error) {
                console.error('Gagal membuat pesan:', error);
            }
        }
    });

    // 2. EVENT: Mendeteksi klik reaksi (KEBAL RESTART GITHUB ACTIONS)
    client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) return; // Abaikan jika yang klik adalah bot lain

        // Paksa ambil data pesan lama jika bot habis restart otomatis di GitHub Actions
        if (reaction.partial) {
            try { 
                await reaction.fetch(); 
            } catch (error) { 
                return; 
            }
        }

        const message = reaction.message;

        // Validasi: Pastikan pesan memiliki embed dan dibuat oleh bot kita
        if (!message.embeds || message.embeds.length === 0) return;
        const embed = message.embeds[0];
        if (!embed.footer || !embed.footer.text || !embed.footer.text.startsWith('RoleID:')) return;

        // Ambil ID Role yang disimpan di teks footer tadi
        const roleId = embed.footer.text.replace('RoleID: ', '').trim();

        const guild = message.guild;
        if (!guild) return;

        try {
            // Tarik data member dan role secara realtime
            const member = await guild.members.fetch(user.id).catch(() => null);
            const role = await guild.roles.fetch(roleId).catch(() => null);

            if (member && role) {
                // Berikan role ke akun member yang klik emoji
                await member.roles.add(role);
                console.log(`[SUCCESS] Berhasil memberikan role ${role.name} kepada ${user.tag}`);
            }
        } catch (err) {
            console.error('Gagal memberikan role:', err);
        }
    });
};
