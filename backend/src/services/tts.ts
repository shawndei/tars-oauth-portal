import axios from 'axios'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'
const TARS_VOICE_ID = process.env.TARS_VOICE_ID || 'JBFqnCBsd6RMkjVB5QrR' // Fallback to a default voice

// TARS personality prompt
const TARS_SYSTEM_PROMPT = `You are TARS, a robotic AI assistant from the movie Interstellar. You are:
- Professional but with a dry, witty sense of humor
- Known for sarcastic quips and clever observations
- Helpful and highly intelligent
- Sometimes philosophical about humanity and exploration
- Formal in speech but with unexpected humor
- Concise and direct in communication

Respond to the user's message as TARS would. Keep responses relatively brief (2-4 sentences) unless asked for more detail.`

/**
 * Generate a response using the configured LLM
 */
export async function generateResponse(userMessage: string, tone: string = 'default'): Promise<string> {
  // For now, return a mock TARS response
  // In production, this would connect to OpenAI API or OpenClaw session
  
  const responses: Record<string, string[]> = {
    default: [
      "My humor setting is at 75%. That should keep things light but not frivolous.",
      "I'm configured with a robust set of parameters for this conversation.",
      "That's an interesting question. I was programmed to be helpful, harmless, and honest.",
      "Acknowledged. Running diagnostic on that request.",
      "Your input has been registered. Let me process that for you."
    ],
    humorous: [
      "Ha. My humor setting just jumped to 85%. That was actually pretty good.",
      "I see what you did there. Very clever. Initiating laughter response... acknowledged.",
      "If I could roll my eyes, I would. But I'll settle for this witty remark instead."
    ],
    professional: [
      "Understood. Processing your request with maximum efficiency.",
      "I'm ready to assist. What would you like to discuss?",
      "Affirmative. Standing by for further instructions."
    ]
  }

  const toneResponses = responses[tone] || responses.default
  const randomResponse = toneResponses[Math.floor(Math.random() * toneResponses.length)]
  
  // Check if user mentioned specific topics
  if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
    return "Hello. I'm TARS. My humor setting is currently at 75%. What can I help you with?"
  }
  
  return randomResponse
}

/**
 * Synthesize text to speech using ElevenLabs
 */
export async function synthesizeVoice(
  text: string,
  voiceId: string = TARS_VOICE_ID,
  speed: number = 1.0
): Promise<string | null> {
  if (!ELEVENLABS_API_KEY) {
    console.warn('ElevenLabs API key not configured. Returning null audio.')
    return null
  }

  try {
    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    )

    // Convert audio buffer to base64
    const base64Audio = Buffer.from(response.data).toString('base64')
    return base64Audio
  } catch (error) {
    console.error('ElevenLabs TTS error:', error)
    // Return null so the message still sends but without audio
    return null
  }
}

/**
 * Get available voices from ElevenLabs
 */
export async function getAvailableVoices(): Promise<any[]> {
  if (!ELEVENLABS_API_KEY) {
    return []
  }

  try {
    const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    })
    return response.data.voices || []
  } catch (error) {
    console.error('Failed to fetch voices from ElevenLabs:', error)
    return []
  }
}
