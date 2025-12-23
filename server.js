// Online Multiplayer Server for Penguin Rescue Game
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Game rooms storage
const gameRooms = new Map();

// Player colors
const PLAYER_COLORS = [
    { main: '#e53935', dark: '#b71c1c', name: 'Red' },
    { main: '#1e88e5', dark: '#0d47a1', name: 'Blue' },
    { main: '#43a047', dark: '#1b5e20', name: 'Green' },
    { main: '#fdd835', dark: '#f57f17', name: 'Yellow' },
    { main: '#8e24aa', dark: '#4a148c', name: 'Purple' },
    { main: '#fb8c00', dark: '#e65100', name: 'Orange' }
];

// Key mappings for 6 players
const KEY_MAPPINGS = [
    { up: 'w', down: 's', left: 'a', right: 'd' },
    { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
    { up: 't', down: 'g', left: 'f', right: 'h' },
    { up: 'i', down: 'k', left: 'j', right: 'l' },
    { up: '8', down: '5', left: '4', right: '6' },
    { up: 'u', down: 'n', left: 'b', right: 'y' }
];

class GameRoom {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = new Map();
        this.gameState = {
            isRunning: false,
            isPaused: false,
            babiesRescued: 0,
            totalBabies: 10,
            babies: [],
            obstacles: [],
            startTime: null
        };
        this.maxPlayers = 6;
    }

    addPlayer(socketId, playerName) {
        if (this.players.size >= this.maxPlayers) {
            return null;
        }

        const playerId = this.players.size + 1;
        const startPositions = [
            { x: 100, y: 100 },
            { x: 100, y: 300 },
            { x: 100, y: 500 },
            { x: 1100, y: 100 },
            { x: 1100, y: 300 },
            { x: 1100, y: 500 }
        ];

        const player = {
            id: playerId,
            socketId: socketId,
            name: playerName,
            x: startPositions[playerId - 1].x,
            y: startPositions[playerId - 1].y,
            color: PLAYER_COLORS[playerId - 1],
            controls: KEY_MAPPINGS[playerId - 1],
            score: 0,
            hasBaby: false
        };

        this.players.set(socketId, player);
        return player;
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
    }

    getPlayers() {
        return Array.from(this.players.values());
    }

    updatePlayerPosition(socketId, x, y, hasBaby) {
        const player = this.players.get(socketId);
        if (player) {
            player.x = x;
            player.y = y;
            player.hasBaby = hasBaby;
        }
    }

    updatePlayerScore(socketId, score) {
        const player = this.players.get(socketId);
        if (player) {
            player.score = score;
        }
    }

    initGame() {
        // Initialize babies
        this.gameState.babies = [];
        for (let i = 0; i < this.gameState.totalBabies; i++) {
            let x, y;
            do {
                x = Math.random() * 1000 + 100;
                y = Math.random() * 400 + 100;
            } while (Math.abs(x - 600) < 150 && Math.abs(y - 600) < 150);

            this.gameState.babies.push({
                id: i,
                x: x,
                y: y,
                isRescued: false,
                isCarried: false,
                carriedBy: null
            });
        }

        // Initialize obstacles
        this.gameState.obstacles = [
            { x: 300, y: 200, width: 60, height: 60 },
            { x: 500, y: 350, width: 60, height: 60 },
            { x: 700, y: 200, width: 60, height: 60 },
            { x: 900, y: 400, width: 60, height: 60 },
            { x: 400, y: 500, width: 60, height: 60 },
            { x: 800, y: 500, width: 60, height: 60 },
            { x: 600, y: 150, width: 60, height: 60 }
        ];

        this.gameState.babiesRescued = 0;
        this.gameState.isRunning = true;
        this.gameState.isPaused = false;
        this.gameState.startTime = Date.now();

        // Reset player scores
        this.players.forEach(player => {
            player.score = 0;
            player.hasBaby = false;
        });
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Join room
    socket.on('joinRoom', ({ roomId, playerName }) => {
        // Create room if it doesn't exist
        if (!gameRooms.has(roomId)) {
            gameRooms.set(roomId, new GameRoom(roomId));
        }

        const room = gameRooms.get(roomId);
        
        // Check if room is full
        if (room.players.size >= room.maxPlayers) {
            socket.emit('roomFull');
            return;
        }

        // Add player to room
        const player = room.addPlayer(socket.id, playerName);
        if (!player) {
            socket.emit('roomFull');
            return;
        }

        socket.join(roomId);
        socket.roomId = roomId;

        // Send player info and room state
        socket.emit('playerJoined', {
            player: player,
            players: room.getPlayers(),
            gameState: room.gameState
        });

        // Notify other players
        socket.to(roomId).emit('playerConnected', player);

        console.log(`Player ${playerName} joined room ${roomId} as Player ${player.id}`);
    });

    // Start game
    socket.on('startGame', () => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const room = gameRooms.get(roomId);
        if (!room) return;

        room.initGame();
        io.to(roomId).emit('gameStarted', {
            gameState: room.gameState,
            players: room.getPlayers()
        });

        console.log(`Game started in room ${roomId}`);
    });

    // Player movement
    socket.on('playerMove', ({ x, y, hasBaby }) => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const room = gameRooms.get(roomId);
        if (!room) return;

        room.updatePlayerPosition(socket.id, x, y, hasBaby);
        
        // Broadcast to other players
        socket.to(roomId).emit('playerMoved', {
            socketId: socket.id,
            x: x,
            y: y,
            hasBaby: hasBaby
        });
    });

    // Baby pickup
    socket.on('babyPickup', ({ babyId }) => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const room = gameRooms.get(roomId);
        if (!room) return;

        const baby = room.gameState.babies.find(b => b.id === babyId);
        if (baby && !baby.isCarried && !baby.isRescued) {
            baby.isCarried = true;
            baby.carriedBy = socket.id;

            io.to(roomId).emit('babyPickedUp', {
                babyId: babyId,
                socketId: socket.id
            });
        }
    });

    // Baby rescue
    socket.on('babyRescue', ({ babyId, score }) => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const room = gameRooms.get(roomId);
        if (!room) return;

        const baby = room.gameState.babies.find(b => b.id === babyId);
        if (baby && baby.isCarried && baby.carriedBy === socket.id) {
            baby.isRescued = true;
            baby.isCarried = false;
            baby.carriedBy = null;
            room.gameState.babiesRescued++;
            room.updatePlayerScore(socket.id, score);

            io.to(roomId).emit('babyRescued', {
                babyId: babyId,
                socketId: socket.id,
                score: score,
                babiesRescued: room.gameState.babiesRescued
            });

            // Check win condition
            if (room.gameState.babiesRescued >= room.gameState.totalBabies) {
                io.to(roomId).emit('gameComplete', {
                    players: room.getPlayers()
                });
            }
        }
    });

    // Pause game
    socket.on('pauseGame', () => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const room = gameRooms.get(roomId);
        if (!room) return;

        room.gameState.isPaused = !room.gameState.isPaused;
        io.to(roomId).emit('gamePaused', room.gameState.isPaused);
    });

    // Disconnect
    socket.on('disconnect', () => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const room = gameRooms.get(roomId);
        if (!room) return;

        room.removePlayer(socket.id);
        
        // Notify other players
        socket.to(roomId).emit('playerDisconnected', socket.id);

        // Clean up empty rooms
        if (room.players.size === 0) {
            gameRooms.delete(roomId);
            console.log(`Room ${roomId} deleted (empty)`);
        }

        console.log(`Client disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`🐧 Penguin Rescue Server running on port ${PORT}`);
    console.log(`🌐 Access the game at http://localhost:${PORT}`);
});
