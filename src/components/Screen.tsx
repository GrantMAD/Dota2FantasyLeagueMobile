import { createContext, useContext, type PropsWithChildren } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NetworkStatusBanner } from '@/src/lib/connectivity';

export const GlobalHeaderContext = createContext(false);

export function Screen({ children }: PropsWithChildren) {
  const hasGlobalHeader = useContext(GlobalHeaderContext);

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={hasGlobalHeader ? ['left', 'right'] : ['top', 'left', 'right']}>
      <NetworkStatusBanner />
      {children}
    </SafeAreaView>
  );
}
