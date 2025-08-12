import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("yogui")
  .setDescription("Replies with enamorado de faty!");

export async function execute(interaction: any) {
  await interaction.reply("enamorado de faty!");
}
