import { Bot, Context } from "grammy";

import fs from "fs";
import { FileProcessor } from "../services/fileProcessor";
import path from "path";
import { ProcessedFile } from "../shared/types/file";
import { Config } from "../shared/config";

function formatResponse(data: ProcessedFile): string {
  return `
📊 Результаты обработки:
📁 Файл: ${data.fileName}
📦 Артикул: ${data.article}
🔢 Найдено кодов: ${data.codes.length}
📋 Коды: ${data.codes.join(", ")}
    `.trim();
}

export const handleDocument = async (ctx: Context, bot: Bot) => {
  const document = ctx.message?.document;
  if (!document) return;

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

    await ctx.reply(formatResponse(processedData));

    fs.unlinkSync(filePath);
  } catch (error) {
    console.error("Processing error:", error);
    await ctx.reply("Произошла ошибка при обработке файла");
  }
};
