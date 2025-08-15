// --------------------------- Gappkar Chat – UPDATED & FIXED JS ---------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, addDoc, collection, doc, setDoc, onSnapshot, orderBy, query, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

/* ───────────────────────── Firebase config ───────────────────────── */
// 🚨 REMINDER: Make sure your Firestore Security Rules in the Firebase Console
// have been updated to allow writes to the `rooms/{roomId}/messages` collection!
const firebaseConfig = {
  apiKey: "AIzaSyCOmLxxqPesNaBr4Z9fVIU6K2BLW6OsED0",
  authDomain: "gappkar-v1-b3afe.firebaseapp.com",
  databaseURL: "https://gappkar-v1-b3afe-default-rtdb.firebaseio.com",
  projectId: "gappkar-v1-b3afe",
  storageBucket: "gappkar-v1-b3afe.appspot.com",
  messagingSenderId: "726018257415",
  appId: "1:726018257415:web:12142708abdf47952af0a2",
  measurementId: "G-EWK4436NRB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ───────────────────────── Global state ───────────────────────── */
let currentUser = null, currentUsername = "", currentUserAge = 0, currentUserLocation = "";
let userLatitude = null, userLongitude = null, isJoined = false, currentRoom = "global";
let messagesListener = null, presenceTimer = null, onlineListener = null;

/* ───────────────────────── DOM helpers ───────────────────────── */
const $ = id => document.getElementById(id);
const joinView = $("joinView"), chatsView = $("chatsView"), messageList = $("messageList");
const messageInput = $("messageInput"), sendButton = $("sendButton"), backButton = $("backButton");
const usernameInput = $("usernameInput"), ageInput = $("ageInput"), locationInput = $("locationInput");
const joinButton = $("joinButton"), getLocationBtn = $("getLocationBtn"), peopleCount = $("peopleCount");
const createRoomBtnH = $("createRoomBtn"), roomModal = $("roomModal"), roomModalClose = $("roomModalClose");
const roomKeyInput = $("roomKeyInput"), joinRoomBtn = $("joinRoomBtn"), createRoomBtnM = $("createRoomBtnModal");
const leaveRoomBtn = $("leaveRoomBtn"), roomIndicator = $("roomIndicator");
const roomMessagesRef = room => collection(db, "rooms", room, "messages");

/* ───────────────────────── UI utilities ───────────────────────── */
const timeStr = ts => {
  const d = ts?.toDate ? ts.toDate() : (ts || new Date());
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const a = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${a}`;
};

const scrollBottom = () => {
  if (messageList) {
    messageList.scrollTop = messageList.scrollHeight;
    // Enhanced mobile scrolling
    if (window.innerWidth <= 480 && document.body.classList.contains('keyboard-visible')) {
      setTimeout(() => {
        messageList.scrollTop = messageList.scrollHeight;
      }, 100);
    }
  }
};

const updateRoomUI = () => {
  if (!roomIndicator) return;
  roomIndicator.textContent = currentRoom === "global" ? "Global" : currentRoom;
  roomIndicator.style.background = currentRoom === "global" ? "var(--accent)" : "#28a745";
};

const addSystemMsg = txt => {
  const div = document.createElement("div");
  div.className = "message system";
  div.innerHTML = `<div class="message-bubble">${txt}</div>`;
  messageList.appendChild(div);
  scrollBottom();
};

/* ───────────────── Presence & Location ────────────────── */
function trackPresence() {
  if (!currentUser || !currentUsername) return;
  const ref = doc(db, "presence", currentUser.uid);
  const data = {
    userId: currentUser.uid, 
    username: currentUsername, 
    location: currentUserLocation,
    age: currentUserAge, 
    room: currentRoom, 
    lastSeen: serverTimestamp(), 
    isOnline: true
  };
  setDoc(ref, data, { merge: true });
  clearInterval(presenceTimer);
  presenceTimer = setInterval(() => setDoc(ref, { 
    room: currentRoom, 
    lastSeen: serverTimestamp() 
  }, { merge: true }), 30000);
}

function listenOnlineUsers() {
  onlineListener && onlineListener();
  onlineListener = onSnapshot(collection(db, "presence"), snap => {
    const fiveAgo = Date.now() - 5 * 60 * 1000;
    let roomCnt = 0;
    snap.forEach(doc => {
      const d = doc.data();
      if (d.lastSeen?.toDate && d.lastSeen.toDate().getTime() > fiveAgo && d.room === currentRoom) {
        roomCnt++;
      }
    });
    peopleCount.textContent = `${roomCnt} people ${currentRoom === "global" ? "nearby" : "in " + currentRoom}`;
  });
}

async function getUserLocation() {
  const statusDiv = $("locationStatus");
  if (!navigator.geolocation) {
    statusDiv.textContent = "Geolocation is not supported."; 
    statusDiv.className = "error"; 
    return;
  }
  
  statusDiv.textContent = "Getting your location..."; 
  statusDiv.className = "";
  
  try {
    const position = await new Promise((resolve, reject) => 
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
    );
    
    userLatitude = position.coords.latitude; 
    userLongitude = position.coords.longitude;
    
    const locationName = await (async (lat, lon) => { 
      try { 
        const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`); 
        return (await r.json()).city; 
      } catch (e) { 
        return null; 
      } 
    })(userLatitude, userLongitude);
    
    currentUserLocation = locationName || `${userLatitude.toFixed(2)}, ${userLongitude.toFixed(2)}`;
    statusDiv.textContent = `Location found: ${currentUserLocation}`; 
    statusDiv.className = "success";
    locationInput.value = currentUserLocation;
  } catch (error) {
    statusDiv.textContent = "Could not get location. Enter manually."; 
    statusDiv.className = "error";
  }
}

