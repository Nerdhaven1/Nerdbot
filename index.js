const {
  Client,
  IntentsBitField,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
} = require('discord.js');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const abilityData = require('./abilities.json');
const characterData = require('./characters.json');
const itemData = require('./items.json');

// Bot token
const mySecret = process.env['TOKEN'];

// Event: Bot Ready
client.on('ready', () => {
  console.log(`${client.user.tag} is online.`);
  client.user.setActivity('for inquiries.', { type: 'LISTENING' });
  registerSlashCommands();
});

  const fs = require('fs');

  // Event: Interaction (Slash Command)
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = interaction.commandName;
    const options = interaction.options || []; // Check if options exist and use an empty array if not

    // Log the command details
    const logMessage = `Command received: ${command}\nParameters: ${JSON.stringify(options)}\nSource: ${interaction.inGuild() ? 'Guild' : 'DM'}\nUser: ${interaction.user.tag}\n\n`;

    // Save the log to a file
    fs.appendFile('command_logs.txt', logMessage, (err) => {
      if (err) {
        console.error('Error saving command log:', err);
      }
    });

  // Command: Ability Lookup
  if (command === 'ability') {
    const abilityName = interaction.options.getString('ability_name');

    if (!abilityName) {
      await interaction.reply({ content: 'Please provide an ability name.', ephemeral: true });
      return;
    }

    const matchingAbilities = Object.entries(abilityData).filter(
      ([_, abilities]) =>
        abilities.some((ability) => ability.name.toLowerCase() === abilityName.toLowerCase())
    );

    if (matchingAbilities.length === 0) {
      await interaction.reply({
        content: `Sorry, I couldn't find an ability named **${abilityName}**`,
        ephemeral: true,
      });
    } else if (matchingAbilities.length === 1 && matchingAbilities[0][1].length === 1) {
      const [_, abilities] = matchingAbilities[0];

      const replyMessage = abilities
        .map((ability) => {
          let message = ``;

          if (ability.locked === '') {
            message += `**Ability Name:** ${ability.name}\n**Class:** ${ability.character} ${ability.emoji}\n`;
          }
          
          if (ability.locked !== '') {
            message += `**SPOILER:** ${ability.emoji}\n||**Ability Name:** ${ability.name}\n**Class:** ${ability.character}\n`;
          }

          message += `${ability.imageURL}`;

          if (ability.locked !== '') {
            message += ` ||`;
          }

        message += `\n*Support this bot: <:nerdhaven:973228882805268571> <https://www.buymeacoffee.com/nerdhaven>*`;
          
          return message;
        })
        .join('\n');

      await interaction.reply(replyMessage);
    } else {

      const replyMessage = `Multiple classes have an ability named **${abilityName}**. Select the class button for the version you want to see.`;

      const buttons = matchingAbilities.flatMap(([_, abilities]) => {
        return abilities.map((ability, index) => {
          const button = new ButtonBuilder()
            .setEmoji(ability.emoji)
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`class-${index + 1}-button`);
    
          return button;
        });
      });
    
      const buttonRow = new ActionRowBuilder().addComponents(...buttons);

      const reply = await interaction.reply({
        content: replyMessage,
        // ephemeral: true, // only the user who submitted the slash command will see this
        components: [buttonRow],
      });

      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 20000, // 20 seconds
      });

      collector.on('collect', (buttonInteraction) => {
        const buttonIndex = parseInt(buttonInteraction.customId.split('-')[1]) - 1;
        const matchingAbility = matchingAbilities[Math.floor(buttonIndex / matchingAbilities[0][1].length)];
        const abilities = matchingAbility[1];
        const ability = abilities[buttonIndex % matchingAbilities[0][1].length];
        
        let replyMessage = `**Ability Name:** ${ability.name}\n**Class:** ${ability.character} ${ability.emoji}\n${ability.imageURL}\n*Support this bot: <:nerdhaven:973228882805268571> <https://www.buymeacoffee.com/nerdhaven>*`;
        
        if (ability.locked === 'yes') {
          replyMessage = `||${replyMessage}||`;
        }
        
        buttonInteraction.reply(replyMessage);
      });

      collector.on('end', () => {
        buttons.forEach((button) => {
          button.setDisabled(true);
        });

        reply.edit({
          components: [buttonRow]
        });
      });
    }
  }
  
  // Command: Ability Search
  else if (command === 'abilitysearch') {
    const characterName = interaction.options.getString('class_name');
    const level = interaction.options.getString('ability_level');

    if (!characterName || !level) {
      await interaction.reply({ content: 'Please provide a character name and level.', ephemeral: true });
      return;
    }

    const matchingAbilities = Object.values(abilityData)
      .flat()
      .filter(
        (ability) =>
          ability.character.toLowerCase() === characterName.toLowerCase() &&
          ability.level === level
      );

    if (matchingAbilities.length === 0) {
      await interaction.reply({
        content: `Sorry, I couldn't find any abilities for ${characterName} at level ${level}.`,
        ephemeral: true,
      });
    } else {
      const replyMessage = matchingAbilities
        .map((ability) => {
          let message = ``;

          message += `${ability.locked !== '' ? '||' : ''}${ability.imageURL}${ability.locked !== '' ? '||' : ''}`;

          return message;
        })
        .join('\n');
      await interaction.reply(replyMessage);
    }
  }
    
  // Command: Class Info Lookup
  else if (command === 'classinfo') {
    const characterName = interaction.options.getString('class_name');

    if (!characterName) {
      await interaction.reply({ content: 'Please provide a class name.', ephemeral: true });
      return;
    }

    const matchingCharacters = Object.values(characterData)
      .flat()
      .filter((character) => character.character.toLowerCase() === characterName.toLowerCase());

    if (matchingCharacters.length === 0) {
      await interaction.reply({
        content: `Sorry, I couldn't find a class named **${characterName}**.`,
        ephemeral: true,
      });
    } else {
      const replyMessages = matchingCharacters.map((character) => {
        let message = '';

        if (character.locked === '') {
          message += `**Class Name:** ${character.ancestry} ${character.characterName} ${character.emoji}\n**Expansion:** ${character.expansion}\n**Designer:** ${character.creator}\n**Mat Front:** ${character.frontURL}\n**Mat Back:** ${character.backURL}\n**Cards:** ${character.deckURL}`;

          if (character.extraURL !== '') {
            message += `\n${character.extraURL}`;
          }
        }

        if (character.locked !== '') {
          message += `**Class Name:** ${character.characterName} ${character.emoji}\n**Expansion:** ${character.expansion}\n||**Locked Class Name:** ${character.ancestry} ${character.character}\n**Designer:** ${character.creator}\n**Mat Front:** ${character.frontURL}\n**Mat Back:** ${character.backURL}\n**Cards:** ${character.deckURL}`;

          if (character.extraURL !== '') {
            message += `\n${character.extraURL}`;
          }

          message += ` ||`;
        }

        message += `\n*Support this bot: <:nerdhaven:973228882805268571> <https://www.buymeacoffee.com/nerdhaven>*`;

        return message;
      });

      await interaction.reply(replyMessages.join(''));
    }
  }

  // Command: Item Lookup
  if (command === 'item') {
    const itemName = interaction.options.getString('item_name');

    if (!itemName) {
      await interaction.reply({ content: 'Please provide an item name.', ephemeral: true });
      return;
    }

    const matchingItems = Object.entries(itemData).filter(
      ([_, items]) =>
        items.some((item) => item.name.toLowerCase() === itemName.toLowerCase())
    );

    if (matchingItems.length === 0) {
      await interaction.reply({
        content: `Sorry, I couldn't find an item named **${itemName}**`,
        ephemeral: true,
      });
    } else if (matchingItems.length === 1 && matchingItems[0][1].length === 1) {
      const [_, items] = matchingItems[0];

      const replyMessage = items
        .map((item) => {
          let message = ``;

          if (item.locked !== '') {
            message += `|| `;
          }

          message += `**Item Name:** ${item.name}\n**Item Number:** ${item.id}\n**Expansion:** ${item.expansion}\n**Item Count:** ${item.count}\n**Slot:** ${item.slot}\n**Item Text:** ${item.description}`;

          if (item.itemType === 'spent') {
            message += `\n**Item Type:** <:card_spent:1007832312320381040>`;
          }

          if (item.itemType === 'loss') {
            message += `\n**Item Type:** <:card_loss:973231480757157918>`;
          }

          if (item.itemType === 'remove') {
            message += `\n**Item Type:** <:card_loss:973231480757157918> <:card_remove:1007832506659262517>`;
          }
          
          if (item.itemType === 'flip') {
            message += `\n**Item Type:** <:card_flip:1007832399738044556>`;
          }

          if (item.source !== '') {
            message += `\n**Source:** ${item.source}`;
          }
          
          if (item.cost !== '') {
            message += `\n**Cost:** <:resource_gold:1007833160672890881> ${item.cost}`;
          }

          if (item.negativeModifiers !== '') {
            message += `\n**Negative Item Effects**: Add ${item.negativeModifiers} <:AMD_minus1:1074840250003750912> Modifiers.`;
          }

          if (item.faq !== '') {
            message += `\n**FAQ:** ${item.faq}`;
          }

          if (item.frontURL !== '') {
            message += `\n${item.frontURL}`;
          }

          if (item.backURL !== '') {
            message += `\n${item.backURL}`;
          }
          
          if (item.locked !== '') {
            message += ` ||`;
          }

        message += `\n*This feature is still in development and may have missing information or contain errors.*\n*Support this bot: <:nerdhaven:973228882805268571> <https://www.buymeacoffee.com/nerdhaven>*`;
          
          return message;
        })
        .join('\n');

      await interaction.reply(replyMessage);
    } else {

      const replyMessage = `Multiple expansions have an item named **${itemName}**. Select the expansion button for the version you want to see.`;

      const buttons = matchingItems.flatMap(([_, items]) => {
        return items.map((item, index) => {
          const button = new ButtonBuilder()
            .setLabel(item.expansion)
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`class-${index + 1}-button`);
    
          return button;
        });
      });
    
      const buttonRow = new ActionRowBuilder().addComponents(...buttons);

      const reply = await interaction.reply({
        content: replyMessage,
        // ephemeral: true, // only the user who submitted the slash command will see this
        components: [buttonRow],
      });

      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 20000, // 20 seconds
      });

      collector.on('collect', (buttonInteraction) => {
        const buttonIndex = parseInt(buttonInteraction.customId.split('-')[1]) - 1;
        const matchingItem = matchingItems[Math.floor(buttonIndex / matchingItems[0][1].length)];
        const items = matchingItem[1];
        const item = items[buttonIndex % matchingItems[0][1].length];
        
        let replyMessage = ``;
        
        if (item.locked !== '') {
          replyMessage += `|| `;
        }

        replyMessage += `**Item Name:** ${item.name}\n**Item Number:** ${item.id}\n**Expansion:** ${item.expansion}\n**Item Count:** ${item.count}\n**Slot:** ${item.slot}\n**Item Text:** ${item.description}`;

        if (item.itemType === 'spent') {
          replyMessage += `\n**Item Type:** <:card_spent:1007832312320381040>`;
        }

        if (item.itemType === 'loss') {
          replyMessage += `\n**Item Type:** <:card_loss:973231480757157918>`;
        }

        if (item.itemType === 'remove') {
          replyMessage += `\n**Item Type:** <:card_loss:973231480757157918> <:card_remove:1007832506659262517>`;
        }
        
        if (item.itemType === 'flip') {
          replyMessage += `\n**Item Type:** <:card_flip:1007832399738044556>`;
        }

        if (item.source !== '') {
          replyMessage += `\n**Source:** ${item.source}`;
        }
        
        if (item.cost !== '') {
          replyMessage += `\n**Cost:** <:resource_gold:1007833160672890881> ${item.cost}`;
        }

        if (item.negativeModifiers !== '') {
          replyMessage += `\n**Negative Item Effects**: Add ${item.negativeModifiers} <:AMD_minus1:1074840250003750912> Modifiers.`;
        }

        if (item.faq !== '') {
          replyMessage += `\n**FAQ:** ${item.faq}`;
        }

        if (item.frontURL !== '') {
          replyMessage += `\n${item.frontURL}`;
        }

        if (item.backURL !== '') {
          replyMessage += `\n${item.backURL}`;
        }
        
        if (item.locked !== '') {
          replyMessage += ` ||`;
        }

        replyMessage += `\n*This feature is still in development and may have missing information or contain errors.*\n*Support this bot: <:nerdhaven:973228882805268571> <https://www.buymeacoffee.com/nerdhaven>*`;
        
        buttonInteraction.reply(replyMessage);
      });

      collector.on('end', () => {
        buttons.forEach((button) => {
          button.setDisabled(true);
        });

        reply.edit({
          components: [buttonRow]
        });
      });
    }
  }

    
});

