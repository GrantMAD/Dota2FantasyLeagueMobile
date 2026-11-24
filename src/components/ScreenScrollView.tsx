import { forwardRef } from 'react';
import { ScrollView as NativeScrollView, type ScrollViewProps } from 'react-native';

export const ScreenScrollView = forwardRef<NativeScrollView, ScrollViewProps>(
  function ScreenScrollView(props, ref) {
    return <NativeScrollView ref={ref} {...props} showsVerticalScrollIndicator={false} />;
  },
);
