const fs = require('fs');
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActivityType, 
    REST, 
    Routes,
    Partials
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions // Tambahkan ini agar bot bisa membaca klik reaksi emoji
    ],
    partials: [
        Partials.Message, 
        Partials.Channel, 
        Partials.Reaction, 
        Partials.GuildMember, 
        Partials.User
    ]
});


// Import Handlers
const antiLinkHandler = require('./handlers/anti-link');
const messageMonitorHandler = require('./handlers/message-monitor');
const ticketHandler = require('./handlers/tiket');
const unbanHandler = require('./handlers/tiket-unban');
const paymentHandler = require('./handlers/payment');
const reportStaffHandler = require('./handlers/report-staff');
// Tambahkan ini di bagian bawah daftar require handler kamu
const timeReactionRoleHandler = require('./handlers/time-reaction-role.js');

const { setupLogsHandler } = require('./handlers/logs-discord');
const { setupWelcomerHandler } = require('./handlers/welcomer');
const { setupCommandsHandler } = require('./handlers/commands');
const { setupAutoKarantinaHandler } = require('./handlers/auto-karantina');
const { handleSendMessage } = require('./handlers/control.js');
// Ganti baris impor giveaway Anda di bagian atas index.js menjadi seperti ini:
const { handleGiveawayStart, handleGiveawayEnd } = require('./handlers/giveaway.js');



// --- CONFIG ---
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

