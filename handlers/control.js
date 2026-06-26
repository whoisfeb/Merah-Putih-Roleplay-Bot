const { PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType } = require('discord.js');

// GANTI DENGAN ID DISCORD ANDA SENDIRI (Wajib agar hanya Anda yang bisa menggunakan perintah ini)
const OWNER_ID = '774310796565020702'; 

async function handleSendMessage(interaction) {
    // Buat balasan ephemeral (hanya bisa dilihat oleh Anda sendiri)
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // 1. VALIDASI OWNER-ONLY CHECK
    if (interaction.user.id !== OWNER_ID) {
        return await interaction.editReply({ 
            content: '❌ Anda tidak memiliki izin khusus untuk menggunakan perintah kontrol ini!' 
        });
    }

    try {
        // 2. AMBIL VALUE DARI INPUT USER
        let text = interaction.options.getString('teks');
        const file = interaction.options.getAttachment('file');
        const targetChannel = interaction.options.getChannel('channel');
        const targetUser = interaction.options.getUser('user');

        // Validasi: Harus mengisi minimal Teks atau File
        if (!text && !file) {
            return await interaction.editReply({
                content: '❌ Anda harus mengisi minimal salah satu opsi: **teks** atau **file/gambar**!'
            });
        }

        // Validasi: Harus memilih salah satu antara tujuan Channel atau User
        if (!targetChannel && !targetUser) {
            return await interaction.editReply({
                content: '❌ Anda harus menentukan tujuan pengiriman! Pilih salah satu antara opsi **channel** atau **user**.'
            });
        }

        // PROSES OTOMATIS: Mengubah ketikan \n menjadi Enter / Baris Baru sungguhan
        if (text) {
            text = text.replaceAll('\\n', '\n');
        }

        // 3. SIAPKAN PAYLOAD PESAN
        const messagePayload = {};
        if (text) messagePayload.content = text;
        if (file) messagePayload.files = [file];

        // 4. PROSES PENGIRIMAN KE TARGET
        let destinationName = '';

        if (targetChannel) {
            // Validasi tipe channel harus text channel biasa
            if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(targetChannel.type)) {
                return await interaction.editReply({
                    content: '❌ Opsi channel harus berupa Text Channel atau Announcement Channel!'
                });
            }
            
            // Kirim ke Channel
            await targetChannel.send(messagePayload);
            destinationName = `Channel ${targetChannel}`;
        } else if (targetUser) {
            // Kirim langsung ke DM User
            await targetUser.send(messagePayload);
            destinationName = `DM User **${targetUser.tag}**`;
        }

        // 5. BALASAN SUKSES KE OWNER
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Pesan Berhasil Dikirim')
            .setColor('#2ecc71')
            .setDescription(`Pesan kontrol Anda telah sukses diteruskan ke target tujuan.`)
            .addFields(
                { name: '📍 Tujuan', value: destinationName, inline: true },
                // Code block (```) dihapus agar teks di laporan mendukung spasi & enter dengan rapi (Maksimal 1024 karakter Discord)
                { name: '📄 Detail Konten', value: text ? text.slice(0, 1024) : '*Hanya File/Gambar*', inline: false }
            )
            .setTimestamp();

        if (file) {
            successEmbed.addFields({ name: '📎 Nama File Attach', value: `\`${file.name}\``, inline: true });
        }

        await interaction.editReply({ embeds: [successEmbed] });
        console.log(`[CONTROL] Owner berhasil mengirimkan pesan ke ${destinationName}`);

    } catch (error) {
        console.error('[CONTROL ERROR]', error);
        await interaction.editReply({ 
            content: `❌ Gagal mengirimkan pesan! Terjadi kesalahan sistem atau bot diblokir/tidak memiliki akses ke target.\nError: \`${error.message}\`` 
        });
    }
}

module.exports = { handleSendMessage };
