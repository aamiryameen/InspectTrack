import Foundation
import React

@objc(CpuUsageModule)
class CpuUsageModule: NSObject {
  
  private var previousCpuInfo: processor_info_array_t?
  private var previousCpuInfoCount: mach_msg_type_number_t = 0
  private var previousNumCpus: natural_t = 0
  private var lastCpuUsage: Double = 0
  private var previousAppCpuTime: UInt64 = 0
  private var previousTimestamp: CFAbsoluteTime = 0
  
  // Lock for thread-safe access to instance variables
  private let lock = NSLock()
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func getCpuUsage(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    lock.lock()
    defer { lock.unlock() }
    
    let cpuUsage = getSystemCpuUsage()
    resolve(cpuUsage)
  }
  
  @objc
  func getAppCpuUsage(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    lock.lock()
    defer { lock.unlock() }
    
    let appCpuUsage = getAppProcessCpuUsage()
    resolve(appCpuUsage)
  }
  
  @objc
  func getMemoryUsage(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    lock.lock()
    defer { lock.unlock() }
    
    let memoryMB = getAppMemoryUsage()
    resolve(memoryMB)
  }
  
  @objc
  func getStorageInfo(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    lock.lock()
    defer { lock.unlock() }
    
    let storageInfo = getDeviceStorageInfo()
    resolve(storageInfo)
  }
  
  private func getAppMemoryUsage() -> Double {
    var taskInfo = task_vm_info_data_t()
    var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<integer_t>.size)
    
