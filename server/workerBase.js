import ServiceBase from './serviceBase'
import Log from './logger'

export default class WorkerBase extends ServiceBase {
  log (error) {
    Log.error('Exception raised in Service', { klass: this.constructor, msg: error.message, context: this.args, exception: error, userCtx: this.context })
  }

  static async run () {
    Log.info(`Worker Started: ${this.name}`, { context: this.args, userCtx: this.context, wrap: 'start' })
    await super.run(...arguments)
    Log.info(`Worker Finished: ${this.name}`, { context: this.args, userCtx: this.context, wrap: 'end' })
  }
}
