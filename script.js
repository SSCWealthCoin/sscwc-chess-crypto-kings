// === Load Firebase from CDN ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, get, set, update, onValue, push } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// === LOGIN & AGE VERIFICATION ===
window.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("loginModal");
  const form = document.getElementById("loginForm");
  const storedUser = localStorage.getItem("sscwc_user");

  if (!storedUser) {
    modal.style.display = "flex";
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const dob = document.getElementById("dob").value;
    const ageConfirm = document.getElementById("ageConfirm").checked;

    if (!email || !dob || !ageConfirm) {
      alert("Please fill in all fields and confirm your age.");
      return;
    }

    const birthYear = new Date(dob).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    if (age < 18) {
      alert("You must be at least 18 years old to continue.");
      return;
    }

    localStorage.setItem("sscwc_user", JSON.stringify({ email, dob, age }));
    modal.style.display = "none";
  });
});

// === FIREBASE INITIALIZATION ===
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
const user = JSON.parse(localStorage.getItem("sscwc_user"));

// === GAME VARIABLES ===
const connectBtn = document.getElementById("connect");
const statusDiv = document.getElementById("status");
const board = document.getElementById("board");
const ctx = board.getContext("2d");

board.width = 400;
board.height = 400;
const tileSize = 50;

let selected = null;
let turn = "white";
let boardState = [];
let playerColor = null;
let roomId = null;

// === ROOM JOINING ===
async function joinOrCreateRoom() {
  const roomsRef = ref(db, "games");
  const snapshot = await get(roomsRef);

  let joined = false;
  if (snapshot.exists()) {
    snapshot.forEach((room) => {
      const data = room.val();
      if (data && data.players && Object.keys(data.players).length === 1 && !joined) {
        roomId = room.key;
        playerColor = data.players.white ? "black" : "white";
        set(ref(db, `games/${roomId}/players/${playerColor}`), user.email);
        joined = true;
      }
    });
  }

  if (!joined) {
    roomId = push(roomsRef).key;
    playerColor = "white";
    await set(ref(db, `games/${roomId}`), {
      players: { white: user.email },
      boardState: defaultBoard(),
      turn: "white"
    });
  }

  console.log("Joined room:", roomId, "as", playerColor);
  listenToRoom();
}

// === LIVE SYNC ===
function listenToRoom() {
  const gameRoom = ref(db, "games/" + roomId);
  onValue(gameRoom, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      boardState = data.boardState;
      turn = data.turn;
      draw();
    }
  });
}

function updateGame() {
  if (!roomId) return;
  update(ref(db, "games/" + roomId), {
    boardState,
    turn,
    lastMove: new Date().toISOString()
  });
}

// === CHESS LOGIC ===
const pieces = {
  r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟",
  R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙"
};

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
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#f0d9b5" : "#b58863";
      ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
    }
  }
  if (selected) {
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 3;
    ctx.strokeRect(selected.x * tileSize, selected.y * tileSize, tileSize, tileSize);
  }
}

function drawPieces() {
  ctx.font = "36px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = boardState[row][col];
      if (piece) {
        ctx.fillText(pieces[piece], col * tileSize + 25, row * tileSize + 25);
      }
    }
  }
}

function draw() {
  drawBoard();
  drawPieces();
}

function isWhite(p) { return p && p === p.toUpperCase(); }
function isBlack(p) { return p && p === p.toLowerCase(); }

function pathClear(fromX, fromY, toX, toY) {
  const stepX = Math.sign(toX - fromX);
  const stepY = Math.sign(toY - fromY);
  let x = fromX + stepX, y = fromY + stepY;
  while (x !== toX || y !== toY) {
    if (boardState[y][x]) return false;
    x += stepX; y += stepY;
  }
  return true;
}

function isValidMove(fromX, fromY, toX, toY) {
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
  if (color !== playerColor) return false;
  if (target && ((white && isWhite(target)) || (!white && isBlack(target)))) return false;

  switch (piece.toLowerCase()) {
    case "p":
      const dir = white ? -1 : 1;
      const startRow = white ? 6 : 1;
      if (dx === 0 && !target) {
        if (dy === dir) return true;
        if (fromY === startRow && dy === 2 * dir && !boardState[fromY + dir][fromX]) return true;
      }
      if (absX === 1 && dy === dir && target) return true;
      return false;
    case "r": if (dx && dy) return false; return pathClear(fromX, fromY, toX, toY);
    case "b": if (absX !== absY) return false; return pathClear(fromX, fromY, toX, toY);
    case "q": if (absX === absY || dx === 0 || dy === 0) return pathClear(fromX, fromY, toX, toY);
              return false;
    case "n": return (absX === 2 && absY === 1) || (absX === 1 && absY === 2);
    case "k": return absX <= 1 && absY <= 1;
    default: return false;
  }
}

// === INTERACTION ===
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

board.addEventListener("mouseup", (e) => {
  if (!selected) return;
  const rect = board.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);

  if (isValidMove(selected.x, selected.y, x, y)) {
    boardState[y][x] = selected.piece;
    boardState[selected.y][selected.x] = "";
    turn = turn === "white" ? "black" : "white";
    updateGame();
  }
  selected = null;
});

// === INITIALIZE GAME ===
boardState = defaultBoard();
draw();
joinOrCreateRoom();

// === WALLET CONNECT ===
connectBtn.addEventListener("click", async () => {
  if (typeof window.ethereum === "undefined") {
    statusDiv.textContent = "MetaMask not found. Please install it.";
    statusDiv.style.color = "red";
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const account = accounts[0];
    statusDiv.textContent = `Connected: ${account}`;
    statusDiv.style.color = "limegreen";

    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x61" }],
    });
  } catch (err) {
    statusDiv.textContent = "Connection failed or rejected.";
    statusDiv.style.color = "red";
    console.error(err);
  }
});
