import {
  type CacheStrategy,
  DummyCacheStrategy,
  MemoryCacheStrategy,
} from "./cacheStrategy";

class CacheStrategyRegistry {
  private defaultStrategy: CacheStrategy = new DummyCacheStrategy();
  private serviceStrategies: Map<string, CacheStrategy> = new Map();

  setDefaultStrategy(strategy: CacheStrategy): void {
    this.defaultStrategy = strategy;
  }

  setStrategyForService(serviceName: string, strategy: CacheStrategy): void {
    this.serviceStrategies.set(serviceName, strategy);
  }

  getStrategy(serviceName: string): CacheStrategy {
    return this.serviceStrategies.get(serviceName) || this.defaultStrategy;
  }
}

const cacheRegistry = new CacheStrategyRegistry();

if (process.env.NODE_ENV === "production") {
  cacheRegistry.setDefaultStrategy(new MemoryCacheStrategy());
}

export { cacheRegistry };
