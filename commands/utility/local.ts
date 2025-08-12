import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior, StreamType } from '@discordjs/voice';
import { spawn } from 'child_process';
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

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });

    connection.subscribe(player);

    const filePath = path.join(process.cwd(), 'musica.mp3');

    if (!fs.existsSync(filePath)) {
      await interaction.editReply(`❌ Archivo no encontrado: ${filePath}`);
      return;
    }

    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', filePath,
      '-f', 'opus',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1',
    ]);

    ffmpeg.on('error', error => {
      console.error('Error con FFmpeg:', error);
    });

    ffmpeg.on('close', (code, signal) => {
      console.log(`FFmpeg cerró con código ${code} y señal ${signal}`);
    });

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Opus,
    });

    player.play(resource);

    player.on('stateChange', (oldState, newState) => {
      console.log(`Player state: ${oldState.status} => ${newState.status}`);
    });

    player.on('error', error => {
      console.error('Player error:', error);
    });

    await interaction.editReply('🎶 Reproduciendo canción local (FFmpeg Opus).');
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Ocurrió un error al reproducir la canción local.');
  }
}
