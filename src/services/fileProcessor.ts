import * as path from "path";
import * as fs from "fs";
import ExcelJS from "exceljs";
import { CatalogService } from "./catalogService";
import { ProcessedFile } from "../shared/types";
import {
  NotFoundInCatalog,
  NoCodesFoundError,
  CatalogLoadingError,
} from "../shared/error";

const ALLOWED_EXT = [".xlsx", ".xls"];
const TARGET_CELL = 2;
const TARGET_START_ROW = 2;

export class FileProcessor {
  private static catalogService: CatalogService = new CatalogService();

  static async processExcelFile(filePath: string): Promise<ProcessedFile> {
    try {
      await this.catalogService.loadCatalog();
    } catch (error) {
      throw new CatalogLoadingError((error as Error).message);
    }

    // Проверка существования файла
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Извлечение артикула из имени файла
    const fileName = path.basename(filePath);
    const article = this.extractArticle(fileName);

    const barcode = this.catalogService.getBarcode(article);
    if (!barcode) {
      throw new NotFoundInCatalog(article);
    }

    // Чтение Excel файла
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    const codes: string[] = [];

    for (
      let rowIndex = TARGET_START_ROW;
      rowIndex <= worksheet.rowCount;
      rowIndex++
    ) {
      const row = worksheet.getRow(rowIndex);
      const cellValue = row.getCell(TARGET_CELL).value?.toString().trim();
      if (cellValue) {
        codes.push(cellValue);
      }
    }

    if (codes.length === 0) {
      throw new NoCodesFoundError();
    }

    return {
      article,
      codes,
      fileName,
      barcode,
    };
  }

  private static extractArticle(fileName: string): string {
    const baseName = path.parse(fileName).name;
    const firstSpaceIndex = baseName.indexOf(" ");
    const article =
      firstSpaceIndex === -1
        ? baseName
        : baseName.substring(0, firstSpaceIndex);

    if (!article || article.trim().length === 0) {
      throw new Error("Не удалось извлечь артикул из названия файла");
    }

    return article;
  }

  static validateExtension(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return ALLOWED_EXT.includes(ext);
  }
}