    let result = withUnsafeMutablePointer(to: &taskInfo) {
      $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
        task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
      }
    }
    
    if result == KERN_SUCCESS {
      let memoryBytes = taskInfo.phys_footprint
      let memoryMB = Double(memoryBytes) / (1024.0 * 1024.0)
      return memoryMB
    }
    
    var info = mach_task_basic_info()
    var infoCount = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size / MemoryLayout<integer_t>.size)
    
    let fallbackResult = withUnsafeMutablePointer(to: &info) {
      $0.withMemoryRebound(to: integer_t.self, capacity: Int(infoCount)) {
        task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &infoCount)
      }
    }
    
    if fallbackResult == KERN_SUCCESS {
      let memoryMB = Double(info.resident_size) / (1024.0 * 1024.0)
      return memoryMB
    }
    
    return 0
  }
  
  private func getDeviceStorageInfo() -> [String: Double] {
    let fileManager = FileManager.default
    
    do {
      let attributes = try fileManager.attributesOfFileSystem(forPath: NSHomeDirectory())
      
      if let totalSize = attributes[.systemSize] as? NSNumber,
         let freeSize = attributes[.systemFreeSize] as? NSNumber {
        
        let totalGB = totalSize.doubleValue / (1024.0 * 1024.0 * 1024.0)
        let freeGB = freeSize.doubleValue / (1024.0 * 1024.0 * 1024.0)
        let usedGB = totalGB - freeGB
        
        return ["usedGB": usedGB, "totalGB": totalGB]
      }
    } catch {
      print("Error getting storage info: \(error)")
    }
    
    return ["usedGB": 0, "totalGB": 0]
  }
  
  private func getSystemCpuUsage() -> Double {
    var cpuInfo: processor_info_array_t?
    var numCpuInfo: mach_msg_type_number_t = 0
    var numCpus: natural_t = 0
    
    let err = host_processor_info(mach_host_self(),
                                   PROCESSOR_CPU_LOAD_INFO,
                                   &numCpus,
                                   &cpuInfo,
                                   &numCpuInfo)
    
    guard err == KERN_SUCCESS, let currentCpuInfo = cpuInfo else {
      return lastCpuUsage
    }
    
    // Validate CPU count and info count
    guard numCpus > 0 && numCpus <= 64, numCpuInfo > 0 else {
      // Deallocate invalid data
      let size = Int(numCpuInfo) * MemoryLayout<integer_t>.stride
      if size > 0 {
        vm_deallocate(mach_task_self_, vm_address_t(bitPattern: currentCpuInfo), vm_size_t(size))
      }
      return lastCpuUsage
    }
    
    if previousCpuInfo == nil {
      previousCpuInfo = currentCpuInfo
      previousCpuInfoCount = numCpuInfo
      previousNumCpus = numCpus
      return getInstantCpuUsage(cpuInfo: currentCpuInfo, numCpus: numCpus)
    }
    
    // Ensure previous CPU count matches current
    guard previousNumCpus == numCpus else {
      // CPU count changed, reset
      if let prevInfo = previousCpuInfo {
        let prevSize = Int(previousCpuInfoCount) * MemoryLayout<integer_t>.stride
        vm_deallocate(mach_task_self_, vm_address_t(bitPattern: prevInfo), vm_size_t(prevSize))
      }
      previousCpuInfo = currentCpuInfo
      previousCpuInfoCount = numCpuInfo
      previousNumCpus = numCpus
      return getInstantCpuUsage(cpuInfo: currentCpuInfo, numCpus: numCpus)
    }
    
    var totalUsage: Double = 0
    let requiredInfoSize = Int(numCpus) * Int(CPU_STATE_MAX)
    
    // Validate we have enough data
    guard Int(numCpuInfo) >= requiredInfoSize,
          Int(previousCpuInfoCount) >= requiredInfoSize else {
      // Deallocate and reset
      if let prevInfo = previousCpuInfo {
        let prevSize = Int(previousCpuInfoCount) * MemoryLayout<integer_t>.stride
        vm_deallocate(mach_task_self_, vm_address_t(bitPattern: prevInfo), vm_size_t(prevSize))
      }
      let size = Int(numCpuInfo) * MemoryLayout<integer_t>.stride
      vm_deallocate(mach_task_self_, vm_address_t(bitPattern: currentCpuInfo), vm_size_t(size))
      previousCpuInfo = nil
      return lastCpuUsage
    }
    
    for i in 0..<Int(numCpus) {
      let offset = Int(CPU_STATE_MAX) * i
      let prevOffset = Int(CPU_STATE_MAX) * i
      
      // Bounds check
      guard offset + Int(CPU_STATE_USER) < Int(numCpuInfo),
            offset + Int(CPU_STATE_SYSTEM) < Int(numCpuInfo),
            offset + Int(CPU_STATE_IDLE) < Int(numCpuInfo),
            offset + Int(CPU_STATE_NICE) < Int(numCpuInfo),
            prevOffset + Int(CPU_STATE_USER) < Int(previousCpuInfoCount),
            prevOffset + Int(CPU_STATE_SYSTEM) < Int(previousCpuInfoCount),
            prevOffset + Int(CPU_STATE_IDLE) < Int(previousCpuInfoCount),
            prevOffset + Int(CPU_STATE_NICE) < Int(previousCpuInfoCount) else {
        continue
      }
      
      let user = Double(currentCpuInfo[offset + Int(CPU_STATE_USER)])
      let system = Double(currentCpuInfo[offset + Int(CPU_STATE_SYSTEM)])
      let idle = Double(currentCpuInfo[offset + Int(CPU_STATE_IDLE)])
      let nice = Double(currentCpuInfo[offset + Int(CPU_STATE_NICE)])
      
      let prevUser = Double(previousCpuInfo![prevOffset + Int(CPU_STATE_USER)])
      let prevSystem = Double(previousCpuInfo![prevOffset + Int(CPU_STATE_SYSTEM)])
      let prevIdle = Double(previousCpuInfo![prevOffset + Int(CPU_STATE_IDLE)])
      let prevNice = Double(previousCpuInfo![prevOffset + Int(CPU_STATE_NICE)])
      
      // Validate values are reasonable
      guard user >= 0 && system >= 0 && idle >= 0 && nice >= 0,
            prevUser >= 0 && prevSystem >= 0 && prevIdle >= 0 && prevNice >= 0 else {
        continue
      }
      
      let userDelta = user - prevUser
      let systemDelta = system - prevSystem
      let idleDelta = idle - prevIdle
      let niceDelta = nice - prevNice
      
      let totalDelta = userDelta + systemDelta + idleDelta + niceDelta
      let usedDelta = userDelta + systemDelta + niceDelta
      
      if totalDelta > 0 && totalDelta.isFinite && usedDelta.isFinite {
        let cpuUsage = (usedDelta / totalDelta) * 100
        if cpuUsage >= 0 && cpuUsage <= 1000 && cpuUsage.isFinite {
          totalUsage += cpuUsage
        }
      }
    }
    
    if let prevInfo = previousCpuInfo {
      let prevSize = Int(previousCpuInfoCount) * MemoryLayout<integer_t>.stride
      if prevSize > 0 {
        vm_deallocate(mach_task_self_, vm_address_t(bitPattern: prevInfo), vm_size_t(prevSize))
      }
    }
    
    previousCpuInfo = currentCpuInfo
    previousCpuInfoCount = numCpuInfo
    previousNumCpus = numCpus
    
    guard numCpus > 0 else {
      return lastCpuUsage
    }
    
    let avgUsage = totalUsage / Double(numCpus)
    guard avgUsage.isFinite else {
      return lastCpuUsage
    }
    
    lastCpuUsage = min(100, max(0, avgUsage))
    return lastCpuUsage
  }
  
  private func getInstantCpuUsage(cpuInfo: processor_info_array_t, numCpus: natural_t) -> Double {
    var totalUsage: Double = 0
    let requiredInfoSize = Int(numCpus) * Int(CPU_STATE_MAX)
    
    // We need to know the size, but we don't have it here. Use a reasonable estimate.
    // In practice, this is called from getSystemCpuUsage which has validated the data.
    guard numCpus > 0 && numCpus <= 64 else {
      return lastCpuUsage
    }
    
    for i in 0..<Int(numCpus) {
      let offset = Int(CPU_STATE_MAX) * i
      
      // Basic bounds check - we assume the data is valid since it comes from validated context
      let user = Double(cpuInfo[offset + Int(CPU_STATE_USER)])
      let system = Double(cpuInfo[offset + Int(CPU_STATE_SYSTEM)])
      let idle = Double(cpuInfo[offset + Int(CPU_STATE_IDLE)])
      let nice = Double(cpuInfo[offset + Int(CPU_STATE_NICE)])
      
      // Validate values are reasonable
      guard user >= 0 && system >= 0 && idle >= 0 && nice >= 0 else {
        continue
      }
      
      let total = user + system + idle + nice
      let used = user + system + nice
      
      if total > 0 && total.isFinite && used.isFinite {
        let cpuUsage = (used / total) * 100
        if cpuUsage >= 0 && cpuUsage <= 1000 && cpuUsage.isFinite {
          totalUsage += cpuUsage
        }
      }
    }
    
    guard numCpus > 0 else {
      return lastCpuUsage
    }
    
    let avgUsage = totalUsage / Double(numCpus)
    guard avgUsage.isFinite else {
      return lastCpuUsage
    }
    
    return min(100, max(0, avgUsage))
  }
  
  private func getAppProcessCpuUsage() -> Double {
    // Use autoreleasepool to ensure proper memory management
    return autoreleasepool {
      var threadsList: thread_act_array_t?
      var threadsCount = mach_msg_type_number_t(0)
      
      let threadsResult = task_threads(mach_task_self_, &threadsList, &threadsCount)
      
      guard threadsResult == KERN_SUCCESS else {
        // Return last known value if we can't get threads
        return lastCpuUsage
      }
      
      guard let threads = threadsList, threadsCount > 0 else {
        return lastCpuUsage
      }
      
      // Validate threadsCount is reasonable
      guard threadsCount > 0 && threadsCount <= 1024 else {
        // Deallocate if count is invalid
        let threadsSize = Int(threadsCount) * MemoryLayout<thread_t>.stride
        if threadsSize > 0 {
          vm_deallocate(mach_task_self_, vm_address_t(bitPattern: threads), vm_size_t(threadsSize))
        }
        return lastCpuUsage
      }
      
      defer {
        // Always deallocate threads memory, even if there's an error
        let threadsSize = Int(threadsCount) * MemoryLayout<thread_t>.stride
        if threadsSize > 0 {
          vm_deallocate(mach_task_self_, vm_address_t(bitPattern: threads), vm_size_t(threadsSize))
        }
      }
      
      return processThreads(threads: threads, threadsCount: threadsCount)
    }
  }
  
  private func processThreads(threads: thread_act_array_t, threadsCount: mach_msg_type_number_t) -> Double {
    
    var totalCpu: Double = 0
    var totalCpuTime: UInt64 = 0
    
    // Limit thread count to prevent excessive processing and potential crashes
    let maxThreads = min(Int(threadsCount), 512) // Reasonable upper limit
    
    for i in 0..<maxThreads {
      // Additional bounds check
      guard i >= 0 && i < Int(threadsCount) else {
        break
      }
      
      // Validate thread handle is not null/invalid
      let threadHandle = threads[i]
      guard threadHandle != 0 else {
        continue
      }
      
      var threadInfo = thread_basic_info()
      var threadInfoCount = mach_msg_type_number_t(THREAD_INFO_MAX)
      
      let infoResult = withUnsafeMutablePointer(to: &threadInfo) {
        $0.withMemoryRebound(to: integer_t.self, capacity: Int(threadInfoCount)) {
          thread_info(threadHandle, thread_flavor_t(THREAD_BASIC_INFO), $0, &threadInfoCount)
        }
      }
      
      guard infoResult == KERN_SUCCESS else {
        continue
      }
      
      // Validate thread info values
      guard threadInfoCount >= MemoryLayout<thread_basic_info>.size / MemoryLayout<integer_t>.size else {
        continue
      }
      
      if threadInfo.flags & TH_FLAGS_IDLE == 0 {
        let cpuUsage = Double(threadInfo.cpu_usage) / Double(TH_USAGE_SCALE) * 100
        
        // Validate CPU usage is reasonable
        guard cpuUsage >= 0 && cpuUsage <= 1000 else {
          continue
        }
        
        totalCpu += cpuUsage
        
        // Safely calculate time values with overflow protection
        let userSeconds = UInt64(threadInfo.user_time.seconds)
        let userMicroseconds = UInt64(threadInfo.user_time.microseconds)
        let systemSeconds = UInt64(threadInfo.system_time.seconds)
        let systemMicroseconds = UInt64(threadInfo.system_time.microseconds)
        
        // Check for potential overflow before multiplication
        guard userSeconds < UInt64.max / 1_000_000,
              systemSeconds < UInt64.max / 1_000_000 else {
          continue
        }
        
        let userTime = userSeconds * 1_000_000 + userMicroseconds
        let systemTime = systemSeconds * 1_000_000 + systemMicroseconds
        
        // Check for overflow in addition
        guard totalCpuTime <= UInt64.max - userTime - systemTime else {
          continue
        }
        
        totalCpuTime += userTime + systemTime
      }
    }
    
    let currentTime = CFAbsoluteTimeGetCurrent()
    
    // Validate time values
    guard currentTime > 0 && currentTime.isFinite else {
      return lastCpuUsage
    }
    
    if previousAppCpuTime > 0 && previousTimestamp > 0 && previousTimestamp.isFinite {
      // Check for time going backwards (shouldn't happen, but be safe)
      guard currentTime >= previousTimestamp else {
        previousAppCpuTime = totalCpuTime
        previousTimestamp = currentTime
        return lastCpuUsage
      }
      
      let cpuTimeDelta = totalCpuTime >= previousAppCpuTime 
        ? totalCpuTime - previousAppCpuTime 
        : 0
      let timeDelta = currentTime - previousTimestamp
      
      if timeDelta > 0 && timeDelta.isFinite {
        let cpuTimeDeltaSeconds = Double(cpuTimeDelta) / 1_000_000.0
        
        // Validate calculations
        guard cpuTimeDeltaSeconds >= 0 && cpuTimeDeltaSeconds.isFinite else {
          previousAppCpuTime = totalCpuTime
          previousTimestamp = currentTime
          return lastCpuUsage
        }
        
        let deltaCpuUsage = (cpuTimeDeltaSeconds / timeDelta) * 100
        
        // Validate delta CPU usage is reasonable
        guard deltaCpuUsage >= 0 && deltaCpuUsage <= 1000 && deltaCpuUsage.isFinite else {
          previousAppCpuTime = totalCpuTime
          previousTimestamp = currentTime
          return lastCpuUsage
        }
        
        let blendedUsage = (totalCpu * 0.7) + (deltaCpuUsage * 0.3)
        lastCpuUsage = min(100, max(0, blendedUsage))
      } else {
        // If time delta is invalid, use direct CPU usage
        lastCpuUsage = min(100, max(0, totalCpu))
      }
    } else {
      // First call or invalid previous values
      lastCpuUsage = min(100, max(0, totalCpu))
    }
    
    previousAppCpuTime = totalCpuTime
    previousTimestamp = currentTime
    
    return lastCpuUsage
  }
}
