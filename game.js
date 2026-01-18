// Game constants
const BOUNCE_EFFICIENCY = 0.9;
const BALL_RADIUS = 15;
const GRAVITY = 0.5;
const FRICTION = 0.99;
const ACCELERATION_MULTIPLIER = 0.1;
const STICKY_RADIUS = 30;
const STICKY_STRENGTH = 0.85; // How much velocity is dampened in sticky spots
const BOUNCE_THRESHOLD = 2; // Minimum bounce velocity to play sound
const CORNER_CAPTURE_THRESHOLD = 1.5; // Max velocity to be captured in corner
const CORNER_CAPTURE_RADIUS_FACTOR = 0.5; // Multiplier for sticky radius to determine capture zone
const REQUIRED_CORNERS = 4; // Number of corners needed to win

// Sound effect constants
const BOINK_START_FREQ = 400;
const BOINK_END_FREQ = 100;
const BOINK_DURATION = 0.1;
const BOINK_GAIN = 0.3;
const BOINK_END_GAIN = 0.01;

// Game state
let canvas, ctx;
let balls = [];
let gameRunning = false;
let accelerationX = 0;
let accelerationY = GRAVITY;
let motionListenerActive = false;
let stickySpots = [];
let ballStates = []; // Track if balls are captured in corners
let cornerCaptureCache = {}; // Cache for which corners have captured balls

// Audio context for sound effects
let audioContext;
let boinkSound;
let tadaSound;
let wahwahSound;

// Initialize the game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize balls in four quadrants
    initBalls();
    
    // Initialize sticky spots
    initStickySpots();
    
    // Setup button
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', startGame);
    
    // Initialize audio
    initAudio();
    
    // Draw initial state
    draw();
}

function initBalls() {
    balls = [];
    ballStates = [];
    cornerCaptureCache = {};
    const w = canvas.width;
    const h = canvas.height;
    
    // Create balls, one in each quadrant
    const quadrants = [
        { x: w * 0.25, y: h * 0.25 }, // Top-left
        { x: w * 0.75, y: h * 0.25 }, // Top-right
        { x: w * 0.25, y: h * 0.75 }, // Bottom-left
        { x: w * 0.75, y: h * 0.75 }  // Bottom-right
    ];
    
    for (let i = 0; i < REQUIRED_CORNERS; i++) {
        balls.push({
            x: quadrants[i].x,
            y: quadrants[i].y,
            vx: 0,
            vy: 0,
            radius: BALL_RADIUS
        });
        ballStates.push({ captured: false, cornerIndex: -1 });
    }
    
    // Initialize corner capture cache
    for (let i = 0; i < REQUIRED_CORNERS; i++) {
        cornerCaptureCache[i] = false;
    }
}

function initStickySpots() {
    stickySpots = [];
    const w = canvas.width;
    const h = canvas.height;
    
    // Center sticky spot (where quadrants meet)
    stickySpots.push({ x: w / 2, y: h / 2, isCorner: false });
    
    // Four outside corner sticky spots
    stickySpots.push({ x: 0, y: 0, isCorner: true, index: 0 }); // Top-left
    stickySpots.push({ x: w, y: 0, isCorner: true, index: 1 }); // Top-right
    stickySpots.push({ x: 0, y: h, isCorner: true, index: 2 }); // Bottom-left
    stickySpots.push({ x: w, y: h, isCorner: true, index: 3 }); // Bottom-right
}

function resizeCanvas() {
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 120;
    const size = Math.min(maxWidth, maxHeight, 600);
    
    canvas.width = size;
    canvas.height = size;
    
    // Reinitialize balls and sticky spots on resize
    if (balls.length > 0) {
        initBalls();
        initStickySpots();
    }
}

function initAudio() {
    // Note: AudioContext is created here but will be resumed in startGame
    // after user interaction to comply with browser autoplay policies
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        createBoinkSound();
        createTadaSound();
        createWahwahSound();
    } catch (e) {
        console.warn('Web Audio API not supported:', e);
    }
}

function createBoinkSound() {
    // Create a simple "boink" sound using oscillators
    boinkSound = function(velocity) {
        if (!audioContext) return;
        
        // Calculate bounce height from velocity
        const bounceHeight = Math.abs(velocity);
        
        // Only play sound if bounce is above threshold
        if (bounceHeight < BOUNCE_THRESHOLD) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Boink sound: quick descending tone
        oscillator.frequency.setValueAtTime(BOINK_START_FREQ, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(BOINK_END_FREQ, audioContext.currentTime + BOINK_DURATION);
        
        gainNode.gain.setValueAtTime(BOINK_GAIN, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(BOINK_END_GAIN, audioContext.currentTime + BOINK_DURATION);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + BOINK_DURATION);
    };
}

function createTadaSound() {
    // Create a celebratory "ta-da" sound
    tadaSound = function() {
        if (!audioContext) return;
        
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Ta-da: ascending notes
        oscillator1.frequency.setValueAtTime(523, audioContext.currentTime); // C
        oscillator1.frequency.setValueAtTime(659, audioContext.currentTime + 0.15); // E
        oscillator2.frequency.setValueAtTime(659, audioContext.currentTime); // E
        oscillator2.frequency.setValueAtTime(784, audioContext.currentTime + 0.15); // G
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.3);
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.3);
    };
}

function createWahwahSound() {
    // Create a sad "wah-wah" sound
    wahwahSound = function() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Wah-wah: descending sad notes
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A
        oscillator.frequency.setValueAtTime(415, audioContext.currentTime + 0.15); // G#
        oscillator.frequency.setValueAtTime(392, audioContext.currentTime + 0.3); // G
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    };
}

function playBoink(velocity) {
    if (boinkSound) {
        boinkSound(velocity);
    }
}

