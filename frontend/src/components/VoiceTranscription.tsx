import { Mic } from 'lucide-react'

interface VoiceTranscriptionProps {
  text: string
}

export default function VoiceTranscription({ text }: VoiceTranscriptionProps) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20">
      <div className="flex items-center gap-2">
        <Mic size={16} className="text-yellow-600 dark:text-yellow-400 animate-pulse" />
        <p className="text-sm text-yellow-900 dark:text-yellow-200">
          <span className="font-semibold">Listening:</span> {text}
        </p>
      </div>
    </div>
  )
}
