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

const ADMIN_ROLE_IDS = ['1392382455981412398', '1392382455981412393', '1392382455981412397', '1392382455947989066'];
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
            await message.delete();

            // Pesan pemicu publik agar user bisa memicu pesan ephemeral
            const triggerRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`verify_${message.author.id}`)
                    .setLabel('Konfirmasi Pesan Anda')
                    .setStyle(ButtonStyle.Primary)
            );

            const triggerMsg = await message.channel.send({
                content: `⚠️ ${message.author}, pesan Anda ditahan. Klik tombol di bawah untuk verifikasi.`,
                components: [triggerRow]
            });

            const collector = triggerMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30000 
            });

            let isActioned = false;

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: 'Tombol ini bukan untuk Anda!', ephemeral: true });
                }

                // Munculkan konfirmasi rahasia (Ephemeral)
                const confirmRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('yes_send').setLabel('Ya, Kirim').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('no_timeout').setLabel('Tidak/Hukum Saya').setStyle(ButtonStyle.Danger)
                );

                await interaction.reply({
                    content: 'Apakah Anda yakin ingin mengirim pesan tersebut secara publik?',
                    components: [confirmRow],
                    ephemeral: true
                });

                const subCollector = interaction.channel.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 15000
                });

                subCollector.on('collect', async (i2) => {
                    if (i2.customId === 'yes_send') {
                        isActioned = true;
                        await interaction.channel.send({ content: content });
                        await i2.reply({ content: 'Pesan terkirim!', ephemeral: true });
                        await triggerMsg.delete().catch(() => {});
                        collector.stop();
                    } else {
                        isActioned = true; // Set true agar end collector tidak trigger timeout ganda
                        await applyAutoTimeout(message.member, triggerMsg);
                        collector.stop();
                    }
                    subCollector.stop();
                });
            });

            collector.on('end', async () => {
                if (!isActioned) {
                    await applyAutoTimeout(message.member, triggerMsg);
                }
            });

        } catch (error) {
            console.error('Error:', error);
        }
    }
});

async function applyAutoTimeout(member, botMessage) {
    try {
        const duration = 30 * 60 * 1000;
        await member.timeout(duration, 'Auto-mod: Link Mencurigakan');

        const timeoutEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`⚠️ ${member.user.tag} otomatis di-timeout karena mengirim link mencurigakan.`);

        await botMessage.edit({ content: null, embeds: [timeoutEmbed], components: [] });
        
        // Hilang setelah 10 detik sesuai permintaan
        setTimeout(() => botMessage.delete().catch(() => {}), 10000);
    } catch (err) {
        console.error('Gagal Timeout:', err);
        await botMessage.delete().catch(() => {});
    }
}

client.login(CONFIG.TOKEN);