/* ───────────────────── Room helpers ────────────────────── */
function showModal() { 
  roomModal.classList.add("show"); 
}

function hideModal() { 
  roomModal.classList.remove("show"); 
  roomKeyInput.value = ""; 
}

async function joinRoom(key) {
  const k = key.trim().toLowerCase();
  if (!k) return alert("Enter a room key");
  if (k === currentRoom) return hideModal();
  
  messagesListener && messagesListener();
  currentRoom = k;
  localStorage.setItem("gappkar_current_room", currentRoom);
  updateRoomUI(); 
  messageList.innerHTML = "";
  addSystemMsg(`Joined room: ${currentRoom}`);
  listenMessages(); 
  trackPresence(); 
  hideModal();
}

function leaveRoom() {
  if (currentRoom === "global") return hideModal();
  
  messagesListener && messagesListener();
  currentRoom = "global";
  localStorage.removeItem("gappkar_current_room");
  updateRoomUI(); 
  messageList.innerHTML = "";
  addSystemMsg("Left room, back to global chat");
  listenMessages(); 
  trackPresence(); 
  hideModal();
}

/* ───────────────────── Messaging ───────────────────────── */
function displayMsg(d) {
  const mine = d.user === currentUsername;
  const div = document.createElement("div");
  div.className = `message ${mine ? "sent" : "received"}`;
  const time = timeStr(d.timestamp);
  
  div.innerHTML = mine
    ? `<div class="message-bubble">${d.message}<div class="message-time">${time}</div></div>`
    : `<div class="message-info"><div class="sender-name">${d.user}${d.age ? ` (${d.age})` : ""}</div><div class="message-bubble">${d.message}<div class="message-time">${time}</div></div>${d.location ? `<div class="message-location">📍 ${d.location}</div>` : ""}</div>`;
  
  messageList.appendChild(div);
}

function listenMessages() {
  messagesListener && messagesListener();
  const q = query(roomMessagesRef(currentRoom), orderBy("timestamp", "asc"));
  messagesListener = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const temp = messageList.querySelector('[data-temp="true"]');
        if (temp) temp.remove();
        displayMsg(change.doc.data());
      }
    });
    scrollBottom();
  });
}

// ✅ UPDATED & FIXED: sendMessage function with better error feedback
async function sendMessage() {
  const txt = messageInput.value.trim();
  if (!txt || !isJoined) return;
  
  messageInput.value = "";
  const tempId = `temp_${Date.now()}`;
  const div = document.createElement("div");
  div.className = "message sent";
  div.id = tempId;
  div.dataset.temp = "true"; // Mark as temporary
  div.innerHTML = `<div class="message-bubble">${txt}<div class="message-time" style="opacity: 0.5;">sending...</div></div>`;
  messageList.appendChild(div);
  scrollBottom();
  
  try {
    await addDoc(roomMessagesRef(currentRoom), {
      user: currentUsername, 
      message: txt, 
      timestamp: serverTimestamp(),
      location: currentUserLocation, 
      age: currentUserAge, 
      userId: currentUser.uid
    });
  } catch (e) {
    console.error("Send failed:", e);
    const failedNode = document.getElementById(tempId);
    if (failedNode) {
      failedNode.querySelector('.message-bubble').style.backgroundColor = '#d32f2f';
      failedNode.querySelector('.message-time').innerText = 'Failed to send!';
    }
  }
}

