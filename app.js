import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  arrayUnion,
  serverTimestamp,
  limit
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// ===== State =====
let currentUser = null;
let currentUserData = null;
let activeChatId = null;
let activeChatType = null; // "dm" or "group"
let unsubscribeMessages = null;

// ===== DOM =====
const dmList = document.getElementById("dm-list");
const groupList = document.getElementById("group-list");
const messagesEl = document.getElementById("messages");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const chatName = document.getElementById("chat-name");
const chatIcon = document.getElementById("chat-icon");
const currentUsername = document.getElementById("current-username");
const userAvatar = document.getElementById("user-avatar");
const logoutBtn = document.getElementById("logout-btn");
const newDmBtn = document.getElementById("new-dm-btn");
const newGroupBtn = document.getElementById("new-group-btn");
const addMemberBtn = document.getElementById("add-member-btn");

// Modals
const dmModal = document.getElementById("dm-modal");
const groupModal = document.getElementById("group-modal");
const addMemberModal = document.getElementById("add-member-modal");
const dmSearch = document.getElementById("dm-search");
const userSearchResults = document.getElementById("user-search-results");
const groupNameInput = document.getElementById("group-name");
const groupMembersInput = document.getElementById("group-members");
const groupError = document.getElementById("group-error");
const addMemberInput = document.getElementById("add-member-input");
const addMemberError = document.getElementById("add-member-error");

// ===== Auth Guard =====
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) {
    await signOut(auth);
    window.location.href = "index.html";
    return;
  }

  currentUserData = userDoc.data();
  currentUsername.textContent = currentUserData.username;
  userAvatar.textContent = currentUserData.username.charAt(0).toUpperCase();
  userAvatar.style.background = currentUserData.avatarColor || "#5865f2";

  loadChats();
});

// ===== Logout =====
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ===== Load Chats =====
async function loadChats() {
  // DMs
  const dmQuery = query(
    collection(db, "chats"),
    where("type", "==", "dm"),
    where("members", "array-contains", currentUser.uid)
  );

  onSnapshot(dmQuery, (snapshot) => {
    dmList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const chat = docSnap.data();
      const otherUid = chat.members.find(uid => uid !== currentUser.uid);
      renderChatItem(docSnap.id, chat, otherUid, "dm");
    });
  });

  // Groups
  const groupQuery = query(
    collection(db, "chats"),
    where("type", "==", "group"),
    where("members", "array-contains", currentUser.uid)
  );

  onSnapshot(groupQuery, (snapshot) => {
    groupList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const chat = docSnap.data();
      renderChatItem(docSnap.id, chat, null, "group");
    });
  });
}

async function renderChatItem(chatId, chat, otherUid, type) {
  const item = document.createElement("div");
  item.className = "chat-item" + (activeChatId === chatId ? " active" : "");
  item.dataset.id = chatId;

  let displayName = chat.name || "Chat";
  let initial = displayName.charAt(0).toUpperCase();
  let color = "#5865f2";

  if (type === "dm" && otherUid) {
    try {
      const otherDoc = await getDoc(doc(db, "users", otherUid));
      if (otherDoc.exists()) {
        const data = otherDoc.data();
        displayName = data.username;
        initial = data.username.charAt(0).toUpperCase();
        color = data.avatarColor || "#5865f2";
      }
    } catch (e) {
      console.error(e);
    }
  }

  item.innerHTML = `
    <div class="avatar" style="background:${color}">${initial}</div>
    <span class="name">${escapeHtml(displayName)}</span>
  `;

  item.addEventListener("click", () => openChat(chatId, type, displayName));
  if (type === "dm") {
    dmList.appendChild(item);
  } else {
    groupList.appendChild(item);
  }
}

