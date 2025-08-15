// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, setDoc, doc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

// DOM Elements
const joinView = document.getElementById("joinView");
const chatsView = document.getElementById("chatsView");
const messageList = document.getElementById("messageList");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const backButton = document.getElementById("backButton");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

// Join form elements
const usernameInput = document.getElementById("usernameInput");
const ageInput = document.getElementById("ageInput");
const locationInput = document.getElementById("locationInput");
const joinButton = document.getElementById("joinButton");
const getLocationBtn = document.getElementById("getLocationBtn");

// Chat header elements
const chatContactName = document.getElementById("contactName");
const peopleCount = document.getElementById("peopleCount");

// Global variables
let currentUser = null;
let currentUsername = "";
let currentUserAge = 0;
let currentUserLocation = "";
let userLatitude = null;
let userLongitude = null;
let isJoined = false;
let messageCount = 0;

// Online user tracking variables
let onlineUsers = new Set();
let presenceUpdateInterval = null;
let onlineUsersListener = null;

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
    const messageList = document.getElementById('messageList');
    if (messageList) {
        requestAnimationFrame(() => {
            messageList.scrollTo({
                top: messageList.scrollHeight,
                behavior: 'smooth'
            });
        });
    }
}

// Enhanced mobile keyboard handling
function setupEnhancedMobileKeyboardFix() {
    const messageInput = document.getElementById('messageInput');
    const chatInput = document.getElementById('chatInput');
    const messageList = document.getElementById('messageList');
    
    if (!messageInput || !chatInput || !messageList) return;

    let initialViewportHeight = window.innerHeight;
    let isKeyboardOpen = false;

    function handleViewportChange() {
        const currentHeight = window.innerHeight;
        const heightDifference = initialViewportHeight - currentHeight;
        
        if (heightDifference > 150 && !isKeyboardOpen) {
            // Keyboard opened
            isKeyboardOpen = true;
            document.body.classList.add('keyboard-active');
            
            if (window.innerWidth <= 480) {
                messageList.style.height = `calc(100vh - 140px - ${heightDifference}px)`;
                messageList.style.paddingBottom = '20px';
                setTimeout(() => smoothScrollToBottom(), 300);
            }
            
        } else if (heightDifference <= 150 && isKeyboardOpen) {
            // Keyboard closed
            isKeyboardOpen = false;
            document.body.classList.remove('keyboard-active');
            
            if (window.innerWidth <= 480) {
                messageList.style.height = 'calc(100vh - 140px)';
                messageList.style.paddingBottom = '16px';
            }
        }
    }

    // Visual Viewport API for better keyboard detection
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const viewport = window.visualViewport;
            const keyboardHeight = window.innerHeight - viewport.height;
            
            if (keyboardHeight > 150 && !isKeyboardOpen) {
                isKeyboardOpen = true;
                document.body.classList.add('keyboard-active');
                
                if (window.innerWidth <= 480) {
                    messageList.style.height = `calc(100vh - 140px - ${keyboardHeight}px)`;
                    messageList.style.paddingBottom = '20px';
                    setTimeout(() => smoothScrollToBottom(), 300);
                }
                
            } else if (keyboardHeight <= 150 && isKeyboardOpen) {
                isKeyboardOpen = false;
                document.body.classList.remove('keyboard-active');
                
                if (window.innerWidth <= 480) {
                    messageList.style.height = 'calc(100vh - 140px)';
                    messageList.style.paddingBottom = '16px';
                }
            }
        });
    } else {
        // Fallback for older browsers
        window.addEventListener('resize', handleViewportChange);
    }

    // Enhanced input focus handling
    messageInput.addEventListener('focus', () => {
        setTimeout(() => {
            smoothScrollToBottom();
            if (window.innerWidth <= 480) {
                messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 400);
    });

    // Scroll when typing
    messageInput.addEventListener('input', () => {
        if (isKeyboardOpen) {
            smoothScrollToBottom();
        }
    });
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
        lastSeen: serverTimestamp(),
        isOnline: true,
        joinedAt: serverTimestamp()
    };
    
    setDoc(userPresenceDoc, userPresenceData).then(() => {
        console.log("✅ User presence tracked successfully");
    }).catch(error => {
        console.error("❌ Error tracking presence:", error);
    });
    
    // Update presence every 30 seconds
    presenceUpdateInterval = setInterval(() => {
        if (isJoined && currentUser) {
            const updateData = {
                ...userPresenceData,
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

// Enhanced online users listener
function listenForOnlineUsers() {
    console.log("🔍 Starting to listen for online users...");
    
    const presenceRef = collection(db, "presence");
    
    onlineUsersListener = onSnapshot(presenceRef, (querySnapshot) => {
        console.log("📡 Received presence update, total docs:", querySnapshot.size);
        
        onlineUsers.clear();
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        
        let activeUsers = 0;
        
        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            
            if (userData.lastSeen && userData.lastSeen.toDate() > fiveMinutesAgo) {
                onlineUsers.add(userData.userId);
                activeUsers++;
            }
        });
        
        console.log("🎯 Total active users found:", activeUsers);
        updateOnlineCount();
        
    }, (error) => {
        console.error("❌ Error listening for online users:", error);
    });
}

// Enhanced online count update
function updateOnlineCount() {
    const peopleCountElement = document.getElementById("peopleCount");
    if (peopleCountElement) {
        const count = onlineUsers.size;
        peopleCountElement.textContent = `${count} people nearby`;
        console.log(`📊 Updated UI: ${count} people nearby`);
    }
}

// Mark user as offline
function markUserOffline() {
    if (!currentUser) return;
    
    console.log("📴 Marking user offline:", currentUsername);
    
    const userPresenceDoc = doc(db, "presence", currentUser.uid);
    setDoc(userPresenceDoc, {
        userId: currentUser.uid,
        username: currentUsername,
        location: currentUserLocation,
        age: currentUserAge,
        lastSeen: serverTimestamp(),
        isOnline: false
    }).then(() => {
        console.log("✅ User marked offline successfully");
    }).catch(error => {
        console.error("❌ Error marking user offline:", error);
    });
}

// Get user's current location
function getUserLocation() {
  return new Promise((resolve, reject) => {
    const statusDiv = document.getElementById('locationStatus');
    
    if (!navigator.geolocation) {
      statusDiv.textContent = "Geolocation is not supported by this browser";
      statusDiv.className = "error";
      reject("Geolocation not supported");
      return;
    }

    statusDiv.textContent = "Getting your location...";
    statusDiv.className = "";

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        userLatitude = position.coords.latitude;
        userLongitude = position.coords.longitude;
        
        try {
          const locationName = await getCityFromCoordinates(userLatitude, userLongitude);
          currentUserLocation = locationName || `${userLatitude.toFixed(2)}, ${userLongitude.toFixed(2)}`;
          
          statusDiv.textContent = `Location found: ${currentUserLocation}`;
          statusDiv.className = "success";
          
          document.getElementById('locationInput').value = currentUserLocation;
          resolve(currentUserLocation);
        } catch (error) {
          currentUserLocation = `${userLatitude.toFixed(2)}, ${userLongitude.toFixed(2)}`;
          statusDiv.textContent = `Location: ${currentUserLocation}`;
          statusDiv.className = "success";
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
        
        statusDiv.textContent = errorMessage;
        statusDiv.className = "error";
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
    
    // Switch views with enhanced animation
    const mainContainer = document.getElementById("mainContainer");
    
    mainContainer.classList.add("chat-active");
    joinView.classList.add("hidden");
    chatsView.classList.remove("hidden");
    document.body.classList.add("chat-active");
    
    // Update contact name with user info
    if (chatContactName) {
        chatContactName.textContent = `${username}'s Local Chat`;
    }
    
    // Apply mobile-specific styles
    if (window.innerWidth <= 480) {
        chatsView.style.position = 'fixed';
        chatsView.style.top = '0';
        chatsView.style.left = '0';
        chatsView.style.width = '100vw';
        chatsView.style.height = '100vh';
        chatsView.style.zIndex = '9999';
    }
    
    // Clear old messages and add welcome message
    messageList.innerHTML = "";
    addWelcomeMessage();
    
    console.log("Setting up enhanced mobile keyboard handling...");
    setupEnhancedMobileKeyboardFix();
    
    console.log("Starting to listen for messages...");
    listenForMessages();
    
    // Start online user tracking
    setTimeout(() => {
        trackUserPresence();
        listenForOnlineUsers();
        console.log("🚀 Online user tracking started!");
    }, 2000);
    
    console.log(`Successfully joined enhanced chat - Name: ${username}, Age: ${age}, Location: ${location}`);
  } catch (error) {
    console.error("Error joining chat:", error);
    isJoined = false;
    alert("Failed to join chat: " + error.message);
  }
}

// Add welcome message
function addWelcomeMessage() {
    const welcomeMsg = {
        user: "System",
        message: `Welcome ${currentUsername}! You're now connected to the local chat.`,
        timestamp: new Date(),
        isSystem: true
    };
    displayMessage(welcomeMsg);
}

// Enhanced send message function
async function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (!messageText || !currentUser || !isJoined) {
        return;
    }
    
    // Clear input immediately for better UX
    messageInput.value = "";
    
    // Create temporary message for instant display
    const tempMessage = {
        user: currentUsername,
        message: messageText,
        timestamp: new Date(),
        location: currentUserLocation,
        age: currentUserAge,
        userId: currentUser.uid,
        isTemp: true
    };
    
    displayMessage(tempMessage);
    smoothScrollToBottom();
    
    try {
        // Send to Firebase
        await addDoc(collection(db, "messages"), {
            user: currentUsername,
            message: messageText,
            timestamp: serverTimestamp(),
            location: currentUserLocation,
            age: currentUserAge,
            userId: currentUser.uid,
            latitude: userLatitude,
            longitude: userLongitude
        });
        
        console.log("✅ Message sent successfully");
        
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message");
        
        // Remove temporary message on error
        const tempMessages = document.querySelectorAll('[data-temp="true"]');
        tempMessages.forEach(msg => msg.remove());
    }
}

// Enhanced listen for messages
function listenForMessages() {
  const q = query(
    collection(db, "messages"), 
    orderBy("timestamp", "asc")
  );
  
  onSnapshot(q, (querySnapshot) => {
    const messageContainer = document.getElementById("messageList");
    
    // Clear messages but keep welcome message
    const welcomeMsg = messageContainer.querySelector('[data-welcome="true"]');
    messageContainer.innerHTML = "";
    if (welcomeMsg) {
        messageContainer.appendChild(welcomeMsg);
    }
    
    messageCount = 0;
    
    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      if (!messageData.isTemp) {
        displayMessage(messageData);
      }
    });
    
    setTimeout(() => smoothScrollToBottom(), 200);
  });
}

// Enhanced display message with improved styling
function displayMessage(messageData) {
  const messageContainer = document.getElementById("messageList");
  
  const isCurrentUser = messageData.user === currentUsername;
  const isSystem = messageData.isSystem || messageData.user === "System";
  
  const messageDiv = document.createElement("div");
  
  if (isSystem) {
    messageDiv.className = "message system";
    messageDiv.setAttribute('data-welcome', 'true');
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
      // Sent message (green bubble)
      messageDiv.innerHTML = `
        <div class="message-bubble">
          ${messageData.message}
          <div class="message-time">${timeString}</div>
        </div>
      `;
    } else {
      // Received message (white bubble)
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
  
  if (savedUsername && savedJoined === 'true') {
    console.log("Found existing session, auto-joining...");
    
    currentUsername = savedUsername;
    currentUserAge = parseInt(savedAge) || 0;
    currentUserLocation = savedLocation || "";
    
    setTimeout(() => {
      joinChat(savedUsername, savedAge, savedLocation);
    }, 500);
  }
}

// Enhanced logout function
function logout() {
  console.log("🚪 User logging out...");
  
  // Clean up presence tracking
  if (presenceUpdateInterval) {
    clearInterval(presenceUpdateInterval);
  }
  
  if (onlineUsersListener) {
    onlineUsersListener();
  }
  
  // Mark user as offline
  if (currentUser && isJoined) {
    markUserOffline();
  }
  
  // Reset UI
  chatsView.classList.add("hidden");
  joinView.classList.remove("hidden");
  document.body.classList.remove("chat-active");
  
  // Clear data
  localStorage.clear();
  isJoined = false;
  currentUsername = "";
  
  // Reset form
  if (usernameInput) usernameInput.value = "";
  if (ageInput) ageInput.value = "";
  if (locationInput) locationInput.value = "";
  
  console.log("✅ Logout completed");
}

// Enhanced theme toggle
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        if (themeIcon) themeIcon.textContent = '🌙';
    } else {
        body.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.textContent = '☀️';
    }
}

// Enhanced event listeners setup
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM loaded, setting up enhanced event listeners...");
  
  // Initialize theme
  if (themeIcon) themeIcon.textContent = '🌙';
  
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
  
  // Theme toggle handler
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }
  
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
    console.log("🔄 Page unloading, cleaning up presence...");
    
    if (currentUser && isJoined) {
        markUserOffline();
    }
    
    if (onlineUsersListener) {
        onlineUsersListener();
    }
    
    if (presenceUpdateInterval) {
        clearInterval(presenceUpdateInterval);
    }
});

// Prevent body scroll when keyboard opens on mobile
document.addEventListener('touchmove', function(e) {
    if (document.body.classList.contains('keyboard-active')) {
        e.preventDefault();
    }
}, { passive: false });
