// ---------------------------  Gappkar Chat – UPDATED JS  ---------------------------
// Stores messages in   rooms/{roomId}/messages   so NO composite index is required.
// Fixes storageBucket typo and rewires every query & listener accordingly.
// Copy-replace your old <script type="module">…</script> block with THIS code.
// ----------------------------------------------------------------------------------

import { initializeApp }          from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth,
         signInAnonymously,
         onAuthStateChanged,
         signOut                 } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore,
         addDoc,
         collection,
         doc,
         setDoc,
         onSnapshot,
         orderBy,
         query,
         serverTimestamp         } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

/* ─────────────────────────  Firebase config  ───────────────────────── */
const firebaseConfig = {
  apiKey            : "AIzaSyCOmLxxqPesNaBr4Z9fVIU6K2BLW6OsED0",
  authDomain        : "gappkar-v1-b3afe.firebaseapp.com",
  databaseURL       : "https://gappkar-v1-b3afe-default-rtdb.firebaseio.com",
  projectId         : "gappkar-v1-b3afe",
  storageBucket     : "gappkar-v1-b3afe.appspot.com",      // ← fixed
  messagingSenderId : "726018257415",
  appId             : "1:726018257415:web:12142708abdf47952af0a2",
  measurementId     : "G-EWK4436NRB"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

/* ─────────────────────────  Global state  ───────────────────────── */
let currentUser         = null;
let currentUsername     = "";
let currentUserAge      = 0;
let currentUserLocation = "";
let userLatitude        = null;
let userLongitude       = null;
let isJoined            = false;

let currentRoom      = "global";
let messagesListener = null;
let presenceTimer    = null;
let onlineListener   = null;

/* ─────────────────────────  DOM helpers  ───────────────────────── */
const $ = id => document.getElementById(id);

const joinView       = $("joinView");
const chatsView      = $("chatsView");
const messageList    = $("messageList");
const messageInput   = $("messageInput");
const sendButton     = $("sendButton");
const backButton     = $("backButton");

const usernameInput  = $("usernameInput");
const ageInput       = $("ageInput");
const locationInput  = $("locationInput");
const joinButton     = $("joinButton");

const createRoomBtnH = $("createRoomBtn");
const roomModal      = $("roomModal");
const roomModalClose = $("roomModalClose");
const roomKeyInput   = $("roomKeyInput");
const joinRoomBtn    = $("joinRoomBtn");
const createRoomBtnM = $("createRoomBtnModal");
const leaveRoomBtn   = $("leaveRoomBtn");
const roomIndicator  = $("roomIndicator");
const peopleCount    = $("peopleCount");

/* ─────────────────────────  Firestore paths  ───────────────────────── */
const roomMessagesRef = room => collection(db, "rooms", room, "messages");

/* ─────────────────────────  UI utilities  ───────────────────────── */
const timeStr = ts => {
  const d = ts?.toDate ? ts.toDate() : (ts || new Date());
  let h   = d.getHours();
  const m = d.getMinutes().toString().padStart(2,"0");
  const a = h >= 12 ? "PM" : "AM";
  h       = h % 12 || 12;
  return `${h}:${m} ${a}`;
};

const scrollBottom = () =>
  messageList && (messageList.scrollTop = messageList.scrollHeight);

const updateRoomUI = () => {
  if (!roomIndicator) return;
  if (currentRoom === "global") {
    roomIndicator.textContent = "Global";
    roomIndicator.style.background = "var(--accent)";
  } else {
    roomIndicator.textContent = currentRoom;
    roomIndicator.style.background = "#28a745";
  }
};

const addSystemMsg = txt => {
  const div = document.createElement("div");
  div.className = "message system";
  div.dataset.system = "true";
  div.innerHTML = `<div class="message-bubble">${txt}</div>`;
  messageList.appendChild(div);
  scrollBottom();
};

/* ─────────────────────────  Presence tracking  ───────────────────────── */
function trackPresence() {
  if (!currentUser || !currentUsername) return;
  const ref = doc(db, "presence", currentUser.uid);
  const data = {
    userId   : currentUser.uid,
    username : currentUsername,
    location : currentUserLocation,
    age      : currentUserAge,
    room     : currentRoom,
    lastSeen : serverTimestamp(),
    isOnline : true,
    joinedAt : serverTimestamp()
  };
  setDoc(ref, data);
  clearInterval(presenceTimer);
  presenceTimer = setInterval(() =>
    setDoc(ref, { ...data, room: currentRoom, lastSeen: serverTimestamp() }),
    30_000);
}

function listenOnlineUsers() {
  onlineListener && onlineListener();
  onlineListener = onSnapshot(collection(db,"presence"), snap => {
    const fiveAgo = Date.now() - 5*60*1000;
    let roomCnt = 0;
    snap.forEach(doc => {
      const d = doc.data();
      if (d.lastSeen?.toDate && d.lastSeen.toDate().getTime() > fiveAgo &&
          d.room === currentRoom) roomCnt++;
    });
    peopleCount.textContent =
      `${roomCnt} people ${currentRoom==="global" ? "nearby" : "in "+currentRoom}`;
  });
}

/* ─────────────────────────  Room helpers  ───────────────────────── */
function showModal()  { roomModal.classList.add("show");  }
function hideModal()  { roomModal.classList.remove("show"); roomKeyInput.value=""; }

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

/* ─────────────────────────  Messaging  ───────────────────────── */
function displayMsg(d) {
  const mine   = d.user === currentUsername;
  const sys    = d.user === "System" || d.isSystem;
  const div    = document.createElement("div");

  if (sys) {
    div.className = "message system";
    div.dataset.system = "true";
    div.innerHTML = `<div class="message-bubble">${d.message}</div>`;
  } else {
    div.className = `message ${mine ? "sent" : "received"}`;
    if (d.isTemp) div.dataset.temp = "true";
    const time = timeStr(d.timestamp);
    div.innerHTML = mine
      ? `<div class="message-bubble">${d.message}<div class="message-time">${time}</div></div>`
      : `<div class="message-info">
           <div class="sender-name">${d.user}${d.age ? ` (${d.age})`: ""}</div>
           <div class="message-bubble">${d.message}<div class="message-time">${time}</div></div>
           ${d.location ? `<div class="message-location">📍 ${d.location}</div>` : ""}
         </div>`;
  }
  messageList.appendChild(div);
}

function listenMessages() {
  messagesListener && messagesListener();
  messagesListener = onSnapshot(
    query(roomMessagesRef(currentRoom), orderBy("timestamp","asc")),
    snap => {
      messageList.querySelectorAll("[data-temp]").forEach(n=>n.remove());
      snap.forEach(doc => displayMsg(doc.data()));
      scrollBottom();
    });
}

async function sendMessage() {
  const txt = messageInput.value.trim();
  if (!txt || !isJoined) return;
  messageInput.value = "";

  // optimistic render
  displayMsg({ user: currentUsername, message: txt, timestamp: new Date(), isTemp:true });

  await addDoc(roomMessagesRef(currentRoom), {
    user      : currentUsername,
    message   : txt,
    timestamp : serverTimestamp(),
    location  : currentUserLocation,
    age       : currentUserAge,
    userId    : currentUser.uid,
    latitude  : userLatitude,
    longitude : userLongitude
  });
}

/* ─────────────────────────  Join chat  ───────────────────────── */
async function joinChat(name, age, loc) {
  if (!name.trim())     return alert("Enter name");
  if (age<13||age>99)   return alert("Age 13-99 only");
  if (!loc.trim())      return alert("Enter location");
  if (isJoined)         return;

  await signInAnonymously(auth);

  currentUsername     = name.trim();
  currentUserAge      = parseInt(age,10);
  currentUserLocation = loc.trim();
  isJoined            = true;

  // restore room if any
  const savedRoom = localStorage.getItem("gappkar_current_room");
  if (savedRoom) currentRoom = savedRoom;

  // switch views
  joinView.classList.add("hidden");
  chatsView.classList.remove("hidden");
  document.body.classList.add("chat-active");
  updateRoomUI();

  messageList.innerHTML = "";
  addSystemMsg(`Welcome ${currentUsername}!`);
  listenMessages();
  setTimeout(()=>{ trackPresence(); listenOnlineUsers(); },1500);

  // persist
  localStorage.setItem("gappkar_username" , currentUsername);
  localStorage.setItem("gappkar_age"      , currentUserAge);
  localStorage.setItem("gappkar_location" , currentUserLocation);
  localStorage.setItem("gappkar_joined"   , "true");
}

/* ─────────────────────────  Auth state  ───────────────────────── */
onAuthStateChanged(auth, u => currentUser = u || null);

/* ─────────────────────────  Logout  ───────────────────────── */
async function logout() {
  presenceTimer && clearInterval(presenceTimer);
  onlineListener && onlineListener();
  messagesListener && messagesListener();

  try { await signOut(auth); } catch {}

  isJoined       = false;
  currentRoom    = "global";
  localStorage.clear();

  chatsView.classList.add("hidden");
  joinView.classList.remove("hidden");
  document.body.classList.remove("chat-active");
}

/* ─────────────────────────  Event wiring  ───────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  /* resume session if any */
  if (localStorage.getItem("gappkar_joined")==="true") {
    joinChat(localStorage.getItem("gappkar_username")  || "",
             localStorage.getItem("gappkar_age")       || 0,
             localStorage.getItem("gappkar_location")  || "");
  }

  joinButton  .addEventListener("click", () =>
    joinChat(usernameInput.value, ageInput.value, locationInput.value));

  sendButton  .addEventListener("click", sendMessage);
  messageInput.addEventListener("keydown", e=>{
    if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendMessage(); }
  });

  backButton  .addEventListener("click", logout);

  /* room modal */
  createRoomBtnH.addEventListener("click", showModal);
  roomModalClose .addEventListener("click", hideModal);
  joinRoomBtn    .addEventListener("click", () => joinRoom(roomKeyInput.value));
  createRoomBtnM .addEventListener("click", () => joinRoom(roomKeyInput.value));
  leaveRoomBtn   .addEventListener("click", leaveRoom);
  roomModal.addEventListener("click", e=>{ if(e.target===roomModal) hideModal(); });
});

/* ─────────────────────────  Global cleanup  ───────────────────────── */
window.logout = logout;
window.addEventListener("beforeunload", () => {
  presenceTimer && clearInterval(presenceTimer);
  onlineListener && onlineListener();
  messagesListener && messagesListener();
});
