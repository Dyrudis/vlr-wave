/**
 * Logger utility for consistent server-side logging
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

class Logger {
  private context: string

  constructor(context: string) {
    this.context = context
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toTimeString().split(' ')[0]
    const dataStr = data ? ` | ${JSON.stringify(data)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${dataStr}`
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage('info', message, data))
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('warn', message, data))
  }

  error(message: string, data?: any): void {
    console.error(this.formatMessage('error', message, data))
  }

  debug(message: string, data?: any): void {
    console.debug(this.formatMessage('debug', message, data))
  }
}

export default Logger
