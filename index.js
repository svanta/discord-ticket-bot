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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================= CONFIG =================
const TICKET_CATEGORY_ID = '1471213191991267550';
const STAFF_ROLES = ['1447187404032315392', '1471213896206385191'];
// ==========================================

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!ticket') {

        const embed = new EmbedBuilder()
            .setTitle('🎟️ Support Center')
            .setDescription('Click a button below to open a private support ticket.')
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

        const row = new ActionRowBuilder().addComponents(generalButton, otherButton);

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    // ================= OPEN TICKET =================
    if (interaction.customId === 'ticket_general' || interaction.customId === 'ticket_other') {

        await interaction.deferReply({ ephemeral: true });

        const ticketType = interaction.customId === 'ticket_general'
            ? 'General Support'
            : 'Other Issue';

        const guild = interaction.guild;
        const channelName = `ticket-${interaction.user.id}`;

        const existing = guild.channels.cache.find(c => c.name === channelName);

        if (existing) {
            return interaction.editReply({
                content: `⚠️ You already have an open ticket: ${existing}`
            });
        }

        const permissionOverwrites = [
            {
                id: guild.roles.everyone,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: interaction.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages
                ]
            },
            ...STAFF_ROLES.map(roleId => ({
                id: roleId,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages
                ]
            }))
        ];

        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites
        });

        const embed = new EmbedBuilder()
            .setTitle(`📨 ${ticketType}`)
            .setDescription(
                `Welcome <@${interaction.user.id}> 👋\n\n` +
                `Describe your issue clearly.\n\n` +
                `Press 🔒 when finished.`
            )
            .setColor(0x00BFFF)
            .setTimestamp();

        const closeButton = new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒');

        const row = new ActionRowBuilder().addComponents(closeButton);

        await ticketChannel.send({
            embeds: [embed],
            components: [row]
        });

        return interaction.editReply({
            content: `✅ Ticket created: ${ticketChannel}`
        });
    }

    // ================= CLOSE TICKET =================
    if (interaction.customId === 'ticket_close') {

        await interaction.deferReply({ ephemeral: true });

        let timeLeft = 600;

        const countdownEmbed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closing')
            .setDescription(`Closing in **10:00**`)
            .setColor(0xFF0000);

        const timerMessage = await interaction.channel.send({ embeds: [countdownEmbed] });

        const interval = setInterval(async () => {

            timeLeft--;

            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            countdownEmbed.setDescription(`Closing in **${formatted}**`);
            await timerMessage.edit({ embeds: [countdownEmbed] });

            if (timeLeft <= 0) {
                clearInterval(interval);
                await interaction.channel.delete().catch(() => {});
            }

        }, 1000);

        return interaction.editReply({
            content: '⏳ Closing timer started (10 minutes).'
        });
    }
});

client.login(process.env.TOKEN);