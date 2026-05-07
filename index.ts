import { Bot } from "grammy";
import { Database } from "bun:sqlite";

const bot = new Bot("8633690309:AAFYg7AJRhdgggCz-RBssEYFA8hTAGAfbGE");
const db = new Database("diet.db");

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    age INTEGER,
    weight REAL,
    height REAL,
    sex TEXT,
    activity_level REAL,
    bmr REAL,
    tdee REAL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    raw_text TEXT,
    calories_estimated REAL DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const sessionState: Record<number, any> = {};

bot.command("help", async (ctx) => {
    const helpMessage = `
<b>Помічник дієтолога</b>

Ось список доступних команд:

<b>Профіль:</b>
/set_profile — Створити або оновити свої дані (вік, вага, зріст). 
/my_profile — Переглянути розраховані BMR та TDEE.

<b>Щоденник їжі:</b>
/add_meal — Додати запис про те, що ви з'їли.
/today — Показати список усіх прийомів їжі за сьогодні.

<b>Як це працює?</b>
Всі ваші записи зберігаються в базі даних <code>diet.db</code>. Навіть після перезапуску бота ваші дані будуть на місці!

<i>Якщо ви почали вводити дані і хочете скасувати — просто виберіть іншу команду.</i>
    `;

    await ctx.reply(helpMessage, { parse_mode: "HTML" });
});

function calculateBMR(w: number, h: number, a: number, s: string) {
    return s === "male" ? (10 * w + 6.25 * h - 5 * a + 5) : (10 * w + 6.25 * h - 5 * a - 161);
}

bot.command("start", (ctx) => ctx.reply("Привіт! Я твій дієтолог з пам'яттю. Спробуй /set_profile або /add_meal."));

bot.command("set_profile", (ctx) => {
    sessionState[ctx.from!.id] = { step: "age" };
    ctx.reply("Вкажіть ваш вік:");
});
bot.command("add_meal", (ctx) => {
    sessionState[ctx.from!.id] = { step: "meal_text" };
    ctx.reply("Що ви сьогодні їли?");
});

bot.command("today", (ctx) => {
    const userId = ctx.from!.id;
    const today = new Date().toISOString().split('T')[0];
    const meals = db.query("SELECT * FROM meals WHERE user_id = ? AND date(timestamp) = date('now')").all(userId) as any[];

    if (meals.length === 0) {
        return ctx.reply("Сьогодні ще немає записаних прийомів їжі.");
    }

    let report = "🍴 Сьогодні ви з'їли:\n";
    meals.forEach((m, i) => {
        const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        report += `${i + 1}. ${m.raw_text} (${time})\n`;
    });

    ctx.reply(report);
});

bot.command("my_profile", (ctx) => {
    const user = db.query("SELECT * FROM users WHERE telegram_id = ?").get(ctx.from!.id) as any;
    if (!user) return ctx.reply("Профіль не знайдено. /set_profile");
    
    ctx.reply(`📊 Ваш профіль:\nВік: ${user.age}\nВага: ${user.weight}кг\nBMR: ${user.bmr} ккал\nTDEE: ${user.tdee} ккал`);
});

bot.on("message:text", async (ctx) => {
    const userId = ctx.from!.id;
    const state = sessionState[userId];
    if (!state) return;

    const text = ctx.message.text;

    // Логіка /set_profile
    if (state.step === "age") {
        state.age = parseInt(text);
        state.step = "weight";
        return ctx.reply("Ваша вага (кг):");
    }
    if (state.step === "weight") {
        state.weight = parseFloat(text);
        state.step = "height";
        return ctx.reply("Ваш зріст (см):");
    }
    if (state.step === "height") {
        state.height = parseFloat(text);
        state.step = "sex";
        return ctx.reply("Стать (male/female):");
    }
    if (state.step === "sex") {
        state.sex = text.toLowerCase();
        state.step = "activity";
        return ctx.reply("Активність (1.2, 1.375, 1.55, 1.725):");
    }
    if (state.step === "activity") {
        const activity = parseFloat(text);
        const bmr = calculateBMR(state.weight, state.height, state.age, state.sex);
        const tdee = bmr * activity;

        db.run(`
            INSERT OR REPLACE INTO users (telegram_id, age, weight, height, sex, activity_level, bmr, tdee)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, state.age, state.weight, state.height, state.sex, activity, bmr, tdee]
        );

        delete sessionState[userId];
        return ctx.reply(` Профіль збережено в БД!\nTDEE: ${tdee.toFixed(2)} ккал`);
    }

    if (state.step === "meal_text") {
        db.run("INSERT INTO meals (user_id, raw_text) VALUES (?, ?)", [userId, text]);
        delete sessionState[userId];
        return ctx.reply("Прийом їжі збережено ");
    }
});

console.log("Бот з базою SQLite запущений...");
bot.start();
