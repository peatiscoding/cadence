import type { IWorkflowCard, IActionDefiniton } from '../types'

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
