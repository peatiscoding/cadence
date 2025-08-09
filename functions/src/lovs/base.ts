import { Firestore, Timestamp, FieldValue } from 'firebase-admin/firestore'

export interface ListOfValueEntry {
  key: string
  value: string
  meta?: any
}

interface CachedLovData {
  kind: string
  cacheKey: string
  values: ListOfValueEntry[]
  expiredAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
}

const LOV_CACHE_COLLECTION_KEY = 'lov-cache'

export abstract class BaseListOfValueProvider {
  constructor(
    protected readonly firestore: Firestore,
    public readonly kind: string,
    public readonly cacheKey: string
  ) {}

  public async list(ignoreCache: boolean = false): Promise<ListOfValueEntry[]> {
    if (!ignoreCache) {
      const cached = await this.getFromCache()
      if (cached && this.isCacheValid(cached)) {
        return cached.values
      }
    }

    // Fetch from source and cache the result
    const freshData = await this.fetchFromSource()
    await this.save(freshData)
    return freshData
  }

  protected abstract fetchFromSource(): Promise<ListOfValueEntry[]>

  protected async save(lovEntries: ListOfValueEntry[]): Promise<void> {
    const cacheDocRef = this.firestore.collection(LOV_CACHE_COLLECTION_KEY).doc(this.cacheKey)

    const cacheData: CachedLovData = {
      kind: this.kind,
      cacheKey: this.cacheKey,
      values: lovEntries,
      expiredAt: this.getExpirationTimestamp(),
      updatedAt: FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp
    }

    await cacheDocRef.set(cacheData)
  }

  private async getFromCache(): Promise<CachedLovData | null> {
    try {
      const cacheDocRef = this.firestore.collection(LOV_CACHE_COLLECTION_KEY).doc(this.cacheKey)
      const doc = await cacheDocRef.get()

      if (!doc.exists) {
        return null
      }

      return doc.data() as CachedLovData
    } catch (error) {
      console.error('Failed to get cached LoV data:', error)
      return null
    }
  }

  private isCacheValid(cached: CachedLovData): boolean {
    const now = new Date()
    const expiredAt = cached.expiredAt.toDate()
    return now < expiredAt
  }

  protected getExpirationTimestamp(): FirebaseFirestore.Timestamp {
    const expirationMinutes = this.getCacheExpirationMinutes()
    const expirationTime = new Date(Date.now() + expirationMinutes * 60 * 1000)
    return Timestamp.fromDate(expirationTime)
  }

  // Optional method for subclasses to override cache expiration logic
  protected getCacheExpirationMinutes(): number {
    return 60 // Default: 1 hour
  }
}
