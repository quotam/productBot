import { Context } from "grammy";

export const handleStart = async (ctx: Context) => {
  await ctx.reply("Привет! Отправьте мне заявку.");
};
