class FlappyBird {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.bird = {
            x: 150, y: 300, width: 30, height: 30,
            velocity: 0, gravity: 0.4, jumpPower: -10, rotation: 0
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
        this.currentGravity = 0.4;
        
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
            
            // Enhanced flap particles
            for (let i = 0; i < 12; i++) {
                this.particles.push({
                    x: this.bird.x + Math.random() * this.bird.width,
                    y: this.bird.y + this.bird.height/2,
                    vx: Math.random() * 8 - 10,
                    vy: Math.random() * 6 - 3,
                    life: 25,
                    maxLife: 25,
                    color: `hsl(${200 + Math.random() * 60}, 80%, 80%)`,
                    size: Math.random() * 4 + 2,
                    type: 'flap'
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
            x: x, topHeight: topHeight,
            bottomY: topHeight + this.pipeGap,
            bottomHeight: this.canvas.height - (topHeight + this.pipeGap),
            passed: false, color: color, type: pipeType,
            originalGap: this.pipeGap, moveOffset: 0, moveSpeed: 2,
            glowIntensity: 0
        });
        
        if (Math.random() < 0.3) {
            this.addPowerUp(x + this.pipeWidth/2, topHeight + this.pipeGap/2);
        }
        
        if (Math.random() < 0.2) {
            this.addGravityZone(x + 100);
        }
    }
    
    addPowerUp(x, y) {
        const types = ['speed', 'shield', 'magnet', 'score'];
        const type = types[Math.floor(Math.random() * types.length)];
        const colors = { speed: '#ff6b6b', shield: '#00ffff', magnet: '#ffd700', score: '#9b59b6' };
        const icons = { speed: '⚡', shield: '🛡', magnet: '🧲', score: '💎' };
        
        this.powerUps.push({
            x, y, size: 12, pulse: 0, collected: false,
            type, color: colors[type], icon: icons[type],
            trail: []
        });
    }
    
    addGravityZone(x) {
        const type = Math.random() < 0.5 ? 'low' : 'high';
        this.gravityZones.push({ x, width: 80, type });
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.bird.velocity += this.currentGravity;
        this.bird.y += this.bird.velocity;
        this.bird.rotation = Math.min(Math.max(this.bird.velocity * 0.05, -0.5), 1.2);
        
        this.updatePowerUpEffects();
        this.updatePipes();
        this.updatePowerUps();
        this.updateGravityZones();
        this.updateParticles();
        this.checkCollisions();
        this.checkPowerUpCollisions();
        this.checkGravityZones();
        
        document.getElementById('score').textContent = this.score;
    }
    
    updatePipes() {
        this.pipes.forEach(pipe => {
            pipe.x -= this.pipeSpeed + this.speedBoost;
            
            if (pipe.type === 'moving') {
                pipe.moveOffset = Math.sin(Date.now() * 0.005) * 50;
                pipe.glowIntensity = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
            } else if (pipe.type === 'shrinking') {
                const shrinkAmount = Math.sin(Date.now() * 0.008) * 30;
                pipe.bottomY = pipe.topHeight + pipe.originalGap - shrinkAmount;
                pipe.bottomHeight = this.canvas.height - pipe.bottomY;
                pipe.glowIntensity = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
            }
            
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score += pipe.type === 'normal' ? 1 : 2;
                this.createScoreParticles();
                this.createPipePassParticles(pipe);
            }
        });
        
        this.pipes = this.pipes.filter(pipe => pipe.x > -this.pipeWidth);
        
        if (this.pipes.length < 3) {
            const lastPipe = this.pipes[this.pipes.length - 1];
            this.addPipe(lastPipe.x + 300);
        }
    }
    
    updatePowerUps() {
        this.powerUps.forEach(powerUp => {
            powerUp.x -= this.pipeSpeed + this.speedBoost;
            powerUp.pulse += 0.2;
            
            // Power-up trail effect
            powerUp.trail.push({ x: powerUp.x, y: powerUp.y, life: 10 });
            powerUp.trail = powerUp.trail.filter(t => t.life-- > 0);
        });
        
        this.powerUps = this.powerUps.filter(p => p.x > -50 && !p.collected);
    }
    
