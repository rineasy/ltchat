'use client';

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [isUserIdentified, setIsUserIdentified] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [chatStatus, setChatStatus] = useState('open');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const userId = useRef(null);

  useEffect(() => {
    // Generate unique user ID
    if (!userId.current) {
      userId.current = uuidv4();
    }
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      // Check system preference
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    // Save theme preference
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  }, [messages, isTyping]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const initializeSocket = () => {
          const newSocket = io(process.env.NODE_ENV === 'production' ? undefined : 
        (window.location.hostname === '192.168.10.55' ? 'http://192.168.10.55:3000' : 'http://localhost:3000'), {
      path: '/api/socket',
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('message', (data) => {
      setMessages(prev => [...prev, data]);
      setIsTyping(false);
    });

    newSocket.on('typing', () => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    });

    newSocket.on('admin-status', (status) => {
      setAdminOnline(status.online);
    });

    newSocket.on('chat-status-changed', (data) => {
      setChatStatus(data.status);
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    setSocket(newSocket);

    return () => newSocket.close();
  };

  const startChat = (e) => {
    e.preventDefault();
    if (isAnonymous || userName.trim()) {
      const displayName = isAnonymous ? 'Anonymous User' : userName.trim();
      setUserName(displayName);
      setIsUserIdentified(true);
      initializeSocket();
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket) {
      const messageData = {
        id: uuidv4(),
        text: message.trim(),
        sender: 'user',
        userName: userName,
        userId: userId.current,
        timestamp: new Date().toISOString(),
      };

      socket.emit('user-message', messageData);
      setMessages(prev => [...prev, messageData]);
      setMessage('');
    }
  };

  const markAsResolved = () => {
    console.log('markAsResolved clicked, socket:', !!socket, 'userId:', userId.current);
    if (socket) {
      console.log('Emitting change-chat-status event');
      socket.emit('change-chat-status', {
        userId: userId.current,
        status: 'closed',
        sender: 'user'
      });
    } else {
      console.log('Socket not available');
    }
  };

  const reopenChat = () => {
    if (socket) {
      socket.emit('change-chat-status', {
        userId: userId.current,
        status: 'open',
        sender: 'user'
      });
    }
  };

  if (!isUserIdentified) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
      } p-4`}>
        <div className="w-full max-w-md">
          <div className={`${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700' 
              : 'bg-white border-slate-200'
          } rounded-xl shadow-lg border p-6 transition-colors duration-300`}>
            
            {/* Dark Mode Toggle */}
            <div className="flex justify-end mb-4">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  isDarkMode 
                    ? 'bg-slate-700 hover:bg-slate-600 text-amber-400' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Header */}
            <div className="text-center mb-6">
              <div className={`w-16 h-16 ${
                isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
              } rounded-full flex items-center justify-center mx-auto mb-4`}>
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className={`text-2xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              } mb-2`}>
                Live Chat Support
              </h1>
              <p className={`${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                How would you like to start?
              </p>
            </div>

            {/* Form */}
            <form onSubmit={startChat} className="space-y-4">
              <div className="space-y-3">
                {/* Named Option */}
                <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  !isAnonymous 
                    ? isDarkMode 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-blue-500 bg-blue-50'
                    : isDarkMode 
                      ? 'border-slate-600 hover:border-slate-500' 
                      : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="chatType"
                    checked={!isAnonymous}
                    onChange={() => setIsAnonymous(false)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    !isAnonymous 
                      ? 'border-blue-500 bg-blue-500' 
                      : isDarkMode ? 'border-slate-500' : 'border-slate-300'
                  }`}>
                    {!isAnonymous && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${
                      !isAnonymous 
                        ? isDarkMode ? 'text-blue-400' : 'text-blue-700'
                        : isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      With my name
                    </div>
                    <div className={`text-sm ${
                      isDarkMode ? 'text-slate-500' : 'text-slate-500'
                    }`}>
                      Personal support experience
                    </div>
                  </div>
                </label>
                
                {/* Anonymous Option */}
                <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  isAnonymous 
                    ? isDarkMode 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-blue-500 bg-blue-50'
                    : isDarkMode 
                      ? 'border-slate-600 hover:border-slate-500' 
                      : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="chatType"
                    checked={isAnonymous}
                    onChange={() => setIsAnonymous(true)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    isAnonymous 
                      ? 'border-blue-500 bg-blue-500' 
                      : isDarkMode ? 'border-slate-500' : 'border-slate-300'
                  }`}>
                    {isAnonymous && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${
                      isAnonymous 
                        ? isDarkMode ? 'text-blue-400' : 'text-blue-700'
                        : isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Anonymous
                    </div>
                    <div className={`text-sm ${
                      isDarkMode ? 'text-slate-500' : 'text-slate-500'
                    }`}>
                      Quick and private
                    </div>
                  </div>
                </label>
              </div>

              {/* Name Input */}
              {!isAnonymous && (
                <div className="animate-slide-down">
                  <label className={`block text-sm font-medium ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  } mb-2`}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className={`w-full px-3 py-2.5 rounded-lg border transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500' 
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:border-blue-500'
                    } focus:ring-2 focus:ring-blue-500/20 focus:outline-none`}
                    required={!isAnonymous}
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } focus:ring-2 focus:ring-blue-500/20 focus:outline-none`}
              >
                Start Chat
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
    }`}>
      <div className="h-screen flex flex-col max-w-4xl mx-auto">
        <div className={`flex-1 flex flex-col ${
          isDarkMode 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-slate-200'
        } m-4 rounded-xl shadow-lg border overflow-hidden transition-colors duration-300`}>
          
          {/* Header */}
          <div className={`${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          } border-b p-4 flex-shrink-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${
                  isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
                } rounded-full flex items-center justify-center`}>
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h2 className={`font-semibold ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    Live Support
                  </h2>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {isConnected ? (
                        adminOnline ? 'Admin available' : 'AI Assistant'
                      ) : 'Connecting...'}
                    </p>
                    {/* Chat Status Indicator */}
                    {chatStatus === 'closed' && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className={`text-xs ${
                          isDarkMode ? 'text-red-400' : 'text-red-600'
                        }`}>
                          Closed
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Chat Status Button */}
                {chatStatus === 'open' ? (
                  <button
                    onClick={markAsResolved}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                    title="Mark as resolved"
                  >
                    ✓ Masalah Terselesaikan
                  </button>
                ) : (
                  <button
                    onClick={reopenChat}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                    title="Reopen chat"
                  >
                    🔄 Buka Kembali
                  </button>
                )}

                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 hover:bg-slate-600 text-amber-400' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button>

              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className={`flex-1 overflow-hidden ${
            isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
          }`}>
            <div 
              ref={messagesContainerRef}
              className="h-full overflow-y-auto p-4 chat-messages"
            >
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className={`w-16 h-16 ${
                      isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                    } rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <svg className={`w-8 h-8 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-400'
                      }`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className={`font-medium ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    } mb-1`}>
                      Start a conversation
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-slate-500' : 'text-slate-500'
                    }`}>
                      We're here to help you
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {messages.map((msg, index) => (
                  <div
                    key={msg.id || `message-${index}-${msg.timestamp}`}
                    className={`flex ${
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    } animate-fade-in`}
                  >
                                        <div className={`flex ${
                      msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                    } items-start max-w-lg`}>
                      
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                        msg.sender === 'user'
                          ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                          : msg.sender === 'ai' 
                          ? isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                          : msg.sender === 'system'
                          ? isDarkMode ? 'bg-yellow-600 text-white' : 'bg-yellow-500 text-white'
                          : isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white'
                      } ${msg.sender === 'user' ? 'ml-3' : 'mr-3'}`}>
                        {msg.sender === 'user' 
                          ? userName[0]?.toUpperCase() 
                          : msg.sender === 'ai' ? '🤖' 
                          : msg.sender === 'system' ? '📋'
                          : '👨‍💼'
                        }
                      </div>

                      {/* Message Bubble */}
                      <div className={`rounded-lg px-4 py-3 max-w-xs ${
                            msg.sender === 'user'
                              ? isDarkMode 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-blue-500 text-white'
                              : isDarkMode 
                                ? 'bg-slate-700 text-slate-100 border border-slate-600' 
                                : 'bg-white text-slate-900 border border-slate-200'
                          } shadow-sm`}>
                        
                        {/* Sender Label for non-user messages */}
                        {msg.sender !== 'user' && (
                          <div className={`text-xs font-medium mb-1 ${
                            msg.sender === 'ai' 
                              ? isDarkMode ? 'text-purple-300' : 'text-purple-600'
                              : msg.sender === 'system'
                              ? isDarkMode ? 'text-yellow-300' : 'text-yellow-600'
                              : isDarkMode ? 'text-emerald-300' : 'text-emerald-600'
                          }`}>
                            {msg.sender === 'ai' ? 'AI Assistant' 
                             : msg.sender === 'system' ? 'System' 
                             : 'Admin'}
                          </div>
                        )}
                        
                                                    {/* Message Text */}
                            {msg.sender === 'ai' ? (
                              <div 
                                className="ai-message-content mb-2"
                                dangerouslySetInnerHTML={{ __html: msg.text }}
                              />
                            ) : (
                              <p className="text-sm leading-relaxed break-words mb-2">{msg.text}</p>
                            )}
                            
                            {/* Timestamp */}
                            <div className={`text-xs ${
                              msg.sender === 'user' 
                                ? 'text-blue-100' 
                                : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="flex items-start">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mr-3 ${
                        isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                      }`}>
                        🤖
                      </div>
                      <div className={`px-4 py-3 rounded-lg ${
                        isDarkMode 
                          ? 'bg-slate-700 border border-slate-600' 
                          : 'bg-white border border-slate-200'
                      } shadow-sm`}>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs ${
                            isDarkMode ? 'text-purple-300' : 'text-purple-600'
                          }`}>
                            AI is typing
                          </span>
                          <div className="flex space-x-1">
                            <div className={`w-1.5 h-1.5 ${
                              isDarkMode ? 'bg-purple-400' : 'bg-purple-500'
                            } rounded-full animate-bounce`}></div>
                            <div className={`w-1.5 h-1.5 ${
                              isDarkMode ? 'bg-purple-400' : 'bg-purple-500'
                            } rounded-full animate-bounce`} style={{animationDelay: '0.1s'}}></div>
                            <div className={`w-1.5 h-1.5 ${
                              isDarkMode ? 'bg-purple-400' : 'bg-purple-500'
                            } rounded-full animate-bounce`} style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} className="h-1" />
              </div>
            </div>
          </div>

          {/* Input Section */}
          <div className={`border-t p-4 flex-shrink-0 ${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <form onSubmit={sendMessage} className="flex space-x-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors duration-200 ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500 focus:border-blue-500'
                } focus:ring-2 focus:ring-blue-500/20 focus:outline-none`}
                disabled={!isConnected}
              />
              <button
                type="submit"
                disabled={!message.trim() || !isConnected}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-600' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-slate-300'
                } disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500/20 focus:outline-none`}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
