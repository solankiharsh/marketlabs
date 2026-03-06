import request from '@/utils/request'

const api = {
  strategies: '/addons/marketlabs/strategy/strategies',
  createAIStrategy: '/addons/marketlabs/strategy/aiCreate',
  updateAIStrategy: '/addons/marketlabs/strategy/aiUpdate',
  deleteStrategy: '/addons/marketlabs/strategy/delete',
  startStrategy: '/addons/marketlabs/strategy/start',
  stopStrategy: '/addons/marketlabs/strategy/stop',
  testConnection: '/addons/marketlabs/strategy/testConnection',
  aiDecisions: '/addons/marketlabs/strategy/aiDecisions',
  getCryptoSymbols: '/addons/marketlabs/strategy/getCryptoSymbols'
}

/**
 * Get AI trading strategy list
 */
export function getStrategies () {
  return request({
    url: api.strategies,
    method: 'get'
  })
}

/**
 * Create AI trading strategy
 */
export function createAIStrategy (data) {
  return request({
    url: api.createAIStrategy,
    method: 'post',
    data
  })
}

/**
 * Update AI trading strategy
 */
export function updateAIStrategy (data) {
  return request({
    url: api.updateAIStrategy,
    method: 'post',
    data
  })
}

/**
 * Delete strategy
 */
export function deleteStrategy (strategyId) {
  return request({
    url: api.deleteStrategy,
    method: 'delete',
    params: { id: strategyId }
  })
}

/**
 * Start strategy
 */
export function startStrategy (strategyId) {
  return request({
    url: api.startStrategy,
    method: 'post',
    params: { id: strategyId }
  })
}

/**
 * Stop strategy
 */
export function stopStrategy (strategyId) {
  return request({
    url: api.stopStrategy,
    method: 'post',
    params: { id: strategyId }
  })
}

/**
 * Test exchange connection
 */
export function testConnection (data) {
  return request({
    url: api.testConnection,
    method: 'post',
    data
  })
}

/**
 * Get AI decision records
 */
export function getAIDecisions (strategyId, params) {
  return request({
    url: api.aiDecisions,
    method: 'get',
    params: {
      strategy_id: strategyId,
      ...params
    }
  })
}

/**
 * Get supported trading pair list
 */
export function getCryptoSymbols () {
  return request({
    url: api.getCryptoSymbols,
    method: 'get'
  })
}
