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

const ALLOWED_ADMIN_ROLES = [
    '1392382455981412398', '1392382455981412399', 
    '1392382455981412393', '1392382455981412397', 
    '1392382455981412396'
];

client.once('clientReady', () => {
    console.log(`✅ Bot Tiket Pro Online: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.content === '!setup-tiket' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setTitle('🛒 Merah Putih Roleplay - Tiket Layanan')
            .setDescription('Silakan klik tombol di bawah untuk memulai proses Top Up atau melihat aturan.')
            .setColor('#5865F2')
            .setFooter({ text: 'Ottibonynyo Mods | Merah Putih' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buka_modal').setLabel('Buka Tiket').setEmoji('🎫').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('lihat_rules').setLabel('Rules Top Up').setEmoji('📜').setStyle(ButtonStyle.Secondary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        if (message.deletable) await message.delete();
    }
});

client.on('interactionCreate', async (interaction) => {
    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
        const isAdmin = interaction.member.roles.cache.some(role => ALLOWED_ADMIN_ROLES.includes(role.id));
        if (!isAdmin) return interaction.reply({ content: '❌ Hanya Admin!', ephemeral: true });
        if (!interaction.channel.name.startsWith('tiket-')) return interaction.reply({ content: '❌ Command ini hanya bisa digunakan di dalam channel tiket!', ephemeral: true });

        await interaction.deferReply();

        if (interaction.commandName === 'claimtopup') {
            const reason = interaction.options.getString('reason') || 'Tidak ada alasan';
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            let logContent = `LOG TRANSKRIP: ${interaction.channel.name}\nDitutup Oleh: ${interaction.user.tag}\nAlasan: ${reason}\n----------------------------------------\n\n`;
            messages.reverse().forEach(m => logContent += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`);

            const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                await logChannel.send({ 
                    content: `✅ **TIKET SELESAI (via /claimtopup)**: Channel **${interaction.channel.name}** ditutup oleh ${interaction.user}.\n**Alasan:** ${reason}`,
                    files: [{ attachment: Buffer.from(logContent, 'utf-8'), name: `${interaction.channel.name}-log.txt` }] 
                });
            }
            await interaction.editReply('⌛ Memproses log dan menghapus channel...');
            setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
        }

        if (interaction.commandName === 'closetopup') {
            await interaction.editReply('⚠️ Menutup tiket tanpa log...');
            setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
        }
    }

    // 2. Button Logic
    if (interaction.isButton()) {
        if (interaction.customId === 'lihat_rules') {
            const rulesEmbed = new EmbedBuilder()
                .setTitle('📜 Aturan Top Up - Merah Putih Roleplay')
                .setColor('#f1c40f')
                .setDescription("1. Transaksi In-Game tidak boleh diperjualbelikan.\n2. Kesalahan transfer bukan tanggung jawab kami.\n3. Tidak ada refund.\n4. Pelanggaran berakibat sanksi.\n5. Dilarang RMT.")
                .setFooter({ text: 'Harap dipatuhi demi kenyamanan bersama.' });
            return interaction.reply({ embeds: [rulesEmbed], ephemeral: true });
        }

        if (interaction.customId === 'buka_modal') {
            const existingTicket = interaction.guild.channels.cache.find(c => c.name.includes(interaction.user.username.toLowerCase()));
            if (existingTicket) return interaction.reply({ content: `❌ Anda sudah memiliki tiket di <#${existingTicket.id}>.`, ephemeral: true });
            
            const modal = new ModalBuilder().setCustomId('form_tiket').setTitle('Formulir Detail Pesanan');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ucp').setLabel("UCP / ID AKUN").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nama').setLabel("NAMA KARAKTER").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item').setLabel("ITEM TOPUP").setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'done_tiket' || interaction.customId === 'tutup_tiket') {
            const isAdmin = interaction.member.roles.cache.some(role => ALLOWED_ADMIN_ROLES.includes(role.id));
            if (!isAdmin) return interaction.reply({ content: '❌ Hanya Admin!', ephemeral: true });

            await interaction.deferReply(); 

            if (interaction.customId === 'done_tiket') {
                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                let logContent = `LOG TRANSKRIP: ${interaction.channel.name}\nDitutup Oleh: ${interaction.user.tag}\n----------------------------------------\n\n`;
                messages.reverse().forEach(m => logContent += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`);

                const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    await logChannel.send({ 
                        content: `✅ **TIKET SELESAI**: Channel **${interaction.channel.name}** ditutup oleh ${interaction.user}.`,
                        files: [{ attachment: Buffer.from(logContent, 'utf-8'), name: `${interaction.channel.name}-log.txt` }] 
                    });
                }
                await interaction.editReply('✅ Log tersimpan. Menghapus channel...');
            } else {
                await interaction.editReply('⚠️ Menutup tiket tanpa log...');
            }
            setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        }
    } // <--- Penutup blok if(interaction.isButton()) yang sebelumnya hilang

    // 3. Modal Submit
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'form_tiket') {
        await interaction.deferReply({ ephemeral: true });
        const ticketChannel = await interaction.guild.channels.create({
            name: `tiket-${interaction.user.username}-${Math.floor(1000 + Math.random() * 9000)}`,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID
        });

        const embedInfo = new EmbedBuilder().setTitle('Detail Tiket').addFields(
            { name: 'UCP', value: interaction.fields.getTextInputValue('ucp') },
            { name: 'Karakter', value: interaction.fields.getTextInputValue('nama') },
            { name: 'Item', value: interaction.fields.getTextInputValue('item') }
        );
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('done_tiket').setLabel('Done').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('tutup_tiket').setLabel('Tutup').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `${interaction.user}`, embeds: [embedInfo], components: [row] });
        await interaction.editReply({ content: `✅ Tiket berhasil dibuat: ${ticketChannel}` });
    }
});

client.login(TOKEN);
