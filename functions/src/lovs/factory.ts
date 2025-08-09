import type { LovDefinition, LovProviderDefinition } from '@cadence/shared/types'

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

  public get(
    providerConfig: LovProviderDefinition,
    cacheKey: string,
    firestore: Firestore
  ): BaseListOfValueProvider {
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
    return factory.get(lovDef.provider, lovDef.cacheKey, firestore)
  }
}
