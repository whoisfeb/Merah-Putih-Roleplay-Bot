async function handleGiveawayStart(interaction) {
    if (!interaction.member.permissions.has('ManageMessages')) {
        return interaction.reply({ content: 'Anda tidak memiliki izin untuk membuat giveaway.', ephemeral: true });
    }

    const hadiah = interaction.options.getString('hadiah');
    const jumlahPemenang = interaction.options.getInteger('pemenang');
    const keterangan = interaction.options.getString('keterangan');

    const embedAwal = {
        title: '🎉 GIVEAWAY DIMULAI 🎉',
        description: `**Hadiah:** ${hadiah}\n**Jumlah Pemenang:** ${jumlahPemenang}\n**Informasi:** ${keterangan}\n\nKlik reaksi 🎉 di bawah ini untuk ikut serta!`,
        color: 0x00ff00,
        footer: { text: 'Gunakan perintah /giveaway-end untuk mengundi' }
    };

    const pesan = await interaction.reply({ embeds: [embedAwal], fetchReply: true });
    await pesan.react('🎉');
    
    // Memberitahu admin ID pesan untuk diundi nanti
    await interaction.followUp({ 
        content: `**Giveaway Berhasil Dibuat!**\nUntuk mengundi setelah 3 hari, jalankan perintah:\n\`/giveaway-end message_id: ${pesan.id}\``, 
        ephemeral: true 
    });
}

async function handleGiveawayEnd(interaction) {
    if (!interaction.member.permissions.has('ManageMessages')) {
        return interaction.reply({ content: 'Anda tidak memiliki izin untuk mengundi giveaway.', ephemeral: true });
    }

    const messageId = interaction.options.getString('message_id');
    
    await interaction.reply({ content: 'Sedang mengambil data reaksi dan mengundi...', ephemeral: true });

    try {
        // Ambil pesan berdasarkan ID yang dimasukkan admin
        const pesanTerbaru = await interaction.channel.messages.fetch(messageId);
        const reaksi = pesanTerbaru.reactions.cache.get('🎉');
        
        if (!reaksi) {
            return interaction.followUp({ content: 'Reaksi emoji 🎉 tidak ditemukan pada pesan tersebut.', ephemeral: true });
        }

        // Ambil data embed lama untuk mencari tahu jumlah pemenang & nama hadiah
        const embedLama = pesanTerbaru.embeds[0];
        if (!embedLama) {
            return interaction.followUp({ content: 'Pesan tersebut bukan pesan giveaway valid.', ephemeral: true });
        }

        // Ambil teks hadiah dari embed lama
        const barisHadiah = embedLama.description.split('\n')[0];
        const hadiah = barisHadiah.replace('**Hadiah:** ', '') || 'Hadiah';
        
        // Ambil jumlah pemenang dari embed lama
        const barisPemenang = embedLama.description.split('\n')[1];
        const jumlahPemenang = parseInt(barisPemenang.replace('**Jumlah Pemenang:** ', '')) || 1;

        // Kumpulkan user yang menekan emoji (abaikan bot)
        const users = await reaksi.users.fetch();
        const peserta = users.filter(user => !user.bot).map(user => user.toString());

        if (peserta.length === 0) {
            return interaction.channel.send(`Giveaway untuk **${hadiah}** berakhir, tidak ada peserta.`);
        }

        // Acak pemenang
        const pemenangTerpilih = [];
        for (let i = 0; i < Math.min(jumlahPemenang, peserta.length); i++) {
            const indeksAcak = Math.floor(Math.random() * peserta.length);
            pemenangTerpilih.push(peserta.splice(indeksAcak, 1));
        }

        const embedSelesai = {
            title: '🎉 GIVEAWAY SELESAI 🎉',
            description: `**Hadiah:** ${hadiah}\n**Pemenang:** ${pemenangTerpilih.join(', ')}`,
            color: 0xff0000,
            footer: { text: 'Telah selesai diundi secara manual' }
        };

        await pesanTerbaru.edit({ embeds: [embedSelesai] });
        await interaction.channel.send(`Selamat kepada ${pemenangTerpilih.join(', ')}! Kamu memenangkan **${hadiah}**! 🎉`);

    } catch (error) {
        console.error(error);
        return interaction.followUp({ content: 'Gagal mengundi. Pastikan ID Pesan benar dan perintah dijalankan di channel tempat pesan giveaway berada.', ephemeral: true });
    }
}

module.exports = { handleGiveawayStart, handleGiveawayEnd };
