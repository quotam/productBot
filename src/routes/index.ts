import { Bot } from "grammy";
import { handleStart } from "./handleStart";
import { handleHelp } from "./handleHelp";
import { handleDocument } from "./handleDocument";

export const setupRoutes = (bot: Bot) => {
  bot.api.setMyCommands([
    { command: "start", description: "Запустить бота" },
    { command: "help", description: "Помощь" },
  ]);

  bot.command("start", handleStart);
  bot.command("help", handleHelp);

  bot.on("message:document", (ctx) => handleDocument(ctx, bot));
  bot.command("id", async (ctx: any) => ctx.reply(ctx.message.from.id));
};
