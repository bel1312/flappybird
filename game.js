class FlappyBird {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.bird = {
            x: 150, y: 300, width: 30, height: 30,
            velocity: 0, gravity: 0.35, jumpPower: -9, rotation: 0,
            energy: 100, maxEnergy: 100, size: 30, trail: []
        };
        
        this.pipes = [];
        this.particles = [];
        this.powerUps = [];
        this.enemies = [];
        this.portals = [];
        this.score = 0;
        this.multiplier = 1;
        this.bestScore = localStorage.getItem('flappyBest') || 0;
        this.gameState = 'playing';
        this.pipeSpeed = 3;
        this.worldTime = 0;
        this.timeOfDay = 'day';
        this.weather = 'clear';
        this.cameraShake = 0;
        this.slowMotion = 0;
        this.combo = 0;
        this.comboTimer = 0;
        
        // Power-up states
        this.shieldTime = 0;
        this.magnetTime = 0;
        this.ghostTime = 0;
        this.fireMode = 0;
        this.timeWarp = 0;
        
        this.init();
        this.generateWorld();
        this.gameLoop();
    }
    
    init() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.flap();
            }
        });
        
        this.canvas.addEventListener('click', () => this.flap());
        document.getElementById('best').textContent = this.bestScore;
    }
    
    flap() {
        if (this.gameState === 'playing') {
            if (this.bird.energy > 10) {
                this.bird.velocity = this.bird.jumpPower;
                this.bird.rotation = -0.4;
                this.bird.energy -= 5;
                
                // Energy flap creates more particles
                const particleCount = Math.floor(this.bird.energy / 10) + 8;
                for (let i = 0; i < particleCount; i++) {
                    this.particles.push({
                        x: this.bird.x + Math.random() * this.bird.width,
                        y: this.bird.y + this.bird.height/2,
                        vx: Math.random() * 10 - 12,
                        vy: Math.random() * 8 - 4,
                        life: 30, maxLife: 30,
                        color: `hsl(${180 + this.bird.energy}, 90%, 70%)`,
                        size: Math.random() * 5 + 2,
                        type: 'energy'
                    });
                }
                
                // Fire mode creates projectiles
                if (this.fireMode > 0) {
                    this.createProjectile();
                }
            }
        } else if (this.gameState === 'gameOver') {
            this.restart();
        }
    }
    
    generateWorld() {
        for (let i = 0; i < 4; i++) {
            this.addPipe(this.canvas.width + i * 250);
        }
    }
    
    addPipe(x) {
        const minHeight = 80;
        const maxHeight = this.canvas.height - 200 - minHeight;
        const topHeight = minHeight + Math.random() * (maxHeight - minHeight);
        const gap = 160 + Math.random() * 40;
        
        // Pipe types with unique mechanics
        const types = ['normal', 'crystal', 'laser', 'portal', 'wind', 'electric'];
        const type = Math.random() < 0.7 ? 'normal' : types[Math.floor(Math.random() * types.length)];
        
        const pipe = {
            x: x, topHeight: topHeight, bottomY: topHeight + gap,
            bottomHeight: this.canvas.height - (topHeight + gap),
            passed: false, type: type, gap: gap,
            health: type === 'crystal' ? 3 : 1,
            charge: 0, pulsePhase: Math.random() * Math.PI * 2
        };
        
        // Type-specific properties
        switch(type) {
            case 'crystal':
                pipe.color = '#e74c3c';
                pipe.fragments = [];
                break;
            case 'laser':
                pipe.color = '#f39c12';
                pipe.laserActive = false;
                break;
            case 'portal':
                pipe.color = '#9b59b6';
                this.addPortal(x + 30, topHeight + gap/2);
                break;
            case 'wind':
                pipe.color = '#3498db';
                pipe.windForce = 0;
                break;
            case 'electric':
                pipe.color = '#f1c40f';
                pipe.electricity = [];
                break;
            default:
                pipe.color = `hsl(${120 + Math.random() * 60}, 70%, 50%)`;
        }
        
        this.pipes.push(pipe);
        
        // Add power-ups and enemies
        if (Math.random() < 0.4) this.addPowerUp(x + 30, topHeight + gap/2);
        if (Math.random() < 0.2) this.addEnemy(x + 100, topHeight + gap/2);
    }
    
    addPowerUp(x, y) {
        const types = ['energy', 'shield', 'magnet', 'fire', 'time', 'multi'];
        const type = types[Math.floor(Math.random() * types.length)];
        const colors = {
            energy: '#2ecc71', shield: '#00ffff', magnet: '#ffd700',
            fire: '#e74c3c', time: '#9b59b6', multi: '#e67e22'
        };
        
        this.powerUps.push({
            x, y, size: 15, pulse: 0, collected: false,
            type, color: colors[type], trail: [],
            orbitAngle: 0, orbitRadius: 20
        });
    }
    
    addEnemy(x, y) {
        const types = ['drone', 'seeker', 'bomber'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.enemies.push({
            x, y, type, health: 2,
            vx: -2, vy: Math.random() * 2 - 1,
            size: 20, color: '#e74c3c',
            shootTimer: 0, trail: []
        });
    }
    
    addPortal(x, y) {
        this.portals.push({
            x, y, size: 25, rotation: 0,
            particles: [], active: true
        });
    }
    
    createProjectile() {
        this.particles.push({
            x: this.bird.x + this.bird.width,
            y: this.bird.y + this.bird.height/2,
            vx: 8, vy: 0, life: 60, maxLife: 60,
            color: '#ff4500', size: 4, type: 'projectile'
        });
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.worldTime += 0.02;
        this.updateTimeAndWeather();
        this.updateBird();
        this.updatePipes();
        this.updatePowerUps();
        this.updateEnemies();
        this.updatePortals();
        this.updateParticles();
        this.updateEffects();
        this.checkCollisions();
        this.updateUI();
    }
    
    updateTimeAndWeather() {
        // Dynamic time of day (day/night only)
        const timePhase = (this.worldTime * 0.1) % (Math.PI * 2);
        this.timeOfDay = timePhase < Math.PI ? 'day' : 'night';
        
        // Weather changes
        if (Math.random() < 0.001) {
            this.weather = Math.random() < 0.5 ? 'rain' : 'clear';
        }
    }
    
    updateBird() {
        // Apply time warp
        const timeScale = this.timeWarp > 0 ? 0.3 : 1;
        
        this.bird.velocity += this.bird.gravity * timeScale;
        this.bird.y += this.bird.velocity * timeScale;
        this.bird.rotation = Math.min(Math.max(this.bird.velocity * 0.06, -0.6), 1.4);
        
        // Energy regeneration
        this.bird.energy = Math.min(this.bird.energy + 0.3, this.bird.maxEnergy);
        
        // Size power-up effect
        if (this.bird.size > 30) {
            this.bird.size = Math.max(30, this.bird.size - 0.5);
        }
        
        // Trail effect
        this.bird.trail.push({
            x: this.bird.x + this.bird.width/2,
            y: this.bird.y + this.bird.height/2,
            life: 15
        });
        this.bird.trail = this.bird.trail.filter(t => t.life-- > 0);
        
        // Combo system
        if (this.comboTimer > 0) {
            this.comboTimer--;
        } else {
            this.combo = 0;
            this.multiplier = 1;
        }
    }
    
    updatePipes() {
        this.pipes.forEach(pipe => {
            pipe.x -= this.pipeSpeed;
            pipe.charge += 0.1;
            
            // Type-specific updates
            switch(pipe.type) {
                case 'laser':
                    pipe.laserActive = Math.sin(pipe.charge) > 0.5;
                    break;
                case 'wind':
                    pipe.windForce = Math.sin(pipe.charge * 2) * 3;
                    if (Math.abs(this.bird.x - pipe.x) < 100) {
                        this.bird.velocity += pipe.windForce * 0.1;
                    }
                    break;
                case 'electric':
                    if (Math.random() < 0.1) {
                        pipe.electricity.push({
                            x: pipe.x + Math.random() * 60,
                            y: Math.random() * this.canvas.height,
                            life: 10
                        });
                    }
                    pipe.electricity = pipe.electricity.filter(e => e.life-- > 0);
                    break;
            }
            
            if (!pipe.passed && pipe.x + 60 < this.bird.x) {
                pipe.passed = true;
                this.addScore(pipe.type === 'normal' ? 1 : 3);
                this.addCombo();
            }
        });
        
        this.pipes = this.pipes.filter(pipe => pipe.x > -100);
        
        if (this.pipes.length < 4) {
            const lastPipe = this.pipes[this.pipes.length - 1];
            this.addPipe(lastPipe.x + 250);
        }
    }
    
    updatePowerUps() {
        this.powerUps.forEach(powerUp => {
            powerUp.x -= this.pipeSpeed;
            powerUp.pulse += 0.15;
            powerUp.orbitAngle += 0.1;
            
            // Orbital motion
            powerUp.y += Math.sin(powerUp.orbitAngle) * 0.5;
            
            // Trail
            powerUp.trail.push({
                x: powerUp.x, y: powerUp.y, life: 12,
                color: powerUp.color
            });
            powerUp.trail = powerUp.trail.filter(t => t.life-- > 0);
            
            // Magnet effect
            if (this.magnetTime > 0) {
                const dx = this.bird.x - powerUp.x;
                const dy = this.bird.y - powerUp.y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                if (distance < 150) {
                    powerUp.x += dx * 0.1;
                    powerUp.y += dy * 0.1;
                }
            }
        });
        
        this.powerUps = this.powerUps.filter(p => p.x > -50 && !p.collected);
    }
    
    updateEnemies() {
        this.enemies.forEach(enemy => {
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            
            // AI behavior
            if (enemy.type === 'seeker') {
                const dx = this.bird.x - enemy.x;
                const dy = this.bird.y - enemy.y;
                enemy.vx += dx * 0.001;
                enemy.vy += dy * 0.001;
            }
            
            // Trail
            enemy.trail.push({ x: enemy.x, y: enemy.y, life: 8 });
            enemy.trail = enemy.trail.filter(t => t.life-- > 0);
        });
        
        this.enemies = this.enemies.filter(e => e.x > -50 && e.health > 0);
    }
    
    updatePortals() {
        this.portals.forEach(portal => {
            portal.x -= this.pipeSpeed;
            portal.rotation += 0.1;
            
            // Portal particles
            if (Math.random() < 0.3) {
                this.particles.push({
                    x: portal.x + Math.random() * 20 - 10,
                    y: portal.y + Math.random() * 20 - 10,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 20, maxLife: 20,
                    color: '#9b59b6', size: 3, type: 'portal'
                });
            }
        });
        
        this.portals = this.portals.filter(p => p.x > -50);
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.type === 'energy') {
                particle.vy += 0.1;
            } else if (particle.type === 'projectile') {
                // Check projectile collisions with enemies
                this.enemies.forEach(enemy => {
                    const dx = particle.x - enemy.x;
                    const dy = particle.y - enemy.y;
                    if (Math.sqrt(dx*dx + dy*dy) < enemy.size) {
                        enemy.health--;
                        particle.life = 0;
                        this.createExplosion(enemy.x, enemy.y);
                    }
                });
            } else {
                particle.vy += 0.2;
            }
            
            particle.life--;
            return particle.life > 0;
        });
        
        // Weather particles
        if (this.weather === 'rain' && Math.random() < 0.3) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: -10, vx: -2, vy: 8,
                life: 100, maxLife: 100,
                color: '#3498db', size: 1, type: 'rain'
            });
        }
    }
    
    updateEffects() {
        this.shieldTime = Math.max(0, this.shieldTime - 1);
        this.magnetTime = Math.max(0, this.magnetTime - 1);
        this.ghostTime = Math.max(0, this.ghostTime - 1);
        this.fireMode = Math.max(0, this.fireMode - 1);
        this.timeWarp = Math.max(0, this.timeWarp - 1);
        this.cameraShake = Math.max(0, this.cameraShake - 1);
        this.slowMotion = Math.max(0, this.slowMotion - 1);
        
        // Shield particles
        if (this.shieldTime > 0 && Math.random() < 0.4) {
            this.particles.push({
                x: this.bird.x + Math.random() * this.bird.width,
                y: this.bird.y + Math.random() * this.bird.height,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 25, maxLife: 25,
                color: '#00ffff', size: 2, type: 'shield'
            });
        }
    }
    
    checkCollisions() {
        // Ground/ceiling
        if (this.bird.y + this.bird.height >= this.canvas.height - 20 || this.bird.y <= 0) {
            this.gameOver();
            return;
        }
        
        // Pipe collisions (unless shielded)
        if (this.shieldTime <= 0) {
            this.pipes.forEach(pipe => {
                if (this.bird.x < pipe.x + 60 && this.bird.x + this.bird.width > pipe.x) {
                    if (this.bird.y < pipe.topHeight || this.bird.y + this.bird.height > pipe.bottomY) {
                        if (pipe.type === 'crystal' && pipe.health > 1) {
                            pipe.health--;
                            this.createCrystalFragments(pipe);
                            this.cameraShake = 10;
                        } else {
                            this.gameOver();
                            return;
                        }
                    }
                }
            });
        }
        
        // Power-up collisions
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected) {
                const dx = this.bird.x + this.bird.width/2 - powerUp.x;
                const dy = this.bird.y + this.bird.height/2 - powerUp.y;
                if (Math.sqrt(dx*dx + dy*dy) < powerUp.size + 15) {
                    powerUp.collected = true;
                    this.activatePowerUp(powerUp.type);
                    this.createPowerUpExplosion(powerUp);
                }
            }
        });
        
        // Portal collisions
        this.portals.forEach(portal => {
            const dx = this.bird.x + this.bird.width/2 - portal.x;
            const dy = this.bird.y + this.bird.height/2 - portal.y;
            if (Math.sqrt(dx*dx + dy*dy) < portal.size) {
                this.bird.x += 200; // Teleport forward
                this.createPortalEffect(portal);
            }
        });
    }
    
    activatePowerUp(type) {
        switch(type) {
            case 'energy': this.bird.energy = this.bird.maxEnergy; break;
            case 'shield': this.shieldTime = 300; break;
            case 'magnet': this.magnetTime = 250; break;
            case 'fire': this.fireMode = 300; break;
            case 'time': this.timeWarp = 150; break;
            case 'multi': this.multiplier = Math.min(this.multiplier + 1, 5); break;
        }
    }
    
    addScore(points) {
        this.score += points * this.multiplier;
    }
    
    addCombo() {
        this.combo++;
        this.comboTimer = 180;
        this.multiplier = Math.min(1 + Math.floor(this.combo / 3), 5);
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x, y, vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 40, maxLife: 40,
                color: `hsl(${Math.random() * 60}, 90%, 60%)`,
                size: Math.random() * 6 + 2, type: 'explosion'
            });
        }
    }
    
    createCrystalFragments(pipe) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: pipe.x + 30, y: pipe.topHeight + pipe.gap/2,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 35, maxLife: 35,
                color: '#e74c3c', size: 4, type: 'crystal'
            });
        }
    }
    
    createPowerUpExplosion(powerUp) {
        for (let i = 0; i < 25; i++) {
            this.particles.push({
                x: powerUp.x, y: powerUp.y,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 0.5) * 14,
                life: 45, maxLife: 45,
                color: powerUp.color,
                size: Math.random() * 7 + 3, type: 'powerup'
            });
        }
    }
    
    createPortalEffect(portal) {
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: portal.x, y: portal.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 50, maxLife: 50,
                color: '#9b59b6', size: 5, type: 'portal'
            });
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('flappyBest', this.bestScore);
            document.getElementById('best').textContent = this.bestScore;
        }
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').style.display = 'block';
        
        // Death particles without screen shake
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.bird.x + this.bird.width/2,
                y: this.bird.y + this.bird.height/2,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 40, maxLife: 40,
                color: `hsl(${Math.random() * 60}, 90%, 60%)`,
                size: Math.random() * 6 + 2, type: 'death'
            });
        }
    }
    
    restart() {
        this.bird = {
            x: 150, y: 300, width: 30, height: 30,
            velocity: 0, gravity: 0.35, jumpPower: -9, rotation: 0,
            energy: 100, maxEnergy: 100, size: 30, trail: []
        };
        
        this.pipes = [];
        this.particles = [];
        this.powerUps = [];
        this.enemies = [];
        this.portals = [];
        this.score = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.gameState = 'playing';
        this.shieldTime = 0;
        this.magnetTime = 0;
        this.ghostTime = 0;
        this.fireMode = 0;
        this.timeWarp = 0;
        
        document.getElementById('gameOver').style.display = 'none';
        this.generateWorld();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
    }
    
    draw() {
        // Camera shake
        this.ctx.save();
        if (this.cameraShake > 0) {
            this.ctx.translate(
                (Math.random() - 0.5) * this.cameraShake,
                (Math.random() - 0.5) * this.cameraShake
            );
        }
        
        this.drawBackground();
        this.drawPipes();
        this.drawEnemies();
        this.drawPortals();
        this.drawPowerUps();
        this.drawParticles();
        this.drawBird();
        this.drawUI();
        
        this.ctx.restore();
    }
    
    drawBackground() {
        // Dynamic sky based on time of day
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        
        if (this.timeOfDay === 'night') {
            gradient.addColorStop(0, '#2C3E50');
            gradient.addColorStop(1, '#34495E');
        } else {
            // Softer day background
            gradient.addColorStop(0, '#6B9BD1');
            gradient.addColorStop(1, '#7FB069');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Stars at night
        if (this.timeOfDay === 'night') {
            this.ctx.fillStyle = 'white';
            for (let i = 0; i < 50; i++) {
                const x = (i * 137.5) % this.canvas.width;
                const y = (i * 73.3) % (this.canvas.height * 0.6);
                this.ctx.fillRect(x, y, 1, 1);
            }
        }
    }
    
    drawPipes() {
        this.pipes.forEach(pipe => {
            this.ctx.save();
            
            // Type-specific rendering
            switch(pipe.type) {
                case 'crystal':
                    this.ctx.shadowColor = pipe.color;
                    this.ctx.shadowBlur = 20;
                    break;
                case 'electric':
                    this.ctx.shadowColor = '#f1c40f';
                    this.ctx.shadowBlur = 15;
                    // Draw electricity
                    pipe.electricity.forEach(e => {
                        this.ctx.strokeStyle = '#f1c40f';
                        this.ctx.lineWidth = 3;
                        this.ctx.beginPath();
                        this.ctx.moveTo(e.x, e.y);
                        this.ctx.lineTo(e.x + Math.random() * 40 - 20, e.y + Math.random() * 40 - 20);
                        this.ctx.stroke();
                    });
                    break;
            }
            
            // Main pipe body
            this.ctx.fillStyle = pipe.color;
            this.ctx.fillRect(pipe.x, 0, 60, pipe.topHeight);
            this.ctx.fillRect(pipe.x, pipe.bottomY, 60, pipe.bottomHeight);
            
            // Pipe caps with gradient for 3D effect
            const capGradient = this.ctx.createLinearGradient(pipe.x, 0, pipe.x + 60, 0);
            capGradient.addColorStop(0, this.darkenColor(pipe.color));
            capGradient.addColorStop(1, pipe.color);
            this.ctx.fillStyle = capGradient;
            this.ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, 70, 30);
            this.ctx.fillRect(pipe.x - 5, pipe.bottomY, 70, 30);
            
            this.ctx.restore();
        });
    }
    
    drawEnemies() {
        this.enemies.forEach(enemy => {
            // Trail
            enemy.trail.forEach((t, i) => {
                this.ctx.save();
                this.ctx.globalAlpha = t.life / 8 * 0.5;
                this.ctx.fillStyle = enemy.color;
                this.ctx.fillRect(t.x, t.y, enemy.size * 0.7, enemy.size * 0.7);
                this.ctx.restore();
            });
            
            // Enemy body
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);
        });
    }
    
    drawPortals() {
        this.portals.forEach(portal => {
            this.ctx.save();
            this.ctx.translate(portal.x, portal.y);
            this.ctx.rotate(portal.rotation);
            
            // Portal ring
            this.ctx.strokeStyle = '#9b59b6';
            this.ctx.lineWidth = 5;
            this.ctx.shadowColor = '#9b59b6';
            this.ctx.shadowBlur = 20;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, portal.size, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.restore();
        });
    }
    
    drawPowerUps() {
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected) {
                // Trail
                powerUp.trail.forEach((t, i) => {
                    this.ctx.save();
                    this.ctx.globalAlpha = t.life / 12 * 0.4;
                    this.ctx.fillStyle = t.color;
                    this.ctx.beginPath();
                    this.ctx.arc(t.x, t.y, powerUp.size * 0.6, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                });
                
                // Main power-up
                const size = powerUp.size + Math.sin(powerUp.pulse) * 5;
                this.ctx.save();
                this.ctx.shadowColor = powerUp.color;
                this.ctx.shadowBlur = 25;
                this.ctx.fillStyle = powerUp.color;
                this.ctx.beginPath();
                this.ctx.arc(powerUp.x, powerUp.y, size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            
            if (particle.type === 'energy' || particle.type === 'explosion') {
                this.ctx.shadowColor = particle.color;
                this.ctx.shadowBlur = 8;
            }
            
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    drawBird() {
        // Bird trail
        this.bird.trail.forEach((t, i) => {
            this.ctx.save();
            this.ctx.globalAlpha = t.life / 15 * 0.3;
            this.ctx.fillStyle = '#ffeb3b';
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, this.bird.size * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width/2, this.bird.y + this.bird.height/2);
        this.ctx.rotate(this.bird.rotation);
        
        // Bird effects
        if (this.fireMode > 0) {
            this.ctx.shadowColor = '#ff4500';
            this.ctx.shadowBlur = 15;
        }
        
        // Bird body with gradient
        const birdGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.bird.size/2);
        birdGradient.addColorStop(0, this.shieldTime > 0 ? '#00ffff' : '#ffeb3b');
        birdGradient.addColorStop(1, this.shieldTime > 0 ? '#0080ff' : '#ffc107');
        this.ctx.fillStyle = birdGradient;
        this.ctx.fillRect(-this.bird.size/2, -this.bird.size/2, this.bird.size, this.bird.size);
        
        // Bird wing
        this.ctx.fillStyle = '#ffc107';
        this.ctx.fillRect(-this.bird.size/2 + 5, -this.bird.size/2 + 5, 15, 10);
        
        // Bird beak
        this.ctx.fillStyle = '#ff9800';
        this.ctx.fillRect(this.bird.size/2 - 5, -3, 8, 6);
        
        // Bird eye
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(5, -5, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Shield effect
        if (this.shieldTime > 0) {
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 4;
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 15;
            this.ctx.strokeRect(-this.bird.size/2 - 5, -this.bird.size/2 - 5, this.bird.size + 10, this.bird.size + 10);
        }
        
        this.ctx.restore();
    }
    
    drawUI() {
        // Energy bar
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(10, 10, 204, 24);
        this.ctx.fillStyle = `hsl(${(this.bird.energy/this.bird.maxEnergy) * 120}, 90%, 50%)`;
        this.ctx.fillRect(12, 12, (this.bird.energy/this.bird.maxEnergy) * 200, 20);
        
        // Combo display
        if (this.combo > 0) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText(`${this.combo}x COMBO!`, 10, 60);
        }
        
        // Multiplier
        if (this.multiplier > 1) {
            this.ctx.fillStyle = '#f39c12';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(`${this.multiplier}x`, this.canvas.width - 60, 30);
        }
        
        // Time warp effect
        if (this.timeWarp > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = '#9b59b6';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
    }
    
    darkenColor(color) {
        if (color.startsWith('hsl')) {
            return color.replace(/(\d+)%/, (match, p1) => `${Math.floor(p1 * 0.7)}%`);
        }
        return color.replace(/[0-9A-Fa-f]{2}/g, (match) => {
            const val = parseInt(match, 16);
            return Math.floor(val * 0.7).toString(16).padStart(2, '0');
        });
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

new FlappyBird();