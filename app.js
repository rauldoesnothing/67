// 67 Challenge Counter App
class SixtySevenCounter {
    constructor() {
        this.count = 0;
        this.goalCount = 100000;
        
        // Detection states
        this.gestureDetected = false;
        this.audioDetected = false;
        this.lastDetectionTime = 0;
        this.detectionCooldown = 1000; // 1 second cooldown between counts
        
        // Hand tracking
        this.hands = null;
        this.camera = null;
        this.isShaking = false;
        this.handVelocities = { left: [], right: [] };
        this.velocityThreshold = 15; // Minimum velocity for shake detection
        this.lastHandPositions = { left: null, right: null };
        
        // Audio recognition
        this.recognition = null;
        this.audioKeywords = ['67', 'six seven', 'sixty seven'];
        
        // DOM elements
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.counterNumber = document.getElementById('counterNumber');
        this.progressFill = document.getElementById('progressFill');
        this.gestureStatus = document.getElementById('gestureStatus');
        this.audioStatus = document.getElementById('audioStatus');
        this.successFlash = document.getElementById('successFlash');
        this.startButton = document.getElementById('startButton');
        
        // Load saved count
        this.loadCount();
        this.updateDisplay();
        
        // Bind event listeners
        this.startButton.addEventListener('click', () => this.start());
    }
    
    async start() {
        this.startButton.classList.add('hidden');
        
        try {
            await this.setupCamera();
            await this.setupHandDetection();
            this.setupAudioRecognition();
            
            console.log('67 Counter initialized successfully!');
        } catch (error) {
            console.error('Error starting app:', error);
            alert('Error starting the app. Please check camera and microphone permissions.');
        }
    }
    
    async setupCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: false
            });
            
            this.video.srcObject = stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    resolve();
                };
            });
        } catch (error) {
            console.error('Camera error:', error);
            throw error;
        }
    }
    
    async setupHandDetection() {
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });
        
        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.hands.onResults((results) => this.onHandsResults(results));
        
        this.camera = new Camera(this.video, {
            onFrame: async () => {
                await this.hands.send({ image: this.video });
            },
            width: 1280,
            height: 720
        });
        
        this.camera.start();
    }
    
    setupAudioRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        this.recognition.onresult = (event) => {
            let transcript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript.toLowerCase();
            }
            
            // Check if any keyword is detected
            const detected = this.audioKeywords.some(keyword => 
                transcript.includes(keyword.toLowerCase())
            );
            
            if (detected) {
                this.onAudioDetected();
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error !== 'no-speech') {
                setTimeout(() => this.recognition.start(), 1000);
            }
        };
        
        this.recognition.onend = () => {
            this.recognition.start();
        };
        
        this.recognition.start();
    }
    
    onHandsResults(results) {
        // Draw video frame
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {
            // Draw hand landmarks
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                drawConnectors(this.ctx, results.multiHandLandmarks[i], HAND_CONNECTIONS,
                             { color: '#00FF00', lineWidth: 2 });
                drawLandmarks(this.ctx, results.multiHandLandmarks[i],
                            { color: '#FF0000', lineWidth: 1 });
            }
            
            // Detect shaking motion
            this.detectShaking(results.multiHandLandmarks, results.multiHandedness);
        } else {
            this.gestureDetected = false;
            this.updateGestureStatus(false);
        }
        
        this.ctx.restore();
    }
    
    detectShaking(landmarks, handedness) {
        // Calculate velocities for both hands
        landmarks.forEach((hand, index) => {
            const wrist = hand[0]; // Wrist landmark
            const handLabel = handedness[index].label.toLowerCase();
            
            if (this.lastHandPositions[handLabel]) {
                const dx = (wrist.x - this.lastHandPositions[handLabel].x) * this.canvas.width;
                const dy = (wrist.y - this.lastHandPositions[handLabel].y) * this.canvas.height;
                const velocity = Math.sqrt(dx * dx + dy * dy);
                
                // Store velocity
                if (this.handVelocities[handLabel].length >= 5) {
                    this.handVelocities[handLabel].shift();
                }
                this.handVelocities[handLabel].push(velocity);
            }
            
            this.lastHandPositions[handLabel] = { x: wrist.x, y: wrist.y };
        });
        
        // Check if both hands are shaking (high velocity)
        const leftShaking = this.handVelocities.left.length >= 3 && 
                           this.handVelocities.left.some(v => v > this.velocityThreshold);
        const rightShaking = this.handVelocities.right.length >= 3 && 
                            this.handVelocities.right.some(v => v > this.velocityThreshold);
        
        const isShaking = leftShaking && rightShaking;
        
        if (isShaking) {
            this.onGestureDetected();
        } else {
            this.gestureDetected = false;
            this.updateGestureStatus(false);
        }
    }
    
    onGestureDetected() {
        this.gestureDetected = true;
        this.updateGestureStatus(true);
        this.checkForCount();
    }
    
    onAudioDetected() {
        this.audioDetected = true;
        this.updateAudioStatus(true);
        this.checkForCount();
        
        // Reset audio detection after short delay
        setTimeout(() => {
            this.audioDetected = false;
            this.updateAudioStatus(false);
        }, 500);
    }
    
    checkForCount() {
        const now = Date.now();
        
        // Both conditions must be met and cooldown passed
        if (this.gestureDetected && this.audioDetected && 
            (now - this.lastDetectionTime) > this.detectionCooldown) {
            
            this.incrementCount();
            this.lastDetectionTime = now;
        }
    }
    
    incrementCount() {
        this.count++;
        this.saveCount();
        this.updateDisplay();
        this.showSuccessFlash();
        
        console.log(`67 Count: ${this.count}`);
    }
    
    updateDisplay() {
        // Update counter number
        this.counterNumber.textContent = this.count.toLocaleString();
        this.counterNumber.classList.add('pulse');
        setTimeout(() => this.counterNumber.classList.remove('pulse'), 300);
        
        // Update progress bar
        const progress = Math.min((this.count / this.goalCount) * 100, 100);
        this.progressFill.style.width = `${progress}%`;
        this.progressFill.textContent = `${progress.toFixed(2)}%`;
    }
    
    updateGestureStatus(active) {
        if (active) {
            this.gestureStatus.classList.add('active');
        } else {
            this.gestureStatus.classList.remove('active');
        }
    }
    
    updateAudioStatus(active) {
        if (active) {
            this.audioStatus.classList.add('active');
        } else {
            this.audioStatus.classList.remove('active');
        }
    }
    
    showSuccessFlash() {
        this.successFlash.classList.add('active');
        setTimeout(() => this.successFlash.classList.remove('active'), 200);
    }
    
    saveCount() {
        localStorage.setItem('sixtySevenCount', this.count.toString());
        localStorage.setItem('sixtySevenLastUpdate', new Date().toISOString());
    }
    
    loadCount() {
        const saved = localStorage.getItem('sixtySevenCount');
        if (saved) {
            this.count = parseInt(saved, 10);
        }
    }
}

// Initialize app
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new SixtySevenCounter();
});
