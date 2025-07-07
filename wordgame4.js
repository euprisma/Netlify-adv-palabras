// Transcrypt'ed from Python, 2025-06-16, updated 2025-10-14 for Firebase v10.14.0

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.42.7/+esm";

const supabaseUrl = 'https://bbjryfwufpdyyfbrmdvv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJianJ5Znd1ZnBkeXlmYnJtZHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NTQzNjcsImV4cCI6MjA2NzEzMDM2N30.cASkkXdQx9SvoPnLqGbHsj-pnqLxvlozYQRcyuc0-Bs'
const supabase = createClient(supabaseUrl, supabaseKey);

// Anonymous authentication
async function initSupabase() {
    //try {
    //const { data, error } = await supabase.auth.signInAnonymously();
    //if (error) {
    //console.error('initSupabase: Authentication error', error);
    //throw error;
    // }
    //console.log('initSupabase: Authenticated anonymously', data);
    //} catch (error) {
    //console.error('initSupabase: Failed to initialize Supabase', error);
    //throw error;
    //}
    return;
}

async function createSession(sessionId, player1, mode, gameType, secretWord, totalTries) {
    if (!sessionId || !player1 || !secretWord || typeof secretWord !== 'string' || !totalTries) {
        console.error('createSession: Invalid input', { sessionId, player1, secretWord, totalTries });
        throw new Error('Invalid session parameters');
    }
    let attempts = 5;
    let result = null;
    while (attempts--) {
        try {
            const { data: user } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('games')
                .insert({
                    session_id: sessionId,
                    player1,
                    status: 'waiting_for_player2',
                    secret_word: secretWord,
                    guessed_letters: [],
                    tries: { [player1]: totalTries },
                    scores: { [player1]: 0 },
                    current_player: player1,
                    initialized: true,
                    mode,
                    game_type: gameType,
                    last_updated: new Date().toISOString()
                })
                .select()
                .single();
            if (error) throw error;
            const { error: playerError } = await supabase
                .from('game_players')
                .insert({
                    session_id: sessionId,
                    user_id: user?.data?.user?.id || null,
                    player_name: player1
                });
            if (playerError) throw playerError;
            result = data;
            break;
        } catch (error) {
            console.warn(`createSession: Retry ${5 - attempts}/5`, { sessionId, error });
            if (attempts === 0) {
                console.error('createSession: Failed to create session', { sessionId, error });
                throw error;
            }
            await delay(1000);
        }
    }
    if (!result) throw new Error('Failed to create session');
    console.log('createSession: Session created', { sessionId });
    return result;
}

async function updateSession(sessionId, updates) {
    if (!sessionId || typeof sessionId !== 'string') {
        console.error('updateSession: Invalid sessionId', sessionId);
        throw new Error('Invalid session ID');
    }
    // Ensure guessed_letters is an array
    const sanitizedUpdates = {
        ...updates,
        guessed_letters: Array.isArray(updates.guessed_letters)
            ? updates.guessed_letters
            : updates.guessed_letters instanceof Set
                ? Array.from(updates.guessed_letters)
                : [],
        last_updated: new Date()
    };
    // Validate other fields if present
    if (updates.tries && typeof updates.tries !== 'object') {
        console.warn('updateSession: Invalid tries, resetting to empty object', updates.tries);
        sanitizedUpdates.tries = {};
    }
    if (updates.scores && typeof updates.scores !== 'object') {
        console.warn('updateSession: Invalid scores, resetting to empty object', updates.scores);
        sanitizedUpdates.scores = {};
    }
    let attempts = 3;
    let result = null;
    while (attempts--) {
        try {
            const { data, error } = await supabase
                .from('games')
                .update(sanitizedUpdates)
                .eq('session_id', sessionId)
                .select()
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    console.error('updateSession: Session not found', sessionId);
                    throw new Error('Session not found');
                }
                throw error;
            }
            result = data;
            break;
        } catch (error) {
            console.warn(`updateSession: Retry ${3 - attempts}/3`, error);
            if (attempts === 0) {
                console.error('updateSession: Failed to update session', error);
                throw error;
            }
            await delay(1000);
        }
    }
    if (!result) throw new Error('Failed to update session after retries');
    console.log('updateSession: Session updated', { sessionId, guessed_letters: result.guessed_letters });
    return result;
}

// Define getSession
async function getSession(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
        console.error('getSession: Invalid sessionId', sessionId);
        throw new Error('Invalid session ID');
    }
    let attempts = 3;
    let result = null;
    while (attempts--) {
        try {
            const { data, error } = await supabase
                .from('games')
                .select('*')
                .eq('session_id', sessionId)
                .single();
            if (error) {
                if (error.code === 'PGRST116' || error.status === 406) {
                    console.warn('getSession: Session not found or inaccessible', { sessionId, error });
                    try {
                        await supabase.from('games').delete().eq('session_id', sessionId);
                        await supabase.from('game_players').delete().eq('session_id', sessionId);
                        console.log('getSession: Cleaned up stale session', sessionId);
                    } catch (cleanupError) {
                        console.warn('getSession: Failed to clean up stale session', { sessionId, cleanupError });
                    }
                    return null;
                }
                throw error;
            }
            result = {
                ...data,
                guessed_letters: Array.isArray(data.guessed_letters) ? data.guessed_letters : []
            };
            break;
        } catch (error) {
            console.warn(`getSession: Retry ${3 - attempts}/3`, { sessionId, error });
            if (attempts === 0) {
                console.error('getSession: Failed to fetch session', { sessionId, error });
                throw error;
            }
            await delay(1000);
        }
    }
    console.log('getSession: Session retrieved', { sessionId, guessed_letters: result?.guessed_letters });
    return result;
}

function generateSessionId() {
    return 'sess_' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 10) : Math.random().toString(36).substr(2, 9) + Date.now().toString(36));
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

async function get_guess(guessed_letters, secret_word, prompt, input, output, button) {
    console.log('get_guess: ENTRY', { secret_word, typeofSecret: typeof secret_word });
    if (!secret_word || typeof secret_word !== 'string') {
        throw new Error('get_guess: secret_word is missing or not a string');
    }
    console.log('get_guess: called for', input, input.id, input.parentNode, document.activeElement === input);
    console.log('get_guess: Starting, Loaded version 2025-07-04-v10.3', {
        prompt: prompt?.innerText,
        inputExists: !!input?.parentNode,
        buttonExists: !!button?.parentNode,
        inputValue: input?.value,
        inputId: input?.id || 'no-id'
    });
    if (!prompt || !input || !output || !button) {
        console.error('get_guess: Missing required DOM elements', { prompt, input, output, button });
        throw new Error('Missing required DOM elements');
    }
    input.id = input.id || `guess-input-${Date.now()}`;
    const normalized_secret = normalizar(secret_word);
    const min_guesses_for_word = secret_word.length < 5 ? 1 : 2;
    const permitir_palabra = guessed_letters.size >= min_guesses_for_word || Array.from(guessed_letters).some(l => secret_word.split('').filter(x => x === l).length > 1);
    prompt.innerText = permitir_palabra ? 'Adivina una letra o la palabra completa:' : 'Adivina una letra:';
    button.style.display = 'inline-block';
    button.innerText = 'Enviar';
    input.value = '';
    input.disabled = false;
    focusInput(input);
    console.log('get_guess: Input initialized', { inputId: input.id, disabled: input.disabled, focused: document.activeElement === input });

    return new Promise((resolve, reject) => {
        // Remove existing handlers
        if (input._guessHandler) {
            input.removeEventListener('keydown', input._guessHandler);
            console.log('get_guess: Removed previous keydown handler', input.id);
        }
        if (button._clickHandler) {
            button.removeEventListener('click', button._clickHandler);
            console.log('get_guess: Removed previous button click handler', button.id);
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
                output.innerText = 'Entrada inválida. Ingresa una letra o palabra válida (solo letras, incluyendo áéíóúüñ).';
                output.style.color = 'red';
                input.value = '';
                focusInput(input);
                return { valid: false };
            }
        }

        const enterHandler = (e) => {
            console.log('get_guess: keydown event', { key: e.key, inputValue: input.value, inputId: input.id, focused: document.activeElement === input });
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('get_guess: Enter key pressed', { inputValue: input.value, inputId: input.id });
                const result = handleGuess('enter', input.value);
                if (result.valid) {
                    cleanup();
                    resolve(result.guess);
                }
            }
        };

        const clickHandler = () => {
            console.log('get_guess: Button clicked', { inputValue: input.value, inputId: input.id });
            const result = handleGuess('button', input.value);
            if (result.valid) {
                cleanup();
                resolve(result.guess);
            }
        };

        function cleanup() {
            input.removeEventListener('keydown', enterHandler);
            button.removeEventListener('click', clickHandler);
            input._guessHandler = null;
            button._clickHandler = null;
            clearTimeout(timeoutId);
            clearInterval(focusCheckInterval);
            console.log('get_guess: Cleaned up handlers', input.id);
        }

        input._guessHandler = enterHandler;
        button._clickHandler = clickHandler;
        input.addEventListener('keydown', enterHandler);
        button.addEventListener('click', clickHandler);
        console.log('get_guess: Attached handlers', { inputId: input.id, buttonId: button.id });

        // Periodically check focus
        const focusCheckInterval = setInterval(() => {
            if (document.activeElement !== input) {
                console.warn('get_guess: Input lost focus, re-focusing', input.id);
                focusInput(input);
            }
        }, 1000);

        // Extend timeout for remote mode
        const timeoutId = setTimeout(() => {
            cleanup();
            console.warn('get_guess: Input timeout', input.id);
            output.innerText = 'Tiempo de espera agotado. Turno perdido.';
            output.style.color = 'red';
            resolve(null); // Return null instead of rejecting to allow turn skip
        }, 120000); // Increase to 120 seconds for remote mode
    });
}
console.log('get_guess defined at', new Date());
window.get_guess = get_guess;

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
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

