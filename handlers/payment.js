const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');

module.exports = async (interaction, CONFIG) => {

    // ===============================
    // SLASH COMMAND /payment
    // ===============================
    if (
        interaction.isChatInputCommand() &&
        interaction.commandName === 'payment'
    ) {

        const hasAdminRole = interaction.member.roles.cache.some(role =>
            CONFIG.ADMIN_ROLE_ID.includes(role.id)
        );

        if (!hasAdminRole) {
            return interaction.reply({
                content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
                ephemeral: true
            });
        }

        const paymentEmbed = new EmbedBuilder()
            .setTitle('💳 METODE PEMBAYARAN RESMI')
            .setColor(0x00FF00)
            .setDescription('Pilih metode pembayaran yang kamu inginkan:')
            .setFooter({
                text: 'Community Store • Harap lampirkan bukti transfer.'
            })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pay_bank_info')
                    .setLabel('Transfer Bank')
                    .setEmoji('🏦')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('pay_gopay_info')
                    .setLabel('E-Wallet')
                    .setEmoji('📱')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('pay_qris_info')
                    .setLabel('QRIS')
                    .setEmoji('📲')
                    .setStyle(ButtonStyle.Success)
            );

        return interaction.reply({
            embeds: [paymentEmbed],
            components: [row],
            ephemeral: true
        });
    }

    // ===============================
    // BUTTON BANK
    // ===============================
    if (
        interaction.isButton() &&
        interaction.customId === 'pay_bank_info'
    ) {

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🏦 TRANSFER BANK')
            .setDescription(`
**Nomor Rekening**
\`\`\`
COMING SOON
\`\`\`

**Atas Nama**
\`\`\`
COMING SOON
\`\`\`
            `)
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    // ===============================
    // BUTTON E-WALLET
    // ===============================
    if (
        interaction.isButton() &&
        interaction.customId === 'pay_gopay_info'
    ) {

        const embed = new EmbedBuilder()
            .setColor(0x1abc9c)
            .setTitle('📱 E-WALLET')
            .addFields(
                {
                    name: 'GoPay',
                    value:
                        '```COMING SOON```',
                    inline: false
                },
                {
                    name: 'Dana',
                    value:
                        '```COMING SOON```',
                    inline: false
                }
            )
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    // ===============================
    // BUTTON QRIS
    // ===============================
    if (
        interaction.isButton() &&
        interaction.customId === 'pay_qris_info'
    ) {

        const embed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle('📲 PEMBAYARAN QRIS')
            .setDescription(
                'Silakan scan QRIS berikut untuk melakukan pembayaran.'
            )
            .setTimestamp();

        const qris = new AttachmentBuilder(
            `./${CONFIG.QRIS_FILE_NAME}`
        );

        return interaction.reply({
            embeds: [embed],
            files: [qris],
            ephemeral: true
        });
    }
};
