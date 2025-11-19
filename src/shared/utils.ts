export const createResultFile(data: ProcessedFile): Buffer {
  const content = `Артикул: ${data.article}
Штрихкод: ${data.barcode}
Найдено кодов: ${data.codes.length}
Коды:
${data.codes.join("\n")}`;

  return Buffer.from(content, "utf-8");
}
