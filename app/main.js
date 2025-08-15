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
            
            // Adjust layout for mobile
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
    
    // Set/update user presence document
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

// FIXED: Enhanced online count update
function updateOnlineCount() {
    const peopleCountElement = document.getElementById("peopleCount");
    if (peopleCountElement) {
        const count = onlineUsers.size;
        peopleCountElement.textContent = `${count} people nearby`;
        console.log(`📊 Updated UI: ${count} people nearby`);
    } else {
        console.error("❌ Could not find peopleCount element");
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

// FIXED: Enhanced join chat function
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
    
    console.log("Switching to enhanced chat view...");
    
    // Switch views
    const mainContainer = document.getElementById("mainContainer");
    const joinView = document.getElementById("joinView");
    const chatsView = document.getElementById("chatsView");
    
    // Add chat-active class to hide header
    mainContainer.classList.add("chat-active");
    
    // Hide join view and show chat view
    joinView.classList.add("hidden");
    chatsView.classList.remove("hidden");
    
    // FIXED: Update contact name with user info
    const contactNameElement = document.getElementById("contactName");
    if (contactNameElement) {
        contactNameElement.textContent = `${username}'s Chat`;
    }
    
    // Apply mobile-specific styles if needed
    if (window.innerWidth <= 480) {
        document.body.classList.add('chat-active');
        chatsView.style.position = 'fixed';
        chatsView.style.top = '0';
        chatsView.style.left = '0';
        chatsView.style.width = '100vw';
        chatsView.style.height = '100vh';
        chatsView.style.zIndex = '9999';
    }
    
    console.log("Setting up enhanced mobile keyboard handling...");
    
    // Setup enhanced mobile keyboard handling
    setupEnhancedMobileKeyboardFix();
    
    console.log("Starting to listen for messages...");
    
    // Start listening for messages
    listenForMessages();
    
    // Start online user tracking with delay
    console.log("⏳ Starting online user tracking in 2 seconds...");
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

// Enhanced send message function with instant UI update
async function sendMessage() {
    const messageInput = document.getElementById("messageInput");
    const messageText = messageInput.value.trim();
    
    if (!messageText || !currentUser || !isJoined) {
        return;
    }
    
    // Clear input immediately for better UX
    messageInput.value = "";
    
    // Create temporary message object for instant display
    const tempMessage = {
        user: currentUsername,
        message: messageText,
        timestamp: new Date(),
        location: currentUserLocation,
        age: currentUserAge,
        userId: currentUser.uid,
        isTemp: true
    };
    
    // Display message instantly
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
    
    // Clear only non-temporary messages
    const tempMessages = messageContainer.querySelectorAll('[data-temp="true"]');
    messageContainer.innerHTML = "";
    
    // Re-add temporary messages
    tempMessages.forEach(tempMsg => {
        messageContainer.appendChild(tempMsg);
    });
    
    messageCount = 0;
    
    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      
      // Skip if this is a temporary message we already displayed
      if (!messageData.isTemp) {
        displayMessage(messageData);
      }
    });
    
    // Auto scroll to bottom
    setTimeout(() => smoothScrollToBottom(), 200);
  });
}

// FIXED: Enhanced display message with bubble styling
function displayMessage(messageData) {
  const messageContainer = document.getElementById("messageList");
  
  const isCurrentUser = messageData.user === currentUsername;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
  
  // Add temporary message attribute if needed
  if (messageData.isTemp) {
    messageDiv.setAttribute('data-temp', 'true');
  }
  
  let timeString = "Just now";
  if (messageData.timestamp) {
    const timestamp = messageData.timestamp.toDate ? messageData.timestamp.toDate() : messageData.timestamp;
    timeString = timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
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

// Enhanced event listeners
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM loaded, setting up enhanced event listeners...");
  
  checkExistingSession();
  
  // Get location button
  const getLocationBtn = document.getElementById("getLocationBtn");
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
  const joinButton = document.getElementById("joinButton");
  if (joinButton) {
    joinButton.addEventListener("click", function() {
      console.log("Join button clicked");
      const username = document.getElementById("usernameInput").value.trim();
      const age = document.getElementById("ageInput").value;
      const location = document.getElementById("locationInput").value.trim();
      
      console.log("Form values:", { username, age, location });
      joinChat(username, age, location);
    });
  }
  
  // Enhanced send message button
  const sendButton = document.getElementById("sendButton");
  if (sendButton) {
    sendButton.addEventListener("click", function(e) {
      e.preventDefault();
      sendMessage();
    });
  }
  
  // Enhanced message input handling
  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Auto-resize textarea (if needed)
    messageInput.addEventListener("input", function() {
        this.style.height = "auto";
        this.style.height = Math.min(this.scrollHeight, 120) + "px";
    });
  }
  
  // Form navigation with Enter key
  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) {
    usernameInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("ageInput").focus();
      }
    });
  }

  const ageInput = document.getElementById("ageInput");
  if (ageInput) {
    ageInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("locationInput").focus();
      }
    });
  }

  const locationInput = document.getElementById("locationInput");
  if (locationInput) {
    locationInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("joinButton").click();
      }
    });
  }
});

// Enhanced logout function
window.logout = function() {
  console.log("🚪 User logging out...");
  
  // Clean up presence tracking
  if (presenceUpdateInterval) {
    clearInterval(presenceUpdateInterval);
    console.log("✅ Cleared presence update interval");
  }
  
  if (onlineUsersListener) {
    onlineUsersListener();
    console.log("✅ Removed online users listener");
  }
  
  // Mark user as offline before leaving
  if (currentUser && isJoined) {
    markUserOffline();
    setTimeout(() => {
      localStorage.clear();
      isJoined = false;
      location.reload();
    }, 1000);
  } else {
    localStorage.clear();
    isJoined = false;
    location.reload();
  }
};

// Enhanced cleanup on page unload
window.addEventListener('beforeunload', () => {
    console.log("🔄 Page unloading, cleaning up presence...");
    
    if (currentUser && isJoined) {
        markUserOffline();
    }
    
    // Cleanup listeners
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
