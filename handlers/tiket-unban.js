const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

module.exports = (client) => {
    const CATEGORY_ID = '1392382459060162633';
    const ADMIN_ROLE_ID = '1392382455947989066';

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

            try {
                await message.channel.send({ embeds: [embed], components: [row] });
            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal mengirim setup embed:', err);
            }
        }
    });

    client.on('interactionCreate', async (interaction) => {
        
        // =======================================================
        // HANDLER UNTUK SLASH COMMAND /ADDTICKET (DARI INDEX.JS)
        // =======================================================
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'addticket') {
                
                try {
                    // Defer dulu
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.deferReply({ flags: 64 });
                    }

                    // 1. Cek apakah pengirim perintah punya Role Admin
                    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                        return await interaction.editReply({ 
                            content: '❌ Hanya Admin yang boleh menggunakan perintah ini!' 
                        });
                    }

                    // 2. Cek apakah perintah diketik di dalam kategori tiket unban
                    if (interaction.channel.parentId !== CATEGORY_ID) {
                        return await interaction.editReply({ 
                            content: '❌ Perintah ini hanya bisa digunakan di dalam channel tiket unban!' 
                        });
                    }

                    // 'target' sesuai dengan nama opsi yang ada di array index.js Anda
                    const targetUser = interaction.options.getUser('target');

                    // 3. Tambahkan izin user baru ke channel ini
                    await interaction.channel.permissionOverwrites.edit(targetUser.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    });

                    return await interaction.editReply({ 
                        content: `✅ Berhasil menambahkan ${targetUser} ke dalam tiket ini.` 
                    });

                } catch (error) {
                    console.error('[UNBAN HANDLER] Error addticket:', error);
                    try {
                        if (interaction.deferred || interaction.replied) {
                            await interaction.editReply({ 
                                content: '❌ Gagal menambahkan pengguna. Pastikan bot memiliki izin mengatur channel!' 
                            });
                        } else {
                            await interaction.reply({ 
                                content: '❌ Gagal menambahkan pengguna. Pastikan bot memiliki izin mengatur channel!', 
                                flags: 64 
                            });
                        }
                    } catch (e) {
                        console.error('[UNBAN HANDLER] Gagal error reply addticket:', e);
                    }
                }
            }
        }

        // 1. MUNCULKAN MODAL
        if (interaction.isButton() && interaction.customId === 'open_unban_form') {
            try {
                const modal = new ModalBuilder()
                    .setCustomId('unban_form_modal')
                    .setTitle('Formulir Request Unbanned');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('ucp')
                            .setLabel("UCP")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('char_name')
                            .setLabel("Nama Karakter")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('reason')
                            .setLabel("Reason/Alasan Banned")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('duration')
                            .setLabel("Banned Duration / Time")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('banned_by')
                            .setLabel("Banned By Admin")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );

                await interaction.showModal(modal);

            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal showModal:', err);
                try {
                    await interaction.reply({
                        content: '❌ Gagal membuka formulir. Coba lagi.',
                        flags: 64
                    });
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply showModal:', e);
                }
            }
        }

        // 2. PROSES TIKET SETELAH SUBMIT MODAL
        if (interaction.isModalSubmit() && interaction.customId === 'unban_form_modal') {
            try {
                await interaction.deferReply({ flags: 64 });

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
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Tutup Tiket')
                        .setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({ 
                    content: `Halo ${interaction.user} & <@&${ADMIN_ROLE_ID}>`, 
                    embeds: [resultEmbed], 
                    components: [row] 
                });

                await interaction.editReply({ 
                    content: `✅ Tiket berhasil dibuat: ${ticketChannel}` 
                });

            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal membuat tiket:', err);
                try {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply({ 
                            content: '❌ Terjadi kesalahan saat membuat tiket.' 
                        });
                    } else {
                        await interaction.reply({ 
                            content: '❌ Terjadi kesalahan saat membuat tiket.', 
                            flags: 64 
                        });
                    }
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply create ticket:', e);
                }
            }
        }

        // 3. TUTUP TIKET (HANYA UNTUK ADMIN)
        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            try {
                if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                    return await interaction.reply({ 
                        content: '❌ Hanya Admin yang boleh menutup tiket ini!', 
                        flags: 64 
                    });
                }

                await interaction.reply('**Tiket ini akan ditutup dan dihapus dalam 5 detik...**');
                setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);

            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal close ticket:', err);
                try {
                    if (!interaction.replied) {
                        await interaction.reply({ 
                            content: '❌ Gagal menutup tiket.', 
                            flags: 64 
                        });
                    }
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply close ticket:', e);
                }
            }
        }

    });

    // Global error handlers
    process.on('unhandledRejection', (err) => console.error('[UNBAN HANDLER] UnhandledRejection:', err));
    process.on('uncaughtException', (err) => console.error('[UNBAN HANDLER] UncaughtException:', err));
};
