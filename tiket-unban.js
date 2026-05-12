const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const TOKEN = process.env.DISCORD_TOKEN;
const CATEGORY_ID = '1392382459060162633';
const ADMIN_ROLE_ID = '1392382455947989066';

client.once('ready', () => {
    console.log(`Bot Unban Aktif!`);
});

// Setup Command
client.on('messageCreate', async (message) => {
    if (message.content === '!setup-unban') {
        const embed = new EmbedBuilder()
            .setTitle('Permohonan Unban')
            .setDescription('Klik tombol di bawah untuk mengisi formulir unban.')
            .setColor(0x2F3136);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_unban_form')
                .setLabel('Buka Tiket Unban')
                .setEmoji('📩')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async (interaction) => {
    // 1. JIKA TOMBOL BUKA TIKET DIKLIK (MUNCULKAN MODAL)
    if (interaction.isButton() && interaction.customId === 'open_unban_form') {
        const modal = new ModalBuilder()
            .setCustomId('unban_form_modal')
            .setTitle('Formulir Request Unbanned');

        const ucp = new TextInputBuilder().setCustomId('ucp').setLabel("UCP").setStyle(TextInputStyle.Short).setRequired(true);
        const charName = new TextInputBuilder().setCustomId('char_name').setLabel("Nama Karakter").setStyle(TextInputStyle.Short).setRequired(true);
        const reason = new TextInputBuilder().setCustomId('reason').setLabel("Reason/Alasan Banned").setStyle(TextInputStyle.Paragraph).setRequired(true);
        const duration = new TextInputBuilder().setCustomId('duration').setLabel("Banned Duration / Time").setPlaceholder("Contoh: 7 Hari / Permanent").setStyle(TextInputStyle.Short).setRequired(true);
        const bannedBy = new TextInputBuilder().setCustomId('banned_by').setLabel("Banned By").setStyle(TextInputStyle.Short).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(ucp),
            new ActionRowBuilder().addComponents(charName),
            new ActionRowBuilder().addComponents(reason),
            new ActionRowBuilder().addComponents(duration),
            new ActionRowBuilder().addComponents(bannedBy)
        );

        await interaction.showModal(modal);
    }

    // 2. TANGKAP HASIL MODAL & BUAT CHANNEL
    if (interaction.isModalSubmit() && interaction.customId === 'unban_form_modal') {
        const data = {
            ucp: interaction.fields.getTextInputValue('ucp'),
            char: interaction.fields.getTextInputValue('char_name'),
            reason: interaction.fields.getTextInputValue('reason'),
            time: interaction.fields.getTextInputValue('duration'),
            admin: interaction.fields.getTextInputValue('banned_by')
        };

        const channelName = `unban-${data.ucp}`;
        
        await interaction.deferReply({ ephemeral: true });

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        const resultEmbed = new EmbedBuilder()
            .setTitle('🎫 Tiket Unban Baru')
            .setColor(0xFFFF00)
            .addFields(
                { name: '👤 User', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                { name: '🖥️ UCP', value: data.ucp, inline: true },
                { name: '🎭 Nama Karakter', value: data.char, inline: true },
                { name: '⏳ Durasi Banned', value: data.time, inline: true },
                { name: '👮 Banned By Admin', value: data.admin, inline: true },
                { name: '📝 Alasan Banned', value: data.reason }
            )
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Tutup Tiket').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `<@&${ADMIN_ROLE_ID}>`, embeds: [resultEmbed], components: [row] });
        await interaction.editReply({ content: `Tiket berhasil dibuat di ${ticketChannel}` });
    }

    // 3. TUTUP TIKET
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply('Tiket ini akan dihapus dalam 5 detik...');
        setTimeout(() => interaction.channel.delete(), 5000);
    }
});

client.login(TOKEN);
