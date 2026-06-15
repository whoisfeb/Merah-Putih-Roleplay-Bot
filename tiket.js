require('dotenv').config();
const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, ChannelType, PermissionsBitField, EmbedBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CATEGORY_ID = '1392382458615435270';
const LOG_CHANNEL_ID = '1502910714023645224'; 

// DAFTAR ID ROLE ADMIN YANG BOLEH KLIK SELESAI/TUTUP
const ALLOWED_ADMIN_ROLES = [
    '1392382455981412398', /// Role enginer
    '1392382455981412399', /// Role FOunder
    '1392382455981412393', /// Role Management
    '1392382455981412397', /// Role Developer
    '1392382455981412396' /// Role Assistan Developer
];

client.once('ready', () => {
    console.log(`✅ Bot Tiket Pro Online: ${client.user.tag}`);
});

// --- PANEL UTAMA SETUP ---
client.on('messageCreate', async (message) => {
    if (message.content === '!setup-tiket' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
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

        await message.channel.send({ embeds: [embed], components: [row] });
        if (message.deletable) await message.delete();
    }
});

client.on('interactionCreate', async (interaction) => {

// 1. Tangani Slash Command (/claimtopup, /closetopup)
// --- LOGIKA SLASH COMMAND ---
if (interaction.isChatInputCommand()) {
    try {
        // AMANKAN INTERAKSI PERTAMA KALI (Maksimal 3 detik)
        // ephemeral: true membuat pesan loading hanya terlihat oleh pengguna tersebut
        await interaction.deferReply({ ephemeral: true });

        // Filter keamanan 1: Cek Admin
        const isAdmin = interaction.member.roles.cache.some(role => ALLOWED_ADMIN_ROLES.includes(role.id));
        if (!isAdmin) {
            return await interaction.editReply({ content: '❌ Hanya Admin!' });
        }

        // Filter keamanan 2: Hanya bisa digunakan di channel tiket
        if (!interaction.channel.name.startsWith('tiket-')) {
            return await interaction.editReply({ content: '❌ Command ini hanya bisa digunakan di dalam channel tiket!' });
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
                await logChannel.send({ 
                    content: `✅ **TIKET SELESAI (via /claimtopup)**: Channel **${interaction.channel.name}** ditutup oleh ${interaction.user}.\n**Alasan:** ${reason}`,
                    files: [{ attachment: buffer, name: `${interaction.channel.name}-log.txt` }] 
                });
            }
            await interaction.editReply('⌛ Memproses log dan menghapus channel...');
            setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
        }

        // 2. LOGIKA CLOSETOPUP = TUTUP TANPA LOG
        if (interaction.commandName === 'closetopup') {
            await interaction.editReply('⚠️ Menutup tiket tanpa log...');
            setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
        }

    } catch (error) {
        console.error("Error pada slash command:", error);
        // Mencegah bot crash jika interaksi terputus di tengah jalan
        if (interaction.deferred) {
            await interaction.editReply({ content: '❌ Terjadi kesalahan saat memproses perintah.' }).catch(() => {});
        }
    }
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

        return interaction.reply({ embeds: [rulesEmbed], ephemeral: true });
    }

    // --- 1. MUNCULKAN FORM ---
    if (interaction.isButton() && interaction.customId === 'buka_modal') {
        const category = interaction.guild.channels.cache.get(CATEGORY_ID);
        if (!category) return interaction.reply({ content: "Error: Kategori tidak ditemukan!", ephemeral: true });

        const existingTicket = category.children.cache.find(channel => 
            channel.name.includes(interaction.user.username.toLowerCase())
        );

        if (existingTicket) {
            return interaction.reply({ 
                content: `❌ Anda sudah memiliki tiket yang masih terbuka di <#${existingTicket.id}>.`, 
                ephemeral: true 
            });
        }

        const modal = new ModalBuilder().setCustomId('form_tiket').setTitle('Formulir Detail Pesanan');
        const ucp = new TextInputBuilder().setCustomId('ucp').setLabel("UCP / ID AKUN").setPlaceholder("Masukkan ID Akun Anda").setStyle(TextInputStyle.Short).setRequired(true);
        const nama = new TextInputBuilder().setCustomId('nama').setLabel("NAMA KARAKTER").setPlaceholder("Masukkan Nama Karakter").setStyle(TextInputStyle.Short).setRequired(true);
        const item = new TextInputBuilder().setCustomId('item').setLabel("ITEM TOPUP").setPlaceholder("Contoh: 1000 Gold / Mobil Skyline").setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(ucp), new ActionRowBuilder().addComponents(nama), new ActionRowBuilder().addComponents(item));
        await interaction.showModal(modal);
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
                    // Memberikan akses baca untuk admin roles agar bisa melihat tiket
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
            await interaction.reply({ content: `✅ Tiket Anda berhasil dibuat: ${ticketChannel}`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Terjadi kesalahan saat membuat tiket.', ephemeral: true });
        }
    }

    // --- 3. LOGIKA DONE / SELESAI (KHUSUS ADMIN) ---
    // --- 3. LOGIKA DONE / SELESAI (KHUSUS ADMIN) ---
if (interaction.isButton() && interaction.customId === 'done_tiket') {
    const isAdmin = interaction.member.roles.cache.some(role => ALLOWED_ADMIN_ROLES.includes(role.id));
    if (!isAdmin) return interaction.reply({ content: '❌ Hanya Staf/Admin!', ephemeral: true });

    // Tambahkan deferReply agar bot tidak timeout
    await interaction.deferReply();

    try {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        let logContent = `LOG TRANSKRIP: ${interaction.channel.name}\nDitutup Oleh: ${interaction.user.tag}\n----------------------------------------\n\n`;
        
        messages.reverse().forEach(m => {
            logContent += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
        });

        const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const buffer = Buffer.from(logContent, 'utf-8');
            await logChannel.send({ 
                content: `✅ **TIKET SELESAI**: Channel **${interaction.channel.name}** ditutup oleh ${interaction.user}.`,
                files: [{ attachment: buffer, name: `${interaction.channel.name}-log.txt` }] 
            });
        }

        await interaction.editReply('✅ Log berhasil disimpan. Channel akan dihapus dalam 3 detik...');
        setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
    } catch (err) {
        console.error(err);
        await interaction.editReply('❌ Terjadi kesalahan saat memproses log.');
    }
}
    // --- 4. LOGIKA TUTUP (TANPA LOG - JUGA KHUSUS ADMIN) ---
    if (interaction.isButton() && interaction.customId === 'tutup_tiket') {
        const isAdmin = interaction.member.roles.cache.some(role => ALLOWED_ADMIN_ROLES.includes(role.id));

        if (!isAdmin) {
            return interaction.reply({ content: '❌ Hanya **Staf/Admin** yang bisa menutup tiket!', ephemeral: true });
        }

        await interaction.reply('⚠️ Menutup tiket tanpa log...');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }
});

client.login(TOKEN);
