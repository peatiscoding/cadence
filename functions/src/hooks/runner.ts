import type {
  IWorkflowCard,
  IActionDefiniton,
  IActionExecutor,
  IActionRunner,
  IRunnerOption
} from '@cadence/shared/types'
import { withContext } from '@cadence/shared/utils'
import { App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { SetOwnerActionExecutor } from './executors/set-owner'
import { SendWebhookActionExecutor } from './executors/send-webhook'

interface RunTopology {
  (executions: (() => Promise<void>)[]): Promise<void>
}

const _topologies: Record<string, RunTopology> = {
  async runInParallel(executions: (() => Promise<void>)[]): Promise<void> {
    await Promise.all(executions.map((d) => d()))
  },
  async runInSerial(executions: (() => Promise<void>)[]): Promise<void> {
    for (const exec of executions) {
      await exec()
    }
  }
}

export class ActionRunner implements IActionRunner {
  /**
   * Create a runner with supportedExecutors
   */
  public constructor(public readonly supportedExecutors: IActionExecutor<any>[]) {}

  private getExecutor<D extends IActionDefiniton>(a: D): IActionExecutor<D['kind']> | undefined {
    return this.supportedExecutors.find((ex) => ex.kind === a.kind)
  }

  async run(
    cardContext: IWorkflowCard,
    actions: IActionDefiniton[],
    runOptions: IRunnerOption
  ): Promise<number[]> {
    const elapsed: number[] = []
    const runTopo = runOptions.runInParallel ? _topologies.runInParallel : _topologies.runInSerial

    const replacer = withContext(cardContext)

    const executionFunctions = actions.map(replacer.replace.bind(replacer)).map((a, index) => {
      const executor = this.getExecutor(a)
      if (!executor) {
        throw new Error(`Unsupported execution for kind: ${a.kind}`)
      }
      return async () => {
        const start = new Date().getTime()
        await executor.execute(cardContext, a)
        const executionTime = new Date().getTime() - start
        elapsed[index] = executionTime
      }
    })

    await runTopo(executionFunctions)
    return elapsed
  }

  public static create(app: App): IActionRunner {
    return new ActionRunner([
      new SetOwnerActionExecutor(getFirestore(app)),
      new SendWebhookActionExecutor()
    ])
  }
}
