import { Copy, Play, Pause } from 'lucide-react'
import { useRef, useState } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  audioUrl?: string
}

interface MessageListProps {
  messages: Message[]
  audioRef: React.RefObject<HTMLAudioElement>
  onCopyMessage: (content: string) => void
}

export default function MessageList({ messages, audioRef, onCopyMessage }: MessageListProps) {
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)

  const handlePlayAudio = (audioUrl: string, messageId: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl
      audioRef.current.onplay = () => setPlayingMessageId(messageId)
      audioRef.current.onended = () => setPlayingMessageId(null)
      audioRef.current.play()
    }
  }

  const handlePauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setPlayingMessageId(null)
    }
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-3 message-animate ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {message.role === 'assistant' && (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
              T
            </div>
          )}

          <div
            className={`max-w-md px-4 py-3 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-500 text-white rounded-br-none'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
            }`}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>

            {message.role === 'assistant' && message.audioUrl && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() =>
                    playingMessageId === message.id
                      ? handlePauseAudio()
                      : handlePlayAudio(message.audioUrl!, message.id)
                  }
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                  title={playingMessageId === message.id ? 'Pause audio' : 'Play audio'}
                >
                  {playingMessageId === message.id ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} />
                  )}
                </button>
                <span className="text-xs opacity-70">Voice response</span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-1 text-xs opacity-60">
              <span>
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <button
                onClick={() => onCopyMessage(message.content)}
                className="hover:opacity-100 transition"
                title="Copy message"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {message.role === 'user' && (
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm font-bold">
              U
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
