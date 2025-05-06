document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing scripts...");

    // --- 1. Typing Slider Functionality ---
    (() => { // Using an IIFE (Immediately Invoked Function Expression) for scope isolation
        const slider = document.querySelector('.typing-slider');
        if (!slider) {
            console.warn("Typing Slider: Element with class .typing-slider not found.");
            return; // Exit this specific functionality if slider not found
        }

        const titles = slider.querySelectorAll('h1');
        if (titles.length === 0) {
            console.warn("Typing Slider: No h1 titles found inside .typing-slider.");
            return; // Exit if no titles
        }

        let currentTitleIndex = 0;
        const typeSpeed = 100; // Milliseconds per character
        const pauseDuration = 2000; // Milliseconds to pause after typing

        function typeSequence() {
            // Get the current h1 element
            const currentTitle = titles[currentTitleIndex];
            // Ensure textContent is not null or undefined before accessing length
            const text = currentTitle.textContent || '';
            const steps = text.length; // Number of steps = number of characters
            const typeDuration = steps * typeSpeed; // Total time to type this title

            // --- Prepare the current title ---
            // 1. Hide all titles briefly to reset
            titles.forEach(title => {
                title.style.display = 'none';
                title.classList.remove('typing');
                // Clear previous CSS variables just in case
                title.style.removeProperty('--type-steps');
                title.style.removeProperty('--type-duration');
            });

            // 2. Set CSS variables for the current title's animation
            currentTitle.style.setProperty('--type-steps', steps);
            currentTitle.style.setProperty('--type-duration', `${typeDuration}ms`);

            // 3. Make the current title visible and start typing
            currentTitle.style.display = 'inline-block'; // Or 'block' depending on layout needs
            currentTitle.classList.add('typing');

            // --- Wait for typing and pause ---
            // Use nested setTimeout to ensure pause happens *after* typing animation
            setTimeout(() => { // Wait for typing animation to visually complete
                // Add a small buffer if CSS animation timing is slightly off
                // console.log(`Finished typing: "${text}". Pausing for ${pauseDuration}ms`);

                setTimeout(() => { // Wait for the pause duration
                    // --- Prepare for the next title ---
                    // Move to the next title index, looping back to 0 if needed
                    currentTitleIndex = (currentTitleIndex + 1) % titles.length;

                    // Start the sequence for the next title
                    // console.log(`Starting next title index: ${currentTitleIndex}`);
                    typeSequence();
                }, pauseDuration);

            }, typeDuration + 50); // Add a small buffer (e.g., 50ms) to ensure animation finishes
        }

        // Start the first sequence only if titles were found
        console.log("Typing Slider: Initializing sequence.");
        typeSequence();

    })(); // End of Typing Slider IIFE


    // --- 2. Progress Bar Update Functionality ---
    // Define this function in the main scope of the DOMContentLoaded listener
    // so it can be called by the carousel setup below.
    function applyProgress() {
        const progressBars = document.querySelectorAll('.progress-bar');
        if (!progressBars || progressBars.length === 0) {
            console.warn("Progress Update: No '.progress-bar' elements found.");
            return;
        }

        progressBars.forEach(bar => {
            // Validate the SVG circle structure
            if (!bar.r || !bar.r.baseVal || typeof bar.r.baseVal.value !== 'number') {
                console.error("Progress Update Error: SVG circle 'r' attribute missing or invalid:", bar);
                return; // Skip this bar if radius is invalid
            }
            const radius = bar.r.baseVal.value;
            const circumference = 2 * Math.PI * radius;

            // Get and validate the percentage
            const percentageAttr = bar.getAttribute('data-percentage');
            if (percentageAttr === null) {
                console.warn("Progress Update Warning: Progress bar missing 'data-percentage' attribute:", bar);
                return; // Skip if no percentage data
            }

            let percentage = parseFloat(percentageAttr); // Use let as it might be reassigned
            if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                console.warn(`Progress Update Warning: Invalid 'data-percentage' value (${percentageAttr}). Clamping to 0-100.`, bar);
                percentage = Math.max(0, Math.min(100, percentage)); // Clamp value instead of defaulting to 0
            }


            // Calculate the SVG dash offset
            const offset = circumference * (1 - percentage / 100);

            // Find the corresponding text element and update it
            const container = bar.closest('.progress-container');
            if (container) {
                const textElement = container.querySelector('.progress-text');
                if (textElement) {
                    textElement.textContent = `${Math.round(percentage)}%`;
                } else {
                    console.warn("Progress Update Warning: '.progress-text' not found within container:", container);
                }
            } else {
                console.warn("Progress Update Warning: '.progress-container' not found for progress bar:", bar);
            }

            // Ensure the initial stroke-dasharray is set (needed for the animation)
            bar.style.strokeDasharray = `${circumference} ${circumference}`;

            // Apply the offset to the SVG stroke using requestAnimationFrame for smoother rendering
            requestAnimationFrame(() => {
                bar.style.strokeDashoffset = offset;
            });
        });
        console.log(`Progress Update: Applied progress to ${progressBars.length} bars.`);
    }


    // --- 3. Skills Carousel Functionality ---
    (() => { // Using an IIFE for scope isolation
        const track = document.querySelector('.skills-track');
        const cards = track ? Array.from(track.children) : []; // Get cards safely
        const leftButton = document.querySelector('.left-arrow');
        const rightButton = document.querySelector('.right-arrow');
        const carousel = document.querySelector('.skills-carousel'); // The viewport container
        const carouselWrapper = document.querySelector('.skills-carousel-wrapper'); // The outer wrapper

        // --- Basic Element Checks ---
        if (!track || !carousel || !leftButton || !rightButton || !carouselWrapper) {
            console.error("Skills Carousel Error: One or more essential elements (track, carousel, arrows, wrapper) were not found. Please check your HTML structure and CSS selectors.");
            if(leftButton) leftButton.style.display = 'none'; // Hide arrows if setup fails
            if(rightButton) rightButton.style.display = 'none';
            return; // Stop carousel script execution
        }
        if (cards.length === 0) {
             console.warn("Skills Carousel: No cards found inside .skills-track. Carousel will not function.");
             leftButton.style.display = 'none';
             rightButton.style.display = 'none';
             return; // Stop carousel script execution
        }

        // --- Configuration & Dynamic Calculation ---
        const visibleItems = 3;       // Number of items visible at once (adjust as needed)
        const totalItems = cards.length;
        const autoScrollDelay = 4000; // Auto-scroll interval in milliseconds
        let currentIndex = 0;         // Tracks the index of the first visible card
        let autoScrollInterval;       // Holds the interval ID for auto-scrolling

        // Calculate dimensions dynamically *after* DOM is ready and CSS applied
        // Ensure cards have rendered width before calculating
        let cardWidth = 0;
        let gap = 0;
        let scrollAmount = 0;

        // Use a small timeout or ResizeObserver if offsetWidth is 0 initially due to CSS loading/transitions
        // For simplicity, we'll assume it's ready here in DOMContentLoaded. If issues, check CSS.
        cardWidth = cards[0].offsetWidth;
        gap = parseInt(window.getComputedStyle(track).gap) || 0; // Get actual computed gap
        scrollAmount = cardWidth + gap; // The distance to translate the track for one item shift

        if (cardWidth === 0) {
             console.error("Skills Carousel Error: Card width calculated as 0. Check if cards are hidden initially or CSS is loading late. Carousel may not work correctly.");
             // You might want to add a fallback or retry mechanism here if needed
        }

        // Calculate the maximum index the carousel can scroll to
        const maxScrollIndex = Math.max(0, totalItems - visibleItems);

        // --- **** Debugging Logs (Optional - Remove for Production) **** ---
        console.log("------------------------------------");
        console.log("Carousel Debug Info:");
        console.log(`Actual Card Width (JS offsetWidth): ${cardWidth}px`);
        console.log(`Actual Gap (JS computedStyle): ${gap}px`);
        console.log(`Calculated Scroll Amount (cardWidth + gap): ${scrollAmount}px`);
        console.log(`Actual Viewport Width (JS offsetWidth): ${carousel.offsetWidth}px`);
        console.log(`Total Items: ${totalItems}`);
        console.log(`Visible Items: ${visibleItems}`);
        console.log(`Maximum Scroll Index: ${maxScrollIndex}`);
        console.log("------------------------------------");
        // --- **** End of Debugging Logs **** ---


        // --- Carousel Navigation & State Functions ---
        function updateArrows() {
            if (!leftButton || !rightButton) return; // Safety check

            // Disable left arrow if at the beginning
            leftButton.disabled = currentIndex === 0;
            // Disable right arrow if the first visible item is the start of the last possible group
            rightButton.disabled = currentIndex >= maxScrollIndex;

            // Add visual cues for disabled state (optional, can be done in CSS)
            leftButton.style.opacity = leftButton.disabled ? '0.5' : '1';
            rightButton.style.opacity = rightButton.disabled ? '0.5' : '1';
            leftButton.style.cursor = leftButton.disabled ? 'not-allowed' : 'pointer';
            rightButton.style.cursor = rightButton.disabled ? 'not-allowed' : 'pointer';
        }

        function scrollToIndex(index) {
            // Clamp the target index to prevent scrolling beyond limits
            index = Math.max(0, Math.min(index, maxScrollIndex));

            if (index === currentIndex && track.style.transform !== '') return; // Avoid unnecessary updates if already at the target

            // Apply the translation to the track
            const newTransform = `translateX(-${index * scrollAmount}px)`;
            track.style.transform = newTransform;

            // Update the internal state
            currentIndex = index;

            // Update the arrow states based on the new index
            updateArrows();
             // console.log(`Scrolled to index: ${currentIndex}, Transform: ${newTransform}`);
        }

        // --- Automatic Scrolling Control ---
        function stopAutoScroll() {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null; // Clear the interval ID
             // console.log("Auto-scroll stopped.");
        }

        function startAutoScroll() {
            stopAutoScroll(); // Always clear any existing interval first

            // Only start auto-scrolling if there are more items than are visible
            // and scrolling is actually possible (maxScrollIndex > 0)
            if (totalItems <= visibleItems || maxScrollIndex <= 0) {
                 console.log("Auto-scroll not started: Not enough items or scrolling not possible.");
                return;
            }

            console.log("Starting auto-scroll...");
            autoScrollInterval = setInterval(() => {
                let nextIndex = currentIndex + 1;
                // If scrolling right would go past the last possible starting index, loop back to the beginning
                if (nextIndex > maxScrollIndex) {
                    nextIndex = 0;
                }
                scrollToIndex(nextIndex);
            }, autoScrollDelay);
        }


        // --- Event Listeners Setup ---
        rightButton.addEventListener('click', () => {
            // Only scroll right if not already at the end
            if (currentIndex < maxScrollIndex) {
                scrollToIndex(currentIndex + 1);
                stopAutoScroll(); // Stop auto-scroll on manual interaction
                // Optionally restart after a delay: setTimeout(startAutoScroll, autoScrollDelay * 2);
            }
        });

        leftButton.addEventListener('click', () => {
            // Only scroll left if not already at the beginning
            if (currentIndex > 0) {
                scrollToIndex(currentIndex - 1);
                stopAutoScroll(); // Stop auto-scroll on manual interaction
                 // Optionally restart after a delay: setTimeout(startAutoScroll, autoScrollDelay * 2);
            }
        });

        // Pause Auto-scroll on Hover (using the wrapper)
        carouselWrapper.addEventListener('mouseenter', () => {
            if (autoScrollInterval) { // Only log/clear if it was actually running
                stopAutoScroll();
            }
        });

        carouselWrapper.addEventListener('mouseleave', () => {
             // Resume auto-scroll only if it was running before hover or if you want it to always restart
             // For simplicity, let's restart it if it's not already running.
             if (!autoScrollInterval) {
                startAutoScroll();
             }
        });

        // Optional: Recalculate on window resize if layout is responsive
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                console.log("Window resized, recalculating carousel dimensions...");
                cardWidth = cards[0].offsetWidth;
                gap = parseInt(window.getComputedStyle(track).gap) || 0;
                scrollAmount = cardWidth + gap;
                // No need to recalculate maxScrollIndex here unless visibleItems changes dynamically

                // Re-apply current scroll position with new dimensions
                scrollToIndex(currentIndex); // This also updates arrows
                // Decide whether to restart auto-scroll after resize
                // startAutoScroll(); // Uncomment if you want auto-scroll to resume after resize adjustment
            }, 250); // Debounce resize event
        });


        // --- Initial Setup Calls ---
        applyProgress(); // Apply initial percentages to SVGs on load
        updateArrows();   // Set the initial state of the arrow buttons
        scrollToIndex(0); // Ensure track is at the initial position
        startAutoScroll(); // Start the automatic scrolling behavior

        console.log("Skills Carousel: Initialized successfully.");

    })(); // End of Skills Carousel IIFE


    console.log("All scripts initialized.");

}); // --- End of the single DOMContentLoaded listener ---

