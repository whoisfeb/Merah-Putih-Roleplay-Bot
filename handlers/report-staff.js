/**
 * handlers/report-staff.js
 *
 * - Modal -> dynamic role-based staff list with paging (Prev/Next)
 * - Select menu shows up to 25 options per page; use Prev/Next to navigate
 * - Selected staff are added to ticket permissions
 * - Close button deletes the channel; only admin or selected staff can use it
 * - Setup command: !setup-tiket (Administrator only) posts the Report Staff button
 *
 * Usage:
 *   const reportStaffHandler = require('./handlers/report-staff');
 *   reportStaffHandler(client); // index.js only needs this
 *
 * IMPORTANT:
 * - Enable "Server Members Intent" in Developer Portal (Privileged Gateway Intents)
 * - Ensure bot created client with GatewayIntentBits.GuildMembers and MessageContent
 */

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  PermissionsBitField,
} = require('discord.js');

const DEFAULT_CATEGORY_ID = '1392382458871156816';
const DEFAULT_ADMIN_ROLE_IDS = [
  '1392382455981412398',
  '1392382455981412399',
  '1392382455981412393',
  '1392382455981412397',
  '1392382455981412396',
];
const DEFAULT_PREFIX = '!';

// Prefer role ID (recommended). Replace with your real Merah Putih Team role ID if you want.
const DEFAULT_USE_DYNAMIC_STAFF = true;
// Use your STAFF role ID here if you want a default; can be overridden via CONFIG.STAFF_ROLE_ID
const DEFAULT_STAFF_ROLE_ID = '1392382455947989066';
const DEFAULT_STAFF_ROLE_NAME = 'Merah Putih Team'; // fallback if ID not provided

// temporary in-memory cache for modal submissions
const temporaryReportCache = new Map();

// pagination sessions: keyed by userId
// value: { members: [{id,label}], page, pageSize, createdAt }
const paginationSessions = new Map();
// TTL for session in ms (5 minutes)
const SESSION_TTL = 5 * 60 * 1000;

// cleanup interval
setInterval(() => {
  const now = Date.now();
  for (const [k, s] of paginationSessions) {
    if (now - s.createdAt > SESSION_TTL) paginationSessions.delete(k);
  }
  // also prune temporaryReportCache older than TTL
  for (const [k, v] of temporaryReportCache) {
    if (v.createdAt && now - v.createdAt > SESSION_TTL) temporaryReportCache.delete(k);
  }
}, 60 * 1000); // every minute

// helper: build options for a page
function buildOptionsForPage(members, page, pageSize) {
  const start = page * pageSize;
  const pageItems = members.slice(start, start + pageSize);
  return pageItems.map((m) => ({ label: String(m.label).slice(0, 100), value: String(m.id) }));
}

// helper: build components (select + prev/next row)
function buildPagedComponents(members, page, pageSize) {
  const options = buildOptionsForPage(members, page, pageSize);
  const select = new StringSelectMenuBuilder().setCustomId('select_staff_report').setPlaceholder(`Pilih staf (hal ${page + 1}/${Math.ceil(members.length / pageSize)})`).addOptions(options);
  const selectRow = new ActionRowBuilder().addComponents(select);

  const prevBtn = new ButtonBuilder().setCustomId('staff_prev').setLabel('Prev').setStyle(ButtonStyle.Secondary);
  const nextBtn = new ButtonBuilder().setCustomId('staff_next').setLabel('Next').setStyle(ButtonStyle.Secondary);
  if (page === 0) prevBtn.setDisabled(true);
  if ((page + 1) * pageSize >= members.length) nextBtn.setDisabled(true);

  const btnRow = new ActionRowBuilder().addComponents(prevBtn, nextBtn);
  return [selectRow, btnRow];
}

