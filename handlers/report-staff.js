const { 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');

// ============================================================================
// KONFIGURASI UTAMA (UBAH SESUAI SERVER ANDA)
// ============================================================================

// ATUR DI SINI: ID Kategori tempat channel tiket baru akan dibuat (Opsional)
const CATEGORY_ID = 'TARUH_ID_KATEGORI_TIKET_DISINI'; 

// ATUR DI SINI: Masukkan semua ID Role Petinggi/Admin yang boleh melihat channel tiket ini
// Anda bisa memasukkan 1, 2, atau lebih banyak role di dalam tanda kurung siku []
const ADMIN_ROLE_IDS = [
    'TARUH_ID_ROLE_ADMIN_1_DISINI',
    'TARUH_ID_ROLE_ADMIN_2_DISINI',
    'TARUH_ID_ROLE_ADMIN_3_DISINI'
];

// ATUR DI SINI: Daftar nama staf yang bisa dipilih di server Anda
const DAFTAR_STAFF = [
    { label: 'Staf Alex (Admin)', value: 'Alex' },
    { label: 'Staf Budi (Moderator)', value: 'Budi' },
    { label: 'Staf Citra (Helper)', value: 'Citra' },
];

// Penyimpanan sementara untuk teks alasan (reason) antar tahapan interaksi
const temporaryReasonCache = new Map();

// ============================================================================
// HANDLER INTERAKSI
// ============================================================================

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        
        // ==========================================
        // TAHAP 1: USER KLIK TOMBOL "REPORT STAFF"
        // ==========================================
        if (interaction.isButton() && interaction.customId === 'btn_report_staff') {
            
            const modal = new ModalBuilder()
                .setCustomId('modal_report_staff')
                .setTitle('Form Laporan Staf');

            const ucpInput = new TextInputBuilder()
                .setCustomId('input_ucp_pelapor')
                .setLabel('UCP Pelapor')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Masukkan nama UCP Anda')
                .setRequired(true);

            const namaPelaporInput = new TextInputBuilder()
                .setCustomId('input_nama_pelapor')
                .setLabel('Nama Pelapor (IC)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Masukkan nama karakter Anda')
                .setRequired(true);

            const reasonInput = new TextInputBuilder()
                .setCustomId('input_reason')
                .setLabel('Alasan / Kronologi Kejadian')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Jelaskan kesalahan atau pelanggaran staf secara rinci')
                .setRequired(true);

            const row1 = new ActionRowBuilder().addComponents(ucpInput);
            const row2 = new ActionRowBuilder().addComponents(namaPelaporInput);
            const row3 = new ActionRowBuilder().addComponents(reasonInput);

            modal.addComponents(row1, row2, row3);

            return await interaction.showModal(modal);
        }

        // ==========================================
        // TAHAP 2: USER SUBMIT FORM POPUP (MODAL)
        // ==========================================
        if (interaction.isModalSubmit() && interaction.customId === 'modal_report_staff') {
            
            const ucpPelapor = interaction.fields.getTextInputValue('input_ucp_pelapor');
            const namaPelapor = interaction.fields.getTextInputValue('input_nama_pelapor');
            const reason = interaction.fields.getTextInputValue('input_reason');

            // Simpan teks alasan ke memori sementara
            temporaryReasonCache.set(interaction.user.id, reason);

            // Buat menu dropdown pilihan staf
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`select_staff_report_${ucpPelapor}_${namaPelapor}`)
                .setPlaceholder('Pilih nama staf yang ingin dilaporkan...')
                .addOptions(
                    DAFTAR_STAFF.map(staff => 
                        new StringSelectMenuOptionBuilder()
                            .setLabel(staff.label)
                            .setValue(staff.value)
                    )
                );

            const rowDropdown = new ActionRowBuilder().addComponents(selectMenu);

            return await interaction.reply({
                content: `✅ **Data Terbaca!**\n**UCP:** ${ucpPelapor}\n**Nama:** ${namaPelapor}\n\n👉 **Langkah Terakhir:** Silakan pilih nama staf yang Anda laporkan di bawah ini untuk membuat channel tiket:`,
                components: [rowDropdown],
                ephemeral: true
            });
        }

        // ==========================================
        // TAHAP 3: USER MEMILIH STAF (PROSES BUAT CHANNEL)
        // ==========================================
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_staff_report_')) {
            
            // Beri respons awal agar interaksi tidak kedaluwarsa (timeout)
            await interaction.deferReply({ ephemeral: true });

            // Ekstrak data dari customId
            const dataString = interaction.customId.replace('select_staff_report_', '');
            const [ucpPelapor, namaPelapor] = dataString.split('_');
            const stafTerlapor = interaction.values;

            // Ambil alasan dari cache memori
            const reason = temporaryReasonCache.get(interaction.user.id) || 'Alasan tidak terbaca atau cache kedaluwarsa.';

            // Membuat ID acak 4 digit untuk nama channel
            const randomID = Math.floor(1000 + Math.random() * 9000);
            const channelName = `staff-report-${interaction.user.username}-${randomID}`;

            try {
                // 1. SETTING IZIN: Tutup untuk @everyone, buka untuk Pelapor
                const permissions = [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel], // Sembunyikan dari semua orang
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], // Izinkan Pelapor
                    }
                ];

                // 2. SETTING IZIN MULTI-ROLE: Memasukkan semua role admin yang ada di konfigurasi atas
                ADMIN_ROLE_IDS.forEach(roleId => {
                    // Validasi dasar agar tidak memasukkan teks placeholder bawaan contoh
                    if (roleId && !roleId.startsWith('TARUH_ID_ROLE_')) { 
                        permissions.push({
                            id: roleId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], // Izinkan Admin
                        });
                    }
                });

                // 3. PROSES PEMBUATAN CHANNEL BARU
                const ticketChannel = await interaction.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: CATEGORY_ID || null, // Otomatis masuk ke kategori jika ID diisi
                    permissionOverwrites: permissions,
                });

                // Buat Tampilan Berkas Laporan (Embed)
                const ticketEmbed = new EmbedBuilder()
                    .setTitle('🎫 TIKET LAPORAN STAF BARU')
                    .setDescription(`Halo ${interaction.user}, silakan tunggu tanggapan dari pihak Manajemen Senior di channel ini. Jangan menutup atau menghapus channel ini sebelum instruksi diberikan.`)
                    .setColor('#ff9900')
                    .addFields(
                        { name: '👤 Akun Discord Pelapor', value: `${interaction.user} (${interaction.user.tag})`, inline: false },
                        { name: '🔑 UCP Pelapor', value: ucpPelapor, inline: true },
                        { name: '👔 Nama Karakter (IC)', value: namaPelapor, inline: true },
                        { name: '🚫 Staf yang Dilaporkan', value: `**${stafTerlapor}**`, inline: false },
                        { name: '📝 Alasan / Kronologi Kejadian', value: `\`\`\`${reason}\`\`\``, inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Sistem Tiket Laporan Otomatis' });

                // Gabungkan string mention untuk memanggil seluruh role admin sekaligus
                const adminMentions = ADMIN_ROLE_IDS
                    .filter(id => id && !id.startsWith('TARUH_ID_ROLE_'))
                    .map(id => `<@&${id}>`)
                    .join(' ');

                // Kirim embed dan tag notifikasi ke channel tiket baru
                await ticketChannel.send({ 
                    content: `👋 Selamat datang ${adminMentions} & ${interaction.user}`, 
                    embeds: [ticketEmbed] 
                });

                // Hapus data alasan dari memori sementara agar hemat RAM
                temporaryReasonCache.delete(interaction.user.id);

                // Kirim tautan channel tiket ke pelapor melalui pesan rahasia
                return await interaction.editReply({
                    content: `🎉 **Channel Tiket Berhasil Dibuat!** Silakan menuju ke saluran berikut untuk melanjutkan laporan Anda: ${ticketChannel}`,
                    components: []
                });

            } catch (error) {
                console.error(error);
                return await interaction.editReply({
content: '❌ Terjadi kesalahan saat mencoba membuat channel tiket baru. Pastikan Bot memiliki izin Manage Channels dan susunan ID Role Anda sudah benar.',
components: []
});}}},};