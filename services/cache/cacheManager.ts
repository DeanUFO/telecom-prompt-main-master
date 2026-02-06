/**
 * 智能缓存模块
 * 提供多层缓存策略、过期管理、缓存命中率统计
 */

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  hits: number;
  ttl: number;
}

export interface CacheStats {
  total: number;
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

/**
 * 内存缓存层
 */
export class MemoryCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private stats: CacheStats;
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 1000, cleanupIntervalMs: number = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.stats = {
      total: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
    };

    // 定期清理过期项
    if (typeof window === 'undefined') {
      // 仅在 Node.js 环境中启动定时清理
      this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    }
  }

  /**
   * 设置缓存项
   */
  set(key: string, value: T, ttl: number = 3600): void {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.values()).sort(
        (a, b) => a.createdAt - b.createdAt
      )[0];
      if (oldest) this.cache.delete(oldest.key);
    }

    const now = Date.now() / 1000;
    this.cache.set(key, {
      key,
      value,
      createdAt: now,
      expiresAt: now + ttl,
      hits: 0,
      ttl,
    });

    this.stats.size = this.cache.size;
    this.stats.total = Math.max(this.stats.total, this.cache.size);
  }

  /**
   * 获取缓存项
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // 检查是否过期
    if (Date.now() / 1000 > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    entry.hits++;
    this.stats.hits++;
    this.updateHitRate();

    return entry.value;
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() / 1000 > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      total: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
    };
  }

  /**
   * 清理过期项
   */
  private cleanup(): void {
    const now = Date.now() / 1000;
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Cache] 清理了 ${removed} 个过期项`);
      this.stats.size = this.cache.size;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * 销毁清理定时器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * 多层缓存管理器
 * L1: 内存缓存 L2: 本地存储缓存 (浏览器) / Redis (服务器)
 */
export class MultiLayerCache<T = any> {
  private l1: MemoryCache<T>;
  private l2Enabled: boolean;

  constructor(l1Size: number = 500, enableL2: boolean = true) {
    this.l1 = new MemoryCache<T>(l1Size);
    this.l2Enabled = enableL2;
  }

  /**
   * 多层读取
   */
  async get(key: string): Promise<T | undefined> {
    // 尝试 L1 缓存
    let value = this.l1.get(key);
    if (value !== undefined) {
      console.log(`[Cache L1] 命中: ${key}`);
      return value;
    }

    // 尝试 L2 缓存
    if (this.l2Enabled) {
      value = await this.getFromL2(key);
      if (value !== undefined) {
        console.log(`[Cache L2] 命中: ${key}`);
        // 写回 L1
        this.l1.set(key, value, 1800);
        return value;
      }
    }

    console.log(`[Cache] 未命中: ${key}`);
    return undefined;
  }

  /**
   * 多层写入
   */
  async set(key: string, value: T, ttl: number = 3600): Promise<void> {
    // 写入 L1
    this.l1.set(key, value, ttl);

    // 写入 L2
    if (this.l2Enabled) {
      await this.setToL2(key, value, ttl);
    }
  }

  /**
   * 从 L2 读取（浏览器 localStorage 或服务器 Redis）
   */
  private async getFromL2(key: string): Promise<T | undefined> {
    try {
      if (typeof window !== 'undefined') {
        // 浏览器环境
        const item = window.localStorage?.getItem(`cache:${key}`);
        if (item) {
          const { value, expiresAt } = JSON.parse(item);
          if (Date.now() < expiresAt) {
            return value;
          } else {
            window.localStorage?.removeItem(`cache:${key}`);
          }
        }
      }
    } catch (error) {
      console.warn(`[Cache L2 Read Error] ${key}:`, error);
    }
    return undefined;
  }

  /**
   * 写入 L2（浏览器 localStorage 或服务器可扩展）
   */
  private async setToL2(key: string, value: T, ttl: number): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        // 浏览器环境
        const data = {
          value,
          expiresAt: Date.now() + ttl * 1000,
        };
        window.localStorage?.setItem(`cache:${key}`, JSON.stringify(data));
      }
    } catch (error) {
      console.warn(`[Cache L2 Write Error] ${key}:`, error);
    }
  }

  /**
   * 生成缓存键
   */
  static generateKey(
    domain: string,
    prompt: string,
    modelIds?: string[]
  ): string {
    const content = [domain, prompt, modelIds?.join(',') || ''].join('::');
    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为 32 bit 整数
    }
    return `prompt:${domain}:${Math.abs(hash)}`;
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return this.l1.getStats();
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.l1.clear();
    if (typeof window !== 'undefined') {
      const keys = Object.keys(window.localStorage || {}).filter((k) =>
        k.startsWith('cache:')
      );
      keys.forEach((k) => window.localStorage?.removeItem(k));
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.l1.destroy();
  }
}

export default {
  MemoryCache,
  MultiLayerCache,
};
