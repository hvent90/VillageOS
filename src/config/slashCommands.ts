import { SlashCommandBuilder } from 'discord.js';

export const slashCommands = [
  new SlashCommandBuilder()
    .setName('village')
    .setDescription('🌾 Manage your collaborative farming village')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('🏘️ Create a new village')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Choose a unique name for your village')
            .setRequired(true)
            .setMinLength(2)
            .setMaxLength(50)
        )
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Optional: Describe your village\'s appearance and atmosphere')
            .setRequired(false)
            .setMinLength(10)
            .setMaxLength(200)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('show')
        .setDescription('📊 Display village status')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('plant')
        .setDescription('🌱 Plant crops in your village')
        .addStringOption(option =>
          option.setName('crop')
            .setDescription('What do you want to plant? (e.g., "tomatoes", "wheat", "magical sunflowers")')
            .setRequired(true)
            .setMinLength(2)
            .setMaxLength(50)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('water')
        .setDescription('💧 Water plants in your village')
        .addIntegerOption(option =>
          option.setName('x')
            .setDescription('X coordinate')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(9)
        )
        .addIntegerOption(option =>
          option.setName('y')
            .setDescription('Y coordinate')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(9)
        )
    )
     .addSubcommand(subcommand =>
       subcommand
         .setName('build')
         .setDescription('🏗️ Build structures in your village')
         .addIntegerOption(option =>
           option.setName('x')
             .setDescription('X coordinate')
             .setRequired(true)
             .setMinValue(0)
             .setMaxValue(9)
         )
         .addIntegerOption(option =>
           option.setName('y')
             .setDescription('Y coordinate')
             .setRequired(true)
             .setMinValue(0)
             .setMaxValue(9)
         )
     )
      .addSubcommand(subcommand =>
        subcommand
          .setName('me')
          .setDescription('🎨 Customize your character appearance')
          .addStringOption(option =>
            option.setName('description')
              .setDescription('Describe how you want to look (e.g., "red hair, blue eyes, farmer outfit")')
              .setRequired(true)
              .setMinLength(10)
              .setMaxLength(200)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('delete')
          .setDescription('🗑️ Delete village')
      )
];