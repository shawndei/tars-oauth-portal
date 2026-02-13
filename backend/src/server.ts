import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { initDatabase, getConversations, getConversationById, createConversation, addMessage } from './db.ts'
import { synthesizeVoice, generateResponse } from './services/tts.ts'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}))
app.use(express.json())

// Initialize database
initDatabase()

// Routes

// GET /api/conversations - List all conversations
app.get('/api/conversations', (req: Request, res: Response) => {
  try {
    const conversations = getConversations()
    res.json(conversations)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    res.status(500).json({ error: 'Failed to fetch conversations' })
  }
})

// POST /api/conversations - Create new conversation
app.post('/api/conversations', (req: Request, res: Response) => {
  try {
    const { title } = req.body
    const id = uuidv4()
    const newConversation = createConversation(id, title || 'New Conversation')
    res.status(201).json(newConversation)
  } catch (error) {
    console.error('Error creating conversation:', error)
    res.status(500).json({ error: 'Failed to create conversation' })
  }
})

// GET /api/conversations/:id - Get conversation messages
app.get('/api/conversations/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const conversation = getConversationById(id)
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }
    res.json(conversation)
  } catch (error) {
    console.error('Error fetching conversation:', error)
    res.status(500).json({ error: 'Failed to fetch conversation' })
  }
})

// POST /api/chat - Send message and get response
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { conversationId, message, tone } = req.body
    
    if (!conversationId || !message) {
      res.status(400).json({ error: 'Missing conversationId or message' })
      return
    }

    // Store user message
    const userMessageId = uuidv4()
    addMessage(conversationId, userMessageId, 'user', message)

    // Generate TARS response
    const responseText = await generateResponse(message, tone || 'default')
    
    // Synthesize voice
    const audioData = await synthesizeVoice(responseText)
    
    // Store assistant message
    const assistantMessageId = uuidv4()
    addMessage(conversationId, assistantMessageId, 'assistant', responseText, audioData)

    res.json({
      id: assistantMessageId,
      role: 'assistant',
      content: responseText,
      audioUrl: audioData ? `data:audio/mp3;base64,${audioData}` : null
    })
  } catch (error) {
    console.error('Error processing chat:', error)
    res.status(500).json({ error: 'Failed to process message' })
  }
})

// POST /api/voice-synthesis - Text to speech only
app.post('/api/voice-synthesis', async (req: Request, res: Response) => {
  try {
    const { text, voice, speed } = req.body
    
    if (!text) {
      res.status(400).json({ error: 'Missing text' })
      return
    }

    const audioData = await synthesizeVoice(text, voice || 'tars_clone', speed || 1.0)
    
    res.json({
      audioUrl: audioData ? `data:audio/mp3;base64,${audioData}` : null,
      duration: audioData ? 'unknown' : null
    })
  } catch (error) {
    console.error('Error synthesizing voice:', error)
    res.status(500).json({ error: 'Failed to synthesize voice' })
  }
})

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const server = app.listen(PORT, () => {
  console.log(`TARS Chat API server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`CORS origin: ${process.env.CORS_ORIGIN || '*'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing gracefully...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
