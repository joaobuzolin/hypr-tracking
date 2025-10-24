import { useEffect } from 'react';

// Hook para pré-carregar páginas do breadcrumb
export const usePreloadPages = () => {
  useEffect(() => {
    // Pré-carrega as páginas principais quando o app carrega
    const preloadPages = async () => {
      try {
        // Preload das páginas mais comuns
        await Promise.all([
          import('../pages/InsertionOrders'),
          import('../pages/Campanhas'),
          import('../pages/Criativos'),
        ]);
      } catch (error) {
        // Silently fail - não queremos quebrar o app por causa do preload
        console.debug('Preload pages failed:', error);
      }
    };

    // Use requestIdleCallback for better performance (fallback to setTimeout)
    if ('requestIdleCallback' in window) {
      const idleCallbackId = requestIdleCallback(() => preloadPages(), { timeout: 2000 });
      return () => cancelIdleCallback(idleCallbackId);
    } else {
      const timeoutId = setTimeout(preloadPages, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, []);
};