// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

// Simple and reliable scroll to bottom function
function scrollToBottom() {
    const messageList = document.getElementById('messageList');
    if (messageList) {
        requestAnimationFrame(() => {
            messageList.scrollTop = messageList.scrollHeight;
        });
    }
}

// Enhanced mobile keyboard handling
function setupMobileKeyboardFix() {
    const messageInput = document.getElementById('messageInput');
    const chatInput = document.getElementById('chatInput');
    const messageList = document.getElementById('messageList');
    
    if (!messageInput || !chatInput || !messageList) return;

    // Simple keyboard detection using viewport height changes
    let initialViewportHeight = window.innerHeight;
    let isKeyboardOpen = false;

    function handleViewportChange() {
        const currentHeight = window.innerHeight;
        const heightDifference = initialViewportHeight - currentHeight;
        
        // If height decreased by more than 150px, keyboard is likely open
        if (heightDifference > 150 && !isKeyboardOpen) {
            isKeyboardOpen = true;
            // Add padding to prevent content from being hidden
            chatInput.style.paddingBottom = `${heightDifference + 20}px`;
            setTimeout(() => scrollToBottom(), 300);
        } 
        // If height is back to normal, keyboard is closed
        else if (heightDifference <= 150 && isKeyboardOpen) {
            isKeyboardOpen = false;
            chatInput.style.paddingBottom = 'max(16px, env(safe-area-inset-bottom))';
        }
    }

    // Listen for viewport changes
    window.addEventListener('resize', handleViewportChange);
    
    // Visual Viewport API support (better keyboard detection)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const viewport = window.visualViewport;
            const keyboardHeight = window.innerHeight - viewport.height;
            
            if (keyboardHeight > 150 && !isKeyboardOpen) {
                isKeyboardOpen = true;
                chatInput.style.paddingBottom = `${keyboardHeight + 20}px`;
                setTimeout(() => scrollToBottom(), 300);
            } else if (keyboardHeight <= 150 && isKeyboardOpen) {
                isKeyboardOpen = false;
                chatInput.style.paddingBottom = 'max(16px, env(safe-area-inset-bottom))';
            }
        });
    }

    // Scroll when input is focused
    messageInput.addEventListener('focus', () => {
        setTimeout(() => scrollToBottom(), 400);
    });

    // Scroll when typing
    messageInput.addEventListener('input', () => {
        if (isKeyboardOpen) {
            scrollToBottom();
        }
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

// Fixed join chat function
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
    
    // Update header info
    document.getElementById("userNameDisplay").textContent = username;
    document.getElementById("userAgeDisplay").textContent = age;
    document.getElementById("userLocationDisplay").textContent = location.length > 15 ? location.substring(0, 15) + '...' : location;
    
    console.log("Switching to chat view...");
    
    // Switch views - Simplified approach
    const mainContainer = document.getElementById("mainContainer");
    const joinView = document.getElementById("joinView");
    const chatsView = document.getElementById("chatsView");
    
    // Add chat-active class to hide header
    mainContainer.classList.add("chat-active");
    
    // Hide join view and show chat view
    joinView.classList.add("hidden");
    chatsView.classList.remove("hidden");
    
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
    
    console.log("Setting up mobile keyboard handling...");
    
    // Setup mobile keyboard handling
    setupMobileKeyboardFix();
    
    console.log("Starting to listen for messages...");
    
    // Start listening for messages
    listenForMessages();
    
    console.log(`Successfully joined chat - Name: ${username}, Age: ${age}, Location: ${location}`);
  } catch (error) {
    console.error("Error joining chat:", error);
    isJoined = false;
    alert("Failed to join chat: " + error.message);
  }
}

// Send message function
async function sendMessage() {
    const messageInput = document.getElementById("messageInput");
    const messageText = messageInput.value.trim();
    
    if (!messageText || !currentUser || !isJoined) {
        return;
    }
    
    try {
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
        
        messageInput.value = "";
        scrollToBottom();
        
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message");
    }
}

// Listen for messages
function listenForMessages() {
  const q = query(
    collection(db, "messages"), 
    orderBy("timestamp", "asc")
  );
  
  onSnapshot(q, (querySnapshot) => {
    const messageContainer = document.getElementById("messageList");
    messageContainer.innerHTML = "";
    messageCount = 0;
    
    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      displayMessage(messageData);
    });
    
    // Update message count
    document.getElementById("messageCount").textContent = `${messageCount} messages`;
    
    // Auto scroll to bottom
    scrollToBottom();
  });
}

// Display message
function displayMessage(messageData) {
  const messageContainer = document.getElementById("messageList");
  
  const isCurrentUser = messageData.user === currentUsername;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isCurrentUser ? 'current-user' : 'other-user'}`;
  
  let timeString = "Just now";
  if (messageData.timestamp) {
    timeString = messageData.timestamp.toDate().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  if (isCurrentUser) {
    messageDiv.innerHTML = `
      <div class="message-wrapper current-user-wrapper">
        <div class="message-content current-user-content">
          <div class="message-bubble current-user-bubble">
            ${messageData.message}
          </div>
          <div class="message-info current-user-info">
            <span class="timestamp">${timeString}</span>
          </div>
        </div>
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="message-wrapper other-user-wrapper">
        <div class="message-content other-user-content">
          <div class="message-header">
            <span class="username">${messageData.user}</span>
            ${messageData.age ? `<span class="user-age">${messageData.age}y</span>` : ''}
            <span class="timestamp">${timeString}</span>
          </div>
          <div class="message-bubble other-user-bubble">
            ${messageData.message}
          </div>
          ${messageData.location ? `<div class="message-location">📍 ${messageData.location}</div>` : ''}
        </div>
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

// Event listeners
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM loaded, setting up event listeners...");
  
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
  
  // Join chat button - Fixed
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
  
  // Send message button
  const sendButton = document.getElementById("sendButton");
  if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
  }
  
  // Message input handling
  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
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

// Logout function
window.logout = function() {
  localStorage.clear();
  isJoined = false;
  location.reload();
};
