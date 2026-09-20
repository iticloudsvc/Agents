// Three.js Interactive 3D Background & Dumbbell
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('three-bg');
    if (!canvas) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.015);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 25;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xd92525, 2, 50); // Red light
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0xffffff, 1, 50); // White light
    pointLight2.position.set(-10, -10, 10);
    scene.add(pointLight2);

    // Create 3D Dumbbell
    const dumbbellGroup = new THREE.Group();
    
    // Materials
    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.9,
        roughness: 0.2
    });
    
    const darkMetalMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 0.8,
        roughness: 0.4
    });

    const redAccentMaterial = new THREE.MeshStandardMaterial({
        color: 0xd92525,
        metalness: 0.5,
        roughness: 0.2
    });

    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.3, 0.3, 8, 32);
    const handle = new THREE.Mesh(handleGeo, metalMaterial);
    handle.rotation.z = Math.PI / 2;
    dumbbellGroup.add(handle);

    // Weight Plates Geometry
    const largePlateGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.8, 32);
    const mediumPlateGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.6, 32);
    const smallPlateGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.4, 32);
    const collarGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 32);

    // Helper to add plates
    function addPlate(geo, material, xPos) {
        const plate = new THREE.Mesh(geo, material);
        plate.position.x = xPos;
        plate.rotation.z = Math.PI / 2;
        dumbbellGroup.add(plate);
    }

    // Right side
    addPlate(collarGeo, metalMaterial, 4.2);
    addPlate(smallPlateGeo, darkMetalMaterial, 4.7);
    addPlate(mediumPlateGeo, darkMetalMaterial, 5.3);
    addPlate(largePlateGeo, darkMetalMaterial, 6.1);
    addPlate(largePlateGeo, redAccentMaterial, 7.0);

    // Left side
    addPlate(collarGeo, metalMaterial, -4.2);
    addPlate(smallPlateGeo, darkMetalMaterial, -4.7);
    addPlate(mediumPlateGeo, darkMetalMaterial, -5.3);
    addPlate(largePlateGeo, darkMetalMaterial, -6.1);
    addPlate(largePlateGeo, redAccentMaterial, -7.0);

    scene.add(dumbbellGroup);
    
    // Position Dumbbell in the background, slightly tilted
    dumbbellGroup.position.set(0, 0, -5);
    dumbbellGroup.rotation.set(0.5, 0.5, 0.2);
    dumbbellGroup.scale.set(1.5, 1.5, 1.5);

    // Floating Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 800;
    const posArray = new Float32Array(particlesCount * 3);
    for(let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 80;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.15,
        color: 0xd92525,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particleMaterial);
    scene.add(particlesMesh);

    // Mouse interaction variables
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX);
        mouseY = (event.clientY - windowHalfY);
    });

    // Scroll interaction
    let scrollY = 0;
    window.addEventListener('scroll', () => {
        scrollY = window.scrollY;
    });

    // Animation Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        
        const elapsedTime = clock.getElapsedTime();

        // Rotate dumbbell constantly
        dumbbellGroup.rotation.x += 0.005;
        dumbbellGroup.rotation.y += 0.01;

        // Move dumbbell based on scroll and mouse
        targetX = mouseX * 0.005;
        targetY = mouseY * 0.005;
        
        dumbbellGroup.position.x += (targetX - dumbbellGroup.position.x) * 0.05;
        dumbbellGroup.position.y += (-targetY - (scrollY * 0.05) - dumbbellGroup.position.y) * 0.05;

        // Rotate particles slowly
        particlesMesh.rotation.y = elapsedTime * 0.03;
        particlesMesh.rotation.x = elapsedTime * 0.01;

        // Camera parallax
        camera.position.x += (mouseX * 0.002 - camera.position.x) * 0.05;
        camera.position.y += (-mouseY * 0.002 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }

    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});
