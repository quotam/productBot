import { Bot, Context, InputFile } from "grammy";
import fs from "fs";
import { FileProcessor } from "../services/fileProcessor";
import path from "path";
import { Config } from "../shared/config";
import { createResultFile } from "../shared/utils";

const GROUP_TIMEOUT = 3000;

const userProcessingState = new Map<
  number,
  {
    count: number;
    timer?: NodeJS.Timeout;
  }
>();

async function sendGroupCompletionMessage(
  userId: number,
  count: number,
  bot: Bot,
) {
  await bot.api.sendMessage(
    userId,
    `Обработка завершена. Обработано файлов: ${count}`,
  );
}

export const handleDocument = async (ctx: Context, bot: Bot) => {
  const document = ctx.message?.document;
  if (!document) return;

  const userId = ctx.from?.id;
  if (!userId) return;

  if (!document.file_name) {
    await ctx.reply("Название файла не удалось извлечь.");
    return;
  }

  const fileName = document.file_name;

  if (!FileProcessor.validateExtension(fileName)) {
    await ctx.reply("Пожалуйста, загрузите файл с расширением .xlsx или .xls");
    return;
  }

  try {
    const file = await ctx.getFile();
    const downloadUrl = `https://api.telegram.org/file/bot${Config.BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(downloadUrl);
    const buffer = await response.arrayBuffer();

    const tempDir = path.join(__dirname, Config.TEMPDIR);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    const processedData = await FileProcessor.processExcelFile(filePath);

    // Create result file and send it
    const resultBuffer = createResultFile(processedData);
    const resultFileName = `result_${processedData.fileName}.txt`;
    await ctx.replyWithDocument(new InputFile(resultBuffer, resultFileName));

    // Update group processing state
    const userState = userProcessingState.get(userId);
    if (userState) {
      userState.count++;
      if (userState.timer) {
        clearTimeout(userState.timer);
      }
    } else {
      userProcessingState.set(userId, { count: 1 });
    }

    const currentState = userProcessingState.get(userId)!;
    currentState.timer = setTimeout(() => {
      if (currentState.count > 1) {
        sendGroupCompletionMessage(userId, currentState.count, bot);
      }
      userProcessingState.delete(userId);
    }, GROUP_TIMEOUT);

    fs.unlinkSync(filePath);
  } catch (error) {
    console.error("Processing error:", error);
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("не найден в справочнике")) {
      await ctx.reply(errorMessage);
    } else if (errorMessage.includes("не найдено кодов в столбце B")) {
      await ctx.reply(errorMessage);
    } else if (errorMessage.includes("Catalog loading failed")) {
      await ctx.reply(
        "Ошибка загрузки справочника. Пожалуйста, попробуйте позже.",
      );
    } else {
      await ctx.reply(
        "Произошла ошибка при обработке файла. Пожалуйста, проверьте формат файла.",
      );
    }
  }
};
