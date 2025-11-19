import * as path from "path";
import * as fs from "fs";
import ExcelJS from "exceljs";
import { FileProcessor } from "./fileProcessor";
import { CatalogService } from "./catalogService";
import { NotFoundInCatalog, NoCodesFoundError, CatalogLoadingError } from "../shared/error";

// Mock the CatalogService
jest.mock("./catalogService");

describe("FileProcessor", () => {
  const testTempDir = path.join(__dirname, "../../test-temp");
  
  beforeAll(() => {
    // Create test temp directory
    if (!fs.existsSync(testTempDir)) {
      fs.mkdirSync(testTempDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test temp directory
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true });
    }
  });

  describe("validateExtension", () => {
    it("should return true for .xlsx files", () => {
      expect(FileProcessor.validateExtension("test.xlsx")).toBe(true);
    });

    it("should return true for .xls files", () => {
      expect(FileProcessor.validateExtension("test.xls")).toBe(true);
    });

    it("should return false for other extensions", () => {
      expect(FileProcessor.validateExtension("test.pdf")).toBe(false);
      expect(FileProcessor.validateExtension("test.txt")).toBe(false);
      expect(FileProcessor.validateExtension("test")).toBe(false);
    });
  });

  describe("extractArticle", () => {
    it("should extract article from filename without spaces", () => {
      const article = FileProcessor["extractArticle"]("G0418.xlsx");
      expect(article).toBe("G0418");
    });

    it("should extract article from filename with spaces", () => {
      const article = FileProcessor["extractArticle"]("G0418 - 61 штука.xlsx");
      expect(article).toBe("G0418");
    });

    it("should extract article from filename with multiple words", () => {
      const article = FileProcessor["extractArticle"]("A1234 файл с описанием.xls");
      expect(article).toBe("A1234");
    });

    it("should throw error for empty article", () => {
      expect(() => FileProcessor["extractArticle"]("   .xlsx")).toThrow("Не удалось извлечь артикул из названия файла");
    });
  });

  describe("processExcelFile", () => {
    let mockCatalogService: jest.Mocked<CatalogService>;

    beforeEach(() => {
      mockCatalogService = new CatalogService() as jest.Mocked<CatalogService>;
      (CatalogService as jest.MockedClass<typeof CatalogService>).mockImplementation(() => mockCatalogService);
      
      // Mock loadCatalog to resolve successfully by default
      mockCatalogService.loadCatalog.mockResolvedValue(undefined);

      // Default implementation for getBarcode: return barcode for known articles
      mockCatalogService.getBarcode.mockImplementation((article: string) => {
        if (article === "G0418") {
          return "4601234567890";
        }
        return undefined;
      });

      // Replace the static catalogService in FileProcessor with our mock
      (FileProcessor as any).catalogService = mockCatalogService;
    });

    it("should process valid Excel file correctly", async () => {
      // Create a test Excel file
      const testFilePath = path.join(testTempDir, "G0418 test.xlsx");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet1");
      
      // Add headers (first row)
      worksheet.getCell("A1").value = "Header A";
      worksheet.getCell("B1").value = "Header B";
      
      // Add data starting from second row in column B
      worksheet.getCell("A2").value = "ignored";
      worksheet.getCell("B2").value = "CODE001";
      worksheet.getCell("A3").value = "ignored";
      worksheet.getCell("B3").value = "CODE002";
      worksheet.getCell("A4").value = "ignored";
      worksheet.getCell("B4").value = "CODE003";
      
      await workbook.xlsx.writeFile(testFilePath);

      const result = await FileProcessor.processExcelFile(testFilePath);

      expect(result.article).toBe("G0418");
      expect(result.barcode).toBe("4601234567890");
      expect(result.codes).toEqual(["CODE001", "CODE002", "CODE003"]);
      expect(result.fileName).toBe("G0418 test.xlsx");
    });

    it("should throw NotFoundInCatalog when article not found", async () => {
      const testFilePath = path.join(testTempDir, "INVALID test.xlsx");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet1");
      worksheet.getCell("B2").value = "CODE001";
      await workbook.xlsx.writeFile(testFilePath);

      await expect(FileProcessor.processExcelFile(testFilePath))
        .rejects.toThrow(NotFoundInCatalog);
    });

    it("should throw NoCodesFoundError when no codes in column B", async () => {
      const testFilePath = path.join(testTempDir, "G0418 test.xlsx");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet1");
      // Only headers, no data in column B
      worksheet.getCell("B1").value = "Header B";
      await workbook.xlsx.writeFile(testFilePath);

      await expect(FileProcessor.processExcelFile(testFilePath))
        .rejects.toThrow(NoCodesFoundError);
    });

    it("should throw CatalogLoadingError when catalog fails to load", async () => {
      const testFilePath = path.join(testTempDir, "G0418 test.xlsx");
      
      // Override the default mock to reject
      mockCatalogService.loadCatalog.mockRejectedValue(new Error("Catalog load failed"));

      await expect(FileProcessor.processExcelFile(testFilePath))
        .rejects.toThrow(CatalogLoadingError);
    });

    it("should ignore empty cells in column B", async () => {
      const testFilePath = path.join(testTempDir, "G0418 test.xlsx");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet1");
      
      worksheet.getCell("B2").value = "CODE001";
      worksheet.getCell("B3").value = ""; // empty cell
      worksheet.getCell("B4").value = "CODE002";
      worksheet.getCell("B5").value = null; // null cell
      worksheet.getCell("B6").value = "CODE003";
      
      await workbook.xlsx.writeFile(testFilePath);

      const result = await FileProcessor.processExcelFile(testFilePath);

      expect(result.codes).toEqual(["CODE001", "CODE002", "CODE003"]);
    });
  });
});
