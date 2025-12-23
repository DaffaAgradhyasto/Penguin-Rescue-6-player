// Online Multiplayer Client for Penguin Rescue Game

// Socket.IO connection
const socket = io();

// Game Configuration
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 700;
const PLAYER_SIZE = 30;
const BABY_SIZE = 20;
const OBSTACLE_WIDTH = 60;
const OBSTACLE_HEIGHT = 60;
const SAFE_ZONE_SIZE = 150;
const PLAYER_SPEED = 4;

// UI Elements
const lobbyScreen = document.getElementById('lobbyScreen');
const waitingScreen = document.getElementById('waitingScreen');
const gameScreen = document.getElementById('gameScreen');
const playerNameInput = document.getElementById('playerName');
const roomIdInput = document.getElementById('roomId');
const joinBtn = document.getElementById('joinBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const lobbyMessage = document.getElementById('lobbyMessage');
const startGameBtn = document.getElementById('startGameBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const pauseBtn = document.getElementById('pauseBtn');
const backToLobbyBtn = document.getElementById('backToLobbyBtn');

//Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let myPlayer = null;
let roomId = null;
let players = new Map();
let babies = [];
let obstacles = [];
let safeZone = null;
let keys = {};
let gameState = {
    isRunning: false,
    isPaused: false,
    startTime: null,
    elapsedTime: 0,
    totalBabies: 10,
    babiesRescued: 0
};

// Player Colors
const PLAYER_COLORS = [
    { main: '#e53935', dark: '#b71c1c', name: 'Red' },
    { main: '#1e88e5', dark: '#0d47a1', name: 'Blue' },
    { main: '#43a047', dark: '#1b5e20', name: 'Green' },
    { main: '#fdd835', dark: '#f57f17', name: 'Yellow' },
    { main: '#8e24aa', dark: '#4a148c', name: 'Purple' },
    { main: '#fb8c00', dark: '#e65100', name: 'Orange' }
];

// Classes
class Player {
    constructor(id, x, y, color, controls, name) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.color = color;
        this.controls = controls;
        this.name = name;
        this.score = 0;
        this.hasBaby = false;
        this.carriedBaby = null;
        this.speed = PLAYER_SPEED;
    }

    draw() {
        // Penguin body
        ctx.fillStyle = this.color.main;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, PLAYER_SIZE / 2, PLAYER_SIZE / 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Penguin belly
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 5, PLAYER_SIZE / 3.5, PLAYER_SIZE / 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x - 7, this.y - 8, 5, 0, Math.PI * 2);
        ctx.arc(this.x + 7, this.y - 8, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x - 7, this.y - 8, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 7, this.y - 8, 2, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 3);
        ctx.lineTo(this.x - 5, this.y + 2);
        ctx.lineTo(this.x + 5, this.y + 2);
        ctx.closePath();
        ctx.fill();

        // Feet
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.ellipse(this.x - 8, this.y + PLAYER_SIZE / 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(this.x + 8, this.y + PLAYER_SIZE / 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Player name and number
        ctx.fillStyle = this.color.dark;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`P${this.id} - ${this.name}`, this.x, this.y + PLAYER_SIZE + 15);

        // Draw carried baby indicator
        if (this.hasBaby) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(this.x, this.y - PLAYER_SIZE, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff69b4';
            ctx.beginPath();
            ctx.arc(this.x, this.y - PLAYER_SIZE, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    move(dx, dy) {
        const newX = this.x + dx * this.speed;
        const newY = this.y + dy * this.speed;

        if (newX >= PLAYER_SIZE / 2 && newX <= GAME_WIDTH - PLAYER_SIZE / 2) {
            this.x = newX;
        }
        if (newY >= PLAYER_SIZE / 2 && newY <= GAME_HEIGHT - PLAYER_SIZE / 2) {
            this.y = newY;
        }

        if (this.hasBaby && this.carriedBaby) {
            this.carriedBaby.x = this.x;
            this.carriedBaby.y = this.y - PLAYER_SIZE;
        }
    }

    checkCollision(obj) {
        const dist = Math.sqrt((this.x - obj.x) ** 2 + (this.y - obj.y) ** 2);
        return dist < (PLAYER_SIZE / 2 + obj.size / 2);
    }
}

class Baby {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.size = BABY_SIZE;
        this.isRescued = false;
        this.isCarried = false;
    }

    draw() {
        if (this.isRescued || this.isCarried) return;

        ctx.fillStyle = '#ff69b4';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.size / 2, this.size / 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x - 4, this.y - 4, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 4, this.y - 4, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x - 4, this.y - 4, 1, 0, Math.PI * 2);
        ctx.arc(this.x + 4, this.y - 4, 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('!', this.x, this.y - this.size);
    }
}

class Obstacle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.size = Math.max(width, height);
    }

    draw() {
        ctx.fillStyle = '#b3e5fc';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        ctx.strokeStyle = '#81d4fa';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        ctx.strokeStyle = '#e1f5fe';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 2 + 10, this.y - this.height / 2 + 10);
        ctx.lineTo(this.x + this.width / 2 - 10, this.y + this.height / 2 - 10);
        ctx.stroke();
    }

    checkCollision(player) {
        return (
            player.x + PLAYER_SIZE / 2 > this.x - this.width / 2 &&
            player.x - PLAYER_SIZE / 2 < this.x + this.width / 2 &&
            player.y + PLAYER_SIZE / 2 > this.y - this.height / 2 &&
            player.y - PLAYER_SIZE / 2 < this.y + this.height / 2
        );
    }
}

