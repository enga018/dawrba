/**
 * Performance Monitoring Utility
 * Tracks and logs slow queries and API responses
 */

export interface QueryMetrics {
  url: string
  method: string
  duration: number
  status: number
  timestamp: string
  isSlow: boolean
  userId?: string
  details?: Record<string, unknown>
}

const SLOW_QUERY_THRESHOLD = 500 // milliseconds
const MAX_LOGS = 100 // Keep last 100 queries

class PerformanceMonitor {
  private logs: QueryMetrics[] = []
  private slowQueryThreshold: number

  constructor(slowThresholdMs = SLOW_QUERY_THRESHOLD) {
    this.slowQueryThreshold = slowThresholdMs
  }

  /**
   * Record API call performance
   */
  recordQuery(metrics: Omit<QueryMetrics, 'isSlow' | 'timestamp'>) {
    const entry: QueryMetrics = {
      ...metrics,
      isSlow: metrics.duration > this.slowQueryThreshold,
      timestamp: new Date().toISOString(),
    }

    this.logs.push(entry)
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift()
    }

    // Log slow queries to console in development
    if (entry.isSlow && process.env.NODE_ENV === 'development') {
      console.warn(`[SLOW QUERY] ${metrics.method} ${metrics.url} took ${metrics.duration}ms`)
    }

    // Could send to analytics service (Sentry, DataDog, etc.)
    if (entry.isSlow) {
      this.reportSlowQuery(entry)
    }

    return entry
  }

  /**
   * Get all recorded queries
   */
  getAllQueries(): QueryMetrics[] {
    return [...this.logs]
  }

  /**
   * Get slow queries
   */
  getSlowQueries(): QueryMetrics[] {
    return this.logs.filter(q => q.isSlow)
  }

  /**
   * Get queries for a specific URL
   */
  getQueriesByUrl(url: string): QueryMetrics[] {
    return this.logs.filter(q => q.url.includes(url))
  }

  /**
   * Get average duration for a URL pattern
   */
  getAverageDuration(urlPattern: string): number {
    const matching = this.logs.filter(q => q.url.includes(urlPattern))
    if (matching.length === 0) return 0
    const total = matching.reduce((sum, q) => sum + q.duration, 0)
    return Math.round(total / matching.length)
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const total = this.logs.length
    const slow = this.logs.filter(q => q.isSlow).length
    const avgDuration = total > 0 ? Math.round(this.logs.reduce((sum, q) => sum + q.duration, 0) / total) : 0
    const maxDuration = total > 0 ? Math.max(...this.logs.map(q => q.duration)) : 0

    return {
      totalQueries: total,
      slowQueries: slow,
      slowPercentage: total > 0 ? Math.round((slow / total) * 100) : 0,
      averageDuration: avgDuration,
      maxDuration: maxDuration,
      threshold: this.slowQueryThreshold,
    }
  }

  /**
   * Report slow query (override for custom analytics)
   */
  protected reportSlowQuery(metric: QueryMetrics) {
    // Send to analytics service
    // Example: sendToSentry(metric)
    // Example: sendToDataDog(metric)
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = []
  }
}

// Global singleton instance
const monitor = new PerformanceMonitor()

/**
 * Record an API call with timing
 */
export function recordApiCall(
  url: string,
  method: string,
  duration: number,
  status: number,
  userId?: string,
  details?: Record<string, unknown>,
) {
  return monitor.recordQuery({
    url,
    method,
    duration,
    status,
    userId,
    details,
  })
}

/**
 * Middleware for recording query performance
 */
export function withPerformanceMonitoring(
  handler: (req: any, context?: any) => Promise<Response>,
  options?: { slowThreshold?: number }
) {
  return async (req: any, context?: any) => {
    const startTime = Date.now()
    const url = new URL(req.url).pathname
    const method = req.method

    try {
      const response = await handler(req, context)
      const duration = Date.now() - startTime
      recordApiCall(url, method, duration, response.status)
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      recordApiCall(url, method, duration, 500)
      throw error
    }
  }
}

/**
 * Get the monitor instance for direct access
 */
export function getMonitor() {
  return monitor
}

/**
 * Print performance summary to console
 */
export function printPerformanceSummary() {
  const summary = monitor.getSummary()
  console.log('═══ Performance Summary ═══')
  console.log(`Total Queries: ${summary.totalQueries}`)
  console.log(`Slow Queries: ${summary.slowQueries} (${summary.slowPercentage}%)`)
  console.log(`Average Duration: ${summary.averageDuration}ms`)
  console.log(`Max Duration: ${summary.maxDuration}ms`)
  console.log(`Threshold: ${summary.threshold}ms`)
}

/**
 * Export performance data as JSON
 */
export function exportPerformanceData() {
  return {
    summary: monitor.getSummary(),
    queries: monitor.getAllQueries(),
    slowQueries: monitor.getSlowQueries(),
  }
}
