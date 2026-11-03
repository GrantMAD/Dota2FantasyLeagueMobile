import { useState } from 'react';
import { Image, Text, View } from 'react-native';

interface TeamLogoProps {
  logoUrl?: string | null;
  name: string;
  tag?: string;
  size?: number;
  className?: string;
}

export function TeamLogo({
  logoUrl,
  name,
  tag,
  size = 28,
  className = '',
}: TeamLogoProps) {
  const [hasError, setHasError] = useState(false);
  const initials = (tag || name || 'TBA').trim().substring(0, 3).toUpperCase();
  const showImage = Boolean(logoUrl && !hasError);

  return (
    <View
      style={{ width: size, height: size }}
      className={`items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-950 ${className}`}
      accessibilityLabel={`${name} logo`}
    >
      {showImage && logoUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: logoUrl }}
          style={{ width: size - 4, height: size - 4 }}
          resizeMode="contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <Text
          numberOfLines={1}
          style={{ fontSize: Math.max(9, Math.round(size * 0.32)) }}
          className="font-black text-cyan-400 font-mono text-center"
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

