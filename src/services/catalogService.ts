import ExcelJS from "exceljs";
import { BaseService } from "../shared/di";
import { Config } from "../shared/config";
import { CatalogEntry } from "../shared/types";
import { cacheRegistry } from "../shared/di/registry";
import { MemoryCacheStrategy } from "../shared/di/cacheStrategy";

const CATALOG_CACHE_KEY = "catalog";
const TARGET_START_ROW = 2;
const BARCODE_CELL = 6;
const ARTILE_CELL = 1;

cacheRegistry.setStrategyForService(
  "CatalogService",
  new MemoryCacheStrategy(),
);

export class CatalogService extends BaseService {
  private catalog: Map<string, string> = new Map(); // article -> barcode

  async loadCatalog(): Promise<void> {
    const catalogData = await this.cached({
      key: CATALOG_CACHE_KEY,
      getData: async () => {
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(Config.CATALOG_FILE_PATH);

          if (workbook.worksheets.length === 0) {
            throw new Error("Справочник пуст");
          }

          const worksheet = workbook.worksheets[0];
          const entries: CatalogEntry[] = [];

          for (
            let rowIndex = TARGET_START_ROW;
            rowIndex <= worksheet.rowCount;
            rowIndex++
          ) {
            const row = worksheet.getRow(rowIndex);
            const article = row.getCell(ARTILE_CELL).value?.toString().trim();
            const barcode = row.getCell(BARCODE_CELL).value?.toString().trim();

            if (article && barcode) {
              entries.push({ article, barcode });
            }
          }

          if (entries.length === 0) {
            throw new Error("В справочнике не найдено данных");
          }

          return entries;
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(`Не удалось загрузить справочник: ${error.message}`);
          }
          throw error;
        }
      },
      revalidate: Config.CATALOG_CACHE_TTL,
    });

    this.catalog.clear();
    catalogData.forEach((entry) => {
      this.catalog.set(entry.article, entry.barcode);
    });
  }

  getBarcode(article: string): string | undefined {
    return this.catalog.get(article);
  }

  getArticle(barcode: string): string | undefined {
    for (const [art, bc] of this.catalog.entries()) {
      if (bc === barcode) return art;
    }
    return undefined;
  }

  getAllEntries(): CatalogEntry[] {
    return Array.from(this.catalog.entries()).map(([article, barcode]) => ({
      article,
      barcode,
    }));
  }

  hasArticle(article: string): boolean {
    return this.catalog.has(article);
  }
}