function playTada() {
    if (tadaSound) {
        tadaSound();
    }
}

function playWahwah() {
    if (wahwahSound) {
        wahwahSound();
    }
}

async function startGame() {
    const status = document.getElementById('status');
    const startBtn = document.getElementById('startBtn');
    
    // Reset game state
    initBalls();
    gameRunning = false;
    
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
    if (!motionListenerActive) {
        window.addEventListener('devicemotion', handleMotion);
        motionListenerActive = true;
    }
    
    gameRunning = true;
    startBtn.style.display = 'none';
    status.textContent = 'Tilt to move balls into all 4 corners!';
    status.style.fontSize = '14px';
    status.style.fontWeight = 'normal';
    
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
        // Note: X-axis is negated to match expected left/right tilt behavior
        accelerationX = accel.x ? -accel.x * ACCELERATION_MULTIPLIER : 0;
        accelerationY = accel.y ? accel.y * ACCELERATION_MULTIPLIER : GRAVITY;
        
        // TODO: Detect device orientation and adjust axis mapping accordingly
        // In landscape mode, x and y axes may need to be swapped
    }
}

function update() {
    if (!gameRunning) return;
    
    // Update each ball
    for (let i = 0; i < balls.length; i++) {
        updateBall(balls[i], i);
    }
    
    // Check win condition
    checkWinCondition();
}

function updateBall(ball, ballIndex) {
    // Apply acceleration (gravity + device motion)
    ball.vx += accelerationX;
    ball.vy += accelerationY;
    
    // Apply friction
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;
    
    // Check sticky spots and apply dampening
    for (let spot of stickySpots) {
        const dx = ball.x - spot.x;
        const dy = ball.y - spot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < STICKY_RADIUS) {
            ball.vx *= STICKY_STRENGTH;
            ball.vy *= STICKY_STRENGTH;
            
            // Check if ball is captured in a corner
            if (spot.isCorner) {
                const velocity = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                const wasCapture = ballStates[ballIndex].captured;
                const isNowCaptured = velocity < CORNER_CAPTURE_THRESHOLD && dist < STICKY_RADIUS * CORNER_CAPTURE_RADIUS_FACTOR;
                
                if (isNowCaptured && !wasCapture) {
                    // Ball just got captured
                    ballStates[ballIndex].captured = true;
                    ballStates[ballIndex].cornerIndex = spot.index;
                    cornerCaptureCache[spot.index] = true;
                    playTada();
                } else if (!isNowCaptured && wasCapture && ballStates[ballIndex].cornerIndex === spot.index) {
                    // Ball just escaped
                    ballStates[ballIndex].captured = false;
                    ballStates[ballIndex].cornerIndex = -1;
                    cornerCaptureCache[spot.index] = false;
                    playWahwah();
                } else if (isNowCaptured) {
                    // Still captured
                    ballStates[ballIndex].captured = true;
                    ballStates[ballIndex].cornerIndex = spot.index;
                    cornerCaptureCache[spot.index] = true;
                }
            }
        }
    }
    
    // Update position
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    // Collision detection with boundaries
    let bounced = false;
    let bounceVelocity = 0;
    
    // Left boundary
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        bounceVelocity = Math.abs(ball.vx);
        ball.vx = -ball.vx * BOUNCE_EFFICIENCY;
        bounced = true;
    }
    
    // Right boundary
    if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        bounceVelocity = Math.abs(ball.vx);
        ball.vx = -ball.vx * BOUNCE_EFFICIENCY;
        bounced = true;
    }
    
    // Top boundary
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        bounceVelocity = Math.abs(ball.vy);
        ball.vy = -ball.vy * BOUNCE_EFFICIENCY;
        bounced = true;
    }
    
    // Bottom boundary
    if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        bounceVelocity = Math.abs(ball.vy);
        ball.vy = -ball.vy * BOUNCE_EFFICIENCY;
        bounced = true;
    }
    
    // Play sound if bounced with sufficient velocity
    if (bounced) {
        playBoink(bounceVelocity);
    }
}

function checkWinCondition() {
    // Check if all balls are captured in different corners
    if (ballStates.length !== REQUIRED_CORNERS) return;
    
    const allCaptured = ballStates.every(state => state.captured);
    
    if (allCaptured) {
        // Check that all corners have a ball
        const cornerSet = new Set(ballStates.map(state => state.cornerIndex));
        if (cornerSet.size === REQUIRED_CORNERS) {
            // Win condition met!
            gameRunning = false;
            const status = document.getElementById('status');
            status.textContent = '🎉 YOU WIN! All balls captured! 🎉';
            status.style.fontSize = '24px';
            status.style.fontWeight = 'bold';
            
            // Show restart button
            const startBtn = document.getElementById('startBtn');
            startBtn.textContent = 'Play Again';
            startBtn.style.display = 'block';
        }
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw quadrant dividers
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // Vertical divider
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    // Horizontal divider
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Draw sticky spots
    for (let spot of stickySpots) {
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, STICKY_RADIUS, 0, Math.PI * 2);
        
        if (spot.isCorner) {
            // Use cached result for whether this corner has a captured ball
            const hasCapturedBall = cornerCaptureCache[spot.index] || false;
            ctx.fillStyle = hasCapturedBall 
                ? 'rgba(76, 175, 80, 0.3)' // Green if captured
                : 'rgba(255, 152, 0, 0.2)'; // Orange for corners
        } else {
            ctx.fillStyle = 'rgba(158, 158, 158, 0.2)'; // Gray for center
        }
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = spot.isCorner ? '#FF9800' : '#9E9E9E';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Draw all balls
    for (let ball of balls) {
        drawBall(ball);
    }
}

function drawBall(ball) {
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
