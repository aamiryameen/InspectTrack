import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import Orientation from 'react-native-orientation-locker';
import { loadSettings, saveSettings, RecordingSettings, defaultSettings } from '../utils/settingsUtils';
import {
  CameraPreview,
  ExposureSetting,
  ISOSetting,
  HDRSetting,
  FocusSetting,
  WhiteBalanceSetting,
  LensSetting,
  ResolutionSetting,
  FrameRateSetting,
} from './HomeScreen/components';

type RootStackParamList = {
  Home: undefined;
  Recording: {
    settings: RecordingSettings;
    zoom: number;
  };
  Summary: {
    startTime: string;
    endTime: string;
    distance: number;
    duration: number;
    avgCPU: number;
    highestCPU: number;
    avgMemory: number;
    highestMemory: number;
    videoPath: string;
  };
  DownloadFile: undefined;
};

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);

  const [settings, setSettings] = useState<RecordingSettings>(defaultSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const [exposureMode, setExposureMode] = useState<'auto' | 'manual'>('manual');
  const [exposure, setExposure] = useState(0);
  const [exposureMin, setExposureMin] = useState(-2);
  const [exposureMax, setExposureMax] = useState(2);
  const [isoMode, setIsoMode] = useState<'auto' | 'manual'>('manual');
  const [iso, setIso] = useState(100);
  const [hdr, setHdr] = useState(false);
  const [tapToFocusEnabled, setTapToFocusEnabled] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedResolution, setSelectedResolution] = useState<'720p' | '1080p' | '4K'>('1080p');
  const [selectedFrameRate, setSelectedFrameRate] = useState(30);

  const [selectedLens, setSelectedLens] = useState('1x');
  const [lensExpanded, setLensExpanded] = useState(false);
  const [resolutionExpanded, setResolutionExpanded] = useState(false);
  const [frameRateExpanded, setFrameRateExpanded] = useState(false);

  const lensOptions = ['0.5x', '1x', '2x', '3x'];
  const resolutionOptions: Array<'720p' | '1080p' | '4K'> = ['720p', '1080p', '4K'];
  
  const getAvailableFrameRateOptions = (): number[] => {
    const allOptions = [24, 30, 60];
    if (!format) return allOptions;
    return allOptions.filter(fps => fps >= format.minFps && fps <= format.maxFps);
  };
  
  const frameRateOptions = getAvailableFrameRateOptions();

  const getResolutionDimensions = (resolution: '720p' | '1080p' | '4K'): { width: number; height: number } => {
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

  const getZoomLevel = (lens: string): number => {
    switch (lens) {
      case '0.5x':
        return 0.5;
      case '1x':
        return 1;
      case '2x':
        return 2;
      case '3x':
        return 3;
      default:
        return 1;
    }
  };

  const resolution = getResolutionDimensions(settings.video.resolution);
  
  const format = useCameraFormat(device, [
    { videoResolution: resolution },
    { fps: settings.frameRate.fps }
  ]);

  const getMaxSupportedFps = (): number => {
    if (!format) {
      if (!device?.formats) return 30;
      const matchingFormats = device.formats.filter(
        f => f.videoWidth === resolution.width && f.videoHeight === resolution.height
      );
      if (matchingFormats.length === 0) return 30;
      return Math.max(...matchingFormats.map(f => f.maxFps));
    }
    return format.maxFps;
  };

  const validateAndAdjustFps = (fps: number): number => {
    const maxFps = getMaxSupportedFps();
    if (fps > maxFps) {
      return maxFps;
    }
    const minFps = format?.minFps || 24;
    if (fps < minFps) {
      return minFps;
    }
    return fps;
  };

  useEffect(() => {
    if (format && settings.frameRate.fps > format.maxFps) {
      const adjustedFps = validateAndAdjustFps(settings.frameRate.fps);
      const updatedSettings = {
        ...settings,
        frameRate: {
          ...settings.frameRate,
          fps: adjustedFps,
        },
      };
      setSettings(updatedSettings);
      setSelectedFrameRate(adjustedFps);
      saveSettings(updatedSettings);
    }
  }, [format, settings.video.resolution]);

  useEffect(() => {
    if (device?.formats) {
      console.log('📸 Total available formats:', device.formats.length);
      const hdrFormats = device.formats.filter(f => f.supportsVideoHdr || f.supportsPhotoHdr);
      console.log('📸 HDR-capable formats:', hdrFormats.length);
      
      if (hdrFormats.length > 0) {
        console.log('📸 Sample HDR formats:');
        hdrFormats.slice(0, 3).forEach((f, i) => {
          console.log(`  ${i + 1}. ${f.videoWidth}x${f.videoHeight} @ ${f.minFps}-${f.maxFps}fps - Video HDR: ${f.supportsVideoHdr}, Photo HDR: ${f.supportsPhotoHdr}`);
        });
      } else {
        console.log('⚠️ No HDR-capable formats found on this device');
      }
    }
  }, [device]);

  useEffect(() => {
    const initializeSettings = async () => {
      const loadedSettings = await loadSettings();
      
      if (device) {
        const validatedFps = validateAndAdjustFps(loadedSettings.frameRate.fps);
        if (validatedFps !== loadedSettings.frameRate.fps) {
          const updatedSettings = {
            ...loadedSettings,
            frameRate: {
              ...loadedSettings.frameRate,
              fps: validatedFps,
            },
          };
          setSettings(updatedSettings);
          await saveSettings(updatedSettings);
          setSelectedFrameRate(validatedFps);
        } else {
          setSettings(loadedSettings);
          setSelectedFrameRate(loadedSettings.frameRate.fps);
        }
      } else {
        setSettings(loadedSettings);
        setSelectedFrameRate(loadedSettings.frameRate.fps);
      }
      
      if (loadedSettings.camera) {
        setExposureMode(loadedSettings.camera.exposureMode);
        const minExposure = loadedSettings.camera.exposureMin ?? -2;
        const maxExposure = loadedSettings.camera.exposureMax ?? 2;
        setExposureMin(minExposure);
        setExposureMax(maxExposure);
        // Set exposure to midpoint of the range
        const midpoint = (minExposure + maxExposure) / 2;
        setExposure(midpoint);
        setIsoMode(loadedSettings.camera.isoMode);
        setIso(loadedSettings.camera.iso);
        setHdr(loadedSettings.camera.hdr || false);
        setTapToFocusEnabled(loadedSettings.camera.tapToFocusEnabled ?? true);
      }
      
      setSelectedResolution(loadedSettings.video.resolution);
      
      setSelectedLens('1x');
      setZoom(1);
      setIsLoadingSettings(false);
    };

    initializeSettings();
    requestCameraPermission();
  }, [device]);

  useEffect(() => {
    Orientation.lockToPortrait();
    
    return () => {
      Orientation.unlockAllOrientations();
    };
  }, []);

  const requestCameraPermission = async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission === 'denied') {
      console.log('Camera permission denied');
    }
  };

  const startRecording = () => {
      const currentSettings: RecordingSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        exposureMode,
        exposure,
        exposureMin,
        exposureMax,
        isoMode,
        iso,
        hdr,
        tapToFocusEnabled,
      },
      video: {
        ...settings.video,
        resolution: settings.video.resolution,
      },
      frameRate: {
        ...settings.frameRate,
        fps: settings.frameRate.fps,
      },
    };

    console.log('🎬 Starting Recording with Settings:', {
      camera: {
        exposureMode,
        exposure,
        isoMode,
        iso,
        hdr,
        tapToFocusEnabled,
      },
      video: {
        resolution: currentSettings.video.resolution,
        codec: currentSettings.video.codec,
      },
      frameRate: {
        fps: currentSettings.frameRate.fps,
      },
      zoom,
      lens: selectedLens,
    });

    navigation.navigate('Recording', {
      settings: currentSettings,
      zoom,
    });
  };

  const handleLensChange = async (lens: string) => {
    setSelectedLens(lens);
    setZoom(getZoomLevel(lens));
    setLensExpanded(false);
  };

  const handleResolutionChange = async (resolution: '720p' | '1080p' | '4K') => {
    const newSettings = {
      ...settings,
      video: {
        ...settings.video,
        resolution,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
    setResolutionExpanded(false);
  };

  const handleFrameRateChange = async (fps: number) => {
    const validatedFps = validateAndAdjustFps(fps);
    
    const newSettings = {
      ...settings,
      frameRate: {
        ...settings.frameRate,
        fps: validatedFps,
      },
    };
    setSettings(newSettings);
    setSelectedFrameRate(validatedFps);
    await saveSettings(newSettings);
    setFrameRateExpanded(false);
  };

  const handleExposureModeChange = async (mode: 'auto' | 'manual') => {
    setExposureMode(mode);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        exposureMode: mode,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleExposureChange = async (value: number) => {
    // Clamp exposure value between min and max
    const clampedValue = Math.max(exposureMin, Math.min(value, exposureMax));
    setExposure(clampedValue);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        exposure: clampedValue,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleExposureMinChange = async (value: number) => {
    const clampedValue = Math.min(value, exposureMax);
    setExposureMin(clampedValue);
    // Set exposure to midpoint of the range
    const midpoint = (clampedValue + exposureMax) / 2;
    setExposure(midpoint);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        exposureMin: clampedValue,
        exposure: midpoint,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleExposureMaxChange = async (value: number) => {
    const clampedValue = Math.max(value, exposureMin);
    setExposureMax(clampedValue);
    // Set exposure to midpoint of the range
    const midpoint = (exposureMin + clampedValue) / 2;
    setExposure(midpoint);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        exposureMax: clampedValue,
        exposure: midpoint,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleIsoModeChange = async (mode: 'auto' | 'manual') => {
    setIsoMode(mode);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        isoMode: mode,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleIsoChange = async (value: number) => {
    setIso(value);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        iso: value,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleHdrToggle = async (value: boolean) => {
    setHdr(value);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        hdr: value,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleTapToFocusToggle = async (value: boolean) => {
    setTapToFocusEnabled(value);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        tapToFocusEnabled: value,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const navigateToDownloadFile = () => {
    navigation.navigate('DownloadFile');
  };

  if (isLoadingSettings) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Camera device not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      <View style={styles.header}></View>
    
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <CameraPreview
          cameraRef={camera}
          device={device}
          format={format}
          settings={settings}
          zoom={zoom}
          selectedLens={selectedLens}
          hdr={hdr}
          onStartRecording={startRecording}
          onDownloadFile={navigateToDownloadFile}
        />

        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>Camera Settings</Text>

          <ExposureSetting
            exposureMode={exposureMode}
            exposureMin={exposureMin}
            exposureMax={exposureMax}
            device={device}
            onModeChange={handleExposureModeChange}
            onExposureMinChange={handleExposureMinChange}
            onExposureMaxChange={handleExposureMaxChange}
          />

          <ISOSetting
            isoMode={isoMode}
            iso={iso}
            format={format}
            onModeChange={handleIsoModeChange}
            onIsoChange={handleIsoChange}
          />

          <HDRSetting hdr={hdr} format={format} onToggle={handleHdrToggle} />

          <LensSetting
            selectedLens={selectedLens}
            lensOptions={lensOptions}
            isExpanded={lensExpanded}
            device={device}
            format={format}
            zoom={zoom}
            onToggleExpand={() => setLensExpanded(!lensExpanded)}
            onSelectLens={handleLensChange}
          />

          <ResolutionSetting
            resolution={settings.video.resolution}
            resolutionOptions={resolutionOptions}
            isExpanded={resolutionExpanded}
            format={format}
            onToggleExpand={() => setResolutionExpanded(!resolutionExpanded)}
            onSelectResolution={handleResolutionChange}
          />

          <FrameRateSetting
            frameRate={settings.frameRate.fps}
            frameRateOptions={frameRateOptions}
            isExpanded={frameRateExpanded}
            format={format}
            onToggleExpand={() => setFrameRateExpanded(!frameRateExpanded)}
            onSelectFrameRate={handleFrameRateChange}
          />

          <FocusSetting
            tapToFocusEnabled={tapToFocusEnabled}
            device={device}
            onToggle={handleTapToFocusToggle}
          />

          <WhiteBalanceSetting />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  header: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  settingsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    marginTop: 8,
  },
});

export default HomeScreen;
