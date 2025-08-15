// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, setDoc, doc, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCOmLxxqPesNaBr4Z9fVIU6K2BLW6OsED0",
  authDomain: "gappkar-v1-b3afe.firebaseapp.com",
  databaseURL: "https://gappkar-v1-b3afe-default-rtdb.firebaseio.com",
  projectId: "gappkar-v1-b3afe",
  storageBucket: "gappkar-v1-b3afe.firebasestorage.app",
  messagingSenderId: "726018257415",
  appId: "1:726018257415:web:12142708abdf47952af0a2",
  measurementId: "G-EWK4436NRB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global variables
let currentUser = null;
let currentUsername = "";
let currentUserAge = 0;
let currentUserLocation = "";
let userLatitude = null;
let userLongitude = null;
let isJoined = false;
let messageCount = 0;

// Room variables
let currentRoom = "global"; // Default to global chat
let messagesListener = null;

// Online user tracking variables
let onlineUsers = new Set();
let presenceUpdateInterval = null;
let onlineUsersListener = null;

// DOM Elements
const joinView = document.getElementById("joinView");
const chatsView = document.getElementById("chatsView");
const messageList = document.getElementById("messageList");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const backButton = document.getElementById("backButton");
const themeToggle = document.getElementById("themeToggle");
const usernameInput = document.getElementById("usernameInput");
const ageInput = document.getElementById("ageInput");
const locationInput = document.getElementById("locationInput");
const joinButton = document.getElementById("joinButton");
const getLocationBtn = document.getElementById("getLocationBtn");
const peopleCount = document.getElementById("peopleCount");

// Updated Room DOM elements
const createRoomBtnHeader = document.getElementById("createRoomBtn");
const roomModal = document.getElementById("roomModal");
const roomModalClose = document.getElementById("roomModalClose");
const roomKeyInput = document.getElementById("roomKeyInput");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const createRoomBtnModal = document.getElementById("createRoomBtnModal"); // Updated ID
const leaveRoomBtn = document.getElementById("leaveRoomBtn");
const roomIndicator = document.getElementById("roomIndicator");

