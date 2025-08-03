# First Person Platform Jumper

A fast-paced first-person platform jumping game built with HTML5 Canvas and JavaScript. Navigate through floating platforms and reach new heights!

## 🎮 How to Play

### Controls
- **WASD** or **Arrow Keys**: Move around
- **Space**: Jump
- **Mouse**: Look around (click canvas first to lock cursor)

### Objective
Jump between colorful floating platforms to reach higher levels. Your score increases based on the maximum height you achieve!

## 🚀 Features

- **First-Person Perspective**: Immersive 3D-like view using 2D canvas
- **Physics System**: Realistic gravity, momentum, and collision detection
- **Procedural Platforms**: Randomly generated platforms in a spiral pattern
- **Mouse Look**: Full 360° camera control with pitch and yaw
- **Score System**: Track your highest reached platform
- **Smooth Movement**: Momentum-based movement with friction
- **Visual Feedback**: Colorful platforms with depth shading

## 🛠️ Technical Details

### Architecture
- **Pure JavaScript**: No external libraries or frameworks
- **Canvas Rendering**: 2D canvas with 3D projection mathematics
- **Real-time Physics**: 60 FPS game loop with gravity and collision
- **Event-driven Input**: Keyboard and mouse event handling

### Key Components
- **Player System**: Position, velocity, and camera rotation
- **Platform Generation**: Procedural spiral platform layout
- **3D Projection**: Mathematical transformation from 3D world to 2D screen
- **Collision Detection**: AABB (Axis-Aligned Bounding Box) collision system

## 🎯 Game Mechanics

### Movement
- **Momentum**: Players maintain velocity and slide with friction
- **Gravity**: Constant downward acceleration
- **Ground Detection**: Platform collision enables jumping

### Platforms
- **Spiral Layout**: Platforms arranged in an ascending spiral
- **Color Coding**: Height-based HSL color progression
- **Varied Sizes**: Random platform dimensions for challenge

### Camera
- **Free Look**: Mouse controls yaw (horizontal) and pitch (vertical)
- **Pointer Lock**: Seamless mouse control when canvas is focused
- **FOV**: Configurable field of view for perspective projection

## 🚀 Getting Started

1. **Clone or Download** the project files
2. **Open** `index.html` in a modern web browser
3. **Click** the canvas to lock mouse cursor
4. **Start Playing** with WASD and Space!

## 🎨 Customization

### Easy Modifications
- **Platform Colors**: Modify the HSL values in `generatePlatforms()`
- **Physics**: Adjust gravity, jump power, and friction in the player object
- **Difficulty**: Change platform spacing and sizes
- **Camera**: Modify FOV and view distance for different perspectives

### Code Structure
```
game.js
├── FirstPersonPlatformer (Main class)
├── init() - Event listeners and setup
├── generatePlatforms() - Procedural platform creation
├── update() - Game logic and physics
├── render() - Drawing and 3D projection
└── gameLoop() - Main game loop
```

## 🌟 Tips for Players

1. **Build Momentum**: Use running jumps for longer distances
2. **Look Around**: Use mouse to spot the next platform
3. **Time Your Jumps**: Wait for the right moment at platform edges
4. **Don't Rush**: Take time to line up difficult jumps
5. **Practice**: The controls become intuitive with practice

## 🔧 Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support  
- **Safari**: Full support
- **Mobile**: Limited (no pointer lock support)

## 📝 License

This project is open source and available under the MIT License.

---

**Have fun jumping to new heights! 🏃‍♂️💨**