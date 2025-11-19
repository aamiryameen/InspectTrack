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
      return JSON.parse(settingsJson);
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