// --- REGISTER COMMANDS ---
const commands = [

    {
        name: 'giveaway-start',
        description: 'Memulai giveaway baru berdasarkan target jam',
        options: [
            { name: 'hadiah', type: 3, description: 'Hadiah yang akan diberikan', required: true },
            { name: 'pemenang', type: 4, description: 'Jumlah pemenang yang diundi', required: true },
            { name: 'waktu', type: 3, description: 'Format jam: 21:00 atau format tanggal: 2026-07-03 21:00', required: true },
            { name: 'hari_ke', type: 4, description: '0 = Hari ini, 1 = Besok, 3 = Tiga hari lagi (Bawaan: 0 / Hari ini)', required: false }
        ],
    },
    {
        name: 'giveaway-end',
        description: 'Mengakhiri dan mengundi giveaway secara manual',
        options: [
            { name: 'message_id', type: 3, description: 'Masukkan ID Pesan giveaway yang ingin diundi', required: true }
        ],
    },
    { name: 'payment', description: 'Menampilkan informasi metode pembayaran resmi store' },
    { name: 'open-admin', description: 'Memunculkan tombol pendaftaran admin' },
    {
        name: 'addrole',
        description: 'Memberikan role kepada seorang member',
        options: [
            { name: 'user', type: 6, description: 'Member yang akan diberi role', required: true },
            { name: 'role', type: 9, description: 'Role yang akan diberikan', required: true },
        ],
    },
    {
        name: 'removerole',
        description: 'Menghapus role dari seorang member',
        options: [
            { name: 'user', type: 6, description: 'Member yang akan dihapus rolenya', required: true },
            { name: 'role', type: 9, description: 'Role yang akan dihapus', required: true },
        ],
    },
    {
        name: 'addticket',
        description: 'Menambahkan pengguna ke dalam tiket unban ini',
        options: [{ name: 'target', type: 6, description: 'Pengguna yang ingin dimasukkan ke tiket', required: true }],
    },
        {
        name: 'claimtopup',
        description: 'Claim tiket topup dengan alasan',
        options: [
            { 
                name: 'reason', 
                type: 3, // String
                description: 'Alasan claim', 
                required: true 
            },
            // ➕ TAMBAHKAN OBJEK BARU DI BAWAH INI:
            { 
                name: 'bukti', 
                type: 11, // 11 adalah tipe data untuk ATTACHMENT/FILE
                description: 'Lampirkan bukti gambar atau file (Bisa Ctrl + V)', 
                required: false // Dibuat false agar opsional
            }
        ]
    },

    {
        name: 'closetopup',
        description: 'Tutup tiket topup dengan alasan',
        options: [{ name: 'reason', type: 3, description: 'Alasan penutupan', required: true }]
    },
    {
        name: 'sendtopup',
        description: 'Kirim kode topup ke user (admin saja)',
        options: [
            { name: 'user', type: 6, description: 'Penerima (user)', required: true },
            { name: 'code', type: 3, description: 'Kode topup (contoh: MPRP-65A5-U8ZG)', required: true },
            { name: 'note', type: 3, description: 'Catatan/validitas (opsional)', required: false },
        ],
    },
    {
        name: 'send-message',
        description: 'Mengirim pesan teks, gambar, atau file ke channel atau user tertentu',
        options: [
            // Konten Pesan
            { name: 'teks', type: 3, description: 'Tulis isi teks pesan yang ingin dikirim', required: false },
            { name: 'file', type: 11, description: 'Unggah gambar, video, atau dokumen file', required: false },
            
            // Target Tujuan (Opsional di form, namun wajib diisi salah satu saat dijalankan)
            { name: 'channel', type: 7, description: 'Pilih text channel target tujuan kirim', channel_types: [0, 5], required: false },
            { name: 'user', type: 6, description: 'Pilih akun user target tujuan kirim via DM', required: false },
        ],
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

client.once('ready', async () => {
    console.log(`[LOG] Berhasil masuk sebagai ${client.user.tag}`);
    await registerCommands();

    client.user.setPresence({
        activities: [{ name: 'Ottibonynyo Mods', type: ActivityType.Playing }],
        status: 'online',
    });
    console.log('[LOG] Status bot telah diubah menjadi ONLINE');

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
        logChannel.send({ embeds: [onlineEmbed] });
    }

    // ==========================================
    // SETUP ALL HANDLERS
    // ==========================================
    setupCommandsHandler(client);
    setupLogsHandler(client);    
    setupWelcomerHandler(client);
    ticketHandler(client);
    unbanHandler(client);
    setupAutoKarantinaHandler(client);
    reportStaffHandler(client);
    timeReactionRoleHandler(client); 

    setInterval(() => {
        const announceChannel = client.channels.cache.get(CONFIG.ANNOUNCE_CHANNEL);
        if (announceChannel) {
            const text = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
            announceChannel.send(`${text}`);
        }
    }, 3600000);
});

// ==========================================
// EVENT LISTENERS
// ==========================================

client.on('messageCreate', async (message) => {
    await antiLinkHandler(message, CONFIG);
    await messageMonitorHandler(message, CONFIG);

});

// PAYMENT INTERACTION - HANDLE FIRST, IMMEDIATELY
client.on('interactionCreate', async (interaction) => {
    // 1. Jalankan handler payment SEGERA

    if (interaction.isChatInputCommand() && interaction.commandName === 'giveaway-start') {
        try {
            await handleGiveawayStart(interaction);
        } catch (err) {
            console.error('[GIVEAWAY START ERROR]', err);
        }
        return;
    }

    // 4. LOGIKA UNTUK END/UNDI GIVEAWAY
    if (interaction.isChatInputCommand() && interaction.commandName === 'giveaway-end') {
        try {
            await handleGiveawayEnd(interaction);
        } catch (err) {
            console.error('[GIVEAWAY END ERROR]', err);
        }
        return;
    }
    if ((interaction.isChatInputCommand() && interaction.commandName === 'payment') ||
        (interaction.isButton() && ['pay_bank_info', 'pay_gopay_info', 'pay_qris_info'].includes(interaction.customId))) {
        try {
            await paymentHandler(interaction, CONFIG);
        } catch (err) {
            console.error('[PAYMENT INTERACTION ERROR]', err);
        }
        return;
    }

    // 2. TAMBAHKAN LOGIKA UNTUK SEND MESSAGE DISINI
    if (interaction.isChatInputCommand() && interaction.commandName === 'send-message') {
        try {
            await handleSendMessage(interaction);
        } catch (err) {
            console.error('[SEND MESSAGE ERROR]', err);
        }
        return; // Hentikan eksekusi setelah selesai
    }
});

client.login(CONFIG.TOKEN);
