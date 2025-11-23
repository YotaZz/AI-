import React, { useRef, useState } from 'react';
import { Message, CharacterRole } from '../types';
import { CHARACTERS } from '../constants';
import ReactMarkdown from 'react-markdown';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const [isThinkingOpen, setIsThinkingOpen] = useState(true);
  const isUser = message.role === CharacterRole.USER;
  const isSystem = message.role === CharacterRole.SYSTEM;
  const char = CHARACTERS[message.role];
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Removed useEffect with scrollIntoView to prevent page jumping

  if (isSystem) {
    return (
      <div ref={bubbleRef} className="flex justify-center my-4 opacity-60">
        <span className="text-xs italic text-parchment-200 border-b border-parchment-800 pb-1">{message.content}</span>
      </div>
    );
  }

  if (isUser) {
    return (
      <div ref={bubbleRef} className="flex justify-end my-4 px-4">
        <div className="max-w-[80%] bg-wood-800 border border-parchment-800 rounded-lg p-3 text-parchment-100 shadow-lg">
          <p className="font-serif text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // Safety check: If character config is missing for this role, return null to prevent crash
  if (!char) {
    return null;
  }

  // Parse for <think> tags
  let thinkingContent = null;
  let mainContent = message.content;

  // Match closed tags
  const thinkMatch = message.content.match(/<think>(.*?)<\/think>/s);
  
  if (thinkMatch) {
      thinkingContent = thinkMatch[1].trim();
      mainContent = message.content.replace(/<think>.*?<\/think>/s, '').trim();
  } else if (message.content.includes('<think>')) {
      // Handle unclosed tag during streaming
      const parts = message.content.split('<think>');
      mainContent = parts[0].trim();
      thinkingContent = parts[1]?.trim() || "Thinking...";
  }

  // AI Response
  return (
    <div ref={bubbleRef} className={`flex my-6 px-4 gap-4 ${message.role === CharacterRole.DEBATER_B ? 'flex-row-reverse' : ''}`}>
      {/* Avatar Icon Small */}
      <div className="flex-shrink-0 mt-1">
        <img 
          src={char.avatar} 
          alt={char.name} 
          className={`w-10 h-10 rounded-full border border-parchment-800 object-cover`}
        />
      </div>

      <div className={`flex flex-col max-w-[80%] ${message.role === CharacterRole.DEBATER_B ? 'items-end' : 'items-start'}`}>
        <span className={`text-xs font-bold mb-1 ${char.color}`}>{char.name}</span>
        
        <div className={`relative p-4 rounded-lg bg-black/40 border ${char.borderColor} backdrop-blur-sm shadow-xl w-full`}>
           {/* Decorative Triangle */}
           <div className={`absolute top-3 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent 
              ${message.role === CharacterRole.DEBATER_B 
                ? '-right-2 border-l-[8px] border-l-stone-900' 
                : '-left-2 border-r-[8px] border-r-stone-900'} 
           `} />
           
           <div className="text-parchment-100 font-serif text-sm">
             {thinkingContent && (
                <details 
                  className="mb-3 group" 
                  open={isThinkingOpen}
                  onToggle={(e) => setIsThinkingOpen(e.currentTarget.open)}
                >
                    <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-parchment-800 hover:text-amber-500 flex items-center gap-1 select-none">
                        <span className="group-open:rotate-90 transition-transform">▶</span>
                        思维链 (Thinking Process)
                    </summary>
                    <div className="mt-2 pl-3 border-l-2 border-parchment-800/30 text-parchment-200/60 text-xs italic whitespace-pre-wrap leading-relaxed">
                        {thinkingContent}
                    </div>
                </details>
             )}
             <div className="prose prose-invert prose-sm prose-p:leading-relaxed prose-strong:text-amber-500">
                <ReactMarkdown>{mainContent}</ReactMarkdown>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;