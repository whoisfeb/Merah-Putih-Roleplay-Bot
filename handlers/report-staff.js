/**
 * handlers/report-staff.js
 *
 * Single-file handler that:
 *  - Handles interaction flow (button -> modal -> select -> create ticket channel)
 *  - Handles prefix commands:
 *      - !setup-report-staff      -> post "Report Staff" button (ONLY admin roles in CONFIG.ADMIN_ROLE_ID)
 *      - !add-report-staf @user   -> add user to ticket (admin / reporter / ManageChannels)
 *      - !remove-report-staf @user-> remove user from ticket (same permissions)
 *
 * Usage (in your index.js):
 *   const reportStaffHandler = require('./handlers/report-staff');
 *   // after client is created (typically in ready/setup area):
 *   reportStaffHandler(client, CONFIG);
 *
 * Notes:
 *  - Modal submissions are stored in-memory (Map) and will be lost on bot restart.
 *  - The ticket channel topic is set to "reporter:<userId>" so commands can identify the reporter.
 *  - If you pass CONFIG, it will override the built-in defaults below.
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

// Default configuration (will be overridden by CONFIG parameter if provided)
const DEFAULT_CATEGORY_ID = '1392382458871156816';
const DEFAULT_ADMIN_ROLE_IDS = [
  '1392382455981412398',
  '1392382455981412399',
  '1392382455981412393',
  '1392382455981412397',
  '1392382455981412396',
];
const DEFAULT_DAFTAR_STAFF = [
  { label: 'Staf Alex (Admin)', value: 'Alex' },
  { label: 'Staf Budi (Moderator)', value: 'Budi' },
  { label: 'Staf Citra (Helper)', value: 'Citra' },
];
const DEFAULT_PREFIX = '!';

// Temporary in-memory cache for modal submissions (keyed by user id)
const temporaryReportCache = new Map();

module.exports = function reportStaffHandler(client, CONFIG = {}) {
  const CATEGORY_ID = CONFIG.CATEGORY_ID ?? DEFAULT_CATEGORY_ID;
  const ADMIN_ROLE_IDS = Array.isArray(CONFIG.ADMIN_ROLE_ID)
    ? CONFIG.ADMIN_ROLE_ID
    : Array.isArray(CONFIG.ADMIN_ROLE_IDS)
    ? CONFIG.ADMIN_ROLE_IDS
    : DEFAULT_ADMIN_ROLE_IDS;
  const DAFTAR_STAFF = Array.isArray(CONFIG.DAFTAR_STAFF) ? CONFIG.DAFTAR_STAFF : DEFAULT_DAFTAR_STAFF;
  const PREFIX = typeof CONFIG.PREFIX === 'string' ? CONFIG.PREFIX : DEFAULT_PREFIX;

  // -----------------------------
  // INTERACTION FLOW (modal/select)
  // -----------------------------
  client.on('interactionCreate', async (interaction) => {
    try {
      // 1) Button click -> open modal
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

        const row1 = new ActionRowBuilder().addComponents(ucpInput);
        const row2 = new ActionRowBuilder().addComponents(namaPelaporInput);
        const row3 = new ActionRowBuilder().addComponents(reasonInput);

        modal.addComponents(row1, row2, row3);
        return interaction.showModal(modal);
      }

      // 2) Modal submitted -> save data and show select menu
      if (interaction.isModalSubmit() && interaction.customId === 'modal_report_staff') {
        const ucpPelapor = interaction.fields.getTextInputValue('input_ucp_pelapor');
        const namaPelapor = interaction.fields.getTextInputValue('input_nama_pelapor');
        const reason = interaction.fields.getTextInputValue('input_reason');

        temporaryReportCache.set(interaction.user.id, {
          ucpPelapor,
          namaPelapor,
          reason,
          createdAt: Date.now(),
        });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_staff_report')
          .setPlaceholder('Pilih nama staf yang ingin dilaporkan...');

        DAFTAR_STAFF.forEach((s) => {
          selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel(s.label).setValue(s.value));
        });

        const row = new ActionRowBuilder().addComponents(selectMenu);

        return interaction.reply({
          content: `✅ **Data Terbaca!**\n**UCP:** ${ucpPelapor}\n**Nama:** ${namaPelapor}\n\n👉 **Langkah Terakhir:** Silakan pilih nama staf yang Anda laporkan di bawah ini untuk membuat channel tiket:`,
          components: [row],
          ephemeral: true,
        });
      }

      // 3) Select menu chosen -> create ticket channel
      if (interaction.isStringSelectMenu() && interaction.customId === 'select_staff_report') {
        await interaction.deferReply({ ephemeral: true });

        const selectedStaff = interaction.values; // array
        const cache = temporaryReportCache.get(interaction.user.id);
        const reason = cache?.reason ?? 'Alasan tidak terbaca atau cache kedaluwarsa.';
        const ucpPelapor = cache?.ucpPelapor ?? 'Tidak tersedia';
        const namaPelapor = cache?.namaPelapor ?? 'Tidak tersedia';

        // sanitize channel name
        const sanitizedUsername = interaction.user.username
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 20);
        const randomID = Math.floor(1000 + Math.random() * 9000);
        const channelName = `staff-report-${sanitizedUsername}-${randomID}`;

        try {
          const permissionOverwrites = [
            {
              id: interaction.guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
          ];

          // add admin roles
          ADMIN_ROLE_IDS.forEach((roleId) => {
            if (roleId && typeof roleId === 'string' && !roleId.startsWith('TARUH_ID_ROLE')) {
              permissionOverwrites.push({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
              });
            }
          });

          const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID && !String(CATEGORY_ID).startsWith('TARUH_ID_') ? CATEGORY_ID : null,
            permissionOverwrites,
            reason: `Laporan staf oleh ${interaction.user.tag}`,
          });

          // mark reporter in topic
          await ticketChannel.setTopic(`reporter:${interaction.user.id}`);

          const ticketEmbed = new EmbedBuilder()
            .setTitle('🎫 TIKET LAPORAN STAF BARU')
            .setDescription(`Halo ${interaction.user}, silakan tunggu tanggapan dari pihak Manajemen Senior di channel ini.`)
            .setColor('#ff9900')
            .addFields(
              { name: '👤 Akun Discord Pelapor', value: `${interaction.user} (${interaction.user.tag})`, inline: false },
              { name: '🔑 UCP Pelapor', value: ucpPelapor, inline: true },
              { name: '👔 Nama Karakter (IC)', value: namaPelapor, inline: true },
              { name: '🚫 Staf yang Dilaporkan', value: `**${selectedStaff.join(', ')}**`, inline: false },
              { name: '📝 Alasan / Kronologi Kejadian', value: `\`\`\`${reason}\`\`\``, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Sistem Tiket Laporan Otomatis' });

          const adminMentions = ADMIN_ROLE_IDS.filter((id) => id && !String(id).startsWith('TARUH_ID_ROLE'))
            .map((id) => `<@&${id}>`)
            .join(' ');

          await ticketChannel.send({
            content: `👋 ${adminMentions} • ${interaction.user}`,
            embeds: [ticketEmbed],
          });

          // clear cache
          temporaryReportCache.delete(interaction.user.id);

          return interaction.editReply({
            content: `🎉 **Channel Tiket Berhasil Dibuat!** Silakan menuju ke saluran berikut untuk melanjutkan laporan Anda: ${ticketChannel}`,
            components: [],
          });
        } catch (err) {
          console.error('Gagal membuat channel tiket:', err);
          return interaction.editReply({
            content:
              '❌ Terjadi kesalahan saat mencoba membuat channel tiket baru. Pastikan Bot memiliki izin Manage Channels dan susunan ID Role Anda sudah benar.',
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
  // MESSAGE COMMANDS (prefix)
  // -----------------------------
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;

      if (!message.content.startsWith(PREFIX)) return;
      const [rawCmd, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/);
      const cmd = rawCmd.toLowerCase();

      // ---------- SETUP COMMAND ----------
      // ONLY usable by members who have at least one role listed in ADMIN_ROLE_IDS
      if (cmd === 'setup-report-staff') {
        const member = message.member;
        const isAdmin = member.roles.cache.some((r) => ADMIN_ROLE_IDS.includes(r.id));

        if (!isAdmin) {
          return message.reply({ content: 'Anda tidak memiliki izin (harus mempunyai role admin) untuk menggunakan perintah ini.' });
        }

        const embed = new EmbedBuilder()
          .setTitle('Lapor Staf')
          .setDescription('Klik tombol di bawah jika Anda ingin membuat laporan staf (tiket).')
          .setColor('#ff9900');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_report_staff').setLabel('Report Staff').setStyle(ButtonStyle.Primary)
        );

        try {
          await message.channel.send({ embeds: [embed], components: [row] });
          return message.reply({ content: '✅ Tombol Report Staff berhasil dipost di channel ini.' });
        } catch (err) {
          console.error('Gagal mem-post tombol report:', err);
          return message.reply({ content: '❌ Gagal mem-post tombol. Pastikan bot memiliki izin Send Messages dan Embed Links.' });
        }
      }

      // ---------- TICKET COMMANDS ----------
      // Only work in ticket channels
      const channel = message.channel;
      const isTicketChannel =
        (channel.name && channel.name.startsWith('staff-report-')) ||
        (channel.topic && channel.topic.includes('reporter:'));

      if (!isTicketChannel) return;

      // permission checks: admin role OR ManageChannels OR the original reporter
      const isAdmin = message.member.roles.cache.some((r) => ADMIN_ROLE_IDS.includes(r.id));
      const hasManageChannels = message.member.permissions.has(PermissionFlagsBits.ManageChannels);
      let isReporter = false;
      if (channel.topic) {
        const m = channel.topic.match(/reporter:(\d{17,19})/);
        if (m) {
          const reporterId = m[1];
          isReporter = reporterId === message.author.id;
        }
      }

      const getTargetMember = async (arg) => {
        if (!arg) return null;
        if (message.mentions.members.size > 0) return message.mentions.members.first();
        try {
          return await message.guild.members.fetch(arg);
        } catch {
          return null;
        }
      };

      if (cmd === 'add-report-staf') {
        const targetArg = args[0];
        const target = await getTargetMember(targetArg);
        if (!target) {
          return message.reply('Gunakan: `!add-report-staf @user` atau `!add-report-staf userId`.');
        }

        if (!isAdmin && !hasManageChannels && !isReporter) {
          return message.reply('Anda tidak memiliki izin untuk menambahkan user ke tiket ini.');
        }

        try {
          await channel.permissionOverwrites.edit(target.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          });
          return message.reply(`✅ Berhasil menambahkan ${target} ke tiket ini.`);
        } catch (err) {
          console.error('Gagal menambahkan member ke channel:', err);
          return message.reply('❌ Gagal menambahkan user ke tiket. Pastikan bot memiliki izin yang cukup.');
        }
      }

      if (cmd === 'remove-report-staf') {
        const targetArg = args[0];
        const target = await getTargetMember(targetArg);
        if (!target) {
          return message.reply('Gunakan: `!remove-report-staf @user` atau `!remove-report-staf userId`.');
        }

        if (!isAdmin && !hasManageChannels && !isReporter) {
          return message.reply('Anda tidak memiliki izin untuk menghapus user dari tiket ini.');
        }

        try {
          await channel.permissionOverwrites.delete(target.id);
          return message.reply(`✅ Berhasil menghapus akses ${target} dari tiket ini.`);
        } catch (err) {
          console.error('Gagal menghapus member dari channel:', err);
          return message.reply('❌ Gagal menghapus user dari tiket. Pastikan bot memiliki izin yang cukup.');
        }
      }
    } catch (err) {
      console.error('Error in report-staff message handler:', err);
    }
  });

  // return small util for testing if needed
  return {
    temporaryReportCache,
  };
};