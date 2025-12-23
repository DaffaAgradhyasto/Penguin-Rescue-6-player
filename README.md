# 🐧 Penguin Rescue - 6 Player Multiplayer 🐧

A fun multiplayer game where up to 6 players work together (or compete!) to rescue baby penguins and bring them to the safe zone!

## 🎮 Two Game Modes

### 🏠 Local Multiplayer
Play with friends on the same computer using one keyboard - perfect for couch gaming!

### 🌐 Online Multiplayer (NEW!)
Play with friends anywhere in the world via internet connection! Create or join rooms and play together in real-time.

## 🎮 How to Play

### Objective
Rescue all the baby penguins (marked with ❗) and bring them to the green SAFE ZONE at the bottom of the screen. The player with the most rescues wins!

### Game Mechanics
1. **Pick up baby penguins** by moving your penguin character close to them
2. **Avoid obstacles** (ice blocks) while carrying the babies
3. **Deliver to the safe zone** to score points (10 points per rescue)
4. The game ends when all 10 baby penguins are rescued

### Controls

| Player | Color  | Controls |
|--------|--------|----------|
| Player 1 | Red 🔴 | **W** (up), **A** (left), **S** (down), **D** (right) |
| Player 2 | Blue 🔵 | **Arrow Keys** (↑ ↓ ← →) |
| Player 3 | Green 🟢 | **T** (up), **F** (left), **G** (down), **H** (right) |
| Player 4 | Yellow 🟡 | **I** (up), **J** (left), **K** (down), **L** (right) |
| Player 5 | Purple 🟣 | **Numpad 8** (up), **4** (left), **5** (down), **6** (right) |
| Player 6 | Orange 🟠 | **U** (up), **B** (left), **N** (down), **Y** (right) |

## 🚀 Getting Started

### Quick Start (Both Modes Available)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DaffaAgradhyasto/Penguin-Rescue-6-player.git
   cd Penguin-Rescue-6-player
   ```

2. **Install dependencies (for online mode):**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   The server will start on `http://localhost:3000`

4. **Open in browser:**
   - Navigate to `http://localhost:3000`
   - Choose between Local or Online multiplayer mode

### Local Multiplayer Mode

**No server required!** Just open `local.html` directly in your browser.

- All players use the same keyboard
- Instant play, no setup needed
- Perfect for family game nights

### Online Multiplayer Mode

**Requires server running:**

1. One person starts the server (see step 3 above)
2. Share your server URL or deploy to a hosting service
3. Players join the same room using a room code
4. Up to 6 players can join each room
5. Host (Player 1) starts the game when everyone is ready

## 🎯 Features

### Local Multiplayer
- ✅ **6 Player Same-Device Gaming** - All players on one keyboard
- ✅ **Unique Player Colors** - Each player has a distinct colored penguin
- ✅ **No Internet Required** - Play offline anytime
- ✅ **Instant Start** - No setup or account needed

### Online Multiplayer (NEW!)
- ✅ **6 Player Online Gaming** - Play with friends anywhere
- ✅ **Room-Based Matchmaking** - Create or join game rooms
- ✅ **Real-time Synchronization** - Smooth multiplayer experience
- ✅ **Room Codes** - Easy sharing to invite friends
- ✅ **Host Controls** - Room creator starts the game

### Core Gameplay
- ✅ **Real-time Scoring** - Track each player's score in real-time
- ✅ **Collision Detection** - Navigate around obstacles
- ✅ **Timer** - See how fast you can rescue all the babies
- ✅ **Pause/Resume** - Pause the game anytime
- ✅ **Restart Functionality** - Play multiple rounds
- ✅ **Responsive UI** - Clean and colorful interface

## 🛠️ Technology Stack

### Frontend
- **HTML5 Canvas** - For game rendering
- **Vanilla JavaScript** - Game logic and mechanics
- **CSS3** - Styling and layout
- **Socket.IO Client** - Real-time communication for online mode

### Backend (Online Mode)
- **Node.js** - Server runtime
- **Express** - Web server framework
- **Socket.IO** - WebSocket server for real-time multiplayer

### Deployment
- **Heroku-ready** - Includes Procfile for easy deployment
- **Environment variables** - PORT configuration for hosting services

## 🚀 Deployment

### Deploy to Heroku

1. **Create a Heroku account** at [heroku.com](https://heroku.com)

2. **Install Heroku CLI:**
   ```bash
   # On macOS
   brew install heroku/brew/heroku
   
   # On Ubuntu
   curl https://cli-assets.heroku.com/install.sh | sh
   ```

3. **Login to Heroku:**
   ```bash
   heroku login
   ```

4. **Create a new Heroku app:**
   ```bash
   heroku create penguin-rescue-game
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   ```

6. **Open your deployed game:**
   ```bash
   heroku open
   ```

Your game will be live at `https://your-app-name.herokuapp.com`!

### Deploy to Other Platforms

**Render:**
1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Deploy!

**Railway:**
1. Connect your GitHub repository
2. Railway will auto-detect Node.js
3. Deploy!

**DigitalOcean App Platform:**
1. Connect your GitHub repository
2. Select Node.js environment
3. Set run command: `npm start`
4. Deploy!

### Environment Variables

If deploying to a custom server, set:
- `PORT` - The port number (default: 3000)

## 📸 Screenshots

![Game Start Screen](https://github.com/user-attachments/assets/049ed698-291f-48ec-96bc-b735b5ad52e6)
*Game start screen with instructions and controls*

![Gameplay](https://github.com/user-attachments/assets/18aa9092-d351-49f8-a21c-f71ebfae5254)
*All 6 players, baby penguins, obstacles, and the safe zone*

## 🎨 Game Design

- **Players**: 6 uniquely colored penguin characters
- **Babies**: 10 baby penguins to rescue (pink colored)
- **Obstacles**: Ice blocks that players must navigate around
- **Safe Zone**: Green zone at the bottom where babies must be delivered
- **Arena**: Arctic-themed environment with sky and snow

## 🤝 Contributing

Feel free to fork this project and add your own features! Some ideas:
- More levels with different layouts
- Power-ups and special abilities
- Different obstacle types
- Mobile touch controls
- Voice chat integration
- Tournament mode

## 📝 License

This project is open source and available for educational and entertainment purposes.

## 🎉 Credits

Created as a fun local multiplayer game for friends and family to enjoy together!

---

**Enjoy playing Penguin Rescue! 🐧❄️**
