// Transcrypt'ed from Python, 2025-06-16
var __name__ = '__main__';

// ADDED: Global game state to prevent UI resets during active game
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

// Your web app's Firebase configuration
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
const database = window.database;

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
    if (!name || name.trim().length < 2) return ''; // Require at least 2 characters
    const trimmed = name.trim().replace(/\s+/g, ' ');
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
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
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[match]);
}

async function get_guess(guessed_letters, secret_word, prompt, input, output, button) {
    if (!prompt || !input || !output) {
        console.error('get_guess: Missing required DOM elements', { prompt, input, output });
        throw new Error('Missing required DOM elements');
    }

    // Assign a unique ID to the input for tracking
    input.id = input.id || `guess-input-${Date.now()}`; // Ensure unique and consistent ID

    const normalized_secret = normalizar(secret_word);
    const min_guesses_for_word = secret_word.length < 5 ? 1 : 2;
    const permitir_palabra = guessed_letters.size >= min_guesses_for_word || Array.from(guessed_letters).some(l => secret_word.split('').filter(x => x === l).length > 1);
    prompt.innerText = permitir_palabra ? `Ingresa una letra o la palabra completa:` : `Ingresa una letra:`;

    console.log('get_guess: Starting, Loaded version 2025-06-21-v9.22', {
        prompt: prompt.innerText,
        inputExists: !!input?.parentNode,
        buttonExists: !!button?.parentNode,
        inputValue: input?.value,
        inputId: input?.id
    });

    // Hide the Enviar button
    if (button && button.parentNode) {
        button.style.display = 'none';
        console.log('get_guess: Enviar button hidden for guessing');
    }

    try {
        input.value = ''; // Clear input initially
        output.innerHTML = ''; // Clear previous feedback
        if (input.parentNode) {
            input.disabled = false;
            input.focus();
            console.log('get_guess: Input focused', { inputValue: input.value, inputId: input.id });
        } else {
            console.warn('get_guess: Input not in DOM, appending to container');
            const container = document.querySelector('.game-container');
            if (container) {
                container.appendChild(input);
                input.disabled = false;
                input.focus();
                console.log('get_guess: Input re-appended to container', { inputId: input.id });
            } else {
                console.error('get_guess: Game container not found');
                throw new Error('Game container not found');
            }
        }
    } catch (err) {
        console.error('get_guess: Error setting input focus', err);
        throw new Error('Invalid input element');
    }

    return new Promise((resolve, reject) => {
        let emptyRetries = 0;
        const maxEmptyRetries = 3;
        let enterHandler, inputHandler;

        const handleGuess = (source, guessValue) => {
            console.log('get_guess: handleGuess called', { source, guessValue, currentInputValue: input.value, inputId: input.id, eventTime: Date.now() });
            const rawGuess = guessValue || input.value;
            const trimmedGuess = rawGuess.trim();
            const normalizedGuess = normalizar(trimmedGuess);
            console.log('get_guess: Processing guess', { rawGuess, trimmedGuess, normalizedGuess, secret_word, normalized_secret });

            // Clear feedback
            output.innerHTML = '';

            if (!trimmedGuess) {
                emptyRetries++;
                const feedback = emptyRetries < maxEmptyRetries
                    ? `Entrada vacía. Ingresa una letra o palabra válida. Intentos restantes: ${maxEmptyRetries - emptyRetries}.`
                    : `Demasiados intentos vacíos. Pierdes el turno.`;
                output.innerHTML = `<span style="color: orange">${feedback}</span>`;
                console.log('get_guess: Empty input feedback displayed', { emptyRetries, inputId: input.id });
                try {
                    output.scrollIntoView({ behavior: 'smooth' });
                } catch (err) {
                    console.error('get_guess: Error scrolling output', err);
                }
                if (emptyRetries >= maxEmptyRetries) {
                    cleanup();
                    console.log('get_guess: Resolving with null after max empty retries', { inputId: input.id });
                    resolve(null);
                    return;
                }
                input.value = '';
                if (input.parentNode) {
                    try {
                        input.disabled = false;
                        input.focus();
                        console.log('get_guess: Input refocused after empty input', { inputId: input.id });
                    } catch (err) {
                        console.error('get_guess: Error refocusing input', err);
                    }
                }
                return;
            }

            // Validate normalized guess
            if (permitir_palabra && normalizedGuess.length === normalized_secret.length && /^[a-záéíóúüñ]+$/.test(normalizedGuess)) {
                cleanup();
                console.log('get_guess: Valid word guess', { guess: normalizedGuess, inputId: input.id });
                resolve(normalizedGuess);
                return;
            } else if (normalizedGuess.length === 1 && /^[a-záéíóúüñ]+$/.test(normalizedGuess)) {
                cleanup();
                console.log('get_guess: Valid letter guess', { guess: normalizedGuess, inputId: input.id });
                resolve(normalizedGuess);
                return;
            } else {
                output.innerHTML = `<span style="color: red">Entrada inválida. Ingresa una letra o palabra válida (solo letras, sin caracteres especiales).</span>`;
                console.log('get_guess: Invalid input feedback displayed', { inputId: input.id });
                try {
                    output.scrollIntoView({ behavior: 'smooth' });
                } catch (err) {
                    console.error('get_guess: Error scrolling output', err);
                }
                input.value = '';
                if (input.parentNode) {
                    try {
                        input.disabled = false;
                        input.focus();
                        console.log('get_guess: Input refocused after invalid input', { inputId: input.id });
                    } catch (err) {
                        console.error('get_guess: Error refocusing input', err);
                    }
                }
                return;
            }
        };

        enterHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('get_guess: Enter pressed', { inputValue: input.value, inputId: input.id, eventTime: Date.now() });
                handleGuess('enter', input.value);
            }
        };

        inputHandler = (e) => {
            console.log('get_guess: Input changed', { inputValue: e.target.value, inputId: input.id, eventTime: Date.now() });
        };

        const cleanup = () => {
            try {
                if (input && enterHandler) {
                    input.removeEventListener('keypress', enterHandler);
                    input.removeEventListener('input', inputHandler);
                    console.log('get_guess: Event listeners cleaned up', { inputId: input.id });
                }
            } catch (e) {
                console.error('get_guess: Error cleaning up listeners', e);
            }
        };

        try {
            input.addEventListener('keypress', enterHandler);
            input.addEventListener('input', inputHandler);
            console.log('get_guess: Keypress and input listeners attached', { inputId: input.id });
        } catch (err) {
            console.error('get_guess: Error attaching input listener', err);
            cleanup();
            reject(new Error('Failed to attach input listener'));
        }

        // Monitor for input removal
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (!input.parentNode) {
                    console.warn('get_guess: Input removed from DOM, attempting to recover', { inputId: input.id, mutation });
                    cleanup();
                    const container = document.querySelector('.game-container');
                    if (container) {
                        container.appendChild(input);
                        input.disabled = false;
                        input.focus();
                        input.addEventListener('keypress', enterHandler);
                        input.addEventListener('input', inputHandler);
                        console.log('get_guess: Input re-appended and listeners re-attached', { inputId: input.id });
                    } else {
                        console.error('get_guess: Game container not found for recovery');
                        reject(new Error('Input element removed from DOM and recovery failed'));
                    }
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
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
    console.log('create_game_ui: Starting, Loaded version 2025-06-21-v9.27', {
        mode,
        player1,
        player2,
        difficulty,
        gameType,
        sessionId,
        stack: new Error().stack
    });

    if (isGameActive || isCreatingUI) {
        console.warn('create_game_ui: Game already active or UI creation in progress, skipping', { isGameActive, isCreatingUI });
        return null;
    }

    isCreatingUI = true;

    try {
        // Clear existing UI to prevent duplicates
        document.body.innerHTML = '';
        console.log('create_game_ui: Cleared document body');

        // Create game container
        const container = document.createElement('div');
        container.className = 'game-container';
        container.style.textAlign = 'center';
        document.body.appendChild(container);
        console.log('create_game_ui: Created and appended game container');

        // Create output element for game messages
        const output = document.createElement('div');
        output.className = 'game-output';
        output.style.marginBottom = '20px';
        container.appendChild(output);
        console.log('create_game_ui: Created and appended output');

        // Create prompt element
        const prompt = document.createElement('p');
        prompt.className = 'game-prompt';
        prompt.style.fontSize = '18px';
        container.appendChild(prompt);
        console.log('create_game_ui: Created and appended prompt');

        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'game-input';
        input.id = `game-input-${Date.now()}`; // Unique ID
        input.style.padding = '8px';
        input.style.fontSize = '16px';
        input.style.width = '200px';
        input.style.margin = '10px';
        container.appendChild(input);
        console.log('create_game_ui: Created and appended input', { inputId: input.id });

        // Create submit button
        const button = document.createElement('button');
        button.className = 'game-button';
        button.innerText = 'Enviar';
        button.style.padding = '8px 16px';
        button.style.fontSize = '16px';
        button.style.cursor = 'pointer';
        button.style.margin = '5px';
        container.appendChild(button);
        console.log('create_game_ui: Created and appended button');

        // Initialize game settings if not provided
        if (!mode) {
            prompt.innerText = 'Selecciona el modo de juego:\n1: Un jugador\n2: Dos jugadores\n3: Contra IA';
            input.value = '';
            input.focus();

            mode = await new Promise(resolve => {
                const submitHandler = () => {
                    const value = input.value.trim();
                    if (['1', '2', '3'].includes(value)) {
                        input.removeEventListener('keypress', enterHandler);
                        button.removeEventListener('click', submitHandler);
                        resolve(value);
                    } else {
                        output.innerText = 'Por favor, ingresa 1, 2 o 3.';
                        input.value = '';
                        input.focus();
                    }
                };

                const enterHandler = (e) => {
                    if (e.key === 'Enter') submitHandler();
                };

                button.addEventListener('click', submitHandler);
                input.addEventListener('keypress', enterHandler);
            });
            console.log('create_game_ui: Mode selected', { mode });
        }

        // Collect player names
        if (!player1) {
            prompt.innerText = 'Ingresa el nombre del Jugador 1:';
            input.value = '';
            input.focus();

            player1 = await new Promise(resolve => {
                const submitHandler = () => {
                    const value = input.value.trim();
                    if (value) {
                        input.removeEventListener('keypress', enterHandler);
                        button.removeEventListener('click', submitHandler);
                        resolve(value);
                    } else {
                        output.innerText = 'Por favor, ingresa un nombre válido.';
                        input.value = '';
                        input.focus();
                    }
                };

                const enterHandler = (e) => {
                    if (e.key === 'Enter') submitHandler();
                };

                button.addEventListener('click', submitHandler);
                input.addEventListener('keypress', enterHandler);
            });
            console.log('create_game_ui: Player 1 name collected', { player1 });
        }

        if ((mode === '2' || mode === '3') && !player2) {
            prompt.innerText = mode === '2' ? 'Ingresa el nombre del Jugador 2:' : 'Ingresa el nombre de la IA:';
            input.value = '';
            input.focus();

            player2 = await new Promise(resolve => {
                const submitHandler = () => {
                    const value = input.value.trim() || (mode === '2' ? 'Jugador 2' : 'IA');
                    input.removeEventListener('keypress', enterHandler);
                    button.removeEventListener('click', submitHandler);
                    resolve(value);
                };

                const enterHandler = (e) => {
                    if (e.key === 'Enter') submitHandler();
                };

                button.addEventListener('click', submitHandler);
                input.addEventListener('keypress', enterHandler);
            });
            console.log('create_game_ui: Player 2 name collected', { player2 });
            if (mode === '2' && player2 === 'Jugador 2') {
                console.log('create_game_ui: Formatted Player 2 name: Jugador 2');
            }
        }

        // Collect difficulty for mode 3
        if (mode === '3' && !difficulty) {
            prompt.innerText = 'Selecciona la dificultad:\n1: Fácil\n2: Medio\n3: Difícil';
            input.value = '';
            input.focus();

            difficulty = await new Promise(resolve => {
                const submitHandler = () => {
                    const value = input.value.trim();
                    if (['1', '2', '3'].includes(value)) {
                        input.removeEventListener('keypress', enterHandler);
                        button.removeEventListener('click', submitHandler);
                        resolve(value === '1' ? 'Fácil' : value === '2' ? 'Medio' : 'Difícil');
                    } else {
                        output.innerText = 'Por favor, ingresa 1, 2 o 3.';
                        input.value = '';
                        input.focus();
                    }
                };

                const enterHandler = (e) => {
                    if (e.key === 'Enter') submitHandler();
                };

                button.addEventListener('click', submitHandler);
                input.addEventListener('keypress', enterHandler);
            });
            console.log('create_game_ui: Difficulty selected', { difficulty });
        }

        // Collect game type for mode 2
        if (mode === '2' && !gameType) {
            prompt.innerText = 'Selecciona el tipo de juego:\n1: Local\n2: Remoto';
            input.value = '';
            input.focus();

            gameType = await new Promise(resolve => {
                const submitHandler = () => {
                    const value = input.value.trim();
                    if (['1', '2'].includes(value)) {
                        input.removeEventListener('keypress', enterHandler);
                        button.removeEventListener('click', submitHandler);
                        resolve(value === '1' ? 'local' : 'remoto');
                    } else {
                        output.innerText = 'Por favor, ingresa 1 o 2.';
                        input.value = '';
                        input.focus();
                    }
                };

                const enterHandler = (e) => {
                    if (e.key === 'Enter') submitHandler();
                };

                button.addEventListener('click', submitHandler);
                input.addEventListener('keypress', enterHandler);
            });
            console.log('create_game_ui: Game type selected', { gameType });
        }

        // Generate session ID for remote mode 2
        if (mode === '2' && gameType === 'remoto' && !sessionId) {
            sessionId = database.ref('games').push().key;
            console.log('create_game_ui: Generated session ID for remote game', { sessionId });
        }

        // Clear output after setup
        output.innerText = '';
        prompt.innerText = 'Ingresa una letra o la palabra completa:';
        input.value = '';
        input.focus();
        console.log('create_game_ui: UI setup completed', { mode, player1, player2, difficulty, gameType, sessionId });

        return {
            mode,
            prompt,
            input,
            button,
            output,
            container,
            player1,
            player2,
            difficulty,
            gameType,
            sessionId
        };
    } catch (err) {
        console.error('create_game_ui: Error setting up UI', err);
        output.innerText = 'Error al configurar la interfaz. Por favor, recarga la página.';
        return null;
    } finally {
        isCreatingUI = false;
        console.log('create_game_ui: UI creation lock released');
    }
}

async function start_game(mode, players, output, container, prompt, input, button, difficulty = null, games_played = 0, total_scores = null, wins = null, gameType = null, sessionId = null) {
    console.log('start_game: Loaded version 2025-06-17-v9.11', { mode, players, difficulty, games_played, gameType, sessionId });
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
        // Clear all elements except container
        Array.from(container.children).forEach(el => {
            container.removeChild(el);
        });
        // Reattach prompt and output
        container.appendChild(prompt);
        container.appendChild(output);
        // Do not reattach button here
        button.style.display = 'none'; // Ensure button is hidden
        prompt.innerText = '';
        output.innerText = '';
        // Show loading message
        loadingMessage = document.createElement('p');
        loadingMessage.innerText = 'Generando palabra secreta';
        loadingMessage.style.fontSize = '16px';
        loadingMessage.style.color = 'blue';
        container.appendChild(loadingMessage);
        console.log('start_game: Showing loading message', { inputAttached: !!input.parentNode });

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
        console.log('start_game: Game completed', { games_played, games_to_play, total_scores: accumulated_scores, wins: accumulated_wins });
    } catch (err) {
        console.error('start_game: Error during game setup', err);
        output.innerText = 'Error al iniciar el juego.';
        if (loadingMessage && loadingMessage.parentNode) {
            container.removeChild(loadingMessage);
        }
    }
}

