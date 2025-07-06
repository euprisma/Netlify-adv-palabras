import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.42.7/+esm";

// Global variables and constants
const supabaseUrl = 'https://owogtpmqckdzutupcyvy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93b2d0cG1xY2tkenV0dXBjeXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAyNjY4MDksImV4cCI6MjA0NTg0MjgwOX0.jG9kN8KO5sC8nE2Qh9R0f7F1qG8yL0n3gV9h6g9kN8KO';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);
const WORD_API_KEY = 'JGZtMGy2radD8zIA1hAQgoqJKa8Nzhck0XhgDtoL';
const TRANSLATE_API_KEY = '8c71deb7-78c4-4ee2-8bf1-621a0a490d85:fx';
const vowels = ['a', 'e', 'i', 'o', 'u'];
const total_tries = 6;
const max_score = 100;
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
]; // Replace with the full original list if available

// Utility functions
function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function escapeHTML(str) {
    if (str == null || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#39;');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function validateDOMElements(elements, errorMessage) {
    const missing = Object.entries(elements).filter(([name, el]) => !el || !el.parentNode);
    if (missing.length) {
        console.error(errorMessage, missing.map(([name]) => name));
        throw new Error(errorMessage);
    }
    return true;
}

async function retryOperation(operation, maxAttempts = 3) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        try {
            return await operation();
        } catch (error) {
            attempts++;
            if (attempts === maxAttempts) throw error;
            const delayMs = 1000 * Math.pow(2, attempts);
            console.warn(`Retry ${attempts}/${maxAttempts}`, error);
            await delay(delayMs);
        }
    }
}

function showLoading(container, message) {
    const loading = document.createElement('p');
    loading.className = 'loading';
    loading.innerText = message;
    container.appendChild(loading);
    return () => loading.parentNode?.removeChild(loading);
}

function focusInput(input) {
    input.focus();
}

// Game state management
class GameState {
    constructor({ mode, players, gameType, sessionId, secretWord, difficulty }) {
        this.mode = mode;
        this.players = players;
        this.gameType = gameType;
        this.sessionId = sessionId;
        this.secretWord = secretWord;
        this.difficulty = difficulty;
        this.guessedLetters = new Set();
        this.tries = Object.fromEntries(players.map(p => [p, total_tries]));
        this.scores = Object.fromEntries(players.map(p => [p, 0]));
        this.currentPlayerIdx = 0;
        this.status = 'playing';
    }

    async syncWithSupabase() {
        if (this.gameType === 'remoto') {
            const { data, error } = await supabase
                .from('games')
                .select('*')
                .eq('session_id', this.sessionId)
                .single();
            if (error) throw error;
            this.guessedLetters = new Set(Array.isArray(data.guessed_letters) ? data.guessed_letters : []);
            this.tries = data.tries || this.tries;
            this.scores = data.scores || this.scores;
            this.currentPlayerIdx = this.players.indexOf(data.current_player) || 0;
            this.status = data.status || 'playing';
        }
    }

    async saveToSupabase() {
        if (this.gameType === 'remoto') {
            await retryOperation(async () => {
                const { error } = await supabase
                    .from('games')
                    .update({
                        guessed_letters: Array.from(this.guessedLetters),
                        tries: this.tries,
                        scores: this.scores,
                        current_player: this.players[this.currentPlayerIdx],
                        status: this.status,
                        last_updated: new Date().toISOString()
                    })
                    .eq('session_id', this.sessionId);
                if (error) throw error;
            });
        }
    }
}

