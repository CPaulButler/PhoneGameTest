// Game constants
const BOUNCE_EFFICIENCY = 0.9;
const BALL_RADIUS = 20;
const GRAVITY = 0.5;
const FRICTION = 0.99;

// Game state
let canvas, ctx;
let ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS
};
let gameRunning = false;
let accelerationX = 0;
let accelerationY = GRAVITY;

// Audio context for sound effects
let audioContext;
let boinkSound;

// Initialize the game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize ball position
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    
    // Setup button
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', startGame);
    
    // Initialize audio
    initAudio();
    
    // Draw initial state
    draw();
}

function resizeCanvas() {
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 120;
    const size = Math.min(maxWidth, maxHeight, 600);
    
    canvas.width = size;
    canvas.height = size;
    
    // Reset ball position if canvas resized
    if (ball.x > canvas.width - ball.radius) ball.x = canvas.width - ball.radius;
    if (ball.y > canvas.height - ball.radius) ball.y = canvas.height - ball.radius;
}

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        createBoinkSound();
    } catch (e) {
        console.warn('Web Audio API not supported:', e);
    }
}

function createBoinkSound() {
    // Create a simple "boink" sound using oscillators
    boinkSound = function() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Boink sound: quick descending tone
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    };
}

function playBoink() {
    if (boinkSound) {
        boinkSound();
    }
}

async function startGame() {
    if (gameRunning) return;
    
    const status = document.getElementById('status');
    const startBtn = document.getElementById('startBtn');
    
    // Request device motion permission (required for iOS 13+)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission !== 'granted') {
                status.textContent = 'Motion permission denied';
                return;
            }
        } catch (error) {
            console.error('Error requesting motion permission:', error);
            status.textContent = 'Error requesting motion permission';
            return;
        }
    }
    
    // Resume audio context (required by some browsers)
    if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    // Start listening to device motion
    window.addEventListener('devicemotion', handleMotion);
    
    gameRunning = true;
    startBtn.style.display = 'none';
    status.textContent = 'Tilt your device to move the ball!';
    
    // Start game loop
    gameLoop();
}

function handleMotion(event) {
    if (!gameRunning) return;
    
    // Get acceleration data
    const accel = event.accelerationIncludingGravity;
    
    if (accel) {
        // Map device orientation to canvas coordinates
        // Different devices/browsers may have different orientations
        // These values are calibrated for typical portrait orientation
        accelerationX = accel.x ? accel.x * 0.1 : 0;
        accelerationY = accel.y ? accel.y * 0.1 : GRAVITY;
        
        // If device is in landscape, you might need to swap x and y
        // This is a simplified approach - production code would detect orientation
    }
}

function update() {
    if (!gameRunning) return;
    
    // Apply acceleration (gravity + device motion)
    ball.vx += accelerationX;
    ball.vy += accelerationY;
    
    // Apply friction
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;
    
    // Update position
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    // Collision detection with boundaries
    let bounced = false;
    
    // Left boundary
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx * BOUNCE_EFFICIENCY;
        bounced = true;
    }
    
    // Right boundary
    if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.vx = -ball.vx * BOUNCE_EFFICIENCY;
        bounced = true;
    }
    
    // Top boundary
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy * BOUNCE_EFFICIENCY;
        bounced = true;
    }
    
    // Bottom boundary
    if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.vy = -ball.vy * BOUNCE_EFFICIENCY;
        bounced = true;
    }
    
    // Play sound if bounced
    if (bounced) {
        playBoink();
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw ball with gradient
    const gradient = ctx.createRadialGradient(
        ball.x - ball.radius * 0.3,
        ball.y - ball.radius * 0.3,
        ball.radius * 0.1,
        ball.x,
        ball.y,
        ball.radius
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#cccccc');
    gradient.addColorStop(1, '#666666');
    
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add highlight to make it look like a ball bearing
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
    
    // Draw shadow
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function gameLoop() {
    if (!gameRunning) return;
    
    update();
    draw();
    
    requestAnimationFrame(gameLoop);
}

// Start the game when page loads
window.addEventListener('load', init);
