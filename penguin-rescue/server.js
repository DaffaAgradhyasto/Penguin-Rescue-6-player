const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Game State
const GAME_DURATION = 120; // 2 minutes in seconds
let gameState = {
  status: 'waiting', // waiting, playing, finished
  timer: GAME_DURATION,
  players: {},
  penguins: [],
  bears: [],
  scores: {}
};

// Config
const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const SAFE_ZONE_RADIUS = 80;
const SAFE_ZONE_X = MAP_WIDTH / 2;
const SAFE_ZONE_Y = MAP_HEIGHT / 2;
const MAX_PENGUINS = 20;
const NUM_BEARS = 3;

const COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33', '#33FFF5'];

let gameLoopInterval = null;
let timerInterval = null;

function resetGame() {
  gameState.status = 'playing';
  gameState.timer = GAME_DURATION;
  gameState.penguins = [];
  gameState.bears = [];

  // Reset player scores, positions and state
  let colorIndex = 0;
  for (let id in gameState.players) {
    gameState.scores[id] = 0;
    gameState.players[id] = {
      id: id,
      x: SAFE_ZONE_X + (Math.random() * 40 - 20),
      y: SAFE_ZONE_Y + (Math.random() * 40 - 20),
      color: COLORS[colorIndex % COLORS.length],
      carrying: false,
      stunned: false,
      stunTime: 0
    };
    colorIndex++;
  }

  // Spawn penguins
  for (let i = 0; i < MAX_PENGUINS; i++) {
    spawnPenguin();
  }

  // Spawn bears
  for (let i = 0; i < NUM_BEARS; i++) {
    gameState.bears.push({
      id: `bear_${i}`,
      x: Math.random() * MAP_WIDTH,
      y: Math.random() * MAP_HEIGHT,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2
    });
  }

  io.emit('gameStart', gameState);

  if (gameLoopInterval) clearInterval(gameLoopInterval);
  gameLoopInterval = setInterval(gameLoop, 1000 / 60); // 60 FPS update

  // Timer countdown
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameState.status === 'playing') {
      gameState.timer--;
      if (gameState.timer <= 0) {
        gameState.status = 'finished';
        clearInterval(gameLoopInterval);
        clearInterval(timerInterval);
        io.emit('gameOver', gameState.scores);
        setTimeout(() => {
          gameState.status = 'waiting';
          io.emit('stateUpdate', gameState);
        }, 5000);
      }
    }
  }, 1000);
}

function spawnPenguin() {
  let x, y;
  do {
    x = Math.random() * (MAP_WIDTH - 40) + 20;
    y = Math.random() * (MAP_HEIGHT - 40) + 20;
  } while (distance(x, y, SAFE_ZONE_X, SAFE_ZONE_Y) < SAFE_ZONE_RADIUS + 20); // Don't spawn inside safe zone

  gameState.penguins.push({
    id: Math.random().toString(36).substr(2, 9),
    x: x,
    y: y,
    carriedBy: null
  });
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function gameLoop() {
  if (gameState.status !== 'playing') return;

  // Move Bears
  gameState.bears.forEach(bear => {
    bear.x += bear.vx;
    bear.y += bear.vy;

    // Bounce off walls
    if (bear.x < 0 || bear.x > MAP_WIDTH) bear.vx *= -1;
    if (bear.y < 0 || bear.y > MAP_HEIGHT) bear.vy *= -1;

    // Check collision with players
    for (let playerId in gameState.players) {
      let player = gameState.players[playerId];
      if (!player.stunned && distance(bear.x, bear.y, player.x, player.y) < 30) {
        player.stunned = true;
        player.stunTime = 120; // 2 seconds at 60fps

        // Drop penguin if carrying
        if (player.carrying) {
          player.carrying = false;
          let carriedPenguin = gameState.penguins.find(p => p.carriedBy === playerId);
          if (carriedPenguin) {
             carriedPenguin.carriedBy = null;
             carriedPenguin.x = player.x + (Math.random() * 20 - 10);
             carriedPenguin.y = player.y + (Math.random() * 20 - 10);
          }
        }
      }
    }
  });

  // Update players
  for (let id in gameState.players) {
    let player = gameState.players[id];
    if (player.stunned) {
      player.stunTime--;
      if (player.stunTime <= 0) {
        player.stunned = false;
      }
    }

    // Check safe zone delivery
    if (player.carrying && distance(player.x, player.y, SAFE_ZONE_X, SAFE_ZONE_Y) < SAFE_ZONE_RADIUS) {
      player.carrying = false;
      gameState.scores[id] = (gameState.scores[id] || 0) + 1;

      // Remove delivered penguin and spawn a new one
      gameState.penguins = gameState.penguins.filter(p => p.carriedBy !== id);
      spawnPenguin();
    }
  }

  // Update penguins
  gameState.penguins.forEach(penguin => {
    if (penguin.carriedBy && gameState.players[penguin.carriedBy]) {
       penguin.x = gameState.players[penguin.carriedBy].x;
       penguin.y = gameState.players[penguin.carriedBy].y - 20; // Carry above head
    } else if (!penguin.carriedBy) {
       // Check pickup
       for (let playerId in gameState.players) {
         let player = gameState.players[playerId];
         if (!player.stunned && !player.carrying && distance(penguin.x, penguin.y, player.x, player.y) < 20) {
           player.carrying = true;
           penguin.carriedBy = playerId;
           break;
         }
       }
    }
  });

  io.emit('stateUpdate', gameState);
}

io.on('connection', (socket) => {
  console.log('A player connected:', socket.id);

  if (Object.keys(gameState.players).length >= 6) {
    socket.emit('error', 'Server is full');
    socket.disconnect();
    return;
  }

  let color = COLORS[Object.keys(gameState.players).length % COLORS.length];

  gameState.players[socket.id] = {
    id: socket.id,
    x: SAFE_ZONE_X,
    y: SAFE_ZONE_Y,
    color: color,
    carrying: false,
    stunned: false,
    stunTime: 0
  };
  gameState.scores[socket.id] = 0;

  socket.emit('init', { id: socket.id, state: gameState });
  io.emit('stateUpdate', gameState);

  socket.on('move', (data) => {
    if (gameState.status !== 'playing') return;

    let player = gameState.players[socket.id];
    if (player && !player.stunned) {
      let targetX = Math.max(10, Math.min(MAP_WIDTH - 10, data.x));
      let targetY = Math.max(10, Math.min(MAP_HEIGHT - 10, data.y));

      let dx = targetX - player.x;
      let dy = targetY - player.y;
      let dist = distance(player.x, player.y, targetX, targetY);

      let speed = 5; // Max speed per update
      if (dist > speed) {
        player.x += (dx / dist) * speed;
        player.y += (dy / dist) * speed;
      } else {
        player.x = targetX;
        player.y = targetY;
      }
    }
  });

  socket.on('startGame', () => {
    if (gameState.status === 'waiting') {
      resetGame();
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete gameState.players[socket.id];
    delete gameState.scores[socket.id];

    // Drop penguin if disconnecting while carrying
    let carriedPenguin = gameState.penguins.find(p => p.carriedBy === socket.id);
    if (carriedPenguin) {
       carriedPenguin.carriedBy = null;
    }

    io.emit('stateUpdate', gameState);

    if (Object.keys(gameState.players).length === 0) {
      gameState.status = 'waiting';
      if (timerInterval) clearInterval(timerInterval);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
