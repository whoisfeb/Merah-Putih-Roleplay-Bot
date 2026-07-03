/**
 * Handler Laporan Workshop Lengkap
 * Termasuk: Form Input, Upload File, Validasi Periode, Kirim GitHub & Discord
 */

const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    MessageFlags
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ============================================
// 1. FUNGSI HITUNG PERIODE LAPORAN
// ============================================
function hitungPeriodeLaporan(tanggalSekarang = new Date()) {
    const tanggal = tanggalSekarang.getDate();
    const bulan = tanggalSekarang.getMonth();
    const tahun = tanggalSekarang.getFullYear();

    let periodeMulai, periodeSelesai, periodeBerikutyaMulai, periodeBerikutnyaSelesai;

    // Tentukan rentang periode
    if (tanggal >= 1 && tanggal <= 5) {
        periodeMulai = new Date(tahun, bulan, 1);
        periodeSelesai = new Date(tahun, bulan, 5);
        periodeBerikutyaMulai = new Date(tahun, bulan, 6);
        periodeBerikutnyaSelesai = new Date(tahun, bulan, 12);
    } else if (tanggal >= 6 && tanggal <= 12) {
        periodeMulai = new Date(tahun, bulan, 6);
        periodeSelesai = new Date(tahun, bulan, 12);
        periodeBerikutyaMulai = new Date(tahun, bulan, 13);
        periodeBerikutnyaSelesai = new Date(tahun, bulan, 19);
    } else if (tanggal >= 13 && tanggal <= 19) {
        periodeMulai = new Date(tahun, bulan, 13);
        periodeSelesai = new Date(tahun, bulan, 19);
        periodeBerikutyaMulai = new Date(tahun, bulan, 20);
        periodeBerikutnyaSelesai = new Date(tahun, bulan, 28);
    } else if (tanggal >= 20 && tanggal <= 28) {
        periodeMulai = new Date(tahun, bulan, 20);
        periodeSelesai = new Date(tahun, bulan, 28);
        periodeBerikutyaMulai = new Date(tahun, bulan + 1, 1);
        periodeBerikutnyaSelesai = new Date(tahun, bulan + 1, 5);
    } else {
        // Periode 29+ (bulan sebelumnya) hingga 5 (bulan sekarang)
        const bulanLalu = bulan === 0 ? 11 : bulan - 1;
        const tahunLalu = bulan === 0 ? tahun - 1 : tahun;
        
        periodeMulai = new Date(tahunLalu, bulanLalu, 29);
        periodeSelesai = new Date(tahun, bulan, 5);
        periodeBerikutyaMulai = new Date(tahun, bulan, 6);
        periodeBerikutnyaSelesai = new Date(tahun, bulan, 12);
    }

    const formatTanggal = (date) => {
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return {
        periodeSekarang: {
            mulai: periodeMulai,
            selesai: periodeSelesai,
            display: `${formatTanggal(periodeMulai)} - ${formatTanggal(periodeSelesai)}`
        },
        periodeBerikutnya: {
            mulai: periodeBerikutyaMulai,
            selesai: periodeBerikutnyaSelesai,
            display: `${formatTanggal(periodeBerikutyaMulai)} - ${formatTanggal(periodeBerikutnyaSelesai)}`
        }
    };
}

// ============================================
// 2. TAMPILKAN FORM MODAL
// ============================================
async function showWorkshopReportForm(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('workshop_report_form')
        .setTitle('📋 Laporan Workshop');

    const namaPemilikInput = new TextInputBuilder()
        .setCustomId('nama_pemilik')
        .setLabel('Nama Pemilik')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const namaWorkshopInput = new TextInputBuilder()
        .setCustomId('nama_workshop')
        .setLabel('Nama Workshop')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const lokasiInput = new TextInputBuilder()
        .setCustomId('lokasi')
        .setLabel('Lokasi (wajib)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200);

    const jumlahKaryawanInput = new TextInputBuilder()
        .setCustomId('jumlah_karyawan')
        .setLabel('Jumlah Karyawan (wajib)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10);

    const keteranganInput = new TextInputBuilder()
        .setCustomId('keterangan')
        .setLabel('Keterangan Tambahan')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500);

    const rows = [
        new ActionRowBuilder().addComponents(namaPemilikInput),
        new ActionRowBuilder().addComponents(namaWorkshopInput),
        new ActionRowBuilder().addComponents(lokasiInput),
        new ActionRowBuilder().addComponents(jumlahKaryawanInput),
        new ActionRowBuilder().addComponents(keteranganInput)
    ];

    modal.addComponents(rows);
    await interaction.showModal(modal);
}

// ============================================
// 3. HANDLE SUBMIT FORM MODAL
// ============================================
async function handleWorkshopReportSubmit(interaction) {
    const namaPemilik = interaction.fields.getTextInputValue('nama_pemilik');
    const namaWorkshop = interaction.fields.getTextInputValue('nama_workshop');
    const lokasi = interaction.fields.getTextInputValue('lokasi');
    const jumlahKaryawan = interaction.fields.getTextInputValue('jumlah_karyawan');
    const keterangan = interaction.fields.getTextInputValue('keterangan') || '-';

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // Buat direktori temp jika belum ada
    const tempDir = path.join(__dirname, '../temp_reports');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // Buat ID unik untuk laporan ini
    const reportId = `${interaction.user.id}_${Date.now()}`;
    const reportPath = path.join(tempDir, `${reportId}.json`);

    // Data laporan sementara
    const reportSession = {
        reportId,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        namaPemilik,
        namaWorkshop,
        lokasi,
        jumlahKaryawan,
        keterangan,
        tanggalForm: new Date().toISOString(),
        files: {
            suratIzin: null,
            fotoLokasi: null,
            fotoDepan: null,
            invoiceBukti: null
        },
        periode: hitungPeriodeLaporan()
    };

    // Simpan ke file
    fs.writeFileSync(reportPath, JSON.stringify(reportSession, null, 2));

    // Buat embed untuk instruksi upload
    const periodeInfo = hitungPeriodeLaporan();
    
    const uploadEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📎 Upload File Laporan Workshop')
        .setDescription('Silakan upload file yang diperlukan di DM. Kirim satu file dengan format: `[1]` untuk surat izin, `[2]` untuk foto lokasi, `[3]` untuk foto depan, `[4]` untuk bukti invoice.')
        .addFields(
            { name: '📋 Data Laporan', 
              value: `**Pemilik:** ${namaPemilik}\n**Workshop:** ${namaWorkshop}\n**Lokasi:** ${lokasi}\n**Karyawan:** ${jumlahKaryawan} orang`, 
              inline: false },
            { name: '📁 File Wajib Upload', 
              value: '`[1]` Surat Izin Workshop\n`[2]` Foto Lokasi\n`[3]` Foto Depan Workshop\n`[4]` Bukti Invoice', 
              inline: false },
            { name: '📅 Periode Laporan', 
              value: periodeInfo.periodeSekarang.display, 
              inline: false },
            { name: '🔄 Laporan Berikutnya', 
              value: periodeInfo.periodeBerikutnya.display, 
              inline: false }
        )
        .setFooter({ text: `Report ID: ${reportId}` })
        .setTimestamp();

    // Kirim DM ke user
    try {
        const dmChannel = await interaction.user.createDM();
        await dmChannel.send({
            embeds: [uploadEmbed]
        });

        await interaction.editReply({
            content: '✅ **Form diterima!** Silakan check DM untuk instruksi upload file yang diperlukan.'
        });
    } catch (error) {
        console.error('Error mengirim DM:', error);
        await interaction.editReply({
            content: '❌ Gagal mengirim DM. Pastikan DM Anda terbuka untuk bot ini.'
        });
    }
}

// ============================================
// 4. HANDLE UPLOAD FILE
// ============================================
async function handleFileUpload(message) {
    // Cek attachment
    if (message.attachments.size === 0) {
        return await message.reply('❌ Tidak ada file yang diupload!');
    }

    const attachment = message.attachments.first();
    const contentMatch = message.content.match(/\[([1-4])\]/);
    const fileType = contentMatch ? contentMatch[1] : null;

    if (!fileType || !['1', '2', '3', '4'].includes(fileType)) {
        return await message.reply('❌ Format salah! Gunakan: `[1]`, `[2]`, `[3]`, atau `[4]`');
    }

    // Map tipe file
    const fileTypeMap = {
        '1': 'suratIzin',
        '2': 'fotoLokasi',
        '3': 'fotoDepan',
        '4': 'invoiceBukti'
    };

    const fileTypeLabel = {
        '1': 'Surat Izin Workshop',
        '2': 'Foto Lokasi',
        '3': 'Foto Depan Workshop',
        '4': 'Bukti Invoice'
    };

    // Validasi extension
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const hasValidExtension = allowedExtensions.some(ext => 
        attachment.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
        return await message.reply('❌ Format file tidak didukung! (PDF, JPG, PNG, DOC)');
    }

    // Validasi ukuran (max 10MB)
    if (attachment.size > 10 * 1024 * 1024) {
        return await message.reply('❌ Ukuran file terlalu besar! (Max 10MB)');
    }

    const periodeInfo = hitungPeriodeLaporan();
    
    const fileData = {
        type: fileTypeMap[fileType],
        typeLabel: fileTypeLabel[fileType],
        name: attachment.name,
        url: attachment.url,
        size: (attachment.size / 1024).toFixed(2),
        uploadedAt: new Date().toISOString(),
        periode: periodeInfo
    };

    // Buat embed konfirmasi
    const confirmEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ File Terterima')
        .addFields(
            { name: '📄 Tipe File', value: fileTypeLabel[fileType], inline: true },
            { name: '📄 Nama File', value: attachment.name, inline: true },
            { name: '📊 Ukuran', value: `${fileData.size} KB`, inline: true },
            { name: '📅 Periode Laporan', value: periodeInfo.periodeSekarang.display, inline: false },
            { name: '🔄 Laporan Berikutnya', value: periodeInfo.periodeBerikutnya.display, inline: false }
        )
        .setTimestamp();

    await message.reply({ embeds: [confirmEmbed] });

    // Kirim ke GitHub
    await kirimLaporanKeGitHub(fileData, message.author);
}

// ============================================
// 5. KIRIM KE GITHUB
// ============================================
async function kirimLaporanKeGitHub(fileData, user) {
    const GH_TOKEN = process.env.GH_TOKEN;
    
    if (!GH_TOKEN) {
        console.error('❌ GH_TOKEN tidak ditemukan');
        return;
    }

    try {
        const response = await fetch('https://api.github.com/repos/whoisfeb/Merah-Putih-Roleplay-Bot/dispatches', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GH_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Merah-Putih-Bot'
            },
            body: JSON.stringify({
                event_type: 'laporan_workshop_file',
                client_payload: {
                    user: user.tag,
                    userId: user.id,
                    file: fileData,
                    periodeLaporan: fileData.periode.periodeSekarang.display,
                    periodeBerikutnya: fileData.periode.periodeBerikutnya.display
                }
            })
        });

        if (response.ok || response.status === 204) {
            console.log(`✅ Laporan dari ${user.tag} terkirim ke GitHub`);
        } else {
            const errorText = await response.text();
            console.error(`❌ GitHub API Error: ${response.status}`, errorText);
        }
    } catch (error) {
        console.error('❌ Error kirim ke GitHub:', error);
    }
}

