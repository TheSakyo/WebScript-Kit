// ==UserScript==
// @name         YouTube Description Preview
// @namespace    https://github.com/TheSakyo
// @version      1.0.0
// @description  View video descriptions instantly via the context menu with multi-language support.
// @author       TheSakyo
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () { 'use strict';

    // =========================================================================
    // SECTION 1: INTERNATIONALIZATION & CONFIGURATION
    // =========================================================================

    /**
     * Defines a global configuration object for all text displayed in the user interface
     */
    const TRANSLATIONS = {

       /*
        * Nested object containing all French localized strings
        */
        fr: {

            // Label for the custom entry added to YouTube's context menu
            menuItem: 'Aperçu de la description',

            // Title displayed in the modal while the fetch request is pending
            loadingTitle: 'Chargement...',

            // Informative message shown to the user during the background data retrieval
            loadingBody: 'Récupération de la description...',

            // Header title for the final modal containing the actual video description
            modalTitle: 'Aperçu de la description',

            // Generic title used when an operation fails
            errorTitle: 'Erreur',

            // Message displayed when the script can't find the description in the HTML code
            errorFetch: 'Impossible de récupérer la description.',

            // Message displayed for connectivity issues or blocked requests
            errorNetwork: 'Erreur Réseau : Vérifiez votre connexion.',

            // Label for the button that dismisses the modal and returns to the page
            closeBtn: 'Fermer'
        },

        /*
         * Nested object containing all English localized strings
         */
        en: {
            // English version of the menu button label
            menuItem: 'Description Preview',

            // English title for the loading state
            loadingTitle: 'Loading...',

            // English message explaining the background task
            loadingBody: 'Fetching description...',

            // English header for the final result window
            modalTitle: 'Description Preview',

            // English title for error alerts
            errorTitle: 'Error',

            // Detailed English error message for parsing failures
            errorFetch: 'Could not fetch the description.',

            // Detailed English error message for network-related failures
            errorNetwork: 'Network Error: Check your connection.',

            // Label for the exit button in English
            closeBtn: 'Close'
        }
    };

    /**
     * Determines the current language based on YouTube settings or browser preference
     * @returns {string} 'fr' or 'en'
     */
    const getAppLang = () => {

        // Retrieve language attribute from the HTML root or navigator
        const ytLang = document.documentElement.getAttribute('lang') || navigator.language;

        // Return 'fr' if language starts with 'fr', otherwise default to 'en'
        return ytLang.startsWith('fr') ? 'fr' : 'en';
    };

    /**
     * Returns the translation object for the active language
     * @returns {Object}
     */
    const getTxt = () => TRANSLATIONS[getAppLang()];

    /** Unique identifier for the custom menu item */
    const ITEM_ID = 'ysg-desc-preview-item';

    /** State variable to track the last interacted video card */
    let lastActiveCard = null;

    // =========================================================================
    // SECTION 2: CORE LOGIC & EVENT HANDLERS
    // =========================================================================

    /**
     * Captures the parent video card when a menu button is clicked
     */
    // Listen for mousedown events globally
    document.addEventListener('mousedown', (event) => {

        // Find the closest button or menu trigger
        const trigger = event.target.closest('yt-icon-button, ytd-menu-renderer button, [aria-label], .yt-spec-button-shape-next');

        // Exit if no trigger is found
        if(!trigger) return;

        // Find the parent video container
        const card = trigger.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-video-renderer');

        // Store the card reference if found
        if(card) lastActiveCard = card;
    }, true);

    /**
     * Fetches description from the video page and displays it
     */
    async function handlePreviewRequest() {

        // Extract the video URL from the stored card
        const videoUrl = lastActiveCard?.querySelector('a[href*="/watch?v="]')?.href;

        // Get localized text
        const txt = getTxt();

        // Exit if no URL is available
        if(!videoUrl) return;

        // Show a temporary loading modal
        uiManager.openModal(txt.loadingTitle, txt.loadingBody);

        /*
         * Starts a professional error-handling block to prevent the script from crashing on failure
         */
        try {

            // Fetch the video page HTML
            const response = await fetch(videoUrl, { credentials: 'same-origin' });

            // Convert response to text
            const html = await response.text();

            // Extract the description using regex
            const match = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);

            /*
             * If a description is found :
             */
            if(match) {

                /*
                 * Creates a constant 'sanitizedDesc' from the first capture group of our regex match
                 */
                const sanitizedDesc = match[1]

                    // Converts the literal string '\n' into actual line breaks for the display
                    .replace(/\\n/g, '\n')

                    // Replaces escaped double quotes (\") with simple double quotes (")
                    .replace(/\\"/g, '"')

                    // Restores backslashes (\\) by converting them back to a single backslash (\)
                    .replace(/\\\\/g, '\\')

                    // Decodes the HTML entity for the ampersand symbol (&)
                    .replace(/\\u0026/g, '&')

                    // Decodes the HTML entity for the "less than" symbol (<)
                    .replace(/\\u003c/g, '<')

                    // Decodes the HTML entity for the "greater than" symbol (>)
                    .replace(/\\u003e/g, '>')

                    // Removes any unnecessary whitespace or empty lines at the very beginning and end
                    .trim();

                // Display the final description in the modal
                uiManager.openModal(txt.modalTitle, sanitizedDesc);

            // Show error if regex failed
            } else { uiManager.openModal(txt.errorTitle, txt.errorFetch); }


        // Show error if network request failed
        } catch (error) { uiManager.openModal(txt.errorTitle, txt.errorNetwork); }
    }

    // =========================================================================
    // SECTION 3: UI ENGINE (REFACTORED)
    // =========================================================================

    const uiManager = {

        /**
         * Detects if the YouTube interface is in dark mode
         * @returns {boolean}
         */
        isDarkMode: () => document.documentElement.hasAttribute('dark'),

        /**
         * Converts URLs in plain text into clickable anchor tags
         * @param {string} text - The raw description text
         * @param {HTMLElement} container - The element to append to
         */
        linkify(text, container) {

            // Regex to identify URLs
            const urlRegex = /(https?:\/\/[^\s]+)/g;

            // Split text by URLs
            const parts = text.split(urlRegex);

            /*
             * Iterate through parts:
             */
            parts.forEach(part => {

                /*
                 * If part is a URL:
                 */
                if(part.match(urlRegex)) {

                    // Create an anchor element
                    const a = document.createElement('a');

                    // Set link destination
                    a.href = part;

                    // Set link text
                    a.textContent = part;

                    // Open in new tab
                    a.target = '_blank';

                    // Apply link styling
                    a.style.cssText = 'color:#3ea6ff; text-decoration:none; font-weight:bold;';

                    // Append to container
                    container.appendChild(a);

                // Append as simple text node
                } else container.appendChild(document.createTextNode(part));
            });
        },

        /**
         * Removes the modal from the DOM and restores scrolling
         */
        closeModal() {

            // Find existing modal
            const modal = document.getElementById('ysg-modal');

            /*
             * If it exists:
             */
            if(modal) {

                // Delete it
                modal.remove();

                // Enable body scrolling
                document.body.style.overflow = '';

                // Enable document scrolling
                document.documentElement.style.overflow = '';
            }
        },

        /**
         * Creates and displays the modal overlay
         * @param {string} title
         * @param {string} content
         */
        openModal(title, content) {

            // Ensure any old modal is closed
            this.closeModal();

            // Check current theme
            const dark = this.isDarkMode();

            // Get text for the close button
            const txt = getTxt();

            // Disable background scrolling
            document.body.style.overflow = 'hidden';

            // Create background overlay
            const overlay = document.createElement('div');

            // Assign ID for identification
            overlay.id = 'ysg-modal';

            // Style the overlay
            overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);';

            // Create the main modal box
            const box = document.createElement('div');

            // Style the box based on theme
            box.style.cssText = `width:min(700px, 95vw); max-height:85vh; background:${dark?'#0f0f0f':'#fff'}; color:${dark?'#fff':'#000'}; border-radius:12px; display:flex; flex-direction:column; padding:24px; box-shadow:0 20px 60px rgba(0,0,0,0.8); font-family:Roboto,Arial; border:1px solid ${dark?'#333':'#ccc'};`;

            // Create the header element
            const header = document.createElement('div');

            // Style the header
            header.style.cssText = 'font-size:20px; font-weight:bold; margin-bottom:15px; border-bottom: 1px solid #444; padding-bottom: 10px;';

            // Set header text
            header.textContent = title;

            // Create the body element for description
            const body = document.createElement('div');

            // Style the body for readability
            body.style.cssText = 'overflow-y:auto; white-space:pre-wrap; flex:1; line-height:1.6; font-size:15px; word-break: break-word;';

            // Process links within the content
            this.linkify(content, body);

            // Create the close button
            const btn = document.createElement('button');

            // Set localized text
            btn.textContent = txt.closeBtn;

            // Style the button based on theme
            btn.style.cssText = `margin-top:20px; align-self:flex-end; padding:10px 24px; border-radius:20px; border:none; cursor:pointer; background:${dark?'#fff':'#0f0f0f'}; color:${dark?'#0f0f0f':'#fff'}; font-weight:bold;`;

            // Close on button click
            btn.onclick = () => this.closeModal();

            // Close on overlay click
            overlay.onclick = (e) => { if(e.target === overlay) this.closeModal(); };

            // Assemble modal components
            box.append(header, body, btn);

            // Add box to overlay
            overlay.append(box);

            // Append modal to the page
            document.body.appendChild(overlay);
        }
    };

    // =========================================================================
    // SECTION 4: INJECTION & DOM OBSERVATION
    // ========================================================================

    /**
     * Injects the custom menu item into YouTube's native menus
     */
    function injectMenuButton() {

        // Select all potential YouTube menus using CSS selectors
        const menus = document.querySelectorAll('yt-list-view-model[role="menu"], #items.yt-dropdown-menu');

        // Get the translation strings corresponding to the current language
        const txt = getTxt();

        /*
         * Iterate through the list of menus detected on the page:
         */
        menus.forEach(menuList => {

            /*
             * Check if the menu exists:
             */
            if(menuList) {

                /*
                 * Verify if our custom item is already injected using its unique ID:
                 */
                if(!menuList.querySelector(`#${ITEM_ID}`)) {

                    // Create the top-level native YouTube host element
                    const item = document.createElement('yt-list-item-view-model');

                    // Assign the unique ID to the element
                    item.id = ITEM_ID;

                    // Apply YouTube's standard class for menu item hosts
                    item.className = 'ytListItemViewModelHost';

                    // Set the role for accessibility compliance
                    item.setAttribute('role', 'menuitem');

                    // Force transparent background to match native items by default
                    item.style.backgroundColor = 'transparent';

                    // Ensure the mouse cursor changes to a pointer on hover
                    item.style.cursor = 'pointer';

                    // Create the layout wrapper for the menu item
                    const wrapper = document.createElement('div');

                    // Apply native YouTube classes for layout and styling
                    wrapper.className = 'ytListItemViewModelLayoutWrapper ytListItemViewModelContainer ytListItemViewModelCompact ytListItemViewModelTappable ytListItemViewModelInPopup';

                    // Create the primary container for internal elements
                    const main = document.createElement('div');

                    // Use the standard YouTube class for main containers
                    main.className = 'ytListItemViewModelMainContainer';

                    // Create the container for the leading icon
                    const imgContainer = document.createElement('div');

                    // Apply native classes for accessory images in menus
                    imgContainer.className = 'ytListItemViewModelImageContainer ytListItemViewModelLeading';

                    // Hide this container from screen readers
                    imgContainer.setAttribute('aria-hidden', 'true');

                    // Create the span wrapper for the icon element
                    const iconWrapper = document.createElement('span');

                    // Apply YouTube's specific icon wrapper classes
                    iconWrapper.className = 'ytIconWrapperHost ytListItemViewModelAccessory ytListItemViewModelImage';

                    // Set the ARIA role to image
                    iconWrapper.setAttribute('role', 'img');

                    // Set an empty ARIA label as per native structure
                    iconWrapper.setAttribute('aria-label', '');

                    // Hide the wrapper from assistive technologies
                    iconWrapper.setAttribute('aria-hidden', 'true');

                    // Create the icon shape span element
                    const shapeSpan = document.createElement('span');

                    // Apply YouTube's native icon shape classes
                    shapeSpan.className = 'yt-icon-shape ytSpecIconShapeHost';

                    // Create the inner div with exact native inline styles
                    const iconInnerDiv = document.createElement('div');

                    // Set width to fill container
                    iconInnerDiv.style.width = '100%';

                    // Set height to fill container
                    iconInnerDiv.style.height = '100%';

                    // Set display to block
                    iconInnerDiv.style.display = 'block';

                    // Ensure the icon uses the current text color for its fill
                    iconInnerDiv.style.fill = 'currentcolor';

                    // Create the SVG element with the correct XML namespace
                    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

                    // Set the SVG viewbox dimensions
                    svg.setAttribute("viewBox", "0 0 24 24");

                    // Set the SVG height to match native icons
                    svg.setAttribute("height", "24");

                    // Set the SVG width to match native icons
                    svg.setAttribute("width", "24");

                    // Disable focus on the SVG element
                    svg.setAttribute("focusable", "false");

                    // Hide the SVG from assistive technologies
                    svg.setAttribute("aria-hidden", "true");

                    // Disable pointer events on the SVG
                    svg.style.pointerEvents = 'none';

                    // Set display to inherit
                    svg.style.display = 'inherit';

                    // Set SVG width to fill
                    svg.style.width = '100%';

                    // Set SVG height to fill
                    svg.style.height = '100%';

                    // Create the path element for the icon shape
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

                    // Set the SVG path data for the description icon
                    path.setAttribute("d", "M21 15h-7v-1h7v1zm0-4H3v1h18v-1zm0-4H3v1h18V7zm0-4H3v1h18V3zM3 15h7v-1H3v1zm0 4h18v-1H3v1z");

                    // Append the path to the SVG element
                    svg.appendChild(path);

                    // Append SVG to the inner div
                    iconInnerDiv.appendChild(svg);

                    // Append the inner div to the shape span
                    shapeSpan.appendChild(iconInnerDiv);

                    // Append the shape span to the icon wrapper
                    iconWrapper.appendChild(shapeSpan);

                    // Append the icon wrapper to the image container
                    imgContainer.appendChild(iconWrapper);

                    // Create a native button element for the text label
                    const textBtn = document.createElement('button');

                    // Apply native YouTube classes for menu button behavior
                    textBtn.className = 'ytButtonOrAnchorHost ytButtonOrAnchorButton ytListItemViewModelButtonOrAnchor';

                    // Set the button background to transparent
                    textBtn.style.backgroundColor = 'transparent';

                    // Create the wrapper for the text label
                    const textWrapper = document.createElement('div');

                    // Assign the native class for text wrappers
                    textWrapper.className = 'ytListItemViewModelTextWrapper';

                    // Create the title wrapper for the label
                    const titleWrapper = document.createElement('div');

                    // Assign the native class for title wrappers
                    titleWrapper.className = 'ytListItemViewModelTitleWrapper';

                    // Create the final span for the actual text string
                    const textLabel = document.createElement('span');

                    // Apply the full suite of native text styling classes
                    textLabel.className = 'ytAttributedStringHost ytListItemViewModelTitle ytAttributedStringWhiteSpacePreWrap';

                    // Set the translated text content
                    textLabel.textContent = txt.menuItem;

                    // Append the label to the title wrapper
                    titleWrapper.appendChild(textLabel);

                    // Append the title wrapper to the text wrapper
                    textWrapper.appendChild(titleWrapper);

                    // Append the text wrapper to the button element
                    textBtn.appendChild(textWrapper);

                    // Append the icon container to the main container
                    main.appendChild(imgContainer);

                    // Append the text button to the main container
                    main.appendChild(textBtn);

                    // Append the main container to the layout wrapper
                    wrapper.appendChild(main);

                    // Append the layout wrapper to the host item
                    item.appendChild(wrapper);

                    /*
                     * Define the action when the mouse enters the element:
                     */
                    item.onmouseenter = () => {

                        // Apply the official 2026 YouTube CSS variable for menu hover background
                        item.style.backgroundColor = 'var(--yt-spec-menu-item-background-hover)';

                        // Add a linear transition for a smooth native-like fade effect
                        item.style.transition = 'background-color 0.1s linear';

                    };

                    /*
                     * Define the action when the mouse leaves the element:
                     */
                    item.onmouseleave = () => {

                        // Reset the background color to transparent
                        item.style.backgroundColor = 'transparent';

                        // Disable the transition to match native menu behavior on exit
                        item.style.transition = 'none';

                    };

                    /*
                     * Define the click handler for the menu item:
                     */
                    item.onclick = (event) => {

                        // Prevent default browser click behavior
                        event.preventDefault();

                        // Stop the click event from bubbling up to YouTube
                        event.stopPropagation();

                        // Create a keyboard event for the Escape key
                        const escEvent = new KeyboardEvent('keydown', {key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true});

                        // Dispatch the escape event to close the native menu
                        document.dispatchEvent(escEvent);

                        // Execute the preview request after a short delay
                        setTimeout(handlePreviewRequest, 100);
                    };

                    // Append the completed item to the menu list
                    menuList.appendChild(item);
                }
            }
        });
    }

    /*************************************************************/
    /* Start the observer and interval to handle dynamic content */
    /*************************************************************/

    // Create MutationObserver to watch for DOM changes
    const domObserver = new MutationObserver(() => injectMenuButton());

    // Start observing the body for added nodes
    domObserver.observe(document.body, { childList: true, subtree: true });

    // Safety fallback: run injection check every second
    setInterval(injectMenuButton, 1000);
})();