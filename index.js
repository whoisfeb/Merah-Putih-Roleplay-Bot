const fs = require('fs');
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActivityType, 
    REST, 
    Routes,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    AuditLogEvent
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// --- KONFIGURASI ---
const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    CLIENT_ID: '1496812134141526096', 
    GUILD_ID: '1392382455876550796',  
    ANNOUNCE_CHANNEL: '1496811675578269736',
    LOG_CHANNEL: '1392382458615435266',
    ADMIN_ROLE_ID: [
        '1392382455981412398',
        '1392382455981412393',
        '1392382455981412397',
        '1392382455947989066'
    ], 
    QRIS_FILE_NAME: 'merahputuhqr.png' ,
    ALLOWED_CHANNELS: [
        '1392382459060162631', 
        '1392382459060162639',
        '1392382458615435272'
    ]
};

// --- DAFTAR KATA KASAR ---
const BADWORDS = [
  'free', 'tolol', 'goblok', 'bego', 'pepek', 'dongo', 'tai', 'kontol', 
  'bio', 'sexcam', 'entot', 'ngentot', 'join', 'invite', 'anjing', 
  'babi', 'memek', 'ngewe', 'ewe', 'lonte', 'pler', 'bgst', 'bangsat'
];

const RANDOM_MESSAGES = [
    "Ayo Login dan Ramaikan Merah Putih Roleplay\n<@&1392382455876550799>!",
    "Halo apakabar semua ap akah kalian sehat sehat saja?\nAlhamdulillah jika anda sehat sehat saja\nAyo kita ramaikan Merah Putih Roleplay jika anda menemukan bug silahkan laporkan ke <#1496809960867106826>, namun jika anda melihat player yang melakukan kesalahan silahkan laporkan di <#1496810065158471751>\n<@&1392382455876550799>",
    "Merah Putih Roleplay adalah server terbaik sepanjang masa\n Jangan lupa share link discord Merah Putih Roleplay ke teman, keluarga atau bahkan grup sekolah kalian ya\nhttps://discord.gg\n<@&1392382455876550799>.",
    "Halo <@&1392382455876550799> , seru ga bermain Merah Putih Roleplay? apa? anda baru join? kalau baru join langsung <#1392382456589717561>",
    "Kami segenap pengurus Merah Putih Roleplay berterima kasih ke kalian yang telah mendukung komunitas ini \n <@&1392382455876550799>!",
    "Dihimbau kepada seluruh <@&1392382455876550799> untuk **tidak sembarangan bergabung (join) ke link Discord yang tidak jelas atau tidak resmi**.\n\nKami menemukan adanya beberapa link mencurigakan yang berpotensi:\n- Mengandung scam / penipuan\n- Phishing (pencurian akun)\n- Malware / virus\n\n🔒 **Keamanan akun adalah tanggung jawab masing-masing.**\nSegala bentuk kerugian akibat join link di luar server resmi bukan tanggung jawab pihak kami.\n\n📌 **Harap diperhatikan:**\n* Hanya join link yang dibagikan oleh admin resmi\n* Jangan mudah percaya dengan DM/link dari orang tidak dikenal\n\n**Tetap waspada dan jaga keamanan akun kalian.**\n\n- <@&1392382455876550799>",
    "Halo <@&1392382455876550799> 👋\nKami menegaskan bahwa server ini memiliki kebijakan **ZERO TOLERANCE** terhadap segala bentuk pelecehan, baik secara verbal, tulisan, maupun tindakan dalam roleplay maupun di luar roleplay.\n\n⚠️ Termasuk:\n• Pelecehan seksual\n• Catcalling / komentar tidak pantas\n• DM tidak sopan / mengganggu\n• Body shaming\n• Candaan berlebihan yang bersifat merendahkan\n• Pelecehan OOC maupun IC \n\nTidak ada alasan \"bercanda\". Tidak ada alasan \"hanya RP\". Jika melewati batas, tindakan akan diambil.\n\n📩 Jika kalian mengalami atau melihat tindakan pelecehan: Segera laporkan ke admin disertai bukti yang valid. Sanksi tegas menanti dari warning hingga **BANNED PERMANENT**.\n<@&1392382455876550799>",
    "**INFO PERMASALAHAN SERVER**\n\n**Kesalahan Admin:** Dilarang debat OOC di game, lapor via ticket/channel resmi.\n**Bug / Error:** Wajib lapor! Dilarang memanfaatkan bug (abuse).\n**Report Player:** Gunakan fitur report dengan bukti jelas. Fitnah = Sanksi.\n**Kritik & Saran:** Sampaikan dengan sopan di channel yang disediakan.\n\nMari kita menjaga kenyamanan di Merah Putih Roleplay.\n#HAPPYROLEPLAY <@&1392382455876550799>",
    "Di Merah Putih Roleplay, cerita besar dimulai dari langkah kecil. Ayo buat ceritamu!\n<@&1392382455876550799>",
    "Bukan seberapa hebat senjatamu, tapi seberapa kuat alur ceritamu di Merah Putih.\n<@&1392382455876550799>",
    "Jadilah legenda di kota ini, bukan sekadar nama di papan skor. Login sekarang!\n<@&1392382455876550799>",
    "Merah Putih Roleplay: Tempat di mana imajinasi bertemu dengan realita SAMP.\n<@&1392382455876550799>",
    "Karaktermu adalah cerminan dirimu, buatlah ia berkesan bagi warga lain.\n<@&1392382455876550799>",
    "Hargai setiap proses, karena setiap skenario punya makna mendalam.\n<@&1392382455876550799>",
    "Kota ini keras, tapi tekadmu harus lebih keras untuk bertahan di Merah Putih.\n<@&1392382455876550799>",
    "Di Merah Putih Roleplay, kita tidak hanya bermain, kita menciptakan sejarah bersama.\n<@&1392382455876550799>",
    "Roleplay bukan tentang menang atau kalah, tapi tentang rasa dan kualitas.\n<@&1392382455876550799>",
    "Jalin koneksi, bangun relasi, kuasai ekonomi Merah Putih Roleplay.\n<@&1392382455876550799>",
    "Aspal Merah Putih tidak pernah tidur, begitu juga dengan ambisi kami semua.\n<@&1392382455876550799>",
    "Satu peluru bisa mengakhiri hidup, tapi satu pengkhianatan mengakhiri segalanya.\n<@&1392382455876550799>",
    "Loyalitas itu mahal, jangan harapkan dari orang murahan di kota ini.\n<@&1392382455876550799>",
    "Kami bicara lewat aksi, bukan sekadar janji manis di depan SAPD.\n<@&1392382455876550799>",
    "Warna baju boleh beda, tapi rasa hormat antar player tetap yang utama.\n<@&1392382455876550799>",
    "Jangan cari masalah jika belum siap menanggung resiko di Merah Putih Roleplay!\n<@&1392382455876550799>",
    "Di gang sempit Merah Putih Roleplay, persaudaraan adalah segalanya bagi kami.\n<@&1392382455876550799>",
    "Sirine polisi adalah musik pengantar tidur bagi para outlaw kota.\n<@&1392382455876550799>",
    "Hati-hati berucap, dinding Merah Putih Roleplay punya telinga yang siap melapor.\n<@&1392382455876550799>",
    "Kekuasaan bukan diberikan, tapi direbut dengan keringat dan darah.\n<@&1392382455876550799>",
    "Melayani dengan hati, melindungi Merah Putih Roleplay dengan nyawa. Salam SAPD!\n<@&1392382455876550799>",
    "Jangan coba-coba lari, radar kami lebih luas dari pelarianmu warga!\n<@&1392382455876550799>",
    "Hukum adalah harga mati di Merah Putih Roleplay. Patuhi atau dipenjara!\n<@&1392382455876550799>",
    "Tangan kanan memegang borgol, tangan kiri memegang keadilan kota.\n<@&1392382455876550799>",
    "Sirene kami adalah peringatan, bukan ajakan untuk balapan liar.\n<@&1392382455876550799>",
    "Merah Putih Roleplay aman karena kami tetap berjaga saat kalian terlelap tidur.\n<@&1392382455876550799>",
    "Integritas adalah seragam yang kami pakai setiap hari bertugas.\n<@&1392382455876550799>",
    "Tidak ada tempat bagi kriminal di sudut kota Merah Putih Roleplay. Kami mengawasi!\n<@&1392382455876550799>",
    "Patroli pagi, amankan kota, demi Merah Putih Roleplay yang lebih baik lagi.\n<@&1392382455876550799>",
    "Tertib berlalu lintas atau siap-siap dompetmu terkuras denda!\n<@&1392382455876550799>",
    "Kerja keras di siang hari, party di malam hari. Itulah vibe Merah Putih Roleplay.\n<@&1392382455876550799>",
    "Dari supir taksi sampai CEO, semua punya cerita unik di Merah Putih Roleplay.\n<@&1392382455876550799>",
    "Cari uang halal itu susah, tapi di Merah Putih Roleplay selalu ada jalan bagi yang mau.\n<@&1392382455876550799>",
    "Mancing tenang di pier, sambil menunggu senja Merah Putih Roleplay yang indah.\n<@&1392382455876550799>",
    "Jangan remehkan warga sipil, kami adalah nyawa dari kota besar ini.\n<@&1392382455876550799>",
    "Membangun ekonomi kota, satu crate pada satu waktu. Semangat kerja!\n<@&1392382455876550799>",
    "Nge-bus dulu baru nge-boss, semuanya butuh proses dan kesabaran.\n<@&1392382455876550799>",
    "Merah Putih Roleplay: Tempat imajinasi bisa menjadi nyata dalam karakter.\n<@&1392382455876550799>",
    "Gaji masuk, dompet penuh, hati senang belanja di Merah Putih Roleplay.\n<@&1392382455876550799>",
    "Kopi hangat dan suasana kota Merah Putih Roleplay, kombinasi sempurna pagi ini.\n<@&1392382455876550799>",
    "Roleplay elit, bayar denda flatbed sulit. Ayo kerja jangan malas!\n<@&1392382455876550799>",
    "Bukannya takut polisi, cuma takut denda flatbed lebih mahal dari gaji.\n<@&1392382455876550799>",
    "Cintaku padamu seperti admin Merah Putih Roleplay, selalu mengawasi tiap saat.\n<@&1392382455876550799>",
    "Udah ganteng, udah keren, eh malah kena /jail gara-gara DM. Pelajari rules!\n<@&1392382455876550799>",
    "Hati ini bukan mobil yang bisa kamu repair seenaknya di mekanik.\n<@&1392382455876550799>",
    "Jangan nanya 'kapan nikah' di IC, nanya 'kapan bagi uang' aja lebih asik.\n<@&1392382455876550799>",
    "Jago nembak di server, tapi gak berani nembak gebetan di RL? Cupu!\n<@&1392382455876550799>",
    "Hidup itu seperti lag, kadang lancar kadang bikin emosi jiwa.\n<@&1392382455876550799>",
    "Lari dari kenyataan itu susah, mending lari dari kejaran SAPD kota.\n<@&1392382455876550799>",
    "Merah Putih Roleplay: Tempat di mana saya lebih kaya daripada dunia nyata.\n<@&1392382455876550799>",
    "Setiap orang punya topeng, di Merah Putih Roleplay kita bebas memilih peran kita.\n<@&1392382455876550799>",
    "Jangan biarkan emosi OOC merusak indahnya skenario IC yang sudah dibangun.\n<@&1392382455876550799>",
    "Hargai lawan roleplay-mu, karena tanpa mereka ceritamu hambar rasa.\n<@&1392382455876550799>",
    "Kejayaan itu sementara, tapi kesan yang kamu tinggalkan itu selamanya.\n<@&1392382455876550799>",
    "Belajarlah menghargai waktu orang lain di dalam kota saat berinteraksi.\n<@&1392382455876550799>",
    "Bukan tentang seberapa banyak uangmu, tapi seberapa berkualitas RP-mu.\n<@&1392382455876550799>",
    "Kesalahan adalah pelajaran, jangan baper jika kalah dalam skenario.\n<@&1392382455876550799>",
    "Merah Putih Roleplay adalah wadah kreativitas, dan kamu adalah senimannya.\n<@&1392382455876550799>",
    "Tinggalkan jejak baik di setiap sudut Merah Putih Roleplay hari ini.\n<@&1392382455876550799>",
    "Roleplay yang baik dimulai dari attitude player yang baik pula.\n<@&1392382455876550799>",
    "Stay Clean, Stay Merah Putih. Jaga nama baik komunitas kita bersama!\n<@&1392382455876550799>",
    "Merah Putih Roleplay: My City, My Rules. Mari kita ramaikan!\n<@&1392382455876550799>",
    "Born to be Merah Putih Roleplay. Buktikan kemampuanmu di dalam kota!\n<@&1392382455876550799>",
    "Loyalty Above All. Kesetiaan adalah segalanya di server ini.\n<@&1392382455876550799>",
    "Create Your Story. Jangan biarkan orang lain mengatur alur hidupmu.\n<@&1392382455876550799>",
    "Respect the Staff, Love the Community. Mari jaga keharmonisan kita.\n<@&1392382455876550799>",
    "No Merah Putih Roleplay, No Party. Login sekarang dan rasakan keseruannya!\n<@&1392382455876550799>",
    "Simpel tapi Berkualitas. Itulah standar Roleplay di Merah Putih Roleplay.\n<@&1392382455876550799>",
    "Rumah kedua: Merah Putih Roleplay Roleplay. Tempat pulang paling nyaman.\n<@&1392382455876550799>",
    "Justice for Merah Putih Roleplay. Tegakkan keadilan di setiap sudut jalanan!\n<@&1392382455876550799>",
    "Admin bukan tuhan, tapi penjaga kenyamanan kita semua di server.\n<@&1392382455876550799>",
    "Report jika butuh, jangan spam jika tak ingin di-kick dari server.\n<@&1392382455876550799>",
    "Komunitas sehat, Roleplay makin nikmat. Yuk jaga lisan dan ketikan.\n<@&1392382455876550799>",
    "Terima kasih Merah Putih Roleplay telah mempertemukan kami dengan kawan baru.\n<@&1392382455876550799>",
    "Saran kalian adalah pondasi kemajuan Merah Putih Roleplay ke depannya.\n<@&1392382455876550799>",
    "Dukung terus Merah Putih Roleplay agar makin didepan dan makin rame warga!\n<@&1392382455876550799>",
    "Staff ramah, warga betah. Itulah keunggulan Merah Putih Roleplay.\n<@&1392382455876550799>",
    "Beda kota, beda rasa, tapi Merah Putih Roleplay tetap juaranya di hati.\n<@&1392382455876550799>",
    "Kritik membangun, bukan menjatuhkan. Sampaikan dengan cara sopan.\n<@&1392382455876550799>",
    "Satu visi, satu misi, satu Merah Putih Roleplay selamanya.\n<@&1392382455876550799>",
    "Siapkan senjatamu, Merah Putih Roleplay sedang membara dengan persaingan!\n<@&1392382455876550799>",
    "Darah akan tumpah, kehormatan akan dipertaruhkan malam ini di kota.\n<@&1392382455876550799>",
    "Saatnya yang muda yang berkuasa di jalanan Merah Putih Roleplay.\n<@&1392382455876550799>",
    "Goncangkan kota dengan raungan mesin v8-mu warga! Ayo balapan!\n<@&1392382455876550799>",
    "Kegelapan mulai menyelimuti Merah Putih Roleplay, siapa yang akan bertahan hidup?\n<@&1392382455876550799>",
    "Jangan berkedip, atau kamu akan kehilangan momen berhargamu di kota.\n<@&1392382455876550799>",
    "Setiap detik di Merah Putih Roleplay adalah adrenalin yang tak terduga.\n<@&1392382455876550799>",
    "Buktikan kalau kamu memang layak menjadi warga Merah Putih Roleplay sejati.\n<@&1392382455876550799>",
    "Bangkit atau hancur di jalanan Merah Putih Roleplay. Pilihan ada di tanganmu.\n<@&1392382455876550799>",
    "Ini bukan sekadar permainan, ini adalah pertempuran mental dan taktik.\n<@&1392382455876550799>",
    "Masih ragu? Masuk dulu baru tahu serunya Merah Putih Roleplay sesungguhnya.\n<@&1392382455876550799>",
    "Undang temanmu, bangun dinasti terkuat di Merah Putih Roleplay Roleplay.\n<@&1392382455876550799>",
    "Bosan hidup biasa? Jadi luar biasa di Merah Putih Roleplay sekarang juga!\n<@&1392382455876550799>",
    "Temukan jati dirimu yang sebenarnya di dalam karakter unikmu.\n<@&1392382455876550799>",
    "Jangan cuma jadi penonton, jadilah pemeran utama di Merah Putih Roleplay!\n<@&1392382455876550799>",
    "Merah Putih Roleplay Roleplay menantang kreativitasmu dalam ber-roleplay.\n<@&1392382455876550799>",
    "Siapkan dirimu, sejarah besar kota ini akan segera diukir olehmu.\n<@&1392382455876550799>",
    "Merah Putih Roleplay: Merah Putih is not an act, it's a habit.\n<@&1392382455876550799>"
];