/* ─────────────────── Join/Logout Flow ──────────────────── */
async function joinChat(name, age, loc) {
  if (!name.trim()) return alert("Enter name");
  if (age < 13 || age > 99) return alert("Age 13-99 only");
  if (!loc.trim()) return alert("Enter location");
  if (isJoined) return;
  
  await signInAnonymously(auth);
  currentUsername = name.trim();
  currentUserAge = parseInt(age, 10);
  currentUserLocation = loc.trim();
  isJoined = true;
  
  const savedRoom = localStorage.getItem("gappkar_current_room");
  if (savedRoom) currentRoom = savedRoom;
  
  joinView.classList.add("hidden");
  chatsView.classList.remove("hidden");
  document.body.classList.add("chat-active");
  updateRoomUI();
  messageList.innerHTML = "";
  addSystemMsg(`Welcome ${currentUsername}!`);
  
  listenMessages(); 
  trackPresence(); 
  listenOnlineUsers();
  
  localStorage.setItem("gappkar_username", currentUsername);
  localStorage.setItem("gappkar_age", currentUserAge);
  localStorage.setItem("gappkar_location", currentUserLocation);
  localStorage.setItem("gappkar_joined", "true");
}

onAuthStateChanged(auth, u => currentUser = u || null);

async function logout() {
  presenceTimer && clearInterval(presenceTimer);
  onlineListener && onlineListener();
  messagesListener && messagesListener();
  
  if (currentUser) {
    try { 
      await deleteDoc(doc(db, "presence", currentUser.uid)); 
    } catch(e) { 
      console.error("Presence cleanup failed:", e) 
    }
  }
  
  try { await signOut(auth); } catch {}
  
  isJoined = false; 
  currentRoom = "global";
  localStorage.clear();
  chatsView.classList.add("hidden");
  joinView.classList.remove("hidden");
  document.body.classList.remove("chat-active");
}

/* ─────────────────── Event wiring ──────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("gappkar_joined") === "true") {
    joinChat(
      localStorage.getItem("gappkar_username") || "", 
      localStorage.getItem("gappkar_age") || 0, 
      localStorage.getItem("gappkar_location") || ""
    );
  }
  
  getLocationBtn.addEventListener("click", getUserLocation);
  joinButton.addEventListener("click", () => joinChat(usernameInput.value, ageInput.value, locationInput.value));
  sendButton.addEventListener("click", sendMessage);
  messageInput.addEventListener("keydown", e => { 
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      sendMessage(); 
    } 
  });
  backButton.addEventListener("click", logout);
  createRoomBtnH.addEventListener("click", showModal);
  roomModalClose.addEventListener("click", hideModal);
  joinRoomBtn.addEventListener("click", () => joinRoom(roomKeyInput.value));
  createRoomBtnM.addEventListener("click", () => joinRoom(roomKeyInput.value));
  leaveRoomBtn.addEventListener("click", leaveRoom);
  roomModal.addEventListener("click", e => { 
    if (e.target === roomModal) hideModal(); 
  });
});

// --- Theme Toggler Script ---
document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  
  function toggleTheme() {
    const body = document.body;
    if (body.getAttribute('data-theme') === 'dark') {
      body.removeAttribute('data-theme');
      if (themeIcon) themeIcon.textContent = '🌙';
    } else {
      body.setAttribute('data-theme', 'dark');
      if (themeIcon) themeIcon.textContent = '☀️';
    }
  }
  
  if (themeToggle) { 
    themeToggle.addEventListener('click', toggleTheme); 
  }
});

// ✅ ADDED: Mobile Keyboard Handling JavaScript
function setupMobileKeyboardHandling() {
  if (!('ontouchstart' in window)) return; // Not a mobile device
  
  const messageInput = document.getElementById('messageInput');
  const messageList = document.getElementById('messageList');
  const chatInput = document.getElementById('chatInput');
  let initialViewportHeight = window.innerHeight;
  
  function handleKeyboardShow() {
    document.body.classList.add('keyboard-visible');
    setTimeout(() => {
      if (messageList) {
        messageList.scrollTop = messageList.scrollHeight;
      }
    }, 300);
  }
  
  function handleKeyboardHide() {
    document.body.classList.remove('keyboard-visible');
  }
  
  // iOS handling
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    messageInput.addEventListener('focus', () => {
      setTimeout(handleKeyboardShow, 300);
    });
    
    messageInput.addEventListener('blur', () => {
      setTimeout(handleKeyboardHide, 100);
    });
    
    // Viewport height change detection for iOS
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight;
      if (currentHeight < initialViewportHeight * 0.7) {
        handleKeyboardShow();
      } else if (currentHeight > initialViewportHeight * 0.9) {
        handleKeyboardHide();
        initialViewportHeight = currentHeight;
      }
    });
  }
  
  // Android handling
  else {
    let lastHeight = window.innerHeight;
    
    const resizeObserver = new ResizeObserver(() => {
      const currentHeight = window.innerHeight;
      const heightDiff = lastHeight - currentHeight;
      
      if (heightDiff > 150) { // Keyboard likely opened
        handleKeyboardShow();
      } else if (heightDiff < -150) { // Keyboard likely closed
        handleKeyboardHide();
      }
      
      lastHeight = currentHeight;
    });
    
    resizeObserver.observe(document.body);
  }
}

// Initialize mobile keyboard handling when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMobileKeyboardHandling);
} else {
  setupMobileKeyboardHandling();
}
