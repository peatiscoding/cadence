import type { IWorkflowCard, IActionDefiniton } from '../types'

export interface IRunnerOption {
  /**
   * Notify the runner to execute all actions in parallel
   */
  runInParallel: boolean
}

export interface IActionExecutor {
  /**
   * Perform any action
   */
  execute(cardContext: IWorkflowCard, action: IActionDefiniton): Promise<void>
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
