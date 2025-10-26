// script.js - Multiplayer with Create / Join by Game ID (Firebase Realtime DB, ES modules)

// --- Firebase ES modules (CDN) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getDatabase, ref, get, set, update, onValue, push, child
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// --- LOGIN & AGE VERIFICATION ---
window.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("loginModal");
  const form = document.getElementById("loginForm");
  const storedUser = localStorage.getItem("sscwc_user");

  if (!storedUser) {
    modal.style.display = "flex";
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const dob = document.getElementById("dob").value;
    const ageConfirm = document.getElementById("ageConfirm").checked;

    if (!email || !dob || !ageConfirm) {
      alert("Please fill in all fields and confirm your age.");
      return;
    }

    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) {
      alert("Invalid date of birth.");
      return;
    }
    // basic year-based age check (approx)
    const diff = new Date().getTime() - birth.getTime();
    const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    if (age < 18) {
      alert("You must be at least 18 years old to continue.");
      return;
    }

    localStorage.setItem("sscwc_user", JSON.stringify({ email, dob, age }));
    modal.style.display = "none";

    // If someone created/joined before logging in, we won't auto-join; user can click create/join after login.
  });
});

// --- FIREBASE CONFIG (using your provided config) ---
const firebaseConfig = {
  apiKey: "AIzaSyAtmhhk9R1X0_s-CRIaDQwbtN2ZNqf8k7o",
  authDomain: "no-analytics-needed.firebaseapp.com",
  databaseURL: "https://no-analytics-needed-default-rtdb.firebaseio.com",
  projectId: "no-analytics-needed",
  storageBucket: "no-analytics-needed.firebasestorage.app",
  messagingSenderId: "338735995946",
  appId: "1:338735995946:web:937c7387bfabe3d38cb753"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- DOM & Game Variables ---
const connectBtn = document.getElementById("connect");
const statusDiv = document.getElementById("status");
const roomInfo = document.getElementById("roomInfo");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const joinInput = document.getElementById("joinInput");

const board = document.getElementById("board");
const ctx = board.getContext("2d");

const tileSize = 50;
let selected = null;
let turn = "white";
let boardState = [];
let playerColor = null;
let roomId = null;
let user = JSON.parse(localStorage.getItem("sscwc_user") || "null");

// --- pieces map ---
const pieces = {
  r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟",
  R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙"
};

// --- helpers ---
function defaultBoard() {
  return [
    ["r","n","b","q","k","b","n","r"],
    ["p","p","p","p","p","p","p","p"],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["P","P","P","P","P","P","P","P"],
    ["R","N","B","Q","K","B","N","R"]
  ];
}

function drawBoard() {
  for (let row=0; row<8; row++){
    for (let col=0; col<8; col++){
      ctx.fillStyle = (row+col)%2===0 ? "#f0d9b5" : "#b58863";
      ctx.fillRect(col*tileSize, row*tileSize, tileSize, tileSize);
    }
  }
  if (selected) {
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 3;
    ctx.strokeRect(selected.x*tileSize, selected.y*tileSize, tileSize, tileSize);
  }
}

function drawPieces(){
  ctx.font = "36px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let r=0; r<8; r++){
    for (let c=0; c<8; c++){
      const p = boardState[r][c];
      if (p) ctx.fillText(pieces[p], c*tileSize + tileSize/2, r*tileSize + tileSize/2);
    }
  }
}

function draw(){
  drawBoard();
  drawPieces();
}

// color helpers
function isWhite(p){ return p && p === p.toUpperCase(); }
function isBlack(p){ return p && p === p.toLowerCase(); }

// path clear for sliding pieces
function pathClear(fromX, fromY, toX, toY){
  const stepX = Math.sign(toX-fromX);
  const stepY = Math.sign(toY-fromY);
  let x = fromX + stepX, y = fromY + stepY;
  while (x !== toX || y !== toY){
    if (boardState[y][x]) return false;
    x += stepX; y += stepY;
  }
  return true;
}

// basic move rules
function isValidMove(fromX, fromY, toX, toY){
  const piece = boardState[fromY][fromX];
  const target = boardState[toY][toX];
  const dx = toX - fromX;
  const dy = toY - fromY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (!piece) return false;
  const white = isWhite(piece);
  const color = white ? "white" : "black";
  if (color !== turn) return false;
  if (playerColor && color !== playerColor) return false; // player can only move own color
  if (target && ((white && isWhite(target)) || (!white && isBlack(target)))) return false;

  switch (piece.toLowerCase()) {
    case "p":
      const dir = white ? -1 : 1;
      const startRow = white ? 6 : 1;
      if (dx === 0 && !target) {
        if (dy === dir) return true;
        if (fromY === startRow && dy === 2*dir && !boardState[fromY + dir][fromX]) return true;
      }
      if (Math.abs(dx) === 1 && dy === dir && target) return true;
      return false;
    case "r": if (dx && dy) return false; return pathClear(fromX,fromY,toX,toY);
    case "b": if (absX !== absY) return false; return pathClear(fromX,fromY,toX,toY);
    case "q": if (absX===absY || dx===0 || dy===0) return pathClear(fromX,fromY,toX,toY); return false;
    case "n": return (absX===2 && absY===1) || (absX===1 && absY===2);
    case "k": return absX<=1 && absY<=1;
    default: return false;
  }
}

