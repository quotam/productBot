import fs from "fs";
import { Bot, Context, InputFile } from "grammy";
import path from "path";
import { FileProcessor } from "../services/fileProcessor";
import { Config } from "../shared/config";
import { UserError } from "../shared/error";
import { createResultFile } from "../shared/utils";

const GROUP_TIMEOUT = 3000;
const RESULT_FILE_NAME = (article: string) => `codes_${article}.xlsx`;

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

  let filePath: string | undefined;
  try {
    const file = await ctx.getFile();
    const downloadUrl = `https://api.telegram.org/file/bot${Config.BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(downloadUrl);
    const buffer = await response.arrayBuffer();

    const tempDir = path.join(__dirname, Config.TEMPDIR);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    const processedData = await FileProcessor.processExcelFile(filePath);

    // Create result file and send it
    const resultBuffer = await createResultFile(processedData);

    await ctx.replyWithDocument(
      new InputFile(resultBuffer, RESULT_FILE_NAME(processedData.article)),
    );

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

  } catch (error) {
    console.error("Processing error:", error);

    if (error instanceof UserError) {
      await ctx.reply(error.message);
    } else {
      await ctx.reply(
        "Произошла ошибка при обработке файла. Пожалуйста, проверьте формат файла.",
      );
      throw error;
    }
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};