// Enhanced time formatting
function getTimeString(timestamp = null) {
  const date = timestamp ? (timestamp.toDate ? timestamp.toDate() : timestamp) : new Date();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

// Enhanced smooth scroll to bottom function
function smoothScrollToBottom() {
    if (messageList) {
        requestAnimationFrame(() => {
            messageList.scrollTo({
                top: messageList.scrollHeight,
                behavior: 'smooth'
            });
        });
    }
}

// Room Management Functions
function showRoomModal() {
    if (roomModal) {
        roomModal.classList.add('show');
    }
}

function hideRoomModal() {
    if (roomModal) {
        roomModal.classList.remove('show');
        if (roomKeyInput) {
            roomKeyInput.value = '';
        }
    }
}

function updateRoomUI() {
    // Update room indicator in header
    if (roomIndicator) {
        if (currentRoom === "global") {
            roomIndicator.textContent = "Global";
            roomIndicator.style.background = "var(--accent)";
        } else {
            roomIndicator.textContent = currentRoom;
            roomIndicator.style.background = "#28a745"; // Green for private rooms
        }
    }
    
    console.log(`🎯 UI updated for room: ${currentRoom}`);
}

async function createOrJoinRoom(roomKey) {
    if (!roomKey || !roomKey.trim()) {
        alert("Please enter a room key");
        return;
    }
    
    const sanitizedRoomKey = roomKey.trim().toLowerCase();
    
    // Don't rejoin the same room
    if (sanitizedRoomKey === currentRoom) {
        hideRoomModal();
        return;
    }
    
    // Stop current message listener
    if (messagesListener) {
        messagesListener();
    }
    
    // Update current room
    currentRoom = sanitizedRoomKey;
    
    // Update UI
    updateRoomUI();
    
    // Clear messages and show room join message
    messageList.innerHTML = "";
    addSystemMessage(`Joined room: ${currentRoom}`);
    
    // Start listening to room messages
    listenForMessages();
    
    // Update presence with new room
    if (currentUser && isJoined) {
        trackUserPresence();
    }
    
    // Hide modal
    hideRoomModal();
    
    // Store room in localStorage
    localStorage.setItem('gappkar_current_room', currentRoom);
    
    console.log(`✅ Joined room: ${currentRoom}`);
}

function leaveRoom() {
    // Don't leave if already in global
    if (currentRoom === "global") {
        hideRoomModal();
        return;
    }
    
    // Stop current message listener
    if (messagesListener) {
        messagesListener();
    }
    
    // Reset to global
    currentRoom = "global";
    
    // Update UI
    updateRoomUI();
    
    // Clear messages and show leave message
    messageList.innerHTML = "";
    addSystemMessage("Left room, back to global chat");
    
    // Start listening to global messages
    listenForMessages();
    
    // Update presence with new room
    if (currentUser && isJoined) {
        trackUserPresence();
    }
    
    // Hide modal
    hideRoomModal();
    
    // Remove room from localStorage
    localStorage.removeItem('gappkar_current_room');
    
    console.log("✅ Left room, back to global chat");
}

// Add system message
function addSystemMessage(text) {
    const systemMsg = {
        user: "System",
        message: text,
        timestamp: new Date(),
        isSystem: true
    };
    displayMessage(systemMsg);
}

// Enhanced user presence tracking
function trackUserPresence() {
    if (!currentUser || !currentUsername) {
        console.log("Cannot track presence: No user or username");
        return;
    }
    
    console.log("🔄 Starting presence tracking for user:", currentUsername);
    
    const userPresenceDoc = doc(db, "presence", currentUser.uid);
    const userPresenceData = {
        userId: currentUser.uid,
        username: currentUsername,
        location: currentUserLocation,
        age: currentUserAge,
        room: currentRoom,
        lastSeen: serverTimestamp(),
        isOnline: true,
        joinedAt: serverTimestamp()
    };
    
    setDoc(userPresenceDoc, userPresenceData).then(() => {
        console.log("✅ User presence tracked successfully");
    }).catch(error => {
        console.error("❌ Error tracking presence:", error);
    });
    
    // Clear existing interval
    if (presenceUpdateInterval) {
        clearInterval(presenceUpdateInterval);
    }
    
    // Update presence every 30 seconds
    presenceUpdateInterval = setInterval(() => {
        if (isJoined && currentUser) {
            const updateData = {
                ...userPresenceData,
                room: currentRoom,
                lastSeen: serverTimestamp()
            };
            
            setDoc(userPresenceDoc, updateData).then(() => {
                console.log("🔄 Presence updated for:", currentUsername);
            }).catch(error => {
                console.error("❌ Error updating presence:", error);
            });
        }
    }, 30000);
}

// Enhanced online users listener with room filtering
function listenForOnlineUsers() {
    console.log("🔍 Starting to listen for online users...");
    
    const presenceRef = collection(db, "presence");
    
    if (onlineUsersListener) {
        onlineUsersListener();
    }
    
    onlineUsersListener = onSnapshot(presenceRef, (querySnapshot) => {
        console.log("📡 Received presence update, total docs:", querySnapshot.size);
        
        onlineUsers.clear();
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        
        let activeUsers = 0;
        let roomUsers = 0;
        
        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            
            if (userData.lastSeen && userData.lastSeen.toDate() > fiveMinutesAgo) {
                onlineUsers.add(userData.userId);
                activeUsers++;
                
                // Count users in current room
                if (userData.room === currentRoom) {
                    roomUsers++;
                }
            }
        });
        
        console.log(`🎯 Total active users: ${activeUsers}, In current room: ${roomUsers}`);
        updateOnlineCount(roomUsers);
        
    }, (error) => {
        console.error("❌ Error listening for online users:", error);
    });
}

// Enhanced online count update
function updateOnlineCount(roomUserCount = null) {
    const peopleCountElement = document.getElementById("peopleCount");
    if (peopleCountElement) {
        const count = roomUserCount !== null ? roomUserCount : onlineUsers.size;
        const roomText = currentRoom === "global" ? "nearby" : `in ${currentRoom}`;
        peopleCountElement.textContent = `${count} people ${roomText}`;
        console.log(`📊 Updated UI: ${count} people ${roomText}`);
    }
}

