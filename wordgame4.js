// Transcrypt'ed from Python, 2025-06-16, updated 2025-10-14 for Firebase v10.14.0
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js';
import { getDatabase, ref, set, update, onValue, get, remove } from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js';

// Global variables for Firebase
let app;
let database;
let auth;

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD4PoM3u5DcJWG-4pBlNW8I7vdUlvrTk-0",
  authDomain: "adivinar-palabras-5ca6e.firebaseapp.com",
  databaseURL: "https://adivinar-palabras-5ca6e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "adivinar-palabras-5ca6e",
  storageBucket: "adivinar-palabras-5ca6e.firebasestorage.app",
  messagingSenderId: "291779074101",
  appId: "1:291779074101:web:a35d6d5bcae4d6b9b4397c"
};

// Initialize Firebase
try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  auth = getAuth(app);

  // Attempt anonymous sign-in
  signInAnonymously(auth)
    .then(() => console.log('Firebase: Anonymous sign-in successful'))
    .catch(err => console.error('Firebase: Anonymous sign-in failed', err));
  console.log('Firebase initialized successfully', database);
} catch (error) {
  console.error('Firebase initialization failed', error);
}

var __name__ = '__main__';

// Utility function for delays
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Global game state to prevent UI resets during active game
let isGameActive = false;
let isCreatingUI = false;

// Static fallback word list (Spanish, used if APIs fail)
const palabras = [
  "manzana", "banana", "naranja", "guitarra", "planeta", "ventana", "cohete", "flor",
  "montana", "rio", "bosque", "desierto", "isla", "oceano", "nube", "tormenta",
  "tigre", "elefante", "conejo", "mono", "cebra", "leon", "panda", "koala",
  "camara", "lapiz", "cuaderno", "portatil", "tableta", "impresora", "botella", "cartera",
  "almohada", "manta", "espejo", "escalera", "cesta", "martillo", "destornillador", "llave",
  "jardin", "garaje", "cocina", "dormitorio", "bano", "balcon", "pasillo", "atico",
  "violin", "trompeta", "tambores", "flauta", "saxofon", "arpa", "chelo", "clarinete",
  "diamante", "esmeralda", "zafiro", "rubi", "opalo", "topacio", "perla", "ambar",
  "castillo", "palacio", "templo", "puente", "torre", "estatua", "museo", "biblioteca",
  "satelite", "cometa", "asteroide", "galaxia", "nebulosa", "meteoro", "nave", "planicie",
  "galleta", "sandwich", "pizza", "hamburguesa", "tortilla", "ensalada", "pasta", "sopa",
  "selva", "sabana", "tundra", "volcan", "canon", "valle", "acantilado", "glaciar",
  "zapato", "camisa", "pantalon", "sombrero", "reloj", "anillo", "collar", "pulsera",
  "carro", "bicicleta", "camion", "avion", "barco", "tren", "autobus", "motocicleta",
  "raton", "teclado", "pantalla", "altavoz", "auricular", "microfono", "cargador", "bateria",
  "silla", "mesa", "sofa", "cortina", "puerta", "pared", "techo", "suelo",
  "frutilla", "limon", "uva", "pera", "melon", "sandia", "cereza", "ciruela",
  "luz", "sombra", "fuego", "hielo", "aire", "agua", "tierra", "hierba"
];

// Predefined letter frequency for Spanish (approximate, based on common usage)
const letterFrequency = ['e', 'a', 'o', 'i', 'n', 's', 'r', 'l', 'u', 'd', 't', 'c', 'm', 'p', 'b', 'y', 'v', 'g', 'f', 'q', 'j', 'h', 'z', 'x', 'w', 'k'];

// Cache for translated Spanish words
let wordCache = [];

// API configurations
const WORD_API_URL = 'https://api.api-ninjas.com/v1/randomword';
const WORD_API_KEY = 'JGZtMGy2radD8zIA1hAQgoqJKa8Nzhck0XhgDtoL'; // Get from api-ninjas.com
const TRANSLATE_API_URL = 'https://api-free.deepl.com/v2/translate';
const TRANSLATE_API_KEY = '8c71deb7-78c4-4ee2-8bf1-621a0a490d85:fx'; // Get from deepl.com
// Note: Translation uses a proxy at http://localhost:3000/translate. Ensure proxy is running for API calls.

