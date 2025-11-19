//Тут подразумевается redis, я знаю что кэшировать на сервере c приложенем это плохо

export interface CacheStrategy {
  fetch<T>(props: {
    key: string;
    getData: () => Promise<T>;
    revalidate?: number;
  }): Promise<T>;
  revalidate: (key: string) => void;
  name: string;
}

export class DummyCacheStrategy implements CacheStrategy {
  readonly name: string = "DummyCacheStrategy";

  fetch<T>({
    getData,
  }: {
    key: string;
    getData: () => Promise<T>;
    revalidate?: number;
  }): Promise<T> {
    return getData();
  }
  revalidate() {}
}

export class MemoryCacheStrategy implements CacheStrategy {
  readonly name: string = "MemoryCacheStrategy";

  private cache = new Map<
    string,
    {
      data: any;
      timestamp: number;
      revalidate: number | undefined;
    }
  >();

  private pendingRequests = new Map<string, Promise<any>>();

  async fetch<T>({
    key,
    getData,
    revalidate,
  }: {
    key: string;
    getData: () => Promise<T>;
    revalidate?: number;
  }): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (
      cached &&
      cached.revalidate &&
      now - cached.timestamp < cached.revalidate
    ) {
      return cached.data;
    }

    const pendingRequest = this.pendingRequests.get(key);
    if (pendingRequest) {
      return pendingRequest;
    }

    const request = getData()
      .then((data) => {
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          revalidate,
        });
        return data;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, request);

    return request;
  }

  revalidate(key: string): void {
    this.cache.delete(key);

    if (this.pendingRequests.has(key)) {
      this.pendingRequests.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