async function process_guess(
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
) {
    console.log('process_guess: Starting for', player, { 
        max_score, 
        score: scores[player] || 0, 
        guessed_letters: Array.from(guessed_letters), 
        retried: 0, 
        difficulty 
    });
    let retried = 0;
    let timeout_retries = 0;
    const max_retries = 3;
    const max_timeout_retries = 3;
    let penalizo = false;
    let restar_intento = true;
    let feedback, feedback_color;
    let guess = '';

    // Safeguard: Ensure tries and scores are initialized
    if (!tries[player]) tries[player] = 5; // Default tries
    if (!scores[player]) scores[player] = 0; // Default score

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
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Input timeout')), 60000)); // Increase to 60 seconds
        try {
            const human_guess = await Promise.race([
                get_guess(guessed_letters, secret_word, prompt, input, output, button),
                timeoutPromise
            ]);
            console.log('process_guess: Human guess:', human_guess, { inputId: input.id, inputValue: input.value });
            if (!human_guess || !human_guess.trim()) {
                feedback = `Entrada vacía. Por favor, ingresa una adivinanza válida.`;
                feedback_color = 'orange';
                display_feedback(feedback, feedback_color, player, true);
                return null;
            }
            timeout_retries = 0;
            return human_guess.trim();
        } catch (error) {
            console.error('process_guess: Guess input error:', { name: error.name, message: error.message, stack: error.stack });
            timeout_retries++;
            if (error.message === 'Input timeout') {
                console.log('process_guess: Timeout occurred', { player, timeout_retries });
                if (timeout_retries === max_timeout_retries - 1) {
                    feedback = `Última oportunidad para ingresar tu adivinanza.`;
                } else if (timeout_retries < max_timeout_retries) {
                    feedback = `Por favor, ingresa tu adivinanza. Intentos restantes: ${max_timeout_retries - timeout_retries}.`;
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
                feedback_color = 'orange';
                display_feedback(feedback, feedback_color, player, true);
                return null;
            }
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

async function play_game(loadingMessage, secret_word, mode, players, output, container, prompt, input, button, difficulty, games_played, games_to_play, total_scores, wins, delay, display_feedback, gameType, sessionId) {
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

    let game_info, player_info, progress;
    let sessionRef;

    // Initialize Firebase for remote game
    if (mode === '2' && gameType === 'remoto') {
        sessionRef = database.ref(`games/${sessionId}`);
        await sessionRef.update({
            secretWord: provided_secret_word,
            guessedLetters: Array.from(guessed_letters),
            tries,
            scores,
            currentPlayer: players[current_player_idx],
            status: 'playing'
        });
    }

    try {
        if (loadingMessage && loadingMessage.parentNode) {
            container.removeChild(loadingMessage);
            console.log('play_game: Removed loading message');
        }
        // Remove only non-essential elements (e.g., button groups)
        const existing_button_groups = container.querySelectorAll('.button-group');
        existing_button_groups.forEach(group => {
            if (group.parentNode) {
                container.removeChild(group);
                console.log('play_game: Removed existing button group');
            }
        });
        // Ensure prompt, input, and output are in the DOM, but don't remove/re-add unnecessarily
        if (!prompt.parentNode) {
            container.appendChild(prompt);
            console.log('play_game: Appended prompt');
        }
        if (!input.parentNode) {
            input.id = input.id || `guess-input-${Date.now()}`; // Set consistent ID
            container.appendChild(input);
            console.log('play_game: Appended input', { inputId: input.id });
        }
        if (!output.parentNode) {
            container.appendChild(output);
            console.log('play_game: Appended output');
        }
        // Initialize game info and progress elements if not present
        game_info = container.querySelector('.game-info') || document.createElement('p');
        if (!game_info.className) {
            game_info.className = 'game-info';
            container.insertBefore(game_info, prompt);
            console.log('play_game: Created and appended game_info');
        }
        player_info = container.querySelector('#player_info') || document.createElement('p');
        if (!player_info.id) {
            player_info.id = 'player_info';
            player_info.className = 'player-info';
            container.insertBefore(player_info, prompt);
            console.log('play_game: Created and appended player_info');
        }
        progress = container.querySelector('.game-progress') || document.createElement('p');
        if (!progress.className) {
            progress.className = 'game-progress';
            container.insertBefore(progress, prompt);
            console.log('play_game: Created and appended progress');
        }
        // Update UI content
        game_info.innerHTML = `--- Juego ${games_played + 1} de ${games_to_play} ---<br>Palabra secreta: ${provided_secret_word.length} letras.<br>Intentos: ${total_tries}. Puntaje máximo: ${max_score}.` +
            (mode === '3' ? `<br>Dificultad: ${difficulty || 'N/A'}` : '') +
            (mode === '2' && gameType === 'remoto' ? `<br>ID de sesión: ${sessionId}` : '');
        prompt.innerText = 'Ingresa una letra o la palabra completa:';
        input.value = '';
        input.disabled = false;
        if (input.parentNode) {
            input.focus();
            console.log('play_game: Input focused', { inputId: input.id, inputValue: input.value });
        }
        output.innerHTML = '';
        console.log('play_game: UI initialized', { inputId: input.id, isGameActive: isGameActive });
        update_ui();
    } catch (err) {
        console.error('play_game: Error setting up UI', err);
        output.innerText = 'Error al configurar la interfaz.';
        isGameActive = false;
        return;
    }

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
            prompt.innerText = mode === '2' && gameType === 'remoto' && player !== players[current_player_idx] ? 'Esperando el turno del otro jugador...' : 'Ingresa una letra o la palabra completa:';
            if (input.parentNode) {
                if (mode !== '2' || gameType !== 'remoto' || player === players[current_player_idx]) {
                    input.disabled = false;
                    input.focus();
                    console.log('update_ui: Input enabled and focused', { inputId: input.id, inputValue: input.value });
                } else {
                    input.disabled = true;
                    console.log('update_ui: Input disabled for remote player', { inputId: input.id });
                }
            } else {
                console.warn('update_ui: Input not in DOM, re-adding');
                input.id = input.id || `guess-input-${Date.now()}`; // Ensure ID
                container.appendChild(input);
                input.disabled = false;
                input.focus();
                console.log('update_ui: Input re-appended', { inputId: input.id });
            }
            console.log('update_ui: UI updated', JSON.stringify({ player, score: scores[player], player_info: player_info.innerHTML, inputId: input.id }));
        } catch (err) {
            console.error('update_ui: Error updating UI', err);
        }
    }

    async function game_loop() {
        console.log('game_loop: Starting', JSON.stringify({ players, tries, scores, mode, secret_word_length: provided_secret_word.length, gameType, sessionId }));

        players.forEach(player => {
            if (tries[player] == null) tries[player] = total_tries;
            if (scores[player] == null) scores[player] = 0;
            if (lastCorrectWasVowel[player] == null) lastCorrectWasVowel[player] = false;
        });

        if (mode === '2' && gameType === 'remoto') {
            sessionRef.on('value', async (snapshot) => {
                const game = snapshot.val();
                if (!game || game.status !== 'playing') return;
                guessed_letters.clear();
                game.guessedLetters.forEach(l => guessed_letters.add(l));
                Object.assign(tries, game.tries);
                Object.assign(scores, game.scores);
                current_player_idx = players.indexOf(game.currentPlayer);
                update_ui();
                if (game.status === 'ended') {
                    sessionRef.off();
                }
            });
        }

        while (Object.values(tries).some(t => t > 0) &&
               !normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l))) {
            const player = players[current_player_idx];
            if (tries[player] == null || tries[player] <= 0) {
                console.log('game_loop: Skipping player', JSON.stringify({ player, tries: tries[player] || 'undefined' }));
                current_player_idx = (current_player_idx + 1) % players.length;
                if (mode === '2' && gameType === 'remoto') {
                    await sessionRef.update({ currentPlayer: players[current_player_idx] });
                }
                update_ui();
                continue;
            }

            if (player !== 'IA' && input.parentNode) {
                console.log('game_loop: Preparing for player input', { player, inputId: input.id, inputValue: input.value });
                if (mode !== '2' || gameType !== 'remoto' || player === players[current_player_idx]) {
                    input.disabled = false;
                    input.focus();
                    console.log('game_loop: Input focused for player', { player, inputId: input.id, inputValue: input.value });
                }
            }

            if (mode === '1' || mode === '2') {
                output.innerHTML = '';
            }

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
                display_feedback
            );

            if (mode === '2' && gameType === 'remoto') {
                await sessionRef.update({
                    guessedLetters: Array.from(guessed_letters),
                    tries,
                    scores,
                    currentPlayer: players[current_player_idx]
                });
            }

            if (mode === '1' || mode === '2') {
                await delay(1000);
            }

            console.log('game_loop: Post-guess state', JSON.stringify({
                player,
                score: scores[player],
                tries: tries[player],
                guessed_letters: Array.from(guessed_letters),
                word_guessed: result.word_guessed
            }));

            if (result.tries[player] == null || result.tries[player] === 0) {
                if (mode === '3' && player === 'IA') {
                    console.log('game_loop: Adding delay for AI out of tries');
                    await delay(1000);
                }
                output.innerHTML = '';
                display_feedback(`¡<strong>${player}</strong> sin intentos!`, 'red', player, false);
                await delay(500);
                if (mode === '2' && gameType === 'remoto') {
                    await sessionRef.update({ tries, scores });
                }
            }

            if (result.word_guessed || normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l))) {
                output.innerHTML = '';
                display_feedback(`¡Felicidades, <strong>${player}</strong>! Adivinaste la palabra!`, 'green', player, false);
                if (mode === '2' && gameType === 'remoto') {
                    await sessionRef.update({ status: 'ended' });
                }
                break;
            }

            if (mode === '2' || mode === '3') {
                let next_idx = (current_player_idx + 1) % players.length;
                let tries_checked = 0;
                while ((tries[players[next_idx]] == null || tries[players[next_idx]] <= 0) && tries_checked < players.length) {
                    next_idx = (next_idx + 1) % players.length;
                    tries_checked++;
                }
                if (mode === '3' && player !== 'IA' && players[next_idx] === 'IA') {
                    console.log('game_loop: Adding 1-second delay before AI turn');
                    await delay(1000);
                }
                current_player_idx = next_idx;
                if (mode === '2' && gameType === 'remoto') {
                    await sessionRef.update({ currentPlayer: players[current_player_idx] });
                }
            }
            update_ui();
        }

        console.log('game_loop: Ended', JSON.stringify({ players, tries, scores, word_guessed: normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l)) }));
    }

    await game_loop();
    await delay(3000);

    console.log('play_game: Updating total_scores', JSON.stringify({ before: { ...total_scores }, game_scores: { ...scores } }));
    players.forEach(p => {
        total_scores[p] += scores[p];
        console.log(`play_game: Updated total_scores for ${p}: ${total_scores[p]} (added ${scores[p]})`);
    });
    console.log('play_game: Total_scores after update', JSON.stringify({ ...total_scores }));

    const button_group = document.createElement('div');
    button_group.className = 'button-group';
    button_group.style.display = 'inline-block';
    button_group.style.marginTop = '10px';

    try {
        if (input.parentNode) container.removeChild(input);
        if (button.parentNode) container.removeChild(button);
    } catch (err) {
        console.error('play_game: Error removing input/button', err);
    }

    const formatted_word = format_secret_word(provided_secret_word, guessed_letters);
    output.innerHTML += `<br>Juego terminado. Palabra: ${formatted_word}.`;
    output.style.color = 'black';
    players.forEach(p => {
        output.innerHTML += `<br><strong>${p}</strong> puntaje este juego: ${scores[p]}`;
    });

    if (players.length === 2) {
        const [p1, p2] = players;
        if (scores[p1] > scores[p2]) {
            output.innerHTML += `<br>Ganador juego ${games_played + 1}: <strong>${p1}</strong>!`;
            wins[p1]++;
        } else if (scores[p2] > scores[p1]) {
            output.innerHTML += `<br>Ganador juego ${games_played + 1}: <strong>${p2}</strong>!`;
            wins[p2]++;
        } else {
            output.innerHTML += `<br>Empate!`;
        }
        output.innerHTML += `<br>Puntajes totales acumulados:`;
        players.forEach(p => output.innerHTML += `<br><strong>${p}</strong>: ${total_scores[p]} puntos, ${wins[p]} ganados`);
        console.log(`play_game: Total scores displayed: ${players.join(', ')}`, JSON.stringify(Object.entries(total_scores)));
        container.appendChild(document.createElement('br'));
    }

    const repeat_button = document.createElement('button');
    repeat_button.className = 'game-button repeat-button';
    repeat_button.innerText = 'Repetir Juego';
    repeat_button.style.padding = '8px 16px';
    repeat_button.style.fontSize = '16px';
    repeat_button.style.cursor = 'pointer';
    repeat_button.style.margin = '5px';
    repeat_button.onclick = () => {
        console.log('play_game: repeat_button: Repeating game series for mode', mode, JSON.stringify({ players }));
        output.innerText = '';
        const reset_scores = Object.fromEntries(players.map(p => [p, 0]));
        const reset_wins = Object.fromEntries(players.map(p => [p, 0]));
        if (mode === '2' && gameType === 'remoto') {
            database.ref(`games/${sessionId}`).remove();
        }
        start_game(mode, players, output, container, prompt, input, button, difficulty, 0, reset_scores, reset_wins, gameType, sessionId);
    };
    button_group.appendChild(repeat_button);

    const restart_button = document.createElement('button');
    restart_button.className = 'game-button restart-button';
    restart_button.innerText = 'Reiniciar Juego';
    restart_button.style.padding = '8px 16px';
    restart_button.style.fontSize = '16px';
    restart_button.style.cursor = 'pointer';
    restart_button.style.margin = '5px';
    restart_button.onclick = () => {
        console.log('play_game: restart_button: Returning to mode selection screen for mode', mode);
        if (mode === '2' && gameType === 'remoto') {
            database.ref(`games/${sessionId}`).remove();
        }
        document.body.innerHTML = '';
        main();
    };
    button_group.appendChild(restart_button);

    if (mode !== '1' && games_played < games_to_play - 1 && !Object.values(wins).some(w => w === 2)) {
        const next_button = document.createElement('button');
        next_button.className = 'game-button next-button';
        next_button.innerText = 'Siguiente Juego';
        next_button.style.padding = '8px 16px';
        next_button.style.fontSize = '16px';
        next_button.style.cursor = 'pointer';
        next_button.style.margin = '5px';
        next_button.onclick = () => {
            console.log('play_game: next_button: Starting next game', JSON.stringify({ current_games_played: games_played, next_games_played: games_played + 1 }));
            output.innerText = '';
            if (button_group.parentNode) container.removeChild(button_group);
            if (mode === '2' && gameType === 'remoto') {
                database.ref(`games/${sessionId}`).remove();
            }
            start_game(mode, players, output, container, prompt, input, button, difficulty, games_played + 1, total_scores, wins, gameType, sessionId);
        };
        button_group.appendChild(next_button);
    } else if (mode !== '1') {
        output.innerHTML += `<br>--- Resultado Final ---`;
        players.forEach(p => output.innerHTML += `<br><strong>${p}</strong>: ${total_scores[p]} puntos, ${wins[p]} ganados`);
        const [p1, p2] = players;
        if (wins[p1] > wins[p2]) {
            output.innerHTML += `<br>Ganador absoluto: <strong>${p1}</strong>!`;
        } else if (wins[p2] > wins[p1]) {
            output.innerHTML += `<br>Ganador absoluto: <strong>${p2}</strong>!`;
        } else if (total_scores[p1] > total_scores[p2]) {
            output.innerHTML += `<br>Ganador absoluto (por puntos): <strong>${p1}</strong>!`;
        } else if (total_scores[p2] > total_scores[p1]) {
            output.innerHTML += `<br>Ganador absoluto (por puntos): <strong>${p2}</strong>!`;
        } else {
            output.innerHTML += `<br>Empate final!`;
        }
        console.log('play_game: Final result displayed', JSON.stringify({ total_scores, wins }));
        if (mode === '2' && gameType === 'remoto') {
            await sessionRef.update({ status: 'ended' });
        }
    }

    container.appendChild(button_group);
    console.log('play_game: Buttons rendered', JSON.stringify({ repeat: !!repeat_button, restart: !!restart_button, next: mode !== '1' && games_played < games_to_play - 1 }));
    isGameActive = false;
    console.log('play_game: Game ended, isGameActive reset to false');
}

