// Utilitários de performance para o sistema

// Cache simples para dados estáticos
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const getCachedData = <T>(key: string): T | null => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

export const setCachedData = <T>(key: string, data: T): void => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Fast click para remover delays de mobile
export const fastClick = (callback: () => void) => {
  const handleClick = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    callback();
  };
  
  return handleClick;
};

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Lazy loading para componentes pesados (comentado pois React não está importado)
// export function createLazyComponent<T extends React.ComponentType<any>>(
//   importFunc: () => Promise<{ default: T }>
// ) {
//   return React.lazy(importFunc);
// }

// Memoização profunda para objetos complexos
export function deepMemo<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Batching de requisições
class RequestBatcher {
  private batches = new Map<string, Promise<any>>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  batch<T>(
    key: string,
    request: () => Promise<T>,
    delay: number = 100
  ): Promise<T> {
    // Se já existe uma requisição para esta chave, retorna a promise existente
    if (this.batches.has(key)) {
      return this.batches.get(key);
    }

    // Cria nova promise com delay
    const promise = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.batches.delete(key);
          this.timeouts.delete(key);
        }
      }, delay);

      this.timeouts.set(key, timeout);
    });

    this.batches.set(key, promise);
    return promise;
  }

  cancel(key: string) {
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
    this.batches.delete(key);
  }

  clear() {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.batches.clear();
    this.timeouts.clear();
  }
}

export const requestBatcher = new RequestBatcher();

// Monitor de performance
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics = new Map<string, number[]>();

  static getInstance() {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    this.recordMetric(name, duration);
    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    this.recordMetric(name, duration);
    return result;
  }

  private recordMetric(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metrics = this.metrics.get(name)!;
    metrics.push(duration);
    
    // Manter apenas os últimos 100 registros
    if (metrics.length > 100) {
      metrics.shift();
    }

    // Log para métricas muito lentas
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
  }

  getMetrics(name: string) {
    const metrics = this.metrics.get(name) || [];
    if (metrics.length === 0) return null;

    const avg = metrics.reduce((a, b) => a + b, 0) / metrics.length;
    const min = Math.min(...metrics);
    const max = Math.max(...metrics);

    return { avg, min, max, count: metrics.length };
  }

  getAllMetrics() {
    const result: Record<string, any> = {};
    for (const [name, _] of this.metrics) {
      result[name] = this.getMetrics(name);
    }
    return result;
  }

  reset() {
    this.metrics.clear();
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();