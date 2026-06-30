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
                return message.reply('Format salah! Gunakan: `!timerr [Emoji] [@Role] [Jam_24] [Keterangan]`');
            }

            const endHour = parseInt(endHourStr);
            if (isNaN(endHour) || endHour < 0 || endHour > 23) {
                return message.reply('Jam harus berupa angka antara `00` sampai `23`.');
            }

            const roleId = roleMention.replace(/[<@&>]/g, '');
            const role = message.guild.roles.cache.get(roleId);
            if (!role) return message.reply('Role tidak ditemukan! Pastikan kamu tag rolenya.');

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

    // 2. EVENT: Mendeteksi klik reaksi (KEBAL RESTART 6 JAM)
    client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) return;

        // --- BAGIAN PALING PENTING UNTUK GITHUB ACTIONS ---
        // Jika pesan dikirim sebelum bot restart, statusnya adalah "Partial" (belum masuk cache).
        // Kode di bawah ini memaksa bot untuk mengunduh ulang data pesan tersebut langsung dari API Discord.
        if (reaction.partial) {
            try { 
                await reaction.fetch(); 
            } catch (error) { 
                console.error('Gagal mengambil data pesan lama:', error);
                return; 
            }
        }

        const message = reaction.message;

        // Validasi struktur embed
        if (!message.embeds || message.embeds.length === 0) return;
        const embed = message.embeds[0];
        if (!embed.footer || !embed.footer.text || !embed.footer.text.startsWith('Target:')) return;

        // Ambil data dari footer
        const footerText = embed.footer.text;
        const roleId = footerText.split('|')[0].replace('Target: ', '').trim();
        const endHour = parseInt(footerText.split('|')[1].replace('Jam: ', '').trim());

        // Ambil jam lokal saat ini (WIB)
        const wibTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
        const currentHour = wibTime.getHours();

        // Pengecekan Batas Jam
        if (endHour === 0) {
            if (currentHour === 0) {
                await reaction.users.remove(user.id).catch(() => {});
                await user.send(`Maaf, batas waktu mengambil role sudah habis (Lewat Jam 12 Malam).`).catch(() => {});
                return;
            }
        } else {
            if (currentHour >= endHour) {
                await reaction.users.remove(user.id).catch(() => {});
                await user.send(`Maaf, batas waktu mengambil role sudah habis.`).catch(() => {});
                return;
            }
        }

        // Proses pembagian role
        const guild = message.guild;
        if (!guild) return;

        const member = await guild.members.fetch(user.id).catch(() => {});
        const role = guild.roles.cache.get(roleId);

        if (member && role) {
            await member.roles.add(role).catch(console.error);
        }
    });
};