async function main() {
    console.log('main: Starting, Loaded version 2025-06-21-v9.27', { isGameActive, stack: new Error().stack });
    if (isGameActive) {
        console.warn('main: Game already active, preventing reinitialization');
        return;
    }
    try {
        const ui = await create_game_ui();
        if (!ui) {
            console.error('main: UI creation failed, aborting');
            throw new Error('UI creation failed');
        }
        isGameActive = true; // Set after create_game_ui succeeds
        const { mode, prompt, input, button, output, container, player1, player2, difficulty, gameType, sessionId } = ui;
        console.log('main: UI created', { mode, player1, player2, difficulty, gameType, sessionId });
        const players = [player1];
        if (mode === '2' || mode === '3') players.push(player2);
        console.log('main: Players:', players);
        const total_scores = Object.fromEntries(players.map(p => [p, 0]));
        const wins = Object.fromEntries(players.map(p => [p, 0]));
        await start_game(mode, players, output, container, prompt, input, button, difficulty, 0, total_scores, wins, gameType, sessionId);
        console.log('main: Game started');
    } catch (err) {
        console.error('main: Error in game setup', err);
        document.body.innerHTML = '<p style="color: red; text-align: center;">Error al iniciar el juego. Por favor, recarga la página.</p>';
    } finally {
        isGameActive = false;
        console.log('main: Game ended, isGameActive reset to false');
    }
}

// Prevent multiple main calls with a robust lock
if (!window.hasRunMain) {
    window.hasRunMain = true;
    console.log('Main lock acquired, proceeding with execution');
    if (document.readyState !== 'loading') {
        console.log('Document already loaded: Calling main');
        main();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded: Calling main');
            main();
        }, { once: true });
    }
} else {
    console.warn('Main already executed, skipping additional call', { stack: new Error().stack });
}

// Start the game
main();
