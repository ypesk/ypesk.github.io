let easterEggParticleFound = false; // Optional: Prevent multiple triggers if desired
let popupTimeoutId = null; // To manage auto-hiding

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) {
        console.error("Particle Canvas element not found!");
        return;
    }
    const ctx = canvas.getContext('2d');


    let particles = [];
    let activeWaves = [];
    let animationFrameId;
    let currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';

    // --- Configuration ---
    const config = {
        particleCount: 120,       // Number of particles
        maxDistance: 250,        // Max distance to draw a line
        particleSpeed: 0.3,      // Max speed of particles
        particleRadius: 4,       // Size of particles
        lineWidth: 0.8,          // Thickness of connecting lines
        mouseRadius: 200,        // Radius around mouse to interact/draw lines

        mouseRepelRadius: 150,   // Radius within which mouse pushes particles
        mouseRepelStrength: 0.05, // How strong the push is (adjust sensitivity)

        waveOnClick: true,       // Enable/disable the wave effect easily
        waveMaxRadius: 80,       // Should ideally match mouseRepelRadius
        waveDurationFrames: 90,  // How long the wave lasts in animation frames (e.g., 60 frames = 1 second at 60fps)
        waveInitialLineWidth: 1, // Starting thickness of the wave circle
        waveFadeOut: true,       // Whether the wave fades as it expands

        enableEasterEgg: true,      // Master switch
        easterEggAlwaysFirst: false, // For testing: true = particle[0] is egg, false = random

        themeColors: {
            light: {
                particleColor: 'rgba(44, 62, 80, 0.7)',   // --header-color slightly transparent
                lineColor: 'rgba(44, 62, 80, 0.2)',      // --header-color more transparent
                waveColor: 'rgba(0, 86, 179, 0.15)',
                easterEggColor: 'rgba(227, 100, 20, 0.9)' // Example: Orange
            },
            dark: {
                particleColor: 'rgba(224, 224, 224, 0.6)', // --dark-text-color slightly transparent
                lineColor: 'rgba(224, 224, 224, 0.15)',   // --dark-text-color more
                waveColor: 'rgba(121, 184, 255, 0.15)', // e.g., --dark-link-color with alpha
                easterEggColor: 'rgba(255, 165, 0, 0.9)' // Example: Brighter Orange for dark mode
            }
        }
    };

    let mouse = {
        x: null,
        y: null
    };
    let isMouseDown = false;

    // --- Helper Functions ---
    function getThemeColors() {
        return config.themeColors[currentTheme];
    }

    function getRandom(min, max) {
        return Math.random() * (max - min) + min;
    }

    // --- Particle Class ---
    class Particle {
        constructor() {
            this.radius = getRandom(config.particleRadius * 0.5, config.particleRadius * 1.5);
            this.x = getRandom(this.radius, canvas.width - this.radius);
            this.y = getRandom(this.radius, canvas.height - this.radius);
            this.vx = getRandom(-config.particleSpeed, config.particleSpeed);
            this.vy = getRandom(-config.particleSpeed, config.particleSpeed);
            // Ensure particles are not completely static
            if (this.vx === 0) this.vx = 0.1;
            if (this.vy === 0) this.vy = 0.1;
            this.isEasterEgg = false; //
        }

        draw() {
            const colors = getThemeColors();

            let fillColor; // <<< Use a variable for color

            // <<< CHECK FOR EASTER EGG >>>
            if (this.isEasterEgg && config.enableEasterEgg) {
                fillColor = colors.easterEggColor;
            } else {
                fillColor = colors.particleColor;
            }
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = fillColor;
            ctx.fill();
        }

        update() {
          if (isMouseDown && mouse.x !== null && mouse.y !== null) { // <<< ADDED 'isMouseDown &&' condition

            const dxMouse = this.x - mouse.x;
            const dyMouse = this.y - mouse.y;
            const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

            // Check if mouse is within repel radius
            if (distanceMouse < config.mouseRepelRadius) {
                // Calculate force: Stronger when closer, fades to zero at the edge
                const forceDirectionX = dxMouse / distanceMouse; // Unit vector x
                const forceDirectionY = dyMouse / distanceMouse; // Unit vector y

                // Force magnitude decreases linearly from max strength to 0
                const forceMagnitude = (1 - distanceMouse / config.mouseRepelRadius) * config.mouseRepelStrength;

                // Apply force to velocity (pushing away)
                this.vx += forceDirectionX * forceMagnitude;
                this.vy += forceDirectionY * forceMagnitude;

                // Optional: Add a slight velocity cap to prevent extreme speeds
                const maxSpeed = config.particleSpeed * 3; // e.g., limit to 3x base speed
                this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));
                this.vy = Math.max(-maxSpeed, Math.min(maxSpeed, this.vy));
            }
        }
            // Movement
            this.x += this.vx;
            this.y += this.vy;

            // Boundary check (bounce off edges)
            if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
                this.vx = -this.vx;
                // Adjust position slightly to prevent sticking
                this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
            }
            if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
                this.vy = -this.vy;
                // Adjust position slightly
                this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
            }
        }
    }

    // --- Core Logic ---
    function init() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles = []; // Clear existing particles
        easterEggParticleFound = false; // Reset found status on init

        for (let i = 0; i < config.particleCount; i++) {
            particles.push(new Particle());
        }

        if (config.enableEasterEgg && particles.length > 0) {
            let eggIndex = 0; // Default to first
            if (!config.easterEggAlwaysFirst) {
                eggIndex = Math.floor(Math.random() * particles.length);
            }
             // Ensure index is valid just in case
            eggIndex = Math.max(0, Math.min(particles.length - 1, eggIndex));
            particles[eggIndex].isEasterEgg = true;
            // console.log(`Particle ${eggIndex} is the easter egg.`); // Debug
        }
        startAnimation(); // Start animation after init
    }

    function connectParticles() {
        const colors = getThemeColors();
        ctx.lineWidth = config.lineWidth;



        for (let i = 0; i < particles.length; i++) {
            // Connect particles to each other
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < config.maxDistance) {
                    const opacity = 1 - distance / config.maxDistance;
                    // Extract RGB from theme color and apply dynamic opacity
                    const baseColor = colors.lineColor.match(/\d+/g).slice(0, 3).join(', '); // "r, g, b"
                    ctx.strokeStyle = `rgba(${baseColor}, ${Math.max(0, opacity * parseFloat(colors.lineColor.match(/[\d\.]+/g)[3] || 1))})`; // Use base opacity from theme

                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }

            // Connect particles to mouse (optional)
            if (mouse.x !== null && mouse.y !== null) {
                const dxMouse = particles[i].x - mouse.x;
                const dyMouse = particles[i].y - mouse.y;
                const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

                if (distanceMouse < config.mouseRadius) {
                    const opacity = 1 - distanceMouse / config.mouseRadius;
                     const baseColor = colors.lineColor.match(/\d+/g).slice(0, 3).join(', ');
                    // Make mouse lines slightly more prominent if desired
                    ctx.strokeStyle = `rgba(${baseColor}, ${Math.max(0, opacity * 0.5)})`; // Example: higher base opacity for mouse lines
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (config.waveOnClick) {
            const themeWaveColor = getThemeColors().waveColor; // Get base color for theme
            const waveBaseRGB = themeWaveColor.match(/\d+/g).slice(0, 3).join(', '); // Extract "r, g, b"
            const waveBaseAlpha = parseFloat(themeWaveColor.match(/[\d\.]+/g)[3] || 1); // Extract base alpha

            // Use filter to update and remove finished waves cleanly
            activeWaves = activeWaves.filter(wave => {
                // Update wave
                wave.currentRadius += (wave.maxRadius / wave.initialLife); // Expand to maxRadius over its life
                wave.life--;

                // Check if wave is still alive
                if (wave.life > 0 && wave.currentRadius < wave.maxRadius * 1.1) { // Allow slight overshoot

                    // Calculate appearance based on life
                    const progress = 1 - (wave.life / wave.initialLife); // 0 = start, 1 = end
                    const opacity = config.waveFadeOut ? (1 - progress) * waveBaseAlpha : waveBaseAlpha;
                    // Make line thinner as it expands (optional)
                    const lineWidth = wave.initialLineWidth * (1 - progress);

                    if (lineWidth <= 0 || opacity <= 0) {
                         return false; // Wave is effectively dead
                    }

                    // Draw the wave
                    ctx.beginPath();
                    ctx.arc(wave.x, wave.y, wave.currentRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(${waveBaseRGB}, ${opacity})`;
                    ctx.lineWidth = lineWidth;
                    ctx.stroke();

                    return true; // Keep wave
                } else {
                    return false; // Remove wave
                }
            });
        }

        // Update and draw particles
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // Draw connections
        connectParticles();

        // Loop
        animationFrameId = requestAnimationFrame(animate);
    }

     function startAnimation() {
        if (!animationFrameId) {
            animate();
        }
    }

    function stopAnimation() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    // --- Event Listeners ---
    function handleResize() {
        stopAnimation(); // Stop while resizing
        init(); // Reinitialize canvas and particles
    }

    function updateMousePosition(event) {
        // Get the bounding rectangle of the canvas
        const rect = canvas.getBoundingClientRect();

        // Calculate the scale difference between canvas internal size and display size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // Calculate mouse position relative to the canvas, scaled correctly
        mouse.x = (event.clientX - rect.left) * scaleX;
        mouse.y = (event.clientY - rect.top) * scaleY;
    }

    const popupElement = document.getElementById('easter-egg-popup');
    const popupCloseButton = popupElement ? popupElement.querySelector('.popup-close') : null;

    function showEasterEggPopup() {
      if (!popupElement) return;

      // Clear any existing timeout to prevent conflicts if clicked again quickly
      if (popupTimeoutId) {
          clearTimeout(popupTimeoutId);
      }

      popupElement.classList.add('visible');

      // Auto-hide after a few seconds
      popupTimeoutId = setTimeout(() => {
           hideEasterEggPopup();
      }, 5000); // Hide after 5 seconds
    }

    function hideEasterEggPopup() {
       if (!popupElement) return;
       if (popupTimeoutId) { // Clear timeout if hidden manually
          clearTimeout(popupTimeoutId);
          popupTimeoutId = null;
       }
       popupElement.classList.remove('visible');
    }

    // Add close button listener if element exists
    if (popupCloseButton) {
      popupCloseButton.addEventListener('click', hideEasterEggPopup);
    }


    // Debounce resize handler for performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 250); // Adjust delay as needed
    });

    window.addEventListener('mousemove', (event) => {
        updateMousePosition(event); // Update position on move
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
        isMouseDown = false;
    });


    window.addEventListener('mousedown', (event) => {
          isMouseDown = true;
          updateMousePosition(event); // Keep this to update position

          let clickedOnEgg = false;
          if (config.enableEasterEgg && mouse.x !== null && mouse.y !== null) {
               for (let i = 0; i < particles.length; i++) {
                  const p = particles[i];
                  const dxClick = mouse.x - p.x;
                  const dyClick = mouse.y - p.y;
                  const distanceClick = Math.sqrt(dxClick * dxClick + dyClick * dyClick);

                  // Check if click is within particle radius
                  if (distanceClick < p.radius+20) {
                      // console.log(`Clicked on particle ${i}`); // Debug
                      if (p.isEasterEgg) {
                          // console.log("Clicked on the EASTER EGG!"); // Debug
                          showEasterEggPopup();
                          easterEggParticleFound = true; // Set flag
                          clickedOnEgg = true;
                          break; // Stop checking other particles
                      }
                       // Optional: Handle clicks on non-egg particles if needed
                       // break; // Uncomment if you only want the first clicked particle to register
                  }
              }
          }

        if (config.waveOnClick && !clickedOnEgg && mouse.x !== null && mouse.y !== null) { // Added !clickedOnEgg condition
                  activeWaves.push({
                  x: mouse.x,                 // Start at current mouse coordinates
                  y: mouse.y,
                  currentRadius: 0,           // Start with radius 0
                  maxRadius: config.mouseRepelRadius,
                  life: config.waveDurationFrames, // Countdown timer
                  initialLife: config.waveDurationFrames, // Store initial for fade calculation
                  initialLineWidth: config.waveInitialLineWidth
              });
          }
      });


    window.addEventListener('mouseup', () => {
        isMouseDown = false; // Reset flag when mouse button is released
    });



     // --- Theme Change Handling ---
    // We need a way to detect theme changes. Since your theme toggle is in another
    // script block, we can use a MutationObserver on the body's class attribute.

    const themeObserver = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const newTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
                if (newTheme !== currentTheme) {
                    // console.log(`Theme changed to: ${newTheme}`); // Debug
                    currentTheme = newTheme;
                    // No need to re-init, colors are fetched dynamically in draw/connect
                    // If you had static colors set during init, you'd call init() here.
                }
                break; // Only need to check one mutation
            }
        }
    });

    themeObserver.observe(document.body, { attributes: true });


    // --- Initial Setup ---
    init();

}); // End DOMContentLoaded
