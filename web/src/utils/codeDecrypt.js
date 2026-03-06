/**
 * Indicator Code Decryption Utility
 * Used to decrypt encrypted indicator code purchased by users
 */

import CryptoJS from 'crypto-js'
import request from '@/utils/request'

/**
 * Decrypt indicator code
 *
 * @param {string} encryptedCode - Base64-encoded encrypted code
 * @param {number} userId - User ID
 * @param {number} indicatorId - Indicator ID
 * @param {string} encryptedKey - Server secret key (base64-encoded, fetched from backend)
 * @returns {string} - Decrypted code
 */
export function decryptCode (encryptedCode, userId, indicatorId, encryptedKey) {
  if (!encryptedCode || !userId || !indicatorId || !encryptedKey) {
    return encryptedCode
  }

  try {
    // Decode base64 encrypted code
    const combined = CryptoJS.enc.Base64.parse(encryptedCode)

    // Extract IV (first 16 bytes) and encrypted data
    const ivWords = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4)) // First 16 bytes (4 words)
    const encryptedWords = CryptoJS.lib.WordArray.create(combined.words.slice(4)) // Remaining part

    // Decryption key (base64-encoded key fetched from backend)
    // encryptedKey is a base64-encoded key from the backend, decode it directly
    const key = CryptoJS.enc.Base64.parse(encryptedKey)

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encryptedWords },
      key,
      {
        iv: ivWords,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    )

    // Convert to string
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8)

    if (!decryptedText) {
      return encryptedCode
    }

    return decryptedText
  } catch (error) {
    // Decryption failed, return original code (backward compatible)
    return encryptedCode
  }
}

/**
 * Fetch decryption key from backend (dynamic key)
 *
 * @param {number} userId - User ID
 * @param {number} indicatorId - Indicator ID
 * @returns {Promise<string>} - Decryption key (base64-encoded)
 */
export async function getDecryptKey (userId, indicatorId) {
  if (!userId || !indicatorId) {
    throw new Error('User ID and Indicator ID are required')
  }

  try {
    // Dynamic request: fetch from backend API
    const response = await request({
      url: '/api/indicator/getDecryptKey',
      method: 'post',
      data: {
        userid: userId,
        indicatorId: indicatorId
      }
    })

    if (response.code === 1 && response.data && response.data.key) {
      // Return base64-encoded key
      return response.data.key
    } else {
      throw new Error(response.msg || 'Failed to get decryption key')
    }
  } catch (error) {
    // If backend API fails, throw error without using fallback key (more secure)
    throw new Error('Unable to get decryption key, please check network connection or contact admin: ' + (error.message || 'Unknown error'))
  }
}

/**
 * Smart code decryption (auto-fetches key)
 *
 * @param {string} encryptedCode - Encrypted code
 * @param {number} userId - User ID
 * @param {number} indicatorId - Indicator ID
 * @returns {Promise<string>} - Decrypted code
 */
export async function decryptCodeAuto (encryptedCode, userId, indicatorId) {
  // Dynamically fetch decryption key from backend (base64-encoded)
  const encryptedKey = await getDecryptKey(userId, indicatorId)
  // Decrypt using the fetched key
  return decryptCode(encryptedCode, userId, indicatorId, encryptedKey)
}

/**
 * Check if code needs decryption
 *
 * @param {string} code - Code
 * @param {number} isEncrypted - Encryption flag
 * @returns {boolean}
 */
export function needsDecrypt (code, isEncrypted) {
  // If explicitly marked as encrypted, or code is long and matches base64 format, it may need decryption
  if (isEncrypted === 1 || isEncrypted === true) {
    return true
  }

  // Simple check: encrypted code is usually long (base64 encoding adds ~33%)
  if (code && code.length > 100) {
    // Try base64 decode check
    try {
      const decoded = atob(code)
      // If decoded length is reasonable, it may be encrypted
      if (decoded.length > 50) {
        return true
      }
    } catch (e) {
      // Not base64, no decryption needed
    }
  }

  return false
}
