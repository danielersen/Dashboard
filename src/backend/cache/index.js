import { getCacheValue } from "./get.js"
import { setCacheValue } from "./set.js"
import { deleteCacheValue, deleteCache } from "./delete.js"
import { getCalculHistory, addCalculToHistory, clearCalculHistory } from "./calcul_history.js"

export { getCacheValue, setCacheValue, deleteCacheValue, deleteCache, getCalculHistory, addCalculToHistory, clearCalculHistory }

// Export pour compatibilité avec l'import existant
export const Cache = { getCacheValue, setCacheValue, deleteCacheValue, deleteCache, getCalculHistory, addCalculToHistory, clearCalculHistory }

export default { getCacheValue, setCacheValue, deleteCacheValue, deleteCache, getCalculHistory, addCalculToHistory, clearCalculHistory }
