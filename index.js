//YEAH IK THE CODE IS WRITTEN BY CHAT GPT, I ONLY KNOW LUA, C# AND PYTHON SORRYYY
const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    PermissionsBitField,
    ChannelType,
    EmbedBuilder
} = require('discord.js');
const http = require('http');

// ================= CLIENT =================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================= CONFIG =================
const ALLOWED_GUILDS = ['1446462557832347674']; // INSERT YOUR SERVER ID
const TICKET_CATEGORY_ID = '1471213191991267550'; // Category ID
const STAFF_ROLES = ['1447187404032315392', '1471213896206385191']; // Staff role IDs
const COOLDOWN_MINUTES = 5;

client.ticketCooldown = new Map();

// ================= READY EVENT =================
client.once('clientReady', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    client.user.setPresence({
        activities: [{ name: 'Cat music lowkey tuff', type: 2 }],
        status: 'online'
    });
});

// ================= MESSAGE COMMAND =================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!ALLOWED_GUILDS.includes(message.guildId)) return;

    if (message.content === '!ticket') {
        const embed = new EmbedBuilder()
            .setTitle('🎟️ Support Center')
            .setDescription('Choose an option below to open a private ticket.')
            .setColor(0x00BFFF)
            .setTimestamp();

        const generalButton = new ButtonBuilder()
            .setCustomId('ticket_general')
            .setLabel('General Support')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💬');

        const otherButton = new ButtonBuilder()
            .setCustomId('ticket_other')
            .setLabel('Other Issue')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📩');

        const staffButton = new ButtonBuilder()
            .setCustomId('ticket_staff')
            .setLabel('Apply for Staff')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⭐');

        const row = new ActionRowBuilder().addComponents(
            generalButton,
            otherButton,
            staffButton
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (!ALLOWED_GUILDS.includes(interaction.guildId)) return;

    // ================= CLOSE TICKET =================
    if (interaction.customId === 'ticket_close') {
        try {
            await interaction.reply({
                content: '⏳ This ticket will close in 1 minute.',
                flags: 64
            });

            setTimeout(async () => {
                try {
                    const channel = await interaction.guild.channels.fetch(interaction.channelId);
                    if (channel) await channel.delete().catch(() => {});
                } catch {
                    console.log('Channel already deleted or not found.');
                }
            }, 60000);
        } catch {
            console.log('Interaction already replied or failed.');
        }
        return;
    }

    // ================= OPEN TICKET =================
    const ticketTypes = {
        ticket_general: 'general',
        ticket_other: 'other',
        ticket_staff: 'staff-application'
    };

    const type = ticketTypes[interaction.customId];
    if (!type) return;

    try {
        await interaction.reply({ content: 'Creating your ticket...', flags: 64 });
    } catch {}

    const channelName = `${type}-${interaction.user.id}`;

    // -------- ANTI DUPLICATE --------
    let existingChannel;
    try {
        existingChannel = await interaction.guild.channels.fetch();
        existingChannel = interaction.guild.channels.cache.find(c => c.name === channelName);
    } catch {}

    if (existingChannel) {
        return interaction.editReply({
            content: `⚠️ You already have an open ${type} ticket: ${existingChannel}`
        }).catch(() => {});
    }

    // -------- COOLDOWN --------
    const cooldownKey = `${interaction.user.id}-${type}`;
    const lastOpened = client.ticketCooldown.get(cooldownKey);

    if (lastOpened) {
        const diff = (Date.now() - lastOpened) / 1000 / 60;
        if (diff < COOLDOWN_MINUTES) {
            return interaction.editReply({
                content: `⏳ You must wait ${Math.ceil(COOLDOWN_MINUTES - diff)} more minute(s) before opening another ${type} ticket.`
            }).catch(() => {});
        }
    }
    client.ticketCooldown.set(cooldownKey, Date.now());

    // -------- CREATE CHANNEL --------
    const permissionOverwrites = [
        { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ...STAFF_ROLES.map(roleId => ({
            id: roleId,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }))
    ];

    let channel;
    try {
        channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites
        });
    } catch (err) {
        console.log('Failed to create channel:', err);
        return interaction.editReply({ content: '❌ Failed to create ticket.' }).catch(() => {});
    }

    const embed = new EmbedBuilder()
        .setTitle(`📩 ${type.toUpperCase()} TICKET`)
        .setDescription(`Hello <@${interaction.user.id}> 👋\nPlease describe your request clearly.\nPress 🔒 when done.`)
        .setColor(0x00BFFF)
        .setTimestamp();

    const closeButton = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

    const row = new ActionRowBuilder().addComponents(closeButton);

    await channel.send({ embeds: [embed], components: [row] }).catch(() => {});

    await interaction.editReply({
        content: `✅ Your ticket has been created: ${channel}`
    }).catch(() => {});
});

// ================= LOGIN =================
client.login(process.env.TOKEN);

// ================= RENDER FREE WEB SERVICE FIX =================
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running.');
}).listen(process.env.PORT || 3000);
