import dotenv from 'dotenv';

import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const APPLICATION_ID = process.env.APPLICATION_ID;


// Require the necessary discord.js classes
import { Client, Collection, Events, GatewayIntentBits, MessageFlags, REST, Routes  } from 'discord.js';


// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates // 🎯 Necesario para joinVoiceChannel
  ]
}) as Client & { commands: Collection<string, any> };

client.commands = new Collection();





//Commands handler

const foldersPath = new URL('commands', import.meta.url).pathname.slice(1);
const commandFolders = fs.readdirSync(foldersPath);




for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = await import(`file:///${filePath.replace(/\\/g, '/')}`);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}



// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});


client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(DISCORD_TOKEN as string);

// Register commands first
async function deployCommands() {
	try {
		console.log(`Started refreshing ${client.commands.size} application (/) commands.`);
		console.log('Commands to deploy:', client.commands);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands(APPLICATION_ID as string),
			{ body: Array.from(client.commands.values()).map(command => command.data.toJSON()) },
		);

		console.log(`Successfully reloaded application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error('Error deploying commands:', error);
	}
}

// Deploy commands and then login
await deployCommands();
await client.login(DISCORD_TOKEN);





