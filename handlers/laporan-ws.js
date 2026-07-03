/**
 * Handler Perintah Lapor Workshop
 * Dikembangkan untuk Merah Putih Bot
 */
const { MessageFlags } = require('discord.js');

async function handleLaporanWorkshop(interaction) {
    // 1. Ambil data input dari form slash command Discord
    const materi = interaction.options.getString('materi');
    const isi = interaction.options.getString('isi_laporan');
    const userTag = interaction.user.tag;

    // 2. Beri respons awal (loading) menggunakan flags terbaru
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // Konfigurasi Repositori
    const REPO_OWNER = 'whoisfeb'; 
    const REPO_NAME = 'Merah-Putih-Roleplay-Bot';    

    // Memanggil GH_TOKEN dari lingkungan kerja GitHub Secrets
    const GH_TOKEN = process.env.GH_TOKEN; 

    // Pengaman: Jika token kosong, hentikan bot sebelum menembak API
    if (!GH_TOKEN) {
        console.error("CRITICAL ERROR: Variabel process.env.GH_TOKEN kosong atau tidak terbaca!");
        return await interaction.editReply({ 
            content: '❌ **Sistem Error!** Token keamanan internal bot belum terpasang di sistem Actions Anda.' 
        });
    }

    try {
        // 🔥 ENDPOINT RESMI GitHub API untuk trigger workflow dispatch
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GH_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Merah-Putih-Bot-App'
            },
            body: JSON.stringify({
                event_type: 'laporan_discord', 
                client_payload: {
                    user: userTag,
                    materi: materi,
                    isi: isi
                }
            })
        });

        // 4. Periksa apakah GitHub API menerima laporan dengan sukses (Status 204 No Content)
        if (response.status === 204 || response.ok) {
            await interaction.editReply({ 
                content: '✅ **Laporan Sukses Terkirim!** Data Anda telah diteruskan ke GitHub Actions untuk dicatat ke dalam berkas log repositori.' 
            });
        } else {
            const errorText = await response.text();
            console.error('GitHub API Error Response:', errorText);
            await interaction.editReply({ 
                content: `❌ **Gagal Mengirim Laporan!** Server GitHub menolak permintaan (Kode: ${response.status}). Periksa kembali konfigurasi token repositori Anda.` 
            });
        }

    } catch (error) {
        console.error('Kesalahan Koneksi ke GitHub API:', error);
        await interaction.editReply({ 
            content: '❌ **Sistem Error!** Bot gagal terhubung ke server GitHub API. Silakan coba beberapa saat lagi.' 
        });
    }
}

module.exports = { handleLaporanWorkshop };