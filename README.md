# PhoneGameTest
An experiment in web-based phone games

## Ball Bearing Game

A simple mobile game featuring a metallic ball bearing that responds to device motion sensors and gravity.

### Features

- **Realistic Physics**: Ball bearing rolls according to gravity and device accelerometer input
- **Bounce Mechanics**: Bounces off screen boundaries with 90% energy efficiency
- **Sound Effects**: Plays a "boink" sound effect on each bounce
- **Responsive Design**: Works on various screen sizes
- **Mobile-Optimized**: Uses device motion sensors for control

### How to Play

1. Open `index.html` in a mobile web browser (or serve via HTTP server for desktop testing)
2. Tap the "Start Game" button
3. Grant motion sensor permissions when prompted (required on iOS 13+)
4. Tilt your device to control the ball bearing
5. Watch it bounce realistically off the boundaries!

### Technical Details

- Built with HTML5 Canvas and vanilla JavaScript
- Uses DeviceMotion API for accelerometer input
- Web Audio API for sound generation
- 90% bounce efficiency on all collisions
- Friction and gravity simulation

### Running Locally

```bash
# Serve with Python
python3 -m http.server 8080

# Or use any other HTTP server
# Then open http://localhost:8080 in your browser
```

### Browser Compatibility

- Modern mobile browsers (Chrome, Safari, Firefox)
- Desktop browsers (limited to gravity only without device motion)
- Requires Web Audio API support for sound effects
