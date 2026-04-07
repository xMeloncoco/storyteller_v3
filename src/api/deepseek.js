import OpenAI from 'openai'
import { parseNarratorResponse } from '../utils/parseNarratorResponse'

let client = null

function getClient() {
  if (client) return client

  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error(
      'DeepSeek API key not found. Create a .env file with VITE_DEEPSEEK_API_KEY=your_key'
    )
  }

  client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
    dangerouslyAllowBrowser: true,
  })
  return client
}

/**
 * Send a message to DeepSeek V3 and get a narrator response.
 * Returns the response text plus full debug info.
 *
 * @param {Array<{role: string, content: string}>} conversationHistory
 * @param {string} systemPrompt - pre-built system prompt from buildSystemPrompt()
 * @returns {Promise<{text: string, debug: object}>}
 */
export async function getNarratorResponse(conversationHistory, systemPrompt) {
  const openai = getClient()

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role === 'narrator' ? 'assistant' : 'user',
      content: msg.content,
    })),
  ]

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: apiMessages,
  })

  const choice = response.choices?.[0]
  const text = choice?.message?.content
  if (!text) {
    throw new Error('DeepSeek returned an empty response')
  }

  const reasoning = choice?.message?.reasoning_content || null

  // Parse the raw response into structured parts
  const parsed = parseNarratorResponse(text)

  const debug = {
    promptSent: apiMessages,
    reasoning,
    rawResponse: text,
    backgroundContext: parsed.backgroundContext,
    worldBackground: parsed.worldBackground,
    model: response.model,
    usage: response.usage || null,
    finishReason: choice?.finish_reason || null,
  }

  return { text: parsed.narrativeText, parsed, debug }
}
