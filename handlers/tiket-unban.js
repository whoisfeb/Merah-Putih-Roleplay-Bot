// name=unban-handler.js
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
    // Optional: isi ID channel log staff jika mau semua aksi di-log ke satu channel
    const STAFF_LOG_CHANNEL_ID = null; // contoh: '123456789012345678'

    // Helper: parse topic untuk ownerId dan status unbanned
    async function readTicketMeta(channel) {
        let ownerId = null;
        let unbanned = false;

        if (channel.topic) {
            const ownerMatch = channel.topic.match(/ticketOwner:\s*(\d+)/i);
            if (ownerMatch) ownerId = ownerMatch[1];
            const unbannedMatch = channel.topic.match(/unbanned:\s*(true|false)/i);
            if (unbannedMatch) unbanned = unbannedMatch[1].toLowerCase() === 'true';
        }

        // fallback: coba deteksi dari permission overwrites (cari member overwrite)
        if (!ownerId && channel.permissionOverwrites) {
            for (const [id, overwrite] of channel.permissionOverwrites.cache) {
                if (id === channel.guild.id) continue;
                if (id === ADMIN_ROLE_ID) continue;
                // coba fetch member untuk memastikan ini member
                try {
                    await channel.guild.members.fetch(id);
                    ownerId = id;
                    break;
                } catch {
                    // bukan member id, lanjut
                }
            }
        }

        return { ownerId, unbanned };
    }

    // Helper: tulis/update topic untuk menyimpan meta
    async function writeTicketMeta(channel, meta = {}) {
        // baca existing topic (jika ada) lalu ganti/append ticketOwner dan unbanned
        const existing = channel.topic || '';
        let ownerId = meta.ownerId;
        let unbanned = typeof meta.unbanned === 'boolean' ? meta.unbanned : null;

        // mulai dari scratch jika tidak ada owner di existing dan ownerId disediakan
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

        // jika topic berubah atau awalnya kosong
        if (newTopic !== existing) {
            try {
                await channel.setTopic(newTopic).catch(() => {}); // ignore if missing permissions
            } catch (err) {
                // setTopic kadang gagal tanpa izin Manage Channels
                console.error('[UNBAN HANDLER] Gagal setTopic:', err);
            }
        }
    }

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
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.deferReply({ ephemeral: true });
                    }

                    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
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
                        ephemeral: true
                    });
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply showModal:', e);
                }
            }
        }

        // 2. PROSES TIKET SETELAH SUBMIT MODAL
        if (interaction.isModalSubmit() && interaction.customId === 'unban_form_modal') {
            try {
                await interaction.deferReply({ ephemeral: true });

                const data = {
                    ucp: interaction.fields.getTextInputValue('ucp'),
                    char: interaction.fields.getTextInputValue('char_name'),
                    reason: interaction.fields.getTextInputValue('reason'),
                    time: interaction.fields.getTextInputValue('duration'),
                    admin: interaction.fields.getTextInputValue('banned_by')
                };

                const randomID = Math.floor(1000 + Math.random() * 9000);

                const rawChannelName = `unban-${data.ucp}-${randomID}`;
                const cleanChannelName = rawChannelName.toLowerCase().replace(/[^a-z0-9-_]/g, '');

                const ticketChannel = await interaction.guild.channels.create({
                    name: cleanChannelName,
                    type: ChannelType.GuildText,
                    parent: CATEGORY_ID,
                    topic: `ticketOwner:${interaction.user.id} ; unbanned:false`,
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
                    content: `Halo ${interaction.user} & <@&${ADMIN_ROLE_ID}>`,
                    embeds: [resultEmbed],
                    components: [actionRow]
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
                            ephemeral: true
                        });
                    }
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply create ticket:', e);
                }
            }
        }

        // Handler untuk tombol "Mark as Unbanned"
        if (interaction.isButton() && interaction.customId === 'mark_unbanned') {
            try {
                if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                    return await interaction.reply({
                        content: '❌ Hanya Admin yang boleh menandai unban!',
                        ephemeral: true
                    });
                }

                const channel = interaction.channel;
                const { ownerId } = await readTicketMeta(channel);

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
                            content: `Halo ${member.user.username},\n\nStaff telah menandai bahwa Anda *telah di-unban* atau proses unban telah dilakukan terkait tiket \`${channel.name}\` di server **${interaction.guild.name}**.\nJika masih ada masalah, balas tiket ini atau hubungi staff.`
                        });
                        dmSuccess = true;
                    }
                } catch (err) {
                    console.error('[UNBAN HANDLER] Gagal mengirim DM pada mark_unbanned:', err);
                    dmSuccess = false;
                }

                // update topic -> unbanned:true
                await writeTicketMeta(channel, { ownerId, unbanned: true });

                // kirim pesan di channel tiket untuk log (non-ephemeral)
                const logMsg = dmSuccess
                    ? `✅ Pemilik tiket telah diberitahu lewat DM bahwa mereka sudah di-unban.`
                    : `⚠️ Gagal mengirim DM ke pemilik tiket. Pemilik mungkin mematikan DM; tolong hubungi secara manual.`;

                try {
                    await channel.send({ content: `**[SYSTEM]** ${interaction.user.tag} menandai user sebagai *UNBANNED*.\n${logMsg}` });
                } catch (err) {
                    // ignore if cannot send
                    console.error('[UNBAN HANDLER] Gagal kirim pesan log di channel:', err);
                }

                // optional: kirim juga ke staff-log channel jika ada
                if (STAFF_LOG_CHANNEL_ID) {
                    try {
                        const logChan = await interaction.guild.channels.fetch(STAFF_LOG_CHANNEL_ID);
                        if (logChan && logChan.isText()) {
                            await logChan.send({
                                content: `📌 Mark Unbanned oleh **${interaction.user.tag}**\nTicket: ${channel.name}\nOwner: <@${ownerId}>\nDM sent: ${dmSuccess}`
                            });
                        }
                    } catch (err) {
                        console.error('[UNBAN HANDLER] Gagal kirim staff log:', err);
                    }
                }

                return await interaction.reply({ content: '✅ User ditandai sebagai UNBANNED dan diberi tahu (jika DM berhasil).', ephemeral: true });

            } catch (err) {
                console.error('[UNBAN HANDLER] Gagal mark_unbanned:', err);
                try {
                    return await interaction.reply({ content: '❌ Terjadi kesalahan saat menandai unban.', ephemeral: true });
                } catch (e) {
                    console.error('[UNBAN HANDLER] Gagal error reply mark_unbanned:', e);
                }
            }
        }

        // 3. TUTUP TIKET (HANYA UNTUK ADMIN)
        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            try {
                if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                    return await interaction.reply({
                        content: '❌ Hanya Admin yang boleh menutup tiket ini!',
                        ephemeral: true
                    });
                }

                const channel = interaction.channel;
                const { ownerId, unbanned } = await readTicketMeta(channel);

                let dmSent = false;
                if (ownerId) {
                    try {
                        const member = await interaction.guild.members.fetch(ownerId);
                        if (member) {
                            await member.send({
                                content: `Halo ${member.user.username},\n\nTiket \`${channel.name}\` di **${interaction.guild.name}** telah ditutup oleh **${interaction.user.tag}**.\nStatus unban: ${unbanned ? '✅ Sudah di-unban' : '❌ Belum di-unban'}.\nJika masih ada kendala, silakan hubungi staff.`
                            });
                            dmSent = true;
                        }
                    } catch (err) {
                        console.error('[UNBAN HANDLER] Gagal mengirim DM pada close_ticket:', err);
                        dmSent = false;
                    }
                }

                // fallback jika DM gagal: mention di channel sebelum dihapus
                if (!dmSent && ownerId) {
                    try {
                        await channel.send({ content: `⚠️ Tidak dapat mengirim DM ke <@${ownerId}>. Silakan hubungi mereka secara manual.` });
                    } catch (err) {
                        console.error('[UNBAN HANDLER] Gagal pesan fallback mention:', err);
                    }
                }

                // kirim staff log jika di-setup
                if (STAFF_LOG_CHANNEL_ID) {
                    try {
                        const logChan = await interaction.guild.channels.fetch(STAFF_LOG_CHANNEL_ID);
                        if (logChan && logChan.isText()) {
                            await logChan.send({
                                content: `🗂️ Ticket closed by **${interaction.user.tag}**\nTicket: ${channel.name}\nOwner: ${ownerId ? `<@${ownerId}>` : 'Unknown'}\nUnbanned: ${unbanned}\nDM sent: ${dmSent}`
                            });
                        }
                    } catch (err) {
                        console.error('[UNBAN HANDLER] Gagal kirim staff log on close:', err);
                    }
                }

                await interaction.reply({
                    content: dmSent ? '✅ Pemilik tiket sudah diberitahu lewat DM. Channel akan dihapus dalam 5 detik.' : '⚠️ Pemilik tiket tidak dapat diberitahu lewat DM (atau tidak ditemukan). Channel akan dihapus dalam 5 detik.',
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