class SafeZone {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
    }

    draw() {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 4;
        ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);

        ctx.fillStyle = '#2e7d32';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SAFE ZONE', this.x, this.y);
        ctx.font = '16px Arial';
        ctx.fillText('🏠', this.x, this.y + 25);
    }

    checkInside(player) {
        return (
            player.x > this.x - this.size / 2 &&
            player.x < this.x + this.size / 2 &&
            player.y > this.y - this.size / 2 &&
            player.y < this.y + this.size / 2
        );
    }
}

// Socket.IO Event Handlers
socket.on('playerJoined', ({ player, players: allPlayers, gameState: state }) => {
    myPlayer = player;
    roomId = roomIdInput.value;
    
    // Initialize players
    players.clear();
    allPlayers.forEach(p => {
        const playerObj = new Player(p.id, p.x, p.y, p.color, p.controls, p.name);
        playerObj.score = p.score;
        playerObj.hasBaby = p.hasBaby;
        players.set(p.socketId, playerObj);
    });
    
    showWaitingRoom();
    updatePlayersList();
});

socket.on('playerConnected', (player) => {
    const playerObj = new Player(player.id, player.x, player.y, player.color, player.controls, player.name);
    players.set(player.socketId, playerObj);
    updatePlayersList();
});

socket.on('playerDisconnected', (socketId) => {
    players.delete(socketId);
    updatePlayersList();
});

socket.on('gameStarted', ({ gameState: state, players: allPlayers }) => {
    // Initialize game objects
    babies = [];
    state.babies.forEach(b => {
        babies.push(new Baby(b.id, b.x, b.y));
    });

    obstacles = [];
    state.obstacles.forEach(o => {
        obstacles.push(new Obstacle(o.x, o.y, o.width, o.height));
    });

    safeZone = new SafeZone(GAME_WIDTH / 2, GAME_HEIGHT - 100, SAFE_ZONE_SIZE);

    // Update players
    allPlayers.forEach(p => {
        const playerObj = players.get(p.socketId);
        if (playerObj) {
            playerObj.x = p.x;
            playerObj.y = p.y;
            playerObj.score = 0;
            playerObj.hasBaby = false;
        }
    });

    gameState.isRunning = true;
    gameState.isPaused = false;
    gameState.babiesRescued = 0;
    gameState.startTime = Date.now();

    showGameScreen();
    updateScoreboard();
});

socket.on('playerMoved', ({ socketId, x, y, hasBaby }) => {
    const player = players.get(socketId);
    if (player) {
        player.x = x;
        player.y = y;
        player.hasBaby = hasBaby;
    }
});

socket.on('babyPickedUp', ({ babyId, socketId }) => {
    const baby = babies.find(b => b.id === babyId);
    if (baby) {
        baby.isCarried = true;
    }
    
    const player = players.get(socketId);
    if (player) {
        player.hasBaby = true;
        player.carriedBaby = baby;
    }
});

