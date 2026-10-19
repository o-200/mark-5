import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { ExportLogsUseCase } from '@application/log-export/use-cases/ExportLogsUseCase.js';
import { ExportLogsInput } from '@application/log-export/dtos/ExportLogsDTO.js';
import { ISlashCommand } from '../contracts/ISlashCommand.js';

export class LogsCommand implements ISlashCommand {
  public readonly data = new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Export application and system logs (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('user-activity')
        .setDescription('Export user activity logs as streamed plain text')
        .addStringOption((opt) =>
          opt
            .setName('user_id')
            .setDescription('Filter by user UUID')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('email')
            .setDescription('Filter by user email address')
            .setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('limit')
            .setDescription('Limit number of records (1-10000, default: 1000)')
            .setMinValue(1)
            .setMaxValue(10000)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('loader')
        .setDescription('Export log loader entries as streamed plain text')
        .addStringOption((opt) =>
          opt
            .setName('user_id')
            .setDescription('Filter by user UUID')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('email')
            .setDescription('Filter by user email address')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('loader_id')
            .setDescription('Filter by loader UUID')
            .setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('limit')
            .setDescription('Limit number of records (1-10000, default: 1000)')
            .setMinValue(1)
            .setMaxValue(10000)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('product')
        .setDescription('Export log product entries as streamed plain text')
        .addStringOption((opt) =>
          opt
            .setName('user_id')
            .setDescription('Filter by user UUID')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('email')
            .setDescription('Filter by user email address')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('product_id')
            .setDescription('Filter by product UUID')
            .setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('limit')
            .setDescription('Limit number of records (1-10000, default: 1000)')
            .setMinValue(1)
            .setMaxValue(10000)
            .setRequired(false)
        )
    );

  constructor(
    private readonly exportLogsUseCase: ExportLogsUseCase,
    private readonly adminIds: string[]
  ) {}

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const callerId = interaction.user.id.trim();

    // 1. Authorization Gate: Check if user is registered in DISCORD_ADMIN_IDS
    if (!this.adminIds.some((adminId) => adminId.trim() === callerId)) {
      const deniedEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('⛔ Access Denied')
        .setDescription('You do not have permission to execute this administrative command.')
        .setFooter({ text: 'Administrative access required' })
        .setTimestamp();

      await interaction.reply({ embeds: [deniedEmbed], ephemeral: true });
      return;
    }

    // 2. Defer reply publicly so exported logs are visible to everyone in the channel
    await interaction.deferReply();

    // 3. Parse subcommand and input options
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.options.getString('user_id') ?? undefined;
    const email = interaction.options.getString('email') ?? undefined;
    const limit = interaction.options.getInteger('limit') ?? undefined;

    let input: ExportLogsInput;

    if (subcommand === 'user-activity') {
      input = { type: 'user_activity', userId, email, limit };
    } else if (subcommand === 'loader') {
      const loaderId = interaction.options.getString('loader_id') ?? undefined;
      input = { type: 'loader', userId, email, loaderId, limit };
    } else if (subcommand === 'product') {
      const productId = interaction.options.getString('product_id') ?? undefined;
      input = { type: 'product', userId, email, productId, limit };
    } else {
      await interaction.editReply({ content: `Unknown subcommand: ${subcommand}` });
      return;
    }

    // 4. Execute application use case
    const result = await this.exportLogsUseCase.execute(input);

    if (result.isFailure) {
      const error = result.getError();
      const errorEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('❌ Log Export Failed')
        .setDescription(error.message)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    const data = result.getValue();

    // 5. Build Discord plain text file attachment
    const attachment = new AttachmentBuilder(Buffer.from(data.content, 'utf-8'), {
      name: data.filename,
      description: `${data.type} export`,
    });

    const formattedSize =
      data.sizeBytes < 1024
        ? `${data.sizeBytes} B`
        : `${(data.sizeBytes / 1024).toFixed(2)} KB`;

    const filterEntries = Object.entries(data.filters)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `• **${key}**: \`${value}\``);

    const filterText = filterEntries.length > 0 ? filterEntries.join('\n') : '*None*';

    const successEmbed = new EmbedBuilder()
      .setColor(0x57f287) // Discord green
      .setTitle(`📥 Log Export: ${subcommand}`)
      .setDescription('Successfully exported logs from backend service.')
      .addFields(
        { name: 'Filename', value: `\`${data.filename}\``, inline: true },
        { name: 'Records Exported', value: `\`${data.lineCount}\``, inline: true },
        { name: 'Payload Size', value: `\`${formattedSize}\``, inline: true },
        { name: 'Applied Filters', value: filterText, inline: false }
      )
      .setFooter({ text: 'Confidential • Administrator Log Export' })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed], files: [attachment] });
  }
}
