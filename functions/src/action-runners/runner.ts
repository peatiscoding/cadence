import type {
  IActionExecutor,
  IActionRunner,
  IRunnerOption
} from '@cadence/shared/actions/interface'
import type { IActionDefiniton, IWorkflowCard } from '@cadence/shared/types'

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

    await runTopo(
      actions.map((a) => {
        const executor = this.getExecutor(a)
        if (!executor) {
          throw new Error(`Unsupported execution for kind: ${a.kind}`)
        }
        return () => executor.execute(cardContext, a)
      })
    )
  }

  public static shared(): IActionRunner {
    throw new Error('Implement meh')
  }
}
