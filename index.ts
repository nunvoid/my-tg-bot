import { Bot } from "grammy";

// Вставте сюди ваш токен від BotFather
const bot = new Bot("8633690309:AAFYg7AJRhdgggCz-RBssEYFA8hTAGAfbGE");

// Команда /start
bot.command("start", (ctx) => {
    return ctx.reply("Використай /help, щоб побачити, що я вмію.");
});

// Команда /help (замість жарту)
bot.command("help", (ctx) => {
    const message = `
Доступні команди:
/start — запуск бота
/help — список усіх команд
/info — дізнатися більше про проект

Просто напиши мені щось, і я повторю твоє повідомлення!
    `;
    return ctx.reply(message);
});

// Додаткова команда /info (власна команда для ДЗ)
bot.command("info", (ctx) => {
    return ctx.reply("Цей бот створений за допомогою Bun та grammY.");
});

// Обробка тексту (Ехо)
bot.on("message:text", (ctx) => {
    return ctx.reply(`Я отримав твоє повідомлення: ${ctx.message.text}`);
});

console.log("Бот успішно запущений і чекає на команди...");
bot.start();