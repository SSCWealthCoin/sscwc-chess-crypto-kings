// === SSCWC Chess Crypto Kings ===
// Wallet connect + playable chess board

const connectBtn = document.getElementById("connect");
const statusDiv = document.getElementById("status");
const board = document.getElementById("board");
const ctx = board.getContext("2d");

board.width = 400;
board.height = 400;
const tileSize = 50;

let selected = null;
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

// === Piece movement ===
board.addEventListener("mousedown", (e) => {
  const rect = board.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);
  const piece = boardState[y][x];
  if (piece) {
    selected = { x, y, piece };
  }
});

board.addEventListener("mouseup", (e) => {
  if (!selected) return;
  const rect = board.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);

  // Move piece
  boardState[y][x] = selected.piece;
  boardState[selected.y][selected.x] = "";
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

    // Switch to BSC Testnet if needed
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
