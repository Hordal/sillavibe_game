const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 상수 및 초기 설정 ---
const gravity = 0.3, groundY = canvas.height - 50, netWidth = 10, netHeight = 100;
const netX = canvas.width / 2 - netWidth / 2, netY = groundY - netHeight;
const WIN_SCORE = 11, WIN_SETS = 3;

// --- 게임 상태 변수 ---
let player, opponent, ball, particles, clouds;
let scores, setScores;
let gameState = 'menu'; // menu, play, paused, pause_menu, gameOver
let gameMode = 1; // 1 or 2
let menuSelection = 0;
let pauseMenuSelection = 0;
const pauseMenuOptions1P = ['Resume Game', 'Restart Match', 'Back to Main Menu'];
const pauseMenuOptions2P = ['Resume Game'];

// --- 초기화 함수 ---
function initialize() {
    initClouds();
    initGameObjects();
    gameLoop();
}

function initClouds() {
    clouds = [
        { x: 100, y: 80, r: 25, speed: 0.1 }, { x: 350, y: 60, r: 35, speed: 0.15 }, { x: 500, y: 90, r: 30, speed: 0.12 }
    ];
}

function initGameObjects() {
    player = { x: canvas.width / 4, y: groundY, width: 50, height: 50, vx: 0, vy: 0, color: '#3498db', onGround: true };
    opponent = { x: (canvas.width * 3) / 4, y: groundY, width: 50, height: 50, vx: 0, vy: 0, color: '#e74c3c', onGround: true };
    ball = { x: canvas.width / 4, y: canvas.height / 2, radius: 15, vx: 4, vy: -5, color: '#f1c40f', trail: [] };
    particles = [];
}

function startNewMatch() {
    scores = { player: 0, opponent: 0 };
    setScores = { player: 0, opponent: 0 };
    initGameObjects();
    gameState = 'play';
}

// --- 그리기 함수들 ---
function drawCircle(x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

function drawCourt() {
    const skyGradient = ctx.createLinearGradient(0, 0, 0, groundY); skyGradient.addColorStop(0, '#6dd5ed'); skyGradient.addColorStop(1, '#2193b0');
    ctx.fillStyle = skyGradient; ctx.fillRect(0, 0, canvas.width, groundY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    clouds.forEach(c => { c.x += c.speed; if (c.x - c.r > canvas.width) c.x = -c.r * 2; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); ctx.arc(c.x + 25, c.y - 10, c.r, 0, Math.PI * 2); ctx.arc(c.x + 50, c.y, c.r, 0, Math.PI * 2); ctx.fill(); });
    const groundGradient = ctx.createLinearGradient(0, groundY, 0, canvas.height); groundGradient.addColorStop(0, '#f9e499'); groundGradient.addColorStop(1, '#f2c14e');
    ctx.fillStyle = groundGradient; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.arc(Math.random() * canvas.width, groundY + Math.random() * 50, Math.random() * 3, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
    for (let i = 0; i < 15; i++) { ctx.beginPath(); ctx.moveTo(netX, netY + i * (netHeight / 14)); ctx.lineTo(netX + netWidth, netY + i * (netHeight / 14)); ctx.stroke(); }
    ctx.fillStyle = '#555'; ctx.fillRect(netX - 2, netY, 2, netHeight); ctx.fillRect(netX + netWidth, netY, 2, netHeight);
}

function drawPlayer(p) {
    const shadowY = groundY + 2, shadowWidth = p.width * 0.7, shadowHeight = 8 * Math.max(0, 1 - (groundY - (p.y + p.height)) / (groundY * 0.7));
    if (shadowHeight > 0) { ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; ctx.beginPath(); ctx.ellipse(p.x + p.width / 2, shadowY, shadowWidth / 2, shadowHeight, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.width, p.height);
    const eyeX = p.vx >= 0 ? p.x + p.width - 20 : p.x + 5;
    ctx.fillStyle = 'white'; ctx.fillRect(eyeX, p.y + 10, 15, 15); ctx.fillStyle = 'black'; ctx.fillRect(eyeX + 5, p.y + 15, 5, 5);
}

function drawBall(b) {
    b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 8) b.trail.shift();
    for (let i = 0; i < b.trail.length; i++) { const t = b.trail[i]; ctx.globalAlpha = i / b.trail.length * 0.5; drawCircle(t.x, t.y, b.radius * (i / b.trail.length), b.color); }
    ctx.globalAlpha = 1.0;
    const shadowX = b.x, shadowY = groundY + 2, shadowWidth = b.radius * 0.8, shadowHeight = 4 * Math.max(0, 1 - (groundY - b.y) / groundY);
    if (shadowHeight > 0) { ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; ctx.beginPath(); ctx.ellipse(shadowX, shadowY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2); ctx.fill(); }
    const gradient = ctx.createRadialGradient(b.x - 5, b.y - 5, 2, b.x, b.y, b.radius); gradient.addColorStop(0, 'white'); gradient.addColorStop(1, b.color);
    drawCircle(b.x, b.y, b.radius, gradient);
}

function drawScores() {
    ctx.font = "20px 'Press Start 2P'"; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.fillRect(canvas.width / 2 - 160, 15, 320, 75);
    ctx.fillStyle = 'white'; ctx.fillText(`Sets: ${setScores.player} - ${setScores.opponent}`, canvas.width / 2, 45);
    ctx.font = "28px 'Press Start 2P'"; ctx.fillText(scores.player, canvas.width / 4, 75); ctx.fillText(scores.opponent, (canvas.width * 3) / 4, 75);
    ctx.textAlign = 'left';
}

function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i]; p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
        else { ctx.globalAlpha = p.life / 25; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0; }
    }
}

