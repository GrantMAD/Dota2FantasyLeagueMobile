import { useState } from 'react';
import { Image, Text, View } from 'react-native';

interface PlayerAvatarProps {
  uri: string | null;
  label: string;
  size?: number;
}

export function PlayerAvatar({ uri, label, size = 52 }: PlayerAvatarProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showImage = Boolean(uri && failedUri !== uri);

  return (
    <View
      accessibilityLabel={showImage ? label : `${label} image unavailable`}
      className="items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-800"
      style={{ width: size, height: size }}
    >
      {showImage && uri ? (
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={label}
          onError={() => setFailedUri(uri)}
          resizeMode="cover"
          source={{ uri }}
          style={{ width: size, height: size }}
        />
      ) : (
        <Text className="font-bold text-slate-300">{label.trim().slice(0, 1).toUpperCase() || '?'}</Text>
      )}
    </View>
  );
}
