require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;

// Reset queue in case of error
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
    this.sessions = [];
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

class Session {
  start = Date.now();
  end;
  duration;
  id = String(Date.now()).split(-10);
  constructor() {}

  setEnd(end) {
    if (!this.end) {
      // console.log(this);
      this.end = end;
      this.duration = Math.round(this.end - this.start);
    }
  }
}

class WorkSession extends Session {
  type = 'work';
}

class BreakSession extends Session {
  type = 'break';
  realEnd;

  constructor(workObject, breakCoef) {
    super();
    this.setEnd(Math.round(workObject.duration * breakCoef + this.start));
  }

  setRealEnd() {
    if (!this.realEnd) {
      this.realEnd = Date.now();
    }
  }
}

class bigBreakSession extends BreakSession {
  type = 'bigBreak';
}

const users = [];

// Helper functions

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

const menuOfOptions = [
  'Set work session time',
  'Set break coefficient',
  'Set big break',
  'Small breaks before big one',
];

function disableOptions() {
  menuOfOptions.forEach((el) => bot.removeTextListener(`/${el}/`));
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

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  enableOptions();
  if (!users.some((el) => el.chat_id == chatId)) {
    users.push(new User(chatId));
  }

  showStartMenu(msg, 'Welcome to Flowodoro!');
});

bot.onText(/Back/, (msg) => {
  showStartMenu(msg);
});

bot.onText(/Options/, (msg) => {
  const user = findUser(msg);
  const opts = {
    reply_markup: {
      resize_keyboard: true,
      one_time_keyboard: true,
      keyboard: [
        [{ text: 'Set work session time' }, { text: 'Set break coefficient' }],
        [{ text: 'Set big break' }, { text: 'Small breaks before big one' }],
        [{ text: 'Back' }],
      ],
    },
  };
  if (user.bigBreak == false) opts.reply_markup.keyboard[1].pop();

  bot.sendMessage(msg.chat.id, 'Options:', opts);
});

function enableOptions() {
  bot.onText(/Set work session time/, (msg) => {
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

async function showTimerMenu(msg, message, isWork = true) {
  const opts = {
    reply_markup: {
      resize_keyboard: true,
      one_time_keyboard: true,
      keyboard: [
        [{ text: 'Take break' }, { text: 'Back to work!' }],
        [{ text: 'To menu' }, { text: 'Show timer' }],
      ],
    },
  };
  if (isWork) opts.reply_markup.keyboard[0].pop();
  else opts.reply_markup.keyboard[0].shift();
  return bot.sendMessage(msg.chat.id, message, opts);
}

function startWorkBreakSession(msg) {
  disableOptions();

  function removeTimerListeners() {
    bot.removeTextListener(/Back to work!/);
    bot.removeTextListener(/Show timer/);
    bot.removeTextListener(/Take break/);
    bot.removeTextListener(/To menu/);
  }

  const user = findUser(msg);
  user.sessions.push(new WorkSession());

  let secondsPassed = 0;

  showTimerMenu(msg, 'Time to do some work!');

  let timer = setInterval(() => {
    secondsPassed++;
  }, 1000);

  bot.onText(/Take break/, (msg) => {
    if (user.workSession * 60 > secondsPassed) {
      showTimerMenu(
        msg,
        `You have to work for ${secondsToTimer(
          user.workSession * 60 - secondsPassed,
          { hours: false, minutes: true, seconds: false }
        )} more minutes`
      );
      return;
    }

    user.sessions.at(-1).setEnd(Date.now());
    user.sessions.push(new BreakSession(user.sessions.at(-1), user.breakCoef));
    clearInterval(timer);

    let breakTime = Math.round(user.sessions.at(-1).duration / 1000);

    showTimerMenu(
      msg,
      `Much deserved break! You can relax for ${secondsToTimer(breakTime)}`,
      false
    );

    secondsPassed = breakTime;
    console.log(secondsPassed);
    timer = setInterval(() => {
      secondsPassed--;
      if (secondsPassed <= 0) {
        removeTimerListeners();
        showTimerMenu(msg, "It's time to do some work", false);
        clearInterval(timer);
      }
    }, 1000);

    bot.onText(/Back to work!/, (msg) => {
      user.sessions.at(-1).setRealEnd();
      clearInterval(timer);
      removeTimerListeners();
      startWorkBreakSession(msg);
    });
  });

  bot.onText(/To menu/, (msg) => {
    clearInterval(timer);
    removeTimerListeners();
    user.sessions.pop();
    showStartMenu(msg, 'Welcome back!');
  });

  bot.onText(/Show timer/, (msg) => {
    console.log(secondsPassed);
    showTimerMenu(msg, secondsToTimer(secondsPassed));
  });
}

bot.onText(/Start timer/, startWorkBreakSession);

function secondsToTimer(
  secs,
  opts = { hours: true, minutes: true, seconds: true }
) {
  const hours = Math.trunc(secs / (60 * 60));
  secs -= hours * 60 * 60;
  const mins = Math.trunc(secs / 60);
  secs = Math.trunc(secs - mins * 60);
  let time = [];
  if (opts.hours) time.push(`${String(hours).padStart(2, 0)}`);
  if (opts.minutes) time.push(`${String(mins).padStart(2, 0)}`);
  if (opts.seconds) time.push(`${String(secs).padStart(2, 0)}`);
  return time.join(':');
}

///////////////////// DEBUG /////////////////////
bot.on('polling_error', console.log);
setInterval(() => console.log(users[0].sessions), 5000);
/////////////////////////////////////////////////
