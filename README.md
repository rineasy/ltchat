# Live Chat Application with AI Assistant

A modern live chat application built with Next.js that features:
- Anonymous or named user chat
- AI-powered auto-responses using OpenAI GPT
- Admin panel for human takeover
- Real-time messaging with Socket.IO
- Beautiful, responsive UI with Tailwind CSS

## Features

### For Users
- **Anonymous Chat**: Start chatting without providing personal information
- **Named Chat**: Optional name input for personalized experience
- **AI Assistant**: Get instant responses powered by OpenAI GPT-3.5
- **Real-time Messaging**: Live chat with typing indicators
- **Responsive Design**: Works perfectly on desktop and mobile

### For Admins
- **Admin Panel**: Dedicated interface at `/admin`
- **Live Chat Monitoring**: See all active conversations
- **Human Takeover**: Seamlessly take over from AI assistant
- **Chat History**: View complete conversation history
- **Multi-session Support**: Multiple admins can work simultaneously

## Getting Started

### Prerequisites
- Node.js 18+ 
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone and setup the project:**
   ```bash
   cd ltchat
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   # Copy the example file
   cp env.example .env.local
   
   # Edit .env.local and add your OpenAI API key
   OPENAI_API_KEY=your_actual_openai_api_key_here
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - User chat: http://localhost:3000
   - Admin panel: http://localhost:3000/admin

## Configuration

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add it to your `.env.local` file

**Note:** The application will work without an API key, but AI responses will show a configuration message.

### Admin Access
- Default admin password: `admin123`
- Change this in production by modifying `src/app/admin/page.js`

## How It Works

### Chat Flow
1. **User visits the site** → sees welcome screen with name/anonymous options
2. **User starts chat** → connects to Socket.IO server
3. **No admin online** → AI assistant responds automatically
4. **Admin joins** → system switches to human chat mode
5. **Admin responds** → messages go directly between admin and user

### Technology Stack
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Custom Node.js server with Socket.IO
- **AI**: OpenAI GPT-3.5 Turbo
- **Real-time**: WebSocket connections via Socket.IO

## File Structure

```
ltchat/
├── src/
│   └── app/
│       ├── page.js           # Main chat interface
│       ├── admin/
│       │   └── page.js       # Admin panel
│       ├── api/
│       │   └── socket/
│       │       └── route.js  # Socket.IO API route (unused)
│       ├── layout.js         # App layout
│       └── globals.css       # Global styles
├── server.js                 # Custom server with Socket.IO
├── package.json              # Dependencies and scripts
└── env.example               # Environment variables template
```

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Deploy to Vercel/Netlify
The application uses a custom server, so standard deployment platforms may require additional configuration. Consider using:
- Railway
- Render
- DigitalOcean App Platform
- Or any VPS with Node.js support

## Customization

### Styling
- Modify Tailwind classes in component files
- Update `src/app/globals.css` for global styles
- Colors and themes can be adjusted in Tailwind configuration

### AI Responses
- Edit the system prompt in `server.js`
- Adjust response parameters (temperature, max_tokens) in the OpenAI configuration
- Modify response delay and typing indicators

### Admin Authentication
- Current implementation uses a simple password
- For production, implement proper authentication:
  - JWT tokens
  - Session management
  - Role-based access control

## API Endpoints

### Socket.IO Events

#### Client → Server
- `user-message`: Send user message
- `admin-join`: Admin authentication
- `admin-message`: Send admin message

#### Server → Client
- `message`: Receive new message
- `typing`: Show typing indicator
- `admin-status`: Admin online/offline status
- `chat-history`: Historical conversations (admin only)

## Development Notes

### Adding Features
- New message types can be added by extending the Socket.IO event handlers
- Additional AI models can be integrated by modifying the `getAIResponse` function
- Database persistence can be added by replacing the in-memory Maps

### Performance Considerations
- Chat history is stored in memory (consider database for production)
- OpenAI API calls are rate-limited
- Socket.IO connections scale based on server resources

## Troubleshooting

### Common Issues

1. **Socket.IO connection fails**
   - Check if port 3000 is available
   - Verify server is running with `npm run dev`

2. **AI responses not working**
   - Verify OpenAI API key in `.env.local`
   - Check API key has sufficient credits

3. **Admin panel not accessible**
   - Go to `/admin` explicitly
   - Use password: `admin123`

4. **Messages not real-time**
   - Check browser console for WebSocket errors
   - Ensure custom server is running (not `next dev`)

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the browser console for errors
3. Check server logs for backend issues
