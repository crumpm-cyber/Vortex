import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// DOM elements
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const showSignup = document.getElementById("show-signup");
const showLogin = document.getElementById("show-login");
const loginError = document.getElementById("login-error");
const signupError = document.getElementById("signup-error");

// Toggle between login and signup
showSignup?.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.classList.add("hidden");
  signupForm.classList.remove("hidden");
  loginError.textContent = "";
});

showLogin?.addEventListener("click", (e) => {
  e.preventDefault();
  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  signupError.textContent = "";
});

// Check if already logged in
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.endsWith("index.html") || window.location.pathname === "/" || window.location.pathname.endsWith("/")) {
    // Already logged in → go to app
    window.location.href = "app.html";
  }
});

// Login
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "app.html";
  } catch (err) {
    console.error(err);
    if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
      loginError.textContent = "Invalid email or password";
    } else if (err.code === "auth/too-many-requests") {
      loginError.textContent = "Too many attempts. Try again later.";
    } else {
      loginError.textContent = "Login failed. Please try again.";
    }
  }
});

// Signup
signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupError.textContent = "";

  const username = document.getElementById("signup-username").value.trim().toLowerCase();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  // Basic username validation
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    signupError.textContent = "Username must be 3-20 characters (letters, numbers, underscore)";
    return;
  }

  try {
    // Check if username is taken
    const usernameRef = doc(db, "usernames", username);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) {
      signupError.textContent = "Username already taken";
      return;
    }

    // Create auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save user profile + claim username
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      username: username,
      email: email,
      createdAt: new Date().toISOString(),
      avatarColor: getRandomColor()
    });

    await setDoc(usernameRef, {
      uid: user.uid
    });

    window.location.href = "app.html";
  } catch (err) {
    console.error(err);
    if (err.code === "auth/email-already-in-use") {
      signupError.textContent = "Email already in use";
    } else if (err.code === "auth/weak-password") {
      signupError.textContent = "Password should be at least 6 characters";
    } else if (err.code === "auth/invalid-email") {
      signupError.textContent = "Invalid email address";
    } else {
      signupError.textContent = "Signup failed. Please try again.";
    }
  }
});

function getRandomColor() {
  const colors = ["#5865f2", "#57f287", "#fee75c", "#eb459e", "#ed4245", "#00a8fc", "#f47b67"];
  return colors[Math.floor(Math.random() * colors.length)];
}
