import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Switch,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import Slider from '@react-native-community/slider';
import { loadSettings, saveSettings, RecordingSettings, defaultSettings } from '../utils/settingsUtils';

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
  const [focusMode, setFocusMode] = useState<'auto' | 'manual'>('manual');
  const [focus, setFocus] = useState(0.5);
  const [whiteBalanceMode, setWhiteBalanceMode] = useState<'auto' | 'manual'>('manual');
  const [whiteBalance, setWhiteBalance] = useState(5000);
  const [zoom, setZoom] = useState(1);

  const [selectedLens, setSelectedLens] = useState('1x');
  const [lensExpanded, setLensExpanded] = useState(false);
  const [resolutionExpanded, setResolutionExpanded] = useState(false);
  const [frameRateExpanded, setFrameRateExpanded] = useState(false);

  const lensOptions = ['0.5x', '1x', '2x', '3x'];
  const resolutionOptions: Array<'720p' | '1080p' | '4K'> = ['720p', '1080p', '4K'];
  const frameRateOptions = [24, 30, 60];

  const [currentHp, setCurrentHp] = useState();
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

  useEffect(() => {
    const initializeSettings = async () => {
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);
      setSelectedLens('1x');
      setZoom(1);
      setIsLoadingSettings(false);
    };

    initializeSettings();
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission === 'denied') {
      console.log('Camera permission denied');
    }
  };

  const startRecording = () => {
    navigation.navigate('Recording', {
      settings,
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

  const SettingRow = ({
    icon,
    label,
    color,
    children
  }: {
    icon: string;
    label: string;
    color: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {children}
    </View>
  );

  const AutoManualToggle = ({
    mode,
    onToggle
  }: {
    mode: 'auto' | 'manual';
    onToggle: (mode: 'auto' | 'manual') => void;
  }) => (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[styles.toggleButton, mode === 'auto' && styles.toggleButtonActive]}
        onPress={() => onToggle('auto')}
      >
        <Text style={[styles.toggleButtonText, mode === 'auto' && styles.toggleButtonTextActive]}>Auto</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, mode === 'manual' && styles.toggleButtonActive]}
        onPress={() => onToggle('manual')}
      >
        <Text style={[styles.toggleButtonText, mode === 'manual' && styles.toggleButtonTextActive]}>Manual</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoadingSettings) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14B8A6" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

    
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Camera Preview</Text>
          <View style={styles.cameraContainer}>
            <Camera
              key={`${settings.video.resolution}-${settings.frameRate.fps}`}
              ref={camera}
              style={styles.camera}
              device={device}
              format={format}
              isActive={true}
              photo={true}
              video={true}
              zoom={zoom}
            />
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraStats}>{settings.video.resolution} • {settings.frameRate.fps}Fps • {selectedLens}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>Camera Settings</Text>

          <View style={styles.settingCard}>
            <SettingRow icon="☀️" label="Exposure" color="#F59E0B">
              <AutoManualToggle mode={exposureMode} onToggle={setExposureMode} />
            </SettingRow>
            {exposureMode === 'manual' && (
              <>
                <Slider
                  style={styles.slider}
                  minimumValue={-2}
                  maximumValue={2}
                  value={exposure}
                  onValueChange={setExposure}
                  minimumTrackTintColor="#0EA5E9"
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor="#0EA5E9"
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>Low</Text>
                  <Text style={styles.sliderLabel}>High</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.settingCard}>
            <SettingRow icon="◉" label="ISO" color="#8B5CF6">
              <AutoManualToggle mode={isoMode} onToggle={setIsoMode} />
            </SettingRow>
            {isoMode === 'manual' && (
              <>
                <Slider
                  style={styles.slider}
                  minimumValue={100}
                  maximumValue={3200}
                  value={iso}
                  onValueChange={setIso}
                  minimumTrackTintColor="#0EA5E9"
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor="#0EA5E9"
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>Less Sensitivity</Text>
                  <Text style={styles.sliderLabel}>More Sensitivity</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.settingCard}>
            <SettingRow icon="HDR" label="HDR" color="#10B981">
              <Switch
                value={hdr}
                onValueChange={setHdr}
                trackColor={{ false: '#E5E7EB', true: '#14B8A6' }}
                thumbColor="#fff"
              />
            </SettingRow>
          </View>

          <View style={styles.settingCard}>
            <SettingRow icon="⊕" label="Lens" color="#84CC16">
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => setLensExpanded(!lensExpanded)}
              >
                <Text style={styles.dropdownText}>{selectedLens}</Text>
                <Text style={styles.dropdownArrow}>{lensExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            </SettingRow>
            {lensExpanded && (
              <View style={styles.dropdownOptions}>
                {lensOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownOption,
                      selectedLens === option && styles.dropdownOptionSelected
                    ]}
                    onPress={() => handleLensChange(option)}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      selectedLens === option && styles.dropdownOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.settingCard}>
            <SettingRow icon="▦" label="Resolution" color="#84CC16">
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => setResolutionExpanded(!resolutionExpanded)}
              >
                <Text style={styles.dropdownText}>{settings.video.resolution}</Text>
                <Text style={styles.dropdownArrow}>{resolutionExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            </SettingRow>
            {resolutionExpanded && (
              <View style={styles.dropdownOptions}>
                {resolutionOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownOption,
                      settings.video.resolution === option && styles.dropdownOptionSelected
                    ]}
                    onPress={() => handleResolutionChange(option)}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      settings.video.resolution === option && styles.dropdownOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.settingCard}>
            <SettingRow icon="▦" label="Frame Rate" color="#84CC16">
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => setFrameRateExpanded(!frameRateExpanded)}
              >
                <Text style={styles.dropdownText}>{settings.frameRate.fps}fps</Text>
                <Text style={styles.dropdownArrow}>{frameRateExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            </SettingRow>
            {frameRateExpanded && (
              <View style={styles.dropdownOptions}>
                {frameRateOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownOption,
                      settings.frameRate.fps === option && styles.dropdownOptionSelected
                    ]}
                    onPress={() => handleFrameRateChange(option)}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      settings.frameRate.fps === option && styles.dropdownOptionTextSelected
                    ]}>
                      {option}fps
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.settingCard}>
            <SettingRow icon="◎" label="Focus" color="#3B82F6">
              <AutoManualToggle mode={focusMode} onToggle={setFocusMode} />
            </SettingRow>
            {focusMode === 'manual' && (
              <>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={focus}
                  onValueChange={setFocus}
                  minimumTrackTintColor="#0EA5E9"
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor="#0EA5E9"
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>Near</Text>
                  <Text style={styles.sliderLabel}>Far</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.settingCard}>
            <SettingRow icon="◐" label="White Balance" color="#EC4899">
              <AutoManualToggle mode={whiteBalanceMode} onToggle={setWhiteBalanceMode} />
            </SettingRow>
            {whiteBalanceMode === 'manual' && (
              <>
                <Slider
                  style={styles.slider}
                  minimumValue={2000}
                  maximumValue={8000}
                  value={whiteBalance}
                  onValueChange={setWhiteBalance}
                  minimumTrackTintColor="#0EA5E9"
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor="#0EA5E9"
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>Warm Temperature</Text>
                  <Text style={styles.sliderLabel}>Cold Temperature</Text>
                </View>
              </>
            )}
          </View>
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
    paddingBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  logoText: {
    fontSize: 40,
  },
  loadingText: {
    color: '#000',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  previewSection: {
    paddingHorizontal: 20,
    marginTop: 10
  },
  previewLabel: {
    fontSize: 20,
    color: '#000',
    marginBottom: 8,
  },
  cameraContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cameraStats: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  recordButton: {
    backgroundColor: '#000',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    width: '80%',
    alignSelf: 'center',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    marginTop: 20,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
  },
  settingLabel: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: '#14B8A6',
  },
  toggleButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 0,
    marginBottom: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  sliderLabelDisabled: {
    color: '#D1D5DB',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 8,
  },
  dropdownText: {
    fontSize: 11,
    color: '#6B7280',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  dropdownOptions: {
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 4,
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 2,
  },
  dropdownOptionSelected: {
    backgroundColor: '#14B8A6',
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  dropdownOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default HomeScreen;
