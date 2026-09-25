/* =========================================================
   WE USED TO…
   Interactive memory experience
   ========================================================= */


/* ---------------------------------------------------------
   MOBILE NAVIGATION
--------------------------------------------------------- */

const menuButton = document.querySelector(".menu");
const nav = document.querySelector(".nav");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    nav.classList.toggle("open");

    menuButton.textContent =
      nav.classList.contains("open") ? "CLOSE" : "MENU";
  });

  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuButton.textContent = "MENU";
    });
  });
}


/* ---------------------------------------------------------
   SCROLL REVEAL
--------------------------------------------------------- */

const revealItems = document.querySelectorAll(
  ".chapter, .intro, .memory-wall"
);

const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.08
  }
);

revealItems.forEach(item => {
  revealObserver.observe(item);
});


/* ---------------------------------------------------------
   IMAGE FALLBACKS
   If a remote archive image fails, try another verified
   Nigerian archive image instead of leaving a broken image.
--------------------------------------------------------- */

const imageFallbacks = [
  "https://commons.wikimedia.org/wiki/Special:Redirect/file/Childhood%20memories.jpg",
  "https://commons.wikimedia.org/wiki/Special:Redirect/file/After%20school%20hours%20to.jpg",
  "https://commons.wikimedia.org/wiki/Special:Redirect/file/Girls%20playing%20ayo.jpg",
  "https://commons.wikimedia.org/wiki/Special:Redirect/file/Nigeria%20students.jpg"
];

document.querySelectorAll("img").forEach(image => {

  let attempt = 0;

  image.addEventListener("error", () => {

    if (attempt < imageFallbacks.length) {
      image.src = imageFallbacks[attempt];
      attempt++;
    }
  });

});


/* ---------------------------------------------------------
   NEPA INTERACTION
--------------------------------------------------------- */

const nepaVisual = document.querySelector(".nepa-visual");

if (nepaVisual) {

  const nepaButton = document.createElement("button");

  nepaButton.type = "button";
  nepaButton.textContent = "TURN THE LIGHT ON";

  nepaButton.style.cssText = `
    position:absolute;
    bottom:25px;
    left:50%;
    transform:translateX(-50%);
    padding:11px 16px;
    border:1px solid rgba(255,255,255,.35);
    background:rgba(20,17,14,.7);
    color:white;
    cursor:pointer;
    font-size:10px;
    font-weight:700;
    letter-spacing:.08em;
  `;

  nepaVisual.style.position = "relative";
  nepaVisual.appendChild(nepaButton);

  nepaButton.addEventListener("click", () => {

    nepaVisual.classList.toggle("off");

    if (nepaVisual.classList.contains("off")) {
      nepaButton.textContent = "BRING BACK THE LIGHT";
    } else {
      nepaButton.textContent = "TURN THE LIGHT OFF";
    }

  });
}


/* ---------------------------------------------------------
   SPEECH NARRATION
--------------------------------------------------------- */

/*
  This uses the browser's built-in speech engine.

  Instead of sending every sentence separately — which made
  the previous version sound like a poem — the script groups
  paragraphs into natural chunks.

  It also prefers Nigerian English when the device provides it,
  then British English, then another English voice.
*/

let currentUtterance = null;
let currentChapter = null;
let currentChunks = [];
let currentChunkIndex = 0;
let isPaused = false;


/* Get available voices */

function getVoices() {
  return window.speechSynthesis
    ? window.speechSynthesis.getVoices()
    : [];
}


/* Pick the most suitable English voice */

function chooseVoice() {

  const voices = getVoices();

  if (!voices.length) {
    return null;
  }

  const preferredLanguages = [
    "en-NG",
    "en-GB",
    "en-US",
    "en-AU",
    "en-ZA"
  ];

  for (const language of preferredLanguages) {

    const exact = voices.find(
      voice => voice.lang.toLowerCase() === language.toLowerCase()
    );

    if (exact) {
      return exact;
    }
  }

  return (
    voices.find(voice =>
      voice.lang.toLowerCase().startsWith("en")
    ) || null
  );
}


/* Create natural narration chunks */

function createNarrationChunks(chapter) {

  const paragraphs = [
    ...chapter.querySelectorAll(
      ".chapter-content > p:not(.memory-line):not(.final-line)"
    )
  ];

  const texts = paragraphs
    .map(p => p.innerText.trim())
    .filter(Boolean);

  const chunks = [];

  let current = "";

  texts.forEach(text => {

    if (!current) {
      current = text;
      return;
    }

    /*
      Keep chunks conversational.
      Around 350–500 characters gives the browser voice
      enough context without creating huge blocks.
    */

    if ((current + " " + text).length < 500) {
      current += " " + text;
    } else {
      chunks.push(current);
      current = text;
    }

  });

  if (current) {
    chunks.push(current);
  }

  return chunks;
}


/* Highlight the active narration chapter */

function setActiveChapter(chapter) {

  document.querySelectorAll(".chapter.narrating").forEach(item => {
    item.classList.remove("narrating");
  });

  if (chapter) {
    chapter.classList.add("narrating");
  }
}


