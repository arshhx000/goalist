<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gapkar Chat - Real Time</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: linear-gradient(180deg, #f4d03f 0%, #f7dc6f 50%, #f4d03f 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .chat-container {
      width: 100%;
      max-width: 400px;
      height: 100vh;
      max-height: 700px;
      background: #f4d03f;
      display: grid;
      grid-template-rows: auto 1fr auto;
      position: relative;
    }

    /* Header */
    .chat-header {
      background: #f4d03f;
      padding: 15px 20px 10px;
      text-align: left;
    }

    .app-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-icon {
      width: 30px;
      height: 30px;
      background: #e74c3c;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 16px;
    }

    .app-name {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
    }

    .connection-info {
      font-size: 14px;
      color: #34495e;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #e74c3c;
      animation: pulse 2s infinite;
    }

    .status-dot.connected {
      background: #27ae60;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    /* Chat Messages Area */
    .chat-messages {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .message {
      display: flex;
      flex-direction: column;
      gap: 5px;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message.system {
      align-items: center;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .username {
      background: #2c3e50;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
    }

    .username.user1 { background: #2c3e50; }
    .username.user2 { background: #8e44ad; }
    .username.user3 { background: #27ae60; }
    .username.system { background: #95a5a6; }

    .timestamp {
      color: #7f8c8d;
      font-size: 12px;
      font-weight: 500;
    }

    .message-bubble {
      background: rgba(255, 255, 255, 0.9);
      padding: 12px 16px;
      border-radius: 18px;
      max-width: 85%;
      color: #2c3e50;
      font-size: 14px;
      line-height: 1.4;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .message.system .message-bubble {
      background: rgba(149, 165, 166, 0.2);
      font-style: italic;
      text-align: center;
      max-width: 100%;
    }

    /* Typing indicator */
    .typing-indicator {
      display: none;
      font-size: 12px;
      color: #7f8c8d;
      font-style: italic;
      padding: 5px 20px;
    }

    /* Input Area */
    .chat-input {
      padding: 15px 20px 25px;
      background: #f4d03f;
    }

    .username-input {
      margin-bottom: 10px;
    }

    .username-input input {
      width: 100%;
      padding: 8px 15px;
      border: none;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.9);
      color: #2c3e50;
      font-size: 13px;
      outline: none;
    }

    .input-container {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 25px;
      padding: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .message-input {
      flex: 1;
      border: none;
      outline: none;
      padding: 10px 15px;
      background: transparent;
      color: #2c3e50;
      font-size: 14px;
    }

    .message-input::placeholder {
      color: #95a5a6;
      font-style: italic;
    }

    .send-button {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
      transition: all 0.2s ease;
    }

    .send-button:hover {
      transform: scale(1.05);
      box-shadow: 0 3px 12px rgba(231, 76, 60, 0.4);
    }

    .send-button:active {
      transform: scale(0.95);
    }

    .send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    /* Responsive Design */
    @media (max-width: 480px) {
      .chat-container {
        max-width: 100%;
        height: 100vh;
        max-height: none;
        border-radius: 0;
      }
      
      .chat-messages {
        padding: 15px;
      }
      
      .message-bubble {
        max-width: 90%;
      }
    }

    /* Scrollbar Styling */
    .chat-messages::-webkit-scrollbar {
      width: 4px;
    }

    .chat-messages::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
    }

    .chat-messages::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }

    .chat-messages::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  </style>
</head>
<body>
  <div class="chat-container">
    <!-- Header -->
    <div class="chat-header">
      <div class="app-title">
        <div class="logo">
          <div class="logo-icon">🐿</div>
          <span class="app-name">gapkar</span>
        </div>
        <div class="connection-info">
          <div class="connection-status">
            <span class="status-dot" id="statusDot"></span>
            <span id="connectionStatus">connecting...</span>
          </div>
          <small><span id="userCount">0</span> users online</small>
        </div>
      </div>
    </div>

    <!-- Chat Messages -->
    <div class="chat-messages" id="chatMessages">
      <!-- Messages will be added here -->
    </div>

    <!-- Typing Indicator -->
    <div class="typing-indicator" id="typingIndicator"></div>

    <!-- Input Area -->
    <div class="chat-input">
      <div class="username-input">
        <input 
          type="text" 
          id="usernameInput" 
          placeholder="Enter your name..." 
          maxlength="20"
        >
      </div>
      <div class="input-container">
        <input 
          type="text" 
          class="message-input" 
          placeholder="Type your message here ..." 
          id="messageInput"
          maxlength="500"
        >
        <button class="send-button" id="sendButton">
          ➤
        </button>
      </div>
    </div>
  </div>

  <!-- Socket.IO Client -->
  <script src="/socket.io/socket.io.js"></script>
  <script>
    // Socket.IO connection
    const socket = io('http://localhost:3001');
    
    // DOM elements
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const usernameInput = document.getElementById('usernameInput');
    const sendButton = document.getElementById('sendButton');
    const connectionStatus = document.getElementById('connectionStatus');
    const statusDot = document.getElementById('statusDot');
    const userCount = document.getElementById('userCount');
    const typingIndicator = document.getElementById('typingIndicator');

    // User state
    let currentUsername = localStorage.getItem('gapkar_username') || '';
    let isTyping = false;
    let typingTimer;

    // Set initial username
    if (currentUsername) {
      usernameInput.value = currentUsername;
    }

    // Socket connection events
    socket.on('connect', () => {
      connectionStatus.textContent = 'connected';
      statusDot.classList.add('connected');
      
      // Join chat with username
      if (currentUsername) {
        socket.emit('user_joined', { username: currentUsername });
      }
    });

    socket.on('disconnect', () => {
      connectionStatus.textContent = 'disconnected';
      statusDot.classList.remove('connected');
    });

    // Load existing messages
    socket.on('load_messages', (messages) => {
      chatMessages.innerHTML = '';
      messages.forEach(message => {
        displayMessage(message);
      });
    });

    // Receive new messages
    socket.on('new_message', (message) => {
      displayMessage(message);
    });

    // Update user count
    socket.on('user_count', (count) => {
      userCount.textContent = count;
    });

    // Typing indicator
    socket.on('user_typing', (data) => {
      if (data.isTyping) {
        typingIndicator.textContent = `${data.username} is typing...`;
        typingIndicator.style.display = 'block';
      } else {
        typingIndicator.style.display = 'none';
      }
    });

    // Display message function
    function displayMessage(message) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${message.type || 'user'}`;
      
      const timestamp = new Date(message.timestamp).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      let userClass = 'user1';
      if (message.username === 'System') userClass = 'system';
      else if (message.username.includes('2')) userClass = 'user2';
      else if (message.username.includes('3')) userClass = 'user3';

      if (message.type === 'system') {
        messageDiv.innerHTML = `
          <div class="message-bubble">
            ${message.message}
          </div>
        `;
      } else {
        messageDiv.innerHTML = `
          <div class="message-header">
            <span class="username ${userClass}">@${message.username}</span>
            <span class="timestamp">${timestamp}</span>
          </div>
          <div class="message-bubble">
            ${escapeHtml(message.message)}
          </div>
        `;
      }
      
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Send message function
    function sendMessage() {
      const message = messageInput.value.trim();
      const username = usernameInput.value.trim() || 'Anonymous';
      
      if (message) {
        // Update username if changed
        if (username !== currentUsername) {
          currentUsername = username;
          localStorage.setItem('gapkar_username', currentUsername);
          socket.emit('user_joined', { username: currentUsername });
        }

        // Send message
        socket.emit('send_message', { 
          username: currentUsername, 
          message: message 
        });
        
        // Clear input
        messageInput.value = '';
        
        // Stop typing indicator
        if (isTyping) {
          isTyping = false;
          socket.emit('typing', { username: currentUsername, isTyping: false });
        }
      }
    }

    // Escape HTML function
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });

    // Typing indicator
    messageInput.addEventListener('input', () => {
      const username = usernameInput.value.trim() || 'Anonymous';
      
      if (!isTyping) {
        isTyping = true;
        socket.emit('typing', { username, isTyping: true });
      }
      
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        isTyping = false;
        socket.emit('typing', { username, isTyping: false });
      }, 1000);
    });

    // Username change
    usernameInput.addEventListener('change', () => {
      const newUsername = usernameInput.value.trim();
      if (newUsername && newUsername !== currentUsername) {
        currentUsername = newUsername;
        localStorage.setItem('gapkar_username', currentUsername);
        socket.emit('user_joined', { username: currentUsername });
      }
    });
  </script>
</body>
</html>
