/**
 * Channel Router Service
 * Handles multi-channel message distribution using broadcast pattern
 * Ensures messages go to ALL active channels simultaneously
 */

export interface ChannelNotification {
  messageId: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: string
  sourceChannel: string
  targetChannels: string[]
}

export interface ChannelHandler {
  name: string
  send: (notification: ChannelNotification) => Promise<boolean>
  isAvailable: () => boolean
}

class ChannelRouter {
  private handlers: Map<string, ChannelHandler> = new Map()
  private deliveryLog: Map<string, Set<string>> = new Map() // messageId -> set of delivered channels

  /**
   * Register a channel handler
   */
  registerHandler(handler: ChannelHandler): void {
    this.handlers.set(handler.name, handler)
    console.log(`[ChannelRouter] Registered handler: ${handler.name}`)
  }

  /**
   * Get all active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.handlers.values())
      .filter(h => h.isAvailable())
      .map(h => h.name)
  }

  /**
   * Broadcast message to all active channels (except source to avoid echo)
   */
  async broadcastToAllChannels(
    notification: ChannelNotification,
    excludeSourceChannel: boolean = true
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()

    // Get target channels
    let targetChannels = notification.targetChannels
    if (!targetChannels || targetChannels.length === 0) {
      targetChannels = this.getActiveChannels()
    }

    // Exclude source channel if requested
    if (excludeSourceChannel) {
      targetChannels = targetChannels.filter(ch => ch !== notification.sourceChannel)
    }

    console.log(`[ChannelRouter] Broadcasting message ${notification.messageId} to: ${targetChannels.join(', ')}`)

    // Send to all target channels in parallel
    const promises = targetChannels.map(async (channel) => {
      const handler = this.handlers.get(channel)
      if (!handler) {
        console.warn(`[ChannelRouter] No handler found for channel: ${channel}`)
        results.set(channel, false)
        return
      }

      try {
        const success = await handler.send(notification)
        results.set(channel, success)
        
        if (success) {
          // Track delivery
          if (!this.deliveryLog.has(notification.messageId)) {
            this.deliveryLog.set(notification.messageId, new Set())
          }
          this.deliveryLog.get(notification.messageId)!.add(channel)
          console.log(`[ChannelRouter] ✓ Delivered to ${channel}`)
        } else {
          console.warn(`[ChannelRouter] ✗ Failed to deliver to ${channel}`)
        }
      } catch (error) {
        console.error(`[ChannelRouter] Error delivering to ${channel}:`, error)
        results.set(channel, false)
      }
    })

    await Promise.all(promises)
    return results
  }

  /**
   * Send to specific channel
   */
  async sendToChannel(channel: string, notification: ChannelNotification): Promise<boolean> {
    const handler = this.handlers.get(channel)
    if (!handler) {
      console.warn(`[ChannelRouter] No handler found for channel: ${channel}`)
      return false
    }

    try {
      const success = await handler.send(notification)
      if (success) {
        if (!this.deliveryLog.has(notification.messageId)) {
          this.deliveryLog.set(notification.messageId, new Set())
        }
        this.deliveryLog.get(notification.messageId)!.add(channel)
      }
      return success
    } catch (error) {
      console.error(`[ChannelRouter] Error delivering to ${channel}:`, error)
      return false
    }
  }

  /**
   * Send to all channels EXCEPT source (typical response flow)
   */
  async broadcastResponse(notification: ChannelNotification): Promise<Map<string, boolean>> {
    return this.broadcastToAllChannels(notification, true)
  }

  /**
   * Send to all channels INCLUDING source (for notifications)
   */
  async broadcastToAll(notification: ChannelNotification): Promise<Map<string, boolean>> {
    return this.broadcastToAllChannels(notification, false)
  }

  /**
   * Get delivery status for a message
   */
  getDeliveryStatus(messageId: string): {
    delivered: string[]
    pending: string[]
  } {
    const delivered = Array.from(this.deliveryLog.get(messageId) || [])
    const pending = this.getActiveChannels().filter(ch => !delivered.includes(ch))
    return { delivered, pending }
  }

  /**
   * Mark message as delivered to all channels
   */
  markFullyDelivered(messageId: string): void {
    this.deliveryLog.set(messageId, new Set(this.getActiveChannels()))
  }
}

// Singleton instance
export const channelRouter = new ChannelRouter()

// Built-in channel handlers
export const createWebChatHandler = (): ChannelHandler => ({
  name: 'web',
  send: async (notification: ChannelNotification): Promise<boolean> => {
    // Web chat receives via WebSocket or polling
    // This is handled by the frontend subscribing to conversation updates
    console.log(`[WebChatHandler] Message queued for web client: ${notification.messageId}`)
    return true
  },
  isAvailable: (): boolean => true // Always available
})

export const createWhatsAppHandler = (): ChannelHandler => ({
  name: 'whatsapp',
  send: async (notification: ChannelNotification): Promise<boolean> => {
    // Send to WhatsApp via Twilio, Infobip, or similar
    // This is a placeholder - integrate with your WhatsApp provider
    const whatsappWebhookUrl = process.env.WHATSAPP_WEBHOOK_URL
    
    if (!whatsappWebhookUrl) {
      console.warn('[WhatsAppHandler] WHATSAPP_WEBHOOK_URL not configured')
      return false
    }

    try {
      const response = await fetch(whatsappWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: notification.messageId,
          content: notification.content,
          audioUrl: notification.audioUrl,
          timestamp: notification.timestamp,
          conversationId: notification.conversationId
        })
      })

      return response.ok
    } catch (error) {
      console.error('[WhatsAppHandler] Delivery failed:', error)
      return false
    }
  },
  isAvailable: (): boolean => !!process.env.WHATSAPP_WEBHOOK_URL
})

export const createDiscordHandler = (): ChannelHandler => ({
  name: 'discord',
  send: async (notification: ChannelNotification): Promise<boolean> => {
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL
    
    if (!discordWebhookUrl) {
      console.warn('[DiscordHandler] DISCORD_WEBHOOK_URL not configured')
      return false
    }

    try {
      const response = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: notification.content,
          embeds: [
            {
              title: 'Message',
              description: notification.content,
              footer: { text: `Conv: ${notification.conversationId}` }
            }
          ]
        })
      })

      return response.ok
    } catch (error) {
      console.error('[DiscordHandler] Delivery failed:', error)
      return false
    }
  },
  isAvailable: (): boolean => !!process.env.DISCORD_WEBHOOK_URL
})
