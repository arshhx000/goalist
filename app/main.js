// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Your REAL Firebase configuration
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
let keyboardHeight = 0;
let isKeyboardOpen = false;
let messageCount = 0;

// Calculate age from date of birth
function calculateAge(dobString) {
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
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
        
        // Try to get city name from coordinates
        try {
          const locationName = await getCityFromCoordinates(userLatitude, userLongitude);
          currentUserLocation = locationName || `${userLatitude.toFixed(2)}, ${userLongitude.toFixed(2)}`;
          
          statusDiv.textContent = `Location found: ${currentUserLocation}`;
          statusDiv.className = "success";
          
          // Update location input field
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

// Keyboard and scroll management
function setupKeyboardDetection() {
    const chatContainer = document.getElementById('chatContainer');
    const chatInput = document.getElementById('chatInput');
    
    // Visual Viewport API for better keyboard detection
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const viewport = window.visualViewport;
            const isKeyboardVisible = viewport.height < window.innerHeight * 0.75;
            
            if (isKeyboardVisible !== isKeyboardOpen) {
                isKeyboardOpen = isKeyboardVisible;
                keyboardHeight = window.innerHeight - viewport.height;
                
                if (isKeyboardOpen) {
                    chatContainer.classList.add('keyboard-open');
                    chatInput.classList.add('keyboard-open');
                    chatContainer.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
                    
                    // Auto-scroll to bottom when keyboard opens
                    setTimeout(() => {
                        scrollToBottom(true);
                    }, 300);
                } else {
                    chatContainer.classList.remove('keyboard-open');
                    chatInput.classList.remove('keyboard-open');
                }
            }
        });
    } else {
        // Fallback for browsers without Visual Viewport API
        let initialViewportHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            if (heightDifference > 150) { // Keyboard likely open
                if (!isKeyboardOpen) {
                    isKeyboardOpen = true;
                    keyboardHeight = heightDifference;
                    chatContainer.classList.add('keyboard-open');
                    chatInput.classList.add('keyboard-open');
                    setTimeout(() => scrollToBottom(true), 300);
                }
            } else { // Keyboard likely closed
                if (isKeyboardOpen) {
                    isKeyboardOpen = false;
                    chatContainer.classList.remove('keyboard-open');
                    chatInput.classList.remove('keyboard-open');
                }
            }
        });
    }
}

// Enhanced scroll to bottom function
function scrollToBottom(smooth = false) {
    const messageList = document.getElementById('messageList');
    if (messageList) {
        if (smooth) {
            messageList.scrollTo({
                top: messageList.scrollHeight,
                behavior: 'smooth'
            });
        } else {
            messageList.scrollTop = messageList.scrollHeight;
        }
    }
}

// Auto-scroll hook for new messages
function setupAutoScroll() {
    const messageList = document.getElementById('messageList');
    let shouldAutoScroll = true;
    
    // Check if user is near bottom
    messageList.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = messageList;
        shouldAutoScroll = scrollTop + clientHeight >= scrollHeight - 100;
    });
    
    // Auto-scroll when new messages arrive (if user is near bottom)
    const observer = new MutationObserver(() => {
        if (shouldAutoScroll) {
            setTimeout(() => scrollToBottom(true), 100);
        }
    });
    
    observer.observe(messageList, { childList: true });
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

// Enhanced join chat function with location and age
async function joinChat(username, dob, location) {
  if (!username.trim()) {
    alert("Please enter your name");
    return;
  }
  
  if (!dob) {
    alert("Please enter your date of birth");
    return;
  }
  
  const age = calculateAge(dob);
  if (age < 13) {
    alert("You must be at least 13 years old to use this chat");
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
    // Sign in anonymously
    await signInAnonymously(auth);
    currentUsername = username;
    currentUserAge = age;
    currentUserLocation = location;
    isJoined = true;
    
    // Store in localStorage
    localStorage.setItem('gappkar_username', username);
    localStorage.setItem('gappkar_age', age);
    localStorage.setItem('gappkar_location', location);
    localStorage.setItem('gappkar_dob', dob);
    localStorage.setItem('gappkar_joined', 'true');
    
    // Update enhanced header info
    document.getElementById("userNameDisplay").textContent = username;
    document.getElementById("userAgeDisplay").textContent = `${age}`;
    document.getElementById("userLocationDisplay").textContent = currentUserLocation;
    
    // Hide join form, show chat
    const joinView = document.getElementById("joinView");
    const chatsView = document.getElementById("chatsView");
    
    joinView.classList.add("hidden");
    chatsView.classList.remove("hidden");
    
    // Setup keyboard and scroll detection
    setupKeyboardDetection();
    setupAutoScroll();
    
    // Force mobile layout update
    setTimeout(() => {
      chatsView.style.display = "flex";
      window.scrollTo(0, 0);
    }, 100);
    
    // Start listening for messages
    listenForMessages();
    
    console.log(`Successfully joined chat - Name: ${username}, Age: ${age}, Location: ${location}`);
  } catch (error) {
    console.error("Error joining chat:", error);
    isJoined = false;
    alert("Failed to join chat. Please try again.");
  }
}

