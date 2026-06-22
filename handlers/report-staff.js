/**
 * handlers/report-staff.js
 *
 * - Dynamic staff dropdown (members with role specified by CONFIG.STAFF_ROLE_ID or STAFF_ROLE_NAME)
 * - Selected staff automatically added to ticket permissions
 * - Close button deletes the channel; only usable by admins (CONFIG.ADMIN_ROLE_ID) or selected staff
 * - Prefix commands: !setup-report-staff, !add-report-staf, !remove-report-staf
 *
 * Usage:
 *   const reportStaffHandler = require('./handlers/report-staff');
 *   reportStaffHandler(client, CONFIG);
 *
 * Required bot intents: GatewayIntentBits.GuildMembers (you already include it in index.js)
 */

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

// Defaults
const DEFAULT_CATEGORY_ID = null;
const DEFAULT_ADMIN_ROLE_IDS = [
  '1392382455981412398',
  '1392382455981412399',
  '1392382455981412393',
  '1392382455981412397',
  '1392382455981412396',
];
const DEFAULT_PREFIX = '!';

// temporary cache for modal data
const temporaryReportCache = new Map();

module.exports = function reportStaffHandler(client, CONFIG = {}) {
  const CATEGORY_ID = CONFIG.CATEGORY_ID ?? DEFAULT_CATEGORY_ID;
  const ADMIN_ROLE_IDS = Array.isArray(CONFIG.ADMIN_ROLE_ID)
    ? CONFIG.ADMIN_ROLE_ID
    : Array.isArray(CONFIG.ADMIN_ROLE_IDS)
    ? CONFIG.ADMIN_ROLE_IDS
    : DEFAULT_ADMIN_ROLE_IDS;
  const PREFIX = typeof CONFIG.PREFIX === 'string' ? CONFIG.PREFIX : DEFAULT_PREFIX;

  const USE_DYNAMIC_STAFF = Boolean(CONFIG.USE_DYNAMIC_STAFF);
  const STAFF_ROLE_ID = CONFIG.STAFF_ROLE_ID ?? null;
  const STAFF_ROLE_NAME = CONFIG.STAFF_ROLE_NAME ?? null;

  // -----------------------------
  // interactionCreate (buttons / modal / select)
  // -----------------------------
  client.on('interactionCreate', async (interaction) => {
    try {
      // ----- Close ticket button -----
      if (interaction.isButton() && interaction.customId === 'btn_close_ticket') {
        const member = interaction.member;
        if (!interaction.channel) return interaction.reply({ content: '❌ Tidak bisa menutup channel ini.', ephemeral: true });

        // read staff IDs from topic if present
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

        const ucpInput = new TextInputBuilder()
          .setCustomId('input_ucp_pelapor')
          .setLabel('UCP Pelapor')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Masukkan nama UCP Anda')
          .setRequired(true);

        const namaPelaporInput = new TextInputBuilder()
          .setCustomId('input_nama_pelapor')
          .setLabel('Nama Pelapor (IC)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Masukkan nama karakter Anda')
          .setRequired(true);

        const reasonInput = new TextInputBuilder()
          .setCustomId('input_reason')
          .setLabel('Alasan / Kronologi Kejadian')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Jelaskan kesalahan atau pelanggaran staf secara rinci')
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(ucpInput),
          new ActionRowBuilder().addComponents(namaPelaporInput),
          new ActionRowBuilder().addComponents(reasonInput)
        );
        return interaction.showModal(modal);
      }

      // ----- Modal submit: show select menu (ephemeral) -----
      if (interaction.isModalSubmit() && interaction.customId === 'modal_report_staff') {
        const ucpPelapor = interaction.fields.getTextInputValue('input_ucp_pelapor');
        const namaPelapor = interaction.fields.getTextInputValue('input_nama_pelapor');
        const reason = interaction.fields.getTextInputValue('input_reason');

        temporaryReportCache.set(interaction.user.id, { ucpPelapor, namaPelapor, reason, createdAt: Date.now() });

        // Build select menu from role members if configured
        const selectMenu = new StringSelectMenuBuilder().setCustomId('select_staff_report').setPlaceholder('Pilih staf (otomatis dari role Merah Putih Team)');
        let options = [];

        if (USE_DYNAMIC_STAFF && interaction.guild) {
          let role = null;
          if (STAFF_ROLE_ID) role = interaction.guild.roles.cache.get(STAFF_ROLE_ID);
          if (!role && STAFF_ROLE_NAME) role = interaction.guild.roles.cache.find((r) => r.name === STAFF_ROLE_NAME);

          if (role) {
            // try to fetch members to ensure cache (may be heavy in big guilds)
            try { await interaction.guild.members.fetch(); } catch (e) { /* ignore fetch errors */ }

            const members = Array.from(role.members.values()).filter((m) => !m.user.bot);
            const limited = members.slice(0, 25); // discord limit
            options = limited.map((m) => ({ label: (m.nickname || m.user.username).slice(0, 100), value: m.id }));
          }
        }

        if (!options.length) {
          // fallback single option telling no staff found
          options = [{ label: 'Tidak ada staf terdaftar / role tidak ditemukan', value: 'no_staff' }];
        }

        selectMenu.addOptions(options);
        const row = new ActionRowBuilder().addComponents(selectMenu);

        return interaction.reply({
          content: `✅ Data diterima.\n**UCP:** ${ucpPelapor}\n**Nama:** ${namaPelapor}\nSilakan pilih staf yang dilaporkan:`,
          components: [row],
          ephemeral: true,
        });
      }

      // ----- Select chosen: create ticket, add perms for selected staff ----- 
      if (interaction.isStringSelectMenu() && interaction.customId === 'select_staff_report') {
        await interaction.deferReply({ ephemeral: true });

        const selectedValues = interaction.values; // may be member IDs or fallback value 'no_staff'
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
              permissionOverwrites.push({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
              });
            }
          }

          // add selected staff member permissions (only if numeric IDs)
          const addedStaffIds = [];
          for (const v of selectedValues) {
            if (/^\d{17,19}$/.test(v)) {
              addedStaffIds.push(v);
              permissionOverwrites.push({
                id: v,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
              });
            }
          }

          const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID ? CATEGORY_ID : null,
            permissionOverwrites,
            reason: `Laporan staf oleh ${interaction.user.tag}`,
          });

          // store reporter and staff IDs in topic for later checks
          const topicParts = [`reporter:${interaction.user.id}`];
          if (addedStaffIds.length) topicParts.push(`staff:${addedStaffIds.join(',')}`);
          await ticketChannel.setTopic(topicParts.join(' '));

          // build reported display
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

          const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
          );

          await ticketChannel.send({
            content: `👋 ${adminMentions} • ${interaction.user}`,
            embeds: [ticketEmbed],
            components: [closeRow],
          });

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
      try { if (interaction && interaction.isRepliable && !interaction.replied) await interaction.reply({ content: '❌ Terjadi error internal pada handler laporan staf.', ephemeral: true }); } catch {}
    }
  });

  // -----------------------------
  // messageCreate (prefix commands)
  // -----------------------------
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;

      if (!message.content.startsWith(PREFIX)) return;
      const [rawCmd, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/);
      const cmd = rawCmd.toLowerCase();

      // setup button (admin only)
      if (cmd === 'setup-report-staff') {
        const member = message.member;
        const isAdmin = member.roles.cache.some((r) => ADMIN_ROLE_IDS.includes(r.id));
        if (!isAdmin) return message.reply({ content: 'Anda tidak memiliki izin (harus mempunyai role admin) untuk menggunakan perintah ini.' });

        const embed = new EmbedBuilder().setTitle('Lapor Staf').setDescription('Klik tombol di bawah jika Anda ingin membuat laporan staf (tiket).').setColor('#ff9900');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_report_staff').setLabel('Report Staff').setStyle(ButtonStyle.Primary));

        try { await message.channel.send({ embeds: [embed], components: [row] }); return; } catch (err) { console.error('Gagal mem-post tombol report:', err); return message.reply({ content: '❌ Gagal mem-post tombol. Pastikan bot memiliki izin Send Messages dan Embed Links.' }); }
      }

      // ticket-only commands
      const channel = message.channel;
      const isTicketChannel = (channel.name && channel.name.startsWith('staff-report-')) || (channel.topic && channel.topic.includes('reporter:'));
      if (!isTicketChannel) return;

      const isAdmin = message.member.roles.cache.some((r) => ADMIN_ROLE_IDS.includes(r.id));
      const hasManageChannels = message.member.permissions.has(PermissionFlagsBits.ManageChannels);
      let isReporter = false;
      if (channel.topic) {
        const m = channel.topic.match(/reporter:(\d{17,19})/);
        if (m) isReporter = m[1] === message.author.id;
      }

      const getTargetMember = async (arg) => {
        if (!arg) return null;
        if (message.mentions.members.size > 0) return message.mentions.members.first();
        try { return await message.guild.members.fetch(arg); } catch { return null; }
      };

      if (cmd === 'add-report-staf') {
        const target = await getTargetMember(args[0]);
        if (!target) return message.reply('Gunakan: `!add-report-staf @user` atau `!add-report-staf userId`.');
        if (!isAdmin && !hasManageChannels && !isReporter) return message.reply('Anda tidak memiliki izin untuk menambahkan user ke tiket ini.');
        try { await channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }); return message.reply(`✅ Berhasil menambahkan ${target} ke tiket ini.`); } catch (err) { console.error('Gagal menambahkan member ke channel:', err); return message.reply('❌ Gagal menambahkan user ke tiket. Pastikan bot memiliki izin yang cukup.'); }
      }

      if (cmd === 'remove-report-staf') {
        const target = await getTargetMember(args[0]);
        if (!target) return message.reply('Gunakan: `!remove-report-staf @user` atau `!remove-report-staf userId`.');
        if (!isAdmin && !hasManageChannels && !isReporter) return message.reply('Anda tidak memiliki izin untuk menghapus user dari tiket ini.');
        try { await channel.permissionOverwrites.delete(target.id); return message.reply(`✅ Berhasil menghapus akses ${target} dari tiket ini.`); } catch (err) { console.error('Gagal menghapus member dari channel:', err); return message.reply('❌ Gagal menghapus user dari tiket. Pastikan bot memiliki izin yang cukup.'); }
      }
    } catch (err) {
      console.error('Error in report-staff message handler:', err);
    }
  });

  // export cache for testing if needed
  return { temporaryReportCache };
};