module.exports = (client) => {
    
    // 1. EVENT: Membuat pesan reaction role via chat
    client.on('messageCreate', async (message) => {
        // Abaikan jika pesan dari bot atau tidak dimulai dengan prefix !
        if (message.author.bot || !message.content.startsWith('!')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'mreaction') {
            console.log(`[Bot] Perintah !mreaction terdeteksi dari ${message.author.tag}`);

            if (!message.member.permissions.has('ManageRoles')) {
                return message.reply('Kamu tidak punya izin (`ManageRoles`) untuk menjalankan perintah ini.');
            }

            const emoji = args[0];       
            const roleMention = args[1]; 
            const endHourStr = args[2];  
            const description = args.slice(3).join(' '); 

            if (!emoji || !roleMention || !endHourStr || !description) {
                return message.reply('Format salah! Gunakan: `!mreaction [Emoji] [@Role] [Jam_24] [Keterangan]`\nContoh: `!mreaction 🎉 @Role 00 Info event`');
            }

            const endHour = parseInt(endHourStr);
            if (isNaN(endHour) || endHour < 0 || endHour > 23) {
                return message.reply('Jam harus berupa angka antara `00` sampai `23`.');
            }

            const roleId = roleMention.replace(/[<@&>]/g, '');
            
            // PERBAIKAN: Menggunakan FETCH agar kebal dari masalah cache GitHub Actions yang kosong
            const role = await message.guild.roles.fetch(roleId).catch(() => null);
            if (!role) {
                return message.reply('Role tidak ditemukan! Pastikan kamu melakukan tag/mention pada rolenya dengan benar.');
            }

            const displayHour = endHour < 10 ? `0${endHour}:00` : `${endHour}:00`;

            const embed = {
                title: '📌 Reaction Role Terbatas',
                description: `${description}\n\n⏳ **Batas Waktu:** Hanya bisa diambil sampai pukul **${displayHour} WIB** hari ini.`,
                color: 0xffaa00,
                footer: { text: `Target: ${roleId} | Jam: ${endHour}` }
            };

            try {
                const reactionMessage = await message.channel.send({ embeds: [embed] });
                await reactionMessage.react(emoji);
                await message.delete().catch(() => {});
                console.log(`[Bot] Berhasil membuat pesan reaction role untuk Role ID: ${roleId}`);
            } catch (error) {
                console.error('[Bot Error] Gagal mengirim pesan atau menempelkan emoji:', error);
                message.reply(`Gagal membuat reaction role. Pastikan bot memiliki izin kirim embed dan menggunakan emoji yang valid.`);
            }
        }
    });

    // 2. EVENT: Mendeteksi klik reaksi (KEBAL RESTART 6 JAM)
    client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) return;

        if (reaction.partial) {
            try { 
                await reaction.fetch(); 
            } catch (error) { 
                console.error('Gagal mengambil data pesan lama:', error);
                return; 
            }
        }

        const message = reaction.message;

        if (!message.embeds || message.embeds.length === 0) return;
        const embed = message.embeds[0];
        if (!embed.footer || !embed.footer.text || !embed.footer.text.startsWith('Target:')) return;

        const footerText = embed.footer.text;
        const roleId = footerText.split('|')[0].replace('Target: ', '').trim();
        const endHour = parseInt(footerText.split('|')[1].replace('Jam: ', '').trim());

        const wibTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
        const currentHour = wibTime.getHours();

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

        const guild = message.guild;
        if (!guild) return;

        const member = await guild.members.fetch(user.id).catch(() => {});
        const role = await guild.roles.fetch(roleId).catch(() => null);

        if (member && role) {
            await member.roles.add(role).catch(console.error);
        }
    });
};