// --- REGISTER SLASH COMMANDS ---
const commands = [
    {
        name: 'payment',
        description: 'Menampilkan informasi metode pembayaran resmi store',
    },
    {
        name: 'open-admin',
        description: 'Memunculkan tombol pendaftaran admin',
    },
    {
        name: 'addrole',
        description: 'Memberikan role kepada seorang member',
        options: [
            {
                name: 'user',
                type: 6,
                description: 'Member yang akan diberi role',
                required: true,
            },
            {
                name: 'role',
                type: 9,
                description: 'Role yang akan diberikan',
                required: true,
            },
        ],
    },
    {
        name: 'removerole',
        description: 'Menghapus role dari seorang member',
        options: [
            {
                name: 'user',
                type: 6,
                description: 'Member yang akan dihapus rolenya',
                required: true,
            },
            {
                name: 'role',
                type: 9,
                description: 'Role yang akan dihapus',
                required: true,
            },
        ],
    },
    {
        name: 'addticket',
        description: 'Menambahkan pengguna ke dalam tiket unban ini',
        options: [
            {
                name: 'target',
                type: 6,
                description: 'Pengguna yang ingin dimasukkan ke tiket',
                required: true,
            },
        ],
    },
    {
        name: 'claimtopup',
        description: 'Claim tiket topup dengan alasan',
        options: [{ name: 'reason', type: 3, description: 'Alasan claim', required: true }]
    },
    {
        name: 'closetopup',
        description: 'Tutup tiket topup dengan alasan',
        options: [{ name: 'reason', type: 3, description: 'Alasan penutupan', required: true }]
    }
];

