const BADWORDS = [
    'free', 'tolol', 'goblok', 'bego', 'pepek', 'dongo', 'tai', 'kontol', 
    'bio', 'sexcam', 'entot', 'ngentot', 'join', 'invite', 'anjing', 
    'babi', 'memek', 'ngewe', 'ewe', 'lonte', 'pler', 'bgst', 'bangsat'
];

module.exports = async (message, CONFIG) => {
    if (message.author.bot) return;

    // ⛔ SKIP JIKA USER PUNYA ROLE ADMIN
    if (
        message.member &&
        CONFIG.ADMIN_ROLE_ID.some(roleID =>
            message.member.roles.cache.has(roleID)
        )
    ) {
        return;
    }

    const foundBadWord = BADWORDS.find(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(message.content);
    });
    
    if (foundBadWord) {
        try {
            // 🔎 Validasi tambahan: Pastikan bot punya izin & pesan bisa dihapus
            if (message.deletable) {
                await message.delete();
            } else {
                return console.log(`[Info] Bot tidak memiliki izin untuk menghapus pesan di channel ini.`);
            }
            
            // Simpan pesan bot ke dalam variabel
            const sentMessage = await message.channel.send(
                `Hey ${message.author}, astagfirullah tidak boleh mengetik kata kata kasar yah sayang!`
            );

            // Hapus pesan bot setelah 10.000 milidetik (10 detik)
            setTimeout(async () => {
                try {
                    await sentMessage.delete();
                } catch (err) {
                    // Abaikan jika pesan peringatan bot juga sudah dihapus manual oleh admin/user
                    if (err.code === 10008) return;
                    console.error('[ERROR] Gagal menghapus pesan bot:', err);
                }
            }, 10000);

        } catch (error) {
            // 🎯 Solusi Utama: Jika error karena pesan sudah tidak ada, abaikan saja
            if (error.code === 10008) {
                return console.log(`[Info] Pesan kotor dari ${message.author.tag} sudah dihapus terlebih dahulu oleh user/bot lain.`);
            }
            
            // Tetap cetak jika ada error jenis lain (misal: masalah jaringan Discord)
            console.error('[ERROR] Gagal memproses kata kasar:', error);
        }
        return; 
    }
};
