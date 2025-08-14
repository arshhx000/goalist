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

// Fixed scroll to bottom function
function scrollToBottom() {
    const messageList = document.getElementById('messageList');
    if (messageList) {
        setTimeout(() => {
            messageList.scrollTop = messageList.scrollHeight;
        }, 100);
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

// Enhanced join chat function with proper desktop/mobile handling
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
    
    // Update header info
    document.getElementById("userNameDisplay").textContent = username;
    document.getElementById("userAgeDisplay").textContent = age;
    document.getElementById("userLocationDisplay").textContent = location.length > 15 ? location.substring(0, 15) + '...' : location;
    
    // Hide app header
    const appHeader = document.querySelector('.app-header');
    if (appHeader) {
        appHeader.style.display = 'none';
    }
    
    // Switch views with proper desktop/mobile handling
    const joinView = document.getElementById("joinView");
    const chatsView = document.getElementById("chatsView");
    const mainContainer = document.querySelector('.main-container');
    
    joinView.classList.add("hidden");
    chatsView.classList.remove("hidden");
    
    // Apply mobile-specific styles only on mobile
    if (window.innerWidth <= 480) {
        chatsView.style.position = 'fixed';
        chatsView.style.top = '0';
        chatsView.style.left = '0';
        chatsView.style.width = '100vw';
        chatsView.style.height = '100vh';
        chatsView.style.zIndex = '9999';
        mainContainer.style.borderRadius = '0';
        document.body.style.overflow = 'hidden';
    } else {
        // Desktop-specific styling
        chatsView.style.position = 'relative';
        chatsView.style.top = 'auto';
        chatsView.style.left = 'auto';
        chatsView.style.width = '100%';
        chatsView.style.height = 'auto';
        chatsView.style.minHeight = '500px';
        chatsView.style.maxHeight = '600px';
        chatsView.style.zIndex = 'auto';
        document.body.style.overflow = 'auto';
    }
    
    // Start listening for messages
    listenForMessages();
    
    console.log(`Successfully joined chat - Name: ${username}, Age: ${age}, Location: ${location}`);
  } catch (error) {
    console.error("Error joining chat:", error);
    isJoined = false;
    alert("Failed to join chat. Please try again.");
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
        
        // Auto scroll after sending
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

// Updated checkExistingSession for desktop compatibility
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
      isJoined = true;
      
      // Hide app header
      const appHeader = document.querySelector('.app-header');
      if (appHeader) {
          appHeader.style.display = 'none';
      }
      
      // Update user info
      document.getElementById("userNameDisplay").textContent = savedUsername;
      document.getElementById("userAgeDisplay").textContent = savedAge;
      document.getElementById("userLocationDisplay").textContent = savedLocation.length > 15 ? savedLocation.substring(0, 15) + '...' : savedLocation;
      
      // Switch views
      document.getElementById("joinView").classList.add("hidden");
      document.getElementById("chatsView").classList.remove("hidden");
      
      // Apply appropriate styles based on screen size
      const chatsView = document.getElementById("chatsView");
      const mainContainer = document.querySelector('.main-container');
      
      if (window.innerWidth <= 480) {
          // Mobile styles
          chatsView.style.position = 'fixed';
          chatsView.style.top = '0';
          chatsView.style.left = '0';
          chatsView.style.width = '100vw';
          chatsView.style.height = '100vh';
          chatsView.style.zIndex = '9999';
          mainContainer.style.borderRadius = '0';
          document.body.style.overflow = 'hidden';
      } else {
          // Desktop styles
          chatsView.style.position = 'relative';
          chatsView.style.top = 'auto';
          chatsView.style.left = 'auto';
          chatsView.style.width = '100%';
          chatsView.style.height = 'auto';
          chatsView.style.minHeight = '500px';
          chatsView.style.maxHeight = '600px';
          chatsView.style.zIndex = 'auto';
          document.body.style.overflow = 'auto';
      }
      
      listenForMessages();
    }, 500);
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
  
  // Message input handling
  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Focus handling for mobile
    messageInput.addEventListener('focus', () => {
        setTimeout(() => {
            scrollToBottom();
        }, 300);
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

// Logout function
window.logout = function() {
  localStorage.clear();
  isJoined = false;
  location.reload();
};

// Handle window resize for desktop/mobile switching
window.addEventListener('resize', () => {
    const chatsView = document.getElementById('chatsView');
    const mainContainer = document.querySelector('.main-container');
    
    if (!chatsView.classList.contains('hidden')) {
        if (window.innerWidth <= 480) {
            // Switch to mobile layout
            chatsView.style.position = 'fixed';
            chatsView.style.top = '0';
            chatsView.style.left = '0';
            chatsView.style.width = '100vw';
            chatsView.style.height = '100vh';
            chatsView.style.zIndex = '9999';
            mainContainer.style.borderRadius = '0';
            document.body.style.overflow = 'hidden';
        } else {
            // Switch to desktop layout
            chatsView.style.position = 'relative';
            chatsView.style.top = 'auto';
            chatsView.style.left = 'auto';
            chatsView.style.width = '100%';
            chatsView.style.height = 'auto';
            chatsView.style.minHeight = '500px';
            chatsView.style.maxHeight = '600px';
            chatsView.style.zIndex = 'auto';
            document.body.style.overflow = 'auto';
        }
        
        setTimeout(() => scrollToBottom(), 100);
    }
});