// Get user's current location
function getUserLocation() {
  return new Promise((resolve, reject) => {
    const statusDiv = document.getElementById('locationStatus');
    
    if (!navigator.geolocation) {
      if (statusDiv) {
        statusDiv.textContent = "Geolocation is not supported by this browser";
        statusDiv.className = "error";
      }
      reject("Geolocation not supported");
      return;
    }
    
    if (statusDiv) {
      statusDiv.textContent = "Getting your location...";
      statusDiv.className = "";
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        userLatitude = position.coords.latitude;
        userLongitude = position.coords.longitude;
        
        try {
          const locationName = await getCityFromCoordinates(userLatitude, userLongitude);
          currentUserLocation = locationName || `${userLatitude.toFixed(2)}, ${userLongitude.toFixed(2)}`;
          
          if (statusDiv) {
            statusDiv.textContent = `Location found: ${currentUserLocation}`;
            statusDiv.className = "success";
          }
          
          if (locationInput) {
            locationInput.value = currentUserLocation;
          }
          resolve(currentUserLocation);
        } catch (error) {
          currentUserLocation = `${userLatitude.toFixed(2)}, ${userLongitude.toFixed(2)}`;
          if (statusDiv) {
            statusDiv.textContent = `Location: ${currentUserLocation}`;
            statusDiv.className = "success";
          }
          resolve(currentUserLocation);
        }
      },
      (error) => {
        let errorMessage = "";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
          default:
            errorMessage = "An unknown error occurred";
        }
        
        if (statusDiv) {
          statusDiv.textContent = errorMessage;
          statusDiv.className = "error";
        }
        reject(errorMessage);
      }
    );
  });
}

// Get city name from coordinates
async function getCityFromCoordinates(lat, lon) {
  try {
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    const data = await response.json();
    return data.city || data.locality || data.principalSubdivision;
  } catch (error) {
    console.log("Could not get city name:", error);
    return null;
  }
}

// Auto-login user when page loads
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("User signed in:", user.uid);
  } else {
    console.log("User signed out");
  }
});

// Enhanced join chat function
async function joinChat(username, age, location) {
  console.log("Join chat called with:", { username, age, location });
  
  if (!username.trim()) {
    alert("Please enter your name");
    return;
  }
  
  if (!age || age < 13 || age > 99) {
    alert("Please enter a valid age (13-99)");
    return;
  }
  
  if (!location.trim()) {
    alert("Please provide your location");
    return;
  }
  
  if (isJoined) {
    console.log("Already joined chat");
    return;
  }
  
  try {
    console.log("Attempting to sign in anonymously...");
    await signInAnonymously(auth);
    
    currentUsername = username;
    currentUserAge = parseInt(age);
    currentUserLocation = location;
    isJoined = true;
    
    console.log("Sign in successful, storing data...");
    
    // Store in localStorage
    localStorage.setItem('gappkar_username', username);
    localStorage.setItem('gappkar_age', age);
    localStorage.setItem('gappkar_location', location);
    localStorage.setItem('gappkar_joined', 'true');
    
    // Check for saved room
    const savedRoom = localStorage.getItem('gappkar_current_room');
    if (savedRoom) {
        currentRoom = savedRoom;
    }
    
    // Switch views
    const mainContainer = document.getElementById("mainContainer");
    
    if (mainContainer) {
      mainContainer.classList.add("chat-active");
    }
    joinView.classList.add("hidden");
    chatsView.classList.remove("hidden");
    document.body.classList.add("chat-active");
    
    // Update UI
    updateRoomUI();
    
    // Apply mobile-specific styles
    if (window.innerWidth <= 480) {
        chatsView.style.position = 'fixed';
        chatsView.style.top = '0';
        chatsView.style.left = '0';
        chatsView.style.width = '100vw';
        chatsView.style.height = '100vh';
        chatsView.style.zIndex = '9999';
    }
    
    // Clear messages and add welcome
    messageList.innerHTML = "";
    addSystemMessage(`Welcome ${currentUsername}! You're in ${currentRoom === "global" ? "global chat" : `room: ${currentRoom}`}`);
    
    console.log("Starting to listen for messages...");
    listenForMessages();
    
    // Start online user tracking
    setTimeout(() => {
        trackUserPresence();
        listenForOnlineUsers();
        console.log("🚀 Online user tracking started!");
    }, 2000);
    
    console.log(`Successfully joined enhanced chat - Name: ${username}, Age: ${age}, Location: ${location}, Room: ${currentRoom}`);
  } catch (error) {
    console.error("Error joining chat:", error);
    isJoined = false;
    alert("Failed to join chat: " + error.message);
  }
}