// Supabase helpers
async function createSession(sessionId, players, gameType, secret_word, difficulty) {
    return retryOperation(async () => {
        const { data, error } = await supabase
            .from('games')
            .insert({
                session_id: sessionId,
                players: players,
                game_type: gameType,
                secret_word: secret_word,
                guessed_letters: [],
                tries: Object.fromEntries(players.map(p => [p, total_tries])),
                scores: Object.fromEntries(players.map(p => [p, 0])),
                current_player: players[0],
                status: 'playing',
                difficulty: difficulty,
                last_updated: new Date().toISOString()
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    });
}

async function getSession(sessionId) {
    return retryOperation(async () => {
        const { data, error } = await supabase
            .from('games')
            .select('*')
            .eq('session_id', sessionId)
            .single();
        if (error) throw error;
        return {
            ...data,
            guessed_letters: new Set(Array.isArray(data.guessed_letters) ? data.guessed_letters : [])
        };
    });
}

function setupGameChannel(sessionId, onUpdate, onError) {
    const channel = supabase.channel(`game:${sessionId}`);
    channel
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `session_id=eq.${sessionId}` }, onUpdate)
        .subscribe((status, err) => {
            if (err) onError(err);
            console.log('Channel status:', status);
        });
    return channel;
}

function handleDisconnect(sessionId, display_feedback) {
    const interval = setInterval(async () => {
        try {
            await supabase.from('games').select('last_updated').eq('session_id', sessionId).single();
        } catch (err) {
            console.error('Disconnected from Supabase', err);
            display_feedback('Conexión perdida. Reconectando...', 'orange', null, false);
        }
    }, 5000);
    return () => clearInterval(interval);
}

// UI creation
async function promptMode({ container, prompt, input, button, output }) {
    prompt.innerText = 'Ingresa "1" para un jugador, "2" para dos jugadores, "3" para jugador contra IA:';
    return new Promise(resolve => {
        const handler = () => {
            const value = input.value.trim();
            if (['1', '2', '3'].includes(value)) {
                input.removeEventListener('keydown', keyHandler);
                resolve(value);
            } else {
                output.innerText = 'Inválido. Ingresa 1, 2, o 3.';
                output.style.color = 'red';
                input.value = '';
                focusInput(input);
            }
        };
        const keyHandler = e => { if (e.key === 'Enter') handler(); };
        input.addEventListener('keydown', keyHandler);
        button.onclick = handler;
    });
}

async function promptGameType({ container, prompt, input, button, output }) {
    prompt.innerText = 'Ingresa "local" para juego local, "remoto" para juego remoto:';
    return new Promise(resolve => {
        const handler = () => {
            const value = input.value.trim().toLowerCase();
            if (['local', 'remoto'].includes(value)) {
                input.removeEventListener('keydown', keyHandler);
                resolve(value);
            } else {
                output.innerText = 'Inválido. Ingresa "local" o "remoto".';
                output.style.color = 'red';
                input.value = '';
                focusInput(input);
            }
        };
        const keyHandler = e => { if (e.key === 'Enter') handler(); };
        input.addEventListener('keydown', keyHandler);
        button.onclick = handler;
    });
}

async function promptPlayerNames(mode, { container, prompt, input, button, output }) {
    const players = [];
    if (mode === '1') {
        prompt.innerText = 'Ingresa el nombre del jugador:';
        return new Promise(resolve => {
            const handler = () => {
                const name = input.value.trim();
                if (name) {
                    players.push(name);
                    input.removeEventListener('keydown', keyHandler);
                    resolve(players);
                } else {
                    output.innerText = 'El nombre no puede estar vacío.';
                    output.style.color = 'red';
                    input.value = '';
                    focusInput(input);
                }
            };
            const keyHandler = e => { if (e.key === 'Enter') handler(); };
            input.addEventListener('keydown', keyHandler);
            button.onclick = handler;
        });
    } else if (mode === '2' || mode === '3') {
        for (let i = 1; i <= 2; i++) {
            prompt.innerText = `Ingresa el nombre del jugador ${i}:`;
            const name = await new Promise(resolve => {
                const handler = () => {
                    const name = input.value.trim();
                    if (name && !players.includes(name)) {
                        input.removeEventListener('keydown', keyHandler);
                        resolve(name);
                    } else {
                        output.innerText = 'El nombre no puede estar vacío o repetido.';
                        output.style.color = 'red';
                        input.value = '';
                        focusInput(input);
                    }
                };
                const keyHandler = e => { if (e.key === 'Enter') handler(); };
                input.addEventListener('keydown', keyHandler);
                button.onclick = handler;
            });
            players.push(name);
            input.value = '';
            output.innerText = '';
        }
        return players;
    }
    return players;
}

