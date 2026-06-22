const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

// Konfigurasi (sesuaikan)
const CATEGORY_ID = '1392382458871156816';
const ADMIN_ROLE_IDS = [
  '1392382455981412398',
    '1392382455981412399',
    '1392382455981412393',
    '1392382455981412397',
    '1392382455981412396'
];
const DAFTAR_STAFF = [
  { label: 'Staf Alex (Admin)', value: 'Alex' },
  { label: 'Staf Budi (Moderator)', value: 'Budi' },
  { label: 'Staf Citra (Helper)', value: 'Citra' },
];

// Penyimpanan sementara untuk data form per user
const temporaryReportCache = new Map();

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      // TAHAP 1: User klik tombol "REPORT STAFF"
      if (interaction.isButton() && interaction.customId === 'btn_report_staff') {
        const modal = new ModalBuilder()
          .setCustomId('modal_report_staff')
          .setTitle('Form Laporan Staf');

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

        return await interaction.showModal(modal);
      }

      // TAHAP 2: User submit modal
      if (interaction.isModalSubmit() && interaction.customId === 'modal_report_staff') {
        const ucpPelapor = interaction.fields.getTextInputValue('input_ucp_pelapor');
        const namaPelapor = interaction.fields.getTextInputValue('input_nama_pelapor');
        const reason = interaction.fields.getTextInputValue('input_reason');

        // Simpan semua data di cache keyed by user id
        temporaryReportCache.set(interaction.user.id, {
          ucpPelapor,
          namaPelapor,
          reason,
          createdAt: Date.now(),
        });

        // Buat select menu dengan customId sederhana
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_staff_report')
          .setPlaceholder('Pilih nama staf yang ingin dilaporkan...')
          .addOptions(
            DAFTAR_STAFF.map(
              (staff) => new StringSelectMenuOptionBuilder().setLabel(staff.label).setValue(staff.value)
            )
          );

        const rowDropdown = new ActionRowBuilder().addComponents(selectMenu);

        return await interaction.reply({
          content: `✅ **Data Terbaca!**\n**UCP:** ${ucpPelapor}\n**Nama:** ${namaPelapor}\n\n👉 **Langkah Terakhir:** Silakan pilih nama staf yang Anda laporkan di bawah ini untuk membuat channel tiket:`,
          components: [rowDropdown],
          ephemeral: true,
        });
      }

      // TAHAP 3: User memilih staf -> buat channel tiket
      if (interaction.isStringSelectMenu() && interaction.customId === 'select_staff_report') {
        await interaction.deferReply({ ephemeral: true });

        const selectedStaff = interaction.values; // array of selected values
        const cache = temporaryReportCache.get(interaction.user.id);
        const reason = cache?.reason ?? 'Alasan tidak terbaca atau cache kedaluwarsa.';
        const ucpPelapor = cache?.ucpPelapor ?? 'Tidak tersedia';
        const namaPelapor = cache?.namaPelapor ?? 'Tidak tersedia';

        // buat nama channel aman
        const sanitizedUsername = interaction.user.username
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 20);
        const randomID = Math.floor(1000 + Math.random() * 9000);
        const channelName = `staff-report-${sanitizedUsername}-${randomID}`;

        try {
          // permission overwrites dasar
          const permissions = [
            {
              id: interaction.guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
          ];

          // tambahkan admin roles jika valid (abaikan placeholder)
          ADMIN_ROLE_IDS.forEach((roleId) => {
            if (roleId && !roleId.startsWith('TARUH_ID_ROLE_')) {
              permissions.push({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
              });
            }
          });

          const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID && !CATEGORY_ID.startsWith('TARUH_ID_') ? CATEGORY_ID : null,
            permissionOverwrites: permissions,
            reason: `Laporan staf oleh ${interaction.user.tag}`,
          });

          // Set topic agar command bisa membaca pemilik tiket nanti
          await ticketChannel.setTopic(`reporter:${interaction.user.id}`);

          // Embed laporan
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

          const adminMentions = ADMIN_ROLE_IDS.filter((id) => id && !id.startsWith('TARUH_ID_ROLE_'))
            .map((id) => `<@&${id}>`)
            .join(' ');

          await ticketChannel.send({
            content: `👋 ${adminMentions} • ${interaction.user}`,
            embeds: [ticketEmbed],
          });

          // Hapus cache sementara
          temporaryReportCache.delete(interaction.user.id);

          return await interaction.editReply({
            content: `🎉 **Channel Tiket Berhasil Dibuat!** Silakan menuju ke saluran berikut untuk melanjutkan laporan Anda: ${ticketChannel}`,
            components: [],
          });
        } catch (err) {
          console.error('Gagal membuat channel tiket:', err);
          return await interaction.editReply({
            content:
              '❌ Terjadi kesalahan saat mencoba membuat channel tiket baru. Pastikan Bot memiliki izin Manage Channels dan susunan ID Role Anda sudah benar.',
            components: [],
          });
        }
      }
    } catch (e) {
      console.error('Error di interactionCreate handler:', e);
      // jika interaction belum ter-replied/timed out, berikan fallback
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content: '❌ Terjadi error internal pada handler.' });
        } else if (interaction.isRepliable && !interaction.replied) {
          await interaction.reply({ content: '❌ Terjadi error internal pada handler.', ephemeral: true });
        }
      } catch (err) {
        // ignore
      }
    }
  },
};