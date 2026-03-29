import OpenAI from 'openai'

const SYSTEM_PROMPT = 'You are a narrator for a noir detective story.'

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
 *
 * @param {Array<{role: string, content: string}>} conversationHistory
 *   The full conversation so far (user + narrator messages).
 * @returns {Promise<string>} The narrator's response text.
 */
export async function getNarratorResponse(conversationHistory) {
  const openai = getClient()

  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.map((msg) => ({
      role: msg.role === 'narrator' ? 'assistant' : 'user',
      content: msg.content,
    })),
  ]

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: apiMessages,
  })

  const text = response.choices?.[0]?.message?.content
  if (!text) {
    throw new Error('DeepSeek returned an empty response')
  }

  return text
}

export { SYSTEM_PROMPT }