// Enhanced send message function with auto-scroll
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
        messageCount++;
        
        // Update message count in header
        document.getElementById("messageCount").textContent = `${messageCount} messages`;
        
        // Force scroll to bottom after sending
        setTimeout(() => scrollToBottom(true), 200);
        
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

// Function to listen for new messages in real-time
function listenForMessages() {
  const q = query(
    collection(db, "messages"), 
    orderBy("timestamp", "asc")
  );
  
  onSnapshot(q, (querySnapshot) => {
    const messageContainer = document.getElementById("messageList");
    messageContainer.innerHTML = "";
    
    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      displayMessage(messageData);
    });
    
    // Auto-scroll to bottom
    messageContainer.scrollTop = messageContainer.scrollHeight;
  });
}

// Enhanced message display with age info and count tracking
function displayMessage(messageData) {
  const messageContainer = document.getElementById("messageList");
  
  // Check if this message is from current user
  const isCurrentUser = messageData.user === currentUsername;
  
  // Create message element
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isCurrentUser ? 'current-user' : 'other-user'}`;
  
  // Format timestamp
  let timeString = "Just now";
  if (messageData.timestamp) {
    timeString = messageData.timestamp.toDate().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Different layout for current user vs others
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
  
  // Update message count
  messageCount++;
  document.getElementById("messageCount").textContent = `${messageCount} messages`;
}

// Check existing session
function checkExistingSession() {
  const savedUsername = localStorage.getItem('gappkar_username');
  const savedAge = localStorage.getItem('gappkar_age');
  const savedLocation = localStorage.getItem('gappkar_location');
  const savedJoined = localStorage.getItem('gappkar_joined');
  
  if (savedUsername && savedJoined === 'true') {
    currentUsername = savedUsername;
    currentUserAge = parseInt(savedAge) || 0;
    currentUserLocation = savedLocation || "";
    
    setTimeout(() => {
      // Auto-rejoin with saved data
      isJoined = true;
      document.getElementById("userNameDisplay").textContent = savedUsername;
      document.getElementById("userAgeDisplay").textContent = `${savedAge}`;
      document.getElementById("userLocationDisplay").textContent = savedLocation;
      document.getElementById("joinView").classList.add("hidden");
      document.getElementById("chatsView").classList.remove("hidden");
      document.getElementById("chatsView").style.display = "flex";
      setupKeyboardDetection();
      setupAutoScroll();
      listenForMessages();
    }, 1000);
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", function() {
  
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
      const username = document.getElementById("usernameInput").value.trim();
      const dob = document.getElementById("dobInput").value;
      const location = document.getElementById("locationInput").value.trim();
      
      joinChat(username, dob, location);
    });
  }
  
  // Send message button
  const sendButton = document.getElementById("sendButton");
  if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
  }
  
  // Add focus handling for input
  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.addEventListener('focus', () => {
        // Small delay to ensure keyboard is fully opened
        setTimeout(() => {
            if (isKeyboardOpen) {
                scrollToBottom(true);
            }
        }, 400);
    });
    
    // Handle Enter key with keyboard awareness
    messageInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
            // Keep focus and scroll after sending
            setTimeout(() => {
                this.focus();
                scrollToBottom(true);
            }, 100);
        }
    });
  }
  
  // Username input Enter key
  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) {
    usernameInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("dobInput").focus();
      }
    });
  }
});

// Add logout function
window.logout = function() {
  localStorage.clear();
  isJoined = false;
  location.reload();
};
