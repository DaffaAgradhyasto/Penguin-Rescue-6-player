const socket = io();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const statusMsg = document.getElementById('status-msg');
const timerDisplay = document.getElementById('timer');
const scoreList = document.getElementById('score-list');

let myId = null;
let gameState = null;

// Constants
const SAFE_ZONE_X = 400;
const SAFE_ZONE_Y = 300;
const SAFE_ZONE_RADIUS = 80;

socket.on('init', (data) => {
  myId = data.id;
  gameState = data.state;
  render();
  updateUI();
});

socket.on('stateUpdate', (state) => {
  gameState = state;
  render();
  updateUI();
});

socket.on('gameStart', (state) => {
  gameState = state;
  render();
  updateUI();
});

socket.on('gameOver', (scores) => {
  // Find winner
  let winner = null;
  let maxScore = -1;
  for (let id in scores) {
    if (scores[id] > maxScore) {
      maxScore = scores[id];
      winner = id;
    }
  }

  if (winner === myId) {
    statusMsg.innerText = "Game Over! You won! 🎉";
  } else {
    statusMsg.innerText = "Game Over!";
  }

  startBtn.style.display = "none";
});

startBtn.addEventListener('click', () => {
  socket.emit('startGame');
});

// Input handling
let isPointerDown = false;
let targetX = SAFE_ZONE_X;
let targetY = SAFE_ZONE_Y;

canvas.addEventListener('pointerdown', (e) => {
  isPointerDown = true;
  updateTarget(e);
});

canvas.addEventListener('pointermove', (e) => {
  if (isPointerDown) {
    updateTarget(e);
  }
});

canvas.addEventListener('pointerup', () => {
  isPointerDown = false;
});

function updateTarget(e) {
  const rect = canvas.getBoundingClientRect();
  targetX = e.clientX - rect.left;
  targetY = e.clientY - rect.top;

  // Send immediate move event
  socket.emit('move', { x: targetX, y: targetY });
}

// Continuous movement loop for smooth client-side prediction/sending
setInterval(() => {
  if (isPointerDown && gameState && gameState.status === 'playing') {
    socket.emit('move', { x: targetX, y: targetY });
  }
}, 1000 / 30); // 30 times a second

function render() {
  if (!gameState) return;

  // Clear canvas (Ice background)
  ctx.fillStyle = '#e0f7fa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Grid/Ice texture (optional, just some lines)
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for(let i=0; i<canvas.width; i+=100) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
  }
  for(let i=0; i<canvas.height; i+=100) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
  }

  // Draw Safe Zone (Igloo/Base)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(SAFE_ZONE_X, SAFE_ZONE_Y, SAFE_ZONE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SAFE ZONE', SAFE_ZONE_X, SAFE_ZONE_Y);

  // Draw Penguins
  ctx.font = '24px Arial';
  gameState.penguins.forEach(p => {
    ctx.fillText('🐧', p.x, p.y + 8); // Offset to center emoji
  });

  // Draw Bears
  ctx.font = '30px Arial';
  gameState.bears.forEach(b => {
    ctx.fillText('🐻‍❄️', b.x, b.y + 10);
  });

  // Draw Players
  for (let id in gameState.players) {
    let player = gameState.players[id];

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = id === myId ? '#000' : '#fff';
    ctx.lineWidth = id === myId ? 3 : 2;
    ctx.stroke();

    // Draw stun effect
    if (player.stunned) {
      ctx.fillStyle = 'yellow';
      ctx.font = '20px Arial';
      ctx.fillText('⚡', player.x, player.y - 25);

      // Gray out player
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw "Me" indicator
    if (id === myId && !player.stunned) {
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.fillText('ME', player.x, player.y + 4);
    }
  }
}

function updateUI() {
  if (!gameState) return;

  // Timer
  let mins = Math.floor(gameState.timer / 60);
  let secs = gameState.timer % 60;
  timerDisplay.innerText = `Time: ${mins}:${secs.toString().padStart(2, '0')}`;

  // Status and Start Button
  if (gameState.status === 'waiting') {
    let playerCount = Object.keys(gameState.players).length;
    statusMsg.innerText = `Waiting for players... (${playerCount}/6)`;
    if (playerCount > 0) {
      startBtn.style.display = "inline-block";
    } else {
      startBtn.style.display = "none";
    }
  } else if (gameState.status === 'playing') {
    statusMsg.innerText = "Game in progress! Rescue the 🐧!";
    startBtn.style.display = "none";
  }

  // Scoreboard
  scoreList.innerHTML = '';
  // Sort players by score
  let sortedPlayers = Object.keys(gameState.players).sort((a, b) => {
    return (gameState.scores[b] || 0) - (gameState.scores[a] || 0);
  });

  sortedPlayers.forEach(id => {
    let li = document.createElement('li');
    let colorBox = document.createElement('span');
    colorBox.className = 'color-box';
    colorBox.style.backgroundColor = gameState.players[id].color;

    let text = document.createTextNode(`${id === myId ? '(You)' : 'Player'}: ${gameState.scores[id] || 0} 🐧`);

    li.appendChild(colorBox);
    li.appendChild(text);
    scoreList.appendChild(li);
  });
}
