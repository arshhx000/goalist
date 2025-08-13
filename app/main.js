// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Your Firebase configuration (replace with YOUR config from Step 4)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCOmLxxqPesNaBr4Z9fVIU6K2BLW6OsED0",
  authDomain: "https://gappkar.netlify.app",
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
  
  try {
    // Sign in anonymously
    await signInAnonymously(auth);
    currentUsername = username;
    
    // Hide join form, show chat
    document.getElementById("joinView").style.display = "none";
    document.getElementById("chatsView").style.display = "block";
    
    // Start listening for messages
    listenForMessages();
    
    console.log("Successfully joined chat as:", username);
  } catch (error) {
    console.error("Error joining chat:", error);
    alert("Failed to join chat. Please try again.");
  }
}
// Function to send a message
async function sendMessage() {
  const messageInput = document.getElementById("messageInput");
  const messageText = messageInput.value.trim();
  
  if (!messageText) {
    alert("Please enter a message");
    return;
  }
  
  if (!currentUser) {
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

// Function to display a message in the chat
function displayMessage(messageData) {
  const messageContainer = document.getElementById("messageList");
  
  // Create message element
  const messageDiv = document.createElement("div");
  messageDiv.className = "message-item p-3 border-b border-gray-200";
  
  // Format timestamp
  let timeString = "Just now";
  if (messageData.timestamp) {
    timeString = messageData.timestamp.toDate().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  messageDiv.innerHTML = `
    <div class="flex items-start space-x-3">
      <div class="flex-1">
        <div class="flex items-baseline space-x-2">
          <span class="font-medium text-gray-900">${messageData.user}</span>
          <span class="text-xs text-gray-500">${timeString}</span>
        </div>
        <p class="text-gray-700 mt-1">${messageData.message}</p>
        <span class="text-xs text-gray-400">${messageData.location}</span>
      </div>
    </div>
  `;
  
  messageContainer.appendChild(messageDiv);
}
// Wait for DOM to load, then add event listeners
document.addEventListener("DOMContentLoaded", function() {
  
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
        sendMessage();
      }
    });
  }
  
  // Username input Enter key
  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) {
    usernameInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        const username = usernameInput.value.trim();
        joinChat(username);
      }
    });
  }
});

