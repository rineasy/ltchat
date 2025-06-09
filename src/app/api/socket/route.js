import { Server } from 'socket.io';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

let io;
let openai;

// Initialize OpenAI client
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Store active chats and admin status
const activeChats = new Map();
const adminSessions = new Set();

// AI response function
async function getAIResponse(userMessage, chatHistory = []) {
  if (!openai) {
    return "AI is not configured. Please set your OpenAI API key.";
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

export async function GET() {
  return NextResponse.json({ message: 'Socket.IO server endpoint' });
}

export async function POST(req) {
  if (!io) {
    console.log('Initializing Socket.IO server...');
    const { Server } = await import('socket.io');
    
    // Get the server instance
    const httpServer = req.socket?.server;
    
    if (!httpServer) {
      return NextResponse.json({ error: 'Server not available' }, { status: 500 });
    }

    io = new Server(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : true,
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle user messages
      socket.on('user-message', async (messageData) => {
        console.log('User message received:', messageData);
        
        // Store chat history
        if (!activeChats.has(messageData.userId)) {
          activeChats.set(messageData.userId, []);
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
            id: Date.now().toString(),
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
          lastActivity: messages[messages.length - 1]?.timestamp
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
        if (messageData.targetSocketId) {
          io.to(messageData.targetSocketId).emit('message', messageData);
        }
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
      });
    });

    console.log('Socket.IO server initialized');
  }

  return NextResponse.json({ message: 'Socket.IO server running' });
} 