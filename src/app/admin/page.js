'use client';

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

export default function AdminPanel() {
  const [socket, setSocket] = useState(null);
  const [activeChats, setActiveChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
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
  }, [selectedChat?.messages]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const authenticate = (e) => {
    e.preventDefault();
    // Simple password check (in production, use proper authentication)
    if (adminPassword === 'admin123') {
      setIsAuthenticated(true);
      initializeSocket();
    } else {
      alert('Invalid password');
    }
  };

  const initializeSocket = () => {
          const newSocket = io(process.env.NODE_ENV === 'production' ? undefined : 
        (window.location.hostname === '192.168.10.55' ? 'http://192.168.10.55:3000' : 'http://localhost:3000'), {
      path: '/api/socket',
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Admin connected to server');
      newSocket.emit('admin-join');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Admin disconnected from server');
    });

    newSocket.on('chat-history', (chats) => {
      setActiveChats(chats.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)));
    });

    newSocket.on('admin-message-update', (messageData) => {
      // Handle admin messages from other admin sessions
      const uniqueMessageData = {
        ...messageData,
        id: messageData.id || `${Date.now()}-${Math.random()}`
      };

      // Update active chats
      setActiveChats(prev => {
        const updated = [...prev];
        const chatIndex = updated.findIndex(chat => chat.userId === uniqueMessageData.userId);
        
        if (chatIndex >= 0) {
          const messageExists = updated[chatIndex].messages.some(msg => msg.id === uniqueMessageData.id);
          if (!messageExists) {
            updated[chatIndex] = {
              ...updated[chatIndex],
              messages: [...updated[chatIndex].messages, uniqueMessageData],
              lastActivity: uniqueMessageData.timestamp
            };
          }
        }
        
        return updated.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
      });

      // Update selected chat if it matches
      setSelectedChat(prev => {
        if (prev && prev.userId === uniqueMessageData.userId) {
          const messageExists = prev.messages.some(msg => msg.id === uniqueMessageData.id);
          if (!messageExists) {
            return {
              ...prev,
              messages: [...prev.messages, uniqueMessageData]
            };
          }
        }
        return prev;
      });
    });

    newSocket.on('user-message', (messageData) => {
      // Ensure unique message ID
      const uniqueMessageData = {
        ...messageData,
        id: messageData.id || `${Date.now()}-${Math.random()}`
      };

      // Update active chats with new message
      setActiveChats(prev => {
        const updated = [...prev];
        const chatIndex = updated.findIndex(chat => chat.userId === uniqueMessageData.userId);
        
        if (chatIndex >= 0) {
          // Check if message already exists to prevent duplicates
          const messageExists = updated[chatIndex].messages.some(msg => msg.id === uniqueMessageData.id);
          if (!messageExists) {
            updated[chatIndex] = {
              ...updated[chatIndex],
              messages: [...updated[chatIndex].messages, uniqueMessageData],
              lastActivity: uniqueMessageData.timestamp,
              socketId: uniqueMessageData.socketId || updated[chatIndex].socketId
            };
          }
        } else {
          // New chat
          updated.unshift({
            userId: uniqueMessageData.userId,
            messages: [uniqueMessageData],
            lastActivity: uniqueMessageData.timestamp,
            socketId: uniqueMessageData.socketId
          });
        }
        
        return updated.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
      });

      // Update selected chat if it's the active one
      setSelectedChat(prev => {
        if (prev && prev.userId === uniqueMessageData.userId) {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.messages.some(msg => msg.id === uniqueMessageData.id);
          if (!messageExists) {
            return {
              ...prev,
              messages: [...prev.messages, uniqueMessageData],
              socketId: uniqueMessageData.socketId || prev.socketId
            };
          }
        }
        return prev;
      });
    });

    setSocket(newSocket);

    return () => newSocket.close();
  };

  const selectChat = (chat) => {
    setSelectedChat(chat);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket && selectedChat) {
      const messageData = {
        id: `admin-${Date.now()}-${Math.random()}`,
        text: message.trim(),
        sender: 'admin',
        userId: selectedChat.userId,
        targetSocketId: selectedChat.socketId,
        timestamp: new Date().toISOString(),
      };

      socket.emit('admin-message', messageData);
      
      // Update selected chat
      setSelectedChat(prev => ({
        ...prev,
        messages: [...prev.messages, messageData]
      }));

      // Update active chats
      setActiveChats(prev => {
        const updated = [...prev];
        const chatIndex = updated.findIndex(chat => chat.userId === selectedChat.userId);
        if (chatIndex >= 0) {
          updated[chatIndex] = {
            ...updated[chatIndex],
            messages: [...updated[chatIndex].messages, messageData],
            lastActivity: messageData.timestamp
          };
        }
        return updated.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
      });

      setMessage('');
    }
  };

  if (!isAuthenticated) {
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
                isDarkMode ? 'bg-emerald-600' : 'bg-emerald-500'
              } rounded-full flex items-center justify-center mx-auto mb-4`}>
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className={`text-2xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              } mb-2`}>
                Admin Panel
              </h1>
              <p className={`${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Enter your password to access the admin panel
              </p>
            </div>

            {/* Form */}
            <form onSubmit={authenticate} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                } mb-2`}>
                  Admin Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className={`w-full px-3 py-2.5 rounded-lg border transition-colors duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-emerald-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:border-emerald-500'
                  } focus:ring-2 focus:ring-emerald-500/20 focus:outline-none`}
                  required
                />
              </div>
              <button
                type="submit"
                className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                } focus:ring-2 focus:ring-emerald-500/20 focus:outline-none`}
              >
                Login
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
      <div className="h-screen flex max-w-7xl mx-auto">
        {/* Sidebar - Chat List */}
        <div className={`w-80 ${
          isDarkMode 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-slate-200'
        } border-r transition-colors duration-300 flex flex-col`}>
          
          {/* Header */}
          <div className={`p-4 border-b ${
            isDarkMode ? 'border-slate-700' : 'border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${
                  isDarkMode ? 'bg-emerald-600' : 'bg-emerald-500'
                } rounded-full flex items-center justify-center`}>
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h2 className={`font-semibold ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    Admin Panel
                  </h2>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                </div>
              </div>
              
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
            
            <div className={`text-sm ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {activeChats.length === 0 ? 'No active chats' : `${activeChats.length} active chat${activeChats.length > 1 ? 's' : ''}`}
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {activeChats.length === 0 ? (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center">
                  <div className={`w-12 h-12 ${
                    isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                  } rounded-full flex items-center justify-center mx-auto mb-3`}>
                    <svg className={`w-6 h-6 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-400'
                    }`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className={`text-sm font-medium ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  } mb-1`}>
                    No active chats
                  </p>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-slate-500' : 'text-slate-500'
                  }`}>
                    Waiting for users to start conversations
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {activeChats.map((chat) => {
                  const lastMessage = chat.messages[chat.messages.length - 1];
                  const isSelected = selectedChat?.userId === chat.userId;
                  
                  return (
                    <button
                      key={chat.userId}
                      onClick={() => selectChat(chat)}
                      className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                        isSelected
                          ? isDarkMode 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-emerald-500 text-white'
                          : isDarkMode 
                            ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' 
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-900'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : isDarkMode 
                              ? 'bg-slate-600 text-slate-200' 
                              : 'bg-slate-200 text-slate-700'
                        }`}>
                          {lastMessage?.userName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium truncate">
                              {lastMessage?.userName || 'Unknown User'}
                            </h3>
                            <span className={`text-xs ${
                              isSelected 
                                ? 'text-white/70' 
                                : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              {new Date(chat.lastActivity).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className={`text-sm truncate ${
                            isSelected 
                              ? 'text-white/80' 
                              : isDarkMode ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {lastMessage?.text || 'No messages yet'}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-xs ${
                              isSelected 
                                ? 'text-white/60' 
                                : isDarkMode ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                              {chat.messages.length} message{chat.messages.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className={`${
                isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              } border-b p-4 flex-shrink-0`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${
                    isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
                  } rounded-full flex items-center justify-center`}>
                    <span className="text-white text-sm font-medium">
                      {selectedChat.messages[0]?.userName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className={`font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {selectedChat.messages[0]?.userName || 'Unknown User'}
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {selectedChat.messages.length} message{selectedChat.messages.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className={`flex-1 overflow-hidden ${
                isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
              }`}>
                <div 
                  ref={messagesContainerRef}
                  className="h-full overflow-y-auto p-4 chat-messages"
                >
                                     <div className="space-y-6">
                     {selectedChat.messages.map((msg, index) => (
                       <div
                         key={msg.id || `message-${index}-${msg.timestamp}`}
                         className={`flex ${
                           msg.sender === 'admin' ? 'justify-end' : 'justify-start'
                         } animate-fade-in`}
                       >
                                                  <div className={`flex ${
                           msg.sender === 'admin' ? 'flex-row-reverse' : 'flex-row'
                         } items-start max-w-lg`}>
                           
                           {/* Avatar */}
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                             msg.sender === 'admin'
                               ? isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white'
                               : msg.sender === 'ai' 
                               ? isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                               : isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                           } ${msg.sender === 'admin' ? 'ml-3' : 'mr-3'}`}>
                             {msg.sender === 'admin' 
                               ? '👨‍💼' 
                               : msg.sender === 'ai' ? '🤖' : msg.userName?.[0]?.toUpperCase()
                             }
                           </div>

                           {/* Message Bubble */}
                           <div className={`rounded-lg px-4 py-3 max-w-xs ${
                             msg.sender === 'admin'
                               ? isDarkMode 
                                 ? 'bg-emerald-600 text-white' 
                                 : 'bg-emerald-500 text-white'
                               : isDarkMode 
                                 ? 'bg-slate-700 text-slate-100 border border-slate-600' 
                                 : 'bg-white text-slate-900 border border-slate-200'
                           } shadow-sm`}>
                            
                            {/* Sender Label for non-admin messages */}
                            {msg.sender !== 'admin' && (
                              <div className={`text-xs font-medium mb-1 ${
                                msg.sender === 'ai' 
                                  ? isDarkMode ? 'text-purple-300' : 'text-purple-600'
                                  : isDarkMode ? 'text-blue-300' : 'text-blue-600'
                              }`}>
                                {msg.sender === 'ai' ? 'AI Assistant' : msg.userName || 'User'}
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
                               msg.sender === 'admin' 
                                 ? 'text-emerald-100' 
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

                    {/* Auto-scroll anchor */}
                    <div ref={messagesEndRef} className="h-1" />
                  </div>
                </div>
              </div>

              {/* Input */}
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
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500 focus:border-emerald-500'
                    } focus:ring-2 focus:ring-emerald-500/20 focus:outline-none`}
                    disabled={!isConnected}
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || !isConnected}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                      isDarkMode 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-600' 
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-slate-300'
                    } disabled:cursor-not-allowed focus:ring-2 focus:ring-emerald-500/20 focus:outline-none`}
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className={`flex-1 flex items-center justify-center ${
              isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
            }`}>
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
                  Select a chat to start
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-slate-500' : 'text-slate-500'
                }`}>
                  Choose a conversation from the sidebar to begin responding
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 