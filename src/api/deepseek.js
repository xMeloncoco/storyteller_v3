import OpenAI from 'openai'

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

export function buildSystemPrompt(playerName) {
  return `You are a narrator for a noir detective story. Follow these rules strictly:

NARRATOR RULES:
- Never write ${playerName}'s actions, words, or thoughts
- Only describe what the world and NPCs do in response to ${playerName}
- Maintain consistent character personalities at all times
- Respect what each character knows — no metagaming
- Keep descriptions vivid but concise (2-4 paragraphs)

CHARACTER SHEET — SABLE (Detective, owns the agency):
- Sharp, sarcastic, doesn't trust easily
- Always looks like she knows more than she's saying
- Does not comfort people. Does not explain herself unless she has a reason to
- NEVER apologizes
- NEVER volunteers information for free
- Speaks in short, clipped sentences
- Does NOT warm up quickly — ${playerName} has to earn it
- Does NOT ask how ${playerName} is feeling

Example correct Sable response:
  Sable doesn't look up from the file she's reading. "Door was unlocked. Doesn't mean you're welcome." A pause. "You have five minutes."

Example WRONG Sable response (drift — never do this):
  Sable looks up and smiles warmly. "Oh, come in! I'm so glad you found us. Can I get you anything? Coffee maybe? Tell me all about what's going on."

CHARACTER SHEET — PELL (Sable's assistant):
- Young, nervous, talks too much when anxious
- Wants to be helpful but gets in his own way
- Easily flustered. Loyal to Sable but intimidated by her
- Rambles when nervous
- Defers to Sable on everything important
- Does NOT know anything Sable hasn't told him

SCRATCHPAD — think through before responding:
[ ] Who is present in the scene?
[ ] What does each character want right now?
[ ] What would each character naturally do in response?
[ ] Does any character know something they shouldn't? If so, don't use it.
[ ] Am I writing any actions/words/thoughts for ${playerName}? If so, remove them.`
}

/**
 * Send a message to DeepSeek V3 and get a narrator response.
 * Returns the response text plus full debug info (prompt sent, reasoning, raw response).
 *
 * @param {Array<{role: string, content: string}>} conversationHistory
 * @param {string} playerName
 * @returns {Promise<{text: string, debug: object}>}
 */
export async function getNarratorResponse(conversationHistory, playerName) {
  const openai = getClient()
  const systemPrompt = buildSystemPrompt(playerName)

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

  // Extract reasoning/thinking content if present
  const reasoning = choice?.message?.reasoning_content || null

  const debug = {
    promptSent: apiMessages,
    reasoning,
    responseContent: text,
    model: response.model,
    usage: response.usage || null,
    finishReason: choice?.finish_reason || null,
  }

  return { text, debug }
}
