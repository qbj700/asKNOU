import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiService, QuestionResponse } from '../lib/api';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  sources?: QuestionResponse['sources'];
  isLoading?: boolean;
}

export interface ChatBoxRef {
  askQuestion: (question: string) => void;
}

const ChatBox = forwardRef<ChatBoxRef>((props, ref) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 클라이언트에서만 초기 메시지 설정
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        type: 'bot',
        content: '안녕하세요! 방송통신대학교 학사정보 AI 길라잡이입니다. 궁금한 것이 있으시면 언제든 질문해주세요.',
        timestamp: new Date(),
      }]);
    }
  }, []);

  // 외부에서 질문을 받을 수 있도록 ref 노출
  useImperativeHandle(ref, () => ({
    askQuestion: (question: string) => {
      setInputValue(question);
      // 짧은 딜레이 후 자동 전송
      setTimeout(() => {
        if (question.trim() && !isLoading) {
          handleQuestionSubmit(question.trim());
        }
      }, 100);
    }
  }));

  const handleQuestionSubmit = async (questionText: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: questionText,
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: '답변을 생성하고 있습니다...',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiService.askQuestion({
        question: questionText
      });

      setMessages(prev => {
        const withoutLoading = prev.filter(msg => msg.id !== loadingMessage.id);
        const botResponse: Message = {
          id: (Date.now() + 2).toString(),
          type: 'bot',
          content: response.answer,
          timestamp: new Date(),
          sources: response.sources,
        };
        return [...withoutLoading, botResponse];
      });

    } catch (error: any) {
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => msg.id !== loadingMessage.id);
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'bot',
          content: `죄송합니다. 오류가 발생했습니다: ${error.response?.data?.detail || error.message}`,
          timestamp: new Date(),
        };
        return [...withoutLoading, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;
    
    await handleQuestionSubmit(inputValue.trim());
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* 채팅 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`chat-message ${
              message.type === 'user' ? 'chat-message-user' : 'chat-message-bot'
            }`}>
              <div className="mb-2">
                {message.isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span>{message.content}</span>
                  </div>
                ) : message.type === 'bot' ? (
                  <div className="prose prose-sm prose-slate max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-a:text-knou-600 prose-strong:text-gray-800 prose-code:text-knou-600 prose-code:bg-gray-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                )}
              </div>
              
              {/* 출처 정보 */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium">
                      📚 참고 문서 ({message.sources.length}개)
                    </summary>
                    <div className="mt-2 space-y-2">
                      {message.sources.map((source, index) => (
                        <div key={index} className="text-xs bg-gray-50 p-2 rounded border-l-2 border-knou-300">
                          <div className="font-medium text-gray-700">
                            📄 {source.filename} (페이지 {source.page})
                          </div>
                          <div className="text-gray-600 mt-1">
                            유사도: {(source.score * 100).toFixed(1)}%
                          </div>
                          <div className="text-gray-500 mt-1 text-xs">
                            {source.content_preview}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-2">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t bg-white p-4 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="궁금한 것이 있으시면 질문해주세요..."
            className="input-field flex-1"
            disabled={isLoading}
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
          >
            {isLoading ? '전송중...' : '전송'}
          </button>
        </form>
        <div className="text-xs text-gray-500 mt-2">
          {inputValue.length}/1000자
        </div>
      </div>
    </div>
  );
});

ChatBox.displayName = 'ChatBox';

export default ChatBox; 