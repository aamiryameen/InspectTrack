import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';

interface UseRecordingTimerReturn {
  recordingTime: number;
  pulseAnim: Animated.Value;
  startTimer: (startTimestamp?: number) => void;
  stopTimer: () => void;
  resetTimer: () => void;
  formatTime: (seconds: number) => string;
}

export const useRecordingTimer = (isRecording: boolean): UseRecordingTimerReturn => {
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const startTimer = useCallback((startTimestamp?: number) => {
    const startTime = startTimestamp || Date.now();
    startTimestampRef.current = startTime;
    
    // Clear any existing interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Update immediately to show correct time from start
    const updateTime = () => {
      if (startTimestampRef.current) {
        const elapsed = Math.floor((Date.now() - startTimestampRef.current) / 1000);
        setRecordingTime(elapsed);
      }
    };
    
    // Set initial time immediately
    setRecordingTime(0);
    
    // Update every 100ms for smooth, accurate time display
    timerRef.current = setInterval(updateTime, 100);
    
    // Force an immediate update after a tiny delay to ensure React state update
    setTimeout(updateTime, 10);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimestampRef.current = null;
  }, []);

  const resetTimer = useCallback(() => {
    setRecordingTime(0);
    startTimestampRef.current = null;
  }, []);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    recordingTime,
    pulseAnim,
    startTimer,
    stopTimer,
    resetTimer,
    formatTime,
  };
};

