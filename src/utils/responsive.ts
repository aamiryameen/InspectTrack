import { Dimensions, Platform, ScaledSize } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;
export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

export const isLandscape = (): boolean => {
  const { width, height } = Dimensions.get('window');
  return width > height;
};

export const getDimensions = (): ScaledSize => {
  return Dimensions.get('window');
};

export const scale = (size: number): number => {
  const { width } = Dimensions.get('window');
  return (width / guidelineBaseWidth) * size;
};

export const verticalScale = (size: number): number => {
  const { height } = Dimensions.get('window');
  return (height / guidelineBaseHeight) * size;
};

export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

export const responsiveFontSize = (size: number): number => {
  const landscape = isLandscape();
  const { width, height } = Dimensions.get('window');
  
  const baseDimension = landscape ? Math.min(width, height) : width;
  const baseSize = landscape ? guidelineBaseHeight : guidelineBaseWidth;
  
  const scaledSize = (baseDimension / baseSize) * size;
  
  const maxScale = landscape ? 1.2 : 1.5;
  const minScale = 0.8;
  
  const finalSize = Math.max(
    size * minScale,
    Math.min(scaledSize, size * maxScale)
  );
  
  return Math.round(finalSize);
};

export const getFontFamily = (fontWeight: 'normal' | 'bold' | '600' | '700' = 'normal'): string => {
  if (Platform.OS === 'ios') {
    if (fontWeight === 'bold' || fontWeight === '700') {
      return 'System';
    }
    return 'System';
  }
  if (fontWeight === 'bold' || fontWeight === '700') {
    return 'sans-serif-medium';
  }
  if (fontWeight === '600') {
    return 'sans-serif-medium';
  }
  return 'sans-serif';
};

export const responsiveSpacing = (size: number): number => {
  const landscape = isLandscape();
  const factor = landscape ? 0.7 : 1;
  return scale(size) * factor;
};

