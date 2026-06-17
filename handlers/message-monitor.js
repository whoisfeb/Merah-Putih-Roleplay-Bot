const BADWORDS = [
    'free', 'tolol', 'goblok', 'bego', 'pepek', 'dongo', 'tai', 'kontol', 
    'bio', 'sexcam', 'entot', 'ngentot', 'join', 'invite', 'anjing', 
    'babi', 'memek', 'ngewe', 'ewe', 'lonte', 'pler', 'bgst', 'bangsat'
];

module.exports = async (message, CONFIG) => {
    if (message.author.bot) return;

    // ⛔ SKIP JIKA USER PUNYA ROLE ADMIN
    if (
        message.member &&
        CONFIG.ADMIN_ROLE_ID.some(roleID =>
            message.member.roles.cache.has(roleID)
        )
    ) {
        return;
    }

    const foundBadWord = BADWORDS.find(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(message.content);
    });
    
    if (foundBadWord) {
        try {
            await message.delete();
            return message.channel.send(`Hey ${message.author}, astagfirullah tidak boleh mengetik kata kata kasar yah sayang!`);
        } catch (error) {
            console.error('[ERROR] Gagal menghapus pesan kasar:', error);
        }
        return; 
    }
};
