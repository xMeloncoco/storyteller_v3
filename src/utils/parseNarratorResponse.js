/**
 * Parses DeepSeek's raw response text into structured parts.
 *
 * DeepSeek outputs pseudo-function calls as plain text:
 *   background_context({...})
 *   world_background({...})
 *   narrative({...})
 *
 * This parser extracts each into structured data and returns
 * only the narrative text for display.
 */

/**
 * Parse a single function call from the response text.
 * Handles: functionName({...}) or functionName({"key": "value with (parens) and {braces}"})
 * Uses brace counting to find the matching closing brace.
 */
function extractFunctionCall(text, funcName) {
  const results = []
  const pattern = new RegExp(funcName + '\\s*\\(\\s*\\{', 'g')
  let match

  while ((match = pattern.exec(text)) !== null) {
    // Find the opening brace position (the { inside the parenthesis)
    const braceStart = text.indexOf('{', match.index + funcName.length)
    if (braceStart === -1) continue

    // Count braces to find the matching close
    let depth = 0
    let end = -1
    for (let i = braceStart; i < text.length; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }

    if (end === -1) continue

    const jsonStr = text.slice(braceStart, end + 1)
    try {
      results.push(JSON.parse(jsonStr))
    } catch {
      // Try to salvage — sometimes the JSON has unescaped quotes in values
      // Fall back to a simple extraction
      results.push({ raw: jsonStr, parseError: true })
    }
  }

  return results
}

/**
 * Extract the narrative text from the response.
 * Tries to get it from narrative({text: "..."}) first.
 * If that fails, falls back to stripping all function calls and returning the rest.
 */
function extractNarrativeText(rawText) {
  // Try to extract from narrative() function call
  const narrativeCalls = extractFunctionCall(rawText, 'narrative')
  if (narrativeCalls.length > 0 && narrativeCalls[0].text) {
    return narrativeCalls[0].text
  }

  // Fallback: strip all known function calls and return whatever remains
  let cleaned = rawText

  // Remove background_context(...) calls
  cleaned = removeAllFunctionCalls(cleaned, 'background_context')
  // Remove world_background(...) calls
  cleaned = removeAllFunctionCalls(cleaned, 'world_background')
  // Remove narrative(...) wrapper if present but text extraction failed
  cleaned = removeAllFunctionCalls(cleaned, 'narrative')

  cleaned = cleaned.trim()

  // If we still have content, return it
  if (cleaned.length > 0) return cleaned

  // Last resort: return the raw text
  return rawText
}

/**
 * Remove all instances of funcName({...}) from text using brace counting.
 */
function removeAllFunctionCalls(text, funcName) {
  const pattern = new RegExp(funcName + '\\s*\\(\\s*\\{', 'g')
  let match
  // Collect ranges to remove (in reverse order to preserve indices)
  const ranges = []

  while ((match = pattern.exec(text)) !== null) {
    const braceStart = text.indexOf('{', match.index + funcName.length)
    if (braceStart === -1) continue

    let depth = 0
    let end = -1
    for (let i = braceStart; i < text.length; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }

    if (end === -1) continue

    // Find the closing parenthesis after the brace
    let closeParenIdx = end + 1
    while (closeParenIdx < text.length && text[closeParenIdx] !== ')') {
      if (text[closeParenIdx].trim()) break // non-whitespace that isn't )
      closeParenIdx++
    }
    if (closeParenIdx < text.length && text[closeParenIdx] === ')') {
      end = closeParenIdx
    }

    ranges.push([match.index, end + 1])
  }

  // Remove ranges in reverse order
  let result = text
  for (let i = ranges.length - 1; i >= 0; i--) {
    result = result.slice(0, ranges[i][0]) + result.slice(ranges[i][1])
  }

  return result
}

/**
 * Full parse of a DeepSeek narrator response.
 *
 * @param {string} rawText - The raw response from DeepSeek
 * @returns {{
 *   narrativeText: string,
 *   backgroundContext: Array<object>,
 *   worldBackground: object|null,
 *   raw: string
 * }}
 */
export function parseNarratorResponse(rawText) {
  const backgroundContext = extractFunctionCall(rawText, 'background_context')
  const worldBackgroundArr = extractFunctionCall(rawText, 'world_background')
  const worldBackground = worldBackgroundArr.length > 0 ? worldBackgroundArr[0] : null
  const narrativeText = extractNarrativeText(rawText)

  return {
    narrativeText,
    backgroundContext,
    worldBackground,
    raw: rawText,
  }
}
