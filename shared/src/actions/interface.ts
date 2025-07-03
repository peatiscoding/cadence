import type { IWorkflowCard } from '../validation'
import type { IActionDefiniton } from '../validation/action/action'

export interface IRunOption {
  parallel: boolean
}

export interface IActionRunner {
  /**
   * Perform any action
   */
  execute(
    cardContext: IWorkflowCard,
    action: IActionDefiniton[],
    runOptions: IRunOption
  ): Promise<void>
}
