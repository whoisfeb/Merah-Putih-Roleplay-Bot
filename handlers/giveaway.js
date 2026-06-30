const ms = require('ms');

async function handleGiveaway(interaction) {
    // Memeriksa izin Admin / Manage Messages pembuat giveaway
    if (!interaction.member.permissions.has('ManageMessages')) {
        return interaction.reply({ 
            content: 'Anda tidak memiliki izin (Manage Messages) untuk membuat giveaway.', 
            ephemeral: true 
        });
    }

    const durasiStr = interaction.options.getString('durasi');
    const jumlahPemenang = interaction.options.getInteger('pemenang');
    const hadiah = interaction.options.getString('hadiah');

    // Konversi string waktu (10m, 1h) menjadi Milidetik
    const durasiMs = ms(durasiStr);
    if (!durasiMs) {
        return interaction.reply({ 
            content: 'Format durasi salah! Gunakan format seperti `10m` atau `1h`.', 
            ephemeral: true 
        });
    }

    // Pembuatan Tampilan Embed Awal
    const embedAwal = {
        title: '🎉 GIVEAWAY DIMULAI 🎉',
        description: `**Hadiah:** ${hadiah}\n**Pemenang:** ${jumlahPemenang}\n**Durasi:** Selesai dalam ${durasiStr}\n\nKlik reaksi 🎉 di bawah ini untuk ikut serta!`,
        color: 0x00ff00,
        timestamp: new Date(Date.now() + durasiMs),
        footer: { text: 'Berakhir pada' }
    };

    // Kirim pesan ke room Discord dan tambahkan reaksi bot
    const pesan = await interaction.reply({ embeds: [embedAwal], fetchReply: true });
    await pesan.react('🎉');

    // Hitung mundur otomatis untuk menentukan pemenang
    setTimeout(async () => {
        try {
            // Ambil ulang pesan terbaru untuk sinkronisasi daftar reaksi user terbaru
            const pesanTerbaru = await interaction.channel.messages.fetch(pesan.id);
            const reaksi = pesanTerbaru.reactions.cache.get('🎉');
            
            if (!reaksi) {
                return interaction.channel.send('Giveaway dibatalkan karena reaksi emoji tidak ditemukan.');
            }

            // Kumpulkan id user yang menekan reaksi (mengabaikan akun bot)
            const users = await reaksi.users.fetch();
            const peserta = users.filter(user => !user.bot).map(user => user.toString());

            // Validasi jika tidak ada peserta sama sekali
            if (peserta.length === 0) {
                const embedGagal = {
                    title: '🎉 GIVEAWAY SELESAI 🎉',
                    description: `**Hadiah:** ${hadiah}\n**Pemenang:** Tidak ada peserta yang berpartisipasi.`,
                    color: 0x7289da
                };
                await pesanTerbaru.edit({ embeds: [embedGagal] });
                return interaction.channel.send(`Giveaway untuk **${hadiah}** telah berakhir, namun tidak ada yang ikut serta.`);
            }

            // Pengacakan pemenang dari array peserta
            const pemenangTerpilih = [];
            for (let i = 0; i < Math.min(jumlahPemenang, peserta.length); i++) {
                const indeksAcak = Math.floor(Math.random() * peserta.length);
                pemenangTerpilih.push(peserta.splice(indeksAcak, 1));
            }

            // Tampilan Embed Setelah Berakhir
            const embedSelesai = {
                title: '🎉 GIVEAWAY SELESAI 🎉',
                description: `**Hadiah:** ${hadiah}\n**Pemenang:** ${pemenangTerpilih.join(', ')}`,
                color: 0xff0000,
                footer: { text: 'Giveaway telah berakhir' }
            };

            // Update pesan utama dan tag para pemenang
            await pesanTerbaru.edit({ embeds: [embedSelesai] });
            await interaction.channel.send(`Selamat kepada ${pemenangTerpilih.join(', ')}! Kamu berhasil memenangkan **${hadiah}**! 🎉`);

        } catch (error) {
            console.error('Gagal menyelesaikan proses pengundian giveaway:', error);
        }
    }, durasiMs);
}

// Hanya mengekspor satu fungsi utama saja sesuai keinginan Anda
module.exports = { handleGiveaway };
