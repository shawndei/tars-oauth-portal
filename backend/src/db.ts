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
      updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      audio_url TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  `)

  console.log(`Database initialized at ${dbPath}`)
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: string
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
    SELECT id, role, content, audio_url as audioUrl, timestamp 
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
  audioUrl?: string
): Message {
  const timestamp = new Date().toISOString()
  
  // Update conversation timestamp
  const updateStmt = db.prepare('UPDATE conversations SET updated = ? WHERE id = ?')
  updateStmt.run(timestamp, conversationId)

  // Insert message
  const insertStmt = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, audio_url, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertStmt.run(messageId, conversationId, role, content, audioUrl || null, timestamp)

  return {
    id: messageId,
    role,
    content,
    audioUrl,
    timestamp
  }
}

export function closeDatabase() {
  if (db) {
    db.close()
  }
}
