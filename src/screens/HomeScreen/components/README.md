# HomeScreen Components

This folder contains all the modular components for the HomeScreen, organized for better maintainability and reusability.

## Component Structure

### Core UI Components
- **SettingRow.tsx** - Base component for displaying setting rows with icon, label, and controls
- **AutoManualToggle.tsx** - Reusable toggle switch for Auto/Manual modes

### Camera Preview
- **CameraPreview.tsx** - Camera preview section with live feed and record button

### Camera Settings Components
- **ExposureSetting.tsx** - Exposure control with EV slider
- **ISOSetting.tsx** - ISO sensitivity control (saved but not directly applied due to library limitations)
- **HDRSetting.tsx** - HDR toggle switch
- **FocusSetting.tsx** - Focus distance control
- **WhiteBalanceSetting.tsx** - White balance temperature control

### Video Settings Components
- **LensSetting.tsx** - Lens selection dropdown (0.5x, 1x, 2x, 3x)
- **ResolutionSetting.tsx** - Video resolution dropdown (720p, 1080p, 4K)
- **FrameRateSetting.tsx** - Frame rate dropdown (24, 30, 60 fps)

## Usage

All components are exported through `index.ts` for easy importing:

```typescript
import {
  CameraPreview,
  ExposureSetting,
  ISOSetting,
  HDRSetting,
  // ... etc
} from './HomeScreen/components';
```

## Benefits of This Structure

1. **Modularity** - Each setting is isolated in its own component
2. **Reusability** - Components can be reused in other screens
3. **Maintainability** - Easier to find and update specific settings
4. **Testability** - Each component can be tested independently
5. **Readability** - HomeScreen is now cleaner and easier to understand

