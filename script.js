// === SSCWC Chess Crypto Kings ===
// Wallet connect + playable chess board with basic move rules

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
  R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙",
};

// === Draw functions ===
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

// === Initialize board ===
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
function isWhite(piece) {
  return piece && piece === piece.toUpperCase();
}
function isBlack(piece) {
  return piece && piece === piece.toLowerCase();
}

// === Move validation ===
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
    case "p": // Pawn
      const dir = white ? -1 : 1;
      const startRow = white ? 6 : 1;
      if (dx === 0 && !target) {
        if (dy === dir) return true;
        if (fromY === startRow && dy === 2 * dir && !boardState[fromY + dir][fromX]) return true;
      }
      if (absX === 1 && dy === dir && target) return true;
      return false;

    case "r": // Rook
      if (dx !== 0 && dy !== 0) return false;
      return pathClear(fromX, fromY, toX, toY);

    case "b": // Bishop
      if (absX !== absY) return false;
      return pathClear(fromX, fromY, toX, toY);

    case "q": // Queen
      if (absX === absY || dx === 0 || dy === 0)
        return pathClear(fromX, fromY, toX, toY);
      return false;

    case "n": // Knight
      return (absX === 2 && absY === 1) || (absX === 1 && absY === 2);

    case "k": // King
      return absX <= 1 && absY <= 1;

    default:
      return false;
  }
}

function pathClear(fromX, fromY, toX, toY) {
  const stepX = Math.sign(toX - fromX);
  const stepY = Math.sign(toY - fromY);
  let x = fromX + stepX;
  let y = fromY + stepY;
  while (x !== toX || y !== toY) {
    if (boardState[y][x]) return false;
    x += stepX;
    y += stepY;
  }
  return true;
}

// === Mouse events ===
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
  }
  selected = null;
  draw();
});

// === Wallet connect ===
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