socket.on('babyRescued', ({ babyId, socketId, score, babiesRescued }) => {
    const baby = babies.find(b => b.id === babyId);
    if (baby) {
        baby.isRescued = true;
        baby.isCarried = false;
    }
    
    const player = players.get(socketId);
    if (player) {
        player.score = score;
        player.hasBaby = false;
        player.carriedBaby = null;
    }

    gameState.babiesRescued = babiesRescued;
    updateScoreboard();
});

socket.on('gameComplete', ({ players: finalPlayers }) => {
    gameState.isRunning = false;
    
    // Update final scores
    finalPlayers.forEach(p => {
        const player = players.get(p.socketId);
        if (player) {
            player.score = p.score;
        }
    });
    
    endGame();
});

socket.on('gamePaused', (isPaused) => {
    gameState.isPaused = isPaused;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
});

socket.on('roomFull', () => {
    showMessage('Room is full! Maximum 6 players allowed.', 'error');
});

// UI Functions
function showLobby() {
    lobbyScreen.classList.remove('hidden');
    waitingScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
}

function showWaitingRoom() {
    lobbyScreen.classList.add('hidden');
    waitingScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    
    document.getElementById('currentRoomId').textContent = roomId;
    const myPlayerObj = Array.from(players.values()).find(p => p.id === myPlayer.id);
    if (myPlayerObj) {
        document.getElementById('yourPlayerInfo').textContent = 
            `Player ${myPlayer.id} (${myPlayer.color.name}) - ${myPlayer.name}`;
        document.getElementById('controlsDisplay').textContent = 
            `↑ ${myPlayer.controls.up.toUpperCase()} | ↓ ${myPlayer.controls.down.toUpperCase()} | ← ${myPlayer.controls.left.toUpperCase()} | → ${myPlayer.controls.right.toUpperCase()}`;
    }
    
    // Enable start button for first player
    if (myPlayer.id === 1) {
        startGameBtn.disabled = false;
        document.querySelector('.waiting-note').textContent = 'You can start the game when ready!';
    }
}

function showGameScreen() {
    lobbyScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    document.getElementById('controlsDisplay').textContent = 
        `↑ ${myPlayer.controls.up.toUpperCase()} | ↓ ${myPlayer.controls.down.toUpperCase()} | ← ${myPlayer.controls.left.toUpperCase()} | → ${myPlayer.controls.right.toUpperCase()}`;
}

function updatePlayersList() {
    const playersList = document.getElementById('playersList');
    const playerCount = document.getElementById('playerCount');
    
    playersList.innerHTML = '';
    playerCount.textContent = players.size;
    
    Array.from(players.values()).forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = `player-item player${player.id}`;
        playerItem.innerHTML = `
            <div class="player-color-indicator" style="background-color: ${player.color.main}"></div>
            <span>Player ${player.id} (${player.color.name}): ${player.name}</span>
        `;
        playersList.appendChild(playerItem);
    });
}

function showMessage(text, type = 'success') {
    lobbyMessage.textContent = text;
    lobbyMessage.className = `message ${type}`;
    lobbyMessage.style.display = 'block';
}

function updateScoreboard() {
    const scoresDiv = document.getElementById('scores');
    scoresDiv.innerHTML = '';
    
    Array.from(players.values()).sort((a, b) => a.id - b.id).forEach(player => {
        const scoreDiv = document.createElement('div');
        scoreDiv.className = `score player${player.id}`;
        scoreDiv.innerHTML = `
            <span class="player-name">P${player.id} - ${player.name}</span>
            <span>${player.score}</span>
        `;
        scoresDiv.appendChild(scoreDiv);
    });
    
    document.getElementById('rescued').textContent = gameState.babiesRescued;
    document.getElementById('total').textContent = gameState.totalBabies;
    
    const minutes = Math.floor(gameState.elapsedTime / 60000);
    const seconds = Math.floor((gameState.elapsedTime % 60000) / 1000);
    document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function endGame() {
    const sortedPlayers = Array.from(players.values()).sort((a, b) => b.score - a.score);
    const maxScore = sortedPlayers[0].score;
    const winners = sortedPlayers.filter(p => p.score === maxScore);
    
    let winnerText = '';
    if (winners.length === 1) {
        winnerText = `🎉 ${winners[0].name} (Player ${winners[0].id}) wins with ${maxScore} points! 🎉`;
    } else {
        const winnerNames = winners.map(w => `${w.name} (P${w.id})`).join(', ');
        winnerText = `🎉 Tie! ${winnerNames} with ${maxScore} points each! 🎉`;
    }
    
    document.getElementById('winnerText').textContent = winnerText;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Event Listeners
joinBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    const room = roomIdInput.value.trim();
    
    if (!playerName || !room) {
        showMessage('Please enter both name and room ID', 'error');
        return;
    }
    
    socket.emit('joinRoom', { roomId: room, playerName: playerName });
});

createRoomBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    
    if (!playerName) {
        showMessage('Please enter your name first', 'error');
        return;
    }
    
    const randomRoom = 'ROOM' + Math.random().toString(36).substring(2, 8).toUpperCase();
    roomIdInput.value = randomRoom;
    socket.emit('joinRoom', { roomId: randomRoom, playerName: playerName });
});

startGameBtn.addEventListener('click', () => {
    socket.emit('startGame');
});

leaveRoomBtn.addEventListener('click', () => {
    location.reload();
});

pauseBtn.addEventListener('click', () => {
    socket.emit('pauseGame');
});

backToLobbyBtn.addEventListener('click', () => {
    location.reload();
});

// Keyboard handling
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Game loop
function update() {
    if (!gameState.isRunning || gameState.isPaused || !myPlayer) return;
    
    gameState.elapsedTime = Date.now() - gameState.startTime;
    
    const myPlayerObj = Array.from(players.values()).find(p => p.id === myPlayer.id);
    if (!myPlayerObj) return;
    
    let dx = 0, dy = 0;
    
    if (keys[myPlayer.controls.up.toLowerCase()]) dy = -1;
    if (keys[myPlayer.controls.down.toLowerCase()]) dy = 1;
    if (keys[myPlayer.controls.left.toLowerCase()]) dx = -1;
    if (keys[myPlayer.controls.right.toLowerCase()]) dx = 1;
    
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }
    
    if (dx !== 0 || dy !== 0) {
        const oldX = myPlayerObj.x;
        const oldY = myPlayerObj.y;
        
        myPlayerObj.move(dx, dy);
        
        // Check obstacle collision
        let hasCollision = false;
        obstacles.forEach(obstacle => {
            if (obstacle.checkCollision(myPlayerObj)) {
                hasCollision = true;
            }
        });
        
        if (hasCollision) {
            myPlayerObj.x = oldX;
            myPlayerObj.y = oldY;
            if (myPlayerObj.hasBaby && myPlayerObj.carriedBaby) {
                myPlayerObj.carriedBaby.x = myPlayerObj.x;
                myPlayerObj.carriedBaby.y = myPlayerObj.y - PLAYER_SIZE;
            }
        } else {
            // Emit movement to server
            socket.emit('playerMove', { 
                x: myPlayerObj.x, 
                y: myPlayerObj.y, 
                hasBaby: myPlayerObj.hasBaby 
            });
        }
    }
    
    // Check baby pickup
    if (!myPlayerObj.hasBaby) {
        babies.forEach(baby => {
            if (!baby.isRescued && !baby.isCarried && myPlayerObj.checkCollision(baby)) {
                myPlayerObj.hasBaby = true;
                myPlayerObj.carriedBaby = baby;
                baby.isCarried = true;
                socket.emit('babyPickup', { babyId: baby.id });
            }
        });
    }
    
    // Check safe zone delivery
    if (myPlayerObj.hasBaby && safeZone && safeZone.checkInside(myPlayerObj)) {
        myPlayerObj.score += 10;
        myPlayerObj.hasBaby = false;
        const babyId = myPlayerObj.carriedBaby.id;
        myPlayerObj.carriedBaby.isRescued = true;
        myPlayerObj.carriedBaby = null;
        
        socket.emit('babyRescue', { 
            babyId: babyId, 
            score: myPlayerObj.score 
        });
    }
}

function draw() {
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, GAME_HEIGHT - 150, GAME_WIDTH, 150);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    if (safeZone) {
        safeZone.draw();
        obstacles.forEach(obstacle => obstacle.draw());
        babies.forEach(baby => baby.draw());
        players.forEach(player => player.draw());
    } else {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🐧 Penguin Rescue 🐧', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);
        ctx.font = '24px Arial';
        ctx.fillText('Waiting for game to start...', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Timer update
setInterval(() => {
    if (gameState.isRunning && !gameState.isPaused) {
        updateScoreboard();
    }
}, 100);

// Start game loop
gameLoop();