function get_guess_feedback(guess, secret_word, player_score) {
    const secret_norm = normalizar(secret_word);
    const posiciones = {};
    secret_norm.split('').forEach((letra, i) => {
        if (!posiciones[letra]) posiciones[letra] = [];
        posiciones[letra].push(i + 1);
    });
    if (posiciones[guess]) {
        const puntos = secret_norm.split('').filter(l => l === guess).length;
        return {
            messages: [`Correcto! '${guess}' está en las posiciones: ${posiciones[guess].join(', ')}. (+${puntos} puntos)`],
            color: 'green'
        };
    } else {
        let texto = `Incorrecto! '${guess}' no está en la palabra.`;
        if (player_score > 0) texto += ` (-${Math.min(1, player_score)} punto)`;
        return {
            messages: [texto],
            color: 'red'
        };
    }
}

async function create_game_ui(mode = null, player1 = null, player2 = null, difficulty = null, gameType = null, sessionId = null) {
    console.log('create_game_ui: Starting, Loaded version 2025-06-23-v9.10-fixed18', {
        mode, player1, player2, difficulty, gameType, sessionId,
        supabaseConfig: { url: supabaseUrl }
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
        if (mode === '2' && gameType === 'remoto' && player1 && player2 && sessionId) {
            console.log('create_game_ui: Using provided parameters', { mode, player1, player2, difficulty, gameType, sessionId });
            prompt.innerText = 'Ingresa una letra o la palabra completa:';
            button.style.display = 'none';
            focusInput(input);
            return { mode, player1, player2, prompt, input, button, output, container, difficulty, gameType, sessionId, secretWord: secretWord, localPlayer: player1, players: [selected_player1, selected_player2] };
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
                    input.removeEventListener('keydown', currentHandler);

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
                                input.addEventListener('keydown', currentHandler);

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
                                    input.removeEventListener('keydown', currentHandler);
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
                        input.addEventListener('keydown', currentHandler);
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
                input.removeEventListener('keydown', currentHandler);
                if (selected_gameType === 'remoto') {
                    prompt.innerText = '¿Crear juego o unirse? (Ingresa "crear" o "unirse"):';
                    input.value = '';
                    focusInput(input);
                    button.onclick = handleRemoteRoleInput;
                    currentHandler = (e) => {
                        if (e.key === 'Enter') button.click();
                    };
                    input.addEventListener('keydown', currentHandler);
                } else {
                    prompt.innerText = 'Nombre Jugador 1:';
                    input.value = '';
                    focusInput(input);
                    button.onclick = handlePlayer1LocalInput;
                    currentHandler = (e) => {
                        if (e.key === 'Enter') button.click();
                    };
                    input.addEventListener('keydown', currentHandler);

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
                        input.removeEventListener('keydown', currentHandler);
                        currentHandler = (e) => {
                            if (e.key === 'Enter') button.click();
                        };
                        input.addEventListener('keydown', currentHandler);
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
                        input.removeEventListener('keydown', currentHandler);
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

            function generateSessionId() {
                return 'sess_' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 10) : Math.random().toString(36).substr(2, 9) + Date.now().toString(36));
            }

            async function handleRemoteRoleInput() {
                const value = input.value.trim().toLowerCase();
                console.log('create_game_ui: Remote role input:', value);
                if (value === 'crear') {
                    selected_sessionId = generateSessionId();
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
                    await new Promise(resolve => requestAnimationFrame(resolve));

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
                        while (attempts--) {
                            try {
                                // Check for session ID collision
                                const existingSession = await getSession(selected_sessionId);
                                if (existingSession) {
                                    console.warn('create_game_ui: Session ID collision', selected_sessionId);
                                    selected_sessionId = generateSessionId();
                                    continue;
                                }
                                // Create session
                                const totalTries = Math.max(1, Math.floor(secretWord.length / 2));
                                await createSession(selected_sessionId, 'Player1', selected_mode, selected_gameType, secretWord, totalTries);
                                console.log('create_game_ui: Supabase session created', { sessionId: selected_sessionId, secretWord });
                                success = true;
                                break;
                            } catch (error) {
                                console.warn(`create_game_ui: Retry ${5 - attempts}/5 for Supabase insert`, error);
                                if (error.status === 406) {
                                    console.error('create_game_ui: Invalid request, check Supabase key or schema', { error });
                                    output.innerText = 'Error: Solicitud inválida. Verifica la clave de Supabase o la configuración.';
                                    output.style.color = 'red';
                                    input.value = '';
                                    focusInput(input);
                                    return;
                                }
                                if (attempts === 0) {
                                    console.error('create_game_ui: Failed to create Supabase session after retries');
                                    output.innerText = 'Error al crear la sesión de juego. Intenta de nuevo o verifica la conexión a Supabase.';
                                    output.style.color = 'red';
                                    input.value = '';
                                    focusInput(input);
                                    return;
                                }
                                await delay(1000);
                            }
                        }
                        if (!success) return;
                        prompt.innerText = `Nombre Jugador 1 (ID de sesión: ${selected_sessionId}):`;
                        input.value = '';
                        focusInput(input);
                        input.removeEventListener('keydown', currentHandler);
                        button.onclick = () => handlePlayer1Input();
                        currentHandler = (e) => {
                            if (e.key === 'Enter') button.click();
                        };
                        input.addEventListener('keydown', currentHandler);
                    } catch (error) {
                        console.error('create_game_ui: Error creating game session:', error);
                        output.innerText = error.status === 406
                            ? 'Error: Solicitud inválida. Verifica la clave de Supabase o la configuración.'
                            : 'Error al crear la sesión de juego. Intenta de nuevo.';
                        output.style.color = 'red';
                        input.value = '';
                        focusInput(input);
                    } finally {
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
                    input.removeEventListener('keydown', currentHandler);
                    button.onclick = handleSessionIdInput;
                    currentHandler = (e) => {
                        if (e.key === 'Enter') button.click();
                    };
                    input.addEventListener('keydown', currentHandler);
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
                        // Ensure anonymous sign-in
                        //const { user } = await supabase.auth.getUser();
                        //if (!user) {
                        //await supabase.auth.signInAnonymously();
                        //}
                        let attempts = 5;
                        let success = false;
                        while (attempts--) {
                            try {
                                // Fetch session state
                                const snapshot = await getSession(selected_sessionId);
                                if (!snapshot || !snapshot.secret_word) {
                                    console.error('create_game_ui: Invalid session for player1 update', selected_sessionId, snapshot);
                                    throw new Error('Invalid session state');
                                }
                                // Use updateSession to update player1 and related fields
                                await updateSession(selected_sessionId, {
                                    player1: selected_player1,
                                    status: 'waiting_for_player2',
                                    current_player: selected_player1,
                                    guessed_letters: snapshot.guessed_letters || [],
                                    tries: snapshot.tries || {},
                                    scores: snapshot.scores || {}
                                });
                                // Add to game_players for RLS
                                const { error: playerError } = await supabase
                                    .from('game_players')
                                    .insert({
                                        session_id: selected_sessionId,
                                        user_id: null, // Assuming anonymous user
                                        player_name: selected_player1
                                    });
                                if (playerError) throw playerError;

                                console.log('create_game_ui: Supabase updated with player1', {
                                    sessionId: selected_sessionId,
                                    player1: selected_player1,
                                    state: {
                                        player1: selected_player1,
                                        status: 'waiting_for_player2',
                                        current_player: selected_player1,
                                        guessed_letters: snapshot.guessed_letters || [],
                                        tries: snapshot.tries || {},
                                        scores: snapshot.scores || {}
                                    }
                                });
                                success = true;
                                break;
                            } catch (error) {
                                console.warn(`create_game_ui: Retry ${5 - attempts}/5 for player1 update`, error);
                                if (error.code === '42501') {
                                    console.error('create_game_ui: Permission denied for player1 update', { error });
                                    output.innerText = 'Error: Permiso denegado al registrar Jugador 1. Verifica las reglas de Supabase.';
                                    output.style.color = 'red';
                                    input.value = '';
                                    focusInput(input);
                                    return;
                                }
                                await delay(1000);
                            }
                        }
                        if (!success) {
                            console.error('create_game_ui: Failed to update player1 in Supabase');
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
                        // Define cleanup function
                        const cleanup = () => {
                            console.log('handlePlayer1Input: Cleaning up subscription for session', selected_sessionId);
                            supabase.removeChannel(channel);
                        };
                        // Set up real-time subscription
                        const channel = supabase
                            .channel(`game:${selected_sessionId}`)
                            .on(
                                'postgres_changes',
                                {
                                    event: 'UPDATE',
                                    schema: 'public',
                                    table: 'games',
                                    filter: `session_id=eq.${selected_sessionId}`
                                },
                                async (payload) => {
                                    const game = payload.new;
                                    console.log('Supabase: Game state updated', game); // Merged from provided snippet
                                    console.log('handlePlayer1Input: Supabase snapshot received', game);
                                    if (!game) {
                                        console.warn('handlePlayer1Input: Game session deleted');
                                        clearTimeout(timeoutId);
                                        output.innerText = 'Sesión terminada. Intenta crear un nuevo juego.';
                                        output.style.color = 'red';
                                        input.style.display = 'inline-block';
                                        button.style.display = 'inline-block';
                                        input.value = '';
                                        focusInput(input);
                                        button.onclick = () => main();
                                        cleanup(); // Use cleanup function
                                        return;
                                    }
                                    if (game && game.player2 && game.status === 'playing' && game.secret_word) {
                                        console.log('handlePlayer1Input: Player 2 joined', game.player2);
                                        selected_player2 = game.player2;
                                        clearTimeout(timeoutId);
                                        input.removeEventListener('keydown', currentHandler);
                                        input.style.display = 'inline-block';
                                        focusInput(input);
                                        cleanup(); // Use cleanup function
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
                                            localPlayer: selected_player1,
                                            players: [selected_player1, selected_player2],
                                            guessedLetters: Array.isArray(game.guessed_letters) ? game.guessed_letters : [],
                                            tries: game.tries || {},
                                            scores: game.scores || {},
                                            currentPlayer: game.current_player,
                                            initialized: game.initialized,
                                            status: game.status,
                                            secretWord: game.secret_word,
                                            cleanup // Expose cleanup for consumer
                                        });

                                    }
                                }
                            )
                            .subscribe((status, err) => {
                                if (status === 'SUBSCRIBED') {
                                    console.log('Subscribed to game:', selected_sessionId);
                                } else if (err) {
                                    console.error('Subscription error:', err);
                                    output.innerText = 'Error de sincronización. Intenta de nuevo.';
                                    output.style.color = 'red';
                                    input.style.display = 'inline-block';
                                    button.style.display = 'inline-block';
                                    input.value = '';
                                    focusInput(input);
                                    button.onclick = () => main();
                                    clearTimeout(timeoutId);
                                    cleanup(); // Use cleanup function
                                }
                            });
                        timeoutId = setTimeout(async () => {
                            if (prompt.innerText.includes('Esperando')) {
                                try {
                                    const snapshot = await getSession(sessionId);
                                    if (!snapshot) {
                                        console.warn('handlePlayer1Input: Session not found during timeout check', { sessionId });
                                        output.innerText = 'Sesión no encontrada. Intenta crear un nuevo juego.';
                                        output.style.color = 'red';
                                    } else if (snapshot.player2) {
                                        console.log('handlePlayer1Input: Player 2 joined, skipping cleanup', { sessionId, player2: snapshot.player2 });
                                        return;
                                    } else {
                                        console.warn('handlePlayer1Input: Timeout waiting for Player 2', { sessionId });
                                        output.innerText = 'Tiempo de espera agotado. Intenta crear un nuevo juego.';
                                        output.style.color = 'red';
                                        let attempts = 3;
                                        while (attempts--) {
                                            try {
                                                const { error: deleteGameError } = await supabase
                                                    .from('games')
                                                    .delete()
                                                    .eq('session_id', sessionId);
                                                if (deleteGameError) throw deleteGameError;
                                                const { error: deletePlayerError } = await supabase
                                                    .from('game_players')
                                                    .delete()
                                                    .eq('session_id', sessionId);
                                                if (deletePlayerError) throw deletePlayerError;
                                                console.log('handlePlayer1Input: Session cleaned up successfully', { sessionId });
                                                break;
                                            } catch (error) {
                                                console.warn(`handlePlayer1Input: Retry ${3 - attempts}/3 for session cleanup`, { sessionId, error });
                                                if (attempts === 0) {
                                                    console.error('handlePlayer1Input: Failed to clean up session', { sessionId, error });
                                                    output.innerText = 'Error al limpiar la sesión. Intenta de nuevo.';
                                                    output.style.color = 'red';
                                                }
                                                await delay(1000);
                                            }
                                        }
                                    }
                                } catch (error) {
                                    console.warn('handlePlayer1Input: Error during timeout check', { sessionId, error });
                                    output.innerText = 'Error al verificar la sesión. Intenta crear un nuevo juego.';
                                    output.style.color = 'red';
                                }
                                input.style.display = 'inline-block';
                                button.style.display = 'inline-block';
                                input.value = generateSessionId();
                                focusInput(input);
                                button.onclick = () => main();
                                cleanup();
                            }
                        }, 60000);
                    } catch (error) {
                        console.error('create_game_ui: Error updating player 1 in Supabase:', error);
                        output.innerText = error.code === '42501'
                            ? 'Error: Permiso denegado al registrar Jugador 1. Verifica las reglas de Supabase.'
                            : 'Error al registrar el Jugador 1. Intenta de nuevo.';
                        output.style.color = 'red';
                        input.value = '';
                        input.style.display = 'inline-block';
                        button.style.display = 'inline-block';
                        focusInput(input);
                    }
                } else {
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
                        players: [selected_player1],
                        cleanup: () => { } // Empty cleanup for non-remote modes
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
                    let attempts = 3;
                    let sessionState = null;
                    while (attempts--) {
                        try {
                            sessionState = await getSession(sessionId);
                            if (!sessionState) {
                                console.warn('create_game_ui: Session not found', sessionId);
                                output.innerText = 'ID de sesión no encontrado. Verifica el ID e intenta de nuevo.';
                                output.style.color = 'red';
                                input.value = '';
                                focusInput(input);
                                return;
                            }
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
                            if (!sessionState.secret_word || !sessionState.initialized) {
                                console.warn('create_game_ui: Invalid session state', { sessionId, sessionState });
                                output.innerText = 'La sesión tiene un estado inválido. Intenta con otro ID.';
                                output.style.color = 'red';
                                input.value = '';
                                focusInput(input);
                                return;
                            }
                            // Fix missing fields
                            if (!Array.isArray(sessionState.guessed_letters) || !sessionState.tries || !sessionState.scores || sessionState.current_player === undefined) {
                                console.log('create_game_ui: Correcting missing fields for session', sessionId);
                                await updateSession(sessionId, {
                                    guessed_letters: Array.isArray(sessionState.guessed_letters) ? sessionState.guessed_letters : [],
                                    tries: typeof sessionState.tries === 'object' && sessionState.tries !== null ? sessionState.tries : {},
                                    scores: typeof sessionState.scores === 'object' && sessionState.scores !== null ? sessionState.scores : {},
                                    current_player: sessionState.current_player !== undefined ? sessionState.current_player : null
                                });
                                console.log('create_game_ui: Corrected missing fields for session', sessionId);
                                await delay(1000);
                                sessionState = await getSession(sessionId);
                            }
                            break;
                        } catch (error) {
                            console.warn(`create_game_ui: Retry ${3 - attempts}/3 for session fetch`, error);
                            if (error.code === 'PGRST116') {
                                console.warn('create_game_ui: Session not found', sessionId);
                                output.innerText = 'ID de sesión no encontrado. Verifica el ID e intenta de nuevo.';
                                output.style.color = 'red';
                                input.value = '';
                                focusInput(input);
                                return;
                            }
                            if (error.code === '42501') {
                                console.error('create_game_ui: Permission denied for session fetch', { error });
                                output.innerText = 'Error: Permiso denegado. Verifica las reglas de Supabase.';
                                output.style.color = 'red';
                                input.value = '';
                                focusInput(input);
                                return;
                            }
                            await delay(1000);
                        }
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
                    input.removeEventListener('keydown', currentHandler);
                    button.onclick = handlePlayer2Input;
                    currentHandler = (e) => {
                        if (e.key === 'Enter') button.click();
                    };
                    input.addEventListener('keydown', currentHandler);
                } catch (error) {
                    console.error('create_game_ui: Error checking session ID:', error);
                    output.innerText = error.code === '42501'
                        ? 'Error: Permiso denegado. Verifica las reglas de Supabase.'
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
                    // Ensure anonymous sign-in
                    //const { user } = await supabase.auth.getUser();
                    //if (!user) {
                    //await supabase.auth.signInAnonymously();
                    //}
                    let attempts = 5;
                    let sessionState = null;
                    while (attempts--) {
                        try {
                            sessionState = await getSession(selected_sessionId);
                            if (!sessionState) {
                                console.warn('create_game_ui: Session not found during Player 2 join', selected_sessionId);
                                output.innerText = 'Sesión no encontrada. Intenta de nuevo.';
                                output.style.color = 'red';
                                input.value = '';
                                focusInput(input);
                                return;
                            }
                            if (!sessionState.secret_word || !sessionState.initialized) {
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
                        } catch (error) {
                            console.warn(`create_game_ui: Retry ${5 - attempts}/5 for session fetch`, error);
                            if (error.code === 'PGRST116') {
                                console.warn('create_game_ui: Session not found', selected_sessionId);
                                output.innerText = 'Sesión no encontrada. Intenta de nuevo.';
                                output.style.color = 'red';
                                input.value = '';
                                focusInput(input);
                                return;
                            }
                            if (error.code === '42501') {
                                console.error('create_game_ui: Permission denied for session fetch', { error });
                                output.innerText = 'Error: Permiso denegado. Verifica las reglas de Supabase.';
                                output.style.color = 'red';
                                input.value = '';
                                focusInput(input);
                                return;
                            }
                            await delay(1000);
                        }
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
                    let finalState = null;
                    attempts = 5;
                    while (attempts--) {
                        try {
                            if (!Array.isArray(sessionState.guessed_letters)) {
                                sessionState.guessed_letters = [];
                            }
                            if (!sessionState.player1 || typeof sessionState.player1 !== 'string' || !sessionState.player1.trim()) {
                                throw new Error('Player 1 name missing or invalid in session state!');
                            }
                            const triesValue = Math.max(1, Math.floor(sessionState.secret_word.length / 2));
                            // Use updateSession to update player2 and related fields
                            await updateSession(selected_sessionId, {
                                player2: selected_player2,
                                status: 'playing', // <-- ensure this is set!
                                current_player: sessionState.player1,
                                tries: {
                                    [sessionState.player1]: triesValue,
                                    [selected_player2]: triesValue
                                },
                                scores: {
                                    [sessionState.player1]: 0,
                                    [selected_player2]: 0
                                },
                                guessed_letters: [],
                                initialized: true
                            });
                            // Validate update
                            finalState = await getSession(selected_sessionId);
                            if (finalState.player2 !== selected_player2 || finalState.status !== 'playing') {
                                console.warn('handlePlayer2Input: Update validation failed, retrying');
                                throw new Error('Update validation failed');
                            }
                            // Add to game_players for RLS
                            const { error: playerError } = await supabase
                                .from('game_players')
                                .insert({
                                    session_id: selected_sessionId,
                                    user_id: null, // Assuming anonymous user
                                    player_name: selected_player2
                                });
                            if (playerError) throw playerError;

                            console.log('handlePlayer2Input: Supabase updated with player2', { sessionId: selected_sessionId, player2: selected_player2, state: finalState });
                            success = true;
                            break;
                        } catch (error) {
                            console.warn(`handlePlayer2Input: Retry ${5 - attempts}/5 for Supabase update`, error);
                            if (error.code === '42501') {
                                console.error('create_game_ui: Permission denied for player2 update', { error });
                                output.innerText = 'Error: Permiso denegado al registrar Jugador 2. Verifica las reglas de Supabase.';
                                output.style.color = 'red';
                                input.value = '';
                                focusInput(input);
                                return;
                            }
                            await delay(1000);
                        }
                    }
                    if (!success) {
                        console.error('handlePlayer2Input: Failed to update Supabase after retries');
                        output.innerText = 'Error al registrar el Jugador 2. Intenta de nuevo.';
                        output.style.color = 'red';
                        input.value = '';
                        focusInput(input);
                        return;
                    }
                    output.innerText = `Unido al juego con ID: ${selected_sessionId}`;
                    output.style.color = 'black';
                    input.value = '';
                    input.removeEventListener('keydown', currentHandler);
                    prompt.innerText = 'Ingresa una letra o la palabra completa:';
                    button.style.display = 'none';
                    focusInput(input);
                    console.log('handlePlayer2Input: Resolving with', {
                        mode: selected_mode,
                        player1: finalState.player1,
                        player2: selected_player2,
                        gameType: selected_gameType,
                        sessionId: selected_sessionId,
                        localPlayer: selected_player2,
                        players: [finalState.player1, selected_player2],
                        guessedLetters: Array.isArray(finalState.guessed_letters) ? finalState.guessed_letters : [],
                        tries: finalState.tries || {},
                        scores: finalState.scores || {},
                        currentPlayer: finalState.current_player,
                        initialized: finalState.initialized,
                        status: finalState.status,
                        secretWord: finalState.secret_word
                    });
                    resolve({
                        mode: selected_mode,
                        player1: finalState.player1,
                        player2: selected_player2,
                        prompt,
                        input,
                        button,
                        output,
                        container,
                        difficulty: selected_difficulty,
                        gameType: selected_gameType,
                        sessionId: selected_sessionId,
                        localPlayer: selected_player2,
                        players: [finalState.player1, selected_player2],
                        guessedLetters: Array.isArray(finalState.guessed_letters) ? finalState.guessed_letters : [],
                        tries: finalState.tries || {},
                        scores: finalState.scores || {},
                        currentPlayer: finalState.current_player,
                        initialized: finalState.initialized,
                        status: finalState.status,
                        secretWord: finalState.secret_word,
                        cleanup: () => { }
                    });
                } catch (error) {
                    console.error('create_game_ui: Error updating player 2 in Supabase:', error);
                    output.innerText = error.code === '42501'
                        ? 'Error: Permiso denegado al registrar Jugador 2. Verifica las reglas de Supabase.'
                        : 'Error al registrar el Jugador 2. Intenta de nuevo.';
                    output.style.color = 'red';
                    input.value = '';
                    focusInput(input);
                }
            }

            // Initial prompt for mode selection
            prompt.innerText = 'Ingresa "1" para un jugador, "2" para dos jugadores, "3" para jugador contra IA:';
            input.value = selected_mode || '';
            focusInput(input);
            button.onclick = () => handleModeInput();
            currentHandler = (e) => {
                if (e.key === 'Enter') button.click();
            };
            input.addEventListener('keydown', currentHandler);
        });
    } finally {
        isCreatingUI = false;
        console.log('create_game_ui: UI creation completed');
    }
}
async function start_game(gameState, games_played = 0, total_scores = null, wins = null) {
    console.log('start_game: Loaded version 2025-07-03-v10.0', {
        mode: gameState.mode,
        players: gameState.players,
        difficulty: gameState.difficulty,
        games_played,
        gameType: gameState.gameType,
        sessionId: gameState.sessionId
    });
    isGameActive = true;
    try {
        const { mode, players, output, prompt, input, button, container, difficulty, gameType, sessionId, localPlayer } = gameState;
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

        let secretWord = gameState.secretWord;
        if (!secretWord && !(mode === '2' && gameType === 'remoto')) {
            secretWord = await get_secret_word();
        }

        await play_game(
            null,
            secretWord,
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
            sessionId,
            localPlayer
        );
        console.log('start_game: Game completed', { games_played, games_to_play, total_scores: accumulated_scores, wins: accumulated_wins });
    } catch (err) {
        console.error('start_game: Outer error', err);
        output.innerText = 'Error crítico al iniciar el juego.';
    } finally {
        isGameActive = false;
    }
}

