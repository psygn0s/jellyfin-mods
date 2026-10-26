(function () {
    "use strict";

    const SCRIPT_ID = "__jfHideDuplicatePeopleV4";

    if (window[SCRIPT_ID]) return;
    window[SCRIPT_ID] = true;

    const CONTAINER_SELECTOR = "#castContent";
    const CARD_SELECTOR = ".personCard";
    const NAME_SELECTOR = ".cardText-first, .cardText, .itemName";
    const STABILITY_DELAY = 500;

    const cardStates = new WeakMap();

    let observer = null;
    let cleanupTimer = null;

    // Use a data attribute instead of modifying inline display styles.
    const style = document.createElement("style");
    style.id = "__jfHideDuplicatePeopleV4Styles";
    style.textContent = `
        #castContent .personCard[data-jf-hidden="true"] {
            display: none !important;
        }
    `;
    document.head.appendChild(style);

    function getName(card) {
        const element = card.querySelector(NAME_SELECTOR);

        return (element?.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLocaleLowerCase();
    }

    function getPortraitState(card) {
        const portrait = card.querySelector(".cardImageContainer");

        if (!portrait) return "pending";

        const image = portrait.querySelector("img");

        if (image) {
            if (!image.complete) return "pending";
            return image.naturalWidth > 0 ? "valid" : "missing";
        }

        const background =
            portrait.style.backgroundImage ||
            getComputedStyle(portrait).backgroundImage;

        const hasBackground =
            background && background !== "none";

        const isDefault =
            portrait.classList.contains("defaultCardBackground");

        const isLazyHidden =
            portrait.classList.contains("lazy-hidden");

        // Jellyfin's lazy-loading state is not proof of a missing image.
        if (isLazyHidden) return "pending";

        if (isDefault) return "missing";

        if (hasBackground) return "valid";

        return "pending";
    }

    function setHidden(card, hidden) {
        if (hidden) {
            card.dataset.jfHidden = "true";
        } else {
            delete card.dataset.jfHidden;
        }
    }

    function resetCard(card, name) {
        const state = {
            name,
            candidate: null,
            candidateSince: 0,
            hidden: false
        };

        cardStates.set(card, state);
        setHidden(card, false);

        return state;
    }

    function processContainer(container, now) {
        const seen = new Set();

        container.querySelectorAll(CARD_SELECTOR).forEach(card => {
            const name = getName(card);
            let state = cardStates.get(card);

            // Jellyfin may recycle a card for a different person.
            if (!state || state.name !== name) {
                state = resetCard(card, name);
            }

            if (!name) {
                state.candidate = null;
                setHidden(card, false);
                return;
            }

            const portrait = getPortraitState(card);

            // Never change visibility just because an image is loading.
            if (portrait === "pending") {
                state.candidate = null;

                if (!state.hidden) {
                    setHidden(card, false);
                }

                return;
            }

            let reason = null;

            if (portrait === "missing") {
                reason = "missing";
            } else if (seen.has(name)) {
                reason = "duplicate";
            }

            if (!reason) {
                seen.add(name);
                state.candidate = null;

                if (!state.hidden) {
                    setHidden(card, false);
                }

                return;
            }

            // Require the same hide decision to remain stable before
            // applying it. This helps prevent scroll-related flickering.
            if (state.candidate !== reason) {
                state.candidate = reason;
                state.candidateSince = now;
                return;
            }

            if (now - state.candidateSince >= STABILITY_DELAY) {
                state.hidden = true;
                setHidden(card, true);
            }
        });
    }

    function cleanPeople() {
        const now = Date.now();

        document.querySelectorAll(CONTAINER_SELECTOR)
            .forEach(container => processContainer(container, now));

        // Recheck only if a hide decision is still stabilizing.
        const needsRecheck = document.querySelector(
            `${CONTAINER_SELECTOR} ${CARD_SELECTOR}`
        );

        if (needsRecheck) {
            const cards = document.querySelectorAll(
                `${CONTAINER_SELECTOR} ${CARD_SELECTOR}`
            );

            for (const card of cards) {
                const state = cardStates.get(card);

                if (
                    state?.candidate &&
                    !state.hidden
                ) {
                    scheduleCleanup(STABILITY_DELAY);
                    break;
                }
            }
        }
    }

    function scheduleCleanup(delay = 150) {
        if (cleanupTimer !== null) {
            clearTimeout(cleanupTimer);
        }

        cleanupTimer = setTimeout(() => {
            cleanupTimer = null;
            cleanPeople();
        }, delay);
    }

    function start() {
        if (!document.body) {
            document.addEventListener("DOMContentLoaded", start, {
                once: true
            });
            return;
        }

        observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                const target = mutation.target;
                const element = target instanceof Element
                    ? target
                    : target.parentElement;

                if (!element) continue;

                const insideCast =
                    element.matches(CONTAINER_SELECTOR) ||
                    element.closest(CONTAINER_SELECTOR) ||
                    element.querySelector(CONTAINER_SELECTOR);

                if (insideCast) {
                    scheduleCleanup();
                    return;
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
                "class",
                "style",
                "src"
            ]
        });

        cleanPeople();
    }

    start();
})();