// --- DB helpers: create/join/listen/update ---
async function createGame() {
  user = JSON.parse(localStorage.getItem("sscwc_user") || "null");
  if (!user) { alert("Please complete the login modal first."); return; }

  const gamesRef = ref(db, "games");
  const newKey = push(gamesRef).key;
  roomId = newKey;
  playerColor = "white";
  boardState = defaultBoard();
  turn = "white";

  await set(ref(db, `games/${roomId}`), {
    players: { white: user.email },
    boardState,
    turn,
    createdAt: new Date().toISOString()
  });

  updateUIAfterRoomJoin();
  listenToRoom(); // start listening
  copyRoomLink();
}

async function joinById(joinId) {
  user = JSON.parse(localStorage.getItem("sscwc_user") || "null");
  if (!user) { alert("Please complete the login modal first."); return; }

  if (!joinId) { alert("Please enter a valid Game ID."); return; }
  const roomRef = ref(db, `games/${joinId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) { alert("Game not found."); return; }

  const data = snap.val();
  const players = data.players || {};
  const playerCount = Object.keys(players).length;

  if (playerCount >= 2 && !players[user.email]) {
    alert("This game already has 2 players.");
    return;
  }

  // decide color
  if (players.white && !players.black) {
    playerColor = "black";
  } else if (!players.white) {
    playerColor = "white";
  } else {
    // fallback
    playerColor = players.white === user.email ? "white" : (players.black === user.email ? "black" : null);
  }

  // write player slot if missing
  if (!data.players[playerColor]) {
    await set(ref(db, `games/${joinId}/players/${playerColor}`), user.email);
  }

  roomId = joinId;
  boardState = data.boardState || defaultBoard();
  turn = data.turn || "white";

  updateUIAfterRoomJoin();
  listenToRoom();
}

function listenToRoom() {
  if (!roomId) return;
  const roomRef = ref(db, `games/${roomId}`);
  onValue(roomRef, (snap) => {
    const data = snap.val();
    if (!data) return;
    // update board & turn (do not overwrite local if this client just made the change — but simple overwrite is fine here)
    boardState = data.boardState || boardState;
    turn = data.turn || turn;
    draw();
    // show players
    const players = data.players || {};
    const white = players.white || "waiting...";
    const black = players.black || "waiting...";
    roomInfo.textContent = `Room: ${roomId} — White: ${white} | Black: ${black} — You: ${user?.email || "guest"} (${playerColor || "spectator"})`;
  });
}

async function updateGameInDB() {
  if (!roomId) return;
  await update(ref(db, `games/${roomId}`), {
    boardState,
    turn,
    lastMoveAt: new Date().toISOString()
  });
}

// copy room link to clipboard
function copyRoomLink() {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  const link = url.toString();
  navigator.clipboard?.writeText(link).then(() => {
    statusDiv.style.color = "#b8ffb8";
    statusDiv.textContent = `Game created — link copied to clipboard! Share it to invite a player.`;
  }).catch(() => {
    statusDiv.style.color = "#ffd180";
    statusDiv.textContent = `Game created: ${link}`;
  });
}

// update UI after join/create
function updateUIAfterRoomJoin() {
  statusDiv.style.color = "#b8ffb8";
  statusDiv.textContent = `Connected to room ${roomId} as ${playerColor}.`;
  // write room param to URL (shallow, no reload)
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  window.history.replaceState({}, "", url.toString());
}

// --- interaction events (board) ---
board.addEventListener("mousedown", (e) => {
  const rect = board.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);
  const piece = boardState[y][x];
  if (piece && ((playerColor === "white" && isWhite(piece)) || (playerColor === "black" && isBlack(piece)))) {
    selected = { x, y, piece };
    draw();
  }
});

board.addEventListener("mouseup", async (e) => {
  if (!selected) return;
  const rect = board.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);

  if (isValidMove(selected.x, selected.y, x, y)) {
    // apply move locally
    boardState[y][x] = selected.piece;
    boardState[selected.y][selected.x] = "";
    turn = turn === "white" ? "black" : "white";
    draw();
    // push update to db
    await updateGameInDB();
  }
  selected = null;
});

// --- create/join button handlers ---
createBtn.addEventListener("click", createGame);
joinBtn.addEventListener("click", () => {
  const id = joinInput.value.trim();
  joinById(id);
});

// auto-join if ?room= in URL and user is logged
async function tryAutoJoinFromURL() {
  const params = new URLSearchParams(window.location.search);
  const r = params.get("room");
  if (r) {
    // ensure user logged
    user = JSON.parse(localStorage.getItem("sscwc_user") || "null");
    if (!user) {
      // open modal and instruct user to complete login, then they can press Join
      const modal = document.getElementById("loginModal");
      modal.style.display = "flex";
      statusDiv.style.color = "#ffd180";
      statusDiv.textContent = "Please sign in to join the shared game (complete the modal then paste the room ID and press Join).";
      joinInput.value = r;
      return;
    } else {
      await joinById(r);
    }
  }
}

// --- wallet connect (same as before) ---
connectBtn.addEventListener("click", async () => {
  if (typeof window.ethereum === "undefined") {
    statusDiv.style.color = "red";
    statusDiv.textContent = "MetaMask not found. Please install it.";
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const account = accounts[0];
    statusDiv.style.color = "limegreen";
    statusDiv.textContent = `Connected: ${account}`;
    // attempt to switch to BSC Testnet (chainId 0x61)
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x61" }],
      });
    } catch (switchErr) {
      // ignore if user cancels or chain not available
      console.warn("Chain switch failed:", switchErr);
    }
  } catch (err) {
    statusDiv.style.color = "red";
    statusDiv.textContent = "Connection failed or rejected.";
    console.error(err);
  }
});

// --- initialize local board rendering and attempt auto-join ---
boardState = defaultBoard();
draw();
tryAutoJoinFromURL();
