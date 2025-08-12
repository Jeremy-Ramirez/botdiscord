import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior, StreamType } from '@discordjs/voice';
import fs from 'node:fs';
import path from 'node:path';

export const data = new SlashCommandBuilder()
  .setName('playopus')
  .setDescription('Reproduce un archivo .opus local en tu canal de voz');

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member;
  if (!member || !('voice' in member)) {
    await interaction.reply({ content: '❌ Debes estar en un canal de voz para usar este comando.', ephemeral: true });
    return;
  }

  const voiceChannel = (member as import('discord.js').GuildMember).voice.channel;
  if (!voiceChannel) {
    await interaction.reply({ content: '❌ Debes estar en un canal de voz para usar este comando.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play }, // En lugar de Pause
    });

    connection.subscribe(player);

    const filePath = path.join(process.cwd(), 'output.opus');

    if (!fs.existsSync(filePath)) {
      await interaction.editReply(`❌ Archivo no encontrado: ${filePath}`);
      return;
    }

    const stream = fs.createReadStream(filePath);
    const resource = createAudioResource(stream, { inputType: StreamType.Opus });

    player.play(resource);

    player.on('stateChange', (oldState, newState) => {
      console.log(`Player state: ${oldState.status} => ${newState.status}`);
    });

    player.on('error', error => {
      console.error('Player error:', error);
    });

    await interaction.editReply('🎶 Reproduciendo archivo output.opus');
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Ocurrió un error al reproducir el archivo .opus.');
  }
}
