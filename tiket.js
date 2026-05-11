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
            .setDescription('Silakan klik tombol di bawah untuk memulai proses Top Up atau Bantuan.')
            .setColor('#5865F2')
            .setFooter({ text: 'Ottibonynyo Mods | Merah Putih' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('buka_modal')
                .setLabel('Buka Tiket')
                .setEmoji('🎫')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        if (message.deletable) await message.delete();
    }
});

client.on('interactionCreate', async (interaction) => {
    
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
        const item = new TextInputBuilder().setCustomId('item').setLabel("ITEM TOPUP").setPlaceholder("Contoh: 1000 Gold").setStyle(TextInputStyle.Paragraph).setRequired(true);

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
                ],
            });

            const embedInfo = new EmbedBuilder()
                .setTitle(`Detail Tiket #${randomID}`)
                .addFields({ name: '👤 User', value: `${interaction.user}`, inline: true }, { name: '🆔 UCP', value: valUcp, inline: true }, { name: '🎮 Karakter', value: valNama, inline: true }, { name: '📦 Item', value: valItem })
                .setColor('#2ecc71').setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('done_tiket').setLabel('Done / Selesai').setEmoji('✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('tutup_tiket').setLabel('Tutup Tiket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ embeds: [embedInfo], components: [row] });
            await interaction.reply({ content: `✅ Tiket Anda berhasil dibuat: ${ticketChannel}`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Terjadi kesalahan saat membuat tiket.', ephemeral: true });
        }
    }

    // --- 3. LOGIKA DONE / SELESAI (KHUSUS ADMIN) ---
    if (interaction.isButton() && interaction.customId === 'done_tiket') {
        // Cek apakah user punya salah satu role admin
        const isAdmin = interaction.member.roles.cache.some(role => ALLOWED_ADMIN_ROLES.includes(role.id));

        if (!isAdmin) {
            return interaction.reply({ content: '❌ Hanya **Staf/Admin** yang bisa menekan tombol Selesai!', ephemeral: true });
        }

        await interaction.reply('⌛ Memproses log dan menghapus channel...');

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

        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
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