async function promptSessionId({ container, prompt, input, button, output }) {
    prompt.innerText = 'Ingresa el ID de la sesión para unirte o "nuevo" para crear una nueva:';
    return new Promise(resolve => {
        const handler = () => {
            const value = input.value.trim();
            if (value) {
                input.removeEventListener('keydown', keyHandler);
                resolve(value);
            } else {
                output.innerText = 'El ID de la sesión no puede estar vacío.';
                output.style.color = 'red';
                input.value = '';
                focusInput(input);
            }
        };
        const keyHandler = e => { if (e.key === 'Enter') handler(); };
        input.addEventListener('keydown', keyHandler);
        button.onclick = handler;
    });
}

async function promptDifficulty({ container, prompt, input, button, output }) {
    prompt.innerText = 'Ingresa el nivel de dificultad (1: fácil, 2: medio, 3: difícil):';
    return new Promise(resolve => {
        const handler = () => {
            const value = input.value.trim();
            if (['1', '2', '3'].includes(value)) {
                input.removeEventListener('keydown', keyHandler);
                resolve(value);
            } else {
                output.innerText = 'Inválido. Ingresa 1, 2, o 3.';
                output.style.color = 'red';
                input.value = '';
                focusInput(input);
            }
        };
        const keyHandler = e => { if (e.key === 'Enter') handler(); };
        input.addEventListener('keydown', keyHandler);
        button.onclick = handler;
    });
}

async function create_game_ui(config = null) {
    const container = document.createElement('div');
    container.className = 'game-container';
    document.body.appendChild(container);

    const title = document.createElement('h1');
    title.innerText = 'Juego del Ahorcado';
    container.appendChild(title);

    const prompt = document.createElement('p');
    prompt.className = 'prompt';
    container.appendChild(prompt);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input';
    container.appendChild(input);

    const button = document.createElement('button');
    button.innerText = 'Enviar';
    button.className = 'button';
    container.appendChild(button);

    const output = document.createElement('p');
    output.className = 'output';
    container.appendChild(output);

    let mode, gameType, players, sessionId, difficulty;

    if (config && config.skipMenu) {
        mode = config.mode || '1';
        gameType = config.gameType || 'local';
        players = config.players || ['Jugador1'];
        sessionId = config.sessionId || generateSessionId();
        difficulty = config.difficulty || '1';
    } else {
        mode = await promptMode({ container, prompt, input, button, output });
        gameType = await promptGameType({ container, prompt, input, button, output });
        players = await promptPlayerNames(mode, { container, prompt, input, button, output });

        if (gameType === 'remoto') {
            sessionId = await promptSessionId({ container, prompt, input, button, output });
            if (sessionId.toLowerCase() === 'nuevo') {
                sessionId = generateSessionId();
                //try {
                //    const { data, error } = await supabase.auth.signInAnonymously();
                //    if (error) throw error;
                //} catch (error) {
                //    console.error('create_game_ui: Authentication error', error);
                //    output.innerText = 'Error de autenticación.';
                //    output.style.color = 'red';
                //    return null;
                //}
            }
        } else {
            sessionId = generateSessionId();
        }

        difficulty = await promptDifficulty({ container, prompt, input, button, output });
    }

    return { mode, gameType, players, sessionId, container, prompt, input, button, output, difficulty };
}