function drawMenu() {
    drawCourt(); ctx.textAlign = 'center'; ctx.font = "32px 'Press Start 2P'";
    ctx.fillStyle = 'white'; ctx.shadowColor = 'black'; ctx.shadowBlur = 5;
    ctx.fillText('Beach Volleyball', canvas.width / 2, 150);
    ctx.shadowBlur = 0; ctx.font = "24px 'Press Start 2P'";
    ctx.fillStyle = menuSelection === 0 ? '#f1c40f' : 'white'; ctx.fillText('1 Player', canvas.width / 2, 250);
    ctx.fillStyle = menuSelection === 1 ? '#f1c40f' : 'white'; ctx.fillText('2 Players', canvas.width / 2, 300);
    ctx.font = "16px 'Press Start 2P'"; ctx.fillStyle = 'white';
    ctx.fillText('Use Arrow Keys and Enter to Select', canvas.width / 2, 400);
    ctx.textAlign = 'left';
}

function drawEndScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white'; ctx.font = "36px 'Press Start 2P'"; ctx.textAlign = 'center';
    const winnerText = setScores.player >= WIN_SETS ? 'Player 1' : (gameMode === 1 ? 'Computer' : 'Player 2');
    ctx.fillText(`${winnerText} Wins!`, canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "18px 'Press Start 2P'"; ctx.fillText('Press Enter to Return to Menu', canvas.width / 2, canvas.height / 2 + 20);
    ctx.textAlign = 'left';
}

function drawPauseMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.font = "24px 'Press Start 2P'";
    const options = gameMode === 1 ? pauseMenuOptions1P : pauseMenuOptions2P;
    options.forEach((option, index) => {
        ctx.fillStyle = index === pauseMenuSelection ? '#f1c40f' : 'white';
        ctx.fillText(option, canvas.width / 2, 200 + index * 60);
    });
    ctx.textAlign = 'left';
}

// --- 업데이트 및 물리 엔진 ---
function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) { particles.push({ x, y, color, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, radius: Math.random() * 2.5 + 1, life: 25 }); }
}

function applyPhysics(p) {
    p.vy += gravity; p.y += p.vy; p.x += p.vx;
    if (p.y + p.height > groundY) { p.y = groundY - p.height; p.vy = 0; p.onGround = true; }
}

function updatePlayer1() {
    applyPhysics(player);
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > netX) player.x = netX - player.width;
}

function updatePlayer2() {
    applyPhysics(opponent);
    if (opponent.x < netX + netWidth) opponent.x = netX + netWidth;
    if (opponent.x + opponent.width > canvas.width) opponent.x = canvas.width - opponent.width;
}

function updateAI() {
    if (ball.x > canvas.width / 2) {
        if (opponent.x + opponent.width / 2 < ball.x - 10) opponent.vx = 3;
        else if (opponent.x + opponent.width / 2 > ball.x + 10) opponent.vx = -3;
        else opponent.vx = 0;
    }
    if (ball.y < canvas.height / 1.5 && opponent.onGround && ball.x > canvas.width / 2) { opponent.vy = -9; opponent.onGround = false; }
    applyPhysics(opponent);
    if (opponent.x < netX + netWidth) opponent.x = netX + netWidth;
    if (opponent.x + opponent.width > canvas.width) opponent.x = canvas.width - opponent.width;
}

function updateBall() {
    ball.vy += gravity / 2; ball.y += ball.vy; ball.x += ball.vx;
    if ((ball.x + ball.radius > canvas.width) || (ball.x - ball.radius < 0)) { ball.vx *= -1; createParticles(ball.x, ball.y, '#bdc3c7'); }
    if (ball.y - ball.radius < 0) { ball.vy *= -1; createParticles(ball.x, ball.y, '#bdc3c7'); }
    if (isColliding(ball, player)) handleCollision(ball, player);
    if (isColliding(ball, opponent)) handleCollision(ball, opponent);
    if (ball.x + ball.radius > netX && ball.x - ball.radius < netX + netWidth && ball.y + ball.radius > netY) { ball.vx *= -1.1; ball.x += ball.vx * 2; createParticles(ball.x, ball.y, 'white'); }
    if (ball.y + ball.radius > groundY) {
        createParticles(ball.x, groundY, '#FADDAA');
        if (ball.x < canvas.width / 2) { scores.opponent++; checkSetWin(); resetBall('player'); }
        else { scores.player++; checkSetWin(); resetBall('opponent'); }
    }
}