    updateGravityZones() {
        this.gravityZones.forEach(zone => {
            zone.x -= this.pipeSpeed + this.speedBoost;
        });
        this.gravityZones = this.gravityZones.filter(z => z.x > -100);
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += particle.type === 'flap' ? 0.1 : 0.2;
            particle.life--;
            return particle.life > 0;
        });
    }
    
    updatePowerUpEffects() {
        this.speedBoost = Math.max(0, this.speedBoost - 0.05);
        this.shieldTime = Math.max(0, this.shieldTime - 1);
        this.magnetTime = Math.max(0, this.magnetTime - 1);
        
        if (this.magnetTime > 0) {
            this.powerUps.forEach(powerUp => {
                if (!powerUp.collected) {
                    const dx = this.bird.x - powerUp.x;
                    const dy = this.bird.y - powerUp.y;
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    if (distance < 120) {
                        powerUp.x += dx * 0.08;
                        powerUp.y += dy * 0.08;
                    }
                }
            });
        }
        
        // Create shield particles
        if (this.shieldTime > 0 && Math.random() < 0.3) {
            this.particles.push({
                x: this.bird.x + Math.random() * this.bird.width,
                y: this.bird.y + Math.random() * this.bird.height,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 20, maxLife: 20,
                color: '#00ffff', size: 2, type: 'shield'
            });
        }
    }
    
    checkCollisions() {
        if (this.bird.y + this.bird.height >= this.canvas.height - 20 || this.bird.y <= 0) {
            this.gameOver();
            return;
        }
        
        if (this.shieldTime <= 0) {
            this.pipes.forEach(pipe => {
                const pipeY = pipe.type === 'moving' ? pipe.moveOffset : 0;
                
                if (this.bird.x < pipe.x + this.pipeWidth &&
                    this.bird.x + this.bird.width > pipe.x) {
                    
                    if (this.bird.y < pipe.topHeight + pipeY ||
                        this.bird.y + this.bird.height > pipe.bottomY + pipeY) {
                        this.gameOver();
                        return;
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
                    this.createPowerUpParticles(powerUp);
                }
            }
        });
    }
    
    checkGravityZones() {
        this.currentGravity = this.bird.gravity;
        
        this.gravityZones.forEach(zone => {
            if (this.bird.x + this.bird.width > zone.x && this.bird.x < zone.x + zone.width) {
                this.currentGravity = zone.type === 'low' ? 0.2 : 0.8;
            }
        });
    }
    
    activatePowerUp(type) {
        switch(type) {
            case 'speed': this.speedBoost = 2; break;
            case 'shield': this.shieldTime = 300; break;
            case 'magnet': this.magnetTime = 200; break;
            case 'score': this.score += 5; break;
        }
    }
    
    createScoreParticles() {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: this.bird.x + this.bird.width/2,
                y: this.bird.y + this.bird.height/2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 35, maxLife: 35,
                color: `hsl(${45 + Math.random() * 30}, 90%, 70%)`,
                size: Math.random() * 5 + 3, type: 'score'
            });
        }
    }
    
    createPipePassParticles(pipe) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: pipe.x + this.pipeWidth/2,
                y: pipe.topHeight + this.pipeGap/2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 25, maxLife: 25,
                color: pipe.color, size: 3, type: 'pipe'
            });
        }
    }
    
    createPowerUpParticles(powerUp) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: powerUp.x, y: powerUp.y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 40, maxLife: 40,
                color: powerUp.color,
                size: Math.random() * 6 + 2, type: 'powerup'
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
        
        // Enhanced death particles
        for (let i = 0; i < 25; i++) {
            this.particles.push({
                x: this.bird.x + this.bird.width/2,
                y: this.bird.y + this.bird.height/2,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 50, maxLife: 50,
                color: `hsl(${Math.random() * 60}, 90%, 60%)`,
                size: Math.random() * 8 + 3, type: 'death'
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
        this.currentGravity = 0.4;
        
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('score').textContent = '0';
        
        this.generatePipes();
    }
    
    draw() {
        // Enhanced sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.3, '#98FB98');
        gradient.addColorStop(0.7, '#90EE90');
        gradient.addColorStop(1, '#8FBC8F');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawClouds();
        this.drawGravityZones();
        this.drawPipes();
        this.drawPowerUps();
        this.drawParticles();
        this.drawBird();
        this.drawGround();
    }
    
    drawGravityZones() {
        this.gravityZones.forEach(zone => {
            this.ctx.save();
            this.ctx.globalAlpha = 0.4;
            const gradient = this.ctx.createLinearGradient(zone.x, 0, zone.x + zone.width, 0);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.5, zone.type === 'low' ? '#00ff0080' : '#ff00ff80');
            gradient.addColorStop(1, 'transparent');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(zone.x, 0, zone.width, this.canvas.height);
            this.ctx.restore();
        });
    }
    
    drawPipes() {
        this.pipes.forEach(pipe => {
            const offsetY = pipe.type === 'moving' ? pipe.moveOffset : 0;
            
            // Pipe glow effect for special pipes
            if (pipe.type !== 'normal') {
                this.ctx.save();
                this.ctx.shadowColor = pipe.color;
                this.ctx.shadowBlur = 15 * pipe.glowIntensity;
                this.ctx.globalAlpha = 0.8;
            }
            
            this.ctx.fillStyle = pipe.color;
            this.ctx.fillRect(pipe.x, offsetY, this.pipeWidth, pipe.topHeight);
            this.ctx.fillRect(pipe.x, pipe.bottomY + offsetY, this.pipeWidth, pipe.bottomHeight);
            
            // Pipe caps with gradient
            const capGradient = this.ctx.createLinearGradient(pipe.x, 0, pipe.x + this.pipeWidth, 0);
            capGradient.addColorStop(0, this.darkenColor(pipe.color));
            capGradient.addColorStop(1, pipe.color);
            this.ctx.fillStyle = capGradient;
            this.ctx.fillRect(pipe.x - 5, pipe.topHeight - 30 + offsetY, this.pipeWidth + 10, 30);
            this.ctx.fillRect(pipe.x - 5, pipe.bottomY + offsetY, this.pipeWidth + 10, 30);
            
            if (pipe.type !== 'normal') {
                this.ctx.restore();
            }
            
            // Special pipe indicators
            if (pipe.type === 'moving') {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('↕', pipe.x + this.pipeWidth/2, pipe.topHeight + this.pipeGap/2);
            } else if (pipe.type === 'shrinking') {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('◊', pipe.x + this.pipeWidth/2, pipe.topHeight + this.pipeGap/2);
            }
        });
    }
    
    drawPowerUps() {
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected) {
                // Draw trail
                powerUp.trail.forEach((t, i) => {
                    this.ctx.save();
                    this.ctx.globalAlpha = t.life / 10 * 0.3;
                    this.ctx.fillStyle = powerUp.color;
                    this.ctx.beginPath();
                    this.ctx.arc(t.x, t.y, powerUp.size * 0.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                });
                
                // Main power-up with glow
                const size = powerUp.size + Math.sin(powerUp.pulse) * 4;
                this.ctx.save();
                this.ctx.shadowColor = powerUp.color;
                this.ctx.shadowBlur = 20;
                this.ctx.fillStyle = powerUp.color;
                this.ctx.beginPath();
                this.ctx.arc(powerUp.x, powerUp.y, size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
                
                // Icon
                this.ctx.fillStyle = 'white';
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(powerUp.icon, powerUp.x, powerUp.y + 5);
            }
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            
            if (particle.type === 'flap') {
                this.ctx.shadowColor = particle.color;
                this.ctx.shadowBlur = 5;
            }
            
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    drawBird() {
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width/2, this.bird.y + this.bird.height/2);
        this.ctx.rotate(this.bird.rotation);
        
        // Enhanced bird with gradient
        const birdGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.bird.width/2);
        birdGradient.addColorStop(0, this.shieldTime > 0 ? '#00ffff' : '#ffeb3b');
        birdGradient.addColorStop(1, this.shieldTime > 0 ? '#0080ff' : '#ffc107');
        this.ctx.fillStyle = birdGradient;
        this.ctx.fillRect(-this.bird.width/2, -this.bird.height/2, this.bird.width, this.bird.height);
        
        // Shield effect
        if (this.shieldTime > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.6;
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 4;
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 10;
            this.ctx.strokeRect(-this.bird.width/2 - 5, -this.bird.height/2 - 5, this.bird.width + 10, this.bird.height + 10);
            this.ctx.restore();
        }
        
        // Wing, beak, eye
        this.ctx.fillStyle = '#ffc107';
        this.ctx.fillRect(-this.bird.width/2 + 5, -this.bird.height/2 + 5, 15, 10);
        this.ctx.fillStyle = '#ff9800';
        this.ctx.fillRect(this.bird.width/2 - 5, -3, 8, 6);
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(5, -5, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawClouds() {
        const time = Date.now() * 0.0005;
        
        for (let i = 0; i < 4; i++) {
            const x = (i * 150 + time * 15) % (this.canvas.width + 100) - 50;
            const y = 40 + i * 25;
            
            this.ctx.save();
            this.ctx.globalAlpha = 0.9;
            this.ctx.fillStyle = 'white';
            this.ctx.shadowColor = 'rgba(0,0,0,0.1)';
            this.ctx.shadowBlur = 5;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 18, 0, Math.PI * 2);
            this.ctx.arc(x + 20, y, 22, 0, Math.PI * 2);
            this.ctx.arc(x + 40, y, 18, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }
    
    drawGround() {
        const groundGradient = this.ctx.createLinearGradient(0, this.canvas.height - 20, 0, this.canvas.height);
        groundGradient.addColorStop(0, '#8B4513');
        groundGradient.addColorStop(1, '#654321');
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, this.canvas.height - 20, this.canvas.width, 20);
    }
    
    darkenColor(color) {
        return color.replace(/(\d+)%/, (match, p1) => `${Math.floor(p1 * 0.7)}%`);
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

new FlappyBird();