const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);

async function registerCommands() {
    try {
        console.log('[SYSTEM] Mendaftarkan Slash Commands...');
        await rest.put(
            Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID),
            { body: commands },
        );
        console.log('[SYSTEM] Slash Commands berhasil didaftarkan!');
    } catch (error) {
        console.error(error);
    }
}

// Helper function untuk send log
function sendLog(guild, embed) {
    if (!guild) return;
    const logChannel = guild.channels.cache.get(CONFIG.LOG_CHANNEL);
    if (logChannel) logChannel.send({ embeds: [embed] }).catch(err => console.error('Gagal mengirim log:', err));
}

client.once('ready', async () => {
    console.log(`[LOG] Berhasil masuk sebagai ${client.user.tag}`);
    await registerCommands();

    // ========== SET STATUS BOT ==========
    client.user.setPresence({
        activities: [
            { 
                name: 'Merah Putih Roleplay', 
                type: ActivityType.Playing 
            }
        ],
        status: 'online',
    });
    console.log('[LOG] Status bot telah diubah menjadi ONLINE');
    // ====================================

    const logChannel = client.channels.cache.get(CONFIG.LOG_CHANNEL);
    if (logChannel) {
        const onlineEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('🚀 System Core Online')
            .addFields(
                { name: '📡 Status', value: '` Online `', inline: true },
                { name: '⚡ Latency', value: `\` ${client.ws.ping}ms \``, inline: true }
            )
            .setTimestamp();
        logChannel.send({ embeds: [onlineEmbed] }).catch(err => console.error('Gagal kirim online log:', err));
    }

    setInterval(() => {
        const announceChannel = client.channels.cache.get(CONFIG.ANNOUNCE_CHANNEL);
        if (announceChannel) {
            const text = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
            announceChannel.send(`📢 **Merah Putih Roleplay**\n\n${text}`).catch(err => console.error('Gagal kirim announce:', err));
        }
    }, 3600000);
});

