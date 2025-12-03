import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  // Resolve hardware limits from device or props
  const resolvedMinLimit = useMemo(() => {
    if (Number.isFinite(minLimit)) return minLimit;
    if (typeof device?.minExposure === 'number') return device.minExposure;
    return defaultSettings.camera.exposureMin;
  }, [minLimit, device?.minExposure]);

  const resolvedMaxLimit = useMemo(() => {
    if (Number.isFinite(maxLimit)) return maxLimit;
    if (typeof device?.maxExposure === 'number') return device.maxExposure;
    return defaultSettings.camera.exposureMax;
  }, [maxLimit, device?.maxExposure]);

  // Ensure min is always <= max for hardware limits
  const allowedMinExposure = Math.min(resolvedMinLimit, resolvedMaxLimit);
  const allowedMaxExposure = Math.max(resolvedMinLimit, resolvedMaxLimit);

  // Calculate current exposure midpoint (what gets applied to camera)
  const currentExposureValue = useMemo(() => {
    const midpoint = (exposureMin + exposureMax) / 2;
    return Math.max(allowedMinExposure, Math.min(midpoint, allowedMaxExposure));
  }, [exposureMin, exposureMax, allowedMinExposure, allowedMaxExposure]);

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

  const validateExposureValue = (
    value: number,
    isMin: boolean,
  ): { isValid: boolean; error: string | null; sanitizedValue: number } => {
    // Check hardware bounds first
    if (value < allowedMinExposure - EXPOSURE_TOLERANCE) {
      return {
        isValid: false,
        error: `Must be ≥ EV ${formatExposureValue(allowedMinExposure)} (device min)`,
        sanitizedValue: allowedMinExposure,
      };
    }

    if (value > allowedMaxExposure + EXPOSURE_TOLERANCE) {
      return {
        isValid: false,
        error: `Must be ≤ EV ${formatExposureValue(allowedMaxExposure)} (device max)`,
        sanitizedValue: allowedMaxExposure,
      };
    }

    // Check min/max relationship
    if (isMin && value > exposureMax + EXPOSURE_TOLERANCE) {
      return {
        isValid: false,
        error: `Min must be ≤ max (EV ${formatExposureValue(exposureMax)})`,
        sanitizedValue: exposureMax,
      };
    }

    if (!isMin && value < exposureMin - EXPOSURE_TOLERANCE) {
      return {
        isValid: false,
        error: `Max must be ≥ min (EV ${formatExposureValue(exposureMin)})`,
        sanitizedValue: exposureMin,
      };
    }

    // Clamp to valid range
    const sanitizedValue = Math.min(allowedMaxExposure, Math.max(allowedMinExposure, value));
    return { isValid: true, error: null, sanitizedValue };
  };

  const commitMinExposure = (override?: string) => {
    const value = typeof override === 'string' ? override : minInput;
    const parsed = parseInputValue(value);
    
    if (parsed === null) {
      setMinError('Enter a numeric value.');
      return;
    }

    const validation = validateExposureValue(parsed, true);
    
    if (!validation.isValid) {
      setMinError(validation.error);
      return;
    }

    setMinError(null);
    onExposureMinChange(validation.sanitizedValue);
  };

  const commitMaxExposure = (override?: string) => {
    const value = typeof override === 'string' ? override : maxInput;
    const parsed = parseInputValue(value);
    
    if (parsed === null) {
      setMaxError('Enter a numeric value.');
      return;
    }

    const validation = validateExposureValue(parsed, false);
    
    if (!validation.isValid) {
      setMaxError(validation.error);
      return;
    }

    setMaxError(null);
    onExposureMaxChange(validation.sanitizedValue);
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
          
          {/* Device capability info */}
          <View style={styles.deviceInfoContainer}>
            <Text style={styles.deviceInfoText}>
              Device range: EV {formatExposureValue(allowedMinExposure)} to EV {formatExposureValue(allowedMaxExposure)}
            </Text>
          </View>

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
                placeholder={`Enter Minimum Exposure`}
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
                placeholder={`Enter Maximum Exposure`}
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

// Helper function to format exposure values for display
const formatExposureValue = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const fixed = value.toFixed(2);
  return fixed.replace(/\.?0+$/, '') || '0';
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
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  deviceInfoContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  deviceInfoText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
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
  currentExposureContainer: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
  },
  currentExposureLabel: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentExposureValue: {
    fontSize: 20,
    color: '#047857',
    fontWeight: '700',
    marginTop: 4,
  },
  currentExposureHint: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
});