document.addEventListener('DOMContentLoaded', () => {
    const tabsContainer = document.querySelector('.filter-tabs');
    const buttons = tabsContainer.querySelectorAll('.tab-button');
    const slider = tabsContainer.querySelector('.slider');
    const containerPadding = 6; // Must match the CSS padding of .filter-tabs

    // Function to set the slider position and width
    function moveSlider(targetButton) {
        const targetRect = targetButton.getBoundingClientRect();
        const containerRect = tabsContainer.getBoundingClientRect();

        // Calculate position relative to the container, accounting for padding
        const newLeft = targetRect.left - containerRect.left;
        const newWidth = targetRect.width;

        slider.style.width = `${newWidth}px`;
        // We use transform for smoother animation than changing 'left'
        slider.style.transform = `translateX(${newLeft}px)`;

        // Update active class
        buttons.forEach(btn => btn.classList.remove('active'));
        targetButton.classList.add('active');
    }

    // Initialize slider position to the default active button
    const initiallyActiveButton = tabsContainer.querySelector('.tab-button.active');
    if (initiallyActiveButton) {
        // Use a small delay or requestAnimationFrame to ensure layout is calculated
        requestAnimationFrame(() => {
             // Set initial width without animation
             const initialRect = initiallyActiveButton.getBoundingClientRect();
             const containerRect = tabsContainer.getBoundingClientRect();
             slider.style.transition = 'none'; // Disable transition for initial set
             slider.style.width = `${initialRect.width}px`;
             slider.style.transform = `translateX(${initialRect.left - containerRect.left}px)`;

             // Re-enable transition after a tiny delay
             setTimeout(() => {
                slider.style.transition = 'transform 0.35s cubic-bezier(0.65, 0, 0.35, 1), width 0.35s cubic-bezier(0.65, 0, 0.35, 1)';
             }, 50);
        });

    } else {
         console.warn("No default active button found!");
         // Optionally set to the first button if none is active
         if (buttons.length > 0) {
            requestAnimationFrame(() => moveSlider(buttons[0]));
         }
    }


    // Add click event listeners to buttons
    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Only move if the clicked button isn't already active
            if (!e.currentTarget.classList.contains('active')) {
                moveSlider(e.currentTarget);
                 // --- Add your filtering logic here ---
                 console.log(`Filter selected: ${e.currentTarget.textContent}`);
                 // Example: filterItems(e.currentTarget.textContent);
            }
        });
    });

     // Optional: Recalculate on resize if needed (e.g., if font size changes)
     let resizeTimer;
     window.addEventListener('resize', () => {
         clearTimeout(resizeTimer);
         resizeTimer = setTimeout(() => {
             const currentActiveButton = tabsContainer.querySelector('.tab-button.active');
             if (currentActiveButton) {
                 // Temporarily disable transition for resize update
                 const originalTransition = slider.style.transition;
                 slider.style.transition = 'none';
                 moveSlider(currentActiveButton);
                 // Restore transition after slight delay
                 setTimeout(() => slider.style.transition = originalTransition, 50);
             }
         }, 100); // Debounce resize event
     });

});