// Global error handlers agar proses tidak crash karena unhandled errors
process.on('unhandledRejection', (err) => {
    console.error('UnhandledRejection:', err);
});
process.on('uncaughtException', (err) => {
    console.error('UncaughtException:', err);
});
client.on('error', (err) => {
    console.error('Client error:', err);
});
client.on('shardError', (err) => {
    console.error('Shard error:', err);
});

// --- EVENT: INTERACTION (SLASH COMMANDS & BUTTONS) ---
client.on('interactionCreate', async (interaction) => {
    try {
        // --- 1. CHAT INPUT COMMANDS ---
        if (interaction.isChatInputCommand()) {
            
            // COMMAND: /payment
            if (interaction.commandName === 'payment') {
                const hasAdminRole = interaction.member.roles.cache.some(role => 
                    CONFIG.ADMIN_ROLE_ID.includes(role.id)
                );

                if (!hasAdminRole) {
                    return await safeReply(interaction, { 
                        content: '❌ Kamu tidak memiliki izin (Role Admin) untuk menggunakan perintah ini!', 
                        flags: 64 
                    });
                }

                const paymentEmbed = new EmbedBuilder()
                    .setTitle('💳 METODE PEMBAYARAN RESMI')
                    .setColor(0x00FF00)
                    .setDescription('Pilih metode pembayaran yang kamu inginkan:')
                    .setFooter({ text: 'Community Store • Harap lampirkan bukti transfer.' })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('pay_bank_info').setLabel('Transfer Bank').setEmoji('🏦').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('pay_gopay_info').setLabel('E-Wallet').setEmoji('📱').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('pay_qris_info').setLabel('QRIS').setEmoji('📲').setStyle(ButtonStyle.Success)
                );

                return await safeReply(interaction, { embeds: [paymentEmbed], components: [row], flags: 64 });
            }

            // COMMAND: /addrole
            if (interaction.commandName === 'addrole') {
                const user = interaction.options.getUser('user');
                const role = interaction.options.getRole('role');
                const member = await interaction.guild.members.fetch(user.id);

                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    return await safeReply(interaction, { content: '❌ Anda tidak memiliki izin ManageRoles!', flags: 64 });
                }
                if (member.roles.cache.has(role.id)) {
                    return await safeReply(interaction, { content: `❌ ${user.tag} sudah memiliki role ${role.name}!`, flags: 64 });
                }
                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    return await safeReply(interaction, { content: `❌ Role ${role.name} lebih tinggi atau sama dengan role bot saya!`, flags: 64 });
                }

                try {
                    await member.roles.add(role);
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Role Ditambahkan')
                        .setColor('#2ecc71')
                        .addFields(
                            { name: 'Member', value: `${user} (${user.tag})`, inline: true },
                            { name: 'Role', value: `${role.name}`, inline: true },
                            { name: 'Diberikan Oleh', value: `${interaction.user.tag}`, inline: true }
                        ).setTimestamp();
                    await safeReply(interaction, { embeds: [embed], flags: 64 });
                    sendLog(interaction.guild, embed);
                } catch (error) {
                    await safeReply(interaction, { content: `❌ Terjadi error: ${error.message}`, flags: 64 });
                }
            }

            // COMMAND: /removerole
            if (interaction.commandName === 'removerole') {
                const user = interaction.options.getUser('user');
                const role = interaction.options.getRole('role');
                const member = await interaction.guild.members.fetch(user.id);

                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    return await safeReply(interaction, { content: '❌ Anda tidak memiliki izin ManageRoles!', flags: 64 });
                }
                if (!member.roles.cache.has(role.id)) {
                    return await safeReply(interaction, { content: `❌ ${user.tag} tidak memiliki role ${role.name}!`, flags: 64 });
                }
                try {
                    await member.roles.remove(role);
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Role Dihapus')
                        .setColor('#e74c3c')
                        .addFields(
                            { name: 'Member', value: `${user} (${user.tag})`, inline: true },
                            { name: 'Role', value: `${role.name}`, inline: true },
                            { name: 'Dihapus Oleh', value: `${interaction.user.tag}`, inline: true }
                        ).setTimestamp();
                    await safeReply(interaction, { embeds: [embed], flags: 64 });
                    sendLog(interaction.guild, embed);
                } catch (error) {
                    await safeReply(interaction, { content: `❌ Terjadi error: ${error.message}`, flags: 64 });
                }
            }
        }

        // --- 2. BUTTON INTERACTIONS (Pola Defer + Edit) ---
        if (interaction.isButton()) {
            await interaction.deferReply({ flags: 64 }); // Mencegah error 40060

            let embed;
            let files = [];

            if (interaction.customId === 'pay_bank_info') {
                embed = new EmbedBuilder()
                    .setTitle('🏦 TRANSFER BANK')
                    .setColor(0x3498db)
                    .setDescription('Metode pembayaran melalui transfer bank ke rekening resmi kami.')
                    .addFields(
                        { name: '📋 LANGKAH-LANGKAH:', value: '1️⃣ Catat nomor rekening bank\n2️⃣ Buka aplikasi perbankan\n3️⃣ Pilih Transfer Antar Bank\n4️⃣ Masukkan nomor tujuan\n5️⃣ Masukkan nominal\n6️⃣ Konfirmasi transaksi\n7️⃣ Screenshot bukti\n8️⃣ Kirim bukti ke admin', inline: false },
                        { name: '💰 BANK BRI:', value: '```COMING SOON
```', inline: false },
                        { name: '💰 BANK MANDIRI:', value: '```COMING SOON```', inline: false }
                    )
                    .setFooter({ text: 'Community Store - Jika ada kendala, hubungi admin!' })
                    .setTimestamp();
            } 
            else if (interaction.customId === 'pay_gopay_info') {
                embed = new EmbedBuilder()
                    .setTitle('📱 E-WALLET (GoPay & Dana)')
                    .setColor(0x1abc9c)
                    .setDescription('Metode pembayaran cepat melalui aplikasi e-wallet.')
                    .addFields(
                        { name: '💳 GOPAY:', value: '```COMING SOON
```', inline: false },
                        { name: '💳 DANA:', value: '```COMING SOON```', inline: false }
                    )
                    .setFooter({ text: 'Merah Putih Roleplay x Ottibonynyo Mods!' })
                    .setTimestamp();
            } 
            else if (interaction.customId === 'pay_qris_info') {
                embed = new EmbedBuilder()
                    .setTitle('📲 PEMBAYARAN QRIS')
                    .setColor(0x9b59b6)
                    .setDescription('Metode pembayaran paling cepat & aman menggunakan QRIS.')
                    .setFooter({ text: 'Merah Putih Roleplay x Ottibonynyo Mods • Scan & Bayar dalam 30 detik!' })
                    .setTimestamp();

                const qrisFilePath = `./${CONFIG.QRIS_FILE_NAME}`;
                if (fs.existsSync(qrisFilePath)) {
                    files = [new AttachmentBuilder(fs.createReadStream(qrisFilePath))];
                }
            }

            await interaction.editReply({ embeds: [embed], files: files });
        }
    } catch (err) {
        console.error('Error di interactionCreate:', err);
    }
});

// --- EVENT: MESSAGE MONITORING (ANTI-BADWORD & AUTO RESPONSE) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // ⛔ SKIP JIKA USER PUNYA SALAH SATU ROLE ADMIN
    if (
        message.member &&
        CONFIG.ADMIN_ROLE_ID.some(roleID =>
            message.member.roles.cache.has(roleID)
        )
    ) {
        return;
    }
    // ✅ INI HARUS ADA SEBELUM DIPAKAI
    const foundBadWord = BADWORDS.find(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(message.content);
    });
    
    if (foundBadWord) {
        try {
            // hapus pesan pelanggar
            await message.delete();
    
            // kirim warning
            const warnMsg = await message.channel.send(
                `Hey <@${message.author.id}>, astagfirullah tidak boleh mengetik kata kata kasar yah sayang!`
            );
    
            // auto delete warning setelah 10 detik
            setTimeout(() => {
                warnMsg.delete().catch(() => {});
            }, 10_000);
    
            // auto timeout 30 menit
            if (message.member && message.guild) {
                const timeoutDuration = 30 * 60 * 1000; // 30 menit
    
                await message.member.timeout(
                    timeoutDuration,
                    `Badword detected: ${foundBadWord}`
                );
            }
    
        } catch (error) {
            console.error('[ERROR] Gagal memproses badword:', error);
        }
    
        return;
    }

});

client.login(CONFIG.TOKEN);
