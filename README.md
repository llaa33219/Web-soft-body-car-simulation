# Web Soft-Body Car Simulation

A 3D soft-body car physics simulation running entirely in the browser, featuring:

- Realistic 3D car model with soft-body physics
- BeamNG.drive-inspired grid map with obstacles
- Fully client-side implementation (no server required)
- Interactive controls and camera views

## How to Run

Simply open the `index.html` file in a modern web browser. No build steps or server setup required.

## Controls

- **W** - Accelerate forward
- **S** - Accelerate backward
- **A** - Steer left
- **D** - Steer right
- **Space** - Brake
- **R** - Reset car position

### UI Controls

- **Toggle Terrain** - Switch between flat grid and terrain mode
- **Reset Car** - Reset the car's position
- **Follow Camera** - Toggle between free camera and car-following camera

### Camera Controls

When in free camera mode:
- **Left mouse button + drag** - Rotate camera
- **Right mouse button + drag** - Pan camera
- **Scroll wheel** - Zoom in/out

## Technical Details

This simulation is built using:

- **Three.js** - 3D rendering
- **Cannon.js** - Physics simulation
- **HTML5 Canvas** - For grid textures

The car model features a soft-body front bumper that can deform on collision, simulating realistic crash physics. The physics engine implements a raycast vehicle model for accurate car dynamics.

## Browser Compatibility

This simulation works best in modern browsers that support WebGL, such as:
- Chrome (recommended)
- Firefox
- Edge
- Safari

## Performance Tips

For the best experience:
- Close unnecessary browser tabs
- Use a computer with a dedicated graphics card
- Reduce the browser window size if experiencing frame rate issues 