import request, { ANALYSIS_TIMEOUT } from '@/utils/request'

const marketApi = {
  // Watchlist
  GetWatchlist: '/api/market/watchlist/get',
  AddWatchlist: '/api/market/watchlist/add',
  RemoveWatchlist: '/api/market/watchlist/remove',
  GetWatchlistPrices: '/api/market/watchlist/prices',
  // Analysis
  MultiAnalysis: '/api/analysis/multiAnalysis',
  CreateAnalysisTask: '/api/analysis/createTask',
  GetAnalysisTaskStatus: '/api/analysis/getTaskStatus',
  GetAnalysisHistoryList: '/api/analysis/getHistoryList',
  DeleteAnalysisTask: '/api/analysis/deleteTask',
  ReflectAnalysis: '/api/analysis/reflect',
  // AI chat (optional)
  ChatMessage: '/api/ai/chat/message',
  GetChatHistory: '/api/ai/chat/history',
  SaveChatHistory: '/api/ai/chat/history/save',
  // Public config
  GetConfig: '/api/market/config',
  GetMenuFooterConfig: '/api/market/menuFooterConfig',
  // Market metadata
  GetMarketTypes: '/api/market/types',
  // Symbol search
  SearchSymbols: '/api/market/symbols/search',
  GetHotSymbols: '/api/market/symbols/hot'
}

/**
 * Get watchlist
 * @param parameter { userid: number }
 * @returns {*}
 */
export function getWatchlist (parameter) {
  return request({
    url: marketApi.GetWatchlist,
    method: 'get',
    params: parameter
  })
}

/**
 * Add to watchlist
 * @param parameter { userid: number, market: string, symbol: string }
 * @returns {*}
 */
export function addWatchlist (parameter) {
  return request({
    url: marketApi.AddWatchlist,
    method: 'post',
    data: parameter
  })
}

/**
 * Remove from watchlist
 * @param parameter { userid: number, symbol: string }
 * @returns {*}
 */
export function removeWatchlist (parameter) {
  return request({
    url: marketApi.RemoveWatchlist,
    method: 'post',
    data: parameter
  })
}

/**
 * Get watchlist prices
 * @param parameter { watchlist: array } watchlist format: [{market: 'USStock', symbol: 'AAPL'}, ...]
 * @returns {*}
 */
export function getWatchlistPrices (parameter) {
  return request({
    url: marketApi.GetWatchlistPrices,
    method: 'get',
    params: {
      watchlist: JSON.stringify(parameter.watchlist || [])
    }
  })
}

/**
 * Send AI chat message
 * @param parameter { userid: number, message: string, chatId?: string }
 * @returns {*}
 */
export function chatMessage (parameter) {
  return request({
    url: marketApi.ChatMessage,
    method: 'post',
    data: parameter
  })
}

/**
 * Get chat history
 * @param parameter { userid: number }
 * @returns {*}
 */
export function getChatHistory (parameter) {
  return request({
    url: marketApi.GetChatHistory,
    method: 'get',
    params: parameter
  })
}

/**
 * Save chat history
 * @param parameter { userid: number, chatHistory: array }
 * @returns {*}
 */
export function saveChatHistory (parameter) {
  return request({
    url: marketApi.SaveChatHistory,
    method: 'post',
    data: parameter
  })
}

/**
 * Execute multi-dimensional analysis
 * @param parameter { userid: number, market: string, symbol: string }
 * @returns {*}
 */
export function multiAnalysis (parameter) {
  return request({
    url: marketApi.MultiAnalysis,
    method: 'post',
    data: parameter,
    timeout: ANALYSIS_TIMEOUT // Extended timeout for AI analysis
  })
}

/**
 * Create analysis task
 * @param parameter { userid: number, market: string, symbol: string }
 * @returns {*}
 */
export function createAnalysisTask (parameter) {
  return request({
    url: marketApi.CreateAnalysisTask,
    method: 'post',
    data: parameter
  })
}

/**
 * Get analysis task status
 * @param parameter { task_id: number }
 * @returns {*}
 */
export function getAnalysisTaskStatus (parameter) {
  return request({
    url: marketApi.GetAnalysisTaskStatus,
    method: 'get',
    params: parameter
  })
}

/**
 * Get analysis history list
 * @param parameter { userid: number, page?: number, pagesize?: number }
 * @returns {*}
 */
export function getAnalysisHistoryList (parameter) {
  return request({
    url: marketApi.GetAnalysisHistoryList,
    method: 'get',
    params: parameter
  })
}

/**
 * Delete analysis task
 * @param parameter { task_id: number }
 * @returns {*}
 */
export function deleteAnalysisTask (parameter) {
  return request({
    url: marketApi.DeleteAnalysisTask,
    method: 'post',
    data: parameter
  })
}

/**
 * Reflection learning
 * @param parameter { market: string, symbol: string, decision: string, returns?: number, result?: string }
 * @returns {*}
 */
export function reflectAnalysis (parameter) {
  return request({
    url: marketApi.ReflectAnalysis,
    method: 'post',
    data: parameter
  })
}

/**
 * Get plugin configuration
 * @returns {*}
 */
export function getConfig () {
  return request({
    url: marketApi.GetConfig,
    method: 'get'
  })
}

/**
 * Get menu footer configuration
 * @returns {*}
 */
export function getMenuFooterConfig () {
  return request({
    url: marketApi.GetMenuFooterConfig,
    method: 'get'
  })
}

/**
 * Get market type list
 * @returns {*}
 */
export function getMarketTypes () {
  return request({
    url: marketApi.GetMarketTypes,
    method: 'get'
  })
}

/**
 * Search financial products
 * @param parameter { market: string, keyword: string, limit?: number }
 * @returns {*}
 */
export function searchSymbols (parameter) {
  return request({
    url: marketApi.SearchSymbols,
    method: 'get',
    params: parameter
  })
}

/**
 * Get hot symbols
 * @param parameter { market: string, limit?: number }
 * @returns {*}
 */
export function getHotSymbols (parameter) {
  return request({
    url: marketApi.GetHotSymbols,
    method: 'get',
    params: parameter
  })
}