async function process_guess(player, guessed_letters, secret_word, tries, scores, lastCorrectWasVowel, used_wrong_letters, used_wrong_words, vowels, max_score, difficulty, mode, prompt, input, output, button, delay, display_feedback) {
    console.log('process_guess: ENTRY', {
        player,
        secret_word,
        guessed_letters: Array.from(guessed_letters),
        tries: { ...tries },
        scores: { ...scores },
        max_score,
        difficulty,
        mode
    });
    // Validate DOM elements
    if (!prompt || !input || !output || !button || !prompt.parentNode || !input.parentNode || !output.parentNode || !button.parentNode) {
        console.error('REMOTE GAME LOOP: One or more DOM elements missing or not attached', {
            prompt, input, output, button,
            promptInDOM: !!prompt?.parentNode,
            inputInDOM: !!input?.parentNode,
            outputInDOM: !!output?.parentNode,
            buttonInDOM: !!button?.parentNode
        });
        display_feedback('Error: Interfaz no disponible. Reinicia el juego.', 'red', player, true);
        return { penalizo: true, tries, scores, guessed_letters, word_guessed: false };
    }
    let retried = 0;
    let timeout_retries = 0;
    const max_retries = 3;
    const max_timeout_retries = 3;
    let penalizo = false;
    let restar_intento = true;
    let feedback, feedback_color;
    let guess = '';
    // Initialize tries and scores
    tries[player] = tries[player] ?? 5;
    scores[player] = scores[player] ?? 0;
    const normalized_secret = normalizar(secret_word);
    // AI guess wrapper
    async function get_ai_guess_wrapper(mustBeConsonant = false) {
        try {
            const new_guess = await get_ai_guess(guessed_letters, secret_word, used_wrong_letters, used_wrong_words, mustBeConsonant, difficulty);
            console.log('process_guess: AI guessed:', new_guess, { mustBeConsonant, difficulty });
            display_feedback(`IA adivina: ${escapeHTML(new_guess)}`, 'blue', player, true);
            return new_guess;
        } catch (err) {
            console.error('process_guess: AI guess error', err);
            penalizo = true;
            feedback = `Error en la IA: ${escapeHTML(err.message || 'Unknown error')}. Turno perdido.`;
            feedback_color = 'red';
            display_feedback(feedback, feedback_color, player, true);
            return null;
        }
    }
    // Human guess with timeout
    async function get_human_guess() {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Input timeout')), 30000));
        try {
            const human_guess = await Promise.race([
                get_guess(guessed_letters, secret_word, prompt, input, output, button),
                timeoutPromise
            ]);
            console.log('process_guess: Human guess:', human_guess);
            if (!human_guess.trim()) {
                feedback = 'Entrada vacía. Ingresa una adivinanza válida.';
                feedback_color = 'orange';
                display_feedback(feedback, feedback_color, player, true);
                focusInput(input);
                return null;
            }
            timeout_retries = 0;
            return human_guess.trim();
        } catch (error) {
            if (error.message === 'Input timeout') {
                console.log('process_guess: Timeout occurred', { player, timeout_retries });
                timeout_retries++;
                if (timeout_retries === max_timeout_retries - 1) {
                    feedback = 'Última oportunidad para ingresar tu adivinanza.';
                    feedback_color = 'orange';
                    display_feedback(feedback, feedback_color, player, true, 1500);
                    await delay(1500);
                    focusInput(input);
                    return null;
                } else if (timeout_retries < max_timeout_retries) {
                    feedback = `Ingresa tu adivinanza. Intentos restantes: ${max_timeout_retries - timeout_retries}.`;
                    feedback_color = 'orange';
                    display_feedback(feedback, feedback_color, player, true, 1500);
                    await delay(1500);
                    focusInput(input);
                    return null;
                } else {
                    penalizo = true;
                    feedback = 'Demasiados tiempos de espera. Pierdes el turno.';
                    if (scores[player] > 0) {
                        const penalty = Math.min(1, scores[player]);
                        feedback += ` (-${penalty} punto)`;
                        scores[player] = Math.max(0, scores[player] - penalty);
                        console.log('process_guess: Timeout penalty applied', { player, penalty, new_score: scores[player] });
                    }
                    feedback_color = 'red';
                    display_feedback(feedback, feedback_color, player, true, 1500);
                    await delay(1500);
                    return false;
                }
            }
            console.error('process_guess: Guess input error:', error);
            feedback = 'Error al procesar la entrada. Intenta de nuevo.';
            feedback_color = 'red';
            display_feedback(feedback, feedback_color, player, true);
            focusInput(input);
            return null;
        }
    }
    try {
        // Get initial guess
        if (mode === '3' && player === 'IA') {
            display_feedback('IA está pensando...', 'blue', player, true);
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
        // Process guess with retry logic
        while (retried < max_retries) {
            if (!guess) {
                penalizo = true;
                feedback = 'Adivinanza inválida. Pierdes el turno.';
                feedback_color = 'red';
                display_feedback(feedback, feedback_color, player, true);
                return { penalizo, tries, scores, guessed_letters, word_guessed: false };
            }
            console.log('process_guess: Processing guess', { player, guess, normalized_guess: normalizar(guess), normalized_secret });
            if (guess.length === 1 && lastCorrectWasVowel[player] && vowels.has(guess)) {
                display_feedback('Inválido. Ingrese una consonante.', 'red', player, true);
                retried++;
                console.log('process_guess: Invalid vowel guess', { player, guess, retried });
                if (retried >= max_retries) {
                    penalizo = true;
                    feedback = 'Demasiados intentos inválidos. Pierdes el turno.';
                    if (scores[player] > 0) {
                        const penalty = Math.min(1, scores[player]);
                        feedback += ` (-${penalty} punto)`;
                        scores[player] = Math.max(0, scores[player] - penalty);
                        console.log('process_guess: Max retries penalty applied', { player, penalty, new_score: scores[player] });
                    }
                    feedback_color = 'red';
                    display_feedback(feedback, feedback_color, player, true);
                    return { penalizo, tries, scores, guessed_letters, word_guessed: false };
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
                    display_feedback(`Advertencia: '${escapeHTML(guess)}' ya intentada. Intenta de nuevo.`, 'orange', player, true, 1500);
                    retried++;
                    console.log('process_guess: Repeated wrong letter', { player, guess, retried });
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
                    feedback = `'${escapeHTML(guess)}' ya intentada. (-${penalty} punto)`;
                    feedback_color = 'red';
                    scores[player] = Math.max(0, scores[player] - penalty);
                    console.log('process_guess: Repeated wrong letter penalty', { player, penalty, new_score: scores[player] });
                } else {
                    feedback = `'${escapeHTML(guess)}' ya intentada.`;
                    feedback_color = 'red';
                }
                display_feedback(feedback, feedback_color, player, true);
                return { penalizo, tries, scores, guessed_letters, word_guessed: false };
            } else if (guess.length === 1 && secret_word.includes(guess) && guessed_letters.has(guess)) {
                if (retried < max_retries - 1) {
                    display_feedback(`Advertencia: '${escapeHTML(guess)}' ya adivinada. Intenta de nuevo.`, 'orange', player, true);
                    retried++;
                    console.log('process_guess: Repeated correct letter', { player, guess, retried });
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
                    feedback = `'${escapeHTML(guess)}' ya adivinada. (-${penalty} punto)`;
                    feedback_color = 'red';
                    scores[player] = Math.max(0, scores[player] - penalty);
                    console.log('process_guess: Repeated correct letter penalty', { player, penalty, new_score: scores[player] });
                } else {
                    feedback = `'${escapeHTML(guess)}' ya adivinada.`;
                    feedback_color = 'red';
                }
                display_feedback(feedback, feedback_color, player, true);
                return { penalizo, tries, scores, guessed_letters, word_guessed: false };
            } else if (guess.length === secret_word.length && normalizar(guess) !== normalized_secret && used_wrong_words.has(normalizar(guess))) {
                if (retried < max_retries - 1) {
                    display_feedback(`Advertencia: '${escapeHTML(guess)}' ya intentada. Intenta de nuevo.`, 'orange', player, true);
                    retried++;
                    console.log('process_guess: Repeated wrong word', { player, guess, retried });
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
                    feedback = `'${escapeHTML(guess)}' ya intentada. (-${penalty} puntos)`;
                    feedback_color = 'red';
                    scores[player] = Math.max(0, scores[player] - penalty);
                    console.log('process_guess: Repeated wrong word penalty', { player, penalty, new_score: scores[player] });
                } else {
                    feedback = `'${escapeHTML(guess)}' ya intentada.`;
                    feedback_color = 'red';
                }
                display_feedback(feedback, feedback_color, player, true);
                return { penalizo, tries, scores, guessed_letters, word_guessed: false };
            }
            const score_before = scores[player];
            if (guess.length === secret_word.length) {
                if (normalizar(guess) === normalized_secret) {
                    scores[player] = max_score + (secret_word.length >= 10 ? Array.from(guessed_letters).filter(l => secret_word.includes(l)).length : 0);
                    guessed_letters.clear();
                    secret_word.split('').forEach(l => guessed_letters.add(l));
                    feedback = `¡Felicidades, ${escapeHTML(player)}! Adivinaste '${escapeHTML(secret_word)}'!`;
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
                        feedback = `Incorrecto! '${escapeHTML(guess)}' no es la palabra pero contiene: ${Array.from(letras_nuevas).map(l => escapeHTML(l)).join(', ')}. (+${puntos_sumados} puntos)`;
                        if (penalizacion > 0) {
                            feedback += `\nPenalización: -${penalizacion} puntos`;
                            scores[player] = Math.max(0, scores[player] - penalizacion);
                        }
                        feedback_color = 'orange';
                    } else {
                        feedback = `Incorrecto. '${escapeHTML(guess)}' sin letras nuevas.`;
                        if (penalizacion > 0) {
                            feedback += ` (-${penalizacion} puntos)`;
                            scores[player] = Math.max(0, scores[player] - penalizacion);
                        }
                        feedback_color = 'red';
                    }
                    used_wrong_words.add(normalizar(guess));
                    console.log('process_guess: Word guess processed', { guess, letras_nuevas: Array.from(letras_nuevas), score_before, score_after: scores[player] });
                }
            } else {
                const feedback_data = get_guess_feedback(guess, secret_word, scores[player]);
                feedback = Array.isArray(feedback_data)
                    ? feedback_data.join('\n')
                    : (feedback_data.messages ? feedback_data.messages.join('\n') : String(feedback_data));
                feedback_color = feedback_data.color || 'black';
                if (secret_word.includes(guess) && !guessed_letters.has(guess)) {
                    scores[player] = Math.min(max_score, scores[player] + secret_word.split('').filter(l => l === guess).length);
                    guessed_letters.add(guess);
                    lastCorrectWasVowel[player] = vowels.has(guess);
                    console.log('process_guess: Correct letter guess', { player, guess, score_before, score_after: scores[player] });
                } else if (!secret_word.includes(guess)) {
                    used_wrong_letters.add(guess);
                    if (scores[player] > 0) {
                        const penalty = Math.min(1, scores[player]);
                        scores[player] = Math.max(0, scores[player] - penalty);
                        console.log('process_guess: Wrong letter penalty', { player, penalty, score_before, score_after: scores[player] });
                    }
                    lastCorrectWasVowel[player] = false;
                }
            }
            if (feedback && feedback_color) {
                display_feedback(feedback, feedback_color, player, true, 1500);
                await delay(1500);
            }
            if (restar_intento && !penalizo) {
                tries[player]--;
            }
            console.log('process_guess: Ending for', player, {
                penalizo,
                tries: tries[player],
                score: scores[player],
                guessed_letters: Array.from(guessed_letters),
                word_guessed: normalizar(guess) === normalized_secret
            });
            return { penalizo, tries, scores, guessed_letters, word_guessed: normalizar(guess) === normalized_secret };
        }
    } catch (err) {
        console.error('process_guess: Unexpected error', err);
        feedback = `Error inesperado al procesar la adivinanza: ${escapeHTML(err.message || 'Unknown error')}.`;
        feedback_color = 'red';
        display_feedback(feedback, feedback_color, player, true);
        return { penalizo: true, tries, scores, guessed_letters, word_guessed: false };
    } finally {
        console.log('process_guess: Completed for', player);
    }
}

