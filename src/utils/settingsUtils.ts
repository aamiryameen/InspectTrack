import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecordingSettings {
  frameRate: {
    fps: number;
    captureInterval: number;
    bufferSize: number;
  };
  video: {
    resolution: '720p' | '1080p' | '4K';
    codec: string;
    bitrate: number;
  };
  camera: {
    exposureMode: 'auto' | 'manual';
    exposure: number;
    exposureMin: number;
    exposureMax: number;
    isoMode: 'auto' | 'manual';
    iso: number;
    isoMin: number;
    isoMax: number;
    hdr: boolean;
    tapToFocusEnabled: boolean;
  };
  gps: {
    accuracy: 'low' | 'high';
    updateInterval: number;
    distanceFilter: number;
  };
  storage: {
    minSpace: number;
    autoCleanup: boolean;
    cacheManagement: boolean;
  };
  metadata: {
    format: string;
    timestampFormat: string;
    gpsSync: boolean;
  };
}

export const defaultSettings: RecordingSettings = {
  frameRate: {
    fps: 30,
    captureInterval: 1,
    bufferSize: 50,
  },
  video: {
    resolution: '1080p',
    codec: 'H.264',
    bitrate: 8,
  },
  camera: {
    exposureMode: 'manual',
    exposure: 0,
    exposureMin: 0,
    exposureMax: 0,
    isoMode: 'manual',
    iso: 100,
    isoMin: 100,
    isoMax: 3200,
    hdr: false,
    tapToFocusEnabled: true,
  },
  gps: {
    accuracy: 'high',
    updateInterval: 1,
    distanceFilter: 0,
  },
  storage: {
    minSpace: 500,
    autoCleanup: true,
    cacheManagement: true,
  },
  metadata: {
    format: 'JSON',
    timestampFormat: 'ISO8601',
    gpsSync: true,
  },
};

export const loadSettings = async (): Promise<RecordingSettings> => {
  try {
    const settingsJson = await AsyncStorage.getItem('recordingSettings');
    if (settingsJson) {
      const loadedSettings = JSON.parse(settingsJson);
      // Backward compatibility: add exposureMin and exposureMax if they don't exist
      if (loadedSettings.camera && typeof loadedSettings.camera.exposureMin === 'undefined') {
        loadedSettings.camera.exposureMin = defaultSettings.camera.exposureMin;
      }
      if (loadedSettings.camera && typeof loadedSettings.camera.exposureMax === 'undefined') {
        loadedSettings.camera.exposureMax = defaultSettings.camera.exposureMax;
      }
      // Backward compatibility: add isoMin and isoMax if they don't exist
      if (loadedSettings.camera && typeof loadedSettings.camera.isoMin === 'undefined') {
        loadedSettings.camera.isoMin = loadedSettings.camera.iso ?? defaultSettings.camera.isoMin;
      }
      if (loadedSettings.camera && typeof loadedSettings.camera.isoMax === 'undefined') {
        loadedSettings.camera.isoMax = defaultSettings.camera.isoMax;
      }
      return loadedSettings;
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
};

export const saveSettings = async (settings: RecordingSettings): Promise<boolean> => {
  try {
    await AsyncStorage.setItem('recordingSettings', JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

export const getResolutionDimensions = (resolution: '720p' | '1080p' | '4K'): { width: number; height: number } => {
  switch (resolution) {
    case '720p':
      return { width: 1280, height: 720 };
    case '1080p':
      return { width: 1920, height: 1080 };
    case '4K':
      return { width: 3840, height: 2160 };
    default:
      return { width: 1920, height: 1080 };
  }
};

