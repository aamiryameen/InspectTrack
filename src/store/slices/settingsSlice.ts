import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VideoResolution = '720p' | '1080p' | '4K';
export type FrameRate = 24 | 30 | 60;
export type VideoQuality = 'low' | 'medium' | 'high';

export interface AppSettings {
  videoResolution: VideoResolution;
  frameRate: FrameRate;
  videoQuality: VideoQuality;
  gpsSamplingRate: number;
  enableGPSTracking: boolean;
  gyroSmoothingAlpha: number;
  gyroThreshold: number;
  enableGyroscope: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  videoResolution: '1080p',
  frameRate: 30,
  videoQuality: 'high',
  gpsSamplingRate: 33,
  enableGPSTracking: true,
  gyroSmoothingAlpha: 0.1,
  gyroThreshold: 0.05,
  enableGyroscope: true,
};

const SETTINGS_STORAGE_KEY = '@app_settings';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
}

const initialState: SettingsState = {
  settings: DEFAULT_SETTINGS,
  isLoading: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<AppSettings>) => {
      state.settings = action.payload;
    },
    updateSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    resetSettings: (state) => {
      state.settings = DEFAULT_SETTINGS;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setSettings, updateSettings, resetSettings, setLoading } = settingsSlice.actions;

export const loadSettings = () => async (dispatch: any) => {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsedSettings = JSON.parse(stored);
      dispatch(setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings }));
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  } finally {
    dispatch(setLoading(false));
  }
};

export const saveSettings = (settings: Partial<AppSettings>) => async (dispatch: any, getState: any) => {
  try {
    dispatch(updateSettings(settings));
    const updatedSettings = getState().settings.settings;
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

export const resetSettingsAsync = () => async (dispatch: any) => {
  try {
    dispatch(resetSettings());
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  } catch (error) {
    console.error('Error resetting settings:', error);
  }
};

export const getResolutionDimensions = (resolution: VideoResolution): { width: number; height: number } => {
  switch (resolution) {
    case '720p':
      return { width: 1280, height: 720 };
    case '1080p':
      return { width: 1920, height: 1080 };
    case '4K':
      return { width: 3840, height: 2160 };
  }
};

export default settingsSlice.reducer;
