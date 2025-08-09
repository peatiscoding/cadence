# List of Value

List of value is a system that take into consideration the definition provided by the workflow's definition. Use that to initialize the LovProviderInstance with the configuration provided.

The initialization step would look like:

```ts
const instance = ListOfValueFactory.get(kind, definedLovConfiguration)
const listOfValue = await instance.list()
```

now the factory will be responsible for taken care of initialization and keeping track of the instance based on `kind` + `cacheKey`. Keep in mind that `kind` = Implementation Class, `cacheKey` represent the configuration. Meaning if `configuration` has different value it should not being use the same `cacheKey` however it the workflow configuration provided the `cacheKey` system will honor that value right away.

List of value (LoV) is List of value that can be provided and cached in the Firestore. The list of value metadata (definition) is stored on the Firestore document like so...

```
lov-cache/${key}/
    - kind: string // list of value provider classes defined in `functions/src/lovs/` dir.
    - cacheKey: string // key reference to the factory.
    - values: { key: string, value: string }[]
    - expiredAt: serverTimestamp // the timestamp that render this cached value expired.
    - updatedAt: serverTimestamp // the timestmap that this cache has been updated.
```

The fetching logic is customisable based on `kind` & `cacheKey` the factory would look up the implementation based on `kind` while the `cacheKey` is the unique identifier for the actual instance of the LovProvider object.

