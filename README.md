# 67 Counter Challenge

A real-time web app that tracks your "67" gestures and voice commands. The goal: reach 100,000 reps!

## Features

- **Dual Detection System**: Counts only when BOTH conditions are met:
  - Hand gesture: Both hands shaking up and down (the 67 meme gesture)
  - Voice command: Saying "6 7", "six seven", or "sixty seven"

- **Real-time Tracking**: 
  - Live webcam feed with hand tracking overlay
  - Visual counter display optimized for livestreaming
  - Progress bar showing % toward 100,000 goal
  - Status indicators for gesture and audio detection

- **Persistent Progress**: Your count is saved locally and persists between sessions

- **1-second Cooldown**: Prevents accidental double-counting

## How to Use

1. Open `index.html` in a modern browser (Chrome, Edge, or Safari recommended)
2. Click "Start Challenge" button
3. Allow camera and microphone permissions
4. Perform the gesture (shake both hands up and down) while saying "67"
5. Watch your counter increase!

## Technical Details

- **Hand Detection**: MediaPipe Hands library for real-time hand tracking
- **Voice Recognition**: Web Speech API for continuous audio monitoring
- **Gesture Algorithm**: Detects simultaneous high-velocity movement in both hands
- **Visual Feedback**: Green flash and pulse animation on successful detection

## Browser Compatibility

- Chrome/Edge: Full support
- Safari: Full support (may require HTTPS for microphone)
- Firefox: Limited speech recognition support

## Livestreaming Setup

The app is designed with livestreaming in mind:
- Large, readable counter display
- High-contrast visual elements
- Real-time status indicators
- Clean overlay design that works well with OBS/streaming software

Simply capture your browser window in your streaming software!

## Progress Tracking

Your count is automatically saved to browser localStorage and will persist even if you close the page.

---

**Goal**: 100,000 reps of the 67 gesture + voice combo!
