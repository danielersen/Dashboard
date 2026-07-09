import { getCacheValue } from "./get.js"
import { setCacheValue } from "./set.js"
import { deleteCacheValue, deleteCache } from "./delete.js"

export { getCacheValue, setCacheValue, deleteCacheValue, deleteCache }

// Export pour compatibilité avec l'import existant
export const Cache = { getCacheValue, setCacheValue, deleteCacheValue, deleteCache }

export default { getCacheValue, setCacheValue, deleteCacheValue, deleteCache }
