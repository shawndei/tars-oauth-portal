import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', process.env.DB_PATH || 'tars.db')

let db: Database.Database

export function initDatabase() {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created TEXT NOT NULL,
      updated TEXT NOT NULL,
      channels TEXT DEFAULT 'web'
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      audio_url TEXT,
      timestamp TEXT NOT NULL,
      channel TEXT DEFAULT 'web',
      source_channel TEXT,
      delivered_to TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
    CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source_channel);
  `)

  // Migration: Add channel columns if they don't exist (for existing DBs)
  try {
    db.exec(`
      ALTER TABLE messages ADD COLUMN channel TEXT DEFAULT 'web';
      ALTER TABLE messages ADD COLUMN source_channel TEXT;
      ALTER TABLE messages ADD COLUMN delivered_to TEXT;
    `)
  } catch (e) {
    // Columns already exist, safe to ignore
  }

  try {
    db.exec(`
      ALTER TABLE conversations ADD COLUMN channels TEXT DEFAULT 'web';
    `)
  } catch (e) {
    // Column already exists, safe to ignore
  }

  console.log(`Database initialized at ${dbPath}`)
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: string
  channel?: string
  sourceChannel?: string
  deliveredTo?: string
}

export interface Conversation {
  id: string
  title: string
  created: string
  updated: string
  messages?: Message[]
}

export function getConversations(): Conversation[] {
  const stmt = db.prepare(`
    SELECT id, title, created, updated FROM conversations 
    ORDER BY updated DESC 
    LIMIT 20
  `)
  const conversations = stmt.all() as Conversation[]
  
  // Include message count or brief info
  return conversations.map(conv => ({
    ...conv,
    messages: [] // Don't load messages in list view
  }))
}

export function getConversationById(id: string): Conversation | null {
  const convStmt = db.prepare('SELECT id, title, created, updated FROM conversations WHERE id = ?')
  const conversation = convStmt.get(id) as Conversation | undefined
  
  if (!conversation) return null

  const msgStmt = db.prepare(`
    SELECT id, role, content, audio_url as audioUrl, timestamp, channel, source_channel as sourceChannel, delivered_to as deliveredTo
    FROM messages 
    WHERE conversation_id = ? 
    ORDER BY timestamp ASC
  `)
  const messages = msgStmt.all(id) as Message[]

  return {
    ...conversation,
    messages
  }
}

export function createConversation(id: string, title: string): Conversation {
  const now = new Date().toISOString()
  const stmt = db.prepare(`
    INSERT INTO conversations (id, title, created, updated)
    VALUES (?, ?, ?, ?)
  `)
  stmt.run(id, title, now, now)

  return {
    id,
    title,
    created: now,
    updated: now,
    messages: []
  }
}

export function addMessage(
  conversationId: string,
  messageId: string,
  role: 'user' | 'assistant',
  content: string,
  audioUrl?: string,
  options?: {
    channel?: string
    sourceChannel?: string
    deliveredTo?: string
  }
): Message {
  const timestamp = new Date().toISOString()
  const channel = options?.channel || 'web'
  const sourceChannel = options?.sourceChannel
  const deliveredTo = options?.deliveredTo
  
  // Update conversation timestamp and track active channels
  const convStmt = db.prepare('SELECT channels FROM conversations WHERE id = ?')
  const conv = convStmt.get(conversationId) as { channels: string } | undefined
  const existingChannels = conv?.channels ? new Set(conv.channels.split(',')) : new Set(['web'])
  existingChannels.add(channel)
  if (sourceChannel) existingChannels.add(sourceChannel)
  
  const updateStmt = db.prepare('UPDATE conversations SET updated = ?, channels = ? WHERE id = ?')
  updateStmt.run(timestamp, Array.from(existingChannels).join(','), conversationId)

  // Insert message
  const insertStmt = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, audio_url, timestamp, channel, source_channel, delivered_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertStmt.run(messageId, conversationId, role, content, audioUrl || null, timestamp, channel, sourceChannel || null, deliveredTo || null)

  return {
    id: messageId,
    role,
    content,
    audioUrl,
    timestamp,
    channel,
    sourceChannel,
    deliveredTo
  }
}

// Multi-channel broadcast delivery
export interface ChannelDeliveryTarget {
  channel: string
  endpoint?: string
  webhookUrl?: string
}

export function updateMessageDelivery(messageId: string, deliveredTo: string): void {
  const stmt = db.prepare('UPDATE messages SET delivered_to = ? WHERE id = ?')
  stmt.run(deliveredTo, messageId)
}

export function getActiveChannels(conversationId: string): string[] {
  const stmt = db.prepare('SELECT channels FROM conversations WHERE id = ?')
  const result = stmt.get(conversationId) as { channels: string } | undefined
  return result?.channels ? result.channels.split(',').filter(c => c) : ['web']
}

export function getMessagesBySourceChannel(conversationId: string, sourceChannel: string): Message[] {
  const stmt = db.prepare(`
    SELECT id, role, content, audio_url as audioUrl, timestamp, channel, source_channel as sourceChannel, delivered_to as deliveredTo
    FROM messages
    WHERE conversation_id = ? AND source_channel = ?
    ORDER BY timestamp ASC
  `)
  return stmt.all(conversationId, sourceChannel) as Message[]
}

export function closeDatabase() {
  if (db) {
    db.close()
  }
}