async function fetchSingleWord() {
  try {
    const response = await fetch(WORD_API_URL, {
      headers: { 'X-Api-Key': WORD_API_KEY }
    });
    if (!response.ok) {
      throw new Error(`Word API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('Raw API response:', data);
    let word;
    if (typeof data.word === 'string') {
      word = data.word.toLowerCase();
    } else if (Array.isArray(data.word) && data.word.length === 1 && typeof data.word[0] === 'string') {
      console.log('Array response detected, extracting word:', data.word[0]);
      word = data.word[0].toLowerCase();
    } else {
      console.error('Invalid word format:', data.word);
      throw new Error('Invalid word format in response');
    }
    if (word.length >= 4 && word.length <= 12 && /^[a-z]+$/.test(word)) {
      return word;
    }
    console.log('Word rejected (length or format):', word);
    return null; // Invalid word, retry
  } catch (error) {
    console.error('Error fetching single word:', error);
    return null;
  }
}

// Helper function to fetch multiple English words
async function fetchRandomWords(count = 5) {
  const words = [];
  let attempts = 0;
  const maxAttempts = count * 3; // Allow more retries for invalid responses
  console.log(`Fetching ${count} valid English words...`);
  while (words.length < count && attempts < maxAttempts) {
    const word = await fetchSingleWord();
    if (word && !words.includes(word)) {
      words.push(word);
      console.log(`Fetched word ${words.length}/${count}: ${word}`);
    } else {
      console.log(`Attempt ${attempts + 1}: No valid word fetched`);
    }
    attempts++;
  }
  console.log('Fetched English words:', words);
  return words;
}

// Helper function to translate English words to Spanish using DeepL
async function translateToSpanish(englishWords) {
  try {
    // Validate input
    if (!Array.isArray(englishWords) || englishWords.length === 0 || !englishWords.every(word => typeof word === 'string' && word.trim())) {
      console.error('Invalid input: englishWords must be a non-empty array of non-empty strings', englishWords);
      return [];
    }
    console.log('Translating words:', englishWords);
    const response = await fetch('https://translation02service.netlify.app/.netlify/functions/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: englishWords, // Already an array
        source_lang: 'EN',
        target_lang: 'ES'
      })
    });
    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('DeepL raw response:', data);

    // Validate response
    if (!data.translations || !Array.isArray(data.translations) || data.translations.length !== englishWords.length) {
      console.error('Translation mismatch:', data.translations?.length, 'translations for', englishWords.length, 'words');
      return [];
    }

    const translatedWords = data.translations
      .map((t, index) => ({
        originalWord: englishWords[index],
        original: normalizar(englishWords[index]),
        translated: normalizar(t.text).toLowerCase()
      }))
      .filter(({ originalWord, original, translated }) => {
        const isSame = original === translated;
        if (isSame) {
          console.log(`Discarded word: '${originalWord}' (translated to '${translated}', same as original)`);
        }
        return !isSame;
      })
      .map(({ translated }) => translated)
      .filter(word => 
        word.length >= 4 && word.length <= 12 && /^[a-záéíóúüñ]+$/.test(word)
      );

    console.log('Filtered Spanish words:', translatedWords);
    return translatedWords;
  } catch (error) {
    console.error('Error translating words:', error);
    return [];
  }
}

// Modified choice function
function choice(lst) {
  if (!lst || lst.length === 0) return "manzana"; // Fallback word
  return lst[Math.floor(Math.random() * lst.length)];
}

// Modified get_secret_word to fetch, translate, and cache
async function get_secret_word() {
  console.log('get_secret_word called, cache size:', wordCache.length);
  // Try to use cached words first
  if (wordCache.length > 0) {
    const word = choice(wordCache);
    wordCache = wordCache.filter(w => w !== word); // Remove used word
    console.log('Used cached word:', word, 'Remaining cache:', wordCache.length);
    return word;
  }

  // Fetch and translate new words
  const englishWords = await fetchRandomWords(5);
  if (englishWords.length > 0) {
    const spanishWords = await translateToSpanish(englishWords);
    if (spanishWords.length > 0) {
      wordCache = spanishWords;
      const word = choice(wordCache);
      wordCache = wordCache.filter(w => w !== word);
      console.log('Fetched and translated word:', word, 'New cache:', wordCache.length);
      return word;
    }
  }

  // Fallback to static list if APIs fail
  console.warn('APIs failed, falling back to static list');
  const palabras_filtradas = palabras.filter(p => p.length >= 4 && p.length <= 12);
  return choice(palabras_filtradas);
}

// Define focusInput once globally to avoid duplication
function focusInput(input) {
  if (input && input.parentNode && document.body.contains(input)) {
    try {
      input.focus();
      console.log('focusInput: Input focused', { inputId: input.id });
      return true;
    } catch (err) {
      console.error('focusInput: Error focusing input', err);
      return false;
    }
  }
  console.warn('focusInput: Input not focusable', { inputExists: !!input, isAttached: input?.parentNode });
  return false;
}

// AI guess function
async function get_ai_guess(guessed_letters, secret_word, used_wrong_letters, used_wrong_words, mustBeConsonant = false, difficulty = 'facil') {
  console.log('get_ai_guess: Generating AI guess, Loaded version 2025-06-16-v9.8', { 
    guessed_letters: Array.from(guessed_letters), 
    used_wrong_letters: Array.from(used_wrong_letters), 
    used_wrong_words: Array.from(used_wrong_words), 
    mustBeConsonant, 
    difficulty 
  });
  const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
  const min_guesses_for_word = secret_word.length < 5 ? 1 : 2;
  const allow_word_guess = guessed_letters.size >= min_guesses_for_word || Array.from(guessed_letters).some(l => secret_word.split('').filter(x => x === l).length > 1);
  const word_guess_prob = difficulty === 'dificil' ? 0.65 : difficulty === 'normal' ? 0.45 : 0.3;
  if (allow_word_guess && Math.random() < word_guess_prob) {
    const normalized_secret = normalizar(secret_word);
    const candidates = palabras
      .filter(word => word.length === secret_word.length)
      .filter(word => !used_wrong_words.has(normalizar(word)))
      .filter(word => {
        const norm_word = normalizar(word);
        const isValid = normalized_secret.split('').every((letter, i) => 
          guessed_letters.has(letter) ? norm_word[i] === letter : true
        );
        if (!isValid) {
          console.log(`get_ai_guess: Filtered out word '${word}' due to position mismatch`);
        }
        return isValid;
      });
    console.log('get_ai_guess: Word candidates:', candidates);
    if (candidates.length > 0) {
      const guess = choice(candidates);
      console.log('get_ai_guess: AI guessed word:', guess, { probability: word_guess_prob });
      return normalizar(guess);
    }
  }
  let available_letters = letterFrequency.filter(l => 
    !guessed_letters.has(l) && 
    !used_wrong_letters.has(l) && 
    (!mustBeConsonant || !vowels.has(l))
  );
  if (available_letters.length > 0) {
    const guess = available_letters[0];
    console.log('get_ai_guess: AI guessed letter:', guess, { probability: 1 - word_guess_prob });
    return guess;
  }
  const all_letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const remaining_letters = all_letters.filter(l => 
    !guessed_letters.has(l) && 
    !used_wrong_letters.has(l) && 
    (!mustBeConsonant || !vowels.has(l))
  );
  const guess = remaining_letters.length > 0 ? choice(remaining_letters) : 'a';
  console.log('get_ai_guess: AI fallback guess:', guess, { probability: 1 - word_guess_prob });
  return guess;
}

function normalizar(texto) {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036F]/g, '');
}

function format_name(name) {
  console.log('format_name: Input:', name);
  if (!name) return '';
  const formatted = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  console.log('format_name: Output:', formatted);
  return escapeHTML(formatted);
}

function format_secret_word(secret_word, guessed_letters) {
  const normalized_word = normalizar(secret_word);
  let formatted = '';
  normalized_word.split('').forEach((letter, index) => {
    if (guessed_letters.has(letter)) {
      formatted += secret_word[index].toUpperCase();
    } else {
      formatted += `<strong style='color: red'>${secret_word[index].toUpperCase()}</strong>`;
    }
  });
  console.log('Formatted secret word:', formatted);
  return formatted;
}

function formato_palabra(progreso) {
  return progreso.map(l => l === "_" ? "_" : l.toUpperCase()).join(" ");
}

// Helper function to escape HTML characters for XSS prevention
function escapeHTML(str) {
  if (str == null || typeof str !== 'string') {
    console.warn('escapeHTML: Received invalid input', str);
    return '';
  }
  return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, '');
}

function display_feedback(message, color, player = null, append = false, autoClearMs = null) {
  console.log('display_feedback:', { message, color, player, append, autoClearMs });
  const output = document.querySelector('.game-output');
  if (!output) {
    console.warn('display_feedback: Output element not found');
    return;
  }
  const escapedPlayer = player ? escapeHTML(player) : null;
  const formatted_feedback = escapedPlayer ? message.replace(player, `<strong>${escapedPlayer}</strong>`) : message;
  if (append || arguments[3] === true) {
    output.innerHTML += `<br><span style="color: ${color}">${formatted_feedback.replace(/\n/g, '<br>')}</span>`;
  } else {
    output.innerHTML = `<span style="color: ${color}">${formatted_feedback.replace(/\n/g, '<br>')}</span>`;
  }
  try {
    output.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error('display_feedback: Error scrolling output', err);
  }
  // Auto-clear after specified ms
  if (autoClearMs) {
    setTimeout(() => {
      output.innerHTML = '';
    }, autoClearMs);
  }
}

async function get_guess(guessed_letters, secret_word, prompt, input, output, button) {
  console.log('get_guess: Starting, Loaded version 2025-06-19-v9.19', {
    prompt: prompt?.innerText,
    inputExists: !!input?.parentNode,
    buttonExists: !!button?.parentNode,
    inputValue: input?.value,
    inputId: input?.id || 'no-id'
  });
  if (!prompt || !input || !output) {
    console.error('get_guess: Missing required DOM elements', { prompt, input, output });
    throw new Error('Missing required DOM elements');
  }
  input.id = input.id || `guess-input-${Date.now()}`;
  const normalized_secret = normalizar(secret_word);
  const min_guesses_for_word = secret_word.length < 5 ? 1 : 2;
  const permitir_palabra = guessed_letters.size >= min_guesses_for_word || Array.from(guessed_letters).some(l => secret_word.split('').filter(x => x === l).length > 1);
  prompt.innerText = permitir_palabra ? `Adivina una letra o la palabra completa:` : `Adivina una letra:`;
  if (button && button.parentNode) {
    button.style.display = 'none';
    console.log('get_guess: Enviar button hidden for guessing');
  }
  try {
    input.value = '';
    focusInput(input);
    return new Promise((resolve, reject) => {
      const enterHandler = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          console.log('get_guess: Enter pressed', { inputValue: input.value, inputId: input.id });
          const result = handleGuess('enter', input.value);
          if (result.valid) {
            input.removeEventListener('keypress', enterHandler); // Remove listener before resolving
            resolve(result.guess);
          }
        }
      };
      function cleanup() {
        input.removeEventListener('keypress', enterHandler);
      }
      function handleGuess(source, guessValue) {
        console.log('get_guess: handleGuess called', { source, guessValue, currentInputValue: input.value, inputId: input.id });
        const rawGuess = guessValue || '';
        const trimmedGuess = rawGuess.trim();
        const normalizedGuess = normalizar(trimmedGuess);
        console.log('get_guess: Processing guess', { rawGuess, trimmedGuess, normalizedGuess, secret_word, normalized_secret });
        if (!trimmedGuess) {
          output.innerText = 'Entrada vacía. Ingresa una letra o palabra válida.';
          output.style.color = 'red';
          focusInput(input);
          return { valid: false };
        }
        if (permitir_palabra && normalizedGuess.length === normalized_secret.length && /^[a-záéíóúüñ]+$/.test(normalizedGuess)) {
          input.value = '';
          return { valid: true, guess: normalizedGuess };
        } else if (normalizedGuess.length === 1 && /^[a-záéíóúüñ]+$/.test(normalizedGuess)) {
          input.value = '';
          return { valid: true, guess: normalizedGuess };
        } else {
          output.innerText = 'Entrada inválida. Ingresa una letra o palabra válida (solo letras, sin caracteres especiales).';
          output.style.color = 'red';
          input.value = '';
          focusInput(input);
          return { valid: false };
        }
      }
      try {
        input.addEventListener('keypress', enterHandler);
      } catch (err) {
        console.error('get_guess: Error attaching input listener', err);
        cleanup();
        reject(new Error('Failed to attach input listener'));
        return;
      }
      // Add a timeout that cleans up the listener
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Input timeout'));
      }, 30000);

      // Also cleanup the timeout if resolved
      const originalResolve = resolve;
      resolve = (value) => {
        clearTimeout(timeoutId);
        cleanup();
        originalResolve(value);
      };
      const originalReject = reject;
      reject = (err) => {
        clearTimeout(timeoutId);
        cleanup();
        originalReject(err);
      };
    });
  } catch (err) {
    console.error('get_guess: Error setting input focus', err);
    throw new Error('Invalid input element');
  }
}

function get_guess_feedback(guess, secret_word, player_score) {
  const feedback = [];
  const secret_norm = normalizar(secret_word);
  const posiciones = {};
  secret_norm.split('').forEach((letra, i) => {
    if (!posiciones[letra]) posiciones[letra] = [];
    posiciones[letra].push(i + 1);
  });
  if (posiciones[guess]) {
    const puntos = secret_norm.split('').filter(l => l === guess).length;
    feedback.push(`Correcto! '${guess}' está en las posiciones: ${posiciones[guess].join(', ')}. (+${puntos} puntos)`);
    feedback.color = 'green';
  } else {
    let texto = `Incorrecto! '${guess}' no está en la palabra.`;
    if (player_score > 0) texto += ` (-${Math.min(1, player_score)} punto)`;
    feedback.push(texto);
    feedback.color = 'red';
  }
  return feedback;
}

async function create_game_ui(mode = null, player1 = null, player2 = null, difficulty = null, gameType = null, sessionId = null) {
  console.log('create_game_ui: Starting, Loaded version 2025-06-23-v9.10-fixed18', { 
    mode, player1, player2, difficulty, gameType, sessionId,
    firebaseConfig: { databaseURL: firebaseConfig.databaseURL, projectId: firebaseConfig.projectId },
    authState: auth ? (auth.currentUser ? 'Authenticated' : 'Unauthenticated') : 'Auth undefined'
  });
  if (isCreatingUI) {
    console.warn('create_game_ui: UI creation already in progress, skipping');
    return null;
  }
  if (isGameActive && !mode) {
    console.warn('create_game_ui: Game already active, skipping reset');
    return null;
  }
  isCreatingUI = true;
  try {
    document.body.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'game-container';
    container.style.textAlign = 'center';
    container.style.fontFamily = 'Arial,, sans-serif';

    const title = document.createElement('h1');
    title.className = 'game-title';
    title.innerText = 'Juego de Adivinar Palabras';

    const prompt = document.createElement('p');
    prompt.className = 'game-prompt';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'game-input';
    input.id = 'game-input';
    input.style.width = '200px';
    input.style.padding = '10px';
    input.style.fontSize = '14px';
    input.style.margin = '5px';

    const button = document.createElement('button');
    button.className = 'game-button';
    button.innerText = 'Enviar';
    button.style.padding = '8px 16px';
    button.style.fontSize = '16px';
    button.style.cursor = 'pointer';
    button.style.margin = '5px';
    button.style.display = 'inline-block';

    const output = document.createElement('span');
    output.className = 'game-output';
    output.style.color = 'black';
    output.style.marginTop = '20px';
    output.style.fontSize = '16px';
    output.style.whiteSpace = 'pre-wrap';
    output.style.display = 'block';

    document.body.appendChild(container);
    container.appendChild(title);
    container.appendChild(prompt);
    container.appendChild(input);
    container.appendChild(button);
    container.appendChild(output);

    if (mode === '2' && gameType === 'remoto' && player1 && player2 && sessionId) {
      console.log('create_game_ui: Using provided parameters', { mode, player1, player2, difficulty, gameType, sessionId });
      prompt.innerText = 'Ingresa una letra o la palabra completa:';
      button.style.display = 'none';
      focusInput(input);
      return { mode, player1, player2, prompt, input, button, output, container, difficulty, gameType, sessionId };
    }

    prompt.innerHTML = 'Ingresa 1 para <strong>un jugador</strong>, 2 para <strong>dos jugadores</strong>, o 3 para <strong>jugador contra IA</strong>:';
    focusInput(input);

    return new Promise(resolve => {
      let selected_mode, selected_player1, selected_player2, selected_difficulty, selected_gameType, selected_sessionId;
      let currentHandler;

      function handleModeInput() {
        const value = input.value.trim();
        console.log('create_game_ui: Mode input:', value);
        if (value === '1' || value === '2' || value === '3') {
          selected_mode = value;
          input.removeEventListener('keypress', currentHandler);

          if (selected_mode === '3') {
            // Step 1: Prompt for difficulty
            prompt.innerText = 'Selecciona dificultad:';
            input.style.display = 'none';
            button.style.display = 'none';

            // Create difficulty buttons
            const diffContainer = document.createElement('div');
            diffContainer.className = 'button-group';
            diffContainer.style.margin = '10px';

            ['Fácil', 'Normal', 'Difícil'].forEach(diff => {
              const diffBtn = document.createElement('button');
              diffBtn.className = 'game-button';
              diffBtn.innerText = diff;
              diffBtn.style.padding = '8px 16px';
              diffBtn.style.fontSize = '14px';
              diffBtn.style.cursor = 'pointer';
              diffBtn.style.margin = '5px';
              diffBtn.onclick = () => {
                selected_difficulty = diff.normalize('NFD').replace(/[\u0300-\u036F]/g, '').toLowerCase();
                // Remove difficulty buttons
                if (diffContainer.parentNode) diffContainer.parentNode.removeChild(diffContainer);
                // Step 2: Prompt for player name
                prompt.innerText = 'Nombre Jugador:';
                input.style.display = 'inline-block';
                button.style.display = 'inline-block';
                input.value = '';
                focusInput(input);
                button.onclick = handlePlayer1IAInput;
                currentHandler = (e) => {
                  if (e.key === 'Enter') button.click();
                };
                input.addEventListener('keypress', currentHandler);

                function handlePlayer1IAInput() {
                  const player1Input = input.value.trim();
                  if (!player1Input) {
                    output.innerText = 'Ingresa un nombre válido.';
                    output.style.color = 'red';
                    input.value = '';
                    focusInput(input);
                    return;
                  }
                  selected_player1 = format_name(player1Input);
                  input.removeEventListener('keypress', currentHandler);
                  button.onclick = null;
                  resolve({
                    mode: selected_mode,
                    player1: selected_player1,
                    player2: 'IA',
                    prompt,
                    input,
                    button,
                    output,
                    container,
                    difficulty: selected_difficulty,
                    gameType: 'local',
                    sessionId: null,
                    players: [selected_player1, 'IA']
                  });
                }
              };
              diffContainer.appendChild(diffBtn);
            });
            container.appendChild(diffContainer);
            return;
          }

          if (selected_mode === '2') {
            if (input.parentNode) container.removeChild(input);
            if (button.parentNode) container.removeChild(button);
            prompt.innerText = 'Escoge tipo de juego:';
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-group';
            buttonContainer.style.margin = '10px';
            ['Local', 'Remoto'].forEach(type => {
              const typeButton = document.createElement('button');
              typeButton.className = 'game-button game-type-button';
              typeButton.innerText = type;
              typeButton.style.padding = '8px 16px';
              typeButton.style.fontSize = '14px';
              typeButton.style.cursor = 'pointer';
              typeButton.style.margin = '5px';
              typeButton.onclick = () => handleGameTypeInput(type.toLowerCase(), buttonContainer);
              buttonContainer.appendChild(typeButton);
            });
            container.appendChild(buttonContainer);
          } else {
            prompt.innerText = 'Nombre Jugador 1:';
            input.value = '';
            focusInput(input);
            button.onclick = handlePlayer1Input;
            currentHandler = (e) => {
              if (e.key === 'Enter') button.click();
            };
            input.addEventListener('keypress', currentHandler);
          }
        } else {
          output.innerText = 'Inválido. Ingresa 1, 2, o 3.';
          output.style.color = 'red';
          input.value = '';
          focusInput(input);
        }
      }

      function handleGameTypeInput(type, buttonContainer) {
        console.log('create_game_ui: Game type selected:', type);
        selected_gameType = type;
        if (buttonContainer.parentNode) container.removeChild(buttonContainer);
        if (!input.parentNode) container.appendChild(input);
        if (!button.parentNode) container.appendChild(button);
        input.removeEventListener('keypress', currentHandler);
        if (selected_gameType === 'remoto') {
          prompt.innerText = '¿Crear juego o unirse? (Ingresa "crear" o "unirse"):';
          input.value = '';
          focusInput(input);
          button.onclick = handleRemoteRoleInput;
          currentHandler = (e) => {
            if (e.key === 'Enter') button.click();
          };
          input.addEventListener('keypress', currentHandler);
        } else {
          prompt.innerText = 'Nombre Jugador 1:';
          input.value = '';
          focusInput(input);
          button.onclick = handlePlayer1LocalInput;
          currentHandler = (e) => {
            if (e.key === 'Enter') button.click();
          };
          input.addEventListener('keypress', currentHandler);

          function handlePlayer1LocalInput() {
            const player1Input = input.value.trim();
            if (!player1Input) {
              output.innerText = 'Ingresa un nombre válido para Jugador 1.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            selected_player1 = format_name(player1Input);
            prompt.innerText = 'Nombre Jugador 2:';
            input.value = '';
            focusInput(input);
            button.onclick = handlePlayer2LocalInput;
            input.removeEventListener('keypress', currentHandler);
            currentHandler = (e) => {
              if (e.key === 'Enter') button.click();
            };
            input.addEventListener('keypress', currentHandler);
          }

          function handlePlayer2LocalInput() {
            const player2Input = input.value.trim();
            if (!player2Input) {
              output.innerText = 'Ingresa un nombre válido para Jugador 2.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            selected_player2 = format_name(player2Input);
            input.removeEventListener('keypress', currentHandler);
            button.onclick = null;
            resolve({
              mode: selected_mode,
              player1: selected_player1,
              player2: selected_player2,
              prompt,
              input,
              button,
              output,
              container,
              difficulty: selected_difficulty,
              gameType: selected_gameType,
              sessionId: selected_sessionId,
              players: [selected_player1, selected_player2]
            });
          }
        }
      }

      async function handleRemoteRoleInput() {
        const value = input.value.trim().toLowerCase();
        console.log('create_game_ui: Remote role input:', value);
        if (value === 'crear') {
          if (!database) {
            console.error('create_game_ui: Firebase database not initialized');
            output.innerText = 'Error: No se pudo conectar con la base de datos. Verifica la configuración de Firebase.';
            output.style.color = 'red';
            input.value = '';
            focusInput(input);
            return;
          }
          selected_sessionId = Math.random().toString(36).substring(2, 12);
          console.log('create_game_ui: Generated session ID:', selected_sessionId);
          if (!selected_sessionId) {
            console.error('create_game_ui: Failed to generate session ID');
            output.innerText = 'Error al generar el ID de sesión. Intenta de nuevo.';
            output.style.color = 'red';
            input.value = '';
            focusInput(input);
            return;
          }
          // Show loading message
          prompt.style.display = 'none';
          input.style.display = 'none';
          button.style.display = 'none';
          output.style.display = 'none';
          const loadingMessage = document.createElement('p');
          loadingMessage.innerText = 'Generando palabra secreta';
          loadingMessage.style.fontSize = '16px';
          loadingMessage.style.color = 'blue';
          loadingMessage.style.margin = '30px';
          container.appendChild(loadingMessage);
          await new Promise(requestAnimationFrame);

          try {
            const secretWord = await get_secret_word();
            if (!secretWord || typeof secretWord !== 'string') {
              console.error('create_game_ui: Invalid secretWord:', secretWord);
              output.innerText = 'Error: Palabra secreta inválida. Intenta de nuevo.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            console.log('Initial state setup:', { selected_mode, selected_gameType, secretWord });
            if (typeof selected_mode !== 'string' || typeof selected_gameType !== 'string') {
              console.error('Invalid mode or gameType:', { selected_mode, selected_gameType });
              output.innerText = 'Error: Modo o tipo de juego inválido. Intenta de nuevo.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            let attempts = 5;
            let success = false;
            const sessionRef = ref(database, `games/${selected_sessionId}`);
            while (attempts--) {
              try {
                const snapshot = await get(sessionRef);
                if (snapshot.exists()) {
                  console.warn('create_game_ui: Session ID collision', selected_sessionId);
                  selected_sessionId = Math.random().toString(36).substring(2, 12);
                  continue;
                }
                const initialState = {
                  status: 'waiting',
                  player1: '',
                  player2: '',
                  mode: selected_mode,
                  gameType: selected_gameType,
                  secretWord,
                  guessedLetters: [], // <-- use empty array, not ['__init__']
                  tries: { init: null },
                  scores: { init: null },
                  currentPlayer: 'none',
                  initialized: true
                };
                console.log('create_game_ui: Attempting to set initial state', { 
                  sessionId: selected_sessionId, 
                  initialState, 
                  authState: auth ? (auth.currentUser ? 'Authenticated' : 'Unauthenticated') : 'Auth undefined'
                });
                await set(sessionRef, initialState);
                let validationAttempts = 3;
                let createdState;
                while (validationAttempts--) {
                  await delay(1000); // Reduced delay
                  const createdSnapshot = await get(sessionRef);
                  createdState = createdSnapshot.val();
                  console.log('Raw Firebase response:', JSON.stringify(createdState, null, 2));
                  console.log('create_game_ui: Retrieved state after set', { sessionId: selected_sessionId, createdState });
                  if (createdState && createdState.secretWord && createdState.initialized) {
                    // Fix missing or incorrect fields
                    let needsUpdate = false;
                    const updates = {};
                    if (!Array.isArray(createdState.guessedLetters) || createdState.guessedLetters.length === 0) {
                      updates.guessedLetters = ['__init__'];
                      needsUpdate = true;
                    }
                    if (!createdState.tries || typeof createdState.tries !== 'object' || createdState.tries === null) {
                      updates.tries = { init: null };
                      needsUpdate = true;
                    }
                    if (!createdState.scores || typeof createdState.scores !== 'object' || createdState.scores === null) {
                      updates.scores = { init: null };
                      needsUpdate = true;
                    }
                    if (createdState.currentPlayer === undefined || createdState.currentPlayer === null) {
                      updates.currentPlayer = 'none';
                      needsUpdate = true;
                    }
                    if (needsUpdate) {
                      console.log('create_game_ui: Correcting missing fields for session', selected_sessionId);
                      await update(sessionRef, updates);
                      console.log('create_game_ui: Corrected missing fields for session', selected_sessionId);
                      await delay(1000);
                      const finalSnapshot = await get(sessionRef);
                      createdState = finalSnapshot.val();
                    }
                    if (createdState && createdState.secretWord && createdState.initialized && Array.isArray(createdState.guessedLetters)) {
                      break;
                    }
                  }
                  console.warn('create_game_ui: Validation attempt failed', {
                    attempt: 3 - validationAttempts,
                    hasSecretWord: !!createdState?.secretWord,
                    hasInitialized: !!createdState?.initialized,
                    guessedLettersType: createdState?.guessedLetters == null ? 'null/undefined' : typeof createdState.guessedLetters,
                    hasTries: createdState?.tries != null,
                    hasScores: createdState?.scores != null,
                    hasCurrentPlayer: createdState?.currentPlayer != null,
                    status: createdState?.status
                  });
                }
                if (!createdState || !createdState.secretWord || !createdState.initialized || !Array.isArray(createdState.guessedLetters)) {
                  console.error('create_game_ui: Invalid state after set', { 
                    createdState, 
                    hasSecretWord: !!createdState?.secretWord,
                    hasInitialized: !!createdState?.initialized,
                    guessedLettersType: createdState?.guessedLetters == null ? 'null/undefined' : typeof createdState.guessedLetters,
                    hasTries: createdState?.tries != null,
                    hasScores: createdState?.scores != null,
                    hasCurrentPlayer: createdState?.currentPlayer != null,
                    status: createdState?.status
                  });
                  try {
                    await remove(sessionRef);
                    console.log('create_game_ui: Cleaned up invalid session', selected_sessionId);
                  } catch (cleanupError) {
                    console.warn('create_game_ui: Failed to clean up invalid session', cleanupError);
                  }
                  throw new Error('Failed to validate session state');
                }
                console.log('create_game_ui: Firebase session created', { sessionId: selected_sessionId, secretWord, createdState });
                success = true;
                break;
              } catch (error) {
                console.warn(`create_game_ui: Retry ${5 - attempts}/5 for Firebase set`, error);
                if (error.code === 'PERMISSION_DENIED' || error.message.includes('permission_denied')) {
                  console.error('create_game_ui: Permission denied, check Firebase rules and database URL', {
                    databaseURL: firebaseConfig.databaseURL,
                    projectId: firebaseConfig.projectId,
                    authState: auth ? (auth.currentUser ? 'Authenticated' : 'Unauthenticated') : 'Auth undefined'
                  });
                  output.innerText = 'Error: Permiso denegado. Verifica las reglas de Firebase en el proyecto correcto.';
                  output.style.color = 'red';
                  input.value = '';
                  focusInput(input);
                  return;
                }
                await delay(1000);
              }
            }
            if (!success) {
              console.error('create_game_ui: Failed to create Firebase session after retries');
              output.innerText = 'Error al crear la sesión de juego. Intenta de nuevo o verifica la conexión a Firebase.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            prompt.innerText = `Nombre Jugador 1 (ID de sesión: ${selected_sessionId}):`;
            input.value = '';
            focusInput(input);
            input.removeEventListener('keypress', currentHandler);
            button.onclick = () => handlePlayer1Input();
            currentHandler = (e) => {
              if (e.key === 'Enter') button.click();
            };
            input.addEventListener('keypress', currentHandler);
          } catch (error) {
            console.error('create_game_ui: Error creating game session:', error);
            output.innerText = error.message.includes('permission_denied')
              ? 'Error: Permiso denegado. Verifica las reglas de Firebase en el proyecto correcto.'
              : 'Error al crear la sesión de juego. Intenta de nuevo.';
            output.style.color = 'red';
            input.value = '';
            focusInput(input);
          } finally {
            // Remove loading message and restore UI for player name input
            if (loadingMessage && loadingMessage.parentNode) {
              container.removeChild(loadingMessage);
            }
            prompt.style.display = '';
            input.style.display = '';
            button.style.display = '';
            output.style.display = '';
          }
        } else if (value === 'unirse') {
          console.log('create_game_ui: Prompting for session ID');
          prompt.innerText = 'Ingresa el ID de sesión:';
          input.value = '';
          focusInput(input);
          input.removeEventListener('keypress', currentHandler);
          button.onclick = handleSessionIdInput;
          currentHandler = (e) => {
            if (e.key === 'Enter') button.click();
          };
          input.addEventListener('keypress', currentHandler);
        } else {
          console.warn('create_game_ui: Invalid remote role input:', value);
          output.innerText = 'Entrada inválida. Ingresa "crear" o "unirse".';
          output.style.color = 'red';
          input.value = '';
          focusInput(input);
        }
      }

      async function handlePlayer1Input() {
        const player1Input = input.value.trim();
        console.log('create_game_ui: Player 1 input:', player1Input);
        if (!player1Input) {
          output.innerText = 'Ingresa un nombre válido para Jugador 1.';
          output.style.color = 'red';
          input.value = '';
          focusInput(input);
          return;
        }
        selected_player1 = format_name(player1Input) || player1Input.charAt(0).toUpperCase() + player1Input.slice(1).toLowerCase();
        console.log('create_game_ui: Formatted Player 1 name:', selected_player1);

        // Only check sessionId for remote mode
        if (selected_mode === '2' && selected_gameType === 'remoto') {
          if (!selected_sessionId) {
            console.error('create_game_ui: selected_sessionId is undefined in handlePlayer1Input');
            output.innerText = 'Error: ID de sesión no definido. Intenta de nuevo.';
            output.style.color = 'red';
            input.value = '';
            focusInput(input);
            return;
          }
          try {
            let attempts = 5;
            let success = false;
            const sessionRef = ref(database, `games/${selected_sessionId}`);
            while (attempts--) {
              try {
                const snapshot = await get(sessionRef);
                if (!snapshot.exists() || !snapshot.val().secretWord) {
                  console.error('create_game_ui: Invalid session for player1 update', selected_sessionId, snapshot.val());
                  throw new Error('Invalid session state');
                }
                await update(sessionRef, {
                  player1: selected_player1,
                  status: 'waiting_for_player2',
                  currentPlayer: selected_player1,
                  guessedLetters: snapshot.val().guessedLetters || [],
                  tries: snapshot.val().tries || {},
                  scores: snapshot.val().scores || {}
                });
                console.log('create_game_ui: Firebase updated with player1', { sessionId: selected_sessionId, player1: selected_player1, state: (await get(sessionRef)).val() });
                success = true;
                break;
              } catch (error) {
                console.warn(`create_game_ui: Retry ${5 - attempts}/5 for player1 update`, error);
                if (error.code === 'PERMISSION_DENIED' || error.message.includes('permission_denied')) {
                  console.error('create_game_ui: Permission denied for player1 update');
                  output.innerText = 'Error: Permiso denegado al registrar Jugador 1. Verifica las reglas de Firebase.';
                  output.style.color = 'red';
                  input.value = '';
                  focusInput(input);
                  return;
                }
                await delay(1000);
              }
            }
            if (!success) {
              console.error('create_game_ui: Failed to update player1 in Firebase');
              output.innerText = 'Error al registrar el Jugador 1. Intenta de nuevo.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            prompt.innerText = 'Esperando a que otro jugador se una...';
            output.innerText = `ID de sesión: ${selected_sessionId}`;
            output.style.color = 'black';
            input.style.display = 'none';
            button.style.display = 'none';
            let timeoutId;
            const unsubscribe = onValue(sessionRef, async (snapshot) => {
              const game = snapshot.val();
              console.log('handlePlayer1Input: Snapshot received', game);
              if (!snapshot.exists()) {
                console.warn('handlePlayer1Input: Game session deleted');
                clearTimeout(timeoutId);
                output.innerText = 'Sesión terminada. Intenta crear un nuevo juego.';
                output.style.color = 'red';
                input.style.display = 'inline-block';
                button.style.display = 'inline-block';
                input.value = '';
                focusInput(input);
                button.onclick = () => main();
                unsubscribe();
                return;
              }
              if (game && game.player2 && game.status === 'playing' && game.secretWord && Array.isArray(game.guessedLetters)) {
                console.log('handlePlayer1Input: Player 2 joined', game.player2);
                selected_player2 = game.player2;
                clearTimeout(timeoutId);
                input.removeEventListener('keypress', currentHandler);
                input.style.display = 'inline-block';
                focusInput(input);
                unsubscribe();
                resolve({
                  mode: selected_mode,
                  player1: selected_player1,
                  player2: selected_player2,
                  prompt,
                  input,
                  button,
                  output,
                  container,
                  difficulty: selected_difficulty,
                  gameType: selected_gameType,
                  sessionId: selected_sessionId
                });
              }
            }, (error) => {
              console.error('handlePlayer1Input: Firebase snapshot error', error);
              output.innerText = error.message.includes('permission_denied')
                ? 'Error: Permiso denegado en la sincronización. Verifica las reglas de Firebase.'
                : 'Error de sincronización. Intenta de nuevo.';
              output.style.color = 'red';
              input.style.display = 'inline-block';
              button.style.display = 'inline-block';
              input.value = '';
              focusInput(input);
              button.onclick = () => main();
              clearTimeout(timeoutId);
              unsubscribe();
            });
            timeoutId = setTimeout(async () => {
              if (prompt.innerText.includes('Esperando')) {
                const snapshot = await get(sessionRef);
                if (snapshot.exists() && snapshot.val().player2) {
                  console.log('handlePlayer1Input: Player 2 joined, skipping cleanup');
                  return;
                }
                console.warn('handlePlayer1Input: Timeout waiting for Player 2');
                output.innerText = 'Tiempo de espera agotado. Intenta crear un nuevo juego.';
                output.style.color = 'red';
                input.style.display = 'inline-block';
                button.style.display = 'inline-block';
                input.value = '';
                focusInput(input);
                button.onclick = () => main();
                try {
                  await remove(sessionRef);
                  console.log('handlePlayer1Input: Cleaned up Firebase session', selected_sessionId);
                } catch (err) {
                  console.error('handlePlayer1Input: Error cleaning up Firebase session', err);
                }
                unsubscribe();
              }
            }, 60000);
          } catch (error) {
            console.error('create_game_ui: Error updating player 1 in Firebase:', error);
            output.innerText = error.message.includes('permission_denied')
              ? 'Error: Permiso denegado al registrar Jugador 1. Verifica las reglas de Firebase.'
              : 'Error al registrar el Jugador 1. Intenta de nuevo.';
            output.style.color = 'red';
            input.value = '';
            input.style.display = 'inline-block';
            button.style.display = 'inline-block';
            focusInput(input);
          }
        } else if (selected_mode === '1') {
          // Local/single player or IA: just resolve!
          resolve({
            mode: selected_mode,
            player1: selected_player1,
            prompt,
            input,
            button,
            output,
            container,
            difficulty: selected_difficulty,
            gameType: selected_gameType,
            sessionId: selected_sessionId,
            players: [selected_player1]
          });
        }
      }

      async function handleSessionIdInput() {
        const sessionId = input.value.trim().toLowerCase();
        console.log('create_game_ui: Session ID input:', sessionId);
        if (!sessionId) {
          console.warn('create_game_ui: Empty session ID');
          output.innerText = 'Ingresa un ID de sesión válido.';
          output.style.color = 'red';
          input.value = '';
          focusInput(input);
          return;
        }
        try {
          const sessionRef = ref(database, `games/${sessionId}`);
          let attempts = 3;
          let sessionState = null;
          while (attempts--) {
            const snapshot = await get(sessionRef);
            if (!snapshot.exists()) {
              console.warn('create_game_ui: Session not found', sessionId);
              output.innerText = 'ID de sesión no encontrado. Verifica el ID e intenta de nuevo.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            sessionState = snapshot.val();
            console.log('create_game_ui: Retrieved session state', sessionState);
            if (sessionState.status !== 'waiting' && sessionState.status !== 'waiting_for_player2') {
              console.warn('create_game_ui: Session not in waiting state', { sessionId, status: sessionState.status });
              output.innerText = 'La sesión no está disponible para unirse.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            if (sessionState.player2) {
              console.warn('create_game_ui: Session already has Player 2', sessionId);
              output.innerText = 'La sesión ya tiene un segundo jugador.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            if (!sessionState.secretWord || !sessionState.initialized) {
              console.warn('create_game_ui: Invalid session state', { sessionId, sessionState });
              output.innerText = 'La sesión tiene un estado inválido. Intenta con otro ID.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            // Fix missing fields
            if (!Array.isArray(sessionState.guessedLetters) || !sessionState.tries || !sessionState.scores || sessionState.currentPlayer === undefined) {
              console.log('create_game_ui: Correcting missing fields for session', sessionId);
              await update(sessionRef, {
                guessedLetters: Array.isArray(sessionState.guessedLetters) ? sessionState.guessedLetters.filter(l => l !== '__init__') : [],
                tries: typeof sessionState.tries === 'object' && sessionState.tries !== null ? sessionState.tries : {},
                scores: typeof sessionState.scores === 'object' && sessionState.scores !== null ? sessionState.scores : {},
                currentPlayer: sessionState.currentPlayer !== undefined ? sessionState.currentPlayer : null
              });
              console.log('create_game_ui: Corrected missing fields for session', sessionId);
              await delay(1000);
              const finalSnapshot = await get(sessionRef);
              sessionState = finalSnapshot.val();
            }
            break;
          }
          if (!sessionState) {
            console.error('create_game_ui: Failed to retrieve valid session state after retries');
            output.innerText = 'Error al verificar la sesión. Intenta de nuevo.';
            output.style.color = 'red';
            input.value = '';
            focusInput(input);
            return;
          }
          selected_sessionId = sessionId;
          selected_player1 = sessionState.player1 || null;
          prompt.innerText = 'Nombre Jugador 2:';
          input.value = '';
          focusInput(input);
          input.removeEventListener('keypress', currentHandler);
          button.onclick = handlePlayer2Input;
          currentHandler = (e) => {
            if (e.key === 'Enter') button.click();
          };
          input.addEventListener('keypress', currentHandler);
        } catch (error) {
          console.error('create_game_ui: Error checking session ID:', error);
          output.innerText = error.message.includes('permission_denied')
            ? 'Error: Permiso denegado. Verifica las reglas de Firebase.'
            : 'Error al verificar el ID de sesión. Intenta de nuevo.';
          output.style.color = 'red';
          input.value = '';
          focusInput(input);
        }
      }

      async function handlePlayer2Input() {
        const player2Input = input.value.trim();
        console.log('create_game_ui: Player 2 input:', player2Input);
        if (!player2Input) {
          console.warn('create_game_ui: Empty Player 2 name');
          output.innerText = 'Ingresa un nombre válido para Jugador 2.';
          output.style.color = 'red';
          input.value = '';
          focusInput(input);
          return;
        }
        selected_player2 = format_name(player2Input) || player2Input.charAt(0).toUpperCase() + player2Input.slice(1).toLowerCase();
        console.log('create_game_ui: Formatted Player 2 name:', selected_player2);
        if (!selected_sessionId) {
          console.error('create_game_ui: selected_sessionId is undefined in handlePlayer2Input');
          output.innerText = 'Error: ID de sesión no definido.';
          output.style.color = 'red';
          input.value = '';
          focusInput(input);
          return;
        }
        if (selected_gameType !== 'remoto') {
          console.error('create_game_ui: Invalid gameType for Player 2', selected_gameType);
          output.innerText = 'Error: Tipo de juego no válido. Intenta de nuevo.';
          output.style.color = 'red';
          input.value = '';
          focusInput(input);
          return;
        }
        try {
          const sessionRef = ref(database, `games/${selected_sessionId}`);
          let attempts = 5;
          let sessionState = null;
          while (attempts--) {
            const snapshot = await get(sessionRef);
            if (!snapshot.exists()) {
              console.warn('create_game_ui: Session not found during Player 2 join', selected_sessionId);
              output.innerText = 'Sesión no encontrada. Intenta de nuevo.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            sessionState = snapshot.val();
            if (!sessionState.secretWord || !sessionState.initialized) {
              console.warn('create_game_ui: Invalid session state for Player 2', sessionState);
              output.innerText = 'La sesión tiene un estado inválido. Intenta con otro ID.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            if (sessionState.status !== 'waiting' && sessionState.status !== 'waiting_for_player2') {
              console.warn('create_game_ui: Session not in waiting state', { sessionId: selected_sessionId, status: sessionState.status });
              output.innerText = 'La sesión no está disponible para unirse.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            if (sessionState.player2) {
              console.warn('create_game_ui: Session already has Player 2', selected_sessionId);
              output.innerText = 'La sesión ya tiene un segundo jugador.';
              output.style.color = 'red';
              input.value = '';
              focusInput(input);
              return;
            }
            break;
          }
          if (!sessionState) {
            console.error('create_game_ui: Failed to retrieve valid session state for Player 2 after retries');
            output.innerText = 'Error al verificar la sesión. Intenta de nuevo.';
            output.style.color = 'red';
            input.value = '';
            focusInput(input);
            return;
          }
          let success = false;
          attempts = 5;
          while (attempts--) {
            try {
              // Ensure guessedLetters is always an array
              if (!Array.isArray(sessionState.guessedLetters)) {
                sessionState.guessedLetters = [];
              }
              const triesValue = Math.max(1, Math.floor(sessionState.secretWord.length / 2));
              if (!sessionState.player1 || typeof sessionState.player1 !== 'string' || !sessionState.player1.trim()) {
                throw new Error('Player 1 name missing or invalid in session state!');
              }
              const updateData = {
                player2: selected_player2,
                status: 'playing',
                currentPlayer: sessionState.player1,
                tries: {
                  [sessionState.player1]: triesValue,
                  [selected_player2]: triesValue
                },
                scores: {
                  [sessionState.player1]: sessionState.scores?.[sessionState.player1] || 0,
                  [selected_player2]: 0
                },
                guessedLetters: []
              };
              await update(sessionRef, updateData);
              console.log('handlePlayer2Input: Updated Firebase with player2', { 
                sessionId: selected_sessionId, 
                player2: selected_player2, 
                state: (await get(sessionRef)).val() 
              });
              success = true;
              break;
            } catch (error) {
              console.warn(`handlePlayer2Input: Retry ${5 - attempts}/5 for Firebase update`, error);
              if (error.code === 'PERMISSION_DENIED' || error.message.includes('permission_denied')) {
                console.error('create_game_ui: Permission denied for player2 update', {
                  databaseURL: firebaseConfig.databaseURL,
                  projectId: firebaseConfig.projectId,
                  authState: auth ? (auth.currentUser ? 'Authenticated' : 'Unauthenticated') : 'Auth undefined'
                });
                output.innerText = 'Error: Permiso denegado al registrar Jugador 2. Verifica las reglas de Firebase.';
                output.style.color = 'red';
                input.value = '';
                focusInput(input);
                return;
              }
              await delay(1000);
            }
          }
          if (!success) {
            console.error('handlePlayer2Input: Failed to update Firebase after retries');
            output.innerText = 'Error al registrar el Jugador 2. Intenta de nuevo.';
            output.style.color = 'red';
            input.value = '';
            focusInput(input);
            return;
          }
          output.innerText = `Unido al juego con ID: ${selected_sessionId}`;
          output.style.color = 'black';
          input.value = '';
          input.removeEventListener('keypress', currentHandler);
          prompt.innerText = 'Ingresa una letra o la palabra completa:';
          button.style.display = 'none';
          focusInput(input);
          console.log('handlePlayer2Input: Resolving with', { 
            mode: selected_mode, 
            player1: sessionState.player1, 
            player2: selected_player2, 
            gameType: selected_gameType, 
            sessionId: selected_sessionId 
          });
          resolve({ 
            mode: selected_mode, 
            player1: sessionState.player1, 
            player2: selected_player2, 
            prompt, 
            input, 
            button, 
            output, 
            container, 
            difficulty: selected_difficulty, 
            gameType: selected_gameType, 
            sessionId: selected_sessionId,
            secretWord: sessionState.secretWord // <-- pass the word from Firebase!
          });
        } catch (error) {
          console.error('create_game_ui: Error updating player 2 in Firebase:', error);
          output.innerText = error.message.includes('permission_denied')
            ? 'Error: Permiso denegado al registrar Jugador 2. Verifica las reglas de Firebase.'
            : 'Error al registrar el Jugador 2. Intenta de nuevo.';
          output.style.color = 'red';
          input.value = '';
          focusInput(input);
        }
      }

      currentHandler = (e) => {
        if (e.key === 'Enter') button.click();
      };
      button.onclick = handleModeInput;
      input.addEventListener('keypress', currentHandler);
      focusInput(input);
    });
  } finally {
    isCreatingUI = false;
    console.log('create_game_ui: UI creation completed');
  }
}

async function start_game(mode, players, output, container, prompt, input, button, difficulty = null, games_played = 0, total_scores = null, wins = null, gameType = null, sessionId = null) {
  console.log('start_game: Loaded version 2025-06-17-v9.11', { mode, players, difficulty, games_played, gameType, sessionId });
  isGameActive = true;
  try {
    if (!players || players.some(p => !p)) {
      output.innerText = 'Error: Jugadores no definidos.';
      console.error('start_game: Invalid players');
      return;
    }
    if (!container || !prompt || !output || !input || !button) {
      console.error('start_game: Missing required DOM elements', { container, prompt, output, input, button });
      output.innerText = 'Error: Elementos de interfaz no definidos.';
      return;
    }
    if (mode === '3' && !['facil', 'normal', 'dificil', null].includes(difficulty)) {
      console.error('start_game: Invalid difficulty', difficulty);
      output.innerText = 'Error: Dificultad inválida.';
      return;
    }
    const games_to_play = mode === '1' ? 1 : 3;
    const accumulated_scores = total_scores || Object.fromEntries(players.map(p => [p, 0]));
    const accumulated_wins = wins || Object.fromEntries(players.map(p => [p, 0]));
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Only fetch the secret word here, no UI logic
    const secret_word = await get_secret_word();

    await play_game(
      null, // loadingMessage is now handled inside play_game
      secret_word,
      mode,
      players,
      output,
      container,
      prompt,
      input,
      button,
      difficulty,
      games_played,
      games_to_play,
      accumulated_scores,
      accumulated_wins,
      delay,
      display_feedback,
      gameType,
      sessionId
    );
    console.log('start_game: Game completed', { games_played, games_to_play, total_scores: accumulated_scores, wins: accumulated_wins });
  } catch (err) {
    console.error('start_game: Outer error', err);
    output.innerText = 'Error crítico al iniciar el juego.';
  } finally {
    isGameActive = false;
  }
}

// Revised process_guess function
async function process_guess(player, guessed_letters, secret_word, tries, scores, lastCorrectWasVowel, used_wrong_letters, used_wrong_words, vowels, max_score, difficulty, mode, prompt, input, output, button, delay, display_feedback) {
  console.log('process_guess: Starting for', player, {
    max_score,
    score: scores[player] || 0,
    guessed_letters: Array.from(guessed_letters),
    retried: 0,
    difficulty
  });
  // Validate DOM elements
  if (!prompt || !input || !output || !button || !prompt.parentNode || !input.parentNode || !output.parentNode || !button.parentNode) {
    console.error('process_guess: Missing or detached DOM elements', { prompt, input, output, button });
    output.innerText = 'Error: Elementos de interfaz no disponibles.';
    return { guess: null, valid: false };
  }
  let guess;
  try {
    if (player === 'IA') {
      const mustBeConsonant = lastCorrectWasVowel;
      guess = await get_ai_guess(guessed_letters, secret_word, used_wrong_letters, used_wrong_words, mustBeConsonant, difficulty);
      await delay(1000); // Simulate thinking time
      console.log('process_guess: AI guess', { guess, player });
    } else {
      guess = await get_guess(guessed_letters, secret_word, prompt, input, output, button);
      console.log('process_guess: Player guess', { guess, player });
    }
    // Validate guess
    if (!guess || typeof guess !== 'string' || guess === '__init__') {
      console.warn('process_guess: Invalid guess', { guess, player });
      output.innerText = 'Entrada inválida. Intenta de nuevo.';
      output.style.color = 'red';
      return { guess: null, valid: false };
    }
    const normalized_guess = normalizar(guess);
    const normalized_secret = normalizar(secret_word);
    // Check if guess is a letter or word
    if (normalized_guess.length === 1) {
      if (guessed_letters.has(normalized_guess) || used_wrong_letters.has(normalized_guess)) {
        console.log('process_guess: Already guessed letter', normalized_guess);
        display_feedback(`${player}: La letra '${normalized_guess}' ya fue adivinada.`, 'red', player);
        return { guess: normalized_guess, valid: false };
      }
      const feedback = get_guess_feedback(normalized_guess, secret_word, scores[player]);
      guessed_letters.add(normalized_guess);
      if (feedback[0].startsWith('Correcto')) {
        const points = normalized_secret.split('').filter(l => l === normalized_guess).length;
        scores[player] = (scores[player] || 0) + points;
        display_feedback(feedback[0], feedback.color, player);
        lastCorrectWasVowel = vowels.has(normalized_guess);
      } else {
        used_wrong_letters.add(normalized_guess);
        tries[player] = Math.max(0, (tries[player] || 0) - 1);
        scores[player] = Math.max(0, (scores[player] || 0) - 1);
        display_feedback(feedback[0], feedback.color, player);
        lastCorrectWasVowel = false;
      }
      console.log('process_guess: After letter guess', {
        player,
        guess: normalized_guess,
        tries: tries[player],
        score: scores[player],
        lastCorrectWasVowel
      });
    } else if (normalized_guess.length === normalized_secret.length) {
      if (used_wrong_words.has(normalized_guess)) {
        console.log('process_guess: Already guessed word', normalized_guess);
        display_feedback(`${player}: La palabra '${guess}' ya fue adivinada.`, 'red', player);
        return { guess: normalized_guess, valid: false };
      }
      if (normalized_guess === normalized_secret) {
        scores[player] = (scores[player] || 0) + max_score;
        display_feedback(`${player}: ¡Correcto! La palabra es '${secret_word}'. (+${max_score} puntos)`, 'green', player);
        console.log('process_guess: Word guessed correctly', { guess, player, score: scores[player] });
        return { guess: normalized_guess, valid: true, wordGuessed: true };
      } else {
        used_wrong_words.add(normalized_guess);
        tries[player] = Math.max(0, (tries[player] || 0) - 1);
        scores[player] = Math.max(0, (scores[player] || 0) - 1);
        let texto = `${player}: Incorrecto. '${guess}' no es la palabra.`;
        if (scores[player] > 0) texto += ` (-1 punto)`;
        display_feedback(texto, 'red', player);
        console.log('process_guess: Incorrect word guess', { guess, player, tries: tries[player], score: scores[player] });
      }
    } else {
      display_feedback(`${player}: Entrada inválida. Ingresa una letra o la palabra completa.`, 'red', player);
      return { guess: normalized_guess, valid: false };
    }
    return { guess: normalized_guess, valid: true, wordGuessed: false };
  } catch (err) {
    console.error('process_guess: Error', err);
    display_feedback(`${player}: Error procesando la adivinanza.`, 'red', player);
    return { guess: null, valid: false };
  }
}

async function play_game(loadingMessage, secret_word, mode, players, output, container, prompt, input, button, difficulty, games_played, games_to_play, total_scores, wins, delay, display_feedback, gameType, sessionId) {
  console.log('play_game: Starting game', {
    mode,
    players,
    secret_word,
    difficulty,
    games_played,
    games_to_play,
    gameType,
    sessionId
  });
  // Remove loading message if it exists
  if (loadingMessage && loadingMessage.parentNode) {
    container.removeChild(loadingMessage);
  }
  if (!prompt || !input || !output || !button || !container) {
    console.error('play_game: Missing DOM elements', { prompt, input, output, button, container });
    output.innerText = 'Error: Elementos de interfaz no disponibles.';
    return;
  }
  const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
  const normalized_secret = normalizar(secret_word);
  const max_score = Math.max(5, Math.floor(normalized_secret.length * 1.5));
  let tries = Object.fromEntries(players.map(p => [p, Math.max(1, Math.floor(secret_word.length / 2))]));
  let scores = Object.fromEntries(players.map(p => [p, 0]));
  let guessed_letters = new Set();
  let used_wrong_letters = new Set();
  let used_wrong_words = new Set();
  let lastCorrectWasVowel = false;
  let currentPlayerIndex = 0;
  let winner = null;

  // Firebase state for remote games
  let sessionRef = null;
  let unsubscribe = null;
  if (gameType === 'remoto' && sessionId) {
    sessionRef = ref(database, `games/${sessionId}`);
    try {
      const snapshot = await get(sessionRef);
      if (snapshot.exists()) {
        const gameState = snapshot.val();
        console.log('play_game: Loaded Firebase state', gameState);
        if (gameState.scores && typeof gameState.scores === 'object') {
          scores = { ...gameState.scores };
          delete scores.init;
        }
        if (gameState.tries && typeof gameState.tries === 'object') {
          tries = { ...gameState.tries };
          delete tries.init;
        }
        if (Array.isArray(gameState.guessedLetters)) {
          guessed_letters = new Set(gameState.guessedLetters.filter(l => l !== '__init__'));
        }
        if (Array.isArray(gameState.usedWrongLetters)) {
          used_wrong_letters = new Set(gameState.usedWrongLetters);
        }
        if (Array.isArray(gameState.usedWrongWords)) {
          used_wrong_words = new Set(gameState.usedWrongWords);
        }
        currentPlayerIndex = players.indexOf(gameState.currentPlayer) >= 0 ? players.indexOf(gameState.currentPlayer) : 0;
      }
    } catch (error) {
      console.error('play_game: Error loading Firebase state', error);
      output.innerText = error.message.includes('permission_denied')
        ? 'Error: Permiso denegado. Verifica las reglas de Firebase.'
        : 'Error al cargar el estado del juego. Intenta de nuevo.';
      output.style.color = 'red';
      return;
    }
  }

  const updateGameState = async (force = false) => {
    if (gameType !== 'remoto' || !sessionRef) return;
    try {
      const currentState = {
        guessedLetters: Array.from(guessed_letters),
        usedWrongLetters: Array.from(used_wrong_letters),
        usedWrongWords: Array.from(used_wrong_words),
        tries,
        scores,
        currentPlayer: players[currentPlayerIndex],
        status: 'playing'
      };
      console.log('updateGameState: Updating Firebase', { sessionId, currentState });
      await update(sessionRef, currentState);
    } catch (error) {
      console.error('updateGameState: Error updating Firebase', error);
      output.innerText = error.message.includes('permission_denied')
        ? 'Error: Permiso denegado al actualizar el estado. Verifica las reglas de Firebase.'
        : 'Error al actualizar el estado del juego.';
      output.style.color = 'red';
    }
  };

  // Display initial game state
  const progreso = normalized_secret.split('').map(l => guessed_letters.has(l) ? l : '_');
  display_feedback(`${formato_palabra(progreso)}\n${players.map(p => `${p}: ${scores[p] || 0} puntos, ${tries[p] || 0} intentos`).join('\n')}`, 'black', null, false);

  // Main game loop
  while (!winner && tries[players[currentPlayerIndex]] > 0) {
    const player = players[currentPlayerIndex];
    console.log('play_game: Turn for', player, { tries: tries[player], score: scores[player] });
    let isPlayerTurn = true;

    if (gameType === 'remoto' && sessionId) {
      const snapshot = await get(sessionRef);
      const gameState = snapshot.val();
      console.log('play_game: Checking Firebase state', gameState);
      if (!snapshot.exists() || gameState.status === 'ended') {
        console.warn('play_game: Game session ended or deleted');
        output.innerText = 'El juego ha sido terminado por el otro jugador.';
        output.style.color = 'red';
        return;
      }
      if (gameState.currentPlayer !== player) {
        isPlayerTurn = false;
        output.innerText = `Esperando el turno de ${gameState.currentPlayer}...`;
        output.style.color = 'blue';
        prompt.style.display = 'none';
        input.style.display = 'none';
        button.style.display = 'none';
        await new Promise(resolve => {
          unsubscribe = onValue(sessionRef, async (snapshot) => {
            const updatedState = snapshot.val();
            console.log('play_game: Firebase snapshot', updatedState);
            if (!snapshot.exists()) {
              console.warn('play_game: Game session deleted');
              output.innerText = 'Sesión terminada. Intenta crear un nuevo juego.';
              output.style.color = 'red';
              prompt.style.display = 'inline-block';
              input.style.display = 'inline-block';
              button.style.display = 'inline-block';
              button.onclick = () => main();
              unsubscribe();
              resolve();
              return;
            }
            if (updatedState.currentPlayer === player) {
              console.log('play_game: Turn changed to', player);
              // Sync state
              if (updatedState.scores && typeof updatedState.scores === 'object') {
                scores = { ...updatedState.scores };
                delete scores.init;
              }
              if (updatedState.tries && typeof updatedState.tries === 'object') {
                tries = { ...updatedState.tries };
                delete tries.init;
              }
              if (Array.isArray(updatedState.guessedLetters)) {
                guessed_letters = new Set(updatedState.guessedLetters.filter(l => l !== '__init__'));
              }
              if (Array.isArray(updatedState.usedWrongLetters)) {
                used_wrong_letters = new Set(updatedState.usedWrongLetters);
              }
              if (Array.isArray(updatedState.usedWrongWords)) {
                used_wrong_words = new Set(updatedState.usedWrongWords);
              }
              const progreso = normalized_secret.split('').map(l => guessed_letters.has(l) ? l : '_');
              display_feedback(`${formato_palabra(progreso)}\n${players.map(p => `${p}: ${scores[p] || 0} puntos, ${tries[p] || 0} intentos`).join('\n')}`, 'black', null, false);
              prompt.style.display = 'inline-block';
              input.style.display = 'inline-block';
              button.style.display = 'none';
              focusInput(input);
              unsubscribe();
              resolve();
            }
          }, (error) => {
            console.error('play_game: Firebase snapshot error', error);
            output.innerText = error.message.includes('permission_denied')
              ? 'Error: Permiso denegado en la sincronización. Verifica las reglas de Firebase.'
              : 'Error de sincronización. Intenta de nuevo.';
            output.style.color = 'red';
            prompt.style.display = 'inline-block';
            input.style.display = 'inline-block';
            button.style.display = 'inline-block';
            button.onclick = () => main();
            unsubscribe();
            resolve();
          });
        });
        if (!isPlayerTurn) continue;
      }
    }

    const result = await process_guess(
      player,
      guessed_letters,
      secret_word,
      tries,
      scores,
      lastCorrectWasVowel,
      used_wrong_letters,
      used_wrong_words,
      vowels,
      max_score,
      difficulty,
      mode,
      prompt,
      input,
      output,
      button,
      delay,
      display_feedback
    );

    if (!result.valid) {
      console.log('play_game: Invalid guess, continuing turn', { player, guess: result.guess });
      continue;
    }

    await updateGameState();

    // Update game state display
    const progreso = normalized_secret.split('').map(l => guessed_letters.has(l) ? l : '_');
    display_feedback(`${formato_palabra(progreso)}\n${players.map(p => `${p}: ${scores[p] || 0} puntos, ${tries[p] || 0} intentos`).join('\n')}`, 'black', null, false);

    // Check win condition
    if (result.wordGuessed || normalized_secret.split('').every(l => guessed_letters.has(l))) {
      winner = player;
      wins[player] = (wins[player] || 0) + 1;
      display_feedback(`${player} ha ganado! La palabra era '${secret_word}'.`, 'green', player);
      break;
    }

    // Check lose condition
    if (tries[players[currentPlayerIndex]] <= 0) {
      console.log('play_game: Player out of tries', { player, tries: tries[player] });
      if (mode === '2') {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        if (tries[players[currentPlayerIndex]] <= 0) {
          display_feedback('¡Nadie adivinó la palabra!', 'red');
          break;
        }
      } else {
        display_feedback(`${player} se quedó sin intentos. La palabra era '${secret_word}'.`, 'red', player);
        break;
      }
    }

    // Switch player
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    await updateGameState();
  }

  // End game
  if (gameType === 'remoto' && sessionRef) {
    try {
      await update(sessionRef, { status: 'ended' });
      console.log('play_game: Marked game as ended in Firebase', sessionId);
    } catch (error) {
      console.error('play_game: Error updating Firebase status', error);
    }
    if (unsubscribe) unsubscribe();
  }

  // Update total scores
  for (const player of players) {
    total_scores[player] = (total_scores[player] || 0) + (scores[player] || 0);
  }

  // Display final scores
  let score_text = players.map(p => `${p}: ${total_scores[p]} puntos`).join('\n');
  if (mode !== '1') {
    score_text += `\nVictorias: ${players.map(p => `${p}: ${wins[p] || 0}`).join(', ')}`;
  }
  display_feedback(score_text, 'black', null, true);

  // Clean up Firebase
  if (gameType === 'remoto' && sessionRef) {
    try {
      await remove(sessionRef);
      console.log('play_game: Cleaned up Firebase session', sessionId);
    } catch (error) {
      console.error('play_game: Error cleaning up Firebase session', error);
    }
  }

  // Continue or end series
  games_played++;
  if (games_played < games_to_play && mode !== '1') {
    display_feedback('Preparando siguiente ronda...', 'blue', null, true, 2000);
    await delay(2000);
    output.innerText = '';
    const new_secret_word = await get_secret_word();
    await play_game(
      null,
      new_secret_word,
      mode,
      players,
      output,
      container,
      prompt,
      input,
      button,
      difficulty,
      games_played,
      games_to_play,
      total_scores,
      wins,
      delay,
      display_feedback,
      gameType,
      sessionId
    );
  } else {
    let final_message = 'Juego terminado!\n';
    if (mode !== '1') {
      const max_wins = Math.max(...Object.values(wins));
      const winners = Object.keys(wins).filter(p => wins[p] === max_wins);
      if (winners.length === 1) {
        final_message += `${winners[0]} gana con ${max_wins} victorias!\n`;
      } else {
        final_message += `Empate entre ${winners.join(' y ')} con ${max_wins} victorias!\n`;
      }
    }
    final_message += score_text;
    display_feedback(final_message, 'black', null, false);
    prompt.innerText = 'Presiona Enter para jugar de nuevo o cierra la página.';
    input.value = '';
    button.style.display = 'none';
    focusInput(input);
    await new Promise(resolve => {
      const handler = (e) => {
        if (e.key === 'Enter') {
          input.removeEventListener('keypress', handler);
          resolve();
        }
      };
      input.addEventListener('keypress', handler);
    });
    isGameActive = false;
    await main();
  }
}

async function main() {
  console.log('main: Starting, Loaded version 2025-06-16-v9.8');
  isGameActive = false;
  try {
    const ui = await create_game_ui();
    if (!ui) {
      console.error('main: Failed to create UI');
      return;
    }
    const { mode, player1, player2, prompt, input, button, output, container, difficulty, gameType, sessionId } = ui;
    console.log('main: UI created', { mode, player1, player2, difficulty, gameType, sessionId });
    const players = mode === '1' ? [player1] : mode === '3' ? [player1, 'IA'] : [player1, player2];
    await start_game(mode, players, output, container, prompt, input, button, difficulty, 0, {}, {}, gameType, sessionId);
  } catch (err) {
    console.error('main: Error in main loop', err);
    const output = document.querySelector('.game-output');
    if (output) {
      output.innerText = 'Error crítico en el juego. Por favor, recarga la página.';
      output.style.color = 'red';
    }
  }
}

// Start the game
main();