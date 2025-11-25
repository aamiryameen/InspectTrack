import React, { memo } from 'react';
import { StyleSheet, Animated } from 'react-native';

interface FocusIndicatorProps {
  focusPoint: { x: number; y: number } | null;
  opacity: Animated.Value;
  enabled: boolean;
}

const FocusIndicator: React.FC<FocusIndicatorProps> = memo(({ 
  focusPoint, 
  opacity, 
  enabled 
}) => {
  if (!focusPoint || !enabled) return null;

  return (
    <Animated.View
      style={[
        styles.focusIndicator,
        {
          left: focusPoint.x - 40,
          top: focusPoint.y - 40,
          opacity,
        },
      ]}
    />
  );
});

FocusIndicator.displayName = 'FocusIndicator';

const styles = StyleSheet.create({
  focusIndicator: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 40,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});

export default FocusIndicator;

