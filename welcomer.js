require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // WAJIB aktif di Developer Portal
        GatewayIntentBits.GuildMessages
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_WELCOME_ID = '1392382456589717555'; // ID channel welcome & logs

// Fungsi untuk update status bot dengan jumlah member
function updateBotStatus(guild) {
    const memberCount = guild.memberCount;
    client.user.setActivity(`${memberCount} Members`, { type: ActivityType.Watching });
}

// Event saat member masuk
client.on('guildMemberAdd', async (member) => {
    const channel = member.guild.channels.cache.get(CHANNEL_WELCOME_ID);
    updateBotStatus(member.guild);

    if (!channel) return console.log(`⚠️ Channel welcome tidak ditemukan!`);

    const totalMember = member.guild.memberCount;

    const welcomeEmbed = new EmbedBuilder()
        .setColor(0x2ecc71) // Warna hijau untuk join
        .setTitle('Merah Putih Roleplay - Welcome')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
            `Hey, Welcome <@${member.id}>\n\n` +
            `・ Silahkan ambil role anda di <#1392382456589717559>\n` +
            `・ Buat akun/UCP di channel <#1392382456589717561>\n\n` +
            `**Member ke:** #${totalMember}`
        )
        .setFooter({ text: `Merah Putih Roleplay • Total: ${totalMember} Member` })
        .setTimestamp();

    try {
        await channel.send({ 
            content: `Selamat datang <@${member.id}>! Kamu adalah member ke-${totalMember}`, 
            embeds: [welcomeEmbed] 
        });
    } catch (err) {
        console.error("❌ Gagal mengirim pesan welcome:", err);
    }
});

// --- BAGIAN BARU: Event saat member keluar ---
client.on('guildMemberRemove', async (member) => {
    const channel = member.guild.channels.cache.get(CHANNEL_WELCOME_ID);
    updateBotStatus(member.guild);

    if (!channel) return console.log(`⚠️ Channel log keluar tidak ditemukan!`);

    const totalMember = member.guild.memberCount;

    const leaveEmbed = new EmbedBuilder()
        .setColor(0xe74c3c) // Warna merah untuk keluar
        .setTitle('Merah Putih Roleplay - Member Keluar')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
            `Selamat tinggal **${member.user.tag}**\n\n` +
            `Sayang sekali kamu harus pergi. Semoga harimu menyenangkan!\n\n` +
            `**Sisa Member:** ${totalMember}`
        )
        .setFooter({ text: `Merah Putih Roleplay • Total: ${totalMember} Member` })
        .setTimestamp();

    try {
        await channel.send({ 
            content: `**${member.user.tag}** baru saja meninggalkan server.`, 
            embeds: [leaveEmbed] 
        });
    } catch (err) {
        console.error("❌ Gagal mengirim pesan leave:", err);
    }
});

client.once('ready', () => {
    console.log(`✅ Welcomer & Log Online: ${client.user.tag}`);
    const firstGuild = client.guilds.cache.first();
    if (firstGuild) updateBotStatus(firstGuild);
});

client.login(TOKEN);
