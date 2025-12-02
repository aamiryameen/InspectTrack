import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { CameraDevice } from 'react-native-vision-camera';
import { defaultSettings } from '../../../utils/settingsUtils';
import { SettingRow } from './SettingRow';
import { AutoManualToggle } from './AutoManualToggle';

interface ExposureSettingProps {
  exposureMode: 'auto' | 'manual';
  exposureMin: number;
  exposureMax: number;
  minLimit: number;
  maxLimit: number;
  device: CameraDevice | undefined;
  onModeChange: (mode: 'auto' | 'manual') => void;
  onExposureMinChange: (value: number) => void;
  onExposureMaxChange: (value: number) => void;
}

const EXPOSURE_TOLERANCE = 0.01; // allow slight rounding differences
const VALIDATION_DELAY_MS = 400;

export const ExposureSetting: React.FC<ExposureSettingProps> = ({
  exposureMode,
  exposureMin,
  exposureMax,
  minLimit,
  maxLimit,
  device,
  onModeChange,
  onExposureMinChange,
  onExposureMaxChange,
}) => {
  // Primary source: device's minExposure/maxExposure from Vision Camera
  const deviceMin = typeof device?.minExposure === 'number' ? device.minExposure : null;
  const deviceMax = typeof device?.maxExposure === 'number' ? device.maxExposure : null;

  console.log('device?.minExposure', device?.minExposure)
  console.log('device?.maxExposure', device?.maxExposure)
  console.log('minLimit', minLimit)
  console.log('maxLimit', maxLimit)
  console.log('defaultSettings.camera.exposureMin', defaultSettings.camera.exposureMin)
  console.log('defaultSettings.camera.exposureMax', defaultSettings.camera.exposureMax)

  // Use device values first, then fall back to passed limits, then defaults
  const allowedMinExposure =
    deviceMin !== null
      ? deviceMin
      : Number.isFinite(minLimit)
        ? minLimit
        : defaultSettings.camera.exposureMin;

  const allowedMaxExposure =
    deviceMax !== null
      ? deviceMax
      : Number.isFinite(maxLimit)
        ? maxLimit
        : defaultSettings.camera.exposureMax;

  // Ensure min <= max
  const finalMinExposure = Math.min(allowedMinExposure, allowedMaxExposure);
  const finalMaxExposure = Math.max(allowedMinExposure, allowedMaxExposure);

  const [minInput, setMinInput] = useState(formatExposureValue(exposureMin));
  const [maxInput, setMaxInput] = useState(formatExposureValue(exposureMax));
  const [minError, setMinError] = useState<string | null>(null);
  const [maxError, setMaxError] = useState<string | null>(null);
  const minValidationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxValidationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMinInput(formatExposureValue(exposureMin));
  }, [exposureMin]);

  useEffect(() => {
    setMaxInput(formatExposureValue(exposureMax));
  }, [exposureMax]);

  useEffect(() => {
    return () => {
      if (minValidationTimeout.current) {
        clearTimeout(minValidationTimeout.current);
      }
      if (maxValidationTimeout.current) {
        clearTimeout(maxValidationTimeout.current);
      }
    };
  }, []);

  const parseInputValue = (value: string): number | null => {
    if (value.trim() === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const commitMinExposure = (override?: string) => {
    const value = typeof override === 'string' ? override : minInput;
    const parsed = parseInputValue(value);
    if (parsed === null) {
      setMinError('Enter a numeric value.');
      return;
    }

    if (parsed < finalMinExposure - EXPOSURE_TOLERANCE) {
      setMinError(`Must be ≥ EV ${finalMinExposure.toFixed(2)} (camera min).`);
      return;
    }

    if (parsed > finalMaxExposure + EXPOSURE_TOLERANCE) {
      setMinError(`Must be ≤ EV ${finalMaxExposure.toFixed(2)} (camera max).`);
      return;
    }

    if (parsed > exposureMax) {
      setMinError(`Must be ≤ current max (EV ${exposureMax.toFixed(2)}).`);
      return;
    }

    const sanitizedValue = Math.min(finalMaxExposure, Math.max(finalMinExposure, parsed));
    setMinError(null);
    onExposureMinChange(sanitizedValue);
  };

  const commitMaxExposure = (override?: string) => {
    const value = typeof override === 'string' ? override : maxInput;
    const parsed = parseInputValue(value);
    if (parsed === null) {
      setMaxError('Enter a numeric value.');
      return;
    }

    if (parsed > finalMaxExposure + EXPOSURE_TOLERANCE) {
      setMaxError(`Must be ≤ EV ${finalMaxExposure.toFixed(2)} (camera max).`);
      return;
    }

    if (parsed < finalMinExposure - EXPOSURE_TOLERANCE) {
      setMaxError(`Must be ≥ EV ${finalMinExposure.toFixed(2)} (camera min).`);
      return;
    }

    if (parsed < exposureMin) {
      setMaxError(`Must be ≥ current min (EV ${exposureMin.toFixed(2)}).`);
      return;
    }

    const sanitizedValue = Math.min(finalMaxExposure, Math.max(finalMinExposure, parsed));
    setMaxError(null);
    onExposureMaxChange(sanitizedValue);
  };

  const debounceMinValidation = (value: string) => {
    if (minValidationTimeout.current) {
      clearTimeout(minValidationTimeout.current);
    }
    minValidationTimeout.current = setTimeout(() => {
      commitMinExposure(value);
    }, VALIDATION_DELAY_MS);
  };

  const debounceMaxValidation = (value: string) => {
    if (maxValidationTimeout.current) {
      clearTimeout(maxValidationTimeout.current);
    }
    maxValidationTimeout.current = setTimeout(() => {
      commitMaxExposure(value);
    }, VALIDATION_DELAY_MS);
  };

  return (
    <View style={styles.settingCard}>
      <SettingRow icon="☀️" label="Exposure" color="#F59E0B">
        <AutoManualToggle mode={exposureMode} onToggle={onModeChange} />
      </SettingRow>
      {exposureMode === 'manual' && (
        <>
          <Text style={styles.sectionLabel}>Exposure Range</Text>
          <Text style={styles.rangeInfo}>
            Camera range: EV {finalMinExposure.toFixed(2)} to EV {finalMaxExposure.toFixed(2)}
          </Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Minimum Exposure</Text>
              <TextInput
                style={[styles.textInput, minError && styles.inputError]}
                value={minInput}
                onChangeText={text => {
                  setMinInput(text);
                  if (minError) {
                    setMinError(null);
                  }
                  debounceMinValidation(text);
                }}
                onBlur={() => commitMinExposure()}
                onSubmitEditing={() => commitMinExposure()}
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
                placeholder={`Enter minimum exposure`}
                placeholderTextColor="#9CA3AF"
                testID="exposure-min-input"
              />
           
              {minError && <Text style={styles.errorText}>{minError}</Text>}
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Maximum Exposure</Text>
              <TextInput
                style={[styles.textInput, maxError && styles.inputError]}
                value={maxInput}
                onChangeText={text => {
                  setMaxInput(text);
                  if (maxError) {
                    setMaxError(null);
                  }
                  debounceMaxValidation(text);
                }}
                onBlur={() => commitMaxExposure()}
                onSubmitEditing={() => commitMaxExposure()}
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
                placeholder={`Enter maximum exposure`}
                placeholderTextColor="#9CA3AF"
                testID="exposure-max-input"
              />
          
              {maxError && <Text style={styles.errorText}>{maxError}</Text>}
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  rangeInfo: {
    fontSize: 12,
    color: '#9CA3AF',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputGroup: {
    paddingHorizontal: 16,
  },
  inputCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#F87171',
  },
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 6,
    fontWeight: '600',
  },
});

const formatExposureValue = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const fixed = value.toFixed(2);
  return fixed.replace(/\.?0+$/, '') || '0';
};

