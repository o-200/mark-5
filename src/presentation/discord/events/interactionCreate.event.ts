import { Client, Events } from 'discord.js';
import { InteractionPipeline } from '../pipeline/InteractionPipeline.js';

export function registerInteractionCreateEvent(
  client: Client,
  pipeline: InteractionPipeline
): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    await pipeline.dispatch(interaction);
  });
}
