import { ScrollView as NativeScrollView, type ScrollViewProps } from 'react-native';

export function ScreenScrollView(props: ScrollViewProps) {
  return <NativeScrollView {...props} showsVerticalScrollIndicator={false} />;
}
