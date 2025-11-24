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
  const frameRateOptions = [24, 30, 60];

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
  
  // Select camera format based on resolution and fps
  const format = useCameraFormat(device, [
    { videoResolution: resolution },
    { fps: settings.frameRate.fps }
  ]);

  // Debug: Log all available formats to understand HDR support
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
      setSettings(loadedSettings);
      
      // Load camera settings
      if (loadedSettings.camera) {
        setExposureMode(loadedSettings.camera.exposureMode);
        setExposure(loadedSettings.camera.exposure);
        setIsoMode(loadedSettings.camera.isoMode);
        setIso(loadedSettings.camera.iso);
        setHdr(loadedSettings.camera.hdr || false);
        setTapToFocusEnabled(loadedSettings.camera.tapToFocusEnabled ?? true);
      }
      
      // Load video/frame rate settings
      setSelectedResolution(loadedSettings.video.resolution);
      setSelectedFrameRate(loadedSettings.frameRate.fps);
      
      setSelectedLens('1x');
      setZoom(1);
      setIsLoadingSettings(false);
    };

    initializeSettings();
    requestCameraPermission();
  }, []);

  // Lock orientation to portrait mode
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
    // Sync all current settings before navigation
    const currentSettings: RecordingSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        exposureMode,
        exposure,
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
    const newSettings = {
      ...settings,
      frameRate: {
        ...settings.frameRate,
        fps,
      },
    };
    setSettings(newSettings);
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
    setExposure(value);
    const newSettings = {
      ...settings,
      camera: {
        ...settings.camera,
        exposure: value,
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Camera device not found</Text>
      </View>
    );
  }


  

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      <View style={styles.header}>

      
      </View>
    
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
            exposure={exposure}
            device={device}
            onModeChange={handleExposureModeChange}
            onExposureChange={handleExposureChange}
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
    </View>
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
