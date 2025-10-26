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

// === FIREBASE INITIALIZATION (optional) ===
/*
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  databaseURL: "YOUR_DATABASE_URL_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_BUCKET_HERE",
  messagingSenderId: "YOUR_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database(app);
const user = JSON.parse(localStorage.getItem("sscwc_user"));
const gameRoom = db.ref("liveGame");
*/

// === CHESS SETUP ===
const connectBtn = document.getElementById("connect");
const statusDiv = document.getElementById("status");
const board = document.getElementById("board");
const ctx = board.getContext("2d");

board.width = 400;
board.height = 400;
const tileSize = 50;

let selected = null;
let turn = "white"; // white starts
let boardState = [];

const pieces = {
  r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟",
  R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙"
};

// === Draw Functions ===
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

// === Board Setup ===
function resetBoard() {
  boardState = [
    ["r","n","b","q","k","b","n","r"],
    ["p","p","p","p","p","p","p","p"],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["P","P","P","P","P","P","P","P"],
    ["R","N","B","Q","K","B","N","R"]
  ];
  draw();
}
resetBoard();

// === Helpers ===
function isWhite(piece) { return piece && piece === piece.toUpperCase(); }
function isBlack(piece) { return piece && piece === piece.toLowerCase(); }

function pathClear(fromX, fromY, toX, toY) {
  const stepX = Math.sign(toX - fromX);
  const stepY = Math.sign(toY - fromY);
  let x = fromX + stepX;
  let y = fromY + stepY;
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
    case "r":
      if (dx !== 0 && dy !== 0) return false;
      return pathClear(fromX, fromY, toX, toY);
    case "b":
      if (absX !== absY) return false;
      return pathClear(fromX, fromY, toX, toY);
    case "q":
      if (absX === absY || dx === 0 || dy === 0) return pathClear(fromX, fromY, toX, toY);
      return false;
    case "n":
      return (absX === 2 && absY === 1) || (absX === 1 && absY === 2);
    case "k":
      return absX <= 1 && absY <= 1;
    default:
      return false;
  }
}

// === Move Events ===
board.addEventListener("mousedown", (e) => {
  const rect = board.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);
  const piece = boardState[y][x];
  if (piece && ((turn === "white" && isWhite(piece)) || (turn === "black" && isBlack(piece)))) {
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
    draw();
    // updateGame(); // uncomment once Firebase configured
  }
  selected = null;
});

// === Wallet Connect ===
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
      params: [{ chainId: "0x61" }], // BSC Testnet
    });
  } catch (err) {
    statusDiv.textContent = "Connection failed or rejected.";
    statusDiv.style.color = "red";
    console.error(err);
  }
});
