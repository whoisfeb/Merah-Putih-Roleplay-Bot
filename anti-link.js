const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    CLIENT_ID: '1496812134141526096', 
    GUILD_ID: '1392382455876550796',
};

const ADMIN_ROLE_IDS = [
    '1392382455981412398',
    '1392382455981412393',
    '1392382455981412397',
    '1392382455947989066'
];

const BAD_LINKS = ["free-nitro", "discord-gift", "steam-promo", "bit.ly/badlink", "https://discord.gg", "https://discord.com", "discord.gg", "cherry-girls"];

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const isAdmin = message.member.roles.cache.some(role => ADMIN_ROLE_IDS.includes(role.id));
    if (isAdmin) return;

    const content = message.content;
    const lowerContent = content.toLowerCase();
    const hasBadLink = BAD_LINKS.some(link => lowerContent.includes(link));

    if (hasBadLink) {
        try {
            // 1. Hapus pesan asli segera demi keamanan
            await message.delete();

            // 2. Kirim pesan pemicu (Dilihat semua orang agar user tahu kenapa pesannya hilang)
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`trigger_${message.author.id}`)
                        .setLabel('Verifikasi Pesan Saya')
                        .setStyle(ButtonStyle.Primary)
                );

            const triggerMsg = await message.channel.send({
                content: `⚠️ ${message.author}, pesan Anda mengandung link terlarang. Klik tombol di bawah untuk verifikasi manusia.`,
                components: [row]
            });

            const collector = triggerMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30000 // 30 detik untuk klik tombol pertama
            });

            let isVerified = false;

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: 'Tombol ini bukan untuk Anda!', ephemeral: true });
                }

                // 3. Tampilkan Pesan Rahasia (Hanya user tersebut yang bisa lihat)
                const confirmRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('confirm_yes')
                            .setLabel('Ya, Kirim Pesan')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('confirm_no')
                            .setLabel('Bukan/Batalkan')
                            .setStyle(ButtonStyle.Danger)
                    );

                await interaction.reply({
                    content: 'Apakah Anda yakin pesan ini aman? Jika Anda berbohong, Anda akan di-timeout.',
                    components: [confirmRow],
                    ephemeral: true
                });

                // Kolektor kedua khusus untuk pesan rahasia (waktu singkat: 15 detik)
                const internalCollector = interaction.channel.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 15000
                });

                internalCollector.on('collect', async (i2) => {
                    if (i2.customId === 'confirm_yes') {
                        isVerified = true;
                        // Kirim ulang pesan asli tanpa teks tambahan
                        await interaction.channel.send({ content: content });
                        await i2.reply({ content: 'Pesan berhasil dikirim ulang.', ephemeral: true });
                        await triggerMsg.delete().catch(() => {});
                        collector.stop();
                    } else {
                        // User klik "No"
                        await applyAutoTimeout(message.member, triggerMsg);
                        collector.stop();
                    }
                });
            });

            collector.on('end', async () => {
                // Jika waktu habis dan tidak terverifikasi (Bot spam biasanya abaikan tombol)
                if (!isVerified) {
                    await applyAutoTimeout(message.member, triggerMsg);
                }
            });

        } catch (error) {
            console.error('Error Anti-Link:', error);
        }
    }
});

// Fungsi untuk menerapkan timeout dan memunculkan Embed peringatan publik
async function applyAutoTimeout(member, triggerMsg) {
    try {
        const duration = 30 * 60 * 1000; // 30 Menit
        await member.timeout(duration, 'Auto-mod: Gagal verifikasi link mencurigakan');

        const warningEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`⚠️ ${member.user.tag} otomatis di-timeout karena mengirim link mencurigakan.`);

        await triggerMsg.edit({ 
            content: null, 
            embeds: [warningEmbed], 
            components: [] 
        });

        // Pesan timeout hilang setelah 15 detik agar chat tetap bersih
        setTimeout(() => triggerMsg.delete().catch(() => {}), 15000);
    } catch (err) {
        console.error('Gagal Timeout:', err);
        await triggerMsg.delete().catch(() => {});
    }
}

client.once('ready', () => console.log(`Bot Guard aktif: ${client.user.tag}`));
client.login(CONFIG.TOKEN);
