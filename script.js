// Simple wallet connect + chess board setup
const connectBtn = document.getElementById("connect");
const statusDiv = document.getElementById("status");
const board = document.getElementById("board");
const ctx = board.getContext("2d");

board.width = 400;
board.height = 400;

// Draw basic chess board
function drawBoard() {
  const size = 50;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#fff" : "#444";
      ctx.fillRect(col * size, row * size, size, size);
    }
  }
}
drawBoard();

// Connect wallet (BSC Testnet)
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

    // Switch to BSC Testnet if not already
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
