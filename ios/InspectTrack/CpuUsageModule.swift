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
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func getCpuUsage(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let cpuUsage = getSystemCpuUsage()
    resolve(cpuUsage)
  }
  
  @objc
  func getAppCpuUsage(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let appCpuUsage = getAppProcessCpuUsage()
    resolve(appCpuUsage)
  }
  
  @objc
  func getMemoryUsage(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let memoryMB = getAppMemoryUsage()
    resolve(memoryMB)
  }
  
  @objc
  func getStorageInfo(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
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
    
    if previousCpuInfo == nil {
      previousCpuInfo = currentCpuInfo
      previousCpuInfoCount = numCpuInfo
      previousNumCpus = numCpus
      return getInstantCpuUsage(cpuInfo: currentCpuInfo, numCpus: numCpus)
    }
    
    var totalUsage: Double = 0
    
    for i in 0..<Int(numCpus) {
      let offset = Int(CPU_STATE_MAX) * i
      let prevOffset = Int(CPU_STATE_MAX) * i
      
      let user = Double(currentCpuInfo[offset + Int(CPU_STATE_USER)])
      let system = Double(currentCpuInfo[offset + Int(CPU_STATE_SYSTEM)])
      let idle = Double(currentCpuInfo[offset + Int(CPU_STATE_IDLE)])
      let nice = Double(currentCpuInfo[offset + Int(CPU_STATE_NICE)])
      
      let prevUser = Double(previousCpuInfo![prevOffset + Int(CPU_STATE_USER)])
      let prevSystem = Double(previousCpuInfo![prevOffset + Int(CPU_STATE_SYSTEM)])
      let prevIdle = Double(previousCpuInfo![prevOffset + Int(CPU_STATE_IDLE)])
      let prevNice = Double(previousCpuInfo![prevOffset + Int(CPU_STATE_NICE)])
      
      let userDelta = user - prevUser
      let systemDelta = system - prevSystem
      let idleDelta = idle - prevIdle
      let niceDelta = nice - prevNice
      
      let totalDelta = userDelta + systemDelta + idleDelta + niceDelta
      let usedDelta = userDelta + systemDelta + niceDelta
      
      if totalDelta > 0 {
        totalUsage += (usedDelta / totalDelta) * 100
      }
    }
    
    if let prevInfo = previousCpuInfo {
      let prevSize = Int(previousCpuInfoCount) * MemoryLayout<integer_t>.stride
      vm_deallocate(mach_task_self_, vm_address_t(bitPattern: prevInfo), vm_size_t(prevSize))
    }
    
    previousCpuInfo = currentCpuInfo
    previousCpuInfoCount = numCpuInfo
    previousNumCpus = numCpus
    
    let avgUsage = totalUsage / Double(numCpus)
    lastCpuUsage = min(100, max(0, avgUsage))
    return lastCpuUsage
  }
  
  private func getInstantCpuUsage(cpuInfo: processor_info_array_t, numCpus: natural_t) -> Double {
    var totalUsage: Double = 0
    
    for i in 0..<Int(numCpus) {
      let offset = Int(CPU_STATE_MAX) * i
      let user = Double(cpuInfo[offset + Int(CPU_STATE_USER)])
      let system = Double(cpuInfo[offset + Int(CPU_STATE_SYSTEM)])
      let idle = Double(cpuInfo[offset + Int(CPU_STATE_IDLE)])
      let nice = Double(cpuInfo[offset + Int(CPU_STATE_NICE)])
      
      let total = user + system + idle + nice
      let used = user + system + nice
      
      if total > 0 {
        totalUsage += (used / total) * 100
      }
    }
    
    let avgUsage = totalUsage / Double(numCpus)
    return min(100, max(0, avgUsage))
  }
  
  private func getAppProcessCpuUsage() -> Double {
    var threadsList: thread_act_array_t?
    var threadsCount = mach_msg_type_number_t(0)
    
    let threadsResult = task_threads(mach_task_self_, &threadsList, &threadsCount)
    
    guard threadsResult == KERN_SUCCESS, let threads = threadsList else {
      return lastCpuUsage
    }
    
    var totalCpu: Double = 0
    var totalCpuTime: UInt64 = 0
    
    for i in 0..<Int(threadsCount) {
      var threadInfo = thread_basic_info()
      var threadInfoCount = mach_msg_type_number_t(THREAD_INFO_MAX)
      
      let infoResult = withUnsafeMutablePointer(to: &threadInfo) {
        $0.withMemoryRebound(to: integer_t.self, capacity: Int(threadInfoCount)) {
          thread_info(threads[i], thread_flavor_t(THREAD_BASIC_INFO), $0, &threadInfoCount)
        }
      }
      
      guard infoResult == KERN_SUCCESS else {
        continue
      }
      
      if threadInfo.flags & TH_FLAGS_IDLE == 0 {
        let cpuUsage = Double(threadInfo.cpu_usage) / Double(TH_USAGE_SCALE) * 100
        totalCpu += cpuUsage
        
        let userTime = UInt64(threadInfo.user_time.seconds) * 1_000_000 + UInt64(threadInfo.user_time.microseconds)
        let systemTime = UInt64(threadInfo.system_time.seconds) * 1_000_000 + UInt64(threadInfo.system_time.microseconds)
        totalCpuTime += userTime + systemTime
      }
    }
    
    let threadsSize = Int(threadsCount) * MemoryLayout<thread_t>.stride
    vm_deallocate(mach_task_self_, vm_address_t(bitPattern: threads), vm_size_t(threadsSize))
    
    let currentTime = CFAbsoluteTimeGetCurrent()
    
    if previousAppCpuTime > 0 && previousTimestamp > 0 {
      let cpuTimeDelta = totalCpuTime - previousAppCpuTime
      let timeDelta = currentTime - previousTimestamp
      
      if timeDelta > 0 {
        let cpuTimeDeltaSeconds = Double(cpuTimeDelta) / 1_000_000.0
        let deltaCpuUsage = (cpuTimeDeltaSeconds / timeDelta) * 100
        
        let blendedUsage = (totalCpu * 0.7) + (deltaCpuUsage * 0.3)
        lastCpuUsage = min(100, max(0, blendedUsage))
      }
    } else {
      lastCpuUsage = min(100, max(0, totalCpu))
    }
    
    previousAppCpuTime = totalCpuTime
    previousTimestamp = currentTime
    
    return lastCpuUsage
  }
}
