const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');

const fs = require('fs');

module.exports = async (interaction, CONFIG) => {

    try {

        // ==========================================
        // /payment
        // ==========================================
        if (
            interaction.isChatInputCommand() &&
            interaction.commandName === 'payment'
        ) {
            // ✅ Sudah auto-deferred di index.js

            // BARU CEK ROLE
            const hasAdminRole = interaction.member.roles.cache.some(role =>
                CONFIG.ADMIN_ROLE_ID.includes(role.id)
            );

            if (!hasAdminRole) {
                return await interaction.editReply({
                    content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
                });
            }

            const paymentEmbed = new EmbedBuilder()
                .setTitle('💳 METODE PEMBAYARAN RESMI')
                .setColor(0x00FF00)
                .setDescription('Pilih metode pembayaran yang kamu inginkan:')
                .setFooter({
                    text: 'Community Store • Harap lampirkan bukti transfer.'
                })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('pay_bank_info')
                        .setLabel('Transfer Bank')
                        .setEmoji('🏦')
                        .setStyle(ButtonStyle.Primary),

                    new ButtonBuilder()
                        .setCustomId('pay_gopay_info')
                        .setLabel('E-Wallet')
                        .setEmoji('📱')
                        .setStyle(ButtonStyle.Secondary),

                    new ButtonBuilder()
                        .setCustomId('pay_qris_info')
                        .setLabel('QRIS')
                        .setEmoji('📲')
                        .setStyle(ButtonStyle.Success)
                );

            await interaction.editReply({
                embeds: [paymentEmbed],
                components: [row]
            });

            return true;
        }

        // ==========================================
        // BUTTON BANK
        // ==========================================
        if (
            interaction.isButton() &&
            interaction.customId === 'pay_bank_info'
        ) {

            const embed = new EmbedBuilder()
                .setTitle('🏦 TRANSFER BANK')
                .setColor(0x3498db)
                .setDescription('Metode pembayaran melalui transfer bank ke rekening resmi kami.')
                .addFields(
                    {
                        name: '📋 LANGKAH-LANGKAH:',
                        value: `
1️⃣ Catat nomor rekening bank di bawah
2️⃣ Buka aplikasi perbankan (mobile/web)
3️⃣ Pilih menu "Transfer Antar Bank"
4️⃣ Masukkan nomor rekening tujuan
5️⃣ Masukkan nominal transfer sesuai pesanan
6️⃣ Konfirmasi dan selesaikan transaksi
7️⃣ Screenshot bukti transfer (nomor referensi harus terlihat jelas)
8️⃣ Kirim bukti ke admin di channel ini
                        `,
                        inline: false
                    },
                    {
                        name: '💰 BANK BRI:',
                        value: `
**Nomor Rekening:**
\`\`\`
COMING SOON
\`\`\`
**Atas Nama:**
\`\`\`
COMING SOON
\`\`\`
                        `,
                        inline: false
                    },
                    {
                        name: '💰 BANK MANDIRI:',
                        value: `
**Nomor Rekening:**
\`\`\`
COMING SOON
\`\`\`
**Atas Nama:**
\`\`\`
COMING SOON
\`\`\`
                        `,
                        inline: false
                    },
                    {
                        name: '✅ SYARAT & KETENTUAN:',
                        value: `
✓ Gunakan bank yang sama dengan rekening Anda
✓ Pastikan nominal transfer **TEPAT SESUAI** dengan yang diminta
✓ Jangan mengurangi atau menambah nominal tanpa izin
✓ Transfer harus dari rekening atas nama sendiri
✓ Bukti transfer harus mencakup nomor referensi & nominal
✓ Tunggu konfirmasi admin maksimal 1 jam
✓ Jika belum dikonfirmasi, hubungi admin
                        `,
                        inline: false
                    },
                    {
                        name: '❌ YANG TIDAK BOLEH DILAKUKAN:',
                        value: `
✗ JANGAN transfer dari rekening orang lain
✗ JANGAN menambah/mengurangi nominal tanpa izin
✗ JANGAN lupa screenshot bukti transfer
✗ JANGAN dikirim ke admin via DM, gunakan channel resmi
✗ JANGAN claim topup sebelum admin konfirmasi
✗ JANGAN buat tiket baru jika sudah ada transaksi pending
✗ JANGAN mencoba transfer berkali-kali dengan nominal berbeda
                        `,
                        inline: false
                    }
                )
                .setFooter({ text: 'Community Store - Jika ada kendala, hubungi admin!' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                components: []
            });

            return true;
        }

        // ==========================================
        // BUTTON E-WALLET
        // ==========================================
        if (
            interaction.isButton() &&
            interaction.customId === 'pay_gopay_info'
        ) {

            const embed = new EmbedBuilder()
                .setTitle('📱 E-WALLET (GoPay & Dana)')
                .setColor(0x1abc9c)
                .setDescription('Metode pembayaran cepat melalui aplikasi e-wallet.')
                .addFields(
                    {
                        name: '📋 LANGKAH-LANGKAH:',
                        value: `
1️⃣ Buka aplikasi GoPay atau Dana di HP Anda
2️⃣ Pilih menu "Kirim Uang" atau "Transfer"
3️⃣ Masukkan nomor telepon tujuan (lihat di bawah)
4️⃣ Masukkan nominal transfer sesuai pesanan
5️⃣ Masukkan PIN/password untuk konfirmasi
6️⃣ Transfer akan langsung terproses
7️⃣ Screenshot bukti transfer (tampilkan nomor pengirim & nominal)
8️⃣ Kirim bukti ke admin di channel ini
                        `,
                        inline: false
                    },
                    {
                        name: '💳 GOPAY:',
                        value: `
**Nomor GoPay:**
\`\`\`
COMING SOON
\`\`\`
**Atas Nama:**
\`\`\`
COMING SOON
\`\`\`
                        `,
                        inline: false
                    },
                    {
                        name: '💳 DANA:',
                        value: `
**Nomor Dana:**
\`\`\`
COMING SOON
\`\`\`
**Atas Nama:**
\`\`\`
COMING SOON
\`\`\`
                        `,
                        inline: false
                    },
                    {
                        name: '⚡ KECEPATAN TRANSAKSI:',
                        value: `
✓ GoPay: Transfer instant (langsung terproses)
✓ Dana: Transfer instant (langsung terproses)
✓ Konfirmasi admin: 15-30 menit
✓ Tercepat dibanding bank transfer
                        `,
                        inline: false
                    },
                    {
                        name: '✅ SYARAT & KETENTUAN:',
                        value: `
✓ Pastikan saldo e-wallet cukup sebelum transfer
✓ Nominal transfer harus **TEPAT SESUAI** pesanan
✓ Jangan kirim ke nomor lain selain nomor resmi kami
✓ Gunakan fitur "Transfer ke GoPay/Dana"
✓ Bukti transfer harus jelas menampilkan nomor & nominal
✓ Konfirmasi dari admin akan dikirim via DM
✓ Tidak ada biaya admin untuk transfer e-wallet
                        `,
                        inline: false
                    },
                    {
                        name: '❌ YANG TIDAK BOLEH DILAKUKAN:',
                        value: `
✗ JANGAN transfer ke nomor lain (hanya ke nomor resmi)
✗ JANGAN mengurangi nominal transfer
✗ JANGAN kirim ke akun/nomor yang tidak terdaftar
✗ JANGAN lupa screenshot bukti sebelum menutup app
✗ JANGAN menggunakan akun yang bukan punya Anda
✗ JANGAN dikirim via DM, gunakan channel topup resmi
✗ JANGAN claim topup sebelum admin konfirmasi
✗ JANGAN transfer berkali-kali dengan nominal sama
                        `,
                        inline: false
                    }
                )
                .setFooter({ text: 'Ottibonynyo Mods • Instant & Aman!' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                components: []
            });

            return true;
        }

        // ==========================================
        // BUTTON QRIS
        // ==========================================
        if (
            interaction.isButton() &&
            interaction.customId === 'pay_qris_info'
        ) {

            const embed = new EmbedBuilder()
                .setTitle('📲 PEMBAYARAN QRIS')
                .setColor(0x9b59b6)
                .setDescription('Metode pembayaran paling cepat & aman menggunakan QRIS.')
                .addFields(
                    {
                        name: '📋 LANGKAH-LANGKAH:',
                        value: `
1️⃣ Lihat gambar QRIS di bawah (scroll ke bawah)
2️⃣ Buka aplikasi e-wallet (GoPay, Dana, OVO, dll)
3️⃣ Pilih menu "Scan QRIS" atau "Bayar dengan QRIS"
4️⃣ Arahkan kamera ke QR Code di bawah
5️⃣ Tunggu sampai nominal muncul otomatis
6️⃣ Verifikasi nominal sesuai pesanan Anda
7️⃣ Masukkan PIN/password untuk konfirmasi
8️⃣ Pembayaran akan langsung terproses
9️⃣ Screenshot bukti pembayaran
🔟 Kirim bukti ke admin di channel ini
                        `,
                        inline: false
                    },
                    {
                        name: '⚡ KEUNTUNGAN QRIS:',
                        value: `
✓ Paling cepat - instant pembayaran
✓ Bisa dari aplikasi e-wallet apapun
✓ Aman - gunakan kamera, tidak perlu nomor rekening
✓ Tidak ada biaya admin
✓ Cocok untuk semua jenis e-wallet (GoPay, Dana, OVO, LinkAja, dll)
                        `,
                        inline: false
                    },
                    {
                        name: '✅ SYARAT & KETENTUAN:',
                        value: `
✓ Pastikan smartphone Anda terhubung internet
✓ Aplikasi e-wallet harus terinstall & aktif
✓ Nominal akan muncul otomatis saat scan, sesuaikan dengan pesanan
✓ Jangan ubah nominal tanpa izin admin
✓ Screenshot bukti dengan jelas menampilkan waktu & nominal
✓ Pastikan kamera smartphone dalam kondisi baik
✓ Scan dari jarak 10-20cm untuk hasil optimal
✓ Tunggu notifikasi sukses sebelum menutup aplikasi
                        `,
                        inline: false
                    },
                    {
                        name: '❌ YANG TIDAK BOLEH DILAKUKAN:',
                        value: `
✗ JANGAN ubah nominal saat scan QRIS
✗ JANGAN screenshot QR code untuk dikirim ke orang lain
✗ JANGAN close aplikasi sebelum pembayaran selesai
✗ JANGAN scan dari screenshot/foto (harus langsung scan)
✗ JANGAN gunakan e-wallet orang lain
✗ JANGAN lupa screenshot bukti pembayaran
✗ JANGAN dikirim bukti via DM, gunakan channel resmi
✗ JANGAN claim topup sebelum admin konfirmasi
✗ JANGAN scan berkali-kali (hanya 1x pembayaran)
✗ JANGAN share QRIS ke orang yang tidak berhak
                        `,
                        inline: false
                    }
                )
                .setFooter({ text: 'Ottibonynyo Mods • Scan & Bayar dalam 30 detik!' })
                .setTimestamp();

            const qrisPath = `./${CONFIG.QRIS_FILE_NAME}`;

            if (!fs.existsSync(qrisPath)) {

                return interaction.editReply({
                    content: `❌ File QRIS tidak ditemukan.\nPath: \`${qrisPath}\``,
                    components: []
                });

            }

            const qris = new AttachmentBuilder(qrisPath);

            await interaction.editReply({
                embeds: [embed],
                files: [qris],
                components: []
            });

            return true;
        }

        return false;

    } catch (err) {

        console.error('[PAYMENT HANDLER ERROR]', err);

        try {

            await interaction.editReply({
                content: '❌ Terjadi kesalahan saat memproses payment.'
            });

        } catch (_) {}

        return true;
    }
};