// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
            chatInput.style.paddingBottom =
