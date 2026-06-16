const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionsBitField,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionType,
    AttachmentBuilder
} = require('discord.js');


const CATEGORY_ID = '1392382458615435270';
const LOG_CHANNEL_ID = '1502910714023645224'; 

// DAFTAR ID ROLE ADMIN YANG BOLEH KLIK SELESAI/TUTUP
const ALLOWED_ADMIN_ROLES = [
    '1392382455981412398',
    '1392382455981412399',
    '1392382455981412393',
    '1392382455981412397',
    '1392382455981412396'
];



// Helper aman untuk membalas interaksi
async function safeReply(interaction, options = {}) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp(options);
        } else {
            return await interaction.reply(options);
        }
    } catch (err) {
        console.error('safeReply gagal:', err);
        // Fallback: jika belum deferred/replied, coba defer + editReply
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply({ flags: 64 });
            }
            await interaction.editReply({ content: options.content || 'Terjadi error saat mengirim balasan.' });
        } catch (e) {
            console.error('safeReply fallback gagal:', e);
        }
    }
}

// --- PANEL UTAMA SETUP ---
client.on('messageCreate', async (message) => {
    if (message.content === '!setup-tiket' && message.member && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setTitle('🛒 Merah Putih Roleplay - Tiket Layanan')
            .setDescription('Silakan klik tombol di bawah untuk memulai proses Top Up atau melihat aturan.')
            .setColor('#5865F2')
            .setFooter({ text: 'Ottibonynyo Mods | Merah Putih' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('buka_modal')
                .setLabel('Buka Tiket')
                .setEmoji('🎫')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('lihat_rules')
                .setLabel('Rules Top Up')
                .setEmoji('📜')
                .setStyle(ButtonStyle.Secondary)
        );

        try {
            await message.channel.send({ embeds: [embed], components: [row] });
            if (message.deletable) await message.delete().catch(() => {});
        } catch (err) {
            console.error('Gagal mengirim setup tiket:', err);
        }
    }
});

client.on('interactionCreate', async (interaction) => {

    // --- LOGIKA SLASH COMMAND (/claimtopup, /closetopup) ---

    if (interaction.isChatInputCommand()) {

        // Amankan defer/reply

        try {

            if (!interaction.replied && !interaction.deferred) {

                await interaction.deferReply({ flags: 64 });

            }

        } catch (err) {

            console.error('Gagal deferReply di slash command tiket.js:', err);

            try { if (!interaction.replied) await interaction.followUp({ content: '❌ Terjadi kesalahan. Coba lagi nanti.', flags: 64 }); } catch {}

            return;

        }



        try {

            // Filter keamanan 1: Cek Admin

            const isAdmin = interaction.member && interaction.member.roles.cache.some(role => ALLOWED_ADMIN_ROLES.includes(role.id));

            if (!isAdmin) {

                return await safeReply(interaction, { content: '❌ Hanya Admin!', flags: 64 });

            }



            // Filter keamanan 2: Hanya bisa digunakan di channel tiket

            if (!interaction.channel || !interaction.channel.name || !interaction.channel.name.startsWith('tiket-')) {

                return await safeReply(interaction, { content: '❌ Command ini hanya bisa digunakan di dalam channel tiket!', flags: 64 });

            }



            // 1. LOGIKA CLAIMTOPUP = SELESAI DENGAN LOG

            if (interaction.commandName === 'claimtopup') {

                const reason = interaction.options.getString('reason') || 'Tidak ada alasan';



                const messages = await interaction.channel.messages.fetch({ limit: 100 });

                let logContent = `LOG TRANSKRIP: ${interaction.channel.name}\nDitutup Oleh: ${interaction.user.tag}\nAlasan: ${reason}\n----------------------------------------\n\n`;

                messages.reverse().forEach(m => logContent += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`);



                const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

                if (logChannel) {

                    const buffer = Buffer.from(logContent, 'utf-8');

                    const attachment = new AttachmentBuilder(buffer, { name: `${interaction.channel.name}-log.txt` });

                    await logChannel.send({

                        content: `✅ **TIKET SELESAI (via /claimtopup)**: Channel **${interaction.channel.name}** ditutup oleh ${interaction.user}.\n**Alasan:** ${reason}`,

                        files: [attachment]

                    }).catch(err => console.error('Gagal kirim log ke logChannel:', err));

                }



                try {

                    await interaction.editReply({ content: '⌛ Memproses log dan menghapus channel...' });

                } catch (e) {

                    console.error('Gagal editReply setelah claimtopup:', e);

                }

                setTimeout(() => interaction.channel.delete().catch(console.error), 3000);

            }



            // 2. LOGIKA CLOSETOPUP = TUTUP TANPA LOG

            if (interaction.commandName === 'closetopup') {

                try {

                    await interaction.editReply({ content: '⚠️ Menutup tiket tanpa log...' });

                } catch (e) {

                    console.error('Gagal editReply closetopup:', e);

                }

                setTimeout(() => interaction.channel.delete().catch(console.error), 3000);

            }



        } catch (error) {

            console.error("Error pada slash command (tiket.js):", error);

            try {

                if (interaction.deferred || interaction.replied) {

                    await interaction.editReply({ content: '❌ Terjadi kesalahan saat memproses perintah.' }).catch(() => {});

                } else {

                    await safeReply(interaction, { content: '❌ Terjadi kesalahan saat memproses perintah.', flags: 64 });

                }

            } catch (e) {

                console.error('Gagal kirim fallback error pada slash command:', e);

            }

        }



        return;

    }



    // --- 0. LOGIKA LIHAT RULES (EPHEMERAL) ---

    if (interaction.isButton() && interaction.customId === 'lihat_rules') {

        const rulesEmbed = new EmbedBuilder()

            .setTitle('📜 Aturan Top Up - Merah Putih Roleplay')

            .setColor('#f1c40f')

            .setDescription(

                "**1. Transaksi In-Game**\nSemua item topup baik itu kendaraan, rumah, atau bisnis **tidak dapat diperjualbelikan** dengan uang IC (Ingame).\n\n" +

                "**2. Kesalahan Transfer**\nKesalahan dalam melakukan transfer **bukan tanggung jawab** dari pihak Merah Putih Roleplay. Mohon teliti sebelum mengirim.\n\n" +

                "**3. Kebijakan Refund**\n**Tidak ada refund** setelah transaksi/pembayaran dilakukan, kecuali terdapat kesalahan teknis atau bug dari server.\n\n" +

                "**4. Pelanggaran Sanksi**\nJika ketahuan melakukan pelanggaran yang berpotensi banned atau berpotensi hilangnya item topup, maka **tidak ada refund** terkait item donate yang hilang.\n\n" +

                "**5. Larangan RMT**\nDilarang keras memperjualbelikan item donate menggunakan uang asli (Rupiah) antar pemain. Pelanggaran berakibat sanksi berat/Banned."

            )

            .setFooter({ text: 'Harap dipatuhi demi kenyamanan bersama.' });



        return safeReply(interaction, { embeds: [rulesEmbed], flags: 64 });

    }



    // --- 1. MUNCULKAN FORM ---

    if (interaction.isButton() && interaction.customId === 'buka_modal') {

        const category = interaction.guild.channels.cache.get(CATEGORY_ID);

        if (!category) return safeReply(interaction, { content: "Error: Kategori tidak ditemukan!", flags: 64 });



        const existingTicket = category.children.cache.find(channel =>

            channel.name.includes(interaction.user.username.toLowerCase())

        );



        if (existingTicket) {

            return safeReply(interaction, {

                content: `❌ Anda sudah memiliki tiket yang masih terbuka di <#${existingTicket.id}>.`,

                flags: 64

            });

        }



        const modal = new ModalBuilder().setCustomId('form_tiket').setTitle('Formulir Detail Pesanan');

        const ucp = new TextInputBuilder().setCustomId('ucp').setLabel("UCP / ID AKUN").setPlaceholder("Masukkan ID Akun Anda").setStyle(TextInputStyle.Short).setRequired(true);

        const nama = new TextInputBuilder().setCustomId('nama').setLabel("NAMA KARAKTER").setPlaceholder("Masukkan Nama Karakter").setStyle(TextInputStyle.Short).setRequired(true);

        const item = new TextInputBuilder().setCustomId('item').setLabel("ITEM TOPUP").setPlaceholder("Contoh: 1000 Gold / Mobil Skyline").setStyle(TextInputStyle.Paragraph).setRequired(true);



        modal.addComponents(new ActionRowBuilder().addComponents(ucp), new ActionRowBuilder().addComponents(nama), new ActionRowBuilder().addComponents(item));

        try {

            await interaction.showModal(modal);

        } catch (err) {

            console.error('Gagal showModal:', err);

            await safeReply(interaction, { content: '❌ Gagal membuka formulir. Coba lagi.', flags: 64 });

        }

        return;

    }



    // --- 2. PROSES SUBMIT FORM ---

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'form_tiket') {

        const valUcp = interaction.fields.getTextInputValue('ucp');

        const valNama = interaction.fields.getTextInputValue('nama');

        const valItem = interaction.fields.getTextInputValue('item');

        const randomID = Math.floor(1000 + Math.random() * 9000);

        const channelName = `tiket-${interaction.user.username}-${randomID}`;



        try {

            const ticketChannel = await interaction.guild.channels.create({

                name: channelName,

                type: ChannelType.GuildText,

                parent: CATEGORY_ID,

                permissionOverwrites: [

                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },

                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles] },

                    ...ALLOWED_ADMIN_ROLES.map(roleId => ({

                        id: roleId,

                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]

                    }))

                ],

            });



            const embedInfo = new EmbedBuilder()

                .setTitle(`Detail Tiket #${randomID}`)

                .addFields(

                    { name: '👤 User', value: `${interaction.user}`, inline: true },

                    { name: '🆔 UCP', value: valUcp, inline: true },

                    { name: '🎮 Karakter', value: valNama, inline: true },

                    { name: '📦 Item', value: valItem }

                )

                .setColor('#2ecc71').setTimestamp();



            const row = new ActionRowBuilder().addComponents(

                new ButtonBuilder().setCustomId('done_tiket').setLabel('Done / Selesai').setEmoji('✅').setStyle(ButtonStyle.Success),

                new ButtonBuilder().setCustomId('tutup_tiket').setLabel('Tutup Tiket').setEmoji('🔒').setStyle(ButtonStyle.Danger)

            );



            await ticketChannel.send({ content: `Halo ${interaction.user}, Admin <@&${ALLOWED_ADMIN_ROLES[2]}> akan segera melayani Anda.`, embeds: [embedInfo], components: [row] });

            await safeReply(interaction, { content: `✅ Tiket Anda berhasil dibuat: ${ticketChannel}`, flags: 64 });



        } catch (error) {

            console.error('Gagal membuat tiket:', error);

            await safeReply(interaction, { content: 'Terjadi kesalahan saat membuat tiket.', flags: 64 });

        }

        return;

    }



    // --- 3. LOGIKA DONE / SELESAI (KHUSUS ADMIN) ---

    if (interaction.isButton() && interaction.customId === 'done_tiket') {

        const isAdmin = interaction.member && interaction.member.roles.cache.some(role => ALLOWED_ADMIN_ROLES.includes(role.id));

        if (!isAdmin) return safeReply(interaction, { content: '❌ Hanya Staf/Admin!', flags: 64 });



        // Defer dulu (ephemeral) agar tidak timeout

        try {

            if (!interaction.replied && !interaction.deferred) {

                await interaction.deferReply({ flags: 64 });

            }

        } catch (err) {

            console.error('Gagal deferReply pada done_tiket:', err);

            try { if (!interaction.replied) await interaction.followUp({ content: '❌ Terjadi kesalahan saat memproses.', flags: 64 }); } catch {}

            return;

        }



        try {

            const messages = await interaction.channel.messages.fetch({ limit: 100 });

            let logContent = `LOG TRANSKRIP: ${interaction.channel.name}\nDitutup Oleh: ${interaction.user.tag}\n----------------------------------------\n\n`;



            messages.reverse().forEach(m => {

                logContent += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;

            });



            const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

            if (logChannel) {

                const buffer = Buffer.from(logContent, 'utf-8');

                const attachment = new AttachmentBuilder(buffer, { name: `${interaction.channel.name}-log.txt` });

                await logChannel.send({

                    content: `✅ **TIKET SELESAI**: Channel **${interaction.channel.name}** ditutup oleh ${interaction.user}.`,

                    files: [attachment]

                }).catch(err => console.error('Gagal kirim log ke channel:', err));

            }



            try {

                await interaction.editReply({ content: '✅ Log berhasil disimpan. Channel akan dihapus dalam 3 detik...' });

            } catch (e) {

                console.error('Gagal editReply setelah menyimpan log:', e);

            }

            setTimeout(() => interaction.channel.delete().catch(console.error), 3000);

        } catch (err) {

            console.error('Error saat memproses done_tiket:', err);

            try { await interaction.editReply({ content: '❌ Terjadi kesalahan saat memproses log.' }); } catch (e) { console.error('Gagal editReply di error handler:', e); }

        }

        return;

    }



    // --- 4. LOGIKA TUTUP (TANPA LOG - JUGA KHUSUS ADMIN) ---

    if (interaction.isButton() && interaction.customId === 'tutup_tiket') {

        const isAdmin = interaction.member && interaction.member.roles.cache.some(role => ALLOWED_ADMIN_ROLES.includes(role.id));

        if (!isAdmin) {

            return safeReply(interaction, { content: '❌ Hanya **Staf/Admin** yang bisa menutup tiket!', flags: 64 });

        }



        try {

            await safeReply(interaction, { content: '⚠️ Menutup tiket tanpa log...', flags: 64 });

        } catch (e) {

            console.error('Gagal safeReply pada tutup_tiket:', e);

        }

        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);

        return;

    }

});

