// handlers/report-staff.js
/**
 * Report staff handler — defaults auto-use role "Merah Putih Team".
 * Call: reportStaffHandler(client)  // index.js cukup memanggil ini
 *
 * You can still pass CONFIG to override defaults:
 * reportStaffHandler(client, { USE_DYNAMIC_STAFF: false, STAFF_ROLE_ID: 'id', ... })
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

// DEFAULT: use dynamic staff and role name to auto-detect
const DEFAULT_USE_DYNAMIC_STAFF = true;
const DEFAULT_STAFF_ROLE_NAME = 'Merah Putih Team';
const DEFAULT_STAFF_ROLE_ID = null; // leave null if you prefer name lookup

const temporaryReportCache = new Map();

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
      // Close button (delete channel). Only admin or selected staff can use.
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

      // Open modal
      if (interaction.isButton() && interaction.customId === 'btn_report_staff') {
        const modal = new ModalBuilder().setCustomId('modal_report_staff').setTitle('Form Laporan Staf');

        const ucpInput = new TextInputBuilder().setCustomId('input_ucp_pelapor').setLabel('UCP Pelapor').setStyle(TextInputStyle.Short).setPlaceholder('Masukkan nama UCP Anda').setRequired(true);
        const namaPelaporInput = new TextInputBuilder().setCustomId('input_nama_pelapor').setLabel('Nama Pelapor (IC)').setStyle(TextInputStyle.Short).setPlaceholder('Masukkan nama karakter Anda').setRequired(true);
        const reasonInput = new TextInputBuilder().setCustomId('input_reason').setLabel('Alasan / Kronologi Kejadian').setStyle(TextInputStyle.Paragraph).setPlaceholder('Jelaskan kesalahan atau pelanggaran staf secara rinci').setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(ucpInput), new ActionRowBuilder().addComponents(namaPelaporInput), new ActionRowBuilder().addComponents(reasonInput));
        return interaction.showModal(modal);
      }

      // Modal submit -> send select menu (ephemeral)
      if (interaction.isModalSubmit() && interaction.customId === 'modal_report_staff') {
        const ucpPelapor = interaction.fields.getTextInputValue('input_ucp_pelapor');
        const namaPelapor = interaction.fields.getTextInputValue('input_nama_pelapor');
        const reason = interaction.fields.getTextInputValue('input_reason');

        temporaryReportCache.set(interaction.user.id, { ucpPelapor, namaPelapor, reason, createdAt: Date.now() });

        const selectMenu = new StringSelectMenuBuilder().setCustomId('select_staff_report').setPlaceholder('Pilih staf (otomatis dari role)');

        let options = [];

        if (USE_DYNAMIC_STAFF && interaction.guild) {
          // Try resolve role by ID first, then by name
          let role = null;
          try {
            if (STAFF_ROLE_ID) {
              role = interaction.guild.roles.cache.get(STAFF_ROLE_ID) || (await interaction.guild.roles.fetch(STAFF_ROLE_ID).catch(() => null));
            }
          } catch {}
          if (!role && STAFF_ROLE_NAME) role = interaction.guild.roles.cache.find((r) => r.name === STAFF_ROLE_NAME);

          console.log('[report-staff] resolved role:', role ? `${role.name} (${role.id})` : 'NOT FOUND');

          if (role) {
            // Best-effort fetch members so role.members is populated (requires Server Members Intent enabled)
            try {
              await interaction.guild.members.fetch();
            } catch (e) {
              console.warn('[report-staff] guild.members.fetch() failed (continuing with cached members):', e && e.message ? e.message : e);
            }

            const members = Array.from(role.members.values()).filter((m) => !m.user.bot);
            console.log('[report-staff] role.members (cached) count =', members.length);

            if (members.length > 0) {
              const limited = members.slice(0, 25); // discord limit
              options = limited.map((m) => ({ label: (m.nickname || m.user.username).slice(0, 100), value: m.id }));
            }
          }
        }

        if (!options.length) {
          options = [{ label: 'Tidak ada staf terdaftar / role tidak ditemukan', value: 'no_staff' }];
        }

        selectMenu.addOptions(options);
        const row = new ActionRowBuilder().addComponents(selectMenu);

        return interaction.reply({ content: `✅ Data diterima.\n**UCP:** ${ucpPelapor}\n**Nama:** ${namaPelapor}\nSilakan pilih staf yang dilaporkan:`, components: [row], ephemeral: true });
      }

      // Select -> create ticket, add perms
      if (interaction.isStringSelectMenu() && interaction.customId === 'select_staff_report') {
        await interaction.deferReply({ ephemeral: true });

        const selectedValues = interaction.values;
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

          for (const roleId of ADMIN_ROLE_IDS) {
            if (roleId && !String(roleId).startsWith('TARUH_ID_ROLE')) {
              permissionOverwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
            }
          }

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

          const reportedDisplay = selectedValues.map((v) => {
            if (/^\d{17,19}$/.test(v)) return `<@${v}>`;
            if (v === 'no_staff') return '`Tidak tersedia`';
            return `**${v}**`;
          }).join(', ');

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

          temporaryReportCache.delete(interaction.user.id);
          return interaction.editReply({ content: `🎉 Channel tiket dibuat: ${ticketChannel}`, components: [] });
        } catch (err) {
          console.error('Gagal membuat channel tiket:', err);
          return interaction.editReply({ content: '❌ Terjadi kesalahan saat mencoba membuat channel tiket baru. Pastikan Bot memiliki izin Manage Channels dan permissionOverwrites.', components: [] });
        }
      }
    } catch (err) {
      console.error('Error in report-staff interaction handler:', err);
      try { if (interaction && interaction.isRepliable && !interaction.replied) await interaction.reply({ content: '❌ Terjadi error internal pada handler laporan staf.', ephemeral: true }); } catch {}
    }
  });

  // prefix commands
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;
      if (!message.content.startsWith(PREFIX)) return;

      const [rawCmd, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/);
      const cmd = rawCmd.toLowerCase();

      if (cmd === 'setup-report-staff') {
        const isAdmin = message.member.roles.cache.some((r) => ADMIN_ROLE_IDS.includes(r.id));
        if (!isAdmin) return message.reply({ content: 'Anda tidak memiliki izin (harus mempunyai role admin) untuk menggunakan perintah ini.' });

        const embed = new EmbedBuilder().setTitle('Lapor Staf').setDescription('Klik tombol di bawah jika Anda ingin membuat laporan staf (tiket).').setColor('#ff9900');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_report_staff').setLabel('Report Staff').setStyle(ButtonStyle.Primary));

        try { await message.channel.send({ embeds: [embed], components: [row] }); return; } catch (err) { console.error('Gagal mem-post tombol report:', err); return message.reply({ content: '❌ Gagal mem-post tombol. Pastikan bot memiliki izin Send Messages dan Embed Links.' }); }
      }

      // other ticket commands omitted for brevity (kept in original implementation)
    } catch (err) {
      console.error('Error in report-staff message handler:', err);
    }
  });

  return { temporaryReportCache };
};