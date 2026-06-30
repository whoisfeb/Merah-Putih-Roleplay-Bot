module.exports = (client) => {
    
    // 1. EVENT: Membuat pesan reaction role via chat
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.content.startsWith('!')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'mreaction') {
            if (!message.member.permissions.has('ManageRoles')) {
                return message.reply('Kamu tidak punya izin (`ManageRoles`).');
            }

            const emoji = args[0];       
            const roleMention = args[1]; 
            const endHourStr = args[2];  
            const description = args.slice(3).join(' '); 

            if (!emoji || !roleMention || !endHourStr || !description) {
                return message.reply('Format salah! Gunakan: `!mreaction [Emoji] [@Role] [Jam_24] [Keterangan]`');
            }

            const endHour = parseInt(endHourStr);
            if (isNaN(endHour) || endHour < 0 || endHour > 23) {
                return message.reply('Jam harus berupa angka antara `00` sampai `23`.');
            }

            const roleId = roleMention.replace(/[<@&>]/g, '');
            const role = await message.guild.roles.fetch(roleId).catch(() => null);
            if (!role) return message.reply('Role tidak ditemukan!');

            const displayHour = endHour < 10 ? `0${endHour}:00` : `${endHour}:00`;

            const embed = {
                title: '📌 Reaction Role Terbatas',
                description: `${description}\n\n⏳ **Batas Waktu:** Hanya bisa diambil sampai pukul **${displayHour} WIB** hari ini.`,
                color: 0xffaa00,
                footer: { text: `Target: ${roleId} | Jam: ${endHour}` }
            };

            const reactionMessage = await message.channel.send({ embeds: [embed] });
            await reactionMessage.react(emoji);
            await message.delete().catch(() => {});
        }
    });

    // 2. EVENT: Mendeteksi klik reaksi
    client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) return;

        console.log(`[DEBUG] Ada reaksi masuk dari user: ${user.tag}`);

        if (reaction.partial) {
            try { 
                console.log(`[DEBUG] Reaksi bersifat partial, mendownload data pesan...`);
                await reaction.fetch(); 
            } catch (error) { 
                console.error('[DEBUG ERROR] Gagal fetch partial:', error);
                return; 
            }
        }

        const message = reaction.message;

        if (!message.embeds || message.embeds.length === 0) {
            console.log(`[DEBUG] Reaksi diabaikan: Pesan tidak memiliki Embed.`);
            return;
        }

        const embed = message.embeds[0];
        if (!embed.footer || !embed.footer.text || !embed.footer.text.startsWith('Target:')) {
            console.log(`[DEBUG] Reaksi diabaikan: Teks Footer tidak diawali kata 'Target:'`);
            return;
        }

        // Proses pemecahan string footer secara aman
        const footerText = embed.footer.text;
        console.log(`[DEBUG] Isi Footer terbaca: "${footerText}"`);

        const parts = footerText.split('|');
        if (parts.length < 2) {
            console.log(`[DEBUG] Gagal membelah teks footer menggunakan karakter '|'`);
            return;
        }

        const roleId = parts[0].replace('Target: ', '').trim();
        const endHour = parseInt(parts[1].replace('Jam: ', '').trim());
        console.log(`[DEBUG] Berhasil memisahkan data -> RoleID: ${roleId}, Jam Batas: ${endHour}`);

        // Ambil jam lokal saat ini (WIB)
        const wibTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
        const currentHour = wibTime.getHours();
        console.log(`[DEBUG] Jam Server Terbaca saat ini (WIB): ${currentHour}:XX`);

        // Pengecekan Batas Jam
        if (endHour === 0) {
            if (currentHour === 0) {
                console.log(`[DEBUG] Waktu Habis! Reaksi dihapus (Target Jam 12 Malam, Saat ini Jam 12 Malam).`);
                await reaction.users.remove(user.id).catch(() => {});
                await user.send(`Maaf, batas waktu mengambil role sudah habis (Lewat Jam 12 Malam).`).catch(() => {});
                return;
            }
        } else {
            if (currentHour >= endHour) {
                console.log(`[DEBUG] Waktu Habis! Reaksi dihapus (Jam Saat ini: ${currentHour} >= Jam Batas: ${endHour})`);
                await reaction.users.remove(user.id).catch(() => {});
                await user.send(`Maaf, batas waktu mengambil role sudah habis.`).catch(() => {});
                return;
            }
        }

        // Proses pembagian role ke user
        const guild = message.guild;
        if (!guild) {
            console.log(`[DEBUG] Guild tidak terdeteksi.`);
            return;
        }

        try {
            console.log(`[DEBUG] Menarik data member & role dari API Discord...`);
            const member = await guild.members.fetch(user.id).catch(() => null);
            const role = await guild.roles.fetch(roleId).catch(() => null);

            if (!member) console.log(`[DEBUG] Member gagal di-fetch.`);
            if (!role) console.log(`[DEBUG] Role gagal di-fetch.`);

            if (member && role) {
                console.log(`[DEBUG] Eksekusi penambahan role ${role.name} ke ${member.user.tag}...`);
                await member.roles.add(role);
                console.log(`[SUCCESS] Role sukses diberikan!`);
            }
        } catch (err) {
            console.error('[DEBUG ERROR] Gagal total saat memberikan role:', err);
        }
    });
};
