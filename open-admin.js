const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    EmbedBuilder, 
    Events, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const TOKEN = process.env.DISCORD_TOKEN;
const LOG_CHANNEL_ID = '1503717359859269783';
const SERVER_ID = '1392382455876550796'; // Masukkan ID server agar slash command cepat muncul

client.once(Events.ClientReady, async () => {
    console.log(`✅ Modul Open Admin Aktif & Siap!`);
    // guild.commands.create dihapus dari sini karena sudah didaftarkan di index.js
});


client.on(Events.InteractionCreate, async interaction => {
    
    // Command untuk memunculkan tombol pendaftaran
    if (interaction.isChatInputCommand() && interaction.commandName === 'open-admin') {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_apply_admin')
                    .setLabel('Daftar Jadi Admin')
                    .setEmoji('📝')
                    .setStyle(ButtonStyle.Danger),
            );

        const embed = new EmbedBuilder()
            .setTitle('🇮🇩 Rekrutmen Admin Merah Putih RP')
            .setDescription('Silahkan klik tombol di bawah untuk mengisi formulir pendaftaran.')
            .setColor(0xff0000);

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    // Munculkan formulir saat tombol diklik
    if (interaction.isButton() && interaction.customId === 'btn_apply_admin') {
        const modal = new ModalBuilder()
            .setCustomId('modal_apply')
            .setTitle('Formulir Admin Merah Putih RP');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('nama')
                    .setLabel("NAMA")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('umur')
                    .setLabel("UMUR")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('kesibukan')
                    .setLabel("KESIBUKAN")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('admin_sekarang')
                    .setLabel("APAKAH ANDA ADMIN DI SERVER LAIN? (JIKA IYA, DIMANA?)")
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Tulis 'Tidak ada' jika tidak ada.")
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('riwayat_admin')
                    .setLabel("APAKAH ANDA PERNAH MENJADI ADMIN? (JIKA IYA, DIMANA?)")
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Sebutkan riwayat pengalaman admin Anda.")
                    .setRequired(true)
            )
        );

        await interaction.showModal(modal);
    }

    // Proses data saat formulir dikirim
    if (interaction.isModalSubmit() && interaction.customId === 'modal_apply') {
        const nama = interaction.fields.getTextInputValue('nama');
        const umur = interaction.fields.getTextInputValue('umur');
        const kesibukan = interaction.fields.getTextInputValue('kesibukan');
        const adminSekarang = interaction.fields.getTextInputValue('admin_sekarang');
        const riwayatAdmin = interaction.fields.getTextInputValue('riwayat_admin');

        const logEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('📥 LAMARAN ADMIN BARU - MERAH PUTIH RP')
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
            { name: '👤 NAMA', value: `\`\`\`${nama}\`\`\``, inline: false },
            { name: '🎂 UMUR', value: `\`\`\`${umur}\`\`\``, inline: false },
            { name: '💼 KESIBUKAN', value: `\`\`\`${kesibukan}\`\`\``, inline: false },
            { name: '🛡️ ADMIN DI SERVER LAIN?', value: `\`\`\`${adminSekarang}\`\`\``, inline: false },
            { name: '📜 PERNAH JADI ADMIN?', value: `\`\`\`${riwayatAdmin}\`\`\``, inline: false },
            { name: '🆔 DISCORD USER', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Reqruitment staff Merah Putih Roleplay' });


        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            logChannel.send({ embeds: [logEmbed] });
            await interaction.reply({ content: '✅ Formulir berhasil dikirim ke logs admin.', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Error: Channel logs tidak ditemukan.', ephemeral: true });
        }
    }
});

client.login(TOKEN);