function handleCollision(b, p) {
    createParticles(b.x, b.y, p.color);
    let dx = b.x - (p.x + p.width / 2); b.vy = -6; b.vx = dx * 0.2;
}

function isColliding(c, r) {
    let dX = Math.abs(c.x - r.x - r.width / 2), dY = Math.abs(c.y - r.y - r.height / 2);
    if (dX > r.width / 2 + c.radius || dY > r.height / 2 + c.radius) return false;
    if (dX <= r.width / 2 || dY <= r.height / 2) return true;
    let corner = (dX - r.width / 2) ** 2 + (dY - r.height / 2) ** 2;
    return corner <= c.radius ** 2;
}

function checkSetWin() {
    const pS = scores.player, oS = scores.opponent; let setW = null;
    if (pS >= WIN_SCORE && pS - oS >= 2) setW = 'player'; else if (oS >= WIN_SCORE && oS - pS >= 2) setW = 'opponent';
    if (setW) { setScores[setW]++; if (setScores[setW] >= WIN_SETS) { gameState = 'gameOver'; } else { gameState = 'paused'; setTimeout(() => { scores.player = 0; scores.opponent = 0; gameState = 'play'; }, 1500); } }
}

function resetBall(scoredBy) {
    if (gameState === 'gameOver') return;
    ball.vy = -5; ball.y = canvas.height / 2; ball.trail = [];
    if (scoredBy === 'player') { ball.x = (canvas.width * 3) / 4; ball.vx = -4; } else { ball.x = canvas.width / 4; ball.vx = 4; }
}

// --- 메인 게임 루프 ---
function runGameFrame() {
    if (gameState === 'play') {
        updatePlayer1();
        if (gameMode === 1) { updateAI(); } else { updatePlayer2(); }
        updateBall();
    }
    drawCourt();
    drawPlayer(player);
    drawPlayer(opponent);
    drawBall(ball);
    updateAndDrawParticles();
    drawScores();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    switch (gameState) {
        case 'menu': drawMenu(); break;
        case 'play': case 'paused': runGameFrame(); break;
        case 'pause_menu': runGameFrame(); drawPauseMenu(); break;
        case 'gameOver': runGameFrame(); drawEndScreen(); break;
    }
    requestAnimationFrame(gameLoop);
}

// --- 컨트롤 ---
document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (gameState === 'play' && key === 'escape') {
        pauseMenuSelection = 0;
        gameState = 'pause_menu';
        return;
    }
    if (gameState === 'pause_menu') {
        const options = gameMode === 1 ? pauseMenuOptions1P : pauseMenuOptions2P;
        if (key === 'arrowup') { pauseMenuSelection = (pauseMenuSelection - 1 + options.length) % options.length; }
        if (key === 'arrowdown') { pauseMenuSelection = (pauseMenuSelection + 1) % options.length; }
        if (key === 'escape') { gameState = 'play'; }
        if (key === 'enter') {
            const selectedOption = options[pauseMenuSelection];
            switch (selectedOption) {
                case 'Resume Game': gameState = 'play'; break;
                case 'Restart Match': startNewMatch(); break;
                case 'Back to Main Menu': gameState = 'menu'; initGameObjects(); break;
            }
        }
        return;
    }
    if (gameState === 'menu') {
        if (key === 'arrowup') menuSelection = 0;
        if (key === 'arrowdown') menuSelection = 1;
        if (key === 'enter') { gameMode = menuSelection + 1; startNewMatch(); }
        return;
    }
    if (gameState === 'gameOver') {
        if (key === 'enter') { gameState = 'menu'; initGameObjects(); }
        return;
    }
    if (gameState === 'play') {
        if (gameMode === 1) { // 1P: Arrows
            if (key === 'arrowleft') player.vx = -5;
            if (key === 'arrowright') player.vx = 5;
            if (key === 'arrowup' && player.onGround) { player.vy = -10; player.onGround = false; }
        } else { // 2P: P1=WASD, P2=Arrows
            if (key === 'a') player.vx = -5;
            if (key === 'd') player.vx = 5;
            if (key === 'w' && player.onGround) { player.vy = -10; player.onGround = false; }
            if (key === 'arrowleft') opponent.vx = -5;
            if (key === 'arrowright') opponent.vx = 5;
            if (key === 'arrowup' && opponent.onGround) { opponent.vy = -10; opponent.onGround = false; }
        }
    }
});

document.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    if (gameState !== 'play') return;
    if (gameMode === 1) {
        if (key === 'arrowleft' || key === 'arrowright') player.vx = 0;
    } else {
        if (key === 'a' || key === 'd') player.vx = 0;
        if (key === 'arrowleft' || key === 'arrowright') opponent.vx = 0;
    }
});

// --- 게임 시작 ---
initialize();