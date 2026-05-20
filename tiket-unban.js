const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const TOKEN = process.env.DISCORD_TOKEN;
const CATEGORY_ID = '1392382459060162633';
const ADMIN_ROLE_ID = '1392382455947989066';

client.once('ready', () => {
    console.log(`Bot Unban Aktif!`);
});

// Setup Command
client.on('messageCreate', async (message) => {
    if (message.content === '!setup-unban') {
        const embed = new EmbedBuilder()
            .setTitle('🎫 Sistem Banding Unban')
            .setDescription('Klik tombol di bawah untuk mengisi formulir permohonan unban.')
            .setColor(0x2F3136);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_unban_form')
                .setLabel('Buka Tiket Unban')
                .setEmoji('📩')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async (interaction) => {
    
    // =======================================================
    // HANDLER UNTUK SLASH COMMAND /ADDTICKET (DARI INDEX.JS)
    // =======================================================
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'addticket') {
            // 1. Cek apakah pengirim perintah punya Role Admin
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                return interaction.reply({ content: '❌ Hanya Admin yang boleh menggunakan perintah ini!', ephemeral: true });
            }

            // 2. Cek apakah perintah diketik di dalam kategori tiket unban
            if (interaction.channel.parentId !== CATEGORY_ID) {
                return interaction.reply({ content: '❌ Perintah ini hanya bisa digunakan di dalam channel tiket unban!', ephemeral: true });
            }

            // 'target' sesuai dengan nama opsi yang ada di array index.js Anda
            const targetUser = interaction.options.getUser('target');

            try {
                // 3. Tambahkan izin user baru ke channel ini
                await interaction.channel.permissionOverwrites.edit(targetUser.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });

                return interaction.reply({ content: `✅ Berhasil menambahkan ${targetUser} ke dalam tiket ini.` });
            } catch (error) {
                console.error(error);
                return interaction.reply({ content: '❌ Gagal menambahkan pengguna. Pastikan bot memiliki izin mengatur channel!', ephemeral: true });
            }
        }
    }

    // 1. MUNCULKAN MODAL
    if (interaction.isButton() && interaction.customId === 'open_unban_form') {
        const modal = new ModalBuilder()
            .setCustomId('unban_form_modal')
            .setTitle('Formulir Request Unbanned');

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ucp').setLabel("UCP").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('char_name').setLabel("Nama Karakter").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel("Reason/Alasan Banned").setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('duration').setLabel("Banned Duration / Time").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('banned_by').setLabel("Banned By Admin").setStyle(TextInputStyle.Short).setRequired(true))
        );

        await interaction.showModal(modal);
    }

    // 2. PROSES TIKET SETELAH SUBMIT MODAL
    if (interaction.isModalSubmit() && interaction.customId === 'unban_form_modal') {
        await interaction.deferReply({ ephemeral: true });

        const data = {
            ucp: interaction.fields.getTextInputValue('ucp'),
            char: interaction.fields.getTextInputValue('char_name'),
            reason: interaction.fields.getTextInputValue('reason'),
            time: interaction.fields.getTextInputValue('duration'),
            admin: interaction.fields.getTextInputValue('banned_by')
        };

        const randomID = Math.floor(1000 + Math.random() * 9000);
        
        // Perbaikan otomatis: Nama channel dipaksa huruf kecil agar Discord API tidak error
        const rawChannelName = `unban-${data.ucp}-${randomID}`;
        const cleanChannelName = rawChannelName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
        
        const ticketChannel = await interaction.guild.channels.create({
            name: cleanChannelName,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            ],
        });

        const resultEmbed = new EmbedBuilder()
            .setTitle(`🎫 Tiket Unban: ${cleanChannelName.toUpperCase()}`)
            .setColor(0xFFFF00)
            .setDescription(
                `👤 **User**\n${interaction.user} (${interaction.user.id})\n\n` +
                `🖥️ **UCP**\n${data.ucp}\n\n` +
                `🎭 **Nama Karakter**\n${data.char}\n\n` +
                `⏳ **Durasi Banned**\n${data.time}\n\n` +
                `👮 **Banned By Admin**\n${data.admin}\n\n` +
                `📝 **Alasan Banned**\n${data.reason}`
            )
            .setTimestamp()
            .setFooter({ text: 'Sistem Tiket Unban', iconURL: interaction.guild.iconURL() });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Tutup Tiket').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `Halo ${interaction.user} & <@&${ADMIN_ROLE_ID}>`, embeds: [resultEmbed], components: [row] });
        await interaction.editReply({ content: `Tiket berhasil dibuat: ${ticketChannel}` });
    }

    // 3. TUTUP TIKET (HANYA UNTUK ADMIN)
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({ content: '❌ Hanya Admin yang boleh menutup tiket ini!', ephemeral: true });
        }

        await interaction.reply('**Tiket ini akan ditutup dan dihapus dalam 5 detik...**');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});

client.login(TOKEN);
