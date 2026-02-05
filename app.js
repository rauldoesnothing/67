// 67 Challenge Counter App
class SixtySevenCounter {
    constructor() {
        this.count = 0;
        this.goalCount = 100000;
        
        // Detection parameters (adjustable via debug panel)
        this.params = {
            shakeThreshold: 0.08,
            shakeDuration: 8,
            audioConfidence: 0.60,
            cooldown: 1000,
            detectionWindow: 500,
            showHandTracking: true,
            showVelocityVectors: false
        };
        
        // Detection states
        this.gestureDetected = false;
        this.audioDetected = false;
        this.lastDetectionTime = 0;
        this.audioDetectionTime = 0;
        
        // Hand tracking
        this.hands = null;
        this.camera = null;
        this.isShaking = false;
        this.handVelocities = { left: [], right: [] };
        this.lastHandPositions = { left: null, right: null };
        this.shakeFrameCount = 0;
        this.handsDetected = 0;
        
        // Audio recognition
        this.recognition = null;
        this.audioKeywords = ['67', 'six seven', 'sixty seven', '6 7'];
        this.lastAudioConfidence = 0;
        
        // Debug mode
        this.debugMode = false;
        
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
        this.setupDebugControls();
    }
    
    setupDebugControls() {
        const debugToggle = document.getElementById('debugToggle');
        const debugPanel = document.getElementById('debugPanel');
        
        debugToggle.addEventListener('click', () => {
            this.debugMode = !this.debugMode;
            debugPanel.classList.toggle('hidden');
            debugToggle.textContent = this.debugMode ? 'Hide Debug' : 'Debug Mode';
        });
        
        // Shake threshold
        const shakeThreshold = document.getElementById('shakeThreshold');
        const shakeThresholdValue = document.getElementById('shakeThresholdValue');
        shakeThreshold.addEventListener('input', (e) => {
            this.params.shakeThreshold = parseFloat(e.target.value);
            shakeThresholdValue.textContent = this.params.shakeThreshold.toFixed(2);
        });
        
        // Shake duration
        const shakeDuration = document.getElementById('shakeDuration');
        const shakeDurationValue = document.getElementById('shakeDurationValue');
        shakeDuration.addEventListener('input', (e) => {
            this.params.shakeDuration = parseInt(e.target.value);
            shakeDurationValue.textContent = this.params.shakeDuration;
        });
        
        // Audio confidence
        const audioConfidence = document.getElementById('audioConfidence');
        const audioConfidenceValue = document.getElementById('audioConfidenceValue');
        audioConfidence.addEventListener('input', (e) => {
            this.params.audioConfidence = parseFloat(e.target.value);
            audioConfidenceValue.textContent = this.params.audioConfidence.toFixed(2);
        });
        
        // Cooldown
        const cooldown = document.getElementById('cooldown');
        const cooldownValue = document.getElementById('cooldownValue');
        cooldown.addEventListener('input', (e) => {
            this.params.cooldown = parseInt(e.target.value);
            cooldownValue.textContent = this.params.cooldown;
        });
        
        // Detection window
        const detectionWindow = document.getElementById('detectionWindow');
        const detectionWindowValue = document.getElementById('detectionWindowValue');
        detectionWindow.addEventListener('input', (e) => {
            this.params.detectionWindow = parseInt(e.target.value);
            detectionWindowValue.textContent = this.params.detectionWindow;
        });
        
        // Visual options
        const showHandTracking = document.getElementById('showHandTracking');
        showHandTracking.addEventListener('change', (e) => {
            this.params.showHandTracking = e.target.checked;
        });
        
        const showVelocityVectors = document.getElementById('showVelocityVectors');
        showVelocityVectors.addEventListener('change', (e) => {
            this.params.showVelocityVectors = e.target.checked;
        });
        
        // Reset button
        const resetButton = document.getElementById('resetCounter');
        resetButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset the counter to 0?')) {
                this.count = 0;
                this.saveCount();
                this.updateDisplay();
            }
        });
    }
    
    updateDebugDisplay() {
        if (!this.debugMode) return;
        
        // Hands count
        document.getElementById('debugHandsCount').textContent = `${this.handsDetected}/2`;
        document.getElementById('debugGestureIndicator').classList.toggle('active', this.handsDetected === 2);
        
        // Shake detection
        const avgVelocity = this.calculateAverageVelocity();
        document.getElementById('debugShakeValue').textContent = avgVelocity.toFixed(3);
        document.getElementById('debugShakeIndicator').classList.toggle('active', this.gestureDetected);
        
        // Audio detection
        document.getElementById('debugAudioConfidence').textContent = `${Math.round(this.lastAudioConfidence * 100)}%`;
        document.getElementById('debugAudioIndicator').classList.toggle('active', this.audioDetected);
        
        // Cooldown status
        const now = Date.now();
        const timeSinceLastDetection = now - this.lastDetectionTime;
        const isReady = timeSinceLastDetection >= this.params.cooldown;
        document.getElementById('debugCooldownTime').textContent = isReady ? 'Ready' : `${Math.round((this.params.cooldown - timeSinceLastDetection) / 100) / 10}s`;
        document.getElementById('debugCooldownIndicator').classList.toggle('active', isReady);
    }
    
    calculateAverageVelocity() {
        const leftVel = this.handVelocities.left.length > 0 ? 
            this.handVelocities.left.reduce((a, b) => a + b, 0) / this.handVelocities.left.length : 0;
        const rightVel = this.handVelocities.right.length > 0 ? 
            this.handVelocities.right.reduce((a, b) => a + b, 0) / this.handVelocities.right.length : 0;
        return (leftVel + rightVel) / 2;
    }
    
    async start() {
        this.startButton.classList.add('hidden');
        
        try {
            await this.setupCamera();
            await this.setupHandDetection();
            this.setupAudioRecognition();
            this.startDetectionLoop();
        } catch (error) {
            console.error('Error starting:', error);
            alert('Error starting the app. Please ensure camera and microphone permissions are granted.');
        }
    }
    
    async setupCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: false
        });
        
        this.video.srcObject = stream;
        
        return new Promise((resolve) => {
            this.video.onloadedmetadata = () => {
                this.video.play();
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                resolve();
            };
        });
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
        
        this.hands.onResults((results) => this.onHandResults(results));
        
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
            console.error('Speech recognition not supported');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        this.recognition.onresult = (event) => {
            const results = event.results;
            const lastResult = results[results.length - 1];
            const transcript = lastResult[0].transcript.toLowerCase().trim();
            const confidence = lastResult[0].confidence;
            
            this.lastAudioConfidence = confidence;
            
            const matchesKeyword = this.audioKeywords.some(keyword => 
                transcript.includes(keyword)
            );
            
            if (matchesKeyword && confidence >= this.params.audioConfidence) {
                this.audioDetected = true;
                this.audioDetectionTime = Date.now();
                this.audioStatus.classList.add('active');
                
                setTimeout(() => {
                    this.audioDetected = false;
                    this.audioStatus.classList.remove('active');
                }, this.params.detectionWindow);
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                // Restart if no speech detected
                setTimeout(() => {
                    if (this.recognition) {
                        this.recognition.start();
                    }
                }, 100);
            }
        };
        
        this.recognition.onend = () => {
            // Auto-restart recognition
            if (this.recognition) {
                this.recognition.start();
            }
        };
        
        this.recognition.start();
    }
    
    onHandResults(results) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
        
        this.handsDetected = results.multiHandedness ? results.multiHandedness.length : 0;
        
        if (results.multiHandLandmarks && results.multiHandedness) {
            // Draw hand landmarks if enabled
            if (this.params.showHandTracking) {
                for (const landmarks of results.multiHandLandmarks) {
                    drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
                        color: '#00FF00',
                        lineWidth: 2
                    });
                    drawLandmarks(this.ctx, landmarks, {
                        color: '#FF0000',
                        lineWidth: 1,
                        radius: 3
                    });
                }
            }
            
            // Check for shake gesture
            this.checkShakeGesture(results.multiHandLandmarks, results.multiHandedness);
        } else {
            this.gestureDetected = false;
            this.gestureStatus.classList.remove('active');
            this.shakeFrameCount = 0;
        }
        
        this.updateDebugDisplay();
    }
    
    checkShakeGesture(landmarks, handedness) {
        const currentPositions = {};
        
        // Get wrist positions for each hand
        for (let i = 0; i < landmarks.length; i++) {
            const hand = handedness[i].label.toLowerCase();
            const wrist = landmarks[i][0]; // Wrist landmark
            currentPositions[hand] = { x: wrist.x, y: wrist.y };
        }
        
        // Calculate velocities
        let hasSignificantMovement = false;
        
        for (const hand of ['left', 'right']) {
            if (currentPositions[hand] && this.lastHandPositions[hand]) {
                const dx = currentPositions[hand].x - this.lastHandPositions[hand].x;
                const dy = currentPositions[hand].y - this.lastHandPositions[hand].y;
                const velocity = Math.sqrt(dx * dx + dy * dy);
                
                // Store velocity
                this.handVelocities[hand].push(velocity);
                if (this.handVelocities[hand].length > 10) {
                    this.handVelocities[hand].shift();
                }
                
                // Draw velocity vectors if enabled
                if (this.params.showVelocityVectors) {
                    const x = currentPositions[hand].x * this.canvas.width;
                    const y = currentPositions[hand].y * this.canvas.height;
                    const vx = dx * this.canvas.width * 10;
                    const vy = dy * this.canvas.height * 10;
                    
                    this.ctx.strokeStyle = '#00FFFF';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(x + vx, y + vy);
                    this.ctx.stroke();
                }
                
                if (velocity > this.params.shakeThreshold) {
                    hasSignificantMovement = true;
                }
            }
        }
        
        // Update last positions
        this.lastHandPositions = currentPositions;
        
        // Check if both hands are shaking
        const bothHandsPresent = currentPositions.left && currentPositions.right;
        
        if (bothHandsPresent && hasSignificantMovement) {
            this.shakeFrameCount++;
            if (this.shakeFrameCount >= this.params.shakeDuration) {
                this.gestureDetected = true;
                this.gestureStatus.classList.add('active');
            }
        } else {
            this.shakeFrameCount = Math.max(0, this.shakeFrameCount - 1);
            if (this.shakeFrameCount === 0) {
                this.gestureDetected = false;
                this.gestureStatus.classList.remove('active');
            }
        }
    }
    
    startDetectionLoop() {
        setInterval(() => {
            this.checkForSuccess();
        }, 100);
    }
    
    checkForSuccess() {
        const now = Date.now();
        const timeSinceLastDetection = now - this.lastDetectionTime;
        const timeSinceAudioDetection = now - this.audioDetectionTime;
        
        // Check if both gesture and audio are detected within the detection window
        if (this.gestureDetected && timeSinceAudioDetection < this.params.detectionWindow) {
            // Check cooldown
            if (timeSinceLastDetection >= this.params.cooldown) {
                this.incrementCount();
                this.lastDetectionTime = now;
            }
        }
    }
    
    incrementCount() {
        this.count++;
        this.saveCount();
        this.updateDisplay();
        
        // Visual feedback
        this.counterNumber.classList.add('pulse');
        this.successFlash.classList.add('active');
        
        setTimeout(() => {
            this.counterNumber.classList.remove('pulse');
            this.successFlash.classList.remove('active');
        }, 300);
    }
    
    updateDisplay() {
        this.counterNumber.textContent = this.count.toLocaleString();
        const progress = (this.count / this.goalCount) * 100;
        this.progressFill.style.width = `${Math.min(progress, 100)}%`;
        this.progressFill.textContent = `${progress.toFixed(2)}%`;
    }
    
    saveCount() {
        localStorage.setItem('67-counter', this.count);
    }
    
    loadCount() {
        const saved = localStorage.getItem('67-counter');
        if (saved) {
            this.count = parseInt(saved);
        }
    }
}

// Initialize app
const app = new SixtySevenCounter();
