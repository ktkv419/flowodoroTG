require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;

// prettier-ignore
(async () => {
  fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-1`, {
    method: 'POST',
  });
})();

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

class User {
  constructor(chatId) {
    this.chat_id = chatId;
    this.workSession = 20;
    this.bigBreak = false;
    this.beforeBigBreak = 3;
    this.breakCoef = 0.3;
  }

  setWorkSession(mins) {
    this.workSession = mins;
  }
  setBigBreak(bool) {
    this.bigBreak = bool;
  }
  setBeforeBigBreak(amount) {
    this.beforeBigBreak = amount;
  }
  setBreakCoef(coef) {
    this.breakCoef = coef;
  }

  static deleteUser(msg) {
    const userIndex = users.findIndex((el) => el.chat_id == msg.chat.id);
    users.splice(userIndex, 1);

    const opts = {
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [[{ text: '/start' }]],
      },
    };

    bot.sendMessage(msg.chat.id, 'You have reseted your account', opts);
  }
}

const users = [];

function findUser(msg) {
  return users.find((el) => el.chat_id == msg.chat.id);
}

function showStartMenu(msg, message = 'What do you want to do next?') {
  const opts = {
    reply_markup: {
      resize_keyboard: true,
      one_time_keyboard: true,
      keyboard: [[{ text: 'Start timer' }, { text: 'Options' }]],
    },
  };

  bot.sendMessage(msg.chat.id, message, opts);
}

bot.setMyCommands([
  {
    command: '/start',
    description: 'Start the timer',
  },
  {
    command: '/reset',
    description: 'Reset settings',
  },
]);

bot.onText(/\/reset/, (msg) => {
  User.deleteUser(msg);
});

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  if (!users.some((el) => el.chat_id == chatId)) {
    users.push(new User(chatId));
  }

  showStartMenu(msg, 'Welcome to Flowodoro!');
});

bot.onText(/Options/, async (msg) => {
  const user = findUser(msg);
  const opts = {
    reply_markup: {
      resize_keyboard: true,
      one_time_keyboard: true,
      keyboard: [
        [{ text: 'Set work session time' }, { text: 'Set break coefficient' }],
        [{ text: 'Set big break' }, { text: 'Small breaks before big one' }],
      ],
    },
  };
  if (user.bigBreak == false) opts.reply_markup.keyboard[1].pop();

  bot.sendMessage(msg.chat.id, 'Options:', opts);
});
changeOptions();

// const settings = []
// options (msg) {

// }
//
const setOfOptions = [
  'Set work session time',
  'Set break coefficient',
  'Set big break',
  'Small breaks before big one',
];

function disableOptions() {
  setOfOptions.forEach((el) => bot.removeTextListener(`/${el}/`));
}

function changeOptions() {
  bot.onText(/Set work session time/, async (msg) => {
    const opts = {
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
          [{ text: '0' }, { text: '15' }, { text: '30' }],
          [{ text: '45' }, { text: '60' }, { text: '75' }],
        ],
      },
    };
    bot.sendMessage(
      msg.chat.id,
      'How many minutes do you want work session to last?',
      opts
    );

    bot.onText(/.*/, (msg) => {
      const user = findUser(msg);
      const number = msg.text;
      // console.log(msg.text.is);
      if (isFinite(number) && Number(number) >= 0) {
        user.setWorkSession(Number(msg.text));
        showStartMenu(msg, 'The setting was succesfully changed');
      } else
        showStartMenu(
          msg,
          'There was a problem with your input, please try again and type in a valid number'
        );
      console.log(user);
      bot.removeTextListener(/.*/);
    });
  });

  bot.onText(/Set big break/, (msg) => {
    console.log('Test');
    const opts = {
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [[{ text: 'Yes' }, { text: 'No' }]],
      },
    };
    bot.sendMessage(msg.chat.id, 'Do you need big break?', opts);
    bot.onText(/.*/, (msg) => {
      bot.removeTextListener(/.*/);
      if (!msg.text == 'Yes' || !msg.text == 'No') {
        console.log(msg.text);
        showStartMenu(
          msg,
          'That was an invalid input, please try again and press a button or type "Yes" or "No"'
        );
        return;
      }
      const user = findUser(msg);
      if (msg.text == 'Yes') user.setBigBreak(true);
      else if (msg.text == 'No') user.setBigBreak(false);
      console.log(users);
      showStartMenu(msg, 'The setting was succesfully changed');
    });
  });

  bot.onText(/Set break coefficient/, (msg) => {
    const opts = {
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
          [{ text: '0.1' }, { text: '0.2' }, { text: '0.3' }],
          [{ text: '0.4' }, { text: '0.5' }, { text: '0.6' }],
        ],
      },
    };
    bot.sendMessage(
      msg.chat.id,
      'The default value is 0.3, which equals to 18 minutes of break after 60 minutes of work',
      opts
    );
    bot.onText(/.*/, (msg) => {
      const user = findUser(msg);
      const number = Number(msg.text);
      // console.log(msg.text.is);
      if (isFinite(number) && number > 0 && number < 1) {
        user.setBreakCoef(number);
        showStartMenu(
          msg,
          `The setting was succesfully changed. 60 minutes of work will equal to ${
            60 * number
          } minutes of break`
        );
      } else {
        showStartMenu(
          msg,
          'There was a problem with your input, please try again and type in a valid number'
        );
      }
      console.log(user);
      bot.removeTextListener(/.*/);
    });
  });

  bot.onText(/Small breaks before big one/, (msg) => {
    const opts = {
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [
          [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
        ],
      },
    };
    bot.sendMessage(
      msg.chat.id,
      'How many small breaks do you need before a big one?',
      opts
    );
    bot.onText(/.*/, (msg) => {
      const user = findUser(msg);
      const number = Number(msg.text);
      // console.log(msg.text.is);
      if (isFinite(number) && number > 0) {
        user.setBeforeBigBreak(number);
        showStartMenu(msg, `The setting was succesfully changed`);
      } else
        showStartMenu(
          msg,
          'There was a problem with your input, please try again and type in a valid number'
        );
      console.log(user);
      bot.removeTextListener(/.*/);
    });
  });
}

///////////////////// DEBUG /////////////////////
bot.on('polling_error', console.log);
setInterval(() => console.log(users), 5000);
/////////////////////////////////////////////////
