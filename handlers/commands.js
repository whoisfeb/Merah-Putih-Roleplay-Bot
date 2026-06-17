// handlers/commands.js
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const LOG_CHANNEL_ID = '1392382458615435266';

function sendLog(guild, embed) {
    if (!guild) return;
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
        logChannel.send({ embeds: [embed] }).catch(err => 
            console.error('❌ Gagal mengirim log:', err)
        );
    }
}

async function setupCommandsHandler(client) {
    
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const { commandName } = interaction;

        // ✅ Handle hanya /addrole dan /removerole
        // Command lain akan dihandle di handler lain (tiket, dll)

        if (commandName === 'addrole') {
            try {
                await interaction.deferReply({ flags: 64 });

                const user = interaction.options.getUser('user');
                const role = interaction.options.getRole('role');
                const member = await interaction.guild.members.fetch(user.id);

                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    return await interaction.editReply({
                        content: '❌ Anda tidak memiliki izin ManageRoles!'
                    });
                }

                if (member.roles.cache.has(role.id)) {
                    return await interaction.editReply({
                        content: `❌ ${user.tag} sudah memiliki role ${role.name}!`
                    });
                }

                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    return await interaction.editReply({
                        content: `❌ Role ${role.name} lebih tinggi atau sama dengan role bot saya!`
                    });
                }

                await member.roles.add(role);
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Role Ditambahkan')
                    .setColor('#2ecc71')
                    .setDescription(`Role berhasil diberikan kepada member`)
                    .addFields(
                        { name: 'Member', value: `${user} (${user.tag})`, inline: true },
                        { name: 'Role', value: `${role.name}`, inline: true },
                        { name: 'Diberikan Oleh', value: `${interaction.user.tag}`, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                sendLog(interaction.guild, embed);

            } catch (error) {
                console.error('addrole error:', error);
                try {
                    await interaction.editReply({
                        content: `❌ Terjadi error: ${error.message}`
                    });
                } catch (e) {
                    console.error('Edit reply failed:', e);
                }
            }
            return; // ✅ PENTING: Return agar tidak diteruskan ke handler lain
        }

        if (commandName === 'removerole') {
            try {
                await interaction.deferReply({ flags: 64 });

                const user = interaction.options.getUser('user');
                const role = interaction.options.getRole('role');
                const member = await interaction.guild.members.fetch(user.id);

                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    return await interaction.editReply({
                        content: '❌ Anda tidak memiliki izin ManageRoles!'
                    });
                }

                if (!member.roles.cache.has(role.id)) {
                    return await interaction.editReply({
                        content: `❌ ${user.tag} tidak memiliki role ${role.name}!`
                    });
                }

                await member.roles.remove(role);
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Role Dihapus')
                    .setColor('#e74c3c')
                    .setDescription(`Role berhasil dihapus dari member`)
                    .addFields(
                        { name: 'Member', value: `${user} (${user.tag})`, inline: true },
                        { name: 'Role', value: `${role.name}`, inline: true },
                        { name: 'Dihapus Oleh', value: `${interaction.user.tag}`, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                sendLog(interaction.guild, embed);

            } catch (error) {
                console.error('removerole error:', error);
                try {
                    await interaction.editReply({
                        content: `❌ Terjadi error: ${error.message}`
                    });
                } catch (e) {
                    console.error('Edit reply failed:', e);
                }
            }
            return; // ✅ PENTING: Return agar tidak diteruskan ke handler lain
        }

        // ✅ Jangan handle command lain di sini, biarkan handler lain yang tangani
    });

    console.log('✅ Commands Handler berhasil dimuat!');
}

module.exports = { setupCommandsHandler };