// Game logic
async function get_random_word() {
    const url = `https://www.wordsapi.com/v3/words?random=true&api_key=${WORD_API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.word) {
            const word = await translate_word(data.word.toLowerCase());
            return word;
        }
        throw new Error('No word returned');
    } catch (error) {
        console.warn('APIs failed, falling back to static list');
        const palabras_filtradas = palabras.filter(p => p.length >= 4 && p.length <= 12);
        return choice(palabras_filtradas);
    }
}

async function translate_word(word) {
    const url = `https://api-free.deepl.com/v2/translate?auth_key=${TRANSLATE_API_KEY}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `text=${encodeURIComponent(word)}&source_lang=EN&target_lang=ES`
        });
        const data = await response.json();
        if (data && data.translations && data.translations[0] && data.translations[0].text) {
            return normalizar(data.translations[0].text.toLowerCase());
        }
        throw new Error('No translation returned');
    } catch (error) {
        console.error('translate_word: Error translating word', error);
        return word;
    }
}

async function get_guess(guessed_letters, secret_word, prompt, input, output, button) {
    return new Promise((resolve, reject) => {
        let timeout;
        const handler = () => {
            const guess = input.value.trim().toLowerCase();
            input.value = '';
            if (!guess) {
                output.innerText = 'Por favor, ingresa una letra o palabra.';
                output.style.color = 'red';
                focusInput(input);
                return;
            }
            if (guess.length === 1 && !/^[a-z]$/.test(guess)) {
                output.innerText = 'Solo se permiten letras de a-z.';
                output.style.color = 'red';
                focusInput(input);
                return;
            }
            if (guess.length === 1 && guessed_letters.has(guess)) {
                output.innerText = 'Esa letra ya fue usada.';
                output.style.color = 'red';
                focusInput(input);
                return;
            }
            if (guess.length > 1 && normalizar(guess) !== normalizar(secret_word)) {
                output.innerText = 'Palabra incorrecta.';
                output.style.color = 'red';
                focusInput(input);
                return;
            }
            clearTimeout(timeout);
            input.removeEventListener('keydown', keyHandler);
            button.onclick = null;
            output.innerText = '';
            resolve(guess);
        };
        const keyHandler = e => { if (e.key === 'Enter') handler(); };
        input.addEventListener('keydown', keyHandler);
        button.onclick = handler;
        timeout = setTimeout(() => {
            input.removeEventListener('keydown', keyHandler);
            button.onclick = null;
            resolve(null);
        }, 60000);
        focusInput(input);
    });
}

async function process_guess(
    localPlayer, guessed_letters, secret_word, tries, scores, lastCorrectWasVowel,
    used_wrong_letters, used_wrong_words, vowels, max_score, difficulty, mode,
    prompt, input, output, button, delay, display_feedback
) {
    validateDOMElements({ prompt, input, output, button }, 'DOM elements missing in process_guess');
    const guess = await get_guess(guessed_letters, secret_word, prompt, input, output, button);
    if (guess === null) {
        display_feedback('Tiempo de espera agotado. Turno perdido.', 'red', localPlayer, true);
        tries[localPlayer] = Math.max(0, (tries[localPlayer] || 0) - 1);
        return { guess, word_guessed: false };
    }

    if (guess.length > 1) {
        if (normalizar(guess) === normalizar(secret_word)) {
            display_feedback('¡Correcto! Has adivinado la palabra.', 'green', localPlayer, true);
            scores[localPlayer] = (scores[localPlayer] || 0) + max_score;
            return { guess, word_guessed: true };
        } else {
            display_feedback('Palabra incorrecta.', 'red', localPlayer, true);
            used_wrong_words.add(guess);
            tries[localPlayer] = Math.max(0, (tries[localPlayer] || 0) - 1);
            return { guess, word_guessed: false };
        }
    } else {
        guessed_letters.add(guess);
        if (normalizar(secret_word).includes(guess)) {
            const isVowel = vowels.includes(guess);
            if (!isVowel || (isVowel && !lastCorrectWasVowel[localPlayer])) {
                const letters_remaining = normalizar(secret_word).split('').filter(l => !guessed_letters.has(l)).length;
                const points = Math.round((letters_remaining / normalizar(secret_word).length) * max_score);
                scores[localPlayer] = (scores[localPlayer] || 0) + points;
                display_feedback(`¡Letra correcta! Puntos: ${points}`, 'green', localPlayer, true);
                lastCorrectWasVowel[localPlayer] = isVowel;
            } else {
                display_feedback('Letra correcta (vocal repetida, sin puntos).', 'green', localPlayer, true);
            }
            const word_guessed = normalizar(secret_word).split('').every(l => guessed_letters.has(l));
            if (word_guessed) {
                display_feedback('¡Correcto! Has adivinado la palabra.', 'green', localPlayer, true);
            }
            return { guess, word_guessed };
        } else {
            display_feedback('Letra incorrecta.', 'red', localPlayer, true);
            used_wrong_letters.add(guess);
            tries[localPlayer] = Math.max(0, (tries[localPlayer] || 0) - 1);
            return { guess, word_guessed: false };
        }
    }
}

