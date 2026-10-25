
(function () {
    "use strict";

    const SCRIPT_ID = "__jfHideDuplicatePeopleV2";

    if (window[SCRIPT_ID]) return;
    window[SCRIPT_ID] = true;

    const PEOPLE_SELECTOR =
        "#castContent .personCard";

    const NAME_SELECTOR =
        ".cardText-first, .cardText, .itemName";

    const DEFAULT_CLASSES = [
        "defaultCardBackground",
        "lazy-hidden"
    ];

    const pendingCards = new WeakMap();
    let observer;
    let scheduled = false;

    function getName(card) {
        const element = card.querySelector(NAME_SELECTOR);

        return (element?.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLocaleLowerCase();
    }

    function getPortraitState(card) {
        const portrait = card.querySelector(".cardImageContainer");

        if (!portrait) {
            return "pending";
        }

        if (DEFAULT_CLASSES.some(cls => portrait.classList.contains(cls))) {
            // lazy-hidden can mean loading is pending, not failure.
            if (portrait.classList.contains("lazy-hidden")) {
                return "pending";
            }

            return "missing";
        }

        const background = portrait.style.backgroundImage ||
            getComputedStyle(portrait).backgroundImage;

        if (background === "none") {
            const image = portrait.querySelector("img");

            if (image) {
                if (image.complete && image.naturalWidth > 0) {
                    return "valid";
                }

                if (image.complete && image.naturalWidth === 0) {
                    return "missing";
                }

                return "pending";
            }

            // Jellyfin may apply the background image later.
            return "pending";
        }

        if (background && background !== "none") {
            return "valid";
        }

        return "pending";
    }

    function hide(card) {
        card.dataset.jfPeopleHidden = "true";
        card.style.setProperty("display", "none", "important");
    }

    function show(card) {
        delete card.dataset.jfPeopleHidden;
        card.style.removeProperty("display");
    }

    function processContainer(container) {
        const seen = new Set();

        container.querySelectorAll(".personCard").forEach(card => {
            const portraitState = getPortraitState(card);
            const name = getName(card);

            // Wait for Jellyfin to finish loading the portrait.
            if (portraitState === "pending") {
                show(card);
                return;
            }

            if (portraitState === "missing") {
                hide(card);
                return;
            }

            if (!name) {
                show(card);
                return;
            }

            if (seen.has(name)) {
                hide(card);
                return;
            }

            seen.add(name);
            show(card);
        });
    }

    function cleanPeople() {
        document.querySelectorAll("#castContent").forEach(processContainer);
    }

    function scheduleCleanup() {
        if (scheduled) return;
        scheduled = true;

        requestAnimationFrame(() => {
            scheduled = false;
            cleanPeople();
        });
    }

    function start() {
        if (!document.body) {
            document.addEventListener("DOMContentLoaded", start, {
                once: true
            });
            return;
        }

        observer = new MutationObserver(mutations => {
            // Ignore mutations caused only by our own display changes.
            const relevant = mutations.some(mutation => {
                if (mutation.type === "childList") {
                    return true;
                }

                if (mutation.type === "attributes") {
                    const target = mutation.target;

                    return !target.closest?.("[data-jf-people-hidden]");
                }

                return false;
            });

            if (relevant) scheduleCleanup();
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
