import ExcelJS from "exceljs";
import { BaseService } from "../shared/di";
import { Config } from "../shared/config";
import { CatalogEntry } from "../shared/types";

export class CatalogService extends BaseService {
  private catalog: Map<string, string> = new Map(); // article -> barcode
  private isLoaded: boolean = false;

  async loadCatalog(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    const catalogData = await this.cached({
      key: "catalog",
      getData: async () => {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(Config.CATALOG_FILE_PATH);

        const worksheet = workbook.worksheets[0];
        const entries: CatalogEntry[] = [];

        let rowIndex = 2; // Start from second row (skip header)
        while (rowIndex <= worksheet.rowCount) {
          const row = worksheet.getRow(rowIndex);
          const article = row.getCell(1).value?.toString().trim(); // Column A
          const barcode = row.getCell(6).value?.toString().trim(); // Column F

          if (article && barcode) {
            entries.push({ article, barcode });
          } else {
            break; // Stop at first empty row
          }
          rowIndex++;
        }
        return entries;
      },
      revalidate: Config.CATALOG_CACHE_TTL,
    });

    this.catalog.clear();
    catalogData.forEach((entry) => {
      this.catalog.set(entry.article, entry.barcode);
    });
    this.isLoaded = true;
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

  get size(): number {
    return this.catalog.size;
  }
}
