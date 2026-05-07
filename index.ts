import { Bot } from "grammy";

const bot = new Bot("8633690309:AAFYg7AJRhdgggCz-RBssEYFA8hTAGAfbGE");

const db: Record<number, any> = {};

bot.command("help", async (ctx) => {
    const helpMessage = `
<b>Як користуватися цим ботом:</b>

Використовуй /set_profile — щоб ввести свої дані (вік, зріст, вагу).
Використовуй /my_profile — щоб побачити свої збережені результати.

<b>Що я рахую:</b>
• <b>BMR</b> (Базовий обмін речовин) — скільки калорій організм спалює у стані спокою.
• <b>TDEE</b> (Добова норма) — скільки калорій потрібно з урахуванням активності.

<b>Важливо:</b> Якщо бот "завис" під час опитування, просто введи /set_profile заново.
    `;
    
    await ctx.reply(helpMessage, { parse_mode: "HTML" });
});
const activityLevels: Record<string, number> = {
    "low": 1.2,
    "light": 1.375,
    "medium": 1.55,
    "high": 1.725
};

function calculateBMR(weight: number, height: number, age: number, sex: string): number {
    if (sex === "male") {
        return 10 * weight + 6.25 * height - 5 * age + 5;
    }
    return 10 * weight + 6.25 * height - 5 * age - 161;
}

function calculateTDEE(bmr: number, activity: number): number {
    return bmr * activity;
}

bot.command("start", (ctx) => {
    ctx.reply("Привіт! Я допоможу розрахувати твою норму калорій. Використовуй /set_profile, щоб почати.");
});

bot.command("set_profile", (ctx) => {
    const userId = ctx.from!.id;
    db[userId] = { step: "age" };
    ctx.reply("Введіть ваш вік (число від 10 до 100):");
});

bot.command("my_profile", (ctx) => {
    const userId = ctx.from!.id;
    const user = db[userId];

    if (!user || !user.bmr) {
        return ctx.reply("Профіль ще не заповнений. Використай /set_profile.");
    }

    ctx.reply(`📋 Ваш профіль:
• Вік: ${user.age}
• Зріст: ${user.height} см
• Вага: ${user.weight} кг
• Стать: ${user.sex === 'male' ? 'Чоловік' : 'Жінка'}
• Активність (коеф): ${user.activity}

Ваш BMR: ${user.bmr.toFixed(2)} ккал
Ваш TDEE (норма): ${user.tdee.toFixed(2)} ккал`);
});


bot.on("message:text", async (ctx) => {
    const userId = ctx.from!.id;
    const user = db[userId];

    if (!user || !user.step) return;

    const text = ctx.message.text.toLowerCase();

    if (user.step === "age") {
        const age = parseInt(text);
        if (isNaN(age) || age < 10 || age > 100) {
            return ctx.reply("Помилка! Введіть число від 10 до 100.");
        }
        user.age = age;
        user.step = "height";
        return ctx.reply("Введіть ваш зріст у см (100-250):");
    }

    if (user.step === "height") {
        const height = parseInt(text);
        if (isNaN(height) || height < 100 || height > 250) {
            return ctx.reply("Помилка! Введіть число від 100 до 250.");
        }
        user.height = height;
        user.step = "weight";
        return ctx.reply("Введіть вашу вагу у кг (30-300):");
    }

    if (user.step === "weight") {
        const weight = parseInt(text);
        if (isNaN(weight) || weight < 30 || weight > 300) {
            return ctx.reply("Помилка! Введіть число від 30 до 300.");
        }
        user.weight = weight;
        user.step = "sex";
        return ctx.reply("Вкажіть вашу стать (male / female):");
    }

    if (user.step === "sex") {
        if (text !== "male" && text !== "female") {
            return ctx.reply("Помилка! Напишіть 'male' або 'female':");
        }
        user.sex = text;
        user.step = "activity";
        return ctx.reply("Оберіть рівень активності:\nlow (1.2)\nlight (1.375)\nmedium (1.55)\nhigh (1.725)");
    }

    if (user.step === "activity") {
        const activity = activityLevels[text];
        if (!activity) {
            return ctx.reply("Оберіть зі списку: low, light, medium або high.");
        }
        user.activity = activity;
        
        user.bmr = calculateBMR(user.weight, user.height, user.age, user.sex);
        user.tdee = calculateTDEE(user.bmr, user.activity);
        
        user.step = null;

        await ctx.reply("Дані збережено!");
        return ctx.reply(`Твій результат:
BMR (основний обмін): ${user.bmr.toFixed(2)} ккал
TDEE (добова норма): ${user.tdee.toFixed(2)} ккал

Використовуй /my_profile, щоб переглянути дані знову.`);
    }
});

console.log("Бот-дієтолог запущений...");
bot.start();
