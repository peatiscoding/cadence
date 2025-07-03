import type { IWorkflowCard, IActionDefiniton } from '../types/index.js'

export interface IRunnerOption {
  /**
   * Notify the runner to execute all actions in parallel
   */
  runInParallel: boolean
}

export interface IActionExecutor<
  K extends IActionDefiniton['kind'],
  Def = Extract<IActionDefiniton, { kind: K }>
> {
  /**
   * Get Exeution's kind
   */
  get kind(): IActionDefiniton['kind']

  /**
   * Perform any action
   */
  execute(cardContext: IWorkflowCard, action: Def): Promise<void>
}

export interface IActionRunner {
  /**
   * Runner is a logical class that orchestrate running sequence and manage the errornous of the result.
   */
  run(
    cardContext: IWorkflowCard,
    actions: IActionDefiniton[],
    runOptions: IRunnerOption
  ): Promise<void>
}
