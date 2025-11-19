import * as path from "path";
import * as fs from "fs";
import ExcelJS from "exceljs";
import { CatalogService } from "./catalogService";
import { ProcessedFile } from "../shared/types";

const allowedExtensions = [".xlsx", ".xls"];
const targetCell = 2; // Столбец B

export class FileProcessor {
  private static catalogService: CatalogService = new CatalogService();

  static async processExcelFile(filePath: string): Promise<ProcessedFile> {
    // Load catalog first
    try {
      await this.catalogService.loadCatalog();
    } catch (error) {
      throw new Error(`Catalog loading failed: ${error}`);
    }

    // Проверка существования файла
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Извлечение артикула из имени файла
    const fileName = path.basename(filePath);
    const article = this.extractArticle(fileName);

    // Get barcode from catalog
    const barcode = this.catalogService.getBarcode(article);

    // Чтение Excel файла
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    const codes: string[] = [];

    // Обработка строк начиная со второй
    let rowIndex = 2;
    while (rowIndex <= worksheet.rowCount) {
      const row = worksheet.getRow(rowIndex);
      const cellValue = row.getCell(targetCell).value?.toString().trim();

      if (cellValue) {
        codes.push(cellValue);
      } else if (cellValue === undefined) {
        break; // пустая ячейка, первая пустая
      }

      rowIndex++;
    }

    return {
      article,
      codes,
      fileName,
      barcode: barcode || "не найден в справочнике",
    };
  }

  private static extractArticle(fileName: string): string {
    const baseName = path.parse(fileName).name; // Убираем расширение
    const firstSpaceIndex = baseName.indexOf(" ");
    return firstSpaceIndex === -1
      ? baseName
      : baseName.substring(0, firstSpaceIndex);
  }

  static validateExtension(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return allowedExtensions.includes(ext);
  }
}
