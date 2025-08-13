import type { LovDefinition, LovProviderDefinition } from '@cadence/shared/types'

import { createHash } from 'node:crypto'
import { BaseListOfValueProvider } from './base'
import { ApiListOfValueProvider } from './api-provider'
import { GoogleSheetListOfValueProvider } from './googlesheet-provider'
import { Firestore } from 'firebase-admin/firestore'

export class ListOfValueFactory {
  private static instance: ListOfValueFactory = new ListOfValueFactory()
  private readonly instances = new Map<string, BaseListOfValueProvider>()

  public static shared(): ListOfValueFactory {
    return this.instance
  }

  public static getCacheKey(providerDef: LovProviderDefinition, cacheKey?: string): string {
    const useHash = (): string =>
      createHash('md5').update(JSON.stringify(providerDef)).digest('hex') // lazy
    return cacheKey || useHash()
  }

  public get(
    firestore: Firestore,
    providerConfig: LovProviderDefinition,
    ck?: string
  ): BaseListOfValueProvider {
    const cacheKey = ListOfValueFactory.getCacheKey(providerConfig, ck)
    const instanceKey = `${providerConfig.kind}:${cacheKey}`

    // Return existing instance if available
    if (this.instances.has(instanceKey)) {
      return this.instances.get(instanceKey)!
    }

    // Create new instance based on kind
    let provider: BaseListOfValueProvider

    switch (providerConfig.kind) {
      case 'api':
        provider = new ApiListOfValueProvider(firestore, cacheKey, providerConfig)
        break
      case 'googlesheet':
        provider = new GoogleSheetListOfValueProvider(firestore, cacheKey, providerConfig)
        break
    }

    // Cache the instance
    this.instances.set(instanceKey, provider)
    return provider
  }

  // Helper method to create provider from LoV definition
  public static createProvider(
    lovDef: LovDefinition,
    firestore: Firestore
  ): BaseListOfValueProvider {
    const factory = ListOfValueFactory.shared()
    return factory.get(firestore, lovDef.provider)
  }
}
