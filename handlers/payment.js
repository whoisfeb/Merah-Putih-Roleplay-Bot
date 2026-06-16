const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');

const fs = require('fs');

module.exports = async (interaction, CONFIG) => {

    try {

        // ==========================================
        // /payment
        // ==========================================
        if (
            interaction.isChatInputCommand() &&
            interaction.commandName === 'payment'
        ) {

            const hasAdminRole = interaction.member.roles.cache.some(role =>
                CONFIG.ADMIN_ROLE_ID.includes(role.id)
            );

            if (!hasAdminRole) {

                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
                        ephemeral: true
                    });
                }

                return true;
            }

            await interaction.deferReply({
                ephemeral: true
            });

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

            await interaction.editReply({
                embeds: [paymentEmbed],
                components: [row]
            });

            return true;
        }

        // ==========================================
        // BUTTON BANK
        // ==========================================
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

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            return true;
        }

        // ==========================================
        // BUTTON E-WALLET
        // ==========================================
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
                        value: '```COMING SOON```'
                    },
                    {
                        name: 'Dana',
                        value: '```COMING SOON```'
                    }
                )
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            return true;
        }

        // ==========================================
        // BUTTON QRIS
        // ==========================================
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

            const qrisPath = `./${CONFIG.QRIS_FILE_NAME}`;

            if (!fs.existsSync(qrisPath)) {

                return interaction.reply({
                    content: `❌ File QRIS tidak ditemukan.\nPath: \`${qrisPath}\``,
                    ephemeral: true
                });

            }

            const qris = new AttachmentBuilder(qrisPath);

            await interaction.reply({
                embeds: [embed],
                files: [qris],
                ephemeral: true
            });

            return true;
        }

        return false;

    } catch (err) {

        console.error('[PAYMENT HANDLER ERROR]', err);

        try {

            if (!interaction.replied && !interaction.deferred) {

                await interaction.reply({
                    content: '❌ Terjadi kesalahan saat memproses payment.',
                    ephemeral: true
                });

            }

        } catch (_) {}

        return true;
    }
};
