import { useState, useEffect, useRef } from 'react'
import { Mic, Send, Menu, Settings, Plus, Moon, Sun, Copy, RotateCcw } from 'lucide-react'
import Sidebar from './components/Sidebar'
import MessageList from './components/MessageList'
import VoiceTranscription from './components/VoiceTranscription'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  audioUrl?: string
}

interface Conversation {
  id: string
  title: string
  created: string
  messages: Message[]
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'dark'
    }
    return 'dark'
  })
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [autoPlayVoice, setAutoPlayVoice] = useState(true)
  
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.webkitSpeechRecognition || (window as any).SpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsRecording(true)
        setTranscription('')
      }

      recognition.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            setInputValue(prev => prev + transcript)
          } else {
            interim += transcript
          }
        }
        if (interim) {
          setTranscription(interim)
        }
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
        setTranscription('')
      }

      recognitionRef.current = recognition
    }
  }, [])

  // Apply theme
  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/conversations`)
      const data = await res.json()
      setConversations(data)
      
      if (data.length > 0 && !currentConversationId) {
        setCurrentConversationId(data[0].id)
        setMessages(data[0].messages)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  const createNewConversation = async () => {
    try {
      const res = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' })
      })
      const newConv = await res.json()
      setConversations(prev => [newConv, ...prev])
      setCurrentConversationId(newConv.id)
      setMessages([])
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputValue.trim() || !currentConversationId) return
    
    setIsSending(true)
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          message: inputValue,
          tone: 'default'
        })
      })
      
      const data = await res.json()
      
      const assistantMessage: Message = {
        id: data.id,
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
        audioUrl: data.audioUrl
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      // Auto-play voice if enabled
      if (autoPlayVoice && data.audioUrl && audioRef.current) {
        audioRef.current.src = data.audioUrl
        audioRef.current.play()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsSending(false)
    }
  }

  const toggleVoiceInput = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
    } else {
      recognitionRef.current?.start()
    }
  }

  const currentConversation = conversations.find(c => c.id === currentConversationId)

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && <Sidebar 
          conversations={conversations}
          currentId={currentConversationId}
          onSelectConversation={(id) => {
            setCurrentConversationId(id)
            const conv = conversations.find(c => c.id === id)
            setMessages(conv?.messages || [])
          }}
          onNewConversation={createNewConversation}
        />}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <Menu size={20} />
              </button>
              <h1 className="text-xl font-semibold">
                {currentConversation?.title || 'TARS Chat'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-900">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoPlayVoice}
                  onChange={(e) => setAutoPlayVoice(e.target.checked)}
                  className="rounded"
                />
                Auto-play voice responses
              </label>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome to TARS</h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    Start a conversation or use voice input to chat
                  </p>
                </div>
              </div>
            )}
            
            <MessageList 
              messages={messages}
              audioRef={audioRef}
              onCopyMessage={(content) => {
                navigator.clipboard.writeText(content)
              }}
            />
            
            <div ref={messagesEndRef} />
          </div>

          {/* Transcription Display */}
          {transcription && <VoiceTranscription text={transcription} />}

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-3 rounded-lg transition ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                <Mic size={20} />
              </button>
              
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message or use voice input..."
                className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSending}
              />
              
              <button
                type="submit"
                disabled={isSending || !inputValue.trim()}
                className="p-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} />
    </div>
  )
}

export default App
