import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { ISlashCommand } from '../contracts/ISlashCommand.js';

export class PingCommand implements ISlashCommand {
  public readonly data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Checks the bot responsiveness, WebSocket latency, and system status')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sent = await interaction.deferReply({ fetchReply: true });
    const roundTripLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;

    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const formattedUptime = `${hours}h ${minutes}m ${seconds}s`;

    const embed = new EmbedBuilder()
      .setColor(0x57f287) // Discord green
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Round-trip Latency', value: `\`${roundTripLatency}ms\``, inline: true },
        { name: 'WebSocket Heartbeat', value: `\`${wsPing}ms\``, inline: true },
        { name: 'Uptime', value: `\`${formattedUptime}\``, inline: true },
        { name: 'Node.js', value: `\`${process.version}\``, inline: true }
      )
      .setFooter({ text: 'Mark-5 Discord Bot' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
