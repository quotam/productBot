import { CacheStrategy } from "./cacheStrategy";
import { cacheRegistry } from "./registry";

export abstract class BaseService {
  protected readonly cacheStrategy: CacheStrategy;
  private readonly serviceName: string;

  constructor() {
    this.serviceName = this.constructor.name;
    this.cacheStrategy = cacheRegistry.getStrategy(this.serviceName);
  }

  protected async cached<T>(params: {
    key: unknown[];
    getData: () => Promise<T>;
    revalidate?: number;
  }): Promise<T> {
    return this.cacheStrategy.fetch({
      key: params.key,
      getData: params.getData,
      revalidate: params.revalidate,
    });
  }

  protected revalidateByKey(key: string): void {
    this.cacheStrategy.revalidate(key);
  }
}
