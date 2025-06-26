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

// Helper function to fetch a single word from the API
async function fetchSingleWord() {
    try {
        const response = await fetch(WORD_API_URL, {
            headers: {
                'X-Api-Key': WORD_API_KEY
            }
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
            headers: {
                'Content-Type': 'application/json'
            },
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
            .filter(word => word.length >= 4 && word.length <= 12 && /^[a-záéíóúüñ]+$/.test(word));
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
    console.warn('focusInput: Input not focusable', {
        inputExists: !!input,
        isAttached: input?.parentNode
    });
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
    if (typeof texto !== 'string') return '';
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036F]/g, '');
}

function format_name(name) {
    if (!name) return '';
    const formatted = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
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
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function display_feedback(message, color, player, append = false) {
    const formatted_feedback = player ? message.replace(player, `<strong>${player}</strong>`) : message;
    const output = document.querySelector('.game-output');
    if (!output) {
        console.error('display_feedback: Output element not found');
        return;
    }
    if (append) {
        output.innerHTML += `<br><span style="color: ${color}">${formatted_feedback.replace(/\n/g, '<br>')}</span>`;
    } else {
        output.innerHTML = `<span style="color: ${color}">${formatted_feedback.replace(/\n/g, '<br>')}</span>`;
    }
    console.log(`display_feedback: ${append ? 'Appended' : 'Displayed'}:`, formatted_feedback);
    try {
        output.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error('display_feedback: Error scrolling output', err);
    }
}

async function get_guess(guessed_letters, secret_word, prompt, input, output, button) {
    if (!secret_word || typeof secret_word !== 'string') {
        console.error('get_guess: secret_word is missing or invalid', { secret_word });
        throw new Error('Missing or invalid secret word');
    }
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
    const permitir_palabra = guessed_letters.size >= min_guesses_for_word ||
        Array.from(guessed_letters).some(l => secret_word.split('').filter(x => x === l).length > 1);
    prompt.innerText = permitir_palabra ?
        'Adivina una letra o la palabra completa:' :
        'Adivina una letra:';
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
                    console.log('get_guess: Enter pressed', {
                        inputValue: input.value,
                        inputId: input.id
                    });
                    const result = handleGuess('enter', input.value);
                    if (result.valid) {
                        input.removeEventListener('keypress', enterHandler);
                        resolve(result.guess);
                    }
                }
            };

            function handleGuess(source, guessValue) {
                console.log('get_guess: handleGuess called', {
                    source,
                    guessValue,
                    currentInputValue: input.value,
                    inputId: input.id
                });
                const rawGuess = guessValue || '';
                const trimmedGuess = rawGuess.trim();
                const normalizedGuess = normalizar(trimmedGuess);
                console.log('get_guess: Processing guess', {
                    rawGuess,
                    trimmedGuess,
                    normalizedGuess,
                    secret_word,
                    normalized_secret
                });
                if (!trimmedGuess) {
                    output.innerText = 'Entrada vacía. Ingresa una letra o palabra válida.';
                    output.style.color = 'red';
                    focusInput(input);
                    return { valid: false };
                }
                if (permitir_palabra &&
                    normalizedGuess.length === normalized_secret.length &&
                    /^[a-záéíóúüñ]+$/.test(normalizedGuess)) {
                    input.value = '';
                    return { valid: true, guess: normalizedGuess };
                } else if (normalizedGuess.length === 1 &&
                    /^[a-záéíóúüñ]+$/.test(normalizedGuess)) {
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
                reject(new Error('Failed to attach input listener'));
            }
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
    console.log('create_game_ui: Starting, Loaded version 2025-06-26-v9.12', {
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
        container.style.fontFamily = 'Arial, sans-serif';

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

        if (mode && player1 && (mode !== '3' || difficulty) && (mode !== '2' || gameType)) {
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
                    button.onclick = handlePlayer1Input;
                    currentHandler = (e) => {
                        if (e.key === 'Enter') button.click();
                    };
                    input.addEventListener('keypress', currentHandler);
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
                                    guessedLetters: ['__init__'],
                                    tries: { init: null },
                                    scores: { init: null },
                                    currentPlayer: 'none',
                                    initialized: true
                                };
                                await set(sessionRef, initialState);
                                let validationAttempts = 3;
                                let createdState;
                                while (validationAttempts--) {
                                    await delay(1000);
                                    const createdSnapshot = await get(sessionRef);
                                    createdState = createdSnapshot.val();
                                    console.log('create_game_ui: Retrieved state after set', { sessionId: selected_sessionId, createdState });
                                    if (createdState && createdState.secretWord && createdState.initialized) {
                                        if (!Array.isArray(createdState.guessedLetters)) {
                                            await update(sessionRef, { guessedLetters: ['__init__'] });
                                            console.log('create_game_ui: Fixed missing guessedLetters', selected_sessionId);
                                            await delay(1000);
                                            const finalSnapshot = await get(sessionRef);
                                            createdState = finalSnapshot.val();
                                        }
                                        break;
                                    }
                                }
                                if (!createdState || !createdState.secretWord || !createdState.initialized) {
                                    await remove(sessionRef);
                                    throw new Error('Failed to validate session state');
                                }
                                success = true;
                                break;
                            } catch (error) {
                                console.warn(`create_game_ui: Retry ${5 - attempts}/5 for Firebase set`, error);
                                await delay(1000);
                            }
                        }
                        if (!success) {
                            console.error('create_game_ui: Failed to create Firebase session after retries');
                            output.innerText = 'Error al crear la sesión de juego. Intenta de nuevo.';
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
                            ? 'Error: Permiso denegado. Verifica las reglas de Firebase.'
                            : 'Error al crear la sesión de juego. Intenta de nuevo.';
                        output.style.color = 'red';
                        input.value = '';
                        focusInput(input);
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
                selected_player1 = format_name(player1Input);
                console.log('create_game_ui: Formatted Player 1 name:', selected_player1);

                if (selected_gameType === 'remoto') {
                    if (!selected_sessionId) {
                        console.error('create_game_ui: selected_sessionId is undefined for remote game');
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
                                    console.error('create_game_ui: Invalid session for player1 update', selected_sessionId);
                                    throw new Error('Invalid session state');
                                }
                                await update(sessionRef, {
                                    player1: selected_player1,
                                    status: 'waiting_for_player2',
                                    currentPlayer: selected_player1,
                                    guessedLetters: snapshot.val().guessedLetters || ['__init__'],
                                    tries: snapshot.val().tries || { init: null },
                                    scores: snapshot.val().scores || { init: null }
                                });
                                console.log('create_game_ui: Firebase updated with player1', {
                                    sessionId: selected_sessionId,
                                    player1: selected_player1
                                });
                                success = true;
                                break;
                            } catch (error) {
                                console.warn(`create_game_ui: Retry ${5 - attempts}/5 for player1 update`, error);
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
                        prompt.innerText = `Esperando a que otro jugador se una...`;
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
                            if (game && game.player2 && game.status === 'playing') {
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
                            output.innerText = 'Error de sincronización. Intenta de nuevo.';
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
                                    console.warn('handlePlayer1Input: Error cleaning up Firebase session', err);
                                }
                                unsubscribe();
                            }
                        }, 60000);
                    } catch (error) {
                        console.error('create_game_ui: Error updating player 1 in Firebase:', error);
                        output.innerText = error.message.includes('permission_denied')
                            ? 'Error: Permiso denegado. Verifica las reglas de Firebase.'
                            : 'Error al registrar el Jugador 1. Intenta de nuevo.';
                        output.style.color = 'red';
                        input.value = '';
                        focusInput(input);
                    }
                } else {
                    // Non-remote modes (mode 1 or mode 2 local)
                    input.removeEventListener('keypress', currentHandler);
                    if (selected_mode === '1') {
                        prompt.innerText = 'Ingresa una letra o la palabra completa:';
                        button.style.display = 'none';
                        focusInput(input);
                        resolve({
                            mode: selected_mode,
                            player1: selected_player1,
                            player2: null,
                            prompt,
                            input,
                            button,
                            output,
                            container,
                            difficulty: selected_difficulty,
                            gameType: selected_gameType || 'local',
                            sessionId: null
                        });
                    } else if (selected_mode === '2') {
                        prompt.innerText = 'Nombre Jugador 2:';
                        input.value = '';
                        focusInput(input);
                        button.onclick = handlePlayer2Input;
                        currentHandler = (e) => {
                            if (e.key === 'Enter') button.click();
                        };
                        input.addEventListener('keypress', currentHandler);
                    } else if (selected_mode === '3') {
                        prompt.innerText = 'Selecciona dificultad (fácil, normal, difícil):';
                        input.value = '';
                        focusInput(input);
                        button.onclick = handleDifficultyInput;
                        currentHandler = (e) => {
                            if (e.key === 'Enter') button.click();
                        };
                        input.addEventListener('keypress', currentHandler);
                    }
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
                selected_player2 = format_name(player2Input);
                console.log('create_game_ui: Formatted Player 2 name:', selected_player2);
                if (selected_gameType === 'remoto') {
                    if (!selected_sessionId) {
                        console.error('create_game_ui: selected_sessionId is undefined in handlePlayer2Input');
                        output.innerText = 'Error: ID de sesión no definido.';
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
                                console.warn('create_game_ui: Session not in waiting state', {
                                    sessionId: selected_sessionId,
                                    status: sessionState.status
                                });
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
                                const updateData = {
                                    player2: selected_player2,
                                    status: 'playing',
                                    currentPlayer: sessionState.player1 || selected_player2,
                                    tries: {
                                        [sessionState.player1 || 'Player1']: sessionState.tries?.[sessionState.player1] || Math.floor(sessionState.secretWord.length / 2),
                                        [selected_player2]: Math.floor(sessionState.secretWord.length / 2)
                                    },
                                    scores: {
                                        [sessionState.player1 || 'Player1']: sessionState.scores?.[sessionState.player1] || 0,
                                        [selected_player2]: 0
                                    },
                                    guessedLetters: Array.isArray(sessionState.guessedLetters) ? sessionState.guessedLetters : ['__init__']
                                };
                                await update(sessionRef, updateData);
                                console.log('handlePlayer2Input: Updated Firebase with player2', {
                                    sessionId: selected_sessionId,
                                    player2: selected_player2
                                });
                                success = true;
                                break;
                            } catch (error) {
                                console.warn(`handlePlayer2Input: Retry ${5 - attempts}/5 for Firebase update`, error);
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
                        input.removeEventListener('keypress', currentHandler);
                        prompt.innerText = 'Ingresa una letra o la palabra completa:';
                        button.style.display = 'none';
                        focusInput(input);
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
                            sessionId: selected_sessionId
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
                } else {
                    // Local mode 2
                    input.removeEventListener('keypress', currentHandler);
                    prompt.innerText = 'Ingresa una letra o la palabra completa:';
                    button.style.display = 'none';
                    focusInput(input);
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
                        gameType: selected_gameType || 'local',
                        sessionId: null
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
                    let attempts = 5;
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
                        if (!sessionState.secretWord || !sessionState.initialized) {
                            console.warn('create_game_ui: Invalid session state', sessionState);
                            output.innerText = 'La sesión tiene un estado inválido. Intenta con otro ID.';
                            output.style.color = 'red';
                            input.value = '';
                            focusInput(input);
                            return;
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

            async function handleDifficultyInput() {
                const value = input.value.trim().toLowerCase();
                console.log('create_game_ui: Difficulty input:', value);
                if (['facil', 'normal', 'dificil'].includes(value)) {
                    selected_difficulty = value;
                    input.removeEventListener('keypress', currentHandler);
                    prompt.innerText = 'Ingresa una letra o la palabra completa:';
                    button.style.display = 'none';
                    focusInput(input);
                    resolve({
                        mode: selected_mode,
                        player1: selected_player1,
                        player2: null,
                        prompt,
                        input,
                        button,
                        output,
                        container,
                        difficulty: selected_difficulty,
                        gameType: selected_gameType || 'local',
                        sessionId: null
                    });
                } else {
                    output.innerText = 'Dificultad inválida. Ingresa fácil, normal o difícil.';
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
    console.log('start_game: Loaded version 2025-06-17-v9.11', {
        mode,
        players,
        difficulty,
        games_played,
        gameType,
        sessionId
    });
    isGameActive = true;
    try {
        if (!players || players.some(p => !p)) {
            output.innerText = 'Error: Jugadores no definidos.';
            console.error('start_game: Invalid players');
            return;
        }
        if (!container || !prompt || !output || !input || !button) {
            console.error('start_game: Missing required DOM elements', {
                container,
                prompt,
                output,
                input,
                button
            });
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
        let loadingMessage;
        try {
            // Clear all elements except container
            Array.from(container.children).forEach(el => {
                container.removeChild(el);
            });
            // Reattach all core elements
            container.appendChild(prompt);
            container.appendChild(input);
            container.appendChild(output);
            container.appendChild(button);
            button.style.display = 'none'; // Hide button but keep it attached
            prompt.innerText = '';
            output.innerText = '';
            // Show loading message
            loadingMessage = document.createElement('p');
            loadingMessage.innerText = 'Generando palabra secreta';
            loadingMessage.style.fontSize = '16px';
            loadingMessage.style.color = 'blue';
            container.appendChild(loadingMessage);
            console.log('start_game: Showing loading message', {
                inputAttached: !!input.parentNode,
                buttonAttached: !!button.parentNode
            });
            // Start the game
            const secret_word = await get_secret_word();
            await play_game(
                loadingMessage,
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
            console.log('start_game: Game completed', {
                games_played,
                games_to_play,
                total_scores: accumulated_scores,
                wins: accumulated_wins
            });
        } catch (err) {
            console.error('start_game: Error during game setup', err);
            output.innerText = 'Error al iniciar el juego.';
            if (loadingMessage && loadingMessage.parentNode) {
                container.removeChild(loadingMessage);
            }
        } finally {
            isGameActive = false;
        }
    } catch (err) {
        console.error('start_game: Outer error', err);
        output.innerText = 'Error crítico al iniciar el juego.';
    }
}

// Revised process_guess function
async function process_guess(player, guessed_letters, secret_word, tries, scores, lastCorrectWasVowel, used_wrong_letters, used_wrong_words, vowels, max_score, difficulty, mode, prompt, input, output, button, delay, display_feedback) {
    console.log('process_guess: Starting for', player, {
        max_score,
        score: scores[player] || 0,
        guessed_letters: Array.from(guessed_letters),
        retried: 0,
        difficulty,
        mode
    });
    let retried = 0;
    let timeout_retries = 0;
    const max_retries = 3;
    const max_timeout_retries = 3;
    let penalizo = false;
    let restar_intento = true;
    let feedback = '';
    let feedback_color = 'black';
    let guess = '';

    // Safeguard: Ensure tries and scores are initialized
    if (!tries[player]) tries[player] = Math.floor(secret_word.length / 2);
    if (!scores[player]) scores[player] = 0;

    const normalized_secret = normalizar(secret_word);

    const get_ai_guess_wrapper = async (mustBeConsonant = false) => {
        try {
            const new_guess = await get_ai_guess(guessed_letters, secret_word, used_wrong_letters, used_wrong_words, mustBeConsonant, difficulty);
            console.log('process_guess: AI guessed:', new_guess, { mustBeConsonant, difficulty });
            display_feedback(`IA adivina: ${new_guess}`, 'blue', player, true);
            return new_guess;
        } catch (err) {
            console.error('process_guess: AI guess error', err);
            penalizo = true;
            feedback = `Error en la IA: ${escapeHTML(err.message || 'Unknown error')}. Turno perdido.`;
            feedback_color = 'red';
            return null;
        }
    };

    const get_human_guess = async () => {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Input timeout')), 30000));
        try {
            const human_guess = await Promise.race([
                get_guess(guessed_letters, secret_word, prompt, input, output, button),
                timeoutPromise
            ]);
            console.log('process_guess: Human guess:', human_guess);
            if (!human_guess.trim()) {
                feedback = `Entrada vacía. Por favor, ingresa una adivinanza válida.`;
                feedback_color = 'orange';
                display_feedback(feedback, feedback_color, player, true);
                return null;
            }
            timeout_retries = 0;
            return human_guess.trim();
        } catch (error) {
            if (error.message === 'Input timeout') {
                console.log('process_guess: Timeout occurred', { player, timeout_retries });
                timeout_retries++;
                if (timeout_retries === max_timeout_retries - 1) {
                    feedback = `Última oportunidad para ingresar tu adivinanza.`;
                    feedback_color = 'orange';
                    display_feedback(feedback, feedback_color, player, true);
                    return null;
                } else if (timeout_retries < max_timeout_retries) {
                    feedback = `Por favor, ingresa tu adivinanza. Intentos restantes: ${max_timeout_retries - timeout_retries}.`;
                    feedback_color = 'orange';
                    display_feedback(feedback, feedback_color, player, true);
                    return null;
                } else {
                    penalizo = true;
                    feedback = `Demasiados tiempos de espera. Pierdes el turno.`;
                    if (scores[player] > 0) {
                        const penalty = Math.min(1, scores[player]);
                        feedback += ` (-${penalty} punto)`;
                        scores[player] = Math.max(0, scores[player] - penalty);
                        console.log('process_guess: Timeout penalty applied', { player, penalty, new_score: scores[player] });
                    }
                    feedback_color = 'red';
                    display_feedback(feedback, feedback_color, player, true);
                    return false;
                }
            }
            console.error('process_guess: Guess input error:', { name: error.name, message: error.message, stack: error.stack });
            feedback = `Error al procesar la entrada. Intenta de nuevo.`;
            feedback_color = 'red';
            display_feedback(feedback, feedback_color, player, true);
            return null;
        }
    };

    try {
        if (mode === '3' && player === 'IA') {
            display_feedback(`IA está pensando...`, 'blue', player, true);
            await delay(1000);
            guess = await get_ai_guess_wrapper();
            if (!guess) {
                display_feedback(feedback, feedback_color, player, true);
                return { penalizo, tries, scores, guessed_letters, word_guessed: false };
            }
        } else {
            while (timeout_retries < max_timeout_retries) {
                const result = await get_human_guess();
                if (result === null) continue;
                if (result === false) {
                    display_feedback(feedback, feedback_color, player, true);
                    return { penalizo, tries, scores, guessed_letters, word_guessed: false };
                }
                guess = result;
                break;
            }
            if (timeout_retries >= max_timeout_retries) {
                display_feedback(feedback, feedback_color, player, true);
                return { penalizo, tries, scores, guessed_letters, word_guessed: false };
            }
        }

        while (retried < max_retries) {
            if (!guess) {
                penalizo = true;
                feedback = `Adivinanza inválida. Pierdes el turno.`;
                feedback_color = 'red';
                display_feedback(feedback, feedback_color, player, true);
                break;
            }

            console.log('process_guess: Processing guess', { player, guess, normalized_guess: normalizar(guess), normalized_secret });

            // Handle repeated guesses
            if (guess.length === 1 && lastCorrectWasVowel[player] && vowels.has(guess)) {
                feedback = `Inválido. Ingrese una consonante.`;
                feedback_color = 'red';
                display_feedback(feedback, feedback_color, player, true);
                retried++;
                console.log('process_guess: Invalid vowel guess', { player, guess, retried });
                if (retried >= max_retries) {
                    penalizo = true;
                    feedback = `Demasiados intentos inválidos. Pierdes el turno.`;
                    if (scores[player] > 0) {
                        const penalty = Math.min(1, scores[player]);
                        feedback += ` (-${penalty} punto)`;
                        scores[player] = Math.max(0, scores[player] - penalty);
                        console.log('process_guess: Max retries penalty applied', { player, penalty, new_score: scores[player] });
                    }
                    feedback_color = 'red';
                    display_feedback(feedback, feedback_color, player, true);
                    break;
                }
                if (player === 'IA') {
                    guess = await get_ai_guess_wrapper(true);
                    if (!guess) break;
                } else {
                    const result = await get_human_guess();
                    if (result === null) continue;
                    if (result === false) {
                        display_feedback(feedback, feedback_color, player, true);
                        return { penalizo, tries, scores, guessed_letters, word_guessed: false };
                    }
                    guess = result;
                }
                continue;
            }

            if (guess.length === 1 && !secret_word.includes(guess) && used_wrong_letters.has(guess)) {
                if (retried < max_retries - 1) {
                    feedback = `Advertencia: '${guess}' ya intentada. Intenta de nuevo.`;
                    feedback_color = 'orange';
                    display_feedback(feedback, feedback_color, player, true);
                    retried++;
                    console.log('process_guess: Repeated wrong letter', { player, guess, retried });
                    if (player === 'IA') {
                        guess = await get_ai_guess_wrapper();
                        if (!guess) break;
                    } else {
                        const result = await get_human_guess();
                        if (result === null) continue;
                        if (result === false) {
                            display_feedback(feedback, feedback_color, player, true);
                            return { penalizo, tries, scores, guessed_letters, word_guessed: false };
                        }
                        guess = result;
                    }
                    continue;
                }
                penalizo = true;
                feedback = `'${guess}' ya intentada.`;
                if (scores[player] > 0) {
                    const penalty = Math.min(1, scores[player]);
                    feedback += ` (-${penalty} punto)`;
                    scores[player] = Math.max(0, scores[player] - penalty);
                    console.log('process_guess: Repeated wrong letter penalty', { player, penalty, new_score: scores[player] });
                }
                feedback_color = 'red';
                display_feedback(feedback, feedback_color, player, true);
                break;
            } else if (guess.length === 1 && secret_word.includes(guess) && guessed_letters.has(guess)) {
                if (retried < max_retries - 1) {
                    feedback = `Advertencia: '${guess}' ya adivinada. Intenta de nuevo.`;
                    feedback_color = 'orange';
                    display_feedback(feedback, feedback_color, player, true);
                    retried++;
                    console.log('process_guess: Repeated correct letter', { player, guess, retried });
                    if (player === 'IA') {
                        guess = await get_ai_guess_wrapper();
                        if (!guess) break;
                    } else {
                        const result = await get_human_guess();
                        if (result === null) continue;
                        if (result === false) {
                            display_feedback(feedback, feedback_color, player, true);
                            return { penalizo, tries, scores, guessed_letters, word_guessed: false };
                        }
                        guess = result;
                    }
                    continue;
                }
                penalizo = true;
                feedback = `'${guess}' ya adivinada.`;
                if (scores[player] > 0) {
                    const penalty = Math.min(1, scores[player]);
                    feedback += ` (-${penalty} punto)`;
                    scores[player] = Math.max(0, scores[player] - penalty);
                    console.log('process_guess: Repeated correct letter penalty', { player, penalty, new_score: scores[player] });
                }
                feedback_color = 'red';
                display_feedback(feedback, feedback_color, player, true);
                break;
            } else if (guess.length === secret_word.length && normalizar(guess) !== normalized_secret && used_wrong_words.has(normalizar(guess))) {
                if (retried < max_retries - 1) {
                    feedback = `Advertencia: '${guess}' ya intentada. Intenta de nuevo.`;
                    feedback_color = 'orange';
                    display_feedback(feedback, feedback_color, player, true);
                    retried++;
                    console.log('process_guess: Repeated wrong word', { player, guess, retried });
                    if (player === 'IA') {
                        guess = await get_ai_guess_wrapper();
                        if (!guess) break;
                    } else {
                        const result = await get_human_guess();
                        if (result === null) continue;
                        if (result === false) {
                            display_feedback(feedback, feedback_color, player, true);
                            return { penalizo, tries, scores, guessed_letters, word_guessed: false };
                        }
                        guess = result;
                    }
                    continue;
                }
                penalizo = true;
                feedback = `'${guess}' ya intentada.`;
                if (scores[player] > 0) {
                    const penalty = Math.min(2, scores[player]);
                    feedback += ` (-${penalty} puntos)`;
                    scores[player] = Math.max(0, scores[player] - penalty);
                    console.log('process_guess: Repeated wrong word penalty', { player, penalty, new_score: scores[player] });
                }
                feedback_color = 'red';
                display_feedback(feedback, feedback_color, player, true);
                break;
            }

            const score_before = scores[player];
            if (guess.length === secret_word.length) {
                if (normalizar(guess) === normalized_secret) {
                    scores[player] = max_score + (secret_word.length >= 10 ? Array.from(guessed_letters).filter(l => secret_word.includes(l)).length : 0);
                    guessed_letters.clear();
                    secret_word.split('').forEach(l => guessed_letters.add(l));
                    feedback = `¡Felicidades, ${player}! Adivinaste '${secret_word}'!`;
                    feedback_color = 'green';
                    restar_intento = false;
                    display_feedback(feedback, feedback_color, player, true);
                } else {
                    const letras_nuevas = new Set(secret_word.split('').filter(l => guess.includes(l) && !guessed_letters.has(l)));
                    const penalizacion = scores[player] > 0 ? Math.min(2, scores[player]) : 0;
                    let puntos_sumados = 0;
                    if (letras_nuevas.size) {
                        const score_antes = scores[player];
                        letras_nuevas.forEach(l => {
                            puntos_sumados += secret_word.split('').filter(x => x === l).length;
                            guessed_letters.add(l);
                        });
                        scores[player] = Math.min(max_score + (secret_word.length >= 10 ? Array.from(guessed_letters).filter(l => secret_word.includes(l)).length : 0), score_antes + puntos_sumados);
                        feedback = `Incorrecto! '${guess}' no es la palabra pero contiene: ${Array.from(letras_nuevas).join(', ')}. (+${puntos_sumados} puntos)`;
                        if (penalizacion > 0) {
                            feedback += `\nPenalización: -${penalizacion} puntos`;
                            scores[player] = Math.max(0, scores[player] - penalizacion);
                        }
                        feedback_color = 'orange';
                    } else {
                        feedback = `Incorrecto. '${guess}' sin letras nuevas.`;
                        if (penalizacion > 0) {
                            feedback += ` (-${penalizacion} puntos)`;
                            scores[player] = Math.max(0, scores[player] - penalizacion);
                        }
                        feedback_color = 'red';
                    }
                    used_wrong_words.add(normalizar(guess));
                    console.log('process_guess: Word guess processed', { guess, letras_nuevas: Array.from(letras_nuevas), score_before, score_after: scores[player] });
                    display_feedback(feedback, feedback_color, player, true);
                }
            } else {
                const feedback_data = get_guess_feedback(guess, secret_word, scores[player]);
                feedback = feedback_data.join('\n');
                feedback_color = feedback_data.color;
                if (secret_word.includes(guess) && !guessed_letters.has(guess)) {
                    scores[player] = Math.min(max_score, scores[player] + secret_word.split('').filter(l => l === guess).length);
                    guessed_letters.add(guess);
                    lastCorrectWasVowel[player] = vowels.has(guess);
                    console.log('process_guess: Correct letter guess', {
                        player,
                        guess,
                        score_before,
                        score_after: scores[player],
                        lastCorrectWasVowel: lastCorrectWasVowel[player]
                    });
                    restar_intento = false;
                } else {
                    used_wrong_letters.add(guess);
                    penalizo = true;
                    if (scores[player] > 0) {
                        const penalty = Math.min(1, scores[player]);
                        scores[player] = Math.max(0, scores[player] - penalty);
                        console.log('process_guess: Incorrect letter penalty', {
                            player,
                            penalty,
                            new_score: scores[player]
                        });
                    }
                    console.log('process_guess: Incorrect letter guess', { player, guess });
                }
                display_feedback(feedback, feedback_color, player, true);
            }
            break;
        }

        if (restar_intento && tries[player] > 0) {
            tries[player]--;
            console.log('process_guess: Deducted try', { player, tries_left: tries[player] });
        }

        const word_guessed = normalizar(guess) === normalized_secret ||
            Array.from(normalized_secret).every(l => guessed_letters.has(l));
        console.log('process_guess: Completed', {
            player,
            guess,
            tries_left: tries[player],
            score: scores[player],
            word_guessed
        });
        return { penalizo, tries, scores, guessed_letters, word_guessed };
    } catch (err) {
        console.error('process_guess: Error processing guess', err);
        penalizo = true;
        feedback = `Error procesando la adivinanza: ${escapeHTML(err.message || 'Unknown error')}.`;
        feedback_color = 'red';
        display_feedback(feedback, feedback_color, player, true);
        return {
            penalizo,
            tries,
            scores,
            guessed_letters,
            word_guessed: false
        };
    }
}

// Main game loop
async function play_game(loadingMessage, secret_word, mode, players, output, container, prompt, input, button, difficulty, games_played, games_to_play, accumulated_scores, accumulated_wins, delay, display_feedback, gameType, sessionId) {
    console.log('play_game: Starting, Loaded version 2025-06-17-v9.11', {
        secret_word,
        mode,
        players,
        difficulty,
        games_played,
        games_to_play,
        gameType,
        sessionId
    });
    try {
        if (!secret_word || typeof secret_word !== 'string' || !secret_word.trim()) {
            console.error('play_game: Invalid secret_word', secret_word);
            output.innerText = 'Error: Palabra secreta inválida.';
            return;
        }
        if (!container || !prompt || !output || !input || !button) {
            console.error('play_game: Missing DOM elements', { container, prompt, output, input, button });
            output.innerText = 'Error: Elementos de interfaz no disponibles.';
            return;
        }
        if (loadingMessage && loadingMessage.parentNode) {
            container.removeChild(loadingMessage);
            console.log('play_game: Removed loading message');
        }
        const normalized_secret = normalizar(secret_word);
        const max_score = Math.floor(secret_word.length * 1.5);
        let guessed_letters = new Set();
        let used_wrong_letters = new Set();
        let used_wrong_words = new Set();
        let tries = Object.fromEntries(players.map(p => [p, Math.floor(secret_word.length / 2)]));
        let scores = Object.fromEntries(players.map(p => [p, 0]));
        let lastCorrectWasVowel = Object.fromEntries(players.map(p => [p, false]));
        const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
        let current_player_index = 0;
        let word_guessed = false;
        let sessionRef = null;
        let unsubscribe = null;

        if (gameType === 'remoto' && sessionId) {
            sessionRef = ref(database, `games/${sessionId}`);
            console.log('play_game: Initialized Firebase session', { sessionId });
            try {
                const snapshot = await get(sessionRef);
                if (!snapshot.exists()) {
                    console.error('play_game: Session not found', sessionId);
                    output.innerText = 'Error: Sesión no encontrada.';
                    return;
                }
                const gameState = snapshot.val();
                if (!gameState || !gameState.secretWord || !gameState.initialized) {
                    console.error('play_game: Invalid session state', gameState);
                    output.innerText = 'Error: Estado de sesión inválido.';
                    return;
                }
                // Sync initial state
                guessed_letters = new Set(Array.isArray(gameState.guessedLetters) ? gameState.guessedLetters.filter(l => l !== '__init__') : []);
                tries = gameState.tries || tries;
                scores = gameState.scores || scores;
                console.log('play_game: Synced initial state from Firebase', {
                    sessionId,
                    guessed_letters: Array.from(guessed_letters),
                    tries,
                    scores
                });
            } catch (error) {
                console.error('play_game: Error syncing initial state', error);
                output.innerText = error.message.includes('permission_denied')
                    ? 'Error: Permiso denegado. Verifica las reglas de Firebase.'
                    : 'Error al sincronizar el estado del juego.';
                return;
            }
        }

        prompt.innerText = 'Ingresa una letra o la palabra completa:';
        const updateProgress = () => {
            let progreso = normalized_secret.split('').map(l => guessed_letters.has(l) ? l : '_');
            display_feedback(
                `Palabra: ${formato_palabra(progreso)}\n` +
                `Letras intentadas: ${Array.from(used_wrong_letters).join(', ') || 'ninguna'}\n` +
                `Palabras intentadas: ${Array.from(used_wrong_words).join(', ') || 'ninguna'}`,
                'black',
                null,
                false
            );
        };

        updateProgress();

        if (gameType === 'remoto' && sessionId) {
            unsubscribe = onValue(sessionRef, (snapshot) => {
                const game = snapshot.val();
                console.log('play_game: Firebase snapshot received', game);
                if (!snapshot.exists()) {
                    console.warn('play_game: Session deleted');
                    output.innerText = 'Sesión terminada por el otro jugador.';
                    if (unsubscribe) unsubscribe();
                    return;
                }
                if (game.status === 'finished') {
                    console.log('play_game: Game finished via Firebase');
                    output.innerText = `Juego terminado. La palabra era: ${escapeHTML(secret_word)}.`;
                    if (unsubscribe) unsubscribe();
                    return;
                }
                guessed_letters = new Set(Array.isArray(game.guessedLetters) ? game.guessedLetters.filter(l => l !== '__init__') : []);
                tries = game.tries || tries;
                scores = game.scores || scores;
                updateProgress();
            }, (error) => {
                console.error('play_game: Firebase snapshot error', error);
                output.innerText = error.message.includes('permission_denied')
                    ? 'Error: Permiso denegado en la sincronización. Verifica las reglas de Firebase.'
                    : 'Error de sincronización con el servidor.';
                if (unsubscribe) unsubscribe();
            });
        }

        while (!word_guessed && Object.values(tries).some(t => t > 0)) {
            const player = players[current_player_index];
            console.log('play_game: Turn start', {
                player,
                tries_left: tries[player],
                score: scores[player],
                gameType
            });

            if (gameType === 'remoto' && sessionId) {
                let snapshot = await get(sessionRef);
                let game = snapshot.val();
                if (!snapshot.exists()) {
                    console.warn('play_game: Session deleted during turn');
                    output.innerText = 'Sesión terminada por el otro jugador.';
                    break;
                }
                if (game.currentPlayer !== player) {
                    output.innerText = `Esperando el turno de ${escapeHTML(game.currentPlayer)}...`;
                    continue;
                }
            }

            display_feedback(
                `Turno de ${escapeHTML(player)}.\n` +
                `Intentos restantes: ${tries[player]}\n` +
                `Puntos: ${scores[player]}`,
                'black',
                player,
                true
            );

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

            tries = result.tries;
            scores = result.scores;
            guessed_letters = result.guessed_letters;
            word_guessed = result.word_guessed;

            if (gameType === 'remoto' && sessionId) {
                let attempts = 3;
                let success = false;
                while (attempts--) {
                    try {
                        await update(sessionRef, {
                            guessedLetters: Array.from(guessed_letters).length > 0 ? Array.from(guessed_letters) : ['__init__'],
                            tries,
                            scores,
                            currentPlayer: players[(current_player_index + 1) % players.length]
                        });
                        console.log('play_game: Updated Firebase state', {
                            sessionId,
                            guessedLetters: Array.from(guessed_letters),
                            tries,
                            scores,
                            nextPlayer: players[(current_player_index + 1) % players.length]
                        });
                        success = true;
                        break;
                    } catch (error) {
                        console.warn(`play_game: Retry ${3 - attempts}/3 for Firebase update`, error);
                        if (error.code === 'PERMISSION_DENIED') {
                            console.error('play_game: Permission denied', error);
                            output.innerText = 'Error: Permiso denegado al actualizar el estado.';
                            if (unsubscribe) unsubscribe();
                            return;
                        }
                        await delay(1000);
                    }
                }
                if (!success) {
                    console.error('play_game: Failed to update Firebase after retries');
                    output.innerText = 'Error al sincronizar el estado del juego.';
                    if (unsubscribe) unsubscribe();
                    return;
                }
            }

            updateProgress();

            if (word_guessed) {
                console.log('play_game: Word guessed by', player);
                accumulated_wins[player]++;
                display_feedback(
                    `¡${escapeHTML(player)} adivinó la palabra '${escapeHTML(secret_word)}'!\n` +
                    `Puntos: ${scores[player]}`,
                    'green',
                    player,
                    true
                );
                break;
            }

            if (tries[player] <= 0) {
                console.log('play_game: No tries left for', player);
                display_feedback(
                    `${escapeHTML(player)} se quedó sin intentos.`,
                    'red',
                    player,
                    true
                );
            }

            current_player_index = (current_player_index + 1) % players.length;
        }

        if (!word_guessed) {
            display_feedback(
                `Nadie adivinó la palabra. La palabra era: ${escapeHTML(secret_word)}.`,
                'red',
                null,
                true
            );
        }

        if (gameType === 'remoto' && sessionId) {
            try {
                await update(sessionRef, { status: 'finished' });
                console.log('play_game: Marked session as finished', sessionId);
            } catch (error) {
                console.error('play_game: Error marking session as finished', error);
                output.innerText = 'Error al finalizar la sesión en el servidor.';
            }
            if (unsubscribe) unsubscribe();
        }

        if (mode !== '1' && games_played + 1 < games_to_play) {
            display_feedback(
                `Juego ${games_played + 1} de ${games_to_play} terminado. Preparando el siguiente juego...`,
                'blue',
                null,
                true
            );
            await delay(2000);
            await start_game(
                mode,
                players,
                output,
                container,
                prompt,
                input,
                button,
                difficulty,
                games_played + 1,
                accumulated_scores,
                accumulated_wins,
                gameType,
                sessionId
            );
        } else {
            let final_message = `Resultados finales después de ${games_played + 1} juego(s):\n`;
            for (const player of players) {
                accumulated_scores[player] += scores[player];
                final_message += `${escapeHTML(player)}: ${accumulated_scores[player]} puntos, ${accumulated_wins[player]} victorias\n`;
            }
            let max_score = Math.max(...Object.values(accumulated_scores));
            let winners = Object.keys(accumulated_scores).filter(p => accumulated_scores[p] === max_score);
            if (winners.length === 1) {
                final_message += `\n¡${escapeHTML(winners[0])} gana con ${max_score} puntos!`;
            } else {
                final_message += `\n¡Empate entre ${winners.map(p => escapeHTML(p)).join(' y ')} con ${max_score} puntos!`;
            }
            display_feedback(final_message, 'blue', null, true);

            const restartButton = document.createElement('button');
            restartButton.className = 'game-button';
            restartButton.innerText = 'Jugar de nuevo';
            restartButton.style.padding = '8px 16px';
            restartButton.style.fontSize = '16px';
            restartButton.style.cursor = 'pointer';
            restartButton.style.marginTop = '10px';
            restartButton.onclick = () => main();
            container.appendChild(restartButton);
            button.style.display = 'none';
            input.style.display = 'none';
            prompt.innerText = '';
            console.log('play_game: Game series completed', {
                accumulated_scores,
                accumulated_wins
            });
        }

        if (gameType === 'remoto' && sessionId) {
            try {
                await remove(sessionRef);
                console.log('play_game: Cleaned up Firebase session', sessionId);
            } catch (error) {
                console.warn('play_game: Error cleaning up Firebase session', error);
            }
        }
    } catch (err) {
        console.error('play_game: Error in game loop', err);
        output.innerText = 'Error durante el juego. Intenta de nuevo.';
        if (gameType === 'remoto' && sessionId && sessionRef) {
            try {
                await remove(sessionRef);
                console.log('play_game: Cleaned up Firebase session on error', sessionId);
            } catch (cleanupError) {
                console.warn('play_game: Error cleaning up Firebase session on error', cleanupError);
            }
        }
        if (unsubscribe) unsubscribe();
    }
}

// Main entry point
async function main() {
    console.log('main: Starting, Loaded version 2025-06-24-10-fixed20');
    isGameActive = false;
    try {
        const ui = await create_game_ui();
        if (!ui) {
            console.warn('main: UI creation failed or cancelled');
            return;
        }
        const { mode, player1, player2, prompt, input, button, output, container, difficulty, gameType, sessionId } = ui;
        console.log('main: UI created', { mode, player1, player2, difficulty, gameType, sessionId });
        let players = [player1];
        if (mode === '2') {
            if (!player2) {
                console.error('main: Player 2 missing for mode 2');
                output.innerText = 'Error: Se requiere un segundo jugador.';
                return;
            }
            players.push(player2);
        } else if (mode === '3') {
            players.push('IA');
            if (!difficulty) {
                console.log('main: Prompting for difficulty');
                prompt.innerText = 'Selecciona dificultad (fácil, normal, difícil):';
                input.value = '';
                focusInput(input);
                const difficultyPromise = new Promise(resolve => {
                    const handler = (e) => {
                        if (e.key === 'Enter') {
                            const value = input.value.trim().toLowerCase();
                            if (['facil', 'normal', 'dificil'].includes(value)) {
                                input.removeEventListener('keypress', handler);
                                button.onclick = null;
                                resolve(value);
                            } else {
                                output.innerText = 'Dificultad inválida. Ingresa fácil, normal o difícil.';
                                output.style.color = 'red';
                                input.value = '';
                                focusInput(input);
                            }
                        }
                    };
                    button.onclick = () => handler({ key: 'Enter' });
                    input.addEventListener('keypress', handler);
                });
                const selected_difficulty = await difficultyPromise;
                console.log('main: Difficulty selected', selected_difficulty);
                await start_game(mode, players, output, container, prompt, input, button, selected_difficulty, 0, null, null, gameType, sessionId);
                return;
            }
        }
        await start_game(mode, players, output, container, prompt, input, button, difficulty, 0, null, null, gameType, sessionId);
    } catch (err) {
        console.error('main: Error in main loop', err);
        const output = document.querySelector('.game-output');
        if (output) {
            output.innerText = 'Error al iniciar el juego. Intenta de nuevo.';
            output.style.color = 'red';
        }
    }
}

// Start the game
main().catch(err => {
    console.error('main: Uncaught error', err);
    const output = document.querySelector('.game-output');
    if (output) {
        output.innerText = 'Error crítico al iniciar el juego.';
        output.style.color = 'red';
    }
});