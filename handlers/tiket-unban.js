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
    const ADMIN_ROLE_ID = '1514189664863518811';
    const STAFF_LIST_ROLE = '1392382455947989066';
    const STAFF_LOG_CHANNEL_ID = '1519299286385561640';

    async function readTicketMeta(channel) {
        let ownerId = null;
        let unbanned = false;
        let selectedStaffId = null;

        if (channel.topic) {
            const ownerMatch = channel.topic.match(/ticketOwner:\s*(\d+)/i);
            if (ownerMatch) ownerId = ownerMatch[1];
            const unbannedMatch = channel.topic.match(/unbanned:\s*(true|false)/i);
            if (unbannedMatch) unbanned = unbannedMatch[1].toLowerCase() === 'true';
            const staffMatch = channel.topic.match(/selectedStaff:\s*(\d+)/i);
            if (staffMatch) selectedStaffId = staffMatch[1];
        }

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

        return { ownerId, unbanned, selectedStaffId };
    }

    async function writeTicketMeta(channel, meta = {}) {
        const existing = channel.topic || '';
        const ownerId = meta.ownerId;
        const unbanned = typeof meta.unbanned === 'boolean' ? meta.unbanned : null;
        const selectedStaffId = meta.selectedStaffId;

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

        if (selectedStaffId) {
            if (/selectedStaff:\s*\d+/i.test(newTopic)) {
                newTopic = newTopic.replace(/selectedStaff:\s*\d+/i, `selectedStaff:${selectedStaffId}`);
            } else {
                newTopic = (newTopic ? newTopic + ' ; ' : '') + `selectedStaff:${selectedStaffId}`;
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

    function isAdmin(interaction) {
        try {
            return interaction.member.roles.cache.has(ADMIN_ROLE_ID);
        } catch {
            return false;
        }
    }

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

        // STEP 1: TAMPILKAN DROPDOWN STAFF DULUAN
        if (interaction.isButton() && interaction.customId === 'open_unban_form') {
            try {
                let staffMembers = [];
                try {
                    const staffRole = await interaction.guild.roles.fetch(STAFF_LIST_ROLE);
                    if (staffRole) {
                        staffMembers = Array.from(staffRole.members.values())
                            .map(member => ({
                                id: member.id,
                                name: member.displayName || member.user.username
                            }))
                            .sort((a, b) => a.name.localeCompare(b.name));
                    }
                } catch (err) {
                    console.error('[UNBAN HANDLER] Gagal fetch staff members:', err);
                }

                if (staffMembers.length === 0) {
                    return await interaction.reply({
                        content: '❌ Tidak ada staff ditemukan. Hubungi server administrator.',
                        ephemeral: true
                    });
                }

                const sessionId = `${interaction.user.id}_${Date.now()}`;
                interaction.client.tempStaffData = interaction.client.tempStaffData || {};
                interaction.client.tempStaffData[sessionId] = {
                    userId: interaction.user.id,
                    userName: interaction.user.username,
                    staffMembers: staffMembers,
                    currentPage: 0,
                    timestamp: Date.now()
                };

                const itemsPerPage = 25;
                const totalPages = Math.ceil(staffMembers.length / itemsPerPage);
                const startIdx = 0;
                const endIdx = Math.min(itemsPerPage, staffMembers.length);
                const currentStaff = staffMembers.slice(startIdx, endIdx);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_staff_${sessionId}`)
                    .setPlaceholder('Pilih Staff')
                    .addOptions(
                        currentStaff.map(staff => ({
                            label: staff.name,
                            value: staff.id,
                            description: `Staff ID: ${staff.id}`
                        }))
                    );

                const components = [new ActionRowBuilder().addComponents(selectMenu)];

                // Tambah navigation buttons jika ada lebih dari 1 halaman
                if (totalPages > 1) {
                    const navRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`staff_prev_${sessionId}`)
                            .setLabel('Prev')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true), // Disabled di page pertama
                        new ButtonBuilder()
                            .setCustomId(`staff_next_${sessionId}`)
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(totalPages === 1)
                    );
                    components.push(navRow);
                }

                await interaction.reply({
                    content: `📋 Silahkan pilih staff yang akan menangani tiket Anda (Total Staff: ${staffMembers.length}) - Halaman ${0 + 1}/${totalPages}:`,
                    components: components,
                    ephemeral: true
                });

            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal menampilkan dropdown staff:', err);
                try {
                    await interaction.reply({
                        content: '❌ Terjadi kesalahan saat membuka form.',
                        ephemeral: true
                    });
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply dropdown staff:', e);
                }
            }
        }

        // HANDLE PREV BUTTON
        if (interaction.isButton() && interaction.customId.startsWith('staff_prev_')) {
            try {
                const sessionId = interaction.customId.replace('staff_prev_', '');
                const staffData = interaction.client.tempStaffData?.[sessionId];

                if (!staffData) {
                    return await interaction.reply({
                        content: '❌ Session tidak ditemukan.',
                        ephemeral: true
                    });
                }

                staffData.currentPage = Math.max(0, staffData.currentPage - 1);

                const itemsPerPage = 25;
                const startIdx = staffData.currentPage * itemsPerPage;
                const endIdx = Math.min(startIdx + itemsPerPage, staffData.staffMembers.length);
                const currentStaff = staffData.staffMembers.slice(startIdx, endIdx);
                const totalPages = Math.ceil(staffData.staffMembers.length / itemsPerPage);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_staff_${sessionId}`)
                    .setPlaceholder('Pilih Staff')
                    .addOptions(
                        currentStaff.map(staff => ({
                            label: staff.name,
                            value: staff.id,
                            description: `Staff ID: ${staff.id}`
                        }))
                    );

                const components = [new ActionRowBuilder().addComponents(selectMenu)];

                const navRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`staff_prev_${sessionId}`)
                        .setLabel('Prev')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(staffData.currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId(`staff_next_${sessionId}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(staffData.currentPage === totalPages - 1)
                );
                components.push(navRow);

                await interaction.update({
                    content: `📋 Silahkan pilih staff yang akan menangani tiket Anda (Total Staff: ${staffData.staffMembers.length}) - Halaman ${staffData.currentPage + 1}/${totalPages}:`,
                    components: components
                });

            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal prev staff:', err);
            }
        }

        // HANDLE NEXT BUTTON
        if (interaction.isButton() && interaction.customId.startsWith('staff_next_')) {
            try {
                const sessionId = interaction.customId.replace('staff_next_', '');
                const staffData = interaction.client.tempStaffData?.[sessionId];

                if (!staffData) {
                    return await interaction.reply({
                        content: '❌ Session tidak ditemukan.',
                        ephemeral: true
                    });
                }

                const itemsPerPage = 25;
                const totalPages = Math.ceil(staffData.staffMembers.length / itemsPerPage);
                staffData.currentPage = Math.min(totalPages - 1, staffData.currentPage + 1);

                const startIdx = staffData.currentPage * itemsPerPage;
                const endIdx = Math.min(startIdx + itemsPerPage, staffData.staffMembers.length);
                const currentStaff = staffData.staffMembers.slice(startIdx, endIdx);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_staff_${sessionId}`)
                    .setPlaceholder('Pilih Staff')
                    .addOptions(
                        currentStaff.map(staff => ({
                            label: staff.name,
                            value: staff.id,
                            description: `Staff ID: ${staff.id}`
                        }))
                    );

                const components = [new ActionRowBuilder().addComponents(selectMenu)];

                const navRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`staff_prev_${sessionId}`)
                        .setLabel('Prev')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(staffData.currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId(`staff_next_${sessionId}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(staffData.currentPage === totalPages - 1)
                );
                components.push(navRow);

                await interaction.update({
                    content: `📋 Silahkan pilih staff yang akan menangani tiket Anda (Total Staff: ${staffData.staffMembers.length}) - Halaman ${staffData.currentPage + 1}/${totalPages}:`,
                    components: components
                });

            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal next staff:', err);
            }
        }

        // STEP 2: TAMPILKAN FORM SETELAH PILIH STAFF (TANPA DEFER)
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_staff_')) {
            try {
                const selectedStaffId = interaction.values[0];
                const sessionId = interaction.customId.replace('select_staff_', '');
                const staffData = interaction.client.tempStaffData?.[sessionId];

                if (!staffData) {
                    return await interaction.reply({
                        content: '❌ Session tidak ditemukan. Silahkan coba lagi.',
                        ephemeral: true
                    });
                }

                // Simpan selected staff
                staffData.selectedStaffId = selectedStaffId;
                interaction.client.tempStaffData[sessionId] = staffData;

                // Tampilkan form modal TANPA DEFER
                const modal = new ModalBuilder()
                    .setCustomId(`unban_form_modal_${sessionId}`)
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
                console.error('[UNBAN HANDLER] Gagal tampilkan form:', err);
                try {
                    await interaction.reply({
                        content: '❌ Terjadi kesalahan. Silahkan coba lagi.',
                        ephemeral: true
                    });
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply tampilkan form:', e);
                }
            }
        }

        // STEP 3: PROSES FORM DAN BUAT TIKET
        if (interaction.isModalSubmit() && interaction.customId.startsWith('unban_form_modal_')) {
            try {
                await interaction.deferReply({ ephemeral: true });

                const sessionId = interaction.customId.replace('unban_form_modal_', '');
                const staffData = interaction.client.tempStaffData?.[sessionId];

                if (!staffData || !staffData.selectedStaffId) {
                    return await interaction.editReply({
                        content: '❌ Data session tidak ditemukan. Silahkan coba lagi.'
                    });
                }

                const data = {
                    ucp: interaction.fields.getTextInputValue('ucp'),
                    char: interaction.fields.getTextInputValue('char_name'),
                    reason: interaction.fields.getTextInputValue('reason'),
                    time: interaction.fields.getTextInputValue('duration')
                };

                let staffName = 'Unknown Staff';
                try {
                    const staffMember = await interaction.guild.members.fetch(staffData.selectedStaffId);
                    staffName = staffMember.displayName || staffMember.user.username;
                } catch (err) {
                    console.error('[UNBAN HANDLER] Gagal fetch staff member:', err);
                }

                const randomID = Math.floor(1000 + Math.random() * 9000);
                const rawChannelName = `unban-${data.ucp}-${randomID}`;
                const cleanChannelName = rawChannelName.toLowerCase().replace(/[^a-z0-9-_]/g, '');

                const ticketChannel = await interaction.guild.channels.create({
                    name: cleanChannelName,
                    type: ChannelType.GuildText,
                    parent: CATEGORY_ID,
                    topic: `ticketOwner:${staffData.userId} ; unbanned:false ; selectedStaff:${staffData.selectedStaffId}`,
                    permissionOverwrites: [
                        // Deny everyone
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        // Allow ticket owner/creator
                        { id: staffData.userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        // Allow admin role
                        { id: ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        // Allow selected staff
                        { id: staffData.selectedStaffId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    ],
                });

                const resultEmbed = new EmbedBuilder()
                    .setTitle(`🎫 Tiket Unban: ${cleanChannelName.toUpperCase()}`)
                    .setColor(0xFFFF00)
                    .setDescription(
                        `👤 **User**\n${staffData.userName} (${staffData.userId})\n\n` +
                        `🖥️ **UCP**\n${data.ucp}\n\n` +
                        `🎭 **Nama Karakter**\n${data.char}\n\n` +
                        `⏳ **Durasi Banned**\n${data.time}\n\n` +
                        `👮 **Staff Handling**\n${staffName}\n\n` +
                        `📝 **Alasan Banned**\n${data.reason}`
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
                    content: `Halo <@${staffData.userId}> silahkan tunggu respon dari <@${staffData.selectedStaffId}> atau staff lainnya dari <@&${ADMIN_ROLE_ID}>`,
                    embeds: [resultEmbed],
                    components: [actionRow]
                });

                // Cleanup temp data
                if (interaction.client.tempStaffData?.[sessionId]) {
                    delete interaction.client.tempStaffData[sessionId];
                }

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
                            ephemeral: true
                        });
                    }
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply create ticket:', e);
                }
            }
        }

        // Handler untuk tombol "Mark as Unbanned" (Hanya Admin Role dan Selected Staff)
        if (interaction.isButton() && interaction.customId === 'mark_unbanned') {
            try {
                const channel = interaction.channel;
                const { ownerId, selectedStaffId } = await readTicketMeta(channel);

                const isAdminRole = isAdmin(interaction);
                const isSelectedStaff = selectedStaffId && interaction.user.id === selectedStaffId;

                if (!isAdminRole && !isSelectedStaff) {
                    return await interaction.reply({
                        content: '❌ Hanya admin role atau staff yang ditugaskan yang dapat menandai unban!',
                        ephemeral: true
                    });
                }

                if (!ownerId) {
                    return await interaction.reply({
                        content: '⚠️ Tidak dapat menemukan pemilik tiket (owner).',
                        ephemeral: true
                    });
                }

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

                await writeTicketMeta(channel, { ownerId, unbanned: true, selectedStaffId });

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

        // Handler untuk tombol "Close Ticket" (Hanya Admin Role dan Selected Staff)
        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            try {
                const channel = interaction.channel;
                const { selectedStaffId } = await readTicketMeta(channel);

                const isAdminRole = isAdmin(interaction);
                const isSelectedStaff = selectedStaffId && interaction.user.id === selectedStaffId;

                if (!isAdminRole && !isSelectedStaff) {
                    return await interaction.reply({
                        content: '❌ Hanya admin role atau staff yang ditugaskan yang dapat menutup tiket!',
                        ephemeral: true
                    });
                }

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

    process.on('unhandledRejection', (err) => console.error('[UNBAN HANDLER] UnhandledRejection:', err));
    process.on('uncaughtException', (err) => console.error('[UNBAN HANDLER] UncaughtException:', err));
};
