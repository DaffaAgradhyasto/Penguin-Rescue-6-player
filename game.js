// Game Configuration
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 700;
const PLAYER_SIZE = 30;
const BABY_SIZE = 20;
const OBSTACLE_WIDTH = 60;
const OBSTACLE_HEIGHT = 60;
const SAFE_ZONE_SIZE = 150;
const PLAYER_SPEED = 4;

// Game State
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
    { main: '#e53935', dark: '#b71c1c', name: 'Red' },    // Player 1
    { main: '#1e88e5', dark: '#0d47a1', name: 'Blue' },   // Player 2
    { main: '#43a047', dark: '#1b5e20', name: 'Green' },  // Player 3
    { main: '#fdd835', dark: '#f57f17', name: 'Yellow' }, // Player 4
    { main: '#8e24aa', dark: '#4a148c', name: 'Purple' }, // Player 5
    { main: '#fb8c00', dark: '#e65100', name: 'Orange' }  // Player 6
];

// Players
class Player {
    constructor(id, x, y, color, controls) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.color = color;
        this.controls = controls;
        this.score = 0;
        this.hasaBaby = false;
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

        // Player number
        ctx.fillStyle = this.color.dark;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`P${this.id}`, this.x, this.y + PLAYER_SIZE + 15);

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

        // Boundary checking
        if (newX >= PLAYER_SIZE / 2 && newX <= GAME_WIDTH - PLAYER_SIZE / 2) {
            this.x = newX;
        }
        if (newY >= PLAYER_SIZE / 2 && newY <= GAME_HEIGHT - PLAYER_SIZE / 2) {
            this.y = newY;
        }

        // Move carried baby with player
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

// Baby Penguin
class Baby {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = BABY_SIZE;
        this.isRescued = false;
        this.isCarried = false;
    }

    draw() {
        if (this.isRescued || this.isCarried) return;

        // Baby penguin (smaller, pink)
        ctx.fillStyle = '#ff69b4';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.size / 2, this.size / 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
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

        // Exclamation mark (needs help)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('!', this.x, this.y - this.size);
    }
}

