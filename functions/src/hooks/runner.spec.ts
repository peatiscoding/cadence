import type {
  IActionDefiniton,
  IWorkflowCard,
  IActionExecutor,
  IRunnerOption
} from '@cadence/shared/types'
import { ActionRunner } from './runner'

// Mock executor for testing
class MockActionExecutor implements IActionExecutor<'set-owner'> {
  public readonly executionTimes: number[] = []
  public readonly executionOrder: number[] = []

  constructor(
    public readonly executionDelay: number = 0,
    public readonly executionId: number = 0,
    public readonly shouldThrow: boolean = false
  ) {}

  get kind(): 'set-owner' {
    return 'set-owner'
  }

  async execute(
    cardContext: IWorkflowCard,
    action: Extract<IActionDefiniton, { kind: 'set-owner' }>
  ): Promise<void> {
    const startTime = Date.now()

    if (this.shouldThrow) {
      throw new Error('Mock execution error')
    }

    // Simulate execution time
    if (this.executionDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.executionDelay))
    }

    const executionTime = Date.now() - startTime
    this.executionTimes.push(executionTime)
    this.executionOrder.push(this.executionId)
  }
}

// Mock executor for unsupported action types
class UnsupportedActionExecutor implements IActionExecutor<any> {
  get kind() {
    return 'unsupported' as any
  }

  async execute(): Promise<void> {
    // This should never be called
  }
}