/* Speak next chunk */

function speakCurrentChunk() {

  if (!currentChapter || currentChunkIndex >= currentChunks.length) {

    setActiveChapter(null);

    currentChapter = null;
    currentChunks = [];
    currentChunkIndex = 0;
    currentUtterance = null;
    isPaused = false;

    return;
  }

  const text = currentChunks[currentChunkIndex];

  currentUtterance = new SpeechSynthesisUtterance(text);

  const voice = chooseVoice();

  if (voice) {
    currentUtterance.voice = voice;
    currentUtterance.lang = voice.lang;
  } else {
    currentUtterance.lang = "en-NG";
  }

  /*
    Slightly slower than normal.
    Not so slow that it sounds like a poem.
  */

  currentUtterance.rate = 0.94;
  currentUtterance.pitch = 0.98;
  currentUtterance.volume = 1;

  currentUtterance.onend = () => {

    currentChunkIndex++;

    setTimeout(() => {

      if (!isPaused) {
        speakCurrentChunk();
      }

    }, 180);
  };

  currentUtterance.onerror = event => {

    if (event.error === "interrupted") {
      return;
    }

    currentChunkIndex++;

    if (!isPaused) {
      speakCurrentChunk();
    }
  };

  window.speechSynthesis.speak(currentUtterance);
}


/* Start narration */

function startNarration(chapter) {

  if (!("speechSynthesis" in window)) {

    alert(
      "Your browser does not support voice narration. " +
      "Please try Chrome, Edge or Safari."
    );

    return;
  }

  window.speechSynthesis.cancel();

  currentChapter = chapter;
  currentChunks = createNarrationChunks(chapter);
  currentChunkIndex = 0;
  isPaused = false;

  setActiveChapter(chapter);

  speakCurrentChunk();
}


/* Pause / resume */

function pauseNarration() {

  if (!window.speechSynthesis) return;

  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {

    window.speechSynthesis.pause();
    isPaused = true;

  } else if (window.speechSynthesis.paused) {

    window.speechSynthesis.resume();
    isPaused = false;

  }
}


/* Stop narration */

function stopNarration() {

  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  currentUtterance = null;
  currentChapter = null;
  currentChunks = [];
  currentChunkIndex = 0;
  isPaused = false;

  setActiveChapter(null);
}


/* Attach controls to every chapter */

document.querySelectorAll(".chapter").forEach(chapter => {

  const listen = chapter.querySelector(".listen-btn");
  const pause = chapter.querySelector(".pause-btn");
  const stop = chapter.querySelector(".stop-btn");

  if (listen) {

    listen.addEventListener("click", () => {
      startNarration(chapter);
    });

  }

  if (pause) {

    pause.addEventListener("click", () => {
      pauseNarration();

      pause.textContent =
        window.speechSynthesis &&
        window.speechSynthesis.paused
          ? "▶ Continue"
          : "Ⅱ Pause";
    });

  }

  if (stop) {

    stop.addEventListener("click", () => {

      stopNarration();

      if (pause) {
        pause.textContent = "Ⅱ Pause";
      }

    });

  }

});


/*
  Some browsers load voices after the page has already loaded.
*/

if ("speechSynthesis" in window) {

  window.speechSynthesis.onvoiceschanged = () => {
    getVoices();
  };

}


/* ---------------------------------------------------------
   MEMORY WALL
--------------------------------------------------------- */

const memoryForm = document.getElementById("memoryForm");
const memoryInput = document.getElementById("memoryInput");
const memoryList = document.getElementById("memoryList");

function loadMemories() {

  if (!memoryList) return;

  const saved =
    JSON.parse(localStorage.getItem("weUsedToMemories") || "[]");

  memoryList.innerHTML = "";

  saved.forEach(memory => {
    addMemoryToPage(memory);
  });
}


function addMemoryToPage(memory) {

  const item = document.createElement("div");

  item.className = "memory-item";

  item.textContent = memory;

  memoryList.appendChild(item);
}


if (memoryForm && memoryInput && memoryList) {

  loadMemories();

  memoryForm.addEventListener("submit", event => {

    event.preventDefault();

    const memory = memoryInput.value.trim();

    if (!memory) return;

    const saved =
      JSON.parse(localStorage.getItem("weUsedToMemories") || "[]");

    saved.push(memory);

    localStorage.setItem(
      "weUsedToMemories",
      JSON.stringify(saved)
    );

    addMemoryToPage(memory);

    memoryInput.value = "";

  });

}


/* ---------------------------------------------------------
   STOP NARRATION WHEN LEAVING THE PAGE
--------------------------------------------------------- */

window.addEventListener("beforeunload", () => {

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

});


/* ---------------------------------------------------------
   SMALL ACCESSIBILITY TOUCH
--------------------------------------------------------- */

document.querySelectorAll("a[href^='#']").forEach(link => {

  link.addEventListener("click", () => {

    const target = document.querySelector(link.getAttribute("href"));

    if (target) {
      target.setAttribute("tabindex", "-1");

      setTimeout(() => {
        target.focus({ preventScroll: true });
      }, 500);
    }

  });

});