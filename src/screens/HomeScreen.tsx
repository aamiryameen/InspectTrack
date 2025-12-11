import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import Orientation from 'react-native-orientation-locker';
import {
  loadSettings,
  saveSettings,
  RecordingSettings,
  defaultSettings,
} from '../utils/settingsUtils';
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
  const [exposureMin, setExposureMin] = useState(defaultSettings.camera.exposureMin);
  const [exposureMax, setExposureMax] = useState(defaultSettings.camera.exposureMax);
  const [isoMode, setIsoMode] = useState<'auto' | 'manual'>('manual');
  const [iso, setIso] = useState(100);
  const [isoMin, setIsoMin] = useState(100);
  const [isoMax, setIsoMax] = useState(3200);
  const [hdr, setHdr] = useState(false);
  const [tapToFocusEnabled, setTapToFocusEnabled] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedResolution, setSelectedResolution] = useState<'720p' | '1080p' | '4K'>('1080p');
  const [selectedFrameRate, setSelectedFrameRate] = useState(30);

  const resolveFallbackExposure = (
    candidate: number | undefined,
    stored: number | undefined,
    defaultValue: number,
  ) => {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof stored === 'number' && Number.isFinite(stored)) {
      return stored;
    }
    return defaultValue;
  };

  const fallbackMin = resolveFallbackExposure(
    device?.minExposure,
    settings.camera.exposureMin,
    defaultSettings.camera.exposureMin,
  );
  const fallbackMax = resolveFallbackExposure(
    device?.maxExposure,
    settings.camera.exposureMax,
    defaultSettings.camera.exposureMax,
  );

  let hardwareMinExposure = fallbackMin;
  let hardwareMaxExposure = fallbackMax;
  if (hardwareMinExposure > hardwareMaxExposure) {
    hardwareMinExposure = hardwareMaxExposure;
  }
  const getExposureMidpoint = (minVal: number, maxVal: number) => {
    const midpoint = (minVal + maxVal) / 2;
    return Math.max(hardwareMinExposure, Math.min(midpoint, hardwareMaxExposure));
  };
  console.log('hardwareMinExposure', hardwareMinExposure);
  console.log('hardwareMaxExposure', hardwareMaxExposure);

  const [selectedLens, setSelectedLens] = useState('1x');
  const [lensExpanded, setLensExpanded] = useState(false);
  const [resolutionExpanded, setResolutionExpanded] = useState(false);
  const [frameRateExpanded, setFrameRateExpanded] = useState(false);

  const lensOptions = ['0.5x', '1x', '2x', '3x'];
  const resolutionOptions: Array<'720p' | '1080p' | '4K'> = ['720p', '1080p', '4K'];

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
  
  const frameRateOptions = [24, 30, 60];
  
  const format = useCameraFormat(device, [
    { videoResolution: resolution },
    { fps: settings.frameRate.fps }
  ]);

  const getMaxSupportedFps = (): number => {
    if (!device?.formats) return 60;
    const matchingFormats = device.formats.filter(
      f => f.videoWidth === resolution.width && f.videoHeight === resolution.height
    );
    if (matchingFormats.length === 0) return 60;
    return Math.max(...matchingFormats.map(f => f.maxFps));
  };

  const getMinSupportedFps = (): number => {
    if (!device?.formats) return 24;
    const matchingFormats = device.formats.filter(
      f => f.videoWidth === resolution.width && f.videoHeight === resolution.height
    );
    if (matchingFormats.length === 0) return 24;
    return Math.min(...matchingFormats.map(f => f.minFps));
  };

  const validateAndAdjustFps = (fps: number): number => {
    const maxFps = getMaxSupportedFps();
    const minFps = getMinSupportedFps();
    if (fps > maxFps) {
      console.log(`📹 Clamping fps from ${fps} to max ${maxFps}`);
      return maxFps;
    }
    if (fps < minFps) {
      console.log(`📹 Clamping fps from ${fps} to min ${minFps}`);
      return minFps;
    }
    return fps;
  };

  useEffect(() => {
    const maxSupportedFps = getMaxSupportedFps();
    if (settings.frameRate.fps > maxSupportedFps) {
      console.log(`📹 Auto-adjusting fps from ${settings.frameRate.fps} to ${maxSupportedFps} (max supported)`);
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
  }, [device?.formats, settings.video.resolution]);

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
      let updatedSettings = loadedSettings;
      let shouldPersist = false;

      let nextFrameRate = updatedSettings.frameRate.fps;

      if (device) {
        const validatedFps = validateAndAdjustFps(updatedSettings.frameRate.fps);
        nextFrameRate = validatedFps;

        if (validatedFps !== updatedSettings.frameRate.fps) {
          updatedSettings = {
            ...updatedSettings,
            frameRate: {
              ...updatedSettings.frameRate,
              fps: validatedFps,
            },
          };
          shouldPersist = true;
        }
      }

      setSelectedFrameRate(nextFrameRate);

      if (updatedSettings.camera) {
        const rawMin = updatedSettings.camera.exposureMin ?? defaultSettings.camera.exposureMin;
        const rawMax = updatedSettings.camera.exposureMax ?? defaultSettings.camera.exposureMax;
        const boundedMin = Math.max(hardwareMinExposure, Math.min(rawMin, hardwareMaxExposure));
        const boundedMax = Math.max(boundedMin, Math.min(rawMax, hardwareMaxExposure));
        const existingExposure =
          typeof updatedSettings.camera.exposure === 'number'
            ? updatedSettings.camera.exposure
            : defaultSettings.camera.exposure;
        const boundedExposure = getExposureMidpoint(boundedMin, boundedMax);

        if (
          boundedMin !== updatedSettings.camera.exposureMin ||
          boundedMax !== updatedSettings.camera.exposureMax ||
          boundedExposure !== updatedSettings.camera.exposure
        ) {
          updatedSettings = {
            ...updatedSettings,
            camera: {
              ...updatedSettings.camera,
              exposureMin: boundedMin,
              exposureMax: boundedMax,
              exposure: boundedExposure,
            },
          };
          shouldPersist = true;
        }

        setExposureMode(updatedSettings.camera.exposureMode);
        setIsoMode(updatedSettings.camera.isoMode);
        setIso(updatedSettings.camera.iso);
        setIsoMin(updatedSettings.camera.isoMin ?? updatedSettings.camera.iso ?? 100);
        setIsoMax(updatedSettings.camera.isoMax ?? 3200);
        setHdr(updatedSettings.camera.hdr || false);
        setTapToFocusEnabled(updatedSettings.camera.tapToFocusEnabled ?? true);
        setExposureMin(boundedMin);
        setExposureMax(boundedMax);
        setExposure(boundedExposure);
      }

      setSettings(updatedSettings);
      setSelectedResolution(updatedSettings.video.resolution);
      setSelectedLens('1x');
      setZoom(1);

      if (shouldPersist) {
        await saveSettings(updatedSettings);
      }

      setIsLoadingSettings(false);
    };

    initializeSettings();
    requestCameraPermission();
  }, [device, hardwareMinExposure, hardwareMaxExposure]);

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
        isoMin,
        isoMax,
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
    console.log(`📹 [handleFrameRateChange] User selected ${fps} fps`);

    const maxFps = getMaxSupportedFps();
    const minFps = getMinSupportedFps();

    console.log(`📹 [handleFrameRateChange] Supported range: ${minFps}-${maxFps} fps`);

    if (fps >= minFps && fps <= maxFps) {
      console.log(`📹 [handleFrameRateChange] ${fps} fps is within supported range, applying directly`);
      const newSettings = {
        ...settings,
        frameRate: {
          ...settings.frameRate,
          fps: fps,
        },
      };
      setSettings(newSettings);
      setSelectedFrameRate(fps);
      await saveSettings(newSettings);
      setFrameRateExpanded(false);
    } else {
      const validatedFps = validateAndAdjustFps(fps);
      console.log(`📹 [handleFrameRateChange] Adjusted ${fps} fps to ${validatedFps} fps`);
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
    }
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
    const boundedValue = Math.max(hardwareMinExposure, Math.min(value, hardwareMaxExposure));
    const clampedValue = Math.max(exposureMin, Math.min(boundedValue, exposureMax));
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
    const upperBound = Math.min(exposureMax, hardwareMaxExposure);
    const clampedValue = Math.max(hardwareMinExposure, Math.min(value, upperBound));
    setExposureMin(clampedValue);
    const newExposure = getExposureMidpoint(clampedValue, exposureMax);
    setExposure(newExposure);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        exposureMin: clampedValue,
        exposure: newExposure,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleExposureMaxChange = async (value: number) => {
    const lowerBound = Math.max(exposureMin, hardwareMinExposure);
    const clampedValue = Math.min(hardwareMaxExposure, Math.max(value, lowerBound));
    setExposureMax(clampedValue);
    const newExposure = getExposureMidpoint(exposureMin, clampedValue);
    setExposure(newExposure);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        exposureMax: clampedValue,
        exposure: newExposure,
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

  const handleIsoMinChange = async (value: number) => {
    setIsoMin(value);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        isoMin: value,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleIsoMaxChange = async (value: number) => {
    setIsoMax(value);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        isoMax: value,
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

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
              minLimit={hardwareMinExposure}
              maxLimit={hardwareMaxExposure}
              device={device}
              onModeChange={handleExposureModeChange}
              onExposureMinChange={handleExposureMinChange}
              onExposureMaxChange={handleExposureMaxChange}
            />

            <ISOSetting
              isoMode={isoMode}
              isoMin={isoMin}
              isoMax={isoMax}
              format={format}
              onModeChange={handleIsoModeChange}
              onIsoMinChange={handleIsoMinChange}
              onIsoMaxChange={handleIsoMaxChange}
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
              device={device}
              resolution={resolution}
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
      </KeyboardAvoidingView>
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
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
});

export default HomeScreen;
