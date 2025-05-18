/**
 * Main entry point for the soft-body car simulation
 */

// Global variables
let scene, camera, renderer, physicsWorld, car, gridMap;
let lastTime = 0;
let isInitialized = false;
let cameraControls;

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
    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControls.enableDamping = true;
    cameraControls.dampingFactor = 0.25;
    cameraControls.screenSpacePanning = false;
    cameraControls.maxPolarAngle = Math.PI / 2;
    
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
    if (!infoElement) {
        // Create info element if it doesn't exist
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info';
        infoDiv.style.position = 'absolute';
        infoDiv.style.top = '10px';
        infoDiv.style.left = '10px';
        infoDiv.style.color = 'white';
        infoDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
        infoDiv.style.padding = '10px';
        infoDiv.style.borderRadius = '5px';
        infoDiv.innerHTML = 'Soft-Body Car Simulation<br>Speed: 0 km/h';
        document.body.appendChild(infoDiv);
    }
    
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
        console.log("Toggle terrain clicked");
        if (gridMap && typeof gridMap.toggleTerrain === 'function') {
            gridMap.toggleTerrain();
        }
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
        console.log("Reset car clicked");
        if (car && typeof car.reset === 'function') {
            car.reset();
        }
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
    const originalCameraPosition = { x: 20, y: 15, z: 20 };
    
    followCamBtn.addEventListener('click', () => {
        console.log("Camera follow toggled");
        window.cameraFollowing = !window.cameraFollowing;
        followCamBtn.textContent = window.cameraFollowing ? 'Free Camera' : 'Follow Camera';
        
        // If switching to free camera, restore orbit controls
        if (!window.cameraFollowing) {
            // Reset camera position
            camera.position.set(
                car.chassisMesh.position.x + originalCameraPosition.x,
                car.chassisMesh.position.y + originalCameraPosition.y,
                car.chassisMesh.position.z + originalCameraPosition.z
            );
            camera.lookAt(car.chassisMesh.position);
            cameraControls.enabled = true;
        } else {
            // Disable orbit controls when following
            cameraControls.enabled = false;
        }
    });
    
    document.body.appendChild(followCamBtn);
    
    // Add controls info
    const controlsInfo = document.createElement('div');
    controlsInfo.style.position = 'absolute';
    controlsInfo.style.bottom = '10px';
    controlsInfo.style.left = '10px';
    controlsInfo.style.color = 'white';
    controlsInfo.style.backgroundColor = 'rgba(0,0,0,0.5)';
    controlsInfo.style.padding = '10px';
    controlsInfo.style.borderRadius = '5px';
    controlsInfo.innerHTML = 'Controls:<br>WASD - Drive<br>Space - Brake<br>R - Reset Car';
    document.body.appendChild(controlsInfo);
    
    // Update info with frame rate and car speed
    setInterval(() => {
        const infoEl = document.querySelector('.info');
        if (car && infoEl) {
            const speedKmh = (car.speed * 3.6).toFixed(1); // m/s to km/h
            infoEl.innerHTML = `Soft-Body Car Simulation<br>Speed: ${speedKmh} km/h`;
        }
    }, 100);
}

// Animation loop
function animate(time) {
    requestAnimationFrame(animate);
    
    try {
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
            if (window.cameraFollowing && car.chassisMesh) {
                // Calculate a position behind and above the car
                const carPos = car.chassisMesh.position;
                const carQuat = car.chassisMesh.quaternion;
                
                // Create offset vector: behind and above the car
                const offset = new THREE.Vector3(0, 5, 15);
                // Apply car's rotation to the offset
                offset.applyQuaternion(carQuat);
                
                // Calculate camera position
                const cameraTargetPos = new THREE.Vector3(
                    carPos.x - offset.x,
                    carPos.y + offset.y,
                    carPos.z - offset.z
                );
                
                // Smoothly move camera
                camera.position.lerp(cameraTargetPos, 0.1);
                camera.lookAt(carPos);
            } else if (cameraControls) {
                // Update orbit controls if not following
                cameraControls.update();
            }
        }
        
        // Update grid map
        if (gridMap) {
            gridMap.update(deltaTime);
        }
        
        // Render the scene
        renderer.render(scene, camera);
    } catch (error) {
        console.error("Animation error:", error);
    }
}

// Initialize car
function initCar() {
    try {
        // Create car at a position above the ground to prevent falling through
        const carStartPosition = { x: 0, y: 5, z: 0 }; // Much higher position
        car = new Car(scene, physicsWorld, carStartPosition);
        
        // Make sure the car is created with proper visualization
        console.log("Car initialized at position:", carStartPosition);
        
        // Add a debug marker to show where the car should be
        const debugMarker = new THREE.Mesh(
            new THREE.SphereGeometry(1, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        );
        debugMarker.position.set(carStartPosition.x, carStartPosition.y, carStartPosition.z);
        scene.add(debugMarker);
        console.log("Debug marker added at position:", debugMarker.position);
        
        // Set camera to look at car position initially
        camera.position.set(carStartPosition.x + 20, carStartPosition.y + 10, carStartPosition.z + 20);
        camera.lookAt(carStartPosition.x, carStartPosition.y, carStartPosition.z);
    } catch (error) {
        console.error("Error initializing car:", error);
    }
}

// Initialize the application when the window loads
window.addEventListener('load', init); 