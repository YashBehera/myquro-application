import React, { useState } from 'react';
import { View, StyleSheet, Image, ImageProps } from 'react-native';
import { SkeletonLoader } from './SkeletonLoader';

interface LazyImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  style?: any;
  borderRadius?: number;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  source,
  style,
  borderRadius = 0,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const finalBorderRadius = borderRadius || (flattenedStyle as any).borderRadius || 0;

  return (
    <View style={[styles.container, style, { borderRadius: finalBorderRadius, overflow: 'hidden' }]}>
      {isLoading && (
        <SkeletonLoader
          width="100%"
          height="100%"
          borderRadius={finalBorderRadius}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <Image
        source={source}
        style={StyleSheet.absoluteFillObject}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
});
