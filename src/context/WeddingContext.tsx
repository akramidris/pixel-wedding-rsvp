import { createContext, useContext, type ReactNode } from 'react';
import type { WeddingConfig } from '../types/wedding';
import type { WeddingRepository } from '../services/storage';

const WeddingContext = createContext<{
  config: WeddingConfig;
  repository: WeddingRepository;
} | null>(null);

export function WeddingProvider({
  config,
  repository,
  children,
}: {
  config: WeddingConfig;
  repository: WeddingRepository;
  children: ReactNode;
}) {
  return (
    <WeddingContext.Provider value={{ config, repository }}>{children}</WeddingContext.Provider>
  );
}

export function useWedding() {
  const wedding = useContext(WeddingContext);
  if (!wedding) throw new Error('Wedding content must be rendered inside WeddingProvider.');
  return wedding;
}
export function useWeddingConfig() {
  return useWedding().config;
}
