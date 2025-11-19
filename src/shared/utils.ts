import ExcelJS from "exceljs";
import { ProcessedFile } from "./types";

export const createResultFile = async (
  data: ProcessedFile,
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Codes");

  // First row: "коды" in cell A1
  worksheet.getCell("A1").value = "коды";

  // Second row: barcode in cell A2
  worksheet.getCell("A2").value = data.barcode;

  // Subsequent rows: codes from the input file
  data.codes.forEach((code, index) => {
    worksheet.getCell(`A${index + 3}`).value = code;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