// Obstacle
class Obstacle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.size = Math.max(width, height);
    }

    draw() {
        // Ice block
        ctx.fillStyle = '#b3e5fc';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        ctx.strokeStyle = '#81d4fa';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // Ice details
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

// Safe Zone
class SafeZone {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
    }

    draw() {
        // Green safe zone
        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 4;
        ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);

        // Safe zone text
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

// Game Objects
let players = [];
let babies = [];
let obstacles = [];
let safeZone;
let keys = {};

// Key mappings for 6 players
const KEY_MAPPINGS = [
    { up: 'w', down: 's', left: 'a', right: 'd' },           // Player 1
    { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }, // Player 2
    { up: 't', down: 'g', left: 'f', right: 'h' },           // Player 3
    { up: 'i', down: 'k', left: 'j', right: 'l' },           // Player 4
    { up: '8', down: '5', left: '4', right: '6' },           // Player 5 (Numpad)
    { up: 'u', down: 'n', left: 'h', right: 'y' }            // Player 6
];

// Initialize Game
function initGame() {
    players = [];
    babies = [];
    obstacles = [];
    
    // Create players
    const startPositions = [
        { x: 100, y: 100 },
        { x: 100, y: 300 },
        { x: 100, y: 500 },
        { x: GAME_WIDTH - 100, y: 100 },
        { x: GAME_WIDTH - 100, y: 300 },
        { x: GAME_WIDTH - 100, y: 500 }
    ];

    for (let i = 0; i < 6; i++) {
        players.push(new Player(
            i + 1,
            startPositions[i].x,
            startPositions[i].y,
            PLAYER_COLORS[i],
            KEY_MAPPINGS[i]
        ));
    }

    // Create safe zone
    safeZone = new SafeZone(GAME_WIDTH / 2, GAME_HEIGHT - 100, SAFE_ZONE_SIZE);

    // Create babies at random positions
    for (let i = 0; i < gameState.totalBabies; i++) {
        let x, y, validPosition;
        do {
            x = Math.random() * (GAME_WIDTH - 200) + 100;
            y = Math.random() * (GAME_HEIGHT - 300) + 100;
            validPosition = true;

            // Check if too close to safe zone
            if (Math.abs(x - safeZone.x) < 150 && Math.abs(y - safeZone.y) < 150) {
                validPosition = false;
            }
        } while (!validPosition);

        babies.push(new Baby(x, y));
    }

    // Create obstacles
    const obstaclePositions = [
        { x: 300, y: 200 },
        { x: 500, y: 350 },
        { x: 700, y: 200 },
        { x: 900, y: 400 },
        { x: 400, y: 500 },
        { x: 800, y: 500 },
        { x: 600, y: 150 }
    ];

    obstaclePositions.forEach(pos => {
        obstacles.push(new Obstacle(pos.x, pos.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT));
    });

    // Reset scores and game state
    players.forEach(p => p.score = 0);
    gameState.babiesRescued = 0;
    gameState.startTime = Date.now();
    gameState.elapsedTime = 0;
    
    updateScoreboard();
}

// Handle keyboard input
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Update game state
function update() {
    if (!gameState.isRunning || gameState.isPaused) return;

    // Update timer
    gameState.elapsedTime = Date.now() - gameState.startTime;

    // Move players
    players.forEach(player => {
        let dx = 0, dy = 0;

        if (keys[player.controls.up.toLowerCase()]) dy = -1;
        if (keys[player.controls.down.toLowerCase()]) dy = 1;
        if (keys[player.controls.left.toLowerCase()]) dx = -1;
        if (keys[player.controls.right.toLowerCase()]) dx = 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        if (dx !== 0 || dy !== 0) {
            const oldX = player.x;
            const oldY = player.y;
            
            player.move(dx, dy);

            // Check obstacle collision
            obstacles.forEach(obstacle => {
                if (obstacle.checkCollision(player)) {
                    player.x = oldX;
                    player.y = oldY;
                    if (player.hasBaby && player.carriedBaby) {
                        player.carriedBaby.x = player.x;
                        player.carriedBaby.y = player.y - PLAYER_SIZE;
                    }
                }
            });
        }

        // Check baby pickup
        if (!player.hasBaby) {
            babies.forEach(baby => {
                if (!baby.isRescued && !baby.isCarried && player.checkCollision(baby)) {
                    player.hasBaby = true;
                    player.carriedBaby = baby;
                    baby.isCarried = true;
                }
            });
        }

        // Check safe zone delivery
        if (player.hasBaby && safeZone.checkInside(player)) {
            player.score += 10;
            player.hasBaby = false;
            player.carriedBaby.isRescued = true;
            player.carriedBaby = null;
            gameState.babiesRescued++;
            updateScoreboard();

            // Check win condition
            if (gameState.babiesRescued >= gameState.totalBabies) {
                endGame();
            }
        }
    });
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw ground
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, GAME_HEIGHT - 150, GAME_WIDTH, 150);

    // Draw snow/ice pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Only draw game objects if they're initialized
    if (safeZone) {
        // Draw safe zone
        safeZone.draw();

        // Draw obstacles
        obstacles.forEach(obstacle => obstacle.draw());

        // Draw babies
        babies.forEach(baby => baby.draw());

        // Draw players
        players.forEach(player => player.draw());
    } else {
        // Draw welcome message
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🐧 Penguin Rescue 🐧', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);
        ctx.font = '24px Arial';
        ctx.fillText('Press "Start Game" to begin!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Update scoreboard
function updateScoreboard() {
    players.forEach((player, i) => {
        document.getElementById(`score${i + 1}`).textContent = player.score;
    });
    document.getElementById('rescued').textContent = gameState.babiesRescued;
    document.getElementById('total').textContent = gameState.totalBabies;
    
    const minutes = Math.floor(gameState.elapsedTime / 60000);
    const seconds = Math.floor((gameState.elapsedTime % 60000) / 1000);
    document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// End game
function endGame() {
    gameState.isRunning = false;
    
    // Find winner
    let maxScore = 0;
    let winners = [];
    players.forEach(player => {
        if (player.score > maxScore) {
            maxScore = player.score;
            winners = [player];
        } else if (player.score === maxScore) {
            winners.push(player);
        }
    });

    let winnerText = '';
    if (winners.length === 1) {
        winnerText = `🎉 Player ${winners[0].id} (${winners[0].color.name}) wins with ${maxScore} points! 🎉`;
    } else {
        const winnerIds = winners.map(w => `Player ${w.id}`).join(', ');
        winnerText = `🎉 Tie! ${winnerIds} with ${maxScore} points each! 🎉`;
    }

    document.getElementById('winnerText').textContent = winnerText;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Button handlers
document.getElementById('startBtn').addEventListener('click', () => {
    initGame();
    gameState.isRunning = true;
    gameState.isPaused = false;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('gameOver').classList.add('hidden');
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    gameState.isPaused = !gameState.isPaused;
    document.getElementById('pauseBtn').textContent = gameState.isPaused ? 'Resume' : 'Pause';
});

document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    initGame();
    gameState.isRunning = true;
    gameState.isPaused = false;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
});

// Timer update loop
setInterval(() => {
    if (gameState.isRunning && !gameState.isPaused) {
        updateScoreboard();
    }
}, 100);

// Start game loop
gameLoop();
