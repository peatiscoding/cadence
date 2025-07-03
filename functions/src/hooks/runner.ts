import type {
  IWorkflowCard,
  IActionDefiniton,
  IActionExecutor,
  IActionRunner,
  IRunnerOption
} from '@cadence/shared/types'
import { withContext } from '@cadence/shared/utils'
import { Firestore } from 'firebase-admin/firestore'
import { SetOwnerActionExecutor } from './executors/set-owner'

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
  ): Promise<void> {
    const runTopo = runOptions.runInParallel ? _topologies.runInParallel : _topologies.runInSerial

    const replacer = withContext(cardContext)

    await runTopo(
      actions.map(replacer.replace.bind(replacer)).map((a) => {
        const executor = this.getExecutor(a)
        if (!executor) {
          throw new Error(`Unsupported execution for kind: ${a.kind}`)
        }
        return () => executor.execute(cardContext, a)
      })
    )
  }

  public static create(fs: Firestore): IActionRunner {
    return new ActionRunner([new SetOwnerActionExecutor(fs)])
  }
}