// Enhanced send message function with room support
async function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (!messageText || !currentUser || !isJoined) {
        return;
    }
    
    // Clear input immediately
    messageInput.value = "";
    
    // Create temporary message for instant display
    const tempMessage = {
        user: currentUsername,
        message: messageText,
        timestamp: new Date(),
        location: currentUserLocation,
        age: currentUserAge,
        userId: currentUser.uid,
        room: currentRoom,
        isTemp: true
    };
    
    displayMessage(tempMessage);
    smoothScrollToBottom();
    
    try {
        // Send to Firebase with room
        await addDoc(collection(db, "messages"), {
            user: currentUsername,
            message: messageText,
            timestamp: serverTimestamp(),
            location: currentUserLocation,
            age: currentUserAge,
            userId: currentUser.uid,
            room: currentRoom,
            latitude: userLatitude,
            longitude: userLongitude
        });
        
        console.log("✅ Message sent successfully to room:", currentRoom);
        
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message");
        
        // Remove temporary message on error
        const tempMessages = document.querySelectorAll('[data-temp="true"]');
        tempMessages.forEach(msg => msg.remove());
    }
}

// Enhanced listen for messages with room filtering
function listenForMessages() {
  // Stop existing listener
  if (messagesListener) {
    messagesListener();
  }
  
  const messagesRef = collection(db, "messages");
  const q = query(
    messagesRef,
    where("room", "==", currentRoom),
    orderBy("timestamp", "asc")
  );
  
  messagesListener = onSnapshot(q, (querySnapshot) => {
    const messageContainer = document.getElementById("messageList");
    
    // Clear messages but keep system messages
    const systemMessages = messageContainer.querySelectorAll('[data-system="true"]');
    messageContainer.innerHTML = "";
    systemMessages.forEach(msg => messageContainer.appendChild(msg));
    
    messageCount = 0;
    
    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      if (!messageData.isTemp && !messageData.isSystem) {
        displayMessage(messageData);
      }
    });
    
    setTimeout(() => smoothScrollToBottom(), 200);
  });
}

// Enhanced display message
function displayMessage(messageData) {
  const messageContainer = document.getElementById("messageList");
  const isCurrentUser = messageData.user === currentUsername;
  const isSystem = messageData.isSystem || messageData.user === "System";
  
  const messageDiv = document.createElement("div");
  
  if (isSystem) {
    messageDiv.className = "message system";
    messageDiv.setAttribute('data-system', 'true');
    messageDiv.innerHTML = `
      <div class="message-bubble system-message">
        ${messageData.message}
      </div>
    `;
  } else {
    messageDiv.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
    
    if (messageData.isTemp) {
      messageDiv.setAttribute('data-temp', 'true');
    }
    
    const timeString = getTimeString(messageData.timestamp);
    
    if (isCurrentUser) {
      // Sent message
      messageDiv.innerHTML = `
        <div class="message-bubble">
          ${messageData.message}
          <div class="message-time">${timeString}</div>
        </div>
      `;
    } else {
      // Received message
      messageDiv.innerHTML = `
        <div class="message-info">
          <div class="sender-name">${messageData.user}${messageData.age ? ` (${messageData.age})` : ''}</div>
          <div class="message-bubble">
            ${messageData.message}
            <div class="message-time">${timeString}</div>
          </div>
          ${messageData.location ? `<div class="message-location">📍 ${messageData.location}</div>` : ''}
        </div>
      `;
    }
  }
  
  messageContainer.appendChild(messageDiv);
  messageCount++;
}

// Check existing session
function checkExistingSession() {
  const savedUsername = localStorage.getItem('gappkar_username');
  const savedAge = localStorage.getItem('gappkar_age');
  const savedLocation = localStorage.getItem('gappkar_location');
  const savedJoined = localStorage.getItem('gappkar_joined');
  const savedRoom = localStorage.getItem('gappkar_current_room');
  
  if (savedUsername && savedJoined === 'true') {
    console.log("Found existing session, auto-joining...");
    
    currentUsername = savedUsername;
    currentUserAge = parseInt(savedAge) || 0;
    currentUserLocation = savedLocation || "";
    
    if (savedRoom) {
        currentRoom = savedRoom;
    }
    
    setTimeout(() => {
      joinChat(savedUsername, savedAge, savedLocation);
    }, 500);
  }
}

