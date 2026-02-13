import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { initDatabase, getConversations, getConversationById, createConversation, addMessage, updateMessageDelivery, getActiveChannels } from './db.ts'
import { synthesizeVoice, generateResponse } from './services/tts.ts'
import { channelRouter, createWebChatHandler, createWhatsAppHandler, createDiscordHandler } from './services/channel-router.ts'

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

// Initialize channel handlers
channelRouter.registerHandler(createWebChatHandler())
channelRouter.registerHandler(createWhatsAppHandler())
channelRouter.registerHandler(createDiscordHandler())

console.log(`Active channels: ${channelRouter.getActiveChannels().join(', ')}`)

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

// POST /api/chat - Send message and get response with MULTI-CHANNEL DELIVERY
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { conversationId, message, tone, channel = 'web', targetChannels } = req.body
    
    if (!conversationId || !message) {
      res.status(400).json({ error: 'Missing conversationId or message' })
      return
    }

    // Store user message with source channel
    const userMessageId = uuidv4()
    addMessage(conversationId, userMessageId, 'user', message, undefined, {
      sourceChannel: channel,
      channel: channel
    })

    // BROADCAST: Notify all other channels that a new user message arrived
    await channelRouter.broadcastResponse({
      messageId: userMessageId,
      conversationId,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      sourceChannel: channel,
      targetChannels: targetChannels || getActiveChannels(conversationId)
    })

    // Generate TARS response
    const responseText = await generateResponse(message, tone || 'default')
    
    // Synthesize voice
    const audioData = await synthesizeVoice(responseText)
    
    // Store assistant message
    const assistantMessageId = uuidv4()
    addMessage(conversationId, assistantMessageId, 'assistant', responseText, audioData, {
      channel: 'assistant',
      sourceChannel: channel // Track which channel triggered the response
    })

    // CRITICAL: BROADCAST RESPONSE TO ALL CHANNELS
    const deliveryResults = await channelRouter.broadcastToAll({
      messageId: assistantMessageId,
      conversationId,
      role: 'assistant',
      content: responseText,
      audioUrl: audioData ? `data:audio/mp3;base64,${audioData}` : undefined,
      timestamp: new Date().toISOString(),
      sourceChannel: channel,
      targetChannels: getActiveChannels(conversationId)
    })

    // Log delivery status
    const deliveryStatus = channelRouter.getDeliveryStatus(assistantMessageId)
    console.log(`[Multi-Channel] Response delivered to: ${deliveryStatus.delivered.join(', ')}`)
    if (deliveryStatus.pending.length > 0) {
      console.warn(`[Multi-Channel] Pending delivery to: ${deliveryStatus.pending.join(', ')}`)
    }

    // Update message record with delivery info
    updateMessageDelivery(assistantMessageId, deliveryStatus.delivered.join(','))

    // Send immediate response to requesting client
    res.json({
      id: assistantMessageId,
      role: 'assistant',
      content: responseText,
      audioUrl: audioData ? `data:audio/mp3;base64,${audioData}` : null,
      deliveredTo: deliveryStatus.delivered,
      pendingDelivery: deliveryStatus.pending
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

// POST /api/broadcast - Manually broadcast a message to all channels
app.post('/api/broadcast', async (req: Request, res: Response) => {
  try {
    const { conversationId, message, channel = 'web', targetChannels } = req.body
    
    if (!conversationId || !message) {
      res.status(400).json({ error: 'Missing conversationId or message' })
      return
    }

    const messageId = uuidv4()
    
    // Store message
    addMessage(conversationId, messageId, 'user', message, undefined, {
      sourceChannel: channel,
      channel: channel
    })

    // Broadcast to all channels
    const results = await channelRouter.broadcastToAll({
      messageId,
      conversationId,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      sourceChannel: channel,
      targetChannels: targetChannels || getActiveChannels(conversationId)
    })

    const deliveryStatus = channelRouter.getDeliveryStatus(messageId)
    
    res.json({
      messageId,
      deliveredTo: deliveryStatus.delivered,
      failedChannels: deliveryStatus.pending,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error broadcasting message:', error)
    res.status(500).json({ error: 'Failed to broadcast message' })
  }
})

// POST /api/whatsapp/webhook - Receive messages from WhatsApp
app.post('/api/whatsapp/webhook', async (req: Request, res: Response) => {
  try {
    const { conversationId, message, senderPhone, senderName } = req.body
    
    if (!conversationId || !message) {
      res.status(400).json({ error: 'Missing conversationId or message' })
      return
    }

    console.log(`[WhatsApp Webhook] Received message from ${senderName} (${senderPhone}): ${message}`)

    // Store the message from WhatsApp
    const messageId = uuidv4()
    addMessage(conversationId, messageId, 'user', message, undefined, {
      sourceChannel: 'whatsapp',
      channel: 'whatsapp'
    })

    // CRITICAL FIX: Broadcast this message to ALL active channels
    const results = await channelRouter.broadcastToAll({
      messageId,
      conversationId,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      sourceChannel: 'whatsapp',
      targetChannels: getActiveChannels(conversationId)
    })

    console.log(`[WhatsApp Webhook] Broadcasted message to:`, channelRouter.getDeliveryStatus(messageId).delivered)

    // Also trigger an automated response if enabled
    if (process.env.AUTO_RESPOND_WHATSAPP === 'true') {
      const responseText = await generateResponse(message, 'whatsapp')
      const audioData = await synthesizeVoice(responseText)
      
      const responseId = uuidv4()
      addMessage(conversationId, responseId, 'assistant', responseText, audioData, {
        channel: 'assistant',
        sourceChannel: 'whatsapp'
      })

      // Broadcast the response to ALL channels
      await channelRouter.broadcastToAll({
        messageId: responseId,
        conversationId,
        role: 'assistant',
        content: responseText,
        audioUrl: audioData ? `data:audio/mp3;base64,${audioData}` : undefined,
        timestamp: new Date().toISOString(),
        sourceChannel: 'whatsapp',
        targetChannels: getActiveChannels(conversationId)
      })
    }

    res.json({ success: true, messageId, broadcast: true })
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error)
    res.status(500).json({ error: 'Failed to process WhatsApp message' })
  }
})

// GET /api/channels - Get active channels
app.get('/api/channels', (req: Request, res: Response) => {
  try {
    const activeChannels = channelRouter.getActiveChannels()
    res.json({
      active: activeChannels,
      configured: ['web', 'whatsapp', 'discord'],
      count: activeChannels.length
    })
  } catch (error) {
    console.error('Error fetching channels:', error)
    res.status(500).json({ error: 'Failed to fetch channel status' })
  }
})

// GET /api/conversation/:id/channels - Get channels in a conversation
app.get('/api/conversations/:id/channels', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const channels = getActiveChannels(id)
    res.json({ conversationId: id, activeChannels: channels })
  } catch (error) {
    console.error('Error fetching conversation channels:', error)
    res.status(500).json({ error: 'Failed to fetch conversation channels' })
  }
})

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    multichannel: true,
    activeChannels: channelRouter.getActiveChannels()
  })
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
