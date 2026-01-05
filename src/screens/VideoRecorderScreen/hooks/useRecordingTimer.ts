import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';

interface UseRecordingTimerReturn {
  recordingTime: number;
  pulseAnim: Animated.Value;
  startTimer: (startTimestamp?: number) => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  formatTime: (seconds: number) => string;
}

export const useRecordingTimer = (isRecording: boolean, isPaused?: boolean): UseRecordingTimerReturn => {
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const totalPausedDurationRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const startTimer = useCallback((startTimestamp?: number) => {
    const startTime = startTimestamp || Date.now();
    startTimestampRef.current = startTime;
    pausedTimeRef.current = 0;
    totalPausedDurationRef.current = 0;
    pauseStartTimeRef.current = null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const updateTime = () => {
      if (startTimestampRef.current) {
        const elapsed = Math.floor((Date.now() - startTimestampRef.current - totalPausedDurationRef.current) / 1000);
        setRecordingTime(elapsed);
      }
    };

    setRecordingTime(0);

    timerRef.current = setInterval(updateTime, 100);

    setTimeout(updateTime, 10);
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pauseStartTimeRef.current === null) {
      pauseStartTimeRef.current = Date.now();
    }
  }, []);

  const resumeTimer = useCallback(() => {
    if (pauseStartTimeRef.current !== null && startTimestampRef.current !== null) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      totalPausedDurationRef.current += pauseDuration;
      pauseStartTimeRef.current = null;
    }

    if (startTimestampRef.current && !timerRef.current) {
      const updateTime = () => {
        if (startTimestampRef.current) {
          const elapsed = Math.floor((Date.now() - startTimestampRef.current - totalPausedDurationRef.current) / 1000);
          setRecordingTime(elapsed);
        }
      };

      timerRef.current = setInterval(updateTime, 100);
      setTimeout(updateTime, 10);
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimestampRef.current = null;
    pausedTimeRef.current = 0;
    totalPausedDurationRef.current = 0;
    pauseStartTimeRef.current = null;
  }, []);

  const resetTimer = useCallback(() => {
    setRecordingTime(0);
    startTimestampRef.current = null;
    pausedTimeRef.current = 0;
    totalPausedDurationRef.current = 0;
    pauseStartTimeRef.current = null;
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
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
  }, [isRecording, isPaused, pulseAnim]);

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
    pauseTimer,
    resumeTimer,
    resetTimer,
    formatTime,
  };
};
