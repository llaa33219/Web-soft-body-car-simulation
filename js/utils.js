/**
 * Utility functions for the soft-body car simulation
 */

// Convert degrees to radians
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

// Convert radians to degrees
function radToDeg(radians) {
    return radians * 180 / Math.PI;
}

// Linear interpolation
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Generate a random integer between min and max (inclusive)
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a random float between min and max
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

// Convert from Three.js coordinates to Cannon.js coordinates (if needed)
function threeToCannonVector(vector) {
    return { x: vector.x, y: vector.y, z: vector.z };
}

// Convert from Cannon.js coordinates to Three.js coordinates (if needed)
function cannonToThreeVector(vector) {
    return new THREE.Vector3(vector.x, vector.y, vector.z);
}

// Helper function to create a heightmap from a grid
function createHeightmapFromGrid(grid, gridSize, heightScale = 1) {
    const size = gridSize + 1;
    const data = new Float32Array(size * size);
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const index = i * size + j;
            // Get height from grid or use 0 for flat areas
            data[index] = (grid[i] && grid[i][j] ? grid[i][j] : 0) * heightScale;
        }
    }
    
    return data;
}

// Create a checker texture for the grid
function createGridTexture(gridSize = 32) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = gridSize * 2;
    const context = canvas.getContext('2d');
    
    context.fillStyle = '#444444';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = '#666666';
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if ((i + j) % 2 === 0) {
                context.fillRect(i * 2, j * 2, 2, 2);
            }
        }
    }
    
    return new THREE.CanvasTexture(canvas);
} 