// Enhanced logout function
function logout() {
  console.log("🚪 User logging out...");
  
  // Clean up listeners
  if (presenceUpdateInterval) {
    clearInterval(presenceUpdateInterval);
  }
  if (onlineUsersListener) {
    onlineUsersListener();
  }
  if (messagesListener) {
    messagesListener();
  }
  
  // Reset UI
  chatsView.classList.add("hidden");
  joinView.classList.remove("hidden");
  document.body.classList.remove("chat-active");
  
  const mainContainer = document.getElementById("mainContainer");
  if (mainContainer) {
    mainContainer.classList.remove("chat-active");
  }
  
  // Clear data
  localStorage.clear();
  isJoined = false;
  currentUsername = "";
  currentRoom = "global";
  
  // Reset form
  if (usernameInput) usernameInput.value = "";
  if (ageInput) ageInput.value = "";
  if (locationInput) locationInput.value = "";
  
  console.log("✅ Logout completed");
}

// Enhanced event listeners setup
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM loaded, setting up enhanced event listeners...");
  
  checkExistingSession();
  
  // Get location button
  if (getLocationBtn) {
    getLocationBtn.addEventListener("click", async function() {
      try {
        await getUserLocation();
      } catch (error) {
        console.error("Location error:", error);
      }
    });
  }
  
  // Join chat button
  if (joinButton) {
    joinButton.addEventListener("click", function(e) {
      e.preventDefault();
      const username = usernameInput?.value.trim();
      const age = ageInput?.value;
      const location = locationInput?.value.trim();
      
      joinChat(username, age, location);
    });
  }
  
  // Send message handlers
  if (sendButton) {
    sendButton.addEventListener("click", function(e) {
      e.preventDefault();
      sendMessage();
    });
  }
  
  if (messageInput) {
    messageInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
  }
  
  // Back button handler
  if (backButton) {
    backButton.addEventListener("click", logout);
  }
  
  // Room management event listeners
  if (createRoomBtnHeader) {
    createRoomBtnHeader.addEventListener("click", showRoomModal);
  }
  
  if (roomModalClose) {
    roomModalClose.addEventListener("click", hideRoomModal);
  }
  
  if (joinRoomBtn) {
    joinRoomBtn.addEventListener("click", () => {
      const roomKey = roomKeyInput?.value.trim();
      if (roomKey) {
        createOrJoinRoom(roomKey);
      } else {
        alert("Please enter a room key");
      }
    });
  }
  
  // Fixed: Use correct ID for modal create button
  if (createRoomBtnModal) {
    createRoomBtnModal.addEventListener("click", () => {
      const roomKey = roomKeyInput?.value.trim();
      if (roomKey) {
        createOrJoinRoom(roomKey);
      } else {
        alert("Please enter a room key");
      }
    });
  }
  
  if (leaveRoomBtn) {
    leaveRoomBtn.addEventListener("click", leaveRoom);
  }
  
  // Close modal when clicking outside
  if (roomModal) {
    roomModal.addEventListener("click", (e) => {
      if (e.target === roomModal) {
        hideRoomModal();
      }
    });
  }
  
  // Room key input enter handler
  if (roomKeyInput) {
    roomKeyInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const roomKey = roomKeyInput.value.trim();
        if (roomKey) {
          createOrJoinRoom(roomKey);
        } else {
          alert("Please enter a room key");
        }
      }
    });
  }
  
  // Listen for custom events from HTML modal (additional support)
  window.addEventListener('joinRoom', (e) => {
    if (e.detail && e.detail.roomKey) {
      createOrJoinRoom(e.detail.roomKey);
    }
  });
  
  window.addEventListener('createRoom', (e) => {
    if (e.detail && e.detail.roomKey) {
      createOrJoinRoom(e.detail.roomKey);
    }
  });
  
  window.addEventListener('leaveRoom', () => {
    leaveRoom();
  });
  
  // Form navigation with Enter key
  if (usernameInput) {
    usernameInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        ageInput?.focus();
      }
    });
  }
  
  if (ageInput) {
    ageInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        locationInput?.focus();
      }
    });
  }
  
  if (locationInput) {
    locationInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        joinButton?.click();
      }
    });
  }
});

// Make logout available globally
window.logout = logout;

// Enhanced cleanup on page unload
window.addEventListener('beforeunload', () => {
    console.log("🔄 Page unloading, cleaning up...");
    
    if (onlineUsersListener) {
        onlineUsersListener();
    }
    
    if (messagesListener) {
        messagesListener();
    }
    
    if (presenceUpdateInterval) {
        clearInterval(presenceUpdateInterval);
    }
});
