class FlappyBird {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.bird = {
            x: 150,
            y: 300,
            width: 30,
            height: 30,
            velocity: 0,
            gravity: 0.6,
            jumpPower: -12,
            rotation: 0
        };
        
        this.pipes = [];
        this.particles = [];
        this.powerUps = [];
        this.gravityZones = [];
        this.score = 0;
        this.bestScore = localStorage.getItem('flappyBest') || 0;
        this.gameState = 'playing';
        this.pipeSpeed = 3;
        this.pipeGap = 180;
        this.pipeWidth = 60;
        this.speedBoost = 0;
        this.shieldTime = 0;
        this.magnetTime = 0;
        this.currentGravity = 0.6;
        
        this.init();
        this.generatePipes();
        this.gameLoop();
    }
    
    init() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.flap();
            }
        });
        
        this.canvas.addEventListener('click', () => {
            this.flap();
        });
        
        document.getElementById('best').textContent = this.bestScore;
    }
    
    flap() {
        if (this.gameState === 'playing') {
            this.bird.velocity = this.bird.jumpPower;
            this.bird.rotation = -0.3;
            
            // Flap particles
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: this.bird.x,
                    y: this.bird.y + this.bird.height/2,
                    vx: Math.random() * 4 - 6,
                    vy: Math.random() * 4 - 2,
                    life: 20,
                    maxLife: 20,
                    color: '#ffffff',
                    size: 3
                });
            }
        } else if (this.gameState === 'gameOver') {
            this.restart();
        }
    }
    
    generatePipes() {
        for (let i = 0; i < 3; i++) {
            this.addPipe(this.canvas.width + i * 300);
        }
    }
    
    addPipe(x) {
        const minHeight = 100;
        const maxHeight = this.canvas.height - this.pipeGap - minHeight;
        const topHeight = minHeight + Math.random() * (maxHeight - minHeight);
        
        // Special pipe types
        let pipeType = 'normal';
        let color = `hsl(${120 + Math.random() * 60}, 70%, 50%)`;
        
        if (Math.random() < 0.15) {
            pipeType = 'moving';
            color = '#ff6b6b';
        } else if (Math.random() < 0.1) {
            pipeType = 'shrinking';
            color = '#4ecdc4';
        }
        
        this.pipes.push({
            x: x,
            topHeight: topHeight,
            bottomY: topHeight + this.pipeGap,
            bottomHeight: this.canvas.height - (topHeight + this.pipeGap),
            passed: false,
            color: color,
            type: pipeType,
            originalGap: this.pipeGap,
            moveOffset: 0,
            moveSpeed: 2
        });
        
        // Add power-ups
        if (Math.random() < 0.3) {
            this.addPowerUp(x + this.pipeWidth/2, topHeight + this.pipeGap/2);
        }
        
        // Add gravity zones
        if (Math.random() < 0.2) {
            this.addGravityZone(x + 100);
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Update bird with current gravity
        this.bird.velocity += this.currentGravity;
        this.bird.y += this.bird.velocity;
        
        // Update power-up effects
        this.updatePowerUpEffects();
        
        // Bird rotation based on velocity
        this.bird.rotation = Math.min(Math.max(this.bird.velocity * 0.05, -0.5), 1.2);
        
        // Update pipes
        this.pipes.forEach(pipe => {
            pipe.x -= this.pipeSpeed + this.speedBoost;
            
            // Special pipe behaviors
            if (pipe.type === 'moving') {
                pipe.moveOffset = Math.sin(Date.now() * 0.005) * 50;
            } else if (pipe.type === 'shrinking') {
                const shrinkAmount = Math.sin(Date.now() * 0.008) * 30;
                pipe.bottomY = pipe.topHeight + pipe.originalGap - shrinkAmount;
                pipe.bottomHeight = this.canvas.height - pipe.bottomY;
            }
            
            // Check if bird passed pipe
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score += pipe.type === 'normal' ? 1 : 2;
                this.createScoreParticles();
            }
        });
        
        // Update power-ups
        this.powerUps.forEach(powerUp => {
            powerUp.x -= this.pipeSpeed + this.speedBoost;
            powerUp.pulse += 0.2;
        });
        
        // Update gravity zones
        this.gravityZones.forEach(zone => {
            zone.x -= this.pipeSpeed + this.speedBoost;
        });
        
        // Remove off-screen elements
        this.pipes = this.pipes.filter(pipe => pipe.x > -this.pipeWidth);
        this.powerUps = this.powerUps.filter(p => p.x > -50 && !p.collected);
        this.gravityZones = this.gravityZones.filter(z => z.x > -100);
        
        if (this.pipes.length < 3) {
            const lastPipe = this.pipes[this.pipes.length - 1];
            this.addPipe(lastPipe.x + 300);
        }
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.2;
            particle.life--;
            return particle.life > 0;
        });
        
        // Check collisions
        this.checkCollisions();
        this.checkPowerUpCollisions();
        this.checkGravityZones();
        
        // Update UI
        document.getElementById('score').textContent = this.score;
    }
    
    checkCollisions() {
        // Ground and ceiling collision
        if (this.bird.y + this.bird.height >= this.canvas.height || this.bird.y <= 0) {
            this.gameOver();
            return;
        }
        
        // Pipe collision (unless shielded)
        if (this.shieldTime <= 0) {
            this.pipes.forEach(pipe => {
                const pipeX = pipe.x;
                const pipeY = pipe.type === 'moving' ? pipe.moveOffset : 0;
                
                if (this.bird.x < pipeX + this.pipeWidth &&
                    this.bird.x + this.bird.width > pipeX) {
                    
                    // Check top pipe collision
                    if (this.bird.y < pipe.topHeight + pipeY) {
                        this.gameOver();
                        return;
                    }
                    
                    // Check bottom pipe collision
                    if (this.bird.y + this.bird.height > pipe.bottomY + pipeY) {
                        this.gameOver();
                        return;
                    }
                }
            });
        }
    }
    
    createScoreParticles() {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: this.bird.x + this.bird.width/2,
                y: this.bird.y + this.bird.height/2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30,
                maxLife: 30,
                color: '#ffd700',
                size: 4
            });
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        // Update best score
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('flappyBest', this.bestScore);
            document.getElementById('best').textContent = this.bestScore;
        }
        
        // Show game over screen
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').style.display = 'block';
        
        // Death particles
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: this.bird.x + this.bird.width/2,
                y: this.bird.y + this.bird.height/2,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 40,
                maxLife: 40,
                color: '#ff4444',
                size: 5
            });
        }
    }
    
    restart() {
        this.bird.y = 300;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipes = [];
        this.particles = [];
        this.powerUps = [];
        this.gravityZones = [];
        this.score = 0;
        this.gameState = 'playing';
        this.speedBoost = 0;
        this.shieldTime = 0;
        this.magnetTime = 0;
        this.currentGravity = 0.6;
        
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('score').textContent = '0';
        
        this.generatePipes();
    }
    
    draw() {
        // Sky gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.7, '#98FB98');
        gradient.addColorStop(1, '#90EE90');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw clouds
        this.drawClouds();
        
        // Draw gravity zones
        this.gravityZones.forEach(zone => {
            this.ctx.save();
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = zone.type === 'low' ? '#00ff00' : '#ff00ff';
            this.ctx.fillRect(zone.x, 0, zone.width, this.canvas.height);
            this.ctx.restore();
        });
        
        // Draw pipes
        this.pipes.forEach(pipe => {
            const offsetY = pipe.type === 'moving' ? pipe.moveOffset : 0;
            
            // Top pipe
            this.ctx.fillStyle = pipe.color;
            this.ctx.fillRect(pipe.x, offsetY, this.pipeWidth, pipe.topHeight);
            
            // Top pipe cap
            this.ctx.fillStyle = this.darkenColor(pipe.color);
            this.ctx.fillRect(pipe.x - 5, pipe.topHeight - 30 + offsetY, this.pipeWidth + 10, 30);
            
            // Bottom pipe
            this.ctx.fillStyle = pipe.color;
            this.ctx.fillRect(pipe.x, pipe.bottomY + offsetY, this.pipeWidth, pipe.bottomHeight);
            
            // Bottom pipe cap
            this.ctx.fillStyle = this.darkenColor(pipe.color);
            this.ctx.fillRect(pipe.x - 5, pipe.bottomY + offsetY, this.pipeWidth + 10, 30);
            
            // Special pipe indicators
            if (pipe.type === 'moving') {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('↕', pipe.x + this.pipeWidth/2, pipe.topHeight + pipe.originalGap/2);
            } else if (pipe.type === 'shrinking') {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('◊', pipe.x + this.pipeWidth/2, pipe.topHeight + pipe.originalGap/2);
            }
        });
        
        // Draw power-ups
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected) {
                const size = powerUp.size + Math.sin(powerUp.pulse) * 3;
                this.ctx.fillStyle = powerUp.color;
                this.ctx.beginPath();
                this.ctx.arc(powerUp.x, powerUp.y, size, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Power-up icon
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(powerUp.icon, powerUp.x, powerUp.y + 4);
            }
        });
        
        // Draw particles
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Draw bird
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width/2, this.bird.y + this.bird.height/2);
        this.ctx.rotate(this.bird.rotation);
        
        // Bird body (with shield effect)
        this.ctx.fillStyle = this.shieldTime > 0 ? '#00ffff' : '#ffeb3b';
        this.ctx.fillRect(-this.bird.width/2, -this.bird.height/2, this.bird.width, this.bird.height);
        
        // Shield glow
        if (this.shieldTime > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.5;
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(-this.bird.width/2 - 3, -this.bird.height/2 - 3, this.bird.width + 6, this.bird.height + 6);
            this.ctx.restore();
        }
        
        // Bird wing
        this.ctx.fillStyle = '#ffc107';
        this.ctx.fillRect(-this.bird.width/2 + 5, -this.bird.height/2 + 5, 15, 10);
        
        // Bird beak
        this.ctx.fillStyle = '#ff9800';
        this.ctx.fillRect(this.bird.width/2 - 5, -3, 8, 6);
        
        // Bird eye
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(5, -5, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
        
        // Draw ground
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.canvas.height - 20, this.canvas.width, 20);
    }
    
    drawClouds() {
        const time = Date.now() * 0.0005;
        
        for (let i = 0; i < 3; i++) {
            const x = (i * 200 + time * 20) % (this.canvas.width + 100) - 50;
            const y = 50 + i * 30;
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 20, 0, Math.PI * 2);
            this.ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
            this.ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    darkenColor(color) {
        // Simple color darkening
        return color.replace(/(\d+)%/, (match, p1) => `${Math.floor(p1 * 0.7)}%`);
    }
    
    addPowerUp(x, y) {
        const types = ['speed', 'shield', 'magnet', 'score'];
        const type = types[Math.floor(Math.random() * types.length)];
        const colors = { speed: '#ff6b6b', shield: '#00ffff', magnet: '#ffd700', score: '#9b59b6' };
        const icons = { speed: '⚡', shield: '🛡', magnet: '🧲', score: '💎' };
        
        this.powerUps.push({
            x, y, size: 12, pulse: 0, collected: false,
            type, color: colors[type], icon: icons[type]
        });
    }
    
    addGravityZone(x) {
        const type = Math.random() < 0.5 ? 'low' : 'high';
        this.gravityZones.push({
            x, width: 80, type
        });
    }
    
    updatePowerUpEffects() {
        this.speedBoost = Math.max(0, this.speedBoost - 0.05);
        this.shieldTime = Math.max(0, this.shieldTime - 1);
        this.magnetTime = Math.max(0, this.magnetTime - 1);
        
        // Magnet effect
        if (this.magnetTime > 0) {
            this.powerUps.forEach(powerUp => {
                if (!powerUp.collected) {
                    const dx = this.bird.x - powerUp.x;
                    const dy = this.bird.y - powerUp.y;
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    if (distance < 100) {
                        powerUp.x += dx * 0.1;
                        powerUp.y += dy * 0.1;
                    }
                }
            });
        }
    }
    
    checkPowerUpCollisions() {
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected) {
                const dx = this.bird.x + this.bird.width/2 - powerUp.x;
                const dy = this.bird.y + this.bird.height/2 - powerUp.y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < powerUp.size + 15) {
                    powerUp.collected = true;
                    this.activatePowerUp(powerUp.type);
                    
                    // Power-up particles
                    for (let i = 0; i < 10; i++) {
                        this.particles.push({
                            x: powerUp.x, y: powerUp.y,
                            vx: (Math.random() - 0.5) * 10,
                            vy: (Math.random() - 0.5) * 10,
                            life: 30, maxLife: 30,
                            color: powerUp.color, size: 3
                        });
                    }
                }
            }
        });
    }
    
    checkGravityZones() {
        this.currentGravity = this.bird.gravity;
        
        this.gravityZones.forEach(zone => {
            if (this.bird.x + this.bird.width > zone.x && this.bird.x < zone.x + zone.width) {
                this.currentGravity = zone.type === 'low' ? 0.3 : 1.2;
            }
        });
    }
    
    activatePowerUp(type) {
        switch(type) {
            case 'speed':
                this.speedBoost = 2;
                break;
            case 'shield':
                this.shieldTime = 300;
                break;
            case 'magnet':
                this.magnetTime = 200;
                break;
            case 'score':
                this.score += 5;
                break;
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

new FlappyBird();