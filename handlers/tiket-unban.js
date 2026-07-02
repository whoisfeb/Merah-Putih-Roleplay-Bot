const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder
} = require('discord.js');

module.exports = (client) => {
    const CATEGORY_ID = '1392382459060162633';
    const ADMIN_ROLE_ID = '1392382455947989066';
    // Optional: isi ID channel log staff jika mau semua aksi di-log ke satu channel
    const STAFF_LOG_CHANNEL_ID = '1519299286385561640'; // contoh: '123456789012345678'

    // Helper: parse topic untuk ownerId, status unbanned, banned_admin_id, dan selected_admin
    async function readTicketMeta(channel) {
        let ownerId = null;
        let unbanned = false;
        let bannedAdminId = null;
        let selectedAdmin = null;

        if (channel.topic) {
            const ownerMatch = channel.topic.match(/ticketOwner:\s*(\d+)/i);
            if (ownerMatch) ownerId = ownerMatch[1];
            const unbannedMatch = channel.topic.match(/unbanned:\s*(true|false)/i);
            if (unbannedMatch) unbanned = unbannedMatch[1].toLowerCase() === 'true';
            const bannedAdminMatch = channel.topic.match(/bannedAdmin:\s*(\d+)/i);
            if (bannedAdminMatch) bannedAdminId = bannedAdminMatch[1];
            const selectedAdminMatch = channel.topic.match(/selectedAdmin:\s*(\d+)/i);
            if (selectedAdminMatch) selectedAdmin = selectedAdminMatch[1];
        }

        // fallback: coba deteksi dari permission overwrites (cari member overwrite)
        if (!ownerId && channel.permissionOverwrites) {
            for (const [id, overwrite] of channel.permissionOverwrites.cache) {
                if (id === channel.guild.id) continue;
                if (id === ADMIN_ROLE_ID) continue;
                try {
                    await channel.guild.members.fetch(id);
                    ownerId = id;
                    break;
                } catch {
                    // bukan member id, lanjut
                }
            }
        }

        return { ownerId, unbanned, bannedAdminId, selectedAdmin };
    }

    // Helper: tulis/update topic untuk menyimpan meta
    async function writeTicketMeta(channel, meta = {}) {
        const existing = channel.topic || '';
        const ownerId = meta.ownerId;
        const unbanned = typeof meta.unbanned === 'boolean' ? meta.unbanned : null;
        const bannedAdminId = meta.bannedAdminId;
        const selectedAdmin = meta.selectedAdmin;

        let newTopic = existing;

        if (ownerId) {
            if (/ticketOwner:\s*\d+/i.test(newTopic)) {
                newTopic = newTopic.replace(/ticketOwner:\s*\d+/i, `ticketOwner:${ownerId}`);
            } else {
                newTopic = (newTopic ? newTopic + ' ; ' : '') + `ticketOwner:${ownerId}`;
            }
        }

        if (unbanned !== null) {
            if (/unbanned:\s*(true|false)/i.test(newTopic)) {
                newTopic = newTopic.replace(/unbanned:\s*(true|false)/i, `unbanned:${unbanned}`);
            } else {
                newTopic = (newTopic ? newTopic + ' ; ' : '') + `unbanned:${unbanned}`;
            }
        }

        if (bannedAdminId) {
            if (/bannedAdmin:\s*\d+/i.test(newTopic)) {
                newTopic = newTopic.replace(/bannedAdmin:\s*\d+/i, `bannedAdmin:${bannedAdminId}`);
            } else {
                newTopic = (newTopic ? newTopic + ' ; ' : '') + `bannedAdmin:${bannedAdminId}`;
            }
        }

        if (selectedAdmin) {
            if (/selectedAdmin:\s*\d+/i.test(newTopic)) {
                newTopic = newTopic.replace(/selectedAdmin:\s*\d+/i, `selectedAdmin:${selectedAdmin}`);
            } else {
                newTopic = (newTopic ? newTopic + ' ; ' : '') + `selectedAdmin:${selectedAdmin}`;
            }
        }

        if (newTopic !== existing) {
            try {
                await channel.setTopic(newTopic).catch(() => {});
            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal setTopic:', err);
            }
        }
    }

    // Helper: cek apakah interaction.user adalah admin
    function isAdmin(interaction) {
        try {
            return interaction.member.roles.cache.has(ADMIN_ROLE_ID);
        } catch {
            return false;
        }
    }

    // Setup Command
    client.on('messageCreate', async (message) => {
        if (message.content === '!setup-unban') {
            const embed = new EmbedBuilder()
                .setTitle('🎫 Ticket Unbanned')
                .setDescription('Silahkan klik tombol di bawah untuk membuat tiket unban.')
                .setColor(0x2F3136);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open_unban_form')
                    .setLabel('Buat Tiket Unbanned')
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
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.deferReply({ ephemeral: true });
                    }

                    if (!isAdmin(interaction)) {
                        return await interaction.editReply({
                            content: '❌ Hanya Admin yang boleh menggunakan perintah ini!'
                        });
                    }

                    if (interaction.channel.parentId !== CATEGORY_ID) {
                        return await interaction.editReply({
                            content: '❌ Perintah ini hanya bisa digunakan di dalam channel tiket unban!'
                        });
                    }

                    const targetUser = interaction.options.getUser('target');

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
                                ephemeral: true
                            });
                        }
                    } catch (e) {
                        console.error('[UNBAN HANDLER] Gagal error reply addticket:', e);
                    }
                }
            }
        }

        // 1. MUNCULKAN MODAL (tanpa "Banned By Admin" - akan diganti dengan dropdown nanti)
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
                    )
                );

                await interaction.showModal(modal);

            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal showModal:', err);
                try {
                    await interaction.reply({
                        content: '❌ Gagal membuka formulir. Coba lagi.',
                        ephemeral: true
                    });
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply showModal:', e);
                }
            }
        }

        // 2. PROSES TIKET SETELAH SUBMIT MODAL - TAMPILKAN DROPDOWN ADMIN
        if (interaction.isModalSubmit() && interaction.customId === 'unban_form_modal') {
            try {
                await interaction.deferReply({ ephemeral: true });

                const data = {
                    ucp: interaction.fields.getTextInputValue('ucp'),
                    char: interaction.fields.getTextInputValue('char_name'),
                    reason: interaction.fields.getTextInputValue('reason'),
                    time: interaction.fields.getTextInputValue('duration')
                };

                // Fetch admin role members untuk dropdown
                let adminMembers = [];
                try {
                    const adminRole = await interaction.guild.roles.fetch(ADMIN_ROLE_ID);
                    if (adminRole) {
                        adminMembers = adminRole.members.map(member => ({
                            id: member.id,
                            name: member.user.username
                        }));
                    }
                } catch (err) {
                    console.error('[UNBAN HANDLER] Gagal fetch admin members:', err);
                }

                if (adminMembers.length === 0) {
                    return await interaction.editReply({
                        content: '❌ Tidak ada admin ditemukan. Hubungi server administrator.'
                    });
                }

                // Buat dropdown menu untuk pilih admin
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_admin_${interaction.user.id}_${Date.now()}`)
                    .setPlaceholder('Pilih Admin yang mem-ban Anda')
                    .addOptions(
                        adminMembers.map(admin => ({
                            label: admin.name,
                            value: admin.id,
                            description: `Admin ID: ${admin.id}`
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);

                // Simpan data form ke interaction untuk diakses nanti
                interaction.client.tempFormData = interaction.client.tempFormData || {};
                interaction.client.tempFormData[`${interaction.user.id}_${Date.now()}`] = {
                    ...data,
                    userId: interaction.user.id,
                    userName: interaction.user.username,
                    timestamp: Date.now()
                };

                await interaction.editReply({
                    content: '📋 Silahkan pilih admin yang mem-ban Anda:',
                    components: [row]
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
                            ephemeral: true
                        });
                    }
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply create ticket:', e);
                }
            }
        }

        // 2.5 HANDLE SELECT MENU - BUAT TIKET SETELAH PILIH ADMIN
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_admin_')) {
            try {
                await interaction.deferReply({ ephemeral: true });

                const selectedAdminId = interaction.values[0];
                const formDataKey = interaction.customId.replace('select_admin_', '');
                const formData = interaction.client.tempFormData?.[formDataKey];

                if (!formData) {
                    return await interaction.editReply({
                        content: '❌ Data form tidak ditemukan. Silahkan coba lagi.'
                    });
                }

                // Get admin name
                let adminName = 'Unknown Admin';
                try {
                    const adminMember = await interaction.guild.members.fetch(selectedAdminId);
                    adminName = adminMember.user.username;
                } catch (err) {
                    console.error('[UNBAN HANDLER] Gagal fetch admin member:', err);
                }

                const randomID = Math.floor(1000 + Math.random() * 9000);
                const rawChannelName = `unban-${formData.ucp}-${randomID}`;
                const cleanChannelName = rawChannelName.toLowerCase().replace(/[^a-z0-9-_]/g, '');

                // Buat ticket channel dengan permissions yang tepat
                const ticketChannel = await interaction.guild.channels.create({
                    name: cleanChannelName,
                    type: ChannelType.GuildText,
                    parent: CATEGORY_ID,
                    topic: `ticketOwner:${formData.userId} ; unbanned:false ; bannedAdmin:${selectedAdminId} ; selectedAdmin:${selectedAdminId}`,
                    permissionOverwrites: [
                        // Deny everyone
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        // Allow ticket creator
                        { id: formData.userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        // Allow admin role
                        { id: ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        // Allow the selected admin who banned
                        { id: selectedAdminId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    ],
                });

                const resultEmbed = new EmbedBuilder()
                    .setTitle(`🎫 Tiket Unban: ${cleanChannelName.toUpperCase()}`)
                    .setColor(0xFFFF00)
                    .setDescription(
                        `👤 **User**\n${formData.userName} (${formData.userId})\n\n` +
                        `🖥️ **UCP**\n${formData.ucp}\n\n` +
                        `🎭 **Nama Karakter**\n${formData.char}\n\n` +
                        `⏳ **Durasi Banned**\n${formData.time}\n\n` +
                        `👮 **Banned By Admin**\n${adminName}\n\n` +
                        `📝 **Alasan Banned**\n${formData.reason}`
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Sistem Tiket Unban', iconURL: interaction.guild.iconURL() });

                const actionRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('mark_unbanned')
                        .setLabel('Mark as Unbanned')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Tutup Tiket')
                        .setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({
                    content: `Halo <@${formData.userId}> kirim screenshot banned & tunggu respon dari <@&${ADMIN_ROLE_ID}>`,
                    embeds: [resultEmbed],
                    components: [actionRow]
                });

                // Cleanup temp data
                if (interaction.client.tempFormData?.[formDataKey]) {
                    delete interaction.client.tempFormData[formDataKey];
                }

                await interaction.editReply({
                    content: `✅ Tiket berhasil dibuat: ${ticketChannel}`
                });

            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal membuat tiket dari select menu:', err);
                try {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply({
                            content: '❌ Terjadi kesalahan saat membuat tiket.'
                        });
                    } else {
                        await interaction.reply({
                            content: '❌ Terjadi kesalahan saat membuat tiket.',
                            ephemeral: true
                        });
                    }
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply select menu:', e);
                }
            }
        }

        // Handler untuk tombol "Mark as Unbanned" (Hanya Admin yang membuat ban atau admin role)
        if (interaction.isButton() && interaction.customId === 'mark_unbanned') {
            try {
                const channel = interaction.channel;
                const { ownerId, selectedAdmin } = await readTicketMeta(channel);

                // Cek apakah user adalah admin role, ticket owner, atau admin yang mem-ban
                const isAdminRole = isAdmin(interaction);
                const isTicketOwner = interaction.user.id === ownerId;
                const isBannedAdmin = selectedAdmin && interaction.user.id === selectedAdmin;

                if (!isAdminRole && !isTicketOwner && !isBannedAdmin) {
                    return await interaction.reply({
                        content: '❌ Hanya admin role, pembuat tiket, atau admin yang mem-ban yang dapat menandai unban!',
                        ephemeral: true
                    });
                }

                // Hanya admin dan banned admin yang boleh klik tombol, owner tidak
                if (!isAdminRole && !isBannedAdmin) {
                    return await interaction.reply({
                        content: '❌ Hanya admin role atau admin yang mem-ban yang dapat menandai unban!',
                        ephemeral: true
                    });
                }

                if (!ownerId) {
                    return await interaction.reply({
                        content: '⚠️ Tidak dapat menemukan pemilik tiket (owner).',
                        ephemeral: true
                    });
                }

                // coba kirim DM ke owner
                let dmSuccess = false;
                try {
                    const member = await interaction.guild.members.fetch(ownerId);
                    if (member) {
                        await member.send({
                            content: `Halo ${member.user.username},\n\nStaff telah menandai bahwa Anda *telah di-unban* atau proses unban telah dilakukan terkait tiket \`${channel.name}\` di server **${interaction.guild.name}**.\nJika masih ada masalah, silahkan hubungi staff.`
                        });
                        dmSuccess = true;
                    }
                } catch (err) {
                    console.error('[UNBAN HANDLER] Gagal mengirim DM pada mark_unbanned:', err);
                    dmSuccess = false;
                }

                // update topic -> unbanned:true
                await writeTicketMeta(channel, { ownerId, unbanned: true, selectedAdmin });

                // kirim pesan di channel tiket untuk log (non-ephemeral)
                const logMsg = dmSuccess
                    ? `✅ Pemilik tiket telah diberitahu lewat DM bahwa mereka sudah di-unban. Channel akan ditutup otomatis.`
                    : `⚠️ Gagal mengirim DM ke pemilik tiket. Pemilik mungkin mematikan DM; channel akan tetap ditutup otomatis.`;

                try {
                    await channel.send({ content: `**[SYSTEM]** ${interaction.user.tag} menandai user sebagai *UNBANNED*.\n${logMsg}` });
                } catch (err) {
                    console.error('[UNBAN HANDLER] Gagal kirim pesan log di channel:', err);
                }

                // KIRIM KE CHANNEL LOGS
                if (STAFF_LOG_CHANNEL_ID) {
                    try {
                        const logChan = await interaction.guild.channels.fetch(STAFF_LOG_CHANNEL_ID);
                        if (logChan && logChan.isTextBased()) {
                            await logChan.send({
                                content: `📌 Mark Unbanned oleh **${interaction.user.tag}**\nTicket: ${channel.name}\nOwner: <@${ownerId}>\nDM sent: ${dmSuccess}`
                            });
                        }
                    } catch (err) {
                        console.error('[UNBAN HANDLER] Gagal kirim staff log:', err);
                    }
                }

                await interaction.reply({ content: '✅ User ditandai sebagai UNBANNED. Channel akan ditutup otomatis dalam 5 detik.', ephemeral: true });

                // otomatis hapus channel setelah delay
                setTimeout(() => channel.delete().catch(() => {}), 5000);

            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal mark_unbanned:', err);
                try {
                    return await interaction.reply({ content: '❌ Terjadi kesalahan saat menandai unban.', ephemeral: true });
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply mark_unbanned:', e);
                }
            }
        }

        // 3. TUTUP TIKET (Hanya Admin Role dan Admin yang mem-ban - Tanpa Kirim Log)
        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            try {
                const channel = interaction.channel;
                const { selectedAdmin } = await readTicketMeta(channel);

                // Cek apakah user adalah admin role atau admin yang mem-ban
                const isAdminRole = isAdmin(interaction);
                const isBannedAdmin = selectedAdmin && interaction.user.id === selectedAdmin;

                if (!isAdminRole && !isBannedAdmin) {
                    return await interaction.reply({
                        content: '❌ Hanya admin role atau admin yang mem-ban yang dapat menutup tiket!',
                        ephemeral: true
                    });
                }

                // Memberikan respon ke admin dan menghapus channel tanpa log
                await interaction.reply({
                    content: '🗂️ Ticket akan ditutup dan dihapus dalam 5 detik.',
                    ephemeral: true
                });

                setTimeout(() => channel.delete().catch(() => {}), 5000);

            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal close ticket:', err);
                try {
                    if (!interaction.replied) {
                        await interaction.reply({
                            content: '❌ Gagal menutup tiket.',
                            ephemeral: true
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