// ===== Open Chat =====
function openChat(chatId, type, name) {
  activeChatId = chatId;
  activeChatType = type;

  // Update UI
  document.querySelectorAll(".chat-item").forEach(el => {
    el.classList.toggle("active", el.dataset.id === chatId);
  });

  chatName.textContent = name;
  chatIcon.textContent = type === "group" ? "#" : "@";
  messageInput.disabled = false;
  sendBtn.disabled = false;
  messageInput.placeholder = `Message ${name}`;
  messageInput.focus();

  // Show add member only for groups
  addMemberBtn.classList.toggle("hidden", type !== "group");

  // Load messages
  if (unsubscribeMessages) unsubscribeMessages();

  const messagesQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc"),
    limit(100)
  );

  unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
    messagesEl.innerHTML = "";
    if (snapshot.empty) {
      messagesEl.innerHTML = `<div class="empty-state"><p>No messages yet. Say hello!</p></div>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      renderMessage(msg);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = "message";

  const time = msg.createdAt?.toDate 
    ? msg.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const initial = (msg.username || "?").charAt(0).toUpperCase();
  const color = msg.avatarColor || "#5865f2";

  div.innerHTML = `
    <div class="avatar" style="background:${color}">${initial}</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-author">${escapeHtml(msg.username || "Unknown")}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-text">${escapeHtml(msg.text)}</div>
    </div>
  `;

  messagesEl.appendChild(div);
}

// ===== Send Message =====
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !activeChatId) return;

  messageInput.value = "";

  try {
    await addDoc(collection(db, "chats", activeChatId, "messages"), {
      text,
      uid: currentUser.uid,
      username: currentUserData.username,
      avatarColor: currentUserData.avatarColor || "#5865f2",
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to send message:", err);
    alert("Failed to send message. Check console.");
  }
});

// ===== New DM =====
newDmBtn.addEventListener("click", () => {
  dmModal.classList.remove("hidden");
  dmSearch.value = "";
  userSearchResults.innerHTML = "";
  dmSearch.focus();
});

document.getElementById("close-dm-modal").addEventListener("click", () => {
  dmModal.classList.add("hidden");
});

dmSearch.addEventListener("input", async () => {
  const term = dmSearch.value.trim().toLowerCase();
  userSearchResults.innerHTML = "";

  if (term.length < 2) return;

  try {
    // Simple prefix search on usernames collection
    const q = query(
      collection(db, "usernames"),
      where("__name__", ">=", term),
      where("__name__", "<=", term + "\uf8ff"),
      limit(8)
    );

    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const username = docSnap.id;
      if (username === currentUserData.username) return;

      const item = document.createElement("div");
      item.className = "search-result-item";
      item.innerHTML = `
        <div class="avatar">${username.charAt(0).toUpperCase()}</div>
        <span>${escapeHtml(username)}</span>
      `;
      item.addEventListener("click", () => startDM(username, docSnap.data().uid));
      userSearchResults.appendChild(item);
    });
  } catch (err) {
    console.error(err);
  }
});

async function startDM(username, otherUid) {
  // Check if DM already exists
  const existing = query(
    collection(db, "chats"),
    where("type", "==", "dm"),
    where("members", "array-contains", currentUser.uid)
  );

  const snap = await getDocs(existing);
  let existingChatId = null;

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.members.includes(otherUid) && data.members.length === 2) {
      existingChatId = docSnap.id;
    }
  });

  if (existingChatId) {
    openChat(existingChatId, "dm", username);
  } else {
    // Create new DM
    const chatRef = await addDoc(collection(db, "chats"), {
      type: "dm",
      members: [currentUser.uid, otherUid],
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid
    });
    openChat(chatRef.id, "dm", username);
  }

  dmModal.classList.add("hidden");
}

// ===== New Group =====
newGroupBtn.addEventListener("click", () => {
  groupModal.classList.remove("hidden");
  groupNameInput.value = "";
  groupMembersInput.value = "";
  groupError.textContent = "";
  groupNameInput.focus();
});

document.getElementById("close-group-modal").addEventListener("click", () => {
  groupModal.classList.add("hidden");
});

document.getElementById("create-group-btn").addEventListener("click", async () => {
  const name = groupNameInput.value.trim();
  const membersStr = groupMembersInput.value.trim();
  groupError.textContent = "";

  if (!name) {
    groupError.textContent = "Group name is required";
    return;
  }

  const usernames = membersStr
    ? membersStr.split(",").map(u => u.trim().toLowerCase()).filter(Boolean)
    : [];

  const memberUids = [currentUser.uid];

  try {
    for (const uname of usernames) {
      if (uname === currentUserData.username) continue;
      const unameDoc = await getDoc(doc(db, "usernames", uname));
      if (!unameDoc.exists()) {
        groupError.textContent = `User "${uname}" not found`;
        return;
      }
      memberUids.push(unameDoc.data().uid);
    }

    // Remove duplicates
    const uniqueMembers = [...new Set(memberUids)];

    const chatRef = await addDoc(collection(db, "chats"), {
      type: "group",
      name: name,
      members: uniqueMembers,
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid
    });

    groupModal.classList.add("hidden");
    openChat(chatRef.id, "group", name);
  } catch (err) {
    console.error(err);
    groupError.textContent = "Failed to create group";
  }
});

// ===== Add Member to Group =====
addMemberBtn.addEventListener("click", () => {
  addMemberModal.classList.remove("hidden");
  addMemberInput.value = "";
  addMemberError.textContent = "";
  addMemberInput.focus();
});

document.getElementById("close-add-member").addEventListener("click", () => {
  addMemberModal.classList.add("hidden");
});

document.getElementById("confirm-add-member").addEventListener("click", async () => {
  const uname = addMemberInput.value.trim().toLowerCase();
  addMemberError.textContent = "";

  if (!uname) {
    addMemberError.textContent = "Enter a username";
    return;
  }

  try {
    const unameDoc = await getDoc(doc(db, "usernames", uname));
    if (!unameDoc.exists()) {
      addMemberError.textContent = "User not found";
      return;
    }

    const uid = unameDoc.data().uid;
    await updateDoc(doc(db, "chats", activeChatId), {
      members: arrayUnion(uid)
    });

    addMemberModal.classList.add("hidden");
  } catch (err) {
    console.error(err);
    addMemberError.textContent = "Failed to add member";
  }
});

// ===== Helpers =====
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Close modals on outside click
[dmModal, groupModal, addMemberModal].forEach(modal => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });
});
