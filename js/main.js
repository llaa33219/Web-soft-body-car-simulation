/**
 * Main entry point for the soft-body car simulation
 */

// Global variables
let scene, camera, renderer, physicsWorld, car, gridMap;
let lastTime = 0;
let isInitialized = false;

// Initialize the application
function init() {
    if (isInitialized) return;
    isInitialized = true;
    
    // Create Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);
    
    // Add camera controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    
    // Create physics world
    physicsWorld = new PhysicsWorld();
    
    // Create grid map
    gridMap = new GridMap(scene, physicsWorld);
    
    // Create car
    initCar();
    
    // Set up window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Add UI controls
    setupUI();
    
    // Start animation loop
    animate(0);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Set up user interface elements
function setupUI() {
    const infoElement = document.querySelector('.info');
    
    // Add buttons for additional controls
    const toggleTerrainBtn = document.createElement('button');
    toggleTerrainBtn.textContent = 'Toggle Terrain';
    toggleTerrainBtn.style.position = 'absolute';
    toggleTerrainBtn.style.top = '60px';
    toggleTerrainBtn.style.left = '10px';
    toggleTerrainBtn.style.padding = '8px';
    toggleTerrainBtn.style.backgroundColor = '#444';
    toggleTerrainBtn.style.color = 'white';
    toggleTerrainBtn.style.border = 'none';
    toggleTerrainBtn.style.borderRadius = '4px';
    toggleTerrainBtn.style.cursor = 'pointer';
    
    toggleTerrainBtn.addEventListener('click', () => {
        gridMap.toggleTerrain();
    });
    
    document.body.appendChild(toggleTerrainBtn);
    
    // Add reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset Car';
    resetBtn.style.position = 'absolute';
    resetBtn.style.top = '100px';
    resetBtn.style.left = '10px';
    resetBtn.style.padding = '8px';
    resetBtn.style.backgroundColor = '#444';
    resetBtn.style.color = 'white';
    resetBtn.style.border = 'none';
    resetBtn.style.borderRadius = '4px';
    resetBtn.style.cursor = 'pointer';
    
    resetBtn.addEventListener('click', () => {
        car.reset();
    });
    
    document.body.appendChild(resetBtn);
    
    // Add follow camera button
    const followCamBtn = document.createElement('button');
    followCamBtn.textContent = 'Follow Camera';
    followCamBtn.style.position = 'absolute';
    followCamBtn.style.top = '140px';
    followCamBtn.style.left = '10px';
    followCamBtn.style.padding = '8px';
    followCamBtn.style.backgroundColor = '#444';
    followCamBtn.style.color = 'white';
    followCamBtn.style.border = 'none';
    followCamBtn.style.borderRadius = '4px';
    followCamBtn.style.cursor = 'pointer';
    
    window.cameraFollowing = false;
    followCamBtn.addEventListener('click', () => {
        window.cameraFollowing = !window.cameraFollowing;
        followCamBtn.textContent = window.cameraFollowing ? 'Free Camera' : 'Follow Camera';
    });
    
    document.body.appendChild(followCamBtn);
    
    // Update info with frame rate and car speed
    setInterval(() => {
        if (car) {
            const speedKmh = (car.speed * 3.6).toFixed(1); // m/s to km/h
            infoElement.innerHTML = `Soft-Body Car Simulation<br>Speed: ${speedKmh} km/h`;
        }
    }, 100);
}

// Animation loop
function animate(time) {
    requestAnimationFrame(animate);
    
    // Calculate delta time
    const deltaTime = Math.min((time - lastTime) / 1000, 0.1); // Cap at 0.1 seconds
    lastTime = time;
    
    // Update physics
    if (physicsWorld) {
        physicsWorld.update(deltaTime);
    }
    
    // Update car
    if (car) {
        car.update(deltaTime);
        
        // Optional: make camera follow car
        if (window.cameraFollowing) {
            const cameraOffset = new THREE.Vector3(0, 5, -10);
            cameraOffset.applyQuaternion(car.chassisMesh.quaternion);
            
            const targetPosition = car.chassisMesh.position.clone().add(cameraOffset);
            camera.position.lerp(targetPosition, 0.1);
            camera.lookAt(car.chassisMesh.position);
        }
    }
    
    // Update grid map
    if (gridMap) {
        gridMap.update(deltaTime);
    }
    
    // Render the scene
    renderer.render(scene, camera);
}

// Initialize car
function initCar() {
    // Create car at a position above the ground to prevent falling through
    const carStartPosition = { x: 0, y: 1.5, z: 0 }; // Raised position
    car = new Car(scene, physicsWorld, carStartPosition);
    
    // Make sure the car is created with proper visualization
    console.log("Car initialized at position:", carStartPosition);
}

// Initialize the application when the window loads
window.addEventListener('load', init); 