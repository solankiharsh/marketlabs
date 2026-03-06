import request from '@/utils/request'

const api = {
  // Local Python backend
  strategies: '/api/strategies',
  strategyDetail: '/api/strategies/detail',
  createStrategy: '/api/strategies/create',
  batchCreateStrategies: '/api/strategies/batch-create',
  updateStrategy: '/api/strategies/update',
  stopStrategy: '/api/strategies/stop',
  startStrategy: '/api/strategies/start',
  deleteStrategy: '/api/strategies/delete',
  batchStartStrategies: '/api/strategies/batch-start',
  batchStopStrategies: '/api/strategies/batch-stop',
  batchDeleteStrategies: '/api/strategies/batch-delete',
  testConnection: '/api/strategies/test-connection',
  trades: '/api/strategies/trades',
  positions: '/api/strategies/positions',
  equityCurve: '/api/strategies/equityCurve',
  notifications: '/api/strategies/notifications'
}

/**
 * Get strategy list
 * @param {Object} params - Query parameters
 * @param {number} params.user_id - User ID (optional)
 */
export function getStrategyList (params = {}) {
  return request({
    url: api.strategies,
    method: 'get',
    params
  })
}

/**
 * Get strategy detail
 * @param {number} id - Strategy ID
 */
export function getStrategyDetail (id) {
  return request({
    url: api.strategyDetail,
    method: 'get',
    params: { id }
  })
}

/**
 * Create strategy
 * @param {Object} data - Strategy data
 * @param {number} data.user_id - User ID
 * @param {string} data.strategy_name - Strategy name
 * @param {string} data.strategy_type - Strategy type
 * @param {Object} data.llm_model_config - LLM model configuration
 * @param {Object} data.exchange_config - Exchange configuration
 * @param {Object} data.trading_config - Trading configuration
 */
export function createStrategy (data) {
  return request({
    url: api.createStrategy,
    method: 'post',
    data
  })
}

/**
 * Batch create strategies (multiple symbols)
 * @param {Object} data - Strategy data
 * @param {string} data.strategy_name - Base strategy name
 * @param {Array} data.symbols - Symbol array, e.g. ["Crypto:BTC/USDT", "Crypto:ETH/USDT"]
 */
export function batchCreateStrategies (data) {
  return request({
    url: api.batchCreateStrategies,
    method: 'post',
    data
  })
}

/**
 * Update strategy
 * @param {number} id - Strategy ID
 * @param {Object} data - Strategy data
 * @param {string} data.strategy_name - Strategy name (optional)
 * @param {Object} data.indicator_config - Technical indicator configuration (optional)
 * @param {Object} data.exchange_config - Exchange configuration (optional)
 * @param {Object} data.trading_config - Trading configuration (optional)
 */
export function updateStrategy (id, data) {
  return request({
    url: api.updateStrategy,
    method: 'put',
    params: { id },
    data
  })
}

/**
 * Stop strategy
 * @param {number} id - Strategy ID
 */
export function stopStrategy (id) {
  return request({
    url: api.stopStrategy,
    method: 'post',
    params: { id }
  })
}

/**
 * Start strategy
 * @param {number} id - Strategy ID
 */
export function startStrategy (id) {
  return request({
    url: api.startStrategy,
    method: 'post',
    params: { id }
  })
}

/**
 * Delete strategy
 * @param {number} id - Strategy ID
 */
export function deleteStrategy (id) {
  return request({
    url: api.deleteStrategy,
    method: 'delete',
    params: { id }
  })
}

/**
 * Batch start strategies
 * @param {Object} data
 * @param {Array} data.strategy_ids - Strategy ID array
 * @param {string} data.strategy_group_id - Strategy group ID (optional, either this or strategy_ids)
 */
export function batchStartStrategies (data) {
  return request({
    url: api.batchStartStrategies,
    method: 'post',
    data
  })
}

/**
 * Batch stop strategies
 * @param {Object} data
 * @param {Array} data.strategy_ids - Strategy ID array
 * @param {string} data.strategy_group_id - Strategy group ID (optional, either this or strategy_ids)
 */
export function batchStopStrategies (data) {
  return request({
    url: api.batchStopStrategies,
    method: 'post',
    data
  })
}

/**
 * Batch delete strategies
 * @param {Object} data
 * @param {Array} data.strategy_ids - Strategy ID array
 * @param {string} data.strategy_group_id - Strategy group ID (optional, either this or strategy_ids)
 */
export function batchDeleteStrategies (data) {
  return request({
    url: api.batchDeleteStrategies,
    method: 'delete',
    data
  })
}

/**
 * Test exchange connection
 * @param {Object} exchangeConfig - Exchange configuration
 */
export function testExchangeConnection (exchangeConfig) {
  return request({
    url: api.testConnection,
    method: 'post',
    data: { exchange_config: exchangeConfig }
  })
}

/**
 * Get strategy trade records
 * @param {number} id - Strategy ID
 */
export function getStrategyTrades (id) {
  return request({
    url: api.trades,
    method: 'get',
    params: { id }
  })
}

/**
 * Get strategy position records
 * @param {number} id - Strategy ID
 */
export function getStrategyPositions (id) {
  return request({
    url: api.positions,
    method: 'get',
    params: { id }
  })
}

/**
 * Get strategy equity curve
 * @param {number} id - Strategy ID
 */
export function getStrategyEquityCurve (id) {
  return request({
    url: api.equityCurve,
    method: 'get',
    params: { id }
  })
}

/**
 * Strategy signal notifications (browser channel persistence).
 * @param {Object} params
 * @param {number} params.id - strategy id (optional)
 * @param {number} params.limit - max items (optional)
 * @param {number} params.since_id - return items with id > since_id (optional)
 */
export function getStrategyNotifications (params = {}) {
  return request({
    url: api.notifications,
    method: 'get',
    params
  })
}
