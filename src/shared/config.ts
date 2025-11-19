import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({});

const privateConfigSchema = z.object({
  BOT_TOKEN: z.string(),
});

const privateConfig = privateConfigSchema.parse({
  ...process.env,
});

const publicConfig = {
  CATALOG_CACHE_TTL: 8 * 60 * 60,

  BATCH_TIMEOUT: 3000,

  COLUMNS: {
    SOURCE_CODE: "B",
    CATALOG_ARTICLE: "A",
    CATALOG_BARCODE: "F",
  },
  TEMPDIR: "../temp",
  ...privateConfig,
};

export { publicConfig as Config };
