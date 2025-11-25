package com.inspecttrack;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Debug;
import android.os.Environment;
import android.os.Process;
import android.os.StatFs;
import android.os.SystemClock;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.module.annotations.ReactModule;

import java.io.RandomAccessFile;

@ReactModule(name = CpuUsageModule.NAME)
public class CpuUsageModule extends ReactContextBaseJavaModule {
    public static final String NAME = "CpuUsageModule";
    
    private long previousThreadCpuTime = 0;
    private long previousElapsedTime = 0;
    private float lastCpuUsage = 0;
    private long previousTotalCpuTime = 0;
    private long previousIdleCpuTime = 0;

    public CpuUsageModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void getCpuUsage(Promise promise) {
        try {
            float cpuUsage = calculateSystemCpuUsage();
            promise.resolve((double) cpuUsage);
        } catch (Exception e) {
            promise.reject("CPU_ERROR", "Failed to get CPU usage: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getAppCpuUsage(Promise promise) {
        try {
            float appCpuUsage = calculateAppCpuUsage();
            promise.resolve((double) appCpuUsage);
        } catch (Exception e) {
            promise.reject("CPU_ERROR", "Failed to get app CPU usage: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getMemoryUsage(Promise promise) {
        try {
            Debug.MemoryInfo memoryInfo = new Debug.MemoryInfo();
            Debug.getMemoryInfo(memoryInfo);
            long appMemoryMB = memoryInfo.getTotalPss() / 1024;
            promise.resolve((double) appMemoryMB);
        } catch (Exception e) {
            promise.reject("MEMORY_ERROR", "Failed to get memory usage: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getStorageInfo(Promise promise) {
        try {
            StatFs statFs = new StatFs(Environment.getDataDirectory().getPath());
            
            long totalBytes = statFs.getTotalBytes();
            long freeBytes = statFs.getAvailableBytes();
            long usedBytes = totalBytes - freeBytes;
            
            double usedGB = usedBytes / (1024.0 * 1024.0 * 1024.0);
            double totalGB = totalBytes / (1024.0 * 1024.0 * 1024.0);
            
            WritableMap result = Arguments.createMap();
            result.putDouble("usedGB", usedGB);
            result.putDouble("totalGB", totalGB);
            
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("STORAGE_ERROR", "Failed to get storage info: " + e.getMessage());
        }
    }

    private float calculateAppCpuUsage() {
        try {
            long currentThreadCpuTime = Debug.threadCpuTimeNanos();
            long currentElapsedTime = SystemClock.elapsedRealtimeNanos();
            
            if (previousThreadCpuTime == 0 || previousElapsedTime == 0) {
                previousThreadCpuTime = currentThreadCpuTime;
                previousElapsedTime = currentElapsedTime;
                return getProcessCpuUsage();
            }
            
            long cpuTimeDelta = currentThreadCpuTime - previousThreadCpuTime;
            long elapsedTimeDelta = currentElapsedTime - previousElapsedTime;
            
            previousThreadCpuTime = currentThreadCpuTime;
            previousElapsedTime = currentElapsedTime;
            
            if (elapsedTimeDelta <= 0) {
                return lastCpuUsage;
            }
            
            float cpuUsage = (float) cpuTimeDelta / (float) elapsedTimeDelta * 100f;
            float processCpuUsage = getProcessCpuUsage();
            
            float finalUsage = Math.max(cpuUsage, processCpuUsage);
            finalUsage = Math.max(0, Math.min(100, finalUsage));
            
            lastCpuUsage = lastCpuUsage * 0.3f + finalUsage * 0.7f;
            
            return lastCpuUsage;
        } catch (Exception e) {
            return getProcessCpuUsage();
        }
    }
    
    private float getProcessCpuUsage() {
        try {
            int pid = Process.myPid();
            RandomAccessFile reader = new RandomAccessFile("/proc/" + pid + "/stat", "r");
            String line = reader.readLine();
            reader.close();
            
            if (line == null) {
                return lastCpuUsage;
            }
            
            String[] parts = line.split(" ");
            if (parts.length < 15) {
                return lastCpuUsage;
            }
            
            long utime = Long.parseLong(parts[13]);
            long stime = Long.parseLong(parts[14]);
            long processCpuTime = utime + stime;
            
            RandomAccessFile uptimeReader = new RandomAccessFile("/proc/uptime", "r");
            String uptimeLine = uptimeReader.readLine();
            uptimeReader.close();
            
            String[] uptimeParts = uptimeLine.split(" ");
            long uptimeJiffies = (long) (Float.parseFloat(uptimeParts[0]) * 100);
            
            if (previousTotalCpuTime == 0) {
                previousTotalCpuTime = processCpuTime;
                previousIdleCpuTime = uptimeJiffies;
                return 0;
            }
            
            long cpuDelta = processCpuTime - previousTotalCpuTime;
            long timeDelta = uptimeJiffies - previousIdleCpuTime;
            
            previousTotalCpuTime = processCpuTime;
            previousIdleCpuTime = uptimeJiffies;
            
            if (timeDelta <= 0) {
                return lastCpuUsage;
            }
            
            float usage = ((float) cpuDelta / (float) timeDelta) * 100f;
            
            return Math.max(0, Math.min(100, usage));
        } catch (Exception e) {
            return getActivityManagerCpuEstimate();
        }
    }
    
    private float getActivityManagerCpuEstimate() {
        try {
            ActivityManager activityManager = (ActivityManager) getReactApplicationContext()
                    .getSystemService(Context.ACTIVITY_SERVICE);
            
            ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
            activityManager.getMemoryInfo(memInfo);
            
            float memoryUsagePercent = (1.0f - (float) memInfo.availMem / memInfo.totalMem) * 100f;
            
            int myPid = Process.myPid();
            for (ActivityManager.RunningAppProcessInfo processInfo : activityManager.getRunningAppProcesses()) {
                if (processInfo.pid == myPid) {
                    float importanceFactor = Math.max(0.1f, 1.0f - (processInfo.importance - 100) / 400.0f);
                    return memoryUsagePercent * importanceFactor * 0.5f;
                }
            }
            
            return memoryUsagePercent * 0.3f;
        } catch (Exception e) {
            return lastCpuUsage > 0 ? lastCpuUsage : 10.0f;
        }
    }
    
    private float calculateSystemCpuUsage() {
        try {
            RandomAccessFile reader = new RandomAccessFile("/proc/stat", "r");
            String load = reader.readLine();
            reader.close();

            String[] toks = load.split(" +");

            long user = Long.parseLong(toks[1]);
            long nice = Long.parseLong(toks[2]);
            long system = Long.parseLong(toks[3]);
            long idle = Long.parseLong(toks[4]);
            long iowait = Long.parseLong(toks[5]);
            long irq = Long.parseLong(toks[6]);
            long softirq = Long.parseLong(toks[7]);

            long totalCpu = user + nice + system + idle + iowait + irq + softirq;

            if (previousTotalCpuTime == 0) {
                previousTotalCpuTime = totalCpu;
                previousIdleCpuTime = idle;
                return calculateAppCpuUsage();
            }

            long totalDelta = totalCpu - previousTotalCpuTime;
            long idleDelta = idle - previousIdleCpuTime;

            previousTotalCpuTime = totalCpu;
            previousIdleCpuTime = idle;

            if (totalDelta > 0) {
                float usage = (float) (totalDelta - idleDelta) / totalDelta * 100;
                return Math.max(0, Math.min(100, usage));
            }

            return calculateAppCpuUsage();
        } catch (Exception e) {
            return calculateAppCpuUsage();
        }
    }
}
