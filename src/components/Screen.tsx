import type { PropsWithChildren } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Screen({ children }: PropsWithChildren) {
  return <SafeAreaView className="flex-1 bg-slate-950" edges={['top', 'left', 'right']}>{children}</SafeAreaView>;
}
