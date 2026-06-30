const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function handleGiveawayStart(interaction) {
    if (!interaction.member.permissions.has('ManageMessages')) {
        return interaction.reply({ content: 'Anda tidak memiliki izin untuk membuat giveaway.', ephemeral: true });
    }

    const hadiah = interaction.options.getString('hadiah');
    const jumlahPemenang = interaction.options.getInteger('pemenang');
    const waktuInput = interaction.options.getString('waktu').trim();
    const hariKe = interaction.options.getInteger('hari_ke') || 0; // Default 0 (hari ini)

    let targetDate;

    // Cek apakah user memasukkan format tanggal penuh (YYYY-MM-DD HH:MM) atau hanya jam (HH:MM)
    if (waktuInput.includes('-')) {
        // Jika input berupa tanggal lengkap seperti "2026-07-03 21:00"
        targetDate = new Date(waktuInput);
    } else {
        // Jika input hanya jam seperti "21:00"
        const [jam, menit] = waktuInput.split(':');
        if (!jam || !menit || isNaN(jam) || isNaN(menit)) {
            return interaction.reply({ content: 'Format jam salah! Gunakan format `21:00` atau `09:30`.', ephemeral: true });
        }

        targetDate = new Date();
        targetDate.setHours(parseInt(jam), parseInt(menit), 0, 0);
        
        // Tambahkan hari jika memilih opsi hari_ke (misal besok atau 3 hari lagi)
        if (hariKe > 0) {
            targetDate.setDate(targetDate.getDate() + hariKe);
        }
    }

    // Validasi apakah waktu yang dimasukkan sudah lewat atau tidak valid
    if (isNaN(targetDate.getTime())) {
        return interaction.reply({ content: 'Format waktu tidak dikenali! Gunakan `21:00` atau `2026-07-03 21:00`.', ephemeral: true });
    }

    if (targetDate.getTime() <= Date.now()) {
        return interaction.reply({ content: 'Waktu yang Anda masukkan sudah terlewat! Pastikan jam target berada di masa depan.', ephemeral: true });
    }

    // Konversi ke format UNIX untuk fitur hitung mundur otomatis Discord
    const waktuSelesaiUnix = Math.floor(targetDate.getTime() / 1000);

    const embedAwal = {
        title: '🎉 GIVEAWAY DIMULAI 🎉',
        description: `**Hadiah:** ${hadiah}\n**Jumlah Pemenang:** ${jumlahPemenang}\n**Berakhir Pada:** <t:${waktuSelesaiUnix}:F> (<t:${waktuSelesaiUnix}:R>)\n\nKlik reaksi 🎉 di bawah ini untuk ikut serta!`,
        color: 0x00ff00,
        footer: { text: 'Admin dapat mengklik tombol di bawah untuk mengundi jika waktu sudah habis' }
    };

    const tombolUndi = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('undi_giveaway')
            .setLabel('Undi Sekarang (Admin)')
            .setStyle(ButtonStyle.Danger)
    );

    const pesan = await interaction.reply({ 
        embeds: [embedAwal], 
        components: [tombolUndi], 
        fetchReply: true 
    });
    
    await pesan.react('🎉');
}

async function handleGiveawayEnd(interaction) {
    if (!interaction.member.permissions.has('ManageMessages')) {
        return interaction.reply({ content: 'Hanya Admin atau Staff yang boleh menekan tombol undi ini!', ephemeral: true });
    }

    // --- UBAH DARI interaction.reply MENJADI DEFER REPLY DI BAWAH INI ---
    await interaction.deferReply({ ephemeral: true }); 

    const pesanTerbaru = interaction.message;
    
    // Ambil reaksi emoji 🎉 secara aman
    const reaksi = pesanTerbaru.reactions.cache.get('🎉');
    if (!reaksi) {
        return interaction.editReply({ content: 'Reaksi emoji 🎉 tidak ditemukan pada pesan ini.' });
    }

    try {
        const embedLama = pesanTerbaru.embeds[0]; // Tambahkan indeks [0] agar membaca objek embed pertama secara tepat
        if (!embedLama || !embedLama.description) {
            return interaction.editReply({ content: 'Pesan giveaway tidak valid.' });
        }

        const barisTeks = embedLama.description.split('\n');
        let hadiah = 'Hadiah';
        let jumlahPemenang = 1;

        for (const baris of barisTeks) {
            if (baris.startsWith('**Hadiah:**')) {
                hadiah = baris.replace('**Hadiah:** ', '').trim();
            }
            if (baris.startsWith('**Jumlah Pemenang:**')) {
                jumlahPemenang = parseInt(baris.replace('**Jumlah Pemenang:** ', '').trim()) || 1;
            }
        }

        const users = await reaksi.users.fetch();
        const peserta = users.filter(user => !user.bot).map(user => user.toString());

        if (peserta.length === 0) {
            await pesanTerbaru.edit({ components: [] });
            await interaction.editReply({ content: 'Undian selesai diperiksa.' });
            return interaction.channel.send(`Giveaway untuk **${hadiah}** telah berakhir, namun tidak ada peserta yang ikut.`);
        }

        const pemenangTerpilih = [];
        for (let i = 0; i < Math.min(jumlahPemenang, peserta.length); i++) {
            const indeksAcak = Math.floor(Math.random() * peserta.length);
            pemenangTerpilih.push(peserta.splice(indeksAcak, 1));
        }

        const embedSelesai = {
            title: '🎉 GIVEAWAY SELESAI 🎉',
            description: `**Hadiah:** ${hadiah}\n**Pemenang:** ${pemenangTerpilih.join(', ')}`,
            color: 0xff0000,
            footer: { text: 'Telah selesai diundi oleh Admin' }
        };

        // Update pesan utama, hapus tombol merahnya, dan tag pemenang
        await pesanTerbaru.edit({ embeds: [embedSelesai], components: [] });
        
        // Beri tahu admin bahwa proses sukses
        await interaction.editReply({ content: 'Berhasil mengundi pemenang!' });
        
        // Tag pemenang di channel chat
        await interaction.channel.send(`Selamat kepada ${pemenangTerpilih.join(', ')}! Kamu berhasil memenangkan **${hadiah}**! 🎉`);

    } catch (error) {
        console.error(error);
        return interaction.editReply({ content: 'Terjadi kesalahan sistem saat mencoba mengundi giveaway.' });
    }
}


module.exports = { handleGiveawayStart, handleGiveawayEnd };