// ============================================
// 6. KIRIM NOTIF KE DISCORD WEBHOOK
// ============================================
async function kirimNotifDiscord(client, fileData, user) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
        console.error('❌ DISCORD_WEBHOOK_URL tidak ditemukan');
        return;
    }

    const embed = {
        title: '✅ Laporan Workshop Diterima',
        color: 3447003,
        fields: [
            {
                name: 'Pengirim',
                value: user.tag,
                inline: true
            },
            {
                name: 'File Type',
                value: fileData.typeLabel,
                inline: true
            },
            {
                name: 'Nama File',
                value: fileData.name,
                inline: false
            },
            {
                name: '📅 Periode Laporan',
                value: fileData.periode.periodeSekarang.display,
                inline: false
            },
            {
                name: '🔄 Laporan Berikutnya',
                value: fileData.periode.periodeBerikutnya.display,
                inline: false
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'Workshop Report System'
        }
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                embeds: [embed]
            })
        });

        console.log(`✅ Notif Discord terkirim untuk ${user.tag}`);
    } catch (error) {
        console.error('❌ Error kirim notif Discord:', error);
    }
}

// ============================================
// 7. SETUP EVENT LISTENER
// ============================================
function setupWorkshopReportListener(client) {
    // Listen modal submit
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isModalSubmit()) return;
        if (interaction.customId === 'workshop_report_form') {
            await handleWorkshopReportSubmit(interaction);
        }
    });

    // Listen file upload via DM
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.isDM()) return;

        // Cek apakah ini upload file dengan format [1-4]
        if (message.attachments.size > 0 && message.content.match(/\[([1-4])\]/)) {
            await handleFileUpload(message);
        }
    });

    console.log('✅ Workshop Report Listener siap!');
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
    hitungPeriodeLaporan,
    showWorkshopReportForm,
    handleWorkshopReportSubmit,
    handleFileUpload,
    kirimLaporanKeGitHub,
    kirimNotifDiscord,
    setupWorkshopReportListener
};
