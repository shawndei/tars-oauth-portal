import { Plus, Trash2 } from 'lucide-react'

interface Conversation {
  id: string
  title: string
  created: string
}

interface SidebarProps {
  conversations: Conversation[]
  currentId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
}

export default function Sidebar({
  conversations,
  currentId,
  onSelectConversation,
  onNewConversation
}: SidebarProps) {
  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 px-4 transition"
        >
          <Plus size={18} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={`w-full text-left px-3 py-2 rounded-lg transition truncate ${
              currentId === conv.id
                ? 'bg-gray-200 dark:bg-gray-800 font-semibold'
                : 'hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
            title={conv.title}
          >
            {conv.title}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
        <p>TARS Chat v1.0</p>
        <p>Powered by ElevenLabs</p>
      </div>
    </div>
  )
}
