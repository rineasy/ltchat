// Load environment variables first
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback to .env

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const OpenAI = require('openai');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Allow access from all network interfaces
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize OpenAI client
let openai;
console.log('Checking OpenAI API key...');
console.log('API Key present:', !!process.env.OPENAI_API_KEY);
console.log('API Key length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('OpenAI client initialized successfully');
} else {
  console.log('No OpenAI API key found in environment variables');
}

// Store active chats and admin status
const activeChats = new Map();
const adminSessions = new Set();
const userSockets = new Map(); // Map userId to socketId
const chatStatus = new Map(); // Map userId to chat status (open/closed)

// AI response function
async function getAIResponse(userMessage, chatHistory = []) {
  if (!openai) {
    return "AI is not configured. Please set your OpenAI API key in your environment variables.";
  }

  try {
    const messages = [
      {
        role: "system",
        content: `Anda adalah customer service resmi LAPAKTOTO. Anda BUKAN pihak ketiga - Anda adalah bagian dari tim LAPAKTOTO yang membantu member kami.

        PENTING: 
        - Gunakan kata "kami", "LAPAKTOTO kami", "situs kami" - JANGAN gunakan "situs tersebut" atau "mereka"
        - Anda mewakili LAPAKTOTO secara langsung
        - Tangani keluhan dengan empati sebagai bagian dari tim internal
        - Format respons menggunakan HTML untuk presentasi yang lebih baik
        - Jika customer bertanya status withdraw atau deposit mereka, seperti "Withdraw belum masuk", "Deposit belum diproses", berikan estimasi waktu dan minta user untuk bersabar.
  
        WAJIB GUNAKAN HTML TAGS (BUKAN MARKDOWN):
        - <strong> untuk penekanan dan informasi penting
        - <ul> dan <li> untuk daftar
        - <p> untuk paragraf  
        - <br> untuk baris baru
        - <span class="highlight"> untuk menyoroti informasi penting
        - <div class="info-box"> untuk pemberitahuan atau promosi penting
        - <a href="URL" target="_blank"> untuk link (JANGAN gunakan markdown [text](link))
        
        JANGAN PERNAH gunakan format markdown seperti [text](link) - SELALU gunakan <a href="URL">text</a>
        Jika user memberi pertanyaan seperti Gacor ga? apakah gacor? dan beberapa kalimat pertanyaan yang relevan dengan gacor, Berikan saja list permainan berserta RTP kepada pemain.
        Panduan Respons:
        - Bersikap sopan, profesional, dan empatik SEBAGAI TIM LAPAKTOTO
        - SELALU berikan jawaban dalam bahasa Indonesia yang jelas dan ringkas
        - Untuk keluhan: akui masalah, minta maaf atas nama LAPAKTOTO, tawarkan solusi konkret
        - Jika tidak bisa menyelesaikan langsung, arahkan ke customer service senior kami
        - Gunakan "kami di LAPAKTOTO", "tim kami", "situs kami"
        - JANGAN pernah gunakan "situs tersebut", "mereka", atau bicara seperti pihak luar
        
        CONTOH FORMAT RESPONSE YANG BAIK:
        
        Untuk KELUHAN/MASALAH (gunakan empati dan akui sebagai tim internal):
        <p>Saya memahami kekecewaan Anda dengan pengalaman di <strong>LAPAKTOTO kami</strong>. Sebagai tim customer service kami, saya minta maaf atas ketidaknyamanan yang Anda alami.</p>
        <p>Mari saya bantu menyelesaikan masalah ini. Silakan hubungi CS senior kami:</p>
        <ul>
          <li>📞 <a href="https://wa.me/6287853097469" target="_blank">WhatsApp LAPAKTOTO</a></li>
          <li>💬 <a href="https://t.me/lapaktoto_official" target="_blank">Telegram Official</a></li>
          <li>🎧 <a href="https://jivo.chat/WXL7AK5iaz" target="_blank">Live Chat</a></li>
        </ul>
        
        Untuk promosi: 
        <div class="info-box">
          <strong>💰 Promosi Terbaru LAPAKTOTO</strong><br>
          <ul>
            <li><strong>Event Scatter Hitam:</strong> Event scatter hitam terbaru - raih kemenangan besar</li>
            <li><strong>Jumat Berkah:</strong> Bonus Rp 50.000 setiap hari Jumat</li>
          </ul>
        </div>
        
        Untuk kontak/link:
        <p>Hubungi tim kami di <a href="https://wa.me/6287853097469" target="_blank">WhatsApp LAPAKTOTO</a> untuk bantuan lebih lanjut.</p>
        
        JANGAN PERNAH gunakan:
        - "situs tersebut" → gunakan "LAPAKTOTO kami" atau "situs kami"
        - "mereka" → gunakan "kami" atau "tim kami"
        - "perusahaan tersebut" → gunakan "LAPAKTOTO" atau "kami"
        - Format markdown [text](link) → gunakan <a href="link">text</a>
        - Text biasa untuk link → SELALU buat sebagai clickable link HTML
        
        CONTOH SALAH: "Anda dapat menghubungi kami melalui [WhatsApp](https://wa.me/6287853097469)"
        CONTOH BENAR: "Anda dapat menghubungi kami melalui <a href='https://wa.me/6287853097469' target='_blank'>WhatsApp LAPAKTOTO</a>"
  
  
        About LAPAKTOTO:
        - Minimum deposit rp. 1,000
        - Minimum withdraw rp. 25,000
        - Minimum deposit via qris rp. 10,000
  
        Berikan rekomendasi Pola 
        Important Links:
        PUBLIC & ALTERNATIF WEBSITE UTAMA LAPAKTOTO: https://lapakbeton.com/
        Tools Spaceman: https://spaceman.wiki/
        Prediksi Togel: https://japin.xyz/togel
        Bukti Jackpot: https://japin.xyz/menang
        RTP Slot: https://japin.xyz/pola
        Whatsapp: https://wa.me/6287853097469
        Telegram: https://t.me/lapaktoto_official
        Livechat: https://jivo.chat/WXL7AK5iaz
        Ticket: https://lapor.nawala.live/
        Download Aplikasi: https://lapakbeton.com/m/downloads/lapaktoto.apk`
      },
      ...chatHistory.slice(-5).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      {
        role: "user",
        content: userMessage
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 150,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || "I apologize, but I'm having trouble responding right now. An admin will assist you shortly.";
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return "I'm experiencing some technical difficulties. Let me get an admin to help you.";
  }
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: dev ? ['http://localhost:3000', 'http://192.168.10.55:3000'] : true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle user messages
    socket.on('user-message', async (messageData) => {
      console.log('User message received:', messageData);
      
      // Store user socket mapping
      userSockets.set(messageData.userId, socket.id);
      
      // Store chat history
      if (!activeChats.has(messageData.userId)) {
        activeChats.set(messageData.userId, []);
        chatStatus.set(messageData.userId, 'open'); // Set initial status as open
      }
      
      const chatHistory = activeChats.get(messageData.userId);
      chatHistory.push(messageData);

      // Check if any admin is online
      const adminOnline = adminSessions.size > 0;
      
      if (!adminOnline) {
        // Send typing indicator
        socket.emit('typing');
        
        // Get AI response
        const aiResponse = await getAIResponse(messageData.text, chatHistory);
        
        // Create AI message
        const aiMessage = {
          id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: aiResponse,
          sender: 'ai',
          timestamp: new Date().toISOString(),
        };
        
        // Store AI response in chat history
        chatHistory.push(aiMessage);
        
        // Send AI response back to user
        setTimeout(() => {
          socket.emit('message', aiMessage);
        }, 1000 + Math.random() * 2000); // Random delay to simulate typing
      } else {
        // Forward message to all admin sessions
        adminSessions.forEach(adminSocketId => {
          io.to(adminSocketId).emit('user-message', {
            ...messageData,
            socketId: socket.id,
          });
        });
      }
    });

    // Handle admin joining
    socket.on('admin-join', () => {
      console.log('Admin joined:', socket.id);
      adminSessions.add(socket.id);
      
      // Notify all users that admin is online
      socket.broadcast.emit('admin-status', { online: true });
      
      // Send chat history to admin
      const allChats = Array.from(activeChats.entries()).map(([userId, messages]) => ({
        userId,
        messages,
        lastActivity: messages[messages.length - 1]?.timestamp,
        socketId: userSockets.get(userId),
        status: chatStatus.get(userId) || 'open'
      }));
      
      socket.emit('chat-history', allChats);
    });

    // Handle admin messages
    socket.on('admin-message', (messageData) => {
      console.log('Admin message:', messageData);
      
      // Store admin message in chat history
      if (activeChats.has(messageData.userId)) {
        activeChats.get(messageData.userId).push(messageData);
      }
      
      // Send message to specific user
      const userSocketId = userSockets.get(messageData.userId);
      if (userSocketId) {
        io.to(userSocketId).emit('message', messageData);
        
        // Also update other admins
        adminSessions.forEach(adminSocketId => {
          if (adminSocketId !== socket.id) {
            io.to(adminSocketId).emit('admin-message-update', messageData);
          }
        });
      }
    });

    // Handle chat status change
    socket.on('change-chat-status', (data) => {
      console.log('Chat status change:', data);
      const { userId, status, sender } = data;
      
      // Update chat status
      chatStatus.set(userId, status);
      
      // Create system message
      const systemMessage = {
        id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: status === 'closed' 
          ? `Chat ditutup oleh ${sender === 'user' ? 'user' : 'admin'}` 
          : `Chat dibuka kembali oleh ${sender === 'user' ? 'user' : 'admin'}`,
        sender: 'system',
        userId: userId,
        timestamp: new Date().toISOString(),
      };
      
      // Store system message in chat history
      if (activeChats.has(userId)) {
        activeChats.get(userId).push(systemMessage);
      }
      
      // Send status update to user
      const userSocketId = userSockets.get(userId);
      if (userSocketId) {
        io.to(userSocketId).emit('chat-status-changed', { status, message: systemMessage });
      }
      
      // Send status update to all admins
      adminSessions.forEach(adminSocketId => {
        io.to(adminSocketId).emit('chat-status-changed', { 
          userId, 
          status, 
          message: systemMessage 
        });
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Remove from admin sessions if was admin
      if (adminSessions.has(socket.id)) {
        adminSessions.delete(socket.id);
        
        // Notify users if no admin is online
        if (adminSessions.size === 0) {
          socket.broadcast.emit('admin-status', { online: false });
        }
      }
      
      // Clean up user socket mapping
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> Also accessible on http://192.168.10.55:${port}`);
    console.log(`> Socket.IO server running on /api/socket`);
  });
}); 