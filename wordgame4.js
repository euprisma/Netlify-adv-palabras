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

// Predefined letter frequency for Spanish
const letterFrequency = ['e', 'a', 'o', 'i', 'n', 's', 'r', 'l', 'u', 'd', 't', 'c', 'm', 'p', 'b', 'y', 'v', 'g', 'f', 'q', 'j', 'h', 'z', 'x', 'w', 'k'];

// Cache for translated Spanish words
let wordCache = [];

// API configurations
const WORD_API_URL = 'https://api.api-ninjas.com/v1/randomword';
const WORD_API_KEY = 'JGZtMGy2radD8zIA1hAQgoqJKa8Nzhck0XhgDtoL';
const TRANSLATE_API_URL = 'https://api-free.deepl.com/v2/translate';
const TRANSLATE_API_KEY = '8c71deb7-78c4-4ee2-8bf1-621a0a490d85:fx';

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
        return null;
    } catch (error) {
        console.error('Error fetching single word:', error);
        return null;
    }
}

async function fetchRandomWords(count = 5) {
    const words = [];
    let attempts = 0;
    const maxAttempts = count * 3;
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

async function translateToSpanish(englishWords) {
    try {
        if (!Array.isArray(englishWords) || englishWords.length === 0 || !englishWords.every(word => typeof word === 'string' && word.trim())) {
            console.error('Invalid input: englishWords must be a non-empty array of non-empty strings', englishWords);
            return [];
        }
        console.log('Translating words:', englishWords);

        const response = await fetch('https://translation02service.netlify.app/.netlify/functions/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: englishWords,
                source_lang: 'EN',
                target_lang: 'ES'
            })
        });

        if (!response.ok) {
            throw new Error(`Proxy error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('DeepL raw response:', data);

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

function choice(lst) {
    if (!lst || lst.length === 0) return "manzana";
    return lst[Math.floor(Math.random() * lst.length)];
}

async function get_secret_word() {
    console.log('get_secret_word called, cache size:', wordCache.length);
    if (wordCache.length > 0) {
        const word = choice(wordCache);
        wordCache = wordCache.filter(w => w !== word);
        console.log('Used cached word:', word, 'Remaining cache:', wordCache.length);
        return word;
    }

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

    console.warn('APIs failed, falling back to static list');
    const palabras_filtradas = palabras.filter(p => p.length >= 4 && p.length <= 12);
    return choice(palabras_filtradas);
}

async function get_ai_guess(guessed_letters, secret_word, used_wrong_letters, used_wrong_words, mustBeConsonant = false, difficulty = 'facil') {
    console.log('get_ai_guess: Generating AI guess, Loaded version 2025-06-26-v9.13', {
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
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
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

function escapeHTML(str) {
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
    })[match]);
}

async function get_guess(guessed_letters, secret_word, prompt, input, output, button) {
    console.log('get_guess: Starting, Loaded version 2025-06-26-v9.13', {
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
        if (input.parentNode) {
            input.focus();
            console.log('get_guess: Input focused', { inputValue: input.value, inputId: input.id });
        }
    } catch (err) {
        console.error('get_guess: Error setting input focus', err);
        throw new Error('Invalid input element');
    }

    return new Promise((resolve, reject) => {
        let enterHandler;

        const handleGuess = (source, guessValue) => {
            console.log('get_guess: handleGuess called', { source, guessValue, currentInputValue: input.value, inputId: input.id });
            const rawGuess = guessValue || '';
            const trimmedGuess = rawGuess.trim();
            const normalizedGuess = normalizar(trimmedGuess);
            console.log('get_guess: Processing guess', { rawGuess, trimmedGuess, normalizedGuess, secret_word, normalized_secret });
            if (!trimmedGuess) {
                output.innerText = 'Entrada vacía. Ingresa una letra o palabra válida.';
                output.style.color = 'red';
                if (input.parentNode) {
                    try {
                        input.focus();
                        console.log('get_guess: Input refocused after empty input', { inputId: input.id });
                    } catch (err) {
                        console.error('get_guess: Error refocusing input', err);
                    }
                }
                return false;
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
                if (input.parentNode) {
                    try {
                        input.focus();
                        console.log('get_guess: Input refocused after invalid input', { inputId: input.id });
                    } catch (err) {
                        console.error('get_guess: Error refocusing input', err);
                    }
                }
                return false;
            }
        };

        enterHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('get_guess: Enter pressed', { inputValue: input.value, inputId: input.id });
                const result = handleGuess('enter', input.value);
                if (result.valid) {
                    cleanup();
                    resolve(result.guess);
                }
            }
        };

        const cleanup = () => {
            try {
                input.removeEventListener('keypress', enterHandler);
                console.log('get_guess: Event listeners cleaned up', { inputId: input.id });
            } catch (e) {
                console.error('get_guess: Error cleaning up listeners', e);
            }
        };

        try {
            input.addEventListener('keypress', enterHandler);
        } catch (err) {
            console.error('get_guess: Error attaching input listener', err);
            cleanup();
            reject(new Error('Failed to attach input listener'));
        }
    });
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
    console.log('create_game_ui: Starting, Loaded version 2025-06-26-v9.13', { mode, player1, player2, difficulty, gameType, sessionId });
    if (isCreatingUI) {
        console.warn('create_game_ui: UI creation already in progress, skipping');
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
        title.innerText = 'Juego de Adivinar Palabras';
        const prompt = document.createElement('p');
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'game-input';
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
            if (input.parentNode) input.focus();
            return { mode, player1, player2, prompt, input, button, output, container, difficulty, gameType, sessionId };
        }

        prompt.innerHTML = 'Ingresa 1 para <strong>un jugador</strong>, 2 para <strong>dos jugadores</strong>, o 3 para <strong>jugador contra IA</strong>:';
        if (input.parentNode) input.focus();

        return new Promise(resolve => {
            let selected_mode, selected_player1, selected_player2, selected_difficulty, selected_gameType, selected_sessionId;
            let currentHandler;

            function handleModeInput() {
                const value = input.value.trim();
                console.log('create_game_ui: Mode input:', value);
                if (value === '1' || value === '2' || value === '3') {
                    selected_mode = value;
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
                        if (input.parentNode) input.focus();
                        output.innerText = '';
                        output.style.color = 'black';
                        input.removeEventListener('keypress', currentHandler);
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
                    if (input.parentNode) input.focus();
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
                    if (input.parentNode) input.focus();
                    button.onclick = handleRemoteRoleInput;
                    currentHandler = (e) => {
                        if (e.key === 'Enter') button.click();
                    };
                    input.addEventListener('keypress', currentHandler);
                } else {
                    prompt.innerText = 'Nombre Jugador 1:';
                    input.value = '';
                    if (input.parentNode) input.focus();
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
                        output.innerText = 'Error: No se pudo conectar con la base de datos.';
                        output.style.color = 'red';
                        input.value = '';
                        if (input.parentNode) input.focus();
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
                            if (input.parentNode) input.focus();
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
                                success = true;
                                break;
                            } catch (error) {
                                console.warn(`create_game_ui: Retry ${5 - attempts}/5 for Firebase set`, error);
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        }
                        if (!success) {
                            console.error('create_game_ui: Failed to create Firebase session');
                            output.innerText = 'Error al crear la sesión de juego. Intenta de nuevo.';
                            output.style.color = 'red';
                            input.value = '';
                            if (input.parentNode) input.focus();
                            return;
                        }
                        prompt.innerText = `Nombre Jugador 1 (ID de sesión: ${selected_sessionId}):`;
                        input.value = '';
                        if (input.parentNode) input.focus();
                        input.removeEventListener('keypress', currentHandler);
                        button.onclick = () => handlePlayer1Input();
                        currentHandler = (e) => {
                            if (e.key === 'Enter') button.click();
                        };
                        input.addEventListener('keypress', currentHandler);
                    } catch (error) {
                        console.error('create_game_ui: Error creating game session:', error);
                        output.innerText = 'Error al crear la sesión de juego. Intenta de nuevo.';
                        output.style.color = 'red';
                        input.value = '';
                        if (input.parentNode) input.focus();
                    }
                } else if (value === 'unirse') {
                    console.log('create_game_ui: Prompting for session ID');
                    prompt.innerText = 'Ingresa el ID de sesión:';
                    input.value = '';
                    if (input.parentNode) input.focus();
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
                    if (input.parentNode) input.focus();
                }
            }

            async function handlePlayer1Input() {
                selected_player1 = format_name(input.value.trim()) || 'Jugador 1';
                console.log('create_game_ui: Formatted Player 1 name:', selected_player1);
                if (selected_gameType === 'remoto') {
                    if (!selected_sessionId) {
                        console.error('create_game_ui: selected_sessionId is undefined');
                        output.innerText = 'Error: ID de sesión no definido.';
                        output.style.color = 'red';
                        input.value = '';
                        if (input.parentNode) input.focus();
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
                                    tries: { [selected_player1]: Math.floor(snapshot.val().secretWord.length / 2), init: null },
                                    scores: { [selected_player1]: 0, init: null }
                                });
                                console.log('create_game_ui: Firebase updated with player1', {
                                    sessionId: selected_sessionId,
                                    player1: selected_player1
                                });
                                success = true;
                                break;
                            } catch (error) {
                                console.warn(`create_game_ui: Retry ${5 - attempts}/5 for player1 update`, error);
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        }
                        if (!success) {
                            console.error('create_game_ui: Failed to update player1 in Firebase');
                            output.innerText = 'Error al registrar el Jugador 1. Intenta de nuevo.';
                            output.style.color = 'red';
                            input.value = '';
                            if (input.parentNode) input.focus();
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
                                if (input.parentNode) input.focus();
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
                                if (input.parentNode) input.focus();
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
                            if (input.parentNode) input.focus();
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
                                if (input.parentNode) input.focus();
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
                        console.error('create_game_ui: Error updating player 1:', error);
                        output.innerText = 'Error al registrar el Jugador 1. Intenta de nuevo.';
                        output.style.color = 'red';
                        input.value = '';
                        if (input.parentNode) input.focus();
                    }
                } else {
                    input.value = '';
                    if (input.parentNode) input.focus();
                    input.removeEventListener('keypress', currentHandler);
                    if (selected_mode === '2') {
                        prompt.innerText = 'Nombre Jugador 2:';
                        button.onclick = handlePlayer2Input;
                        currentHandler = (e) => {
                            if (e.key === 'Enter') button.click();
                        };
                        input.addEventListener('keypress', currentHandler);
                    } else if (selected_mode === '3') {
                        selected_player2 = 'IA';
                        console.log('create_game_ui: Assigned Player 2: IA');
                        if (input.parentNode) container.removeChild(input);
                        if (button.parentNode) container.removeChild(button);
                        prompt.innerText = 'Seleccione la dificultad:';
                        const buttonContainer = document.createElement('div');
                        buttonContainer.className = 'button-group';
                        buttonContainer.style.margin = '10px';
                        ['Fácil', 'Normal', 'Difícil'].forEach((label, index) => {
                            const diffButton = document.createElement('button');
                            diffButton.className = 'game-button';
                            diffButton.innerText = label;
                            diffButton.style.padding = '8px 16px';
                            diffButton.style.fontSize = '16px';
                            diffButton.style.cursor = 'pointer';
                            diffButton.style.margin = '5px';
                            diffButton.onclick = () => {
                                selected_difficulty = ['facil', 'normal', 'dificil'][index];
                                console.log('create_game_ui: Difficulty selected:', selected_difficulty);
                                container.removeChild(buttonContainer);
                                if (!input.parentNode) container.appendChild(input);
                                if (!button.parentNode) container.appendChild(button);
                                button.style.display = 'none';
                                prompt.innerText = 'Ingresa una letra o la palabra completa:';
                                if (input.parentNode) input.focus();
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
                            };
                            buttonContainer.appendChild(diffButton);
                        });
                        container.appendChild(buttonContainer);
                    } else {
                        prompt.innerText = 'Ingresa una letra o la palabra completa:';
                        button.style.display = 'none';
                        if (input.parentNode) input.focus();
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
            }

            async function handleSessionIdInput() {
                const sessionId = input.value.trim().toLowerCase();
                console.log('create_game_ui: Session ID input:', sessionId);
                if (!sessionId) {
                    console.warn('create_game_ui: Empty session ID');
                    output.innerText = 'Ingresa un ID de sesión válido.';
                    output.style.color = 'red';
                    input.value = '';
                    if (input.parentNode) input.focus();
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
                            if (input.parentNode) input.focus();
                            return;
                        }
                        sessionState = snapshot.val();
                        if (!sessionState.secretWord || !sessionState.initialized) {
                            console.warn('create_game_ui: Invalid session state', sessionState);
                            output.innerText = 'La sesión tiene un estado inválido. Intenta con otro ID.';
                            output.style.color = 'red';
                            input.value = '';
                            if (input.parentNode) input.focus();
                            return;
                        }
                        break;
                    }
                    if (!sessionState) {
                        console.error('create_game_ui: Failed to retrieve valid session state');
                        output.innerText = 'Error al verificar la sesión. Intenta de nuevo.';
                        output.style.color = 'red';
                        input.value = '';
                        if (input.parentNode) input.focus();
                        return;
                    }
                    selected_sessionId = sessionId;
                    selected_player1 = sessionState.player1 || null;
                    prompt.innerText = 'Nombre Jugador 2:';
                    input.value = '';
                    if (input.parentNode) input.focus();
                    input.removeEventListener('keypress', currentHandler);
                    button.onclick = handlePlayer2Input;
                    currentHandler = (e) => {
                        if (e.key === 'Enter') button.click();
                    };
                    input.addEventListener('keypress', currentHandler);
                } catch (error) {
                    console.error('create_game_ui: Error checking session ID:', error);
                    output.innerText = 'Error al verificar el ID de sesión. Intenta de nuevo.';
                    output.style.color = 'red';
                    input.value = '';
                    if (input.parentNode) input.focus();
                }
            }

            async function handlePlayer2Input() {
                selected_player2 = format_name(input.value.trim()) || 'Jugador 2';
                console.log('create_game_ui: Formatted Player 2 name:', selected_player2);
                if (selected_gameType === 'remoto') {
                    if (!selected_sessionId) {
                        console.error('create_game_ui: selected_sessionId is undefined');
                        output.innerText = 'Error: ID de sesión no definido.';
                        output.style.color = 'red';
                        input.value = '';
                        if (input.parentNode) input.focus();
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
                                if (input.parentNode) input.focus();
                                return;
                            }
                            sessionState = snapshot.val();
                            if (!sessionState.secretWord || !sessionState.initialized) {
                                console.warn('create_game_ui: Invalid session state for Player 2', sessionState);
                                output.innerText = 'La sesión tiene un estado inválido. Intenta con otro ID.';
                                output.style.color = 'red';
                                input.value = '';
                                if (input.parentNode) input.focus();
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
                                if (input.parentNode) input.focus();
                                return;
                            }
                            if (sessionState.player2) {
                                console.warn('create_game_ui: Session already has Player 2', selected_sessionId);
                                output.innerText = 'La sesión ya tiene un segundo jugador.';
                                output.style.color = 'red';
                                input.value = '';
                                if (input.parentNode) input.focus();
                                return;
                            }
                            break;
                        }
                        if (!sessionState) {
                            console.error('create_game_ui: Failed to retrieve valid session state for Player 2');
                            output.innerText = 'Error al verificar la sesión. Intenta de nuevo.';
                            output.style.color = 'red';
                            input.value = '';
                            if (input.parentNode) input.focus();
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
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        }
                        if (!success) {
                            console.error('handlePlayer2Input: Failed to update Firebase');
                            output.innerText = 'Error al registrar el Jugador 2. Intenta de nuevo.';
                            output.style.color = 'red';
                            input.value = '';
                            if (input.parentNode) input.focus();
                            return;
                        }
                        output.innerText = `Unido al juego con ID: ${selected_sessionId}`;
                        output.style.color = 'black';
                        input.removeEventListener('keypress', currentHandler);
                        prompt.innerText = 'Ingresa una letra o la palabra completa:';
                        button.style.display = 'none';
                        if (input.parentNode) input.focus();
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
                        console.error('create_game_ui: Error updating player 2:', error);
                        output.innerText = 'Error al registrar el Jugador 2. Intenta de nuevo.';
                        output.style.color = 'red';
                        input.value = '';
                        if (input.parentNode) input.focus();
                    }
                } else {
                    input.value = '';
                    if (input.parentNode) input.focus();
                    input.removeEventListener('keypress', currentHandler);
                    prompt.innerText = 'Ingresa una letra o la palabra completa:';
                    button.style.display = 'none';
                    if (input.parentNode) input.focus();
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

            currentHandler = (e) => {
                if (e.key === 'Enter') button.click();
            };
            button.onclick = handleModeInput;
            input.addEventListener('keypress', currentHandler);
            if (input.parentNode) input.focus();
        });
    } finally {
        isCreatingUI = false;
        console.log('create_game_ui: UI creation completed');
    }
}

async function process_guess(player, guessed_letters, secret_word, tries, scores, lastCorrectWasVowel, used_wrong_letters, used_wrong_words, vowels, max_score, difficulty, mode, prompt, input, output, button, delay, display_feedback, sessionId = null) {
    console.log('process_guess: Starting for', player, {
        max_score,
        score: scores[player] || 0,
        guessed_letters: Array.from(guessed_letters),
        retried: 0,
        difficulty,
        mode,
        sessionId
    });
    let retried = 0;
    let timeout_retries = 0;
    const max_retries = 3;
    const max_timeout_retries = 3;
    let penalizo = false;
    let restar_intento = true;
    let feedback, feedback_color;
    let guess = '';

    if (!tries[player]) tries[player] = 5;
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
            feedback = `Error en la IA: ${err.message || 'Unknown error'}. Turno perdido.`;
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

    if (mode === '3' && player === 'IA') {
        display_feedback(`IA está pensando...`, 'blue', player);
        await delay(1000);
        guess = await get_ai_guess_wrapper();
        if (!guess) return { penalizo, tries, scores, guessed_letters, word_guessed: false };
    } else {
        while (timeout_retries < max_timeout_retries) {
            const result = await get_human_guess();
            if (result === null) continue;
            if (result === false) return { penalizo, tries, scores, guessed_letters, word_guessed: false };
            guess = result;
            break;
        }
        if (timeout_retries >= max_timeout_retries) {
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

        console.log('process_guess: Processing guess', JSON.stringify({ player, guess, normalized_guess: normalizar(guess), normalized_secret }));

        if (guess.length === 1 && lastCorrectWasVowel[player] && vowels.has(guess)) {
            display_feedback(`Inválido. Ingrese una consonante.`, 'red', player);
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
                display_feedback(feedback, feedback_color, player);
                break;
            }

            if (player === 'IA') {
                guess = await get_ai_guess_wrapper(true);
                if (!guess) break;
            } else {
                const result = await get_human_guess();
                if (result === null) continue;
                if (result === false) return { penalizo, tries, scores, guessed_letters, word_guessed: false };
                guess = result;
            }
            continue;
        }

        if (guess.length === 1 && !secret_word.includes(guess) && used_wrong_letters.has(guess)) {
            if (retried < max_retries - 1) {
                display_feedback(`Advertencia: '${guess}' ya intentada. Intenta de nuevo.`, 'orange', player);
                retried++;
                console.log('process_guess: Repeated wrong letter', JSON.stringify({ player, guess, retried }));
                if (player === 'IA') {
                    guess = await get_ai_guess_wrapper();
                    if (!guess) break;
                } else {
                    const result = await get_human_guess();
                    if (result === null) continue;
                    if (result === false) return { penalizo, tries, scores, guessed_letters, word_guessed: false };
                    guess = result;
                }
                continue;
            }
            penalizo = true;
            if (scores[player] > 0) {
                const penalty = Math.min(1, scores[player]);
                feedback = `'${guess}' ya intentada. (-${penalty} punto)`;
                feedback_color = 'red';
                scores[player] = Math.max(0, scores[player] - penalty);
                console.log('process_guess: Repeated wrong letter penalty', JSON.stringify({ player, penalty, new_score: scores[player] }));
            } else {
                feedback = `'${guess}' ya intentada.`;
                feedback_color = 'red';
            }
            display_feedback(feedback, feedback_color, player);
            break;
        } else if (guess.length === 1 && secret_word.includes(guess) && guessed_letters.has(guess)) {
            if (retried < max_retries - 1) {
                display_feedback(`Advertencia: '${guess}' ya adivinada. Intenta de nuevo.`, 'orange', player);
                retried++;
                console.log('process_guess: Repeated correct letter', JSON.stringify({ player, guess, retried }));
                if (player === 'IA') {
                    guess = await get_ai_guess_wrapper();
                    if (!guess) break;
                } else {
                    const result = await get_human_guess();
                    if (result === null) continue;
                    if (result === false) return { penalizo, tries, scores, guessed_letters, word_guessed: false };
                    guess = result;
                }
                continue;
            }
            penalizo = true;
            if (scores[player] > 0) {
                const penalty = Math.min(1, scores[player]);
                feedback = `'${guess}' ya adivinada. (-${penalty} punto)`;
                feedback_color = 'red';
                scores[player] = Math.max(0, scores[player] - penalty);
                console.log('process_guess: Repeated correct letter penalty', JSON.stringify({ player, penalty, new_score: scores[player] }));
            } else {
                feedback = `'${guess}' ya adivinada.`;
                feedback_color = 'red';
            }
            display_feedback(feedback, feedback_color, player);
            break;
        } else if (guess.length === secret_word.length && normalizar(guess) !== normalized_secret && used_wrong_words.has(normalizar(guess))) {
            if (retried < max_retries - 1) {
                display_feedback(`Advertencia: '${guess}' ya intentada. Intenta de nuevo.`, 'orange', player);
                retried++;
                console.log('process_guess: Repeated wrong word', JSON.stringify({ player, guess, retried }));
                if (player === 'IA') {
                    guess = await get_ai_guess_wrapper();
                    if (!guess) break;
                } else {
                    const result = await get_human_guess();
                    if (result === null) continue;
                    if (result === false) return { penalizo, tries, scores, guessed_letters, word_guessed: false };
                    guess = result;
                }
                continue;
            }
            penalizo = true;
            if (scores[player] > 0) {
                const penalty = Math.min(2, scores[player]);
                feedback = `'${guess}' ya intentada. (-${penalty} puntos)`;
                feedback_color = 'red';
                scores[player] = Math.max(0, scores[player] - penalty);
                console.log('process_guess: Repeated wrong word penalty', JSON.stringify({ player, penalty, new_score: scores[player] }));
            } else {
                feedback = `'${guess}' ya intentada.`;
                feedback_color = 'red';
            }
            display_feedback(feedback, feedback_color, player);
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
                console.log('process_guess: Word guess processed', JSON.stringify({ guess, letras_nuevas: Array.from(letras_nuevas), score_before, score_after: scores[player] }));
            }
        } else {
            const feedback_data = get_guess_feedback(guess, secret_word, scores[player]);
            feedback = feedback_data.join('\n');
            feedback_color = feedback_data.color;
            if (secret_word.includes(guess) && !guessed_letters.has(guess)) {
                scores[player] = Math.min(max_score, scores[player] + secret_word.split('').filter(l => l === guess).length);
                guessed_letters.add(guess);
                lastCorrectWasVowel[player] = vowels.has(guess);
                console.log('process_guess: Correct letter guess', JSON.stringify({ player, guess, score_before, score_after: scores[player] }));
            } else if (!secret_word.includes(guess)) {
                used_wrong_letters.add(guess);
                if (scores[player] > 0) {
                    const penalty = Math.min(1, scores[player]);
                    scores[player] = Math.max(0, scores[player] - penalty);
                    console.log('process_guess: Wrong letter penalty', JSON.stringify({ player, penalty, score_before, score_after: scores[player] }));
                }
                lastCorrectWasVowel[player] = false;
            }
        }

        if (feedback && feedback_color) {
            display_feedback(feedback, feedback_color, player, true);
            await delay(500);
        }

        if (restar_intento && !penalizo) {
            tries[player]--;
        }

        // ADDED: Sync state to Firebase for remote mode
        if (mode === '2' && sessionId) {
            try {
                const sessionRef = ref(database, `games/${sessionId}`);
                const updateData = {
                    guessedLetters: Array.from(guessed_letters),
                    tries: { ...tries },
                    scores: { ...scores },
                    currentPlayer: player // Update currentPlayer for turn tracking
                };
                await update(sessionRef, updateData);
                console.log('process_guess: Synced state to Firebase', { sessionId, updateData });
            } catch (error) {
                console.error('process_guess: Error syncing to Firebase', error);
                display_feedback('Error de sincronización con la base de datos.', 'red', null, true);
            }
        }

        console.log('process_guess: Ending for', player, JSON.stringify({
            penalizo,
            tries: tries[player],
            score: scores[player],
            guessed_letters: Array.from(guessed_letters),
            word_guessed: normalizar(guess) === normalized_secret
        }));
        return { penalizo, tries, scores, guessed_letters, word_guessed: normalizar(guess) === normalized_secret };
    }
}

async function start_game(mode, players, output, container, prompt, input, button, difficulty = null, games_played = 0, total_scores = null, wins = null, gameType = 'local', sessionId = null) {
    console.log('start_game: Loaded version 2025-06-26-v9.13', { mode, players, difficulty, games_played, gameType, sessionId });
    if (!players || players.some(p => !p)) {
        output.innerText = 'Error: Jugadores no definidos.';
        console.error('start_game: Invalid players');
        return;
    }
    if (!container || !prompt || !output || !input) {
        console.error('start_game: Missing required DOM elements', { container, prompt, output, input });
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

    function display_feedback(message, color, player, append = false) {
        const formatted_feedback = player ? message.replace(player, `<strong>${player}</strong>`) : message;
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

    let loadingMessage;
    try {
        Array.from(container.children).forEach(el => {
            container.removeChild(el);
        });
        container.appendChild(prompt);
        container.appendChild(output);
        button.style.display = 'none';
        prompt.innerText = '';
        output.innerText = '';
        loadingMessage = document.createElement('p');
        loadingMessage.innerText = 'Generando palabra secreta';
        loadingMessage.style.fontSize = '16px';
        loadingMessage.style.color = 'blue';
        container.appendChild(loadingMessage);
        console.log('start_game: Showing loading message', { inputAttached: !!input.parentNode });

        let secret_word;
        if (mode === '2' && gameType === 'remoto' && sessionId) {
            const sessionRef = ref(database, `games/${sessionId}`);
            const snapshot = await get(sessionRef);
            if (snapshot.exists()) {
                secret_word = snapshot.val().secretWord;
                console.log('start_game: Retrieved secret word from Firebase', secret_word);
            } else {
                console.error('start_game: Session not found', sessionId);
                output.innerText = 'Error: Sesión no encontrada.';
                output.style.color = 'red';
                return;
            }
        } else {
            secret_word = await get_secret_word();
        }

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
        console.log('start_game: Game completed', { games_played, games_to_play, total_scores: accumulated_scores, wins: accumulated_wins });
    } catch (err) {
        console.error('start_game: Error during game setup', err);
        output.innerText = 'Error al iniciar el juego.';
        if (loadingMessage && loadingMessage.parentNode) {
            container.removeChild(loadingMessage);
        }
    }
}

async function play_game(loadingMessage, secret_word, mode, players, output, container, prompt, input, button, difficulty, games_played, games_to_play, total_scores, wins, delay, display_feedback, gameType = 'local', sessionId = null) {
    const provided_secret_word = secret_word || await get_secret_word();
    console.log('play_game: Secret word:', provided_secret_word, JSON.stringify({ games_played, games_to_play, total_scores, wins, gameType, sessionId }));
    const guessed_letters = new Set();
    const used_wrong_letters = new Set();
    const used_wrong_words = new Set();
    const max_score = 10;
    const total_tries = Math.max(1, mode === '1' ? provided_secret_word.length - 2 : Math.floor(provided_secret_word.length / 2));
    const tries = Object.fromEntries(players.map(p => [p, total_tries]));
    const scores = Object.fromEntries(players.map(p => [p, 0]));
    const lastCorrectWasVowel = Object.fromEntries(players.map(p => [p, false]));
    const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
    let current_player_idx = games_played % players.length;

    // ADDED: Initialize Firebase state for remote mode
    if (mode === '2' && gameType === 'remoto' && sessionId) {
        try {
            const sessionRef = ref(database, `games/${sessionId}`);
            const snapshot = await get(sessionRef);
            if (snapshot.exists()) {
                const gameState = snapshot.val();
                if (gameState.guessedLetters && Array.isArray(gameState.guessedLetters)) {
                    gameState.guessedLetters.forEach(letter => {
                        if (letter !== '__init__') guessed_letters.add(letter);
                    });
                }
                if (gameState.tries) {
                    Object.assign(tries, gameState.tries);
                    delete tries.init;
                }
                if (gameState.scores) {
                    Object.assign(scores, gameState.scores);
                    delete scores.init;
                }
                if (gameState.currentPlayer && players.includes(gameState.currentPlayer)) {
                    current_player_idx = players.indexOf(gameState.currentPlayer);
                }
                console.log('play_game: Initialized from Firebase', { guessed_letters: Array.from(guessed_letters), tries, scores, current_player_idx });
            }
        } catch (error) {
            console.error('play_game: Error initializing Firebase state', error);
            output.innerText = 'Error al cargar el estado del juego. Intenta de nuevo.';
            output.style.color = 'red';
            return;
        }
    }

    let game_info, player_info, progress;
    try {
        if (loadingMessage && loadingMessage.parentNode) {
            container.removeChild(loadingMessage);
            console.log('play_game: Removed loading message');
        }
        const existing_button_groups = container.querySelectorAll('div');
        existing_button_groups.forEach(group => {
            if (group.style.display === 'inline-block' || group.style.margin === '10px') {
                container.removeChild(group);
                console.log('play_game: Removed existing button group');
            }
        });
        if (!prompt.parentNode) container.appendChild(prompt);
        if (!output.parentNode) container.appendChild(output);
        Array.from(container.children).forEach(el => {
            if (el !== prompt && el !== output && el !== input) {
                container.removeChild(el);
            }
        });
        container.appendChild(prompt);
        container.appendChild(input);
        button.style.display = 'none';
        container.appendChild(output);
        prompt.innerText = 'Ingresa una letra o la palabra completa:';
        input.value = '';
        if (input.parentNode) input.focus();
        game_info = document.createElement('p');
        game_info.innerHTML = `--- Juego ${games_played + 1} de ${games_to_play} ---<br>Palabra secreta: ${provided_secret_word.length} letras.<br>Intentos: ${total_tries}. Puntaje máximo: ${max_score}.` +
            (mode === '3' ? `<br>Dificultad: ${difficulty || 'N/A'}` : '');
        player_info = document.createElement('p');
        player_info.id = 'player_info';
        progress = document.createElement('p');
        container.insertBefore(game_info, prompt);
        container.insertBefore(player_info, prompt);
        container.insertBefore(progress, prompt);
        output.innerHTML = '';
        console.log('play_game: UI initialized');
        update_ui();
    } catch (err) {
        console.error('play_game: Error setting up UI', err);
        output.innerText = 'Error al configurar la interfaz.';
        return;
    }

    // Continuation of play_game function
    function update_ui() {
        const player = players[current_player_idx];
        const other_player = players[(current_player_idx + 1) % players.length] || null;
        try {
            if (mode === '1') {
                player_info.innerHTML = `<strong>${player}</strong>: Intentos: ${tries[player]} | Puntaje: ${scores[player]}`;
            } else {
                player_info.innerHTML = `Turno de <strong>${player}</strong>: Intentos: ${tries[player]} | Puntaje: ${scores[player]}` +
                    (other_player ? `<br><strong>${other_player}</strong>: Intentos: ${tries[other_player]} | Puntaje: ${scores[other_player]}` : '');
            }
            progress.innerText = `Palabra: ${formato_palabra(normalizar(provided_secret_word).split('').map(l => guessed_letters.has(l) ? l : "_"))}`;
            prompt.innerText = 'Ingresa una letra o la palabra completa:';
            if (input.parentNode) {
                input.value = '';
                input.focus();
                console.log('update_ui: Input focused', { inputId: input.id || 'no-id' });
            }
        } catch (err) {
            console.error('update_ui: Error updating UI', err);
            output.innerText = 'Error al actualizar la interfaz.';
            output.style.color = 'red';
        }
    }

    let shouldExitLoop = false;
    while (games_played < games_to_play && !shouldExitLoop) {
        const player = players[current_player_idx];
        let can_play = true;

        // ADDED: Check turn for remote mode
        if (mode === '2' && gameType === 'remoto' && sessionId) {
            try {
                const sessionRef = ref(database, `games/${sessionId}`);
                const snapshot = await get(sessionRef);
                if (!snapshot.exists()) {
                    console.warn('play_game: Session deleted', sessionId);
                    output.innerText = 'Sesión terminada. El juego ha finalizado.';
                    output.style.color = 'red';
                    input.style.display = 'none';
                    button.style.display = 'inline-block';
                    button.innerText = 'Volver al menú';
                    button.onclick = () => main();
                    return;
                }
                const gameState = snapshot.val();
                if (gameState.currentPlayer !== player) {
                    console.log('play_game: Not player’s turn', { player, currentPlayer: gameState.currentPlayer });
                    can_play = false;
                    prompt.innerText = `Esperando el turno de ${gameState.currentPlayer}...`;
                    input.style.display = 'none';
                    output.innerHTML += `<br><span style="color: blue">Esperando a que ${gameState.currentPlayer} juegue...</span>`;
                    // Listen for state changes
                    const unsubscribe = onValue(sessionRef, async (newSnapshot) => {
                        const newState = newSnapshot.val();
                        if (!newSnapshot.exists()) {
                            console.warn('play_game: Session deleted during wait', sessionId);
                            output.innerText = 'Sesión terminada. El juego ha finalizado.';
                            output.style.color = 'red';
                            input.style.display = 'none';
                            button.style.display = 'inline-block';
                            button.innerText = 'Volver al menú';
                            button.onclick = () => main();
                            unsubscribe();
                            return;
                        }
                        if (newState.currentPlayer === player) {
                            console.log('play_game: Player’s turn detected', { player });
                            unsubscribe();
                            input.style.display = 'inline-block';
                            input.focus();
                            update_ui();
                            // Trigger next turn
                            await play_turn();
                        } else {
                            // Sync local state
                            guessed_letters.clear();
                            if (newState.guessedLetters && Array.isArray(newState.guessedLetters)) {
                                newState.guessedLetters.forEach(l => {
                                    if (l !== '__init__') guessed_letters.add(l);
                                });
                            }
                            Object.assign(tries, newState.tries || {});
                            delete tries.init;
                            Object.assign(scores, newState.scores || {});
                            delete scores.init;
                            update_ui();
                        }
                    }, (error) => {
                        console.error('play_game: Firebase snapshot error', error);
                        output.innerText = 'Error de sincronización. El juego ha finalizado.';
                        output.style.color = 'red';
                        input.style.display = 'none';
                        button.style.display = 'inline-block';
                        button.innerText = 'Volver al menú';
                        button.onclick = () => main();
                        unsubscribe();
                    });
                }
            } catch (error) {
                console.error('play_game: Error checking turn', error);
                output.innerText = 'Error de sincronización. Intenta de nuevo.';
                output.style.color = 'red';
                return;
            }
        }

        async function play_turn() {
            if (!can_play) return;

            console.log('play_game: Starting turn for', player, {
                tries: tries[player],
                score: scores[player],
                guessed_letters: Array.from(guessed_letters)
            });

            update_ui();
            const result = await process_guess(
                player,
                guessed_letters,
                provided_secret_word,
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
                display_feedback,
                sessionId
            );

            const { penalizo, word_guessed } = result;

            if (penalizo && tries[player] > 0 && !word_guessed) {
                tries[player]--;
                console.log('play_game: Penalized try deducted', { player, tries_left: tries[player] });
            }

            // Check win condition
            const all_letters_guessed = normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l));
            if (word_guessed || all_letters_guessed) {
                total_scores[player] += scores[player];
                wins[player] += 1;
                display_feedback(`¡${player} gana! Palabra: ${provided_secret_word}`, 'green', player);
                console.log('play_game: Player won', { player, score: scores[player], total_score: total_scores[player], wins: wins[player] });
                games_played++;
                if (mode === '2' && gameType === 'remoto' && sessionId) {
                    try {
                        const sessionRef = ref(database, `games/${sessionId}`);
                        await update(sessionRef, {
                            status: 'finished',
                            winner: player,
                            finalScores: { ...scores },
                            finalTries: { ...tries },
                            guessedLetters: Array.from(guessed_letters)
                        });
                        console.log('play_game: Game finished, updated Firebase', { sessionId, winner: player });
                    } catch (error) {
                        console.error('play_game: Error updating Firebase on win', error);
                        display_feedback('Error de sincronización al finalizar el juego.', 'red', null, true);
                    }
                }
                await delay(2000);
                shouldExitLoop = true;
                return;
            }

            // Check loss condition
            if (tries[player] <= 0) {
                const other_player = players.find(p => p !== player) || players[0];
                total_scores[other_player] += scores[other_player] || 0;
                if (mode !== '1') wins[other_player] += 1;
                display_feedback(`¡${player} pierde! Se acabaron los intentos. Palabra: ${provided_secret_word}`, 'red', player);
                console.log('play_game: Player lost', { player, tries: tries[player], total_score: total_scores[player] });
                games_played++;
                if (mode === '2' && gameType === 'remoto' && sessionId) {
                    try {
                        const sessionRef = ref(database, `games/${sessionId}`);
                        await update(sessionRef, {
                            status: 'finished',
                            winner: other_player,
                            finalScores: { ...scores },
                            finalTries: { ...tries },
                            guessedLetters: Array.from(guessed_letters)
                        });
                        console.log('play_game: Game finished, updated Firebase', { sessionId, winner: other_player });
                    } catch (error) {
                        console.error('play_game: Error updating Firebase on loss', error);
                        display_feedback('Error de sincronización al finalizar el juego.', 'red', null, true);
                    }
                }
                await delay(2000);
                shouldExitLoop = true;
                return;
            }

            // Switch to next player
            current_player_idx = (current_player_idx + 1) % players.length;
            if (mode === '2' && gameType === 'remoto' && sessionId) {
                try {
                    const sessionRef = ref(database, `games/${sessionId}`);
                    await update(sessionRef, { currentPlayer: players[current_player_idx] });
                    console.log('play_game: Updated currentPlayer in Firebase', { sessionId, newCurrentPlayer: players[current_player_idx] });
                } catch (error) {
                    console.error('play_game: Error updating currentPlayer', error);
                    display_feedback('Error de sincronización al cambiar de turno.', 'red', null, true);
                }
            }
            await play_turn();
        }

        if (can_play) {
            await play_turn();
        }
    }

    if (games_played >= games_to_play) {
        container.innerHTML = '';
        container.appendChild(prompt);
        container.appendChild(output);
        container.appendChild(button);
        button.style.display = 'inline-block';
        button.innerText = 'Volver al menú';
        input.style.display = 'none';
        prompt.innerText = '';
        let winner = Object.keys(wins).reduce((a, b) => wins[a] > wins[b] ? a : b, players[0]);
        if (mode === '1') {
            output.innerHTML = `Juego terminado. Puntaje final: <strong>${players[0]}</strong>: ${total_scores[players[0]]}`;
        } else {
            output.innerHTML = `Juego terminado.<br>` +
                players.map(p => `<strong>${p}</strong>: ${total_scores[p]} puntos, ${wins[p]} victoria(s)`).join('<br>') +
                `<br>Ganador: <strong>${winner}</strong>`;
        }
        output.style.color = 'black';
        console.log('play_game: Game series completed', { total_scores, wins, winner });

        if (mode === '2' && gameType === 'remoto' && sessionId) {
            try {
                const sessionRef = ref(database, `games/${sessionId}`);
                await remove(sessionRef);
                console.log('play_game: Cleaned up Firebase session', sessionId);
            } catch (error) {
                console.error('play_game: Error cleaning up Firebase session', error);
                output.innerHTML += '<br>Error al limpiar la sesión de juego.';
                output.style.color = 'red';
            }
        }

        button.onclick = () => main();
        return;
    }

    if (mode === '2' && gameType === 'remoto' && sessionId) {
        // Continue listening for session termination
        const sessionRef = ref(database, `games/${sessionId}`);
        const unsubscribe = onValue(sessionRef, async (snapshot) => {
            if (!snapshot.exists()) {
                console.warn('play_game: Session deleted', sessionId);
                output.innerText = 'Sesión terminada por el otro jugador.';
                output.style.color = 'red';
                input.style.display = 'none';
                button.style.display = 'inline-block';
                button.innerText = 'Volver al menú';
                button.onclick = () => main();
                unsubscribe();
            } else if (snapshot.val().status === 'finished') {
                const gameState = snapshot.val();
                output.innerHTML = `Juego terminado.<br>` +
                    players.map(p => `<strong>${p}</strong>: ${gameState.finalScores?.[p] || 0} puntos`).join('<br>') +
                    `<br>Ganador: <strong>${gameState.winner}</strong>`;
                output.style.color = 'black';
                input.style.display = 'none';
                button.style.display = 'inline-block';
                button.innerText = 'Volver al menú';
                button.onclick = () => main();
                unsubscribe();
                try {
                    await remove(sessionRef);
                    console.log('play_game: Cleaned up Firebase session after finish', sessionId);
                } catch (error) {
                    console.error('play_game: Error cleaning up Firebase session', error);
                }
            }
        }, (error) => {
            console.error('play_game: Firebase snapshot error', error);
            output.innerText = 'Error de sincronización. El juego ha finalizado.';
            output.style.color = 'red';
            input.style.display = 'none';
            button.style.display = 'inline-block';
            button.innerText = 'Volver al menú';
            button.onclick = () => main();
            unsubscribe();
        });
    } else {
        // Start next game if not in remote mode
        await start_game(
            mode,
            players,
            output,
            container,
            prompt,
            input,
            button,
            difficulty,
            games_played,
            total_scores,
            wins,
            gameType,
            sessionId
        );
    }
}

async function main() {
    console.log('main: Starting, Loaded version 2025-06-26-v9.13');
    try {
        const ui = await create_game_ui();
        if (!ui) {
            console.error('main: Failed to create UI');
            return;
        }
        const { mode, player1, player2, prompt, input, button, output, container, difficulty, gameType, sessionId } = ui;
        console.log('main: UI created', { mode, player1, player2, difficulty, gameType, sessionId });

        const players = mode === '1' ? [player1] : [player1, player2];
        await start_game(mode, players, output, container, prompt, input, button, difficulty, 0, null, null, gameType, sessionId);
    } catch (err) {
        console.error('main: Error in main execution', err);
        const output = document.querySelector('.game-output') || document.createElement('span');
        output.innerText = 'Error al iniciar el juego. Por favor, recarga la página.';
        output.style.color = 'red';
        document.body.appendChild(output);
    }
}

// Start the game
main();