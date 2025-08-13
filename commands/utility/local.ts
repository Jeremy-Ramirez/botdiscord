import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior } from '@discordjs/voice';
import path from 'node:path';
import fs from 'node:fs';

export const data = new SlashCommandBuilder()
  .setName('localplay')
  .setDescription('Reproduce una canción local en tu canal de voz');

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

    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });

    const filePath = path.join(process.cwd(), 'musica.mp3');

    if (!fs.existsSync(filePath)) {
      await interaction.editReply(`❌ Archivo no encontrado: ${filePath}`);
      return;
    }

    const resource = createAudioResource(filePath); // 🎯 Sin ffmpeg

    player.play(resource);
    connection.subscribe(player);

    player.on('stateChange', (oldState, newState) => {
      console.log(`🎵 Player state: ${oldState.status} => ${newState.status}`);
    });

    player.on('error', error => {
      console.error('❌ Error en el reproductor:', error);
    });

    await interaction.editReply('🎶 Reproduciendo canción local.');
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Ocurrió un error al reproducir la canción local.');
  }
}