async function update_ui(current_player_idx_ref, current_player, guessed_letters, secret_word, tries, output, container, scores, players) {
    validateDOMElements({ output, container }, 'DOM elements missing in update_ui');
    const formatted_word = format_secret_word(secret_word, guessed_letters);
    let score_text = '';
    for (const player of players) {
        score_text += `${escapeHTML(player)}: ${scores[player] || 0} puntos, ${tries[player] || 0} intentos restantes\n`;
    }
    output.innerText = `Palabra: ${formatted_word}\nTurno: ${escapeHTML(current_player)}\n${score_text}`;
}

async function game_loop(
    players, tries, scores, mode, provided_secret_word, guessed_letters, gameType, sessionId,
    output, container, prompt, input, button, display_feedback, current_player_idx_ref,
    game_info, games_played, games_to_play, total_scores, difficulty
) {
    let localPlayer = players[0]; // Assume first player for now
    let gameIsOver = false;

    if (mode !== '2' || gameType !== 'remoto') {
        while (!gameIsOver) {
            const current_player = players[current_player_idx_ref.value];
            await update_ui(current_player_idx_ref, current_player, guessed_letters, provided_secret_word, tries, output, container, scores, players);
            prompt.innerText = `Ingresa una letra o la palabra completa, ${escapeHTML(current_player)}:`;
            input.disabled = false;
            focusInput(input);

            const lastCorrectWasVowel = Object.fromEntries(players.map(p => [p, false]));
            const used_wrong_letters = new Set();
            const used_wrong_words = new Set();

            const result = await process_guess(
                current_player, guessed_letters, provided_secret_word, tries, scores,
                lastCorrectWasVowel, used_wrong_letters, used_wrong_words, vowels,
                max_score, difficulty, mode, prompt, input, output, button, delay,
                display_feedback
            );

            const allPlayersOutOfTries = players.every(p => tries[p] <= 0);
            const wordFullyGuessed = normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l));

            if (result.word_guessed || allPlayersOutOfTries || wordFullyGuessed) {
                gameIsOver = true;
                display_feedback(`Juego terminado. Palabra: ${format_secret_word(provided_secret_word, guessed_letters)}.`, 'black', null, false);
            } else {
                current_player_idx_ref.value = (current_player_idx_ref.value + 1) % players.length;
            }
        }
        return null;
    } else {
        let channel = null;
        let isGuessing = false;
        try {
            validateDOMElements({ prompt, input, output, button }, 'DOM elements missing in game_loop');

            const gameState = new GameState({
                mode,
                players,
                gameType,
                sessionId,
                secretWord: provided_secret_word,
                difficulty
            });
            await gameState.syncWithSupabase();

            if (!gameState.secretWord || gameState.status !== 'playing') {
                display_feedback('Sesión inválida o no está en curso.', 'red', null, false);
                return null;
            }

            guessed_letters = gameState.guessedLetters;
            tries = gameState.tries;
            scores = gameState.scores;
            current_player_idx_ref.value = gameState.currentPlayerIdx;

            await update_ui(current_player_idx_ref, players[current_player_idx_ref.value], guessed_letters, provided_secret_word, tries, output, container, scores, players);

            const stopDisconnectCheck = handleDisconnect(sessionId, display_feedback);

            channel = setupGameChannel(sessionId, async (payload) => {
                const game = payload.new;
                if (!game || game.status === 'finished' || game.status === 'ended') {
                    gameIsOver = true;
                    display_feedback(`Juego terminado. Palabra: ${format_secret_word(provided_secret_word, new Set(game.guessed_letters || []))}.`, 'black', null, false);
                    return;
                }

                gameState.guessedLetters = new Set(game.guessed_letters || []);
                gameState.tries = game.tries || gameState.tries;
                gameState.scores = game.scores || gameState.scores;
                gameState.currentPlayerIdx = players.indexOf(game.current_player) || 0;
                gameState.status = game.status;

                guessed_letters = gameState.guessedLetters;
                tries = gameState.tries;
                scores = gameState.scores;
                current_player_idx_ref.value = gameState.currentPlayerIdx;

                await update_ui(current_player_idx_ref, game.current_player, guessed_letters, provided_secret_word, tries, output, container, scores, players);

                const isLocalPlayer = game.current_player?.toLowerCase() === localPlayer?.toLowerCase();
                console.log('update_ui: Player check', { currentPlayer: game.current_player, localPlayer, isLocalPlayer });

                if (isLocalPlayer && !isGuessing) {
                    isGuessing = true;
                    try {
                        prompt.innerText = 'Ingresa una letra o la palabra completa:';
                        input.disabled = false;
                        focusInput(input);
                        const guess = await get_guess(guessed_letters, provided_secret_word, prompt, input, output, button);
                        if (guess === null) {
                            display_feedback('Tiempo de espera agotado. Turno perdido.', 'red', localPlayer, true);
                            tries[localPlayer] = Math.max(0, (tries[localPlayer] || 0) - 1);
                            gameState.tries = tries;
                            gameState.currentPlayerIdx = (current_player_idx_ref.value + 1) % players.length;
                            await gameState.saveToSupabase();
                        } else {
                            const lastCorrectWasVowel = Object.fromEntries(players.map(p => [p, false]));
                            const used_wrong_letters = new Set();
                            const used_wrong_words = new Set();

                            const result = await process_guess(
                                localPlayer, guessed_letters, provided_secret_word, tries, scores,
                                lastCorrectWasVowel, used_wrong_letters, used_wrong_words, vowels,
                                max_score, difficulty, mode, prompt, input, output, button, delay,
                                display_feedback
                            );

                            const allPlayersOutOfTries = players.every(p => tries[p] <= 0);
                            const wordFullyGuessed = normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l));
                            gameState.guessedLetters = guessed_letters;
                            gameState.tries = tries;
                            gameState.scores = scores;
                            gameState.status = (result.word_guessed || allPlayersOutOfTries || wordFullyGuessed) ? 'finished' : 'playing';
                            gameState.currentPlayerIdx = (current_player_idx_ref.value + 1) % players.length;

                            await gameState.saveToSupabase();

                            if (result.word_guessed || allPlayersOutOfTries || wordFullyGuessed) {
                                gameIsOver = true;
                                display_feedback(`Juego terminado. Palabra: ${format_secret_word(provided_secret_word, guessed_letters)}.`, 'black', null, false);
                            }
                        }
                    } catch (err) {
                        console.error('game_loop: Error processing guess', err);
                        display_feedback('Error al procesar la adivinanza. Turno perdido.', 'red', localPlayer, true);
                        tries[localPlayer] = Math.max(0, (tries[localPlayer] || 0) - 1);
                        gameState.tries = tries;
                        gameState.currentPlayerIdx = (current_player_idx_ref.value + 1) % players.length;
                        await gameState.saveToSupabase();
                    } finally {
                        isGuessing = false;
                        await update_ui(current_player_idx_ref, players[gameState.currentPlayerIdx], guessed_letters, provided_secret_word, tries, output, container, scores, players);
                    }
                } else {
                    prompt.innerText = `Esperando a ${escapeHTML(game.current_player)}...`;
                    input.disabled = true;
                }
            }, (err) => {
                console.error('Subscription error:', err);
                display_feedback('Error de sincronización. Intenta de nuevo.', 'red', null, false);
            });

            return channel;
        } catch (err) {
            console.error('game_loop: Outer error', err);
            display_feedback('Error en la lógica del juego remoto. Intenta de nuevo.', 'red', null, false);
            return channel;
        } finally {
            if (gameIsOver && channel) {
                supabase.removeChannel(channel);
            }
        }
    }
}

