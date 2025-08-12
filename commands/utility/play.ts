import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior } from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import ytSearch from 'yt-search';

export const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce una canción de YouTube en tu canal de voz')
    .addStringOption(option =>
        option.setName('query')
            .setDescription('URL de YouTube o nombre de la canción')
            .setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
    const query = interaction.options.getString('query', true);

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

    let songUrl: string | undefined;

    if (ytdl.validateURL(query)) {
        songUrl = query;
    } else {
        const result = await ytSearch(query);
        if (result.videos.length === 0 || !result.videos[0]) {
            await interaction.editReply('❌ No encontré resultados para tu búsqueda.');
            return;
        }
        songUrl = result.videos[0].url;
        console.log(songUrl);
    }

    try {
        // --- Aquí empieza el bloque crítico que debes reemplazar ---
        const connection = joinVoiceChannel({
  channelId: voiceChannel.id,
  guildId: voiceChannel.guild.id,
  adapterCreator: voiceChannel.guild.voiceAdapterCreator,
});

connection.on('stateChange', (oldState, newState) => {
  console.log(`Conexión estado: ${oldState.status} => ${newState.status}`);
});

connection.on('error', error => {
  console.error('Error en conexión:', error);
});

const player = createAudioPlayer({
  behaviors: { noSubscriber: NoSubscriberBehavior.Play },
});

player.on('stateChange', (oldState, newState) => {
  console.log(`Player estado: ${oldState.status} => ${newState.status}`);
});

player.on('error', error => {
  console.error('Error en reproductor:', error);
});

// ¡Primero suscribe al player!
connection.subscribe(player);

// Luego crea y reproduce el recurso
const stream = ytdl(songUrl, {
  filter: 'audioonly',
  highWaterMark: 1 << 25,
  dlChunkSize: 0,
});

const resource = createAudioResource(stream);

player.play(resource);

        
        // --- Aquí termina el bloque crítico ---

        await interaction.editReply(`🎶 Reproduciendo: ${songUrl}`);
    } catch (error) {
        console.error(error);
        await interaction.editReply('❌ Ocurrió un error al intentar reproducir la canción.');
    }
}