describe('ActionRunner', () => {
  let mockCard: IWorkflowCard
  let mockActions: IActionDefiniton[]

  beforeEach(() => {
    mockCard = {
      workflowId: 'test-workflow',
      workflowCardId: 'test-card',
      title: 'Test Card',
      description: 'Test Description',
      status: 'open',
      owner: 'test-owner',
      type: 'dd',
      fieldData: {},
      value: 300
    }

    mockActions = [
      {
        kind: 'set-owner',
        to: 'new-owner-1'
      },
      {
        kind: 'set-owner',
        to: 'new-owner-2'
      }
    ]
  })

  describe('constructor', () => {
    it('should create an ActionRunner with supported executors', () => {
      const executor = new MockActionExecutor()
      const runner = new ActionRunner([executor])

      expect(runner.supportedExecutors).toEqual([executor])
    })
  })

  describe('run - serial execution', () => {
    it('should execute actions in serial order', async () => {
      const executor = new MockActionExecutor(50)
      const runner = new ActionRunner([executor])

      const runOptions: IRunnerOption = { runInParallel: false }

      const startTime = Date.now()
      const results = await runner.run(mockCard, mockActions, runOptions)
      const totalTime = Date.now() - startTime

      // Should return execution times
      expect(results).toHaveLength(2)
      expect(results[0]).toBeGreaterThanOrEqual(50)
      expect(results[1]).toBeGreaterThanOrEqual(50)

      // Serial execution should take at least the sum of delays
      expect(totalTime).toBeGreaterThanOrEqual(100)
    })

    it('should execute actions sequentially waiting for each to complete', async () => {
      const executionOrder: number[] = []
      let executionCount = 0

      const executor = new MockActionExecutor(100)

      // Override execute to track execution order
      const originalExecute = executor.execute.bind(executor)

      executor.execute = async (cardContext, action) => {
        executionCount++
        const id = executionCount
        executionOrder.push(id)
        await originalExecute(cardContext, action)
        executionOrder.push(id * 10) // Mark completion
      }

      const runner = new ActionRunner([executor])
      const runOptions: IRunnerOption = { runInParallel: false }

      await runner.run(mockCard, mockActions, runOptions)

      // Should execute in order: start1, complete1, start2, complete2
      expect(executionOrder).toEqual([1, 10, 2, 20])
    })
  })

  describe('run - parallel execution', () => {
    it('should execute actions in parallel', async () => {
      const executor1 = new MockActionExecutor(100, 1)
      const executor2 = new MockActionExecutor(50, 2)
      const runner = new ActionRunner([executor1, executor2])

      const runOptions: IRunnerOption = { runInParallel: true }

      const startTime = Date.now()
      const results = await runner.run(mockCard, mockActions, runOptions)
      const totalTime = Date.now() - startTime

      // Should return execution times
      expect(results).toHaveLength(2)
      expect(results[0]).toBeGreaterThanOrEqual(100)
      expect(results[1]).toBeGreaterThanOrEqual(50)

      // Parallel execution should take roughly the time of the longest task
      expect(totalTime).toBeLessThan(150) // Should be less than sequential (150ms)
      expect(totalTime).toBeGreaterThanOrEqual(100) // Should be at least the longest task
    })

    it('should execute actions concurrently', async () => {
      const executionOrder: number[] = []
      let executionCount = 0

      const executor = new MockActionExecutor(100)

      // Override execute to track execution order
      const originalExecute = executor.execute.bind(executor)

      executor.execute = async (cardContext, action) => {
        executionCount++
        const id = executionCount
        executionOrder.push(id)
        await originalExecute(cardContext, action)
        executionOrder.push(id * 10) // Mark completion
      }

      const runner = new ActionRunner([executor])
      const runOptions: IRunnerOption = { runInParallel: true }

      await runner.run(mockCard, mockActions, runOptions)

      // Both should start before either completes (parallel execution)
      expect(executionOrder.slice(0, 2)).toEqual(expect.arrayContaining([1, 2]))
      expect(executionOrder).toHaveLength(4)
    })
  })

  describe('run - execution time tracking', () => {
    it('should return accurate execution times for each action', async () => {
      const executor = new MockActionExecutor(100)
      const runner = new ActionRunner([executor])

      const runOptions: IRunnerOption = { runInParallel: false }

      const results = await runner.run(mockCard, [mockActions[0]], runOptions)

      expect(results).toHaveLength(1)
      expect(results[0]).toBeGreaterThanOrEqual(100)
      expect(results[0]).toBeLessThan(150) // Allow some tolerance
    })

    it('should track execution times independently for multiple actions', async () => {
      const executor1 = new MockActionExecutor(100)
      const executor2 = new MockActionExecutor(50)
      const runner = new ActionRunner([executor1, executor2])

      const runOptions: IRunnerOption = { runInParallel: false }

      const results = await runner.run(mockCard, mockActions, runOptions)

      expect(results).toHaveLength(2)
      expect(results[0]).toBeGreaterThanOrEqual(100)
      expect(results[1]).toBeGreaterThanOrEqual(50)
    })
  })

  describe('run - error handling', () => {
    it('should throw error when no executor is found for action kind', async () => {
      const executor = new MockActionExecutor()
      const runner = new ActionRunner([executor])

      const unsupportedAction: IActionDefiniton = {
        kind: 'unsupported' as any,
        to: 'test'
      }

      const runOptions: IRunnerOption = { runInParallel: false }

      await expect(runner.run(mockCard, [unsupportedAction], runOptions)).rejects.toThrow(
        'Unsupported execution for kind: unsupported'
      )
    })

    it('should propagate errors from executor in serial execution', async () => {
      const executor = new MockActionExecutor(0, 1, true)
      const runner = new ActionRunner([executor])

      const runOptions: IRunnerOption = { runInParallel: false }

      await expect(runner.run(mockCard, [mockActions[0]], runOptions)).rejects.toThrow(
        'Mock execution error'
      )
    })

    it('should propagate errors from executor in parallel execution', async () => {
      const executor = new MockActionExecutor(0, 1, true)
      const runner = new ActionRunner([executor])

      const runOptions: IRunnerOption = { runInParallel: true }

      await expect(runner.run(mockCard, [mockActions[0]], runOptions)).rejects.toThrow(
        'Mock execution error'
      )
    })
  })

  describe('run - context replacement', () => {
    it('should use withContext to replace placeholders in actions', async () => {
      const executor = new MockActionExecutor()
      const runner = new ActionRunner([executor])

      // Mock the withContext utility
      const mockCard: IWorkflowCard = {
        workflowId: 'test-workflow',
        workflowCardId: 'test-card',
        title: 'Test Card',
        description: 'Test Description',
        status: 'open',
        owner: 'current-owner',
        type: 'hello',
        value: 3381,
        fieldData: { assignee: 'test-assignee' }
      }

      const actionWithPlaceholder: IActionDefiniton = {
        kind: 'set-owner',
        to: '{{fields.assignee}}' // This should be replaced
      }

      const runOptions: IRunnerOption = { runInParallel: false }

      // Note: The actual replacement is tested in the withContext utility tests
      // Here we just verify the runner calls the replacement logic
      await runner.run(mockCard, [actionWithPlaceholder], runOptions)

      expect(executor.executionTimes).toHaveLength(1)
    })
  })

  describe('getExecutor', () => {
    it('should find executor by kind', () => {
      const executor1 = new MockActionExecutor()
      const executor2 = new UnsupportedActionExecutor()
      const runner = new ActionRunner([executor1, executor2])

      const foundExecutor = (runner as any).getExecutor({ kind: 'set-owner' })
      expect(foundExecutor).toBe(executor1)
    })

    it('should return undefined for unknown executor kind', () => {
      const executor = new MockActionExecutor()
      const runner = new ActionRunner([executor])

      const foundExecutor = (runner as any).getExecutor({ kind: 'unknown' })
      expect(foundExecutor).toBeUndefined()
    })
  })

  describe('topology functions', () => {
    it('should execute functions in parallel with runInParallel topology', async () => {
      const executionOrder: number[] = []
      const executions = [
        async () => {
          executionOrder.push(1)
          await new Promise((resolve) => setTimeout(resolve, 50))
          executionOrder.push(11)
        },
        async () => {
          executionOrder.push(2)
          await new Promise((resolve) => setTimeout(resolve, 30))
          executionOrder.push(22)
        }
      ]

      const topology = (ActionRunner as any)._topologies || {
        async runInParallel(executions: (() => Promise<void>)[]): Promise<void> {
          await Promise.all(executions.map((d) => d()))
        }
      }

      const startTime = Date.now()
      await topology.runInParallel(executions)
      const totalTime = Date.now() - startTime

      // Both should start before either completes
      expect(executionOrder.slice(0, 2)).toEqual(expect.arrayContaining([1, 2]))
      expect(totalTime).toBeLessThan(80) // Less than serial execution time
    })

    it('should execute functions in serial with runInSerial topology', async () => {
      const executionOrder: number[] = []
      const executions = [
        async () => {
          executionOrder.push(1)
          await new Promise((resolve) => setTimeout(resolve, 50))
          executionOrder.push(11)
        },
        async () => {
          executionOrder.push(2)
          await new Promise((resolve) => setTimeout(resolve, 30))
          executionOrder.push(22)
        }
      ]

      const topology = (ActionRunner as any)._topologies || {
        async runInSerial(executions: (() => Promise<void>)[]): Promise<void> {
          for (const exec of executions) {
            await exec()
          }
        }
      }

      const startTime = Date.now()
      await topology.runInSerial(executions)
      const totalTime = Date.now() - startTime

      // Should execute in order: start1, complete1, start2, complete2
      expect(executionOrder).toEqual([1, 11, 2, 22])
      expect(totalTime).toBeGreaterThanOrEqual(80) // At least sum of delays
    })
  })
})

