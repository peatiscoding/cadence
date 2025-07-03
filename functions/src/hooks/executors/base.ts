import type { IActionExecutor, IActionDefiniton, IWorkflowCard } from '@cadence/shared/types'

export abstract class AActionExecutor<K extends IActionDefiniton['kind']>
  implements IActionExecutor<K>
{
  constructor(public readonly kind: K) {}

  abstract onExecute(
    context: IWorkflowCard,
    definition: Extract<IActionDefiniton, { kind: K }>
  ): Promise<void>

  public execute(cardContext: IWorkflowCard, action: Extract<IActionDefiniton, { kind: K }>) {
    // TODO: Add logs
    return this.onExecute(cardContext, action)
  }
}
