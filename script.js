class SnakeGame {
    constructor() {
        this.initializeGame();
        this.initializeAudio();
        this.setupEventListeners();
        this.loadHighScore();
    }

    initializeGame() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        // 游戏状态
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameOver = false;
        
        // 蛇的初始状态
        this.snake = [
            { x: 10, y: 10 }
        ];
        this.dx = 0;
        this.dy = 0;
        
        // 食物
        this.apples = [];
        this.maxApples = 20;
        this.minApples = 10;
        this.generateApples();
        
        // 游戏数据
        this.score = 0;
        this.level = 1;
        this.speed = 1;
        this.baseSpeed = 200;
        this.applesEaten = 0;
        this.applesPerLevel = 5;
        this.generateApples();
        
        // UI元素
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.levelElement = document.getElementById('level');
        this.speedElement = document.getElementById('speed');
        this.gameOverlay = document.getElementById('gameOverlay');
        this.overlayTitle = document.getElementById('overlayTitle');
        this.overlayMessage = document.getElementById('overlayMessage');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.updateDisplay();
        this.updateProgress();
    }

    initializeAudio() {
        this.audioContext = null;
        this.isMuted = false;
        
        // 尝试创建音频上下文（用户交互后才能正常工作）
        this.createAudioContext = () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        };
    }

    // 音效生成函数
    playSound(frequency, duration, type = 'sine') {
        if (this.isMuted || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (error) {
            console.log('音频播放失败:', error);
        }
    }

    playEatSound() {
        this.playSound(800, 0.1);
        setTimeout(() => this.playSound(1000, 0.1), 50);
    }

    playGameOverSound() {
        this.playSound(300, 0.2);
        setTimeout(() => this.playSound(250, 0.2), 100);
        setTimeout(() => this.playSound(200, 0.3), 200);
    }

    playLevelUpSound() {
        this.playSound(600, 0.1);
        setTimeout(() => this.playSound(800, 0.1), 80);
        setTimeout(() => this.playSound(1000, 0.1), 160);
        setTimeout(() => this.playSound(1200, 0.2), 240);
    }

    setupEventListeners() {
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.toggleGame();
                return;
            }
            
            if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                this.restartGame();
                return;
            }
            
            if (!this.gameRunning || this.gamePaused) return;
            
            this.handleDirectionInput(e.code);
        });

        // 按钮事件
        document.getElementById('startButton').addEventListener('click', () => {
            this.createAudioContext();
            this.startGame();
        });
        
        document.getElementById('restartButton').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('pauseButton').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('muteButton').addEventListener('click', () => {
            this.toggleMute();
        });

        // 移动端控制
        document.querySelectorAll('.direction-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.gameRunning || this.gamePaused) return;
                
                const direction = btn.getAttribute('data-direction');
                this.handleDirectionInput(direction);
            });
        });

        // 防止页面刷新时丢失焦点
        window.addEventListener('beforeunload', () => {
            this.saveHighScore();
        });
    }

    handleDirectionInput(input) {
        const directions = {
            'ArrowUp': { dx: 0, dy: -1 },
            'ArrowDown': { dx: 0, dy: 1 },
            'ArrowLeft': { dx: -1, dy: 0 },
            'ArrowRight': { dx: 1, dy: 0 },
            'KeyW': { dx: 0, dy: -1 },
            'KeyS': { dx: 0, dy: 1 },
            'KeyA': { dx: -1, dy: 0 },
            'KeyD': { dx: 1, dy: 0 },
            'up': { dx: 0, dy: -1 },
            'down': { dx: 0, dy: 1 },
            'left': { dx: -1, dy: 0 },
            'right': { dx: 1, dy: 0 }
        };

        const direction = directions[input];
        if (!direction) return;

        // 防止反向移动
        if (this.snake.length > 1) {
            if (direction.dx === -this.dx && direction.dy === -this.dy) {
                return;
            }
        }

        this.dx = direction.dx;
        this.dy = direction.dy;
    }

    generateApple() {
        let apple;
        do {
            apple = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (this.isSnakePosition(apple.x, apple.y) || this.isApplePosition(apple.x, apple.y));
        
        return apple;
    }
    
    isApplePosition(x, y) {
        return this.apples.some(apple => apple.x === x && apple.y === y);
    }
    
    generateApples() {
        while (this.apples.length < this.minApples && this.apples.length < this.maxApples) {
            this.apples.push(this.generateApple());
        }
    }

    isSnakePosition(x, y) {
        return this.snake.some(segment => segment.x === x && segment.y === y);
    }

    startGame() {
        this.createAudioContext();
        this.gameRunning = true;
        this.gamePaused = false;
        this.gameOver = false;
        this.hideOverlay();
        this.gameLoop();
    }

    toggleGame() {
        if (!this.gameRunning && !this.gameOver) {
            this.startGame();
        } else if (this.gameRunning) {
            this.togglePause();
        } else if (this.gameOver) {
            this.restartGame();
        }
    }

    togglePause() {
        if (!this.gameRunning || this.gameOver) return;
        
        this.gamePaused = !this.gamePaused;
        const pauseButton = document.getElementById('pauseButton');
        
        if (this.gamePaused) {
            pauseButton.textContent = '继续';
            this.showOverlay('游戏暂停', '按空格键继续游戏');
        } else {
            pauseButton.textContent = '暂停';
            this.hideOverlay();
            this.gameLoop();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        const muteButton = document.getElementById('muteButton');
        muteButton.textContent = this.isMuted ? '取消静音' : '静音';
    }

    restartGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameOver = false;
        
        // 重置游戏状态
        this.snake = [{ x: 10, y: 10 }];
        this.dx = 0;
        this.dy = 0;
        this.apple = this.generateApple();
        this.score = 0;
        this.level = 1;
        this.speed = 1;
        this.applesEaten = 0;
        
        this.updateDisplay();
        this.updateProgress();
        this.draw();
        
        // 重置按钮状态
        document.getElementById('pauseButton').textContent = '暂停';
        
        this.showOverlay('贪吃蛇游戏', '按空格键开始游戏');
        document.getElementById('startButton').style.display = 'inline-block';
        document.getElementById('restartButton').style.display = 'none';
    }

    gameLoop() {
        if (!this.gameRunning || this.gamePaused || this.gameOver) return;
        
        this.update();
        this.draw();
        
        const currentSpeed = this.baseSpeed;
        setTimeout(() => this.gameLoop(), currentSpeed);
    }

    update() {
        if (this.dx === 0 && this.dy === 0) return;
        
        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
        
        // 检查墙壁碰撞
        if (head.x < 0 || head.x >= this.tileCount || 
            head.y < 0 || head.y >= this.tileCount) {
            this.endGame();
            return;
        }
        
        // 检查自身碰撞
        if (this.isSnakePosition(head.x, head.y)) {
            this.endGame();
            return;
        }
        
        this.snake.unshift(head);
        
        // 检查是否吃到食物
        const eatenAppleIndex = this.apples.findIndex(apple => head.x === apple.x && head.y === apple.y);
        if (eatenAppleIndex !== -1) {
            this.apples.splice(eatenAppleIndex, 1);
            this.eatApple();
        } else {
            this.snake.pop();
        }
    }

    eatApple() {
        this.score += 10 * this.level;
        this.applesEaten++;
        
        this.playEatSound();
        this.generateApples();
        
        // 检查是否升级
        if (this.applesEaten % this.applesPerLevel === 0) {
            this.levelUp();
        }
        
        this.updateDisplay();
        this.updateProgress();
        
        // 添加得分动画
        this.canvas.classList.add('pulse');
        setTimeout(() => this.canvas.classList.remove('pulse'), 500);
    }

    levelUp() {
        this.level++;
        this.playLevelUpSound();
        
        // 显示升级提示
        this.showTemporaryMessage(`关卡 ${this.level}!`);
    }

    showTemporaryMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 136, 0.9);
            color: black;
            padding: 20px;
            border-radius: 10px;
            font-family: 'Press Start 2P', cursive;
            font-size: 16px;
            z-index: 1000;
            animation: fadeInOut 2s ease-in-out;
        `;
        
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 2000);
        
        // 添加动画样式
        if (!document.getElementById('tempMessageStyle')) {
            const style = document.createElement('style');
            style.id = 'tempMessageStyle';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    endGame() {
        this.gameOver = true;
        this.gameRunning = false;
        
        this.playGameOverSound();
        
        // 检查是否刷新最高分
        const highScore = parseInt(localStorage.getItem('snakeHighScore') || '0');
        if (this.score > highScore) {
            localStorage.setItem('snakeHighScore', this.score.toString());
            this.highScoreElement.textContent = this.score;
            this.showOverlay('新纪录!', `恭喜！你创造了新的最高分：${this.score}`);
        } else {
            this.showOverlay('游戏结束', `最终得分：${this.score}`);
        }
        
        document.getElementById('startButton').style.display = 'none';
        document.getElementById('restartButton').style.display = 'inline-block';
        
        // 添加游戏结束动画
        this.canvas.classList.add('shake');
        setTimeout(() => this.canvas.classList.remove('shake'), 500);
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格
        this.drawGrid();
        
        // 检查并生成食物
        this.generateApples();
        
        // 绘制蛇
        this.drawSnake();
        
        // 绘制食物
        this.drawApple();
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.tileCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.gridSize, 0);
            this.ctx.lineTo(i * this.gridSize, this.canvas.height);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.gridSize);
            this.ctx.lineTo(this.canvas.width, i * this.gridSize);
            this.ctx.stroke();
        }
    }

    drawSnake() {
        this.snake.forEach((segment, index) => {
            if (index === 0) {
                // 蛇头
                this.ctx.fillStyle = '#00ff88';
                this.ctx.fillRect(
                    segment.x * this.gridSize + 2, 
                    segment.y * this.gridSize + 2, 
                    this.gridSize - 4, 
                    this.gridSize - 4
                );
                
                // 蛇头的眼睛
                this.ctx.fillStyle = 'black';
                const eyeSize = 3;
                const eyeOffset = 5;
                
                if (this.dx === 1) { // 向右
                    this.ctx.fillRect(segment.x * this.gridSize + this.gridSize - eyeOffset, segment.y * this.gridSize + 4, eyeSize, eyeSize);
                    this.ctx.fillRect(segment.x * this.gridSize + this.gridSize - eyeOffset, segment.y * this.gridSize + this.gridSize - 7, eyeSize, eyeSize);
                } else if (this.dx === -1) { // 向左
                    this.ctx.fillRect(segment.x * this.gridSize + 2, segment.y * this.gridSize + 4, eyeSize, eyeSize);
                    this.ctx.fillRect(segment.x * this.gridSize + 2, segment.y * this.gridSize + this.gridSize - 7, eyeSize, eyeSize);
                } else if (this.dy === -1) { // 向上
                    this.ctx.fillRect(segment.x * this.gridSize + 4, segment.y * this.gridSize + 2, eyeSize, eyeSize);
                    this.ctx.fillRect(segment.x * this.gridSize + this.gridSize - 7, segment.y * this.gridSize + 2, eyeSize, eyeSize);
                } else if (this.dy === 1) { // 向下
                    this.ctx.fillRect(segment.x * this.gridSize + 4, segment.y * this.gridSize + this.gridSize - eyeOffset, eyeSize, eyeSize);
                    this.ctx.fillRect(segment.x * this.gridSize + this.gridSize - 7, segment.y * this.gridSize + this.gridSize - eyeOffset, eyeSize, eyeSize);
                }
            } else {
                // 蛇身
                this.ctx.fillStyle = '#00cc6a';
                this.ctx.fillRect(
                    segment.x * this.gridSize + 1, 
                    segment.y * this.gridSize + 1, 
                    this.gridSize - 2, 
                    this.gridSize - 2
                );
            }
        });
    }

    drawApple() {
        this.apples.forEach(apple => {
            this.ctx.fillStyle = '#ff4444';
            this.ctx.fillRect(
                apple.x * this.gridSize + 2, 
                apple.y * this.gridSize + 2, 
                this.gridSize - 4, 
                this.gridSize - 4
            );
            
            // 苹果的叶子
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(
                apple.x * this.gridSize + this.gridSize - 6, 
                apple.y * this.gridSize + 2, 
                4, 
                4
            );
        });
    }

    updateDisplay() {
        this.scoreElement.textContent = this.score;
        this.levelElement.textContent = this.level;
        this.speedElement.textContent = this.speed;
    }

    updateProgress() {
        const progress = (this.applesEaten % this.applesPerLevel) / this.applesPerLevel * 100;
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `${this.applesEaten % this.applesPerLevel}/${this.applesPerLevel}`;
    }

    showOverlay(title, message) {
        this.overlayTitle.textContent = title;
        this.overlayMessage.textContent = message;
        this.gameOverlay.classList.remove('hidden');
    }

    hideOverlay() {
        this.gameOverlay.classList.add('hidden');
    }

    loadHighScore() {
        const highScore = localStorage.getItem('snakeHighScore') || '0';
        this.highScoreElement.textContent = highScore;
    }

    saveHighScore() {
        const currentHighScore = parseInt(localStorage.getItem('snakeHighScore') || '0');
        if (this.score > currentHighScore) {
            localStorage.setItem('snakeHighScore', this.score.toString());
        }
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new SnakeGame();
    
    // 确保画布正确绘制
    game.draw();
});