// Function: Register Slash Commands
// valid types:
// 1 for sub-command
// 2 for sub-command group
// 3 for string
// 4 for integer
// 5 for boolean
// 6 for user
// 7 for channel
// 8 for role
// 9 for mentionable
// 10 for number
// 11 for any
async function registerSlashCommands() {
  const commands = [
    {
      name: 'ability',
      description: 'Lookup an ability by name',
      options: [
        {
          name: 'ability_name',
          description: 'Name of the ability',
          type: 3,
          required: true,
        },
      ],
    },
    {
      name: 'abilitysearch',
      description: 'Search for abilities by class name and level',
      options: [
        {
          name: 'class_name',
          description: 'Class name',
          type: 3,
          required: true,
        },
        {
          name: 'ability_level',
          description: 'Ability level',
          type: 3,
          required: true,
        },
      ],
    },
    {
      name: 'classinfo',
      description: 'Lookup class info using class name',
      options: [
        {
          name: 'class_name',
          description: 'Class name',
          type: 3,
          required: true,
        },
      ],
    },
    {
      name: 'item',
      description: 'Lookup an item by name',
      options: [
        {
          name: 'item_name',
          description: 'Name of the item',
          type: 3,
          required: true,
        },
      ],
    },
  ];

  try {
    const rest = new REST({ version: '9' }).setToken(mySecret);
    await rest.put(Routes.applicationCommands(client.application.id), {
      body: commands,
    });    

    console.log('Successfully registered slash commands.');
  } catch (error) {
    console.error('Failed to register slash commands:', error);
  }
}

// Login the bot
client.login(mySecret);