module.exports = function reportStaffHandler(client, CONFIG = {}) {
  const CATEGORY_ID = CONFIG.CATEGORY_ID ?? DEFAULT_CATEGORY_ID;
  const ADMIN_ROLE_IDS = Array.isArray(CONFIG.ADMIN_ROLE_ID)
    ? CONFIG.ADMIN_ROLE_ID
    : Array.isArray(CONFIG.ADMIN_ROLE_IDS)
    ? CONFIG.ADMIN_ROLE_IDS
    : DEFAULT_ADMIN_ROLE_IDS;
  const PREFIX = typeof CONFIG.PREFIX === 'string' ? CONFIG.PREFIX : DEFAULT_PREFIX;

  const USE_DYNAMIC_STAFF = CONFIG.USE_DYNAMIC_STAFF ?? DEFAULT_USE_DYNAMIC_STAFF;
  const STAFF_ROLE_ID = CONFIG.STAFF_ROLE_ID ?? DEFAULT_STAFF_ROLE_ID;
  const STAFF_ROLE_NAME = CONFIG.STAFF_ROLE_NAME ?? DEFAULT_STAFF_ROLE_NAME;

  client.on('interactionCreate', async (interaction) => {
    try {
      // Paging buttons: Prev / Next
      if (interaction.isButton() && (interaction.customId === 'staff_prev' || interaction.customId === 'staff_next')) {
        const session = paginationSessions.get(interaction.user.id);
        if (!session) {
          return interaction.reply({ content: 'Session sudah kadaluarsa atau tidak ditemukan.', ephemeral: true });
        }

        // Only session owner can navigate
        const { members, pageSize } = session;
        let { page } = session;

        if (interaction.customId === 'staff_prev') page = Math.max(0, page - 1);
        else page = Math.min(Math.ceil(members.length / pageSize) - 1, page + 1);

        session.page = page;
        const components = buildPagedComponents(members, page, pageSize);
        const totalPages = Math.ceil(members.length / pageSize);
        const replyContent = `✅ Silakan pilih staf yang dilaporkan (halaman ${page + 1}/${totalPages}):`;

        try {
          await interaction.update({ content: replyContent, components });
        } catch (e) {
          console.error('Gagal update paging message:', e);
          try {
            await interaction.reply({ content: 'Gagal memperbarui halaman. Coba lagi.', ephemeral: true });
          } catch {}
        }
        return;
      }

      // ----- Close ticket button -----
      if (interaction.isButton() && interaction.customId === 'btn_close_ticket') {
        const member = interaction.member;
        if (!interaction.channel) return interaction.reply({ content: '❌ Tidak bisa menutup channel ini.', ephemeral: true });

        const topic = interaction.channel.topic || '';
        let staffIds = [];
        const mStaff = topic.match(/staff:([0-9,]+)/);
        if (mStaff) staffIds = mStaff[1].split(',').filter(Boolean);

        const isAdmin = member.roles.cache.some((r) => ADMIN_ROLE_IDS.includes(r.id));
        const isSelectedStaff = staffIds.includes(interaction.user.id);

        if (!isAdmin && !isSelectedStaff) {
          return interaction.reply({ content: '❌ Hanya admin atau staf yang dipilih yang dapat menutup tiket ini.', ephemeral: true });
        }

        try {
          await interaction.reply({ content: '🗑️ Menutup dan menghapus channel tiket...', ephemeral: true });
          await interaction.channel.delete(`Tiket ditutup oleh ${interaction.user.tag}`);
        } catch (err) {
          console.error('Gagal menghapus channel tiket:', err);
          return interaction.followUp({ content: '❌ Gagal menghapus channel. Pastikan bot memiliki izin Manage Channels.', ephemeral: true });
        }
        return;
      }

      // ----- Open modal button -----
      if (interaction.isButton() && interaction.customId === 'btn_report_staff') {
        const modal = new ModalBuilder().setCustomId('modal_report_staff').setTitle('Form Laporan Staf');

        const ucpInput = new TextInputBuilder().setCustomId('input_ucp_pelapor').setLabel('UCP Pelapor').setStyle(TextInputStyle.Short).setPlaceholder('Masukkan nama UCP Anda').setRequired(true);
        const namaPelaporInput = new TextInputBuilder().setCustomId('input_nama_pelapor').setLabel('Nama Pelapor (IC)').setStyle(TextInputStyle.Short).setPlaceholder('Masukkan nama karakter Anda').setRequired(true);
        const reasonInput = new TextInputBuilder().setCustomId('input_reason').setLabel('Alasan / Kronologi Kejadian').setStyle(TextInputStyle.Paragraph).setPlaceholder('Jelaskan kesalahan atau pelanggaran staf secara rinci').setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(ucpInput), new ActionRowBuilder().addComponents(namaPelaporInput), new ActionRowBuilder().addComponents(reasonInput));
        return interaction.showModal(modal);
      }


      // ----- Modal submit: prepare paged select menu (ephemeral) -----
      if (interaction.isModalSubmit() && interaction.customId === 'modal_report_staff') {
        const ucpPelapor = interaction.fields.getTextInputValue('input_ucp_pelapor');
        const namaPelapor = interaction.fields.getTextInputValue('input_nama_pelapor');
        const reason = interaction.fields.getTextInputValue('input_reason');

        temporaryReportCache.set(interaction.user.id, { ucpPelapor, namaPelapor, reason, createdAt: Date.now() });

        // Build members list from role (dynamic)
        let membersList = [];
        let resolvedRoleInfo = 'NOT FOUND';
        if (USE_DYNAMIC_STAFF && interaction.guild) {
          let role = null;
          try {
            if (STAFF_ROLE_ID) role = interaction.guild.roles.cache.get(STAFF_ROLE_ID) || (await interaction.guild.roles.fetch(STAFF_ROLE_ID).catch(() => null));
          } catch (e) {
            // ignore
          }
          if (!role && STAFF_ROLE_NAME) role = interaction.guild.roles.cache.find((r) => r.name === STAFF_ROLE_NAME);

          resolvedRoleInfo = role ? `${role.name} (${role.id})` : 'NOT FOUND';
          console.log('[report-staff] resolved role:', resolvedRoleInfo);

          if (role) {
            try {
              await interaction.guild.members.fetch(); // best-effort; requires Server Members Intent
            } catch (e) {
              console.warn('[report-staff] guild.members.fetch() failed (continuing with cached members):', e && e.message ? e.message : e);
            }

            const members = Array.from(role.members.values()).filter((m) => !m.user.bot);
            console.log('[report-staff] role.members (cached) count =', members.length);

            membersList = members.map((m) => ({ id: m.id, label: m.nickname || m.user.username }));
          }
        }

        // If no dynamic members, fallback to single "no_staff"
        if (!membersList.length) {
          const select = new StringSelectMenuBuilder().setCustomId('select_staff_report').setPlaceholder('Tidak ada staf terdaftar / role tidak ditemukan').addOptions([{ label: 'Tidak ada staf terdaftar / role tidak ditemukan', value: 'no_staff' }]);
          return interaction.reply({ content: `✅ Data diterima.\n**UCP:** ${ucpPelapor}\n**Nama:** ${namaPelapor}\nSilakan pilih staf yang dilaporkan:`, components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }

        // save pagination session
        const pageSize = 25;
        paginationSessions.set(interaction.user.id, { members: membersList, page: 0, pageSize, createdAt: Date.now() });

        const components = buildPagedComponents(membersList, 0, pageSize);
        const totalPages = Math.ceil(membersList.length / pageSize);
        let replyContent = `✅ Data diterima.\n**UCP:** ${ucpPelapor}\n**Nama:** ${namaPelapor}\nSilakan pilih staf yang dilaporkan (hal ${1}/${totalPages}):`;
        if (membersList.length > pageSize) replyContent += `\n\n⚠️ Role memiliki lebih dari ${pageSize} anggota — gunakan Prev/Next untuk melihat semua.`; 

        console.log(`[report-staff] prepared paged select (role=${resolvedRoleInfo}, totalMembers=${membersList.length}, pages=${totalPages})`);

        return interaction.reply({ content: replyContent, components, ephemeral: true });
      }

      // ----- Select chosen -> create ticket, add perms, cleanup session -----
      if (interaction.isStringSelectMenu() && interaction.customId === 'select_staff_report') {
        await interaction.deferReply({ ephemeral: true });

        const selectedValues = interaction.values; // array of member ids or 'no_staff'
        const cache = temporaryReportCache.get(interaction.user.id);
        const reason = cache?.reason ?? 'Alasan tidak terbaca atau cache kedaluwarsa.';
        const ucpPelapor = cache?.ucpPelapor ?? 'Tidak tersedia';
        const namaPelapor = cache?.namaPelapor ?? 'Tidak tersedia';

        const sanitizedUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 20);
        const randomID = Math.floor(1000 + Math.random() * 9000);
        const channelName = `staff-report-${sanitizedUsername}-${randomID}`;

        try {
          const permissionOverwrites = [
            { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          ];

          // grant admin roles
          for (const roleId of ADMIN_ROLE_IDS) {
            if (roleId && !String(roleId).startsWith('TARUH_ID_ROLE')) {
              permissionOverwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
            }
          }

          // add selected staff member permissions (only if numeric IDs)
          const addedStaffIds = [];
          for (const v of selectedValues) {
            if (/^\d{17,19}$/.test(v)) {
              addedStaffIds.push(v);
              permissionOverwrites.push({ id: v, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
            }
          }

          const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID ? CATEGORY_ID : null,
            permissionOverwrites,
            reason: `Laporan staf oleh ${interaction.user.tag}`,
          });

          const topicParts = [`reporter:${interaction.user.id}`];
          if (addedStaffIds.length) topicParts.push(`staff:${addedStaffIds.join(',')}`);
          await ticketChannel.setTopic(topicParts.join(' '));

          const reportedDisplay = selectedValues
            .map((v) => {
              if (/^\d{17,19}$/.test(v)) return `<@${v}>`;
              if (v === 'no_staff') return '`Tidak tersedia`';
              return `**${v}**`;
            })
            .join(', ');

          const ticketEmbed = new EmbedBuilder()
            .setTitle('🎫 TIKET LAPORAN STAF BARU')
            .setDescription(`Halo ${interaction.user}, silakan tunggu tanggapan dari pihak Manajemen Senior di channel ini.`)
            .setColor('#ff9900')
            .addFields(
              { name: '👤 Akun Discord Pelapor', value: `${interaction.user} (${interaction.user.tag})`, inline: false },
              { name: '🔑 UCP Pelapor', value: ucpPelapor, inline: true },
              { name: '👔 Nama Karakter (IC)', value: namaPelapor, inline: true },
              { name: '🚫 Staf yang Dilaporkan', value: `${reportedDisplay}`, inline: false },
              { name: '📝 Alasan / Kronologi Kejadian', value: `\`\`\`${reason}\`\`\``, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Sistem Tiket Laporan Otomatis' });

          const adminMentions = ADMIN_ROLE_IDS.filter((id) => id && !String(id).startsWith('TARUH_ID_ROLE')).map((id) => `<@&${id}>`).join(' ');
          const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger));

          await ticketChannel.send({ content: `👋 ${adminMentions} • ${interaction.user}`, embeds: [ticketEmbed], components: [closeRow] });

          // cleanup
          paginationSessions.delete(interaction.user.id);
          temporaryReportCache.delete(interaction.user.id);

          return interaction.editReply({ content: `🎉 Channel tiket dibuat: ${ticketChannel}`, components: [] });
        } catch (err) {
          console.error('Gagal membuat channel tiket:', err);
          return interaction.editReply({
            content: '❌ Terjadi kesalahan saat mencoba membuat channel tiket baru. Pastikan Bot memiliki izin Manage Channels dan permissionOverwrites.',
            components: [],
          });
        }
      }
    } catch (err) {
      console.error('Error in report-staff interaction handler:', err);
      try {
        if (interaction && interaction.isRepliable && !interaction.replied) {
          await interaction.reply({ content: '❌ Terjadi error internal pada handler laporan staf.', ephemeral: true });
        }
      } catch {}
    }
  });

  // -----------------------------
  // PREFIX COMMANDS (messageCreate)
  // -----------------------------
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;
      if (!message.content.startsWith(PREFIX)) return;

      const [rawCmd, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/);
      const cmd = rawCmd.toLowerCase();

      // Setup (simple admin-only command)
      if (cmd === 'setup-tiket' || cmd === 'setup-report-staff') {
        // require Administrator permission
        if (!message.member || !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return message.reply({ content: 'Anda tidak memiliki izin (Administrator) untuk menggunakan perintah ini.' });
        }

        const embed = new EmbedBuilder()
          .setTitle('⛔ Merah Putih Roleplay - Report Staff')
          .setDescription('Silakan klik tombol di bawah untuk memulai proses laporan staf')
          .setColor('#ff0000')
          .setFooter({ text: 'Ottibonynyo Mods | Merah Putih' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_report_staff').setLabel('Report Staff').setEmoji('⛔').setStyle(ButtonStyle.Primary),
        );

        try {
          await message.channel.send({ embeds: [embed], components: [row] });
          // optionally delete the setup command to keep channel clean
          if (message.deletable) await message.delete().catch(() => {});
        } catch (err) {
          console.error('Gagal mengirim setup tiket:', err);
        }
        return;
      }
    } catch (err) {
      console.error('Error in report-staff message handler:', err);
    }
  });

  return { temporaryReportCache, paginationSessions };
};