async function play_game(
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
    total_scores,
    wins,
    delay,
    display_feedback,
    gameType,
    sessionId,
    localPlayer
) {
    if (output && output.innerHTML) output.innerHTML = '';
    console.log('play_game: Starting, Loaded version 2025-07-03-v10.0', {
        mode, players, difficulty, games_played, games_to_play, gameType, sessionId, localPlayer
    });

    let channel = null;
    let loadingMsgElem = null;
    let gameIsOver = false;
    const used_wrong_letters = new Set();
    const used_wrong_words = new Set();
    const max_score = 10;
    const lastCorrectWasVowel = Object.fromEntries(players.map(p => [p, false]));
    const vowels = new Set(['a', 'e', 'i', 'o', 'u']);

    try {
        if (mode === '2' && gameType === 'remoto' && !sessionId) {
            console.error('play_game: Invalid sessionId for remote mode', sessionId);
            display_feedback('Error: ID de sesión no definido. Reinicia el juego.', 'red', null, false);
            return;
        }
        if (!Array.isArray(players) || players.some(p => !p || typeof p !== 'string')) {
            console.error('play_game: Invalid players array', players);
            display_feedback('Error: Jugadores no válidos. Reinicia el juego.', 'red', null, false);
            return;
        }

        // Hide UI elements
        prompt.style.display = 'none';
        input.style.display = 'none';
        output.style.display = 'none';
        button.style.display = 'none';

        // Show loading message if needed
        let showLoading = true;
        if (mode === '2' && gameType === 'remoto') {
            showLoading = !secret_word;
        }
        if (showLoading) {
            loadingMsgElem = document.createElement('p');
            loadingMsgElem.innerText = 'Generando palabra secreta';
            loadingMsgElem.style.fontSize = '16px';
            loadingMsgElem.style.color = 'blue';
            loadingMsgElem.style.margin = '30px';
            container.appendChild(loadingMsgElem);
            await new Promise(requestAnimationFrame);
        }

        // State setup
        let provided_secret_word = secret_word;
        let guessed_letters = new Set();
        let tries = {};
        let scores = {};
        let current_player_idx = 0;
        let total_tries = 0;

        if (mode === '2' && gameType === 'remoto') {
            let attempts = 5;
            let game;
            while (attempts--) {
                try {
                    const { data, error } = await supabase
                        .from('games')
                        .select('*')
                        .eq('session_id', sessionId)
                        .single();
                    if (error) {
                        if (error.code === 'PGRST116') {
                            console.error('play_game: Session not found', sessionId);
                            display_feedback('Error: Sesión no encontrada. Reinicia el juego.', 'red', null, false);
                            return;
                        }
                        throw error;
                    }
                    game = data;
                    guessed_letters = new Set(Array.isArray(game.guessed_letters) ? game.guessed_letters : []);
                    if (game.secret_word) {
                        provided_secret_word = game.secret_word;
                    }
                    if (
                        game.secret_word &&
                        game.status === 'playing' &&
                        game.initialized
                    ) {
                        guessed_letters = new Set(Array.isArray(game.guessed_letters) ? game.guessed_letters : []);
                        if (
                            guessed_letters.size > 0 &&
                            provided_secret_word &&
                            normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l))
                        ) {
                            guessed_letters.clear();
                            await supabase
                                .from('games')
                                .update({ guessed_letters: [] })
                                .eq('session_id', sessionId);
                        }
                        total_tries = Math.max(1, Math.floor(provided_secret_word.length / 2));
                        tries = game.tries && typeof game.tries === 'object'
                            ? game.tries
                            : Object.fromEntries(players.map(p => [p, total_tries]));
                        let triesChanged = false;
                        players.forEach(p => {
                            if (!tries[p] || tries[p] <= 0) {
                                console.warn(`Resetting tries for ${p} to ${total_tries}`);
                                tries[p] = total_tries;
                                triesChanged = true;
                            }
                        });
                        if (triesChanged) {
                            await supabase
                                .from('games')
                                .update({ tries })
                                .eq('session_id', sessionId);
                        }
                        scores = game.scores && typeof game.scores === 'object'
                            ? game.scores
                            : Object.fromEntries(players.map(p => [p, 0]));
                        current_player_idx = players.indexOf(game.current_player);
                        if (current_player_idx === -1) {
                            console.warn('play_game: Invalid current_player, defaulting to first player', game.current_player);
                            current_player_idx = 0;
                            await supabase
                                .from('games')
                                .update({ current_player: players[0], last_updated: new Date() })
                                .eq('session_id', sessionId);
                        }
                        break;
                    }
                    await delay(1000);
                } catch (err) {
                    console.warn(`play_game: Retry ${5 - attempts}/5 for Supabase fetch`, err);
                    if (err.code === '42501') {
                        console.error('play_game: Permission denied', err);
                        display_feedback('Error: Permiso denegado. Verifica las reglas de Supabase.', 'red', null, false);
                        return;
                    }
                }
            }
            if (!provided_secret_word || typeof provided_secret_word !== 'string') {
                console.error('play_game: provided_secret_word is missing or invalid', provided_secret_word);
                display_feedback('Error: No se pudo obtener la palabra secreta. Reinicia el juego.', 'red', null, false);
                return;
            }
        } else {
            provided_secret_word = secret_word || await get_secret_word();
            total_tries = Math.max(1, mode === '1' ? provided_secret_word.length - 2 : Math.floor(provided_secret_word.length / 2));
            guessed_letters = new Set();
            tries = Object.fromEntries(players.map(p => [p, total_tries]));
            scores = Object.fromEntries(players.map(p => [p, 0]));
            current_player_idx = games_played % players.length;
        }

        // Remove loading message and show UI
        if (loadingMsgElem && loadingMsgElem.parentNode) {
            container.removeChild(loadingMsgElem);
        }
        prompt.style.display = '';
        input.style.display = '';
        output.style.display = '';
        button.style.display = 'none';

        let game_info, player_info, progress;
        try {
            game_info = document.createElement('p');
            game_info.className = 'game-info';
            game_info.innerHTML = `--- Ronda ${games_played + 1} de ${games_to_play} ---<br>` +
                `Palabra secreta: ${provided_secret_word.length} letras. Intentos: ${total_tries}. Puntaje máximo: ${max_score}.` +
                (mode === '3' ? `<br>Dificultad: ${difficulty || 'N/A'}` : '') +
                (mode === '2' && gameType === 'remoto' ? `<br>ID de sesión: ${escapeHTML(sessionId)}` : '');
            player_info = document.createElement('p');
            player_info.id = 'player_info';
            player_info.className = 'player-info';
            progress = document.createElement('p');
            progress.className = 'game-progress';
            container.insertBefore(game_info, prompt);
            container.insertBefore(player_info, prompt);
            container.insertBefore(progress, prompt);
            output.innerHTML = '';
            prompt.innerText = 'Ingresa una letra o la palabra completa:';
            input.value = '';
            focusInput(input);
            let current_player_idx_ref = { value: current_player_idx };

            async function update_ui(current_player_idx_ref, currentPlayer) {
                const idx = current_player_idx_ref.value;
                const player = players[idx] || 'Jugador 1';
                const other_player = players[(idx + 1) % players.length] || null;
                try {
                    if (mode === '1') {
                        player_info.innerHTML = `<strong>${escapeHTML(player)}</strong>: Intentos: ${tries[player] || 0} | Puntaje: ${scores[player] || 0}`;
                    } else {
                        player_info.innerHTML = `Turno de <strong>${escapeHTML(player)}</strong>: Intentos: ${tries[player] || 0} | Puntaje: ${scores[player] || 0}` +
                            (other_player ? `<br><strong>${escapeHTML(other_player)}</strong>: Intentos: ${tries[other_player] || 0} | Puntaje: ${scores[other_player] || 0}` : '');
                    }
                    progress.innerText = `Palabra: ${formato_palabra(normalizar(provided_secret_word).split('').map(l => guessed_letters.has(l) ? l : "_"))}`;
                    prompt.innerText = mode === '2' && gameType === 'remoto' && player !== localPlayer ? `Esperando a ${escapeHTML(player)}...` : 'Ingresa una letra o la palabra completa:';
                    if (input.parentNode) {
                        const isLocalPlayer = mode !== '2' || gameType !== 'remoto' || (player && localPlayer && player.toLowerCase() === localPlayer.toLowerCase());
                        input.disabled = !isLocalPlayer;
                        console.log('update_ui: Input state updated', { player, localPlayer, isLocalPlayer, inputId: input.id, disabled: input.disabled });
                        if (isLocalPlayer) {
                            focusInput(input);
                        }
                    } else {
                        console.error('update_ui: Input not in DOM', { input });
                    }
                } catch (err) {
                    console.error('update_ui: Error updating UI', err);
                    display_feedback('Error al actualizar la interfaz del juego.', 'red', null, false);
                }
            }
            await update_ui(current_player_idx_ref, players[current_player_idx]);

            // Game Loop
            async function game_loop(
                players, tries, scores, mode, provided_secret_word, guessed_letters, gameType, sessionId,
                output, container, prompt, input, button, display_feedback, current_player_idx_ref,
                game_info, games_played, games_to_play, total_scores, difficulty, channel
            ) {
                if (mode === '2' && gameType === 'remoto') {
                    let isGuessing = false;
                    try {
                        // 1. Fetch initial game state (already done in play_game, but verify)
                        const { data: gameData, error: gameError } = await supabase
                            .from('games')
                            .select('*')
                            .eq('session_id', sessionId)
                            .single();
                        if (gameError || !gameData) {
                            console.error('REMOTE GAME LOOP: Failed to fetch initial game state', gameError);
                            display_feedback('Error al cargar el estado del juego. Intenta de nuevo.', 'red', null, false);
                            return channel;
                        }
                        console.log('REMOTE GAME LOOP: Initial game state', gameData);

                        // Update local state from database
                        guessed_letters.clear();
                        (Array.isArray(gameData.guessed_letters) ? gameData.guessed_letters : []).forEach(letter => guessed_letters.add(letter));
                        Object.assign(tries, gameData.tries || {});
                        Object.assign(scores, gameData.scores || {});
                        current_player_idx_ref.value = players.indexOf(gameData.current_player) || 0;

                        // Initial UI update
                        await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);

                        // 2. Set up subscription and return a Promise that resolves when game ends
                        return new Promise(async (resolve) => {
                            if (channel) {
                                supabase.removeChannel(channel);
                            }
                            channel = supabase
                                .channel(`game:${sessionId}`)
                                .on(
                                    'postgres_changes',
                                    {
                                        event: 'UPDATE',
                                        schema: 'public',
                                        table: 'games',
                                        filter: `session_id=eq.${sessionId}`
                                    },
                                    async (payload) => {
                                        try {
                                            const game = payload.new;
                                            console.log('SUBSCRIPTION: Received game update', game);
                                            if (!game || !game.secret_word || !game.initialized || game.status === 'waiting_for_player2') {
                                                return;
                                            }
                                            if (game.status === 'finished' || game.status === 'ended') {
                                                gameIsOver = true;
                                                display_feedback(
                                                    `Juego terminado. Palabra: ${format_secret_word(game.secret_word, new Set(game.guessed_letters || []))}.`,
                                                    'black',
                                                    null,
                                                    false
                                                );
                                                resolve();
                                                return;
                                            }
                                            if (game.status !== 'playing') {
                                                return;
                                            }

                                            // Update local state
                                            guessed_letters.clear();
                                            (Array.isArray(game.guessed_letters) ? game.guessed_letters : []).forEach(letter => guessed_letters.add(letter));
                                            Object.assign(tries, game.tries || {});
                                            Object.assign(scores, game.scores || {});
                                            current_player_idx_ref.value = players.indexOf(game.current_player);
                                            if (current_player_idx_ref.value === -1) {
                                                current_player_idx_ref.value = 0;
                                                await supabase
                                                    .from('games')
                                                    .update({ current_player: players[0], last_updated: new Date() })
                                                    .eq('session_id', sessionId);
                                            }

                                            // Update UI before processing guess
                                            await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);

                                            // Handle guess if it's the local player's turn
                                            if (
                                                game.current_player &&
                                                localPlayer &&
                                                game.current_player.trim().toLowerCase() === localPlayer.trim().toLowerCase() &&
                                                !isGuessing &&
                                                !gameIsOver
                                            ) {
                                                isGuessing = true;
                                                try {
                                                    // Ensure UI is ready for input
                                                    await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);
                                                    console.log('REMOTE GAME LOOP: Before get_guess', { current_player: game.current_player, isGuessing, inputDisabled: input.disabled });
                                                    const guess = await window.get_guess(
                                                        guessed_letters,
                                                        provided_secret_word,
                                                        prompt,
                                                        input,
                                                        output,
                                                        button
                                                    );
                                                    console.log('REMOTE GAME LOOP: After get_guess', { guess });
                                                    console.log('REMOTE GAME LOOP: Guess received', { guess });
                                                    if (guess === null) {
                                                        display_feedback('Tiempo de espera agotado. Turno perdido.', 'red', localPlayer, true);
                                                        tries[localPlayer] = Math.max(0, (tries[localPlayer] || 0) - 1);
                                                        current_player_idx_ref.value = (current_player_idx_ref.value + 1) % players.length;
                                                        await supabase.from('games').update({
                                                            tries,
                                                            current_player: players[current_player_idx_ref.value],
                                                            last_updated: new Date()
                                                        }).eq('session_id', sessionId);
                                                        await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);
                                                    } else {
                                                        const result = await process_guess(
                                                            localPlayer,
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
                                                        let attempts = 3;
                                                        while (attempts--) {
                                                            try {
                                                                const allPlayersOutOfTries = players.every(p => tries[p] <= 0);
                                                                const wordFullyGuessed = normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l));
                                                                const newStatus = (result.word_guessed || allPlayersOutOfTries || wordFullyGuessed) ? 'finished' : 'playing';
                                                                current_player_idx_ref.value = (current_player_idx_ref.value + 1) % players.length;
                                                                const { error } = await supabase
                                                                    .from('games')
                                                                    .update({
                                                                        guessed_letters: Array.from(guessed_letters),
                                                                        tries,
                                                                        scores,
                                                                        current_player: players[current_player_idx_ref.value],
                                                                        status: newStatus,
                                                                        last_updated: new Date()
                                                                    })
                                                                    .eq('session_id', sessionId);
                                                                if (error) throw error;
                                                                if (newStatus === 'finished') {
                                                                    gameIsOver = true;
                                                                    display_feedback(
                                                                        `Juego terminado. Palabra: ${format_secret_word(provided_secret_word, guessed_letters)}.`,
                                                                        'black',
                                                                        null,
                                                                        false
                                                                    );
                                                                    resolve();
                                                                    return;
                                                                }
                                                                await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);
                                                                break;
                                                            } catch (err) {
                                                                console.warn(`REMOTE GAME LOOP: Retry ${3 - attempts}/3 for DB update`, err);
                                                                if (attempts === 0) {
                                                                    display_feedback('Error de sincronización. Intenta de nuevo.', 'red', null, false);
                                                                    resolve();
                                                                    return;
                                                                }
                                                                await delay(500);
                                                            }
                                                        }
                                                    }
                                                } catch (err) {
                                                    console.error('REMOTE GAME LOOP: Error in get_guess', err);
                                                    display_feedback('Error al procesar la adivinanza. Turno perdido.', 'red', localPlayer, true);
                                                    tries[localPlayer] = Math.max(0, (tries[localPlayer] || 0) - 1);
                                                    current_player_idx_ref.value = (current_player_idx_ref.value + 1) % players.length;
                                                    await supabase.from('games').update({
                                                        tries,
                                                        current_player: players[current_player_idx_ref.value],
                                                        last_updated: new Date()
                                                    }).eq('session_id', sessionId);
                                                    await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);
                                                } finally {
                                                    isGuessing = false;
                                                }
                                            }
                                        } catch (error) {
                                            console.error('REMOTE GAME LOOP: Error in listener', error);
                                            display_feedback('Error en la lógica del juego. Intenta de nuevo.', 'red', null, false);
                                        }
                                    }
                                )
                                .subscribe();

                            window.gameChannel = channel;

                            // 3. Process first move if it's this client's turn
                            if (
                                gameData.current_player &&
                                localPlayer &&
                                gameData.current_player.trim().toLowerCase() === localPlayer.trim().toLowerCase() &&
                                !gameIsOver &&
                                !isGuessing
                            ) {
                                isGuessing = true;
                                try {
                                    // Ensure UI is ready for input
                                    await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);
                                    console.log('REMOTE GAME LOOP: Before get_guess', { current_player: game.current_player, isGuessing, inputDisabled: input.disabled });
                                    const guess = await window.get_guess(
                                        guessed_letters,
                                        provided_secret_word,
                                        prompt,
                                        input,
                                        output,
                                        button
                                    );
                                    console.log('REMOTE GAME LOOP: After get_guess', { guess });
                                    if (guess !== null) {
                                        const result = await process_guess(
                                            localPlayer,
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
                                        let attempts = 3;
                                        while (attempts--) {
                                            try {
                                                const allPlayersOutOfTries = players.every(p => tries[p] <= 0);
                                                const wordFullyGuessed = normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l));
                                                const newStatus = (result.word_guessed || allPlayersOutOfTries || wordFullyGuessed) ? 'finished' : 'playing';
                                                current_player_idx_ref.value = (current_player_idx_ref.value + 1) % players.length;
                                                const { error } = await supabase
                                                    .from('games')
                                                    .update({
                                                        guessed_letters: Array.from(guessed_letters),
                                                        tries,
                                                        scores,
                                                        current_player: players[current_player_idx_ref.value],
                                                        status: newStatus,
                                                        last_updated: new Date()
                                                    })
                                                    .eq('session_id', sessionId);
                                                if (error) throw error;
                                                if (newStatus === 'finished') {
                                                    gameIsOver = true;
                                                    display_feedback(
                                                        `Juego terminado. Palabra: ${format_secret_word(provided_secret_word, guessed_letters)}.`,
                                                        'black',
                                                        null,
                                                        false
                                                    );
                                                    resolve();
                                                    return;
                                                }
                                                await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);
                                                break;
                                            } catch (err) {
                                                console.warn(`REMOTE GAME LOOP: Retry ${3 - attempts}/3 for first move DB update`, err);
                                                if (attempts === 0) {
                                                    display_feedback('Error de sincronización en el primer movimiento. Intenta de nuevo.', 'red', null, false);
                                                    resolve();
                                                    return;
                                                }
                                                await delay(500);
                                            }
                                        }
                                    } else {
                                        display_feedback('Tiempo de espera agotado. Turno perdido.', 'red', localPlayer, true);
                                        tries[localPlayer] = Math.max(0, (tries[localPlayer] || 0) - 1);
                                        current_player_idx_ref.value = (current_player_idx_ref.value + 1) % players.length;
                                        await supabase.from('games').update({
                                            tries,
                                            current_player: players[current_player_idx_ref.value],
                                            last_updated: new Date()
                                        }).eq('session_id', sessionId);
                                        await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);
                                    }
                                } catch (err) {
                                    console.error('REMOTE GAME LOOP: Error in first move', err);
                                    display_feedback('Error al procesar la adivinanza. Turno perdido.', 'red', localPlayer, true);
                                    tries[localPlayer] = Math.max(0, (tries[localPlayer] || 0) - 1);
                                    current_player_idx_ref.value = (current_player_idx_ref.value + 1) % players.length;
                                    await supabase.from('games').update({
                                        tries,
                                        current_player: players[current_player_idx_ref.value],
                                        last_updated: new Date()
                                    }).eq('session_id', sessionId);
                                    await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);
                                } finally {
                                    isGuessing = false;
                                }
                            }
                        });
                    } catch (err) {
                        console.error('REMOTE GAME LOOP: Outer error', err);
                        display_feedback('Error en la lógica remota. Intenta de nuevo.', 'red', null, false);
                        return channel;
                    }
                } else {
                    // Non-remote game loop (unchanged)
                    while (
                        players.some(p => tries[p] > 0) &&
                        !normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l))
                    ) {
                        const current_player_idx = current_player_idx_ref.value;
                        const player = players[current_player_idx];

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
                        await supabase.from('games').update({
                            guessed_letters: Array.from(guessed_letters),
                            tries,
                            scores,
                            current_player: players[(current_player_idx + 1) % players.length],
                            last_updated: new Date()
                        }).eq('session_id', sessionId);
                        //await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);

                        if (!result) {
                            console.error('game_loop: process_guess returned undefined');
                            break;
                        }
                        if (result && (result.word_guessed || normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l)))) {
                            display_feedback(`¡${player} adivinó la palabra!`, 'green', null, true);
                            break;
                        }
                        if (result.penalizo) {
                            tries[player]--;
                        }
                        if (tries[player] <= 0) {
                            display_feedback(`¡${player} se quedó sin intentos!`, 'red', null, true);
                            if ((mode === '2' && gameType === 'local') || mode === '3') {
                                current_player_idx_ref.value = (current_player_idx_ref.value + 1) % players.length;
                                await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);
                            }
                            continue;
                        }
                        if ((mode === '2' && gameType === 'local') || mode === '3') {
                            current_player_idx_ref.value = (current_player_idx_ref.value + 1) % players.length;
                            await update_ui(current_player_idx_ref, players[current_player_idx_ref.value]);
                        }
                    }
                }
            }
            channel = await game_loop(
                players, tries, scores, mode, provided_secret_word, guessed_letters, gameType, sessionId,
                output, container, prompt, input, button, display_feedback, current_player_idx_ref,
                game_info, games_played, games_to_play, total_scores, difficulty, channel
            );

            if (!gameIsOver && mode === '2' && gameType === 'remoto') {
                console.log('play_game: Remote game active, waiting for subscription updates');
                return; // Wait for subscription to handle game end
            }

            // End of game UI and buttons
            players.forEach(p => {
                total_scores[p] = (total_scores[p] || 0) + (scores[p] || 0);
            });
            output.innerHTML = '';

            const button_group = document.createElement('div');
            button_group.className = 'button-group';
            button_group.style.display = 'inline-block';
            button_group.style.margin = '10px';
            try {
                if (input.parentNode) container.removeChild(input);
                if (button.parentNode) container.removeChild(button);
            } catch (err) { }
            const formatted_word = format_secret_word(provided_secret_word, guessed_letters);
            output.innerHTML += `Juego terminado. Palabra: ${formatted_word}.`;
            output.style.color = 'black';
            players.forEach(p => {
                output.innerHTML += `<br><strong>${escapeHTML(p)}</strong> puntaje este juego: ${scores[p] || 0}`;
            });
            if (players.length === 2) {
                const [p1, p2] = players;
                if (scores[p1] > scores[p2]) {
                    output.innerHTML += `<br>Ganador juego ${games_played + 1}: <strong>${escapeHTML(p1)}</strong>!`;
                    wins[p1]++;
                } else if (scores[p2] > scores[p1]) {
                    output.innerHTML += `<br>Ganador juego ${games_played + 1}: <strong>${escapeHTML(p2)}</strong>!`;
                    wins[p2]++;
                } else {
                    output.innerHTML += `<br>Empate!`;
                }
                output.innerHTML += `<br>Puntajes totales acumulados:`;
                players.forEach(p => output.innerHTML += `<br><strong>${escapeHTML(p)}</strong>: ${total_scores[p]} puntos, ${wins[p]} ganados`);
                container.appendChild(document.createElement('br'));
            }
            const repeat_button = document.createElement('button');
            repeat_button.className = 'game-button repeat-button';
            repeat_button.innerText = 'Reiniciar';
            repeat_button.style.padding = '8px 16px';
            repeat_button.style.fontSize = '16px';
            repeat_button.style.cursor = 'pointer';
            repeat_button.style.margin = '5px';
            repeat_button.onclick = async () => {
                output.innerText = '';
                if (mode === '2' && gameType === 'remoto') {
                    const { error } = await supabase
                        .from('games')
                        .delete()
                        .eq('session_id', sessionId);
                    if (error) console.error('play_game: Error deleting session', error);
                    main();
                } else {
                    main({
                        mode,
                        player1: players[0],
                        player2: players[1] || null,
                        difficulty,
                        gameType,
                        skipMenu: true
                    });
                }
            };
            button_group.appendChild(repeat_button);
            const restart_button = document.createElement('button');
            restart_button.className = 'game-button restart-button';
            restart_button.innerText = 'Menu';
            restart_button.style.padding = '8px 16px';
            restart_button.style.fontSize = '16px';
            restart_button.style.cursor = 'pointer';
            restart_button.style.margin = '5px';
            restart_button.onclick = async () => {
                if (mode === '2' && gameType === 'remoto') {
                    const { error } = await supabase
                        .from('games')
                        .delete()
                        .eq('session_id', sessionId);
                    if (error) console.error('play_game: Error deleting session', error);
                }
                document.body.innerHTML = '';
                main();
            };
            button_group.appendChild(restart_button);
            if (mode !== '1' && games_played < games_to_play - 1 && !Object.values(wins).some(w => w === 2)) {
                const next_button = document.createElement('button');
                next_button.className = 'game-button next-button';
                next_button.innerText = 'Siguiente Ronda';
                next_button.style.padding = '8px 16px';
                next_button.style.fontSize = '16px';
                next_button.style.cursor = 'pointer';
                next_button.style.margin = '5px';
                next_button.onclick = async () => {
                    output.innerText = '';
                    if (button_group.parentNode) container.removeChild(button_group);
                    if (mode === '2' && gameType === 'remoto') {
                        const { error } = await supabase
                            .from('games')
                            .delete()
                            .eq('session_id', sessionId);
                        if (error) console.error('play_game: Error deleting session', error);
                    }
                    main({
                        mode,
                        player1: players[0],
                        player2: players[1] || null,
                        difficulty,
                        gameType,
                        skipMenu: true,
                        games_played: games_played + 1,
                        total_scores,
                        wins,
                        sessionId
                    });
                };
                button_group.appendChild(next_button);
            } else {
                output.innerHTML += `<br>--- Resultado Final ---`;
                players.forEach(p => output.innerHTML += `<br><strong>${escapeHTML(p)}</strong>: ${total_scores[p]} puntos, ${wins[p]} ganados`);
                const [p1, p2] = players;
                if (wins[p1] > wins[p2]) {
                    output.innerHTML += `<br>Ganador absoluto: <strong>${escapeHTML(p1)}</strong>!`;
                } else if (wins[p2] > wins[p1]) {
                    output.innerHTML += `<br>Ganador absoluto: <strong>${escapeHTML(p2)}</strong>!`;
                } else if (total_scores[p1] > total_scores[p2]) {
                    output.innerHTML += `<br>Ganador absoluto (por puntos): <strong>${escapeHTML(p1)}</strong>!`;
                } else if (total_scores[p2] > total_scores[p1]) {
                    output.innerHTML += `<br>Ganador absoluto (por puntos): <strong>${escapeHTML(p2)}</strong>!`;
                } else {
                    output.innerHTML += `<br>Empate final!`;
                }
                if (mode === '2' && gameType === 'remoto') {
                    await supabase
                        .from('games')
                        .update({ status: 'ended', last_updated: new Date() })
                        .eq('session_id', sessionId);
                }
            }
            container.appendChild(button_group);
            console.log('play_game: Completed', { games_played, total_scores });

        } catch (err) {
            console.error('play_game: Error in game execution', err);
            display_feedback('Error en el juego. Por favor, reinicia.', 'red', null, false);
            throw err;
        }
    } finally {
        if (window.gameChannel) {
            console.log('play_game: Cleaning up Supabase channel', sessionId);
            supabase.removeChannel(window.gameChannel);
            window.gameChannel = null;
        }
    }
}

async function main(config = null) {
    console.log('main: CALLED', { config, stack: new Error().stack });
    await initSupabase();
    //await create_game_ui();
    console.log('main: Starting', config ? '(rematch mode)' : '');
    try {
        if (config && config.skipMenu) {
            // Rematch: skip menu, use provided config
            const players = [config.player1, config.player2].filter(Boolean);
            // Build a fresh UI
            document.body.innerHTML = '';
            const container = document.createElement('div');
            container.className = 'game-container';
            document.body.appendChild(container);

            const title = document.createElement('h1');
            title.className = 'game-title';
            title.innerText = 'Juego de Adivinar Palabras';
            container.appendChild(title);

            const prompt = document.createElement('p');
            prompt.className = 'game-prompt';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'game-input';
            input.id = 'game-input';
            const button = document.createElement('button');
            button.className = 'game-button';
            button.innerText = 'Enviar';
            const output = document.createElement('span');
            output.className = 'game-output';

            container.appendChild(prompt);
            container.appendChild(input);
            container.appendChild(button);
            container.appendChild(output);

            // Clean up previous session for remote mode
            if (config.mode === '2' && config.gameType === 'remoto' && config.sessionId) {
                const { error } = await supabase
                    .from('games')
                    .delete()
                    .eq('session_id', config.sessionId);
                if (error) console.error('main: Error deleting previous session', error);
            }

            await play_game(
                null,
                null,
                config.mode,
                players,
                output,
                container,
                prompt,
                input,
                button,
                config.difficulty,
                typeof config.games_played === 'number' ? config.games_played : 0,
                config.mode === '1' ? 1 : 3,
                config.total_scores || Object.fromEntries(players.map(p => [p, 0])),
                config.wins || Object.fromEntries(players.map(p => [p, 0])),
                delay,
                display_feedback,
                config.gameType,
                config.sessionId || null,
                config.localPlayer
            );
            return;
        }

        // Normal flow: show menu and get game state from create_game_ui
        const gameState = await create_game_ui();
        console.log('main: Game state received', gameState);
        if (gameState) {
            // Replace input and button with fresh clones to remove all old handlers
            const newInput = gameState.input.cloneNode(true);
            const newButton = gameState.button.cloneNode(true);
            gameState.input.parentNode.replaceChild(newInput, gameState.input);
            gameState.button.parentNode.replaceChild(newButton, gameState.button);
            // Update references in gameState
            gameState.input = newInput;
            gameState.button = newButton;
            console.log('main: create_game_ui resolved with', gameState);
            const players = gameState.players && Array.isArray(gameState.players)
                ? gameState.players
                : [gameState.player1, gameState.player2].filter(Boolean);
            console.log('main: Players:', players);
            try {
                await play_game(
                    null,
                    (gameState.mode === '2' && gameState.gameType === 'remoto') ? null : (gameState.secretWord || null),
                    gameState.mode,
                    players,
                    gameState.output,
                    gameState.container,
                    gameState.prompt,
                    gameState.input,
                    gameState.button,
                    gameState.difficulty,
                    0,
                    gameState.mode === '1' ? 1 : 3,
                    Object.fromEntries(players.map(p => [p, 0])),
                    Object.fromEntries(players.map(p => [p, 0])),
                    delay,
                    display_feedback,
                    gameState.gameType,
                    gameState.sessionId,
                    gameState.localPlayer // <-- ADD THIS!
                );
                console.log('main: play_game completed');
            } catch (error) {
                console.error('main: Error in play_game:', error);
                const output = document.querySelector('.game-output');
                if (output) {
                    output.innerText = 'Error al iniciar el juego. Intenta de nuevo.';
                    output.style.color = 'red';
                }
            }
        } else {
            console.warn('main: create_game_ui returned null');
            const output = document.querySelector('.game-output');
            if (output) {
                output.innerText = 'Error al configurar el juego. Intenta de nuevo.';
                output.style.color = 'red';
            }
        }
    } catch (error) {
        console.error('main: Error in main:', error);
        const output = document.querySelector('.game-output');
        if (output) {
            output.innerText = 'Error crítico al iniciar el juego. Intenta de nuevo.';
            output.style.color = 'red';
        }
    }
}
main();