// Cấu hình Pi SDK
const Pi = window.Pi;
let currentUser = null;

// Trạng thái game
let score = 0;
let highScore = localStorage.getItem('pi_freaking_math_highscore') || 0;
let currentAnswer = false;
let timer = 100;
let timerInterval = null;
let gameActive = false;
let baseTime = 3000; // 3 giây khởi đầu

// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const gameScreen = document.getElementById('game-screen');
const overScreen = document.getElementById('over-screen');

const btnLogin = document.getElementById('btn-login');
const btnRestart = document.getElementById('btn-restart');
const btnHome = document.getElementById('btn-home');
const btnTrue = document.getElementById('btn-true');
const btnFalse = document.getElementById('btn-false');

const equationEl = document.getElementById('equation');
const currentScoreEl = document.getElementById('current-score');
const timerBar = document.getElementById('timer-bar');
const finalScoreEl = document.getElementById('final-score');
const highScoreEl = document.getElementById('high-score');
const bestScoreDisplay = document.getElementById('best-score-display');

// Khởi tạo ứng dụng
async function init() {
    if (bestScoreDisplay) bestScoreDisplay.textContent = highScore;
    
    const debugInfo = document.createElement('div');
    debugInfo.style.cssText = 'position:fixed;bottom:5px;left:0;width:100%;font-size:10px;color:#94a3b8;text-align:center;z-index:9999;pointer-events:none;background:rgba(0,0,0,0.5);';
    debugInfo.id = 'debug-ua';
    document.body.appendChild(debugInfo);

    setTimeout(async () => {
        const ua = navigator.userAgent.toLowerCase();
        const hasPiObject = typeof Pi !== 'undefined';
        
        // Kiểm tra UA mở rộng hơn
        const isPiUA = ua.includes('pibrowser') || ua.includes('pi-browser') || ua.includes('pi search') || ua.includes('pi/');
        
        // Nếu là thiết bị di động và có Object Pi, khả năng cao là Pi Browser
        const isMobile = /iphone|ipad|ipod|android/i.test(ua);
        const isPiBrowser = hasPiObject && (isPiUA || window.PiProxy || (isMobile && !ua.includes('chrome') && !ua.includes('safari')));
        
        document.getElementById('debug-ua').textContent = `Obj: ${hasPiObject} | UA: ${isPiUA} | Mob: ${isMobile} | Res: ${isPiBrowser}`;

        if (!isPiBrowser) {
            if (btnLogin) {
                btnLogin.textContent = "CHƠI NGAY (GUEST MODE)";
                btnLogin.style.backgroundColor = '#10b981';
            }
        } else {
            try {
                // Thử init với sandbox: true trước
                Pi.init({ version: "2.0", sandbox: true });
                if (btnLogin) {
                    btnLogin.textContent = "ĐĂNG NHẬP VỚI PI";
                    btnLogin.style.backgroundColor = ''; 
                }
                console.log("Pi SDK Initialized successfully");
            } catch (err) {
                console.error("SDK Init Error:", err);
            }
        }
    }, 800); // Tăng lên 800ms để đảm bảo môi trường đã sẵn sàng
}

// Xử lý đăng nhập
async function loginWithPi() {
    // Chỉ chạy xác thực nếu thực sự là Pi Browser
    const isPiBrowser = typeof Pi !== 'undefined' && navigator.userAgent.toLowerCase().includes('pibrowser');

    if (!isPiBrowser) {
        startGame();
        return;
    }

    try {
        const scopes = ['username', 'payments'];
        const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
        currentUser = auth.user;
        
        document.getElementById('username').textContent = currentUser.username;
        if (currentUser.image) {
            const avatar = document.getElementById('user-avatar');
            avatar.src = currentUser.image;
            avatar.style.display = 'block';
        }
        
        startGame();
    } catch (err) {
        console.error("Pi Auth Error:", err);
        startGame(); // Lỗi vẫn cho chơi tiếp
    }
}

function onIncompletePaymentFound(payment) {
    console.log("Incomplete Payment:", payment);
};

// Logic Game
function generateEquation() {
    const operators = ['+', '-', '×'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    let a, b, realAns, displayAns;

    if (op === '+') {
        a = Math.floor(Math.random() * 15) + 1;
        b = Math.floor(Math.random() * 15) + 1;
        realAns = a + b;
    } else if (op === '-') {
        a = Math.floor(Math.random() * 20) + 10;
        b = Math.floor(Math.random() * a) + 1;
        realAns = a - b;
    } else {
        a = Math.floor(Math.random() * 9) + 2;
        b = Math.floor(Math.random() * 9) + 2;
        realAns = a * b;
    }

    // 50% cơ hội hiển thị đáp án đúng
    const isCorrect = Math.random() > 0.5;
    if (isCorrect) {
        displayAns = realAns;
        currentAnswer = true;
    } else {
        const offset = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
        displayAns = realAns + offset;
        currentAnswer = false;
        // Chống trường hợp ngẫu nhiên lại ra đáp án đúng
        if (displayAns === realAns) displayAns += 1;
    }

    equationEl.textContent = `${a} ${op} ${b} = ${displayAns}`;
    
    // Tăng tốc độ theo điểm số
    const gameSpeed = Math.max(1000, baseTime - (score * 50));
    resetTimer(gameSpeed);
}

function resetTimer(duration) {
    clearInterval(timerInterval);
    timer = 100;
    const start = Date.now();
    
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - start;
        timer = 100 - (elapsed / duration * 100);
        
        if (timer <= 0) {
            timer = 0;
            gameOver();
        }
        timerBar.style.width = timer + '%';
    }, 16);
}

function handleAnswer(choice) {
    if (!gameActive) return;

    if (choice === currentAnswer) {
        score++;
        currentScoreEl.textContent = score;
        
        // Thêm hiệu ứng nhấn mạnh khi trả lời đúng
        equationEl.classList.remove('pulse-success');
        void equationEl.offsetWidth; // Trigger reflow
        equationEl.classList.add('pulse-success');
        
        generateEquation();
    } else {
        gameOver();
    }
}

function startGame() {
    score = 0;
    currentScoreEl.textContent = "0";
    gameActive = true;
    
    switchScreen(gameScreen);
    generateEquation();
}

function gameOver() {
    gameActive = false;
    clearInterval(timerInterval);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('pi_freaking_math_highscore', highScore);
    }
    
    finalScoreEl.textContent = score;
    highScoreEl.textContent = highScore;
    
    // Hiệu ứng rung màn hình
    gameScreen.classList.add('shake');
    setTimeout(() => {
        gameScreen.classList.remove('shake');
        switchScreen(overScreen);
    }, 300);
}

function switchScreen(target) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    target.classList.add('active');
}

// Event Listeners
btnLogin.addEventListener('click', loginWithPi);
btnRestart.addEventListener('click', startGame);
btnHome.addEventListener('click', () => {
    bestScoreDisplay.textContent = highScore;
    switchScreen(welcomeScreen);
});
btnTrue.addEventListener('click', () => handleAnswer(true));
btnFalse.addEventListener('click', () => handleAnswer(false));

// Keyboard support for testing
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') handleAnswer(true);
    if (e.key === 'ArrowRight') handleAnswer(false);
});

// Khởi chạy
init();
