// === SSCWC Chess Crypto Kings ===
// Wallet connect + chess board with basic move rules

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
  r: "♜