async function play_game(mode, players, gameType, sessionId, output, container, prompt, input, button, difficulty) {
    let provided_secret_word;
    if (gameType === 'remoto') {
        const { data, error } = await getSession(sessionId);
        if (error || !data) {
            console.error('play_game: Failed to fetch session', error);
            output.innerText = 'Error: No se pudo obtener la sesión. Reinicia el juego.';
            output.style.color = 'red';
            return;
        }
        provided_secret_word = data.secret_word;
        localPlayer = players[0]; // Set local player for remote mode
    } else {
        provided_secret_word = await get_random_word();
        if (gameType === 'remoto') {
            await createSession(sessionId, players, gameType, provided_secret_word, difficulty);
        }
    }

    if (!provided_secret_word || typeof provided_secret_word !== 'string') {
        console.error('play_game: provided_secret_word is missing or invalid', provided_secret_word);
        output.innerText = 'Error: No se pudo obtener la palabra secreta. Reinicia el juego.';
        output.style.color = 'red';
        return;
    }

    const guessed_letters = new Set();
    const tries = Object.fromEntries(players.map(p => [p, total_tries]));
    const scores = Object.fromEntries(players.map(p => [p, 0]));
    const current_player_idx_ref = { value: 0 };
    const game_info = { wins: Object.fromEntries(players.map(p => [p, 0])) };
    const total_scores = Object.fromEntries(players.map(p => [p, 0]));
    let games_played = 0;
    const games_to_play = 3;

    const display_feedback = (message, color, player = null, clearOutput = false) => {
        if (clearOutput) output.innerText = '';
        const feedback = document.createElement('p');
        feedback.innerText = player ? `${escapeHTML(player)}: ${message}` : message;
        feedback.style.color = color;
        container.appendChild(feedback);
        setTimeout(() => feedback.parentNode?.removeChild(feedback), 3000);
    };

    while (games_played < games_to_play) {
        const channel = await game_loop(
            players, tries, scores, mode, provided_secret_word, guessed_letters, gameType,
            sessionId, output, container, prompt, input, button, display_feedback,
            current_player_idx_ref, game_info, games_played, games_to_play, total_scores, difficulty
        );

        games_played++;
        if (games_played < games_to_play) {
            provided_secret_word = await get_random_word();
            guessed_letters.clear();
            Object.keys(tries).forEach(p => tries[p] = total_tries);
            if (gameType === 'remoto') {
                await createSession(sessionId, players, gameType, provided_secret_word, difficulty);
            }
        }

        if (channel) {
            supabase.removeChannel(channel);
        }
    }

    let final_message = 'Puntuaciones finales:\n';
    for (const player of players) {
        final_message += `${escapeHTML(player)}: ${total_scores[player] || 0} puntos\n`;
    }
    output.innerText = final_message;
}

async function initSupabase() {
    //try {
    //    const { data, error } = await supabase.auth.signInAnonymously();
    //    if (error) throw error;
    //    console.log('initSupabase: Authenticated anonymously', data);
    //} catch (error) {
    //    console.error('initSupabase: Authentication error', error);
    //    throw error;
    //}
}

async function main(config = null) {
    try {
        await initSupabase();
        const ui = await create_game_ui(config);
        if (!ui) {
            console.error('main: Failed to create UI');
            return;
        }
        const { mode, gameType, players, sessionId, output, container, prompt, input, button, difficulty } = ui;
        await play_game(mode, players, gameType, sessionId, output, container, prompt, input, button, difficulty);
    } catch (error) {
        console.error('main: Error', error);
        document.body.innerText = 'Error al iniciar el juego. Por favor, recarga la página.';
    }
}

// Start the game
main();