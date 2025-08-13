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
let isJoined = false; // Prevent multiple joins

// Auto-login user when page loads
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("User signed in:", user.uid);
  } else {
    console.log("User signed out");
  }
});

// Function to join chat with username
async function joinChat(username) {
  if (!username.trim()) {
    alert("Please enter a username");
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
    isJoined = true;
    
    // Store in localStorage to persist across sessions
    localStorage.setItem('gappkar_username', username);
    localStorage.setItem('gappkar_joined', 'true');
    
    // Update user display
    document.getElementById("userNameDisplay").textContent = username;
    
    // Hide join form, show chat with proper mobile handling
    const joinView = document.getElementById("joinView");
    const chatsView = document.getElementById("chatsView");
    
    joinView.classList.add("hidden");
    chatsView.classList.remove("hidden");
    
    // Force mobile layout update
    setTimeout(() => {
      chatsView.style.display = "flex";
      window.scrollTo(0, 0);
    }, 100);
    
    // Start listening for messages
    listenForMessages();
    
    console.log("Successfully joined chat as:", username);
  } catch (error) {
    console.error("Error joining chat:", error);
    isJoined = false;
    alert("Failed to join chat. Please try again.");
  }
}

// Function to send a message
async function sendMessage() {
  const messageInput = document.getElementById("messageInput");
  const messageText = messageInput.value.trim();
  
  if (!messageText) {
    return; // Don't show alert for empty messages
  }
  
  if (!currentUser || !isJoined) {
    alert("Please join chat first");
    return;
  }
  
  try {
    // Add message to Firestore
    await addDoc(collection(db, "messages"), {
      user: currentUsername,
      message: messageText,
      timestamp: serverTimestamp(),
      location: "Mangalagiri, Andhra Pradesh",
      userId: currentUser.uid
    });
    
    // Clear input field
    messageInput.value = "";
    console.log("Message sent successfully");
    
  } catch (error) {
    console.error("Error sending message:", error);
    alert("Failed to send message");
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
    messageContainer.innerHTML = ""; // Clear existing messages
    
    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      displayMessage(messageData);
    });
    
    // Auto-scroll to bottom
    messageContainer.scrollTop = messageContainer.scrollHeight;
  });
}

// Function to display a message in the chat with user differentiation
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
            <span class="timestamp">${timeString}</span>
          </div>
          <div class="message-bubble other-user-bubble">
            ${messageData.message}
          </div>
        </div>
      </div>
    `;
  }
  
  messageContainer.appendChild(messageDiv);
}

// Check if user already joined on page load
function checkExistingSession() {
  const savedUsername = localStorage.getItem('gappkar_username');
  const savedJoined = localStorage.getItem('gappkar_joined');
  
  if (savedUsername && savedJoined === 'true') {
    // Auto-rejoin with saved username
    setTimeout(() => {
      joinChat(savedUsername);
    }, 1000);
  }
}

// Wait for DOM to load, then add event listeners
document.addEventListener("DOMContentLoaded", function() {
  
  // Check existing session
  checkExistingSession();
  
  // Join chat button
  const joinButton = document.getElementById("joinButton");
  if (joinButton) {
    joinButton.addEventListener("click", function() {
      const usernameInput = document.getElementById("usernameInput");
      const username = usernameInput.value.trim();
      joinChat(username);
    });
  }
  
  // Send message button
  const sendButton = document.getElementById("sendButton");
  if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
  }
  
  // Send message on Enter key
  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  // Username input Enter key
  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) {
    usernameInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const username = usernameInput.value.trim();
        joinChat(username);
      }
    });
  }
});

// Add logout function for testing
window.logout = function() {
  localStorage.removeItem('gappkar_username');
  localStorage.removeItem('gappkar_joined');
  isJoined = false;
  location.reload();
};
