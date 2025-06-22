// Transcrypt'ed from Python, 2025-06-16, updated 2025-10-14 for Firebase v10.14.0
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getDatabase, ref, set, update, onValue, get, remove } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';

var __name__ = '__main__';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD4PoM3u5DcJuego-4pBlNW8I7vdUlvrTk-0",
    authDomain: "adivinar-palabras-5ca6e.firebaseapp.com",
    databaseURL: "https://adivinar-palabras-5ca6e-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "adivinar-palabras-5ca6e",
    storageBucket: "adivinar-palabras-5ca6e.firebasestorage.app",
    messagingSenderId: "291779074101",
    appId: "1:291779074101:web:a35d6d5bcae4d6b9b4397c"
};

// Initialize Firebase
let database;
try {
    const app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    console.log('Firebase initialized successfully in wordgame4.js:', database);
} catch (error) {
    console.error('Failed to initialize Firebase in wordgame4.js:', error);
    document.body.innerHTML = '<p style="color: red; text-align: center;">Error: No se pudo conectar con la base de datos. Por favor, verifica tu conexión o recarga la página.</p>';
    throw error;
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
const WORD_API_KEY = 'JGZtMGy2radD8zIA1hAQgoqJKa8Nzhck0XhgDtoL';
const TRANSLATE_API_URL = 'https://api-free.deepl.com/v2/translate';
const TRANSLATE_API_KEY = '8c71deb7-78c4-4ee2-8bf1-621a0a490d85:fx';

// ... (fetchSingleWord, fetchRandomWords, translateToSpanish, choice, get_secret_word, focusInput, get_ai_guess, normalizar, format_name, format_secret_word, formato_palabra, escapeHTML, get_guess, get_guess_feedback unchanged) ...

async function create_game_ui(mode = null, player1 = null, player2 = null, difficulty = null, gameType = null, sessionId = null) {
    console.log('create_game_ui: Starting, Loaded version 2025-06-22-v9.9', { mode, player1, player2, difficulty, gameType, sessionId });

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
                            typeButton.style.fontSize = '16px';
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
                        output.innerText = 'Error: No se pudo conectar con la base de datos.';
                        output.style.color = 'red';
                        input.value = '';
                        focusInput(input);
                        return;
                    }
                    selected_sessionId = Math.random().toString(36).substring(2, 10);
                    console.log('create_game_ui: Generated session ID:', selected_sessionId);
                    try {
                        await set(ref(database, `games/${selected_sessionId}`), {
                            status: 'waiting',
                            player1: null,
                            player2: null,
                            mode: selected_mode,
                            gameType: selected_gameType,
                            secretWord: null,
                            guessedLetters: [],
                            tries: {},
                            scores: {},
                            currentPlayer: null
                        });
                        prompt.innerText = `Nombre Jugador 1 (ID de sesión: ${selected_sessionId}):`;
                        input.value = '';
                        focusInput(input);
                        input.removeEventListener('keypress', currentHandler);
                        button.onclick = handlePlayer1Input;
                        currentHandler = (e) => {
                            if (e.key === 'Enter') button.click();
                        };
                        input.addEventListener('keypress', currentHandler);
                    } catch (error) {
                        console.error('create_game_ui: Error creating game session:', error);
                        output.innerText = 'Error al crear la sesión de juego. Intenta de nuevo.';
                        output.style.color = 'red';
                        input.value = '';
                        focusInput(input);
                    }
                } else if (value === 'unirse') {
                    if (!database) {
                        console.error('create_game_ui: Firebase database not initialized');
                        output.innerText = 'Error: No se pudo conectar con la base de datos.';
                        output.style.color = 'red';
                        input.value = '';
                        focusInput(input);
                        return;
                    }
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
                    output.innerText = 'Inválido. Ingresa "crear" o "unirse".';
                    output.style.color = 'red';
                    input.value = '';
                    focusInput(input);
                }
            }

            async function handleSessionIdInput() {
                const sessionIdInput = input.value.trim();
                console.log('create_game_ui: Session ID input:', sessionIdInput);
                if (!sessionIdInput) {
                    output.innerText = 'Ingresa un ID de sesión válido.';
                    output.style.color = 'red';
                    input.value = '';
                    focusInput(input);
                    return;
                }
                try {
                    const snapshot = await get(ref(database, `games/${sessionIdInput}`));
                    if (!snapshot.exists()) {
                        output.innerText = 'ID de sesión no encontrado.';
                        output.style.color = 'red';
                        input.value = '';
                        focusInput(input);
                        return;
                    }
                    const game = snapshot.val();
                    if (game.status !== 'waiting_for_player2') {
                        output.innerText = 'El juego no está disponible para unirse.';
                        output.style.color = 'red';
                        input.value = '';
                        focusInput(input);
                        return;
                    }
                    selected_sessionId = sessionIdInput;
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
                    output.innerText = 'Error al verificar el ID de sesión. Intenta de nuevo.';
                    output.style.color = 'red';
                    input.value = '';
                    focusInput(input);
                }
            }

            function handlePlayer1Input() {
                selected_player1 = format_name(input.value.trim()) || 'Jugador 1';
                console.log('create_game_ui: Formatted Player 1 name:', selected_player1);
                input.value = '';
                focusInput(input);
                input.removeEventListener('keypress', currentHandler);
                if (selected_mode === '2') {
                    if (selected_gameType === 'remoto') {
                        update(ref(database, `games/${selected_sessionId}`), {
                            player1: selected_player1,
                            status: 'waiting_for_player2'
                        });
                        prompt.innerText = `Esperando a que otro jugador se una (ID: ${selected_sessionId})...`;
                        button.style.display = 'none';
                        input.style.display = 'none';
                        onValue(ref(database, `games/${selected_sessionId}`), (snapshot) => {
                            const game = snapshot.val();
                            if (game && game.player2 && game.status === 'ready') {
                                selected_player2 = game.player2;
                                console.log('create_game_ui: Player 2 joined:', selected_player2);
                                prompt.innerText = 'Ingresa una letra o la palabra completa:';
                                button.style.display = 'none';
                                input.style.display = 'inline-block';
                                focusInput(input);
                                resolve({ mode: selected_mode, player1: selected_player1, player2: selected_player2, prompt, input, button, output, container, difficulty: selected_difficulty, gameType: selected_gameType, sessionId: selected_sessionId });
                            }
                        }, { onlyOnce: true });
                    } else {
                        prompt.innerText = 'Nombre Jugador 2:';
                        button.onclick = handlePlayer2Input;
                        currentHandler = (e) => {
                            if (e.key === 'Enter') button.click();
                        };
                        input.addEventListener('keypress', currentHandler);
                    }
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
                        diffButton.className = 'game-button difficulty-button';
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
                            focusInput(input);
                            resolve({ mode: selected_mode, player1: selected_player1, player2: selected_player2, prompt, input, button, output, container, difficulty: selected_difficulty, gameType: selected_gameType, sessionId: selected_sessionId });
                        };
                        buttonContainer.appendChild(diffButton);
                    });
                    container.appendChild(buttonContainer);
                } else {
                    prompt.innerText = 'Ingresa una letra o la palabra completa:';
                    button.style.display = 'none';
                    focusInput(input);
                    resolve({ mode: selected_mode, player1: selected_player1, player2: selected_player2, prompt, input, button, output, container, difficulty: selected_difficulty, gameType: selected_gameType, sessionId: selected_sessionId });
                }
            }

            function handlePlayer2Input() {
                selected_player2 = format_name(input.value.trim()) || 'Jugador 2';
                console.log('create_game_ui: Formatted Player 2 name:', selected_player2);
                if (selected_gameType === 'remoto') {
                    update(ref(database, `games/${selected_sessionId}`), {
                        player2: selected_player2,
                        status: 'ready'
                    });
                }
                input.value = '';
                focusInput(input);
                input.removeEventListener('keypress', currentHandler);
                prompt.innerText = 'Ingresa una letra o la palabra completa:';
                button.style.display = 'none';
                focusInput(input);
                resolve({ mode: selected_mode, player1: selected_player1, player2: selected_player2, prompt, input, button, output, container, difficulty: selected_difficulty, gameType: selected_gameType, sessionId: selected_sessionId });
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

// ... (start_game, process_guess unchanged) ...

async function play_game(loadingMessage, secret_word, mode, players, output, container, prompt, input, button, difficulty, games_played, games_to_play, total_scores, wins, delay, display_feedback, gameType, sessionId) {
    console.log('play_game: Starting, Loaded version 2025-06-22-v9.9', JSON.stringify({ mode, players, difficulty, games_played, games_to_play, gameType, sessionId }));
    
    const provided_secret_word = secret_word || await get_secret_word();
    console.log('play_game: Secret word:', provided_secret_word);

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

    if (mode === '2' && gameType === 'remoto') {
        try {
            sessionRef = ref(database, `games/${sessionId}`);
            await update(sessionRef, {
                secretWord: provided_secret_word,
                guessedLetters: Array.from(guessed_letters),
                tries,
                scores,
                currentPlayer: players[current_player_idx],
                status: 'playing'
            });

            const connectedRef = ref(database, '.info/connected');
            onValue(connectedRef, (snapshot) => {
                if (!snapshot.val()) {
                    console.warn('play_game: Lost connection to Firebase');
                    display_feedback('Conexión perdida. Intenta reconectar o reiniciar el juego.', 'red', null, true);
                }
            });
        } catch (err) {
            console.error('play_game: Firebase initialization error', err);
            display_feedback('Error al conectar con el servidor remoto. Intenta de nuevo.', 'red', null, false);
            return;
        }
    }

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
        if (!input.parentNode) container.appendChild(input);
        if (!button.parentNode) container.appendChild(button);
        button.style.display = 'none';
        container.appendChild(output);

        prompt.innerText = 'Ingresa una letra o la palabra completa:';
        input.value = '';
        focusInput(input);

        game_info = document.createElement('p');
        game_info.className = 'game-info';
        game_info.innerHTML = `--- Juego ${games_played + 1} de ${games_to_play} ---<br>Palabra secreta: ${provided_secret_word.length} letras.<br>Intentos: ${total_tries}. Puntaje máximo: ${max_score}.` +
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
        console.log('play_game: UI initialized');
        update_ui();
    } catch (err) {
        console.error('play_game: Error setting up UI', err);
        display_feedback('Error al configurar la interfaz.', 'red', null, false);
        return;
    }

    function update_ui() {
        const player = players[current_player_idx];
        const other_player = players[(current_player_idx + 1) % players.length] || null;
        try {
            if (mode === '1') {
                player_info.innerHTML = `<strong>${escapeHTML(player)}</strong>: Intentos: ${tries[player]} | Puntaje: ${scores[player]}`;
            } else {
                player_info.innerHTML = `Turno de <strong>${escapeHTML(player)}</strong>: Intentos: ${tries[player]} | Puntaje: ${scores[player]}` +
                    (other_player ? `<br><strong>${escapeHTML(other_player)}</strong>: Intentos: ${tries[other_player]} | Puntaje: ${scores[other_player]}` : '');
            }
            progress.innerText = `Palabra: ${formato_palabra(normalizar(provided_secret_word).split('').map(l => guessed_letters.has(l) ? l : "_"))}`;
            prompt.innerText = mode === '2' && gameType === 'remoto' && player !== players[current_player_idx] ? 'Esperando el turno del otro jugador...' : 'Ingresa una letra o la palabra completa:';
            if (input.parentNode && (mode !== '2' || gameType !== 'remoto' || player === players[current_player_idx])) {
                input.disabled = false;
                focusInput(input);
            } else if (input.parentNode) {
                input.disabled = true;
            }
            console.log('update_ui: UI updated', JSON.stringify({ player, score: scores[player], player_info: player_info.innerHTML }));
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
            onValue(sessionRef, async (snapshot) => {
                const game = snapshot.val();
                if (!game) {
                    display_feedback('El juego ha sido terminado o eliminado por el otro jugador.', 'red', null, false);
                    container.appendChild(button_group);
                    return;
                }
                if (game.status !== 'playing') return;
                guessed_letters.clear();
                game.guessedLetters.forEach(l => guessed_letters.add(l));
                Object.assign(tries, game.tries);
                Object.assign(scores, game.scores);
                current_player_idx = players.indexOf(game.currentPlayer);
                update_ui();
                if (game.status === 'ended') {
                    // Listener cleanup handled in finally block
                }
            }, (error) => {
                console.error('game_loop: Firebase snapshot error', error);
                display_feedback('Error de sincronización con el servidor remoto.', 'red', null, false);
            });
        }

        while (Object.values(tries).some(t => t > 0) &&
               !normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l))) {
            const player = players[current_player_idx];
            if (tries[player] == null || tries[player] <= 0) {
                console.log('game_loop: Skipping player', JSON.stringify({ player, tries: tries[player] || 'undefined' }));
                current_player_idx = (current_player_idx + 1) % players.length;
                if (mode === '2' && gameType === 'remoto') {
                    await update(sessionRef, { currentPlayer: players[current_player_idx] });
                }
                update_ui();
                continue;
            }

            if (player !== 'IA' && input.parentNode) {
                input.value = '';
                if (mode !== '2' || gameType !== 'remoto' || player === players[current_player_idx]) {
                    focusInput(input);
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
                try {
                    await update(sessionRef, {
                        guessedLetters: Array.from(guessed_letters),
                        tries,
                        scores,
                        currentPlayer: players[current_player_idx]
                    });
                } catch (err) {
                    console.error('game_loop: Firebase update error', err);
                    display_feedback('Error al actualizar el estado del juego remoto.', 'red', null, true);
                }
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
                display_feedback(`¡<strong>${escapeHTML(player)}</strong> sin intentos!`, 'red', player, false);
                await delay(500);
                if (mode === '2' && gameType === 'remoto') {
                    await update(sessionRef, { tries, scores });
                }
            }

            if (result.word_guessed || normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l))) {
                output.innerHTML = '';
                display_feedback(`¡Felicidades, <strong>${escapeHTML(player)}</strong>! Adivinaste la palabra!`, 'green', player, false);
                if (mode === '2' && gameType === 'remoto') {
                    await update(sessionRef, { status: 'ended' });
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
                    await update(sessionRef, { currentPlayer: players[current_player_idx] });
                }
            }
            update_ui();
        }

        console.log('game_loop: Ended', JSON.stringify({ players, tries, scores, word_guessed: normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l)) }));
    }

    try {
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
            output.innerHTML += `<br><strong>${escapeHTML(p)}</strong> puntaje este juego: ${scores[p]}`;
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
                remove(ref(database, `games/${sessionId}`));
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
                remove(ref(database, `games/${sessionId}`));
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
                    remove(ref(database, `games/${sessionId}`));
                }
                start_game(mode, players, output, container, prompt, input, button, difficulty, games_played + 1, total_scores, wins, gameType, sessionId);
            };
            button_group.appendChild(next_button);
        } else if (mode !== '1') {
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
            console.log('play_game: Final result displayed', JSON.stringify({ total_scores, wins }));
            if (mode === '2' && gameType === 'remoto') {
                await update(sessionRef, { status: 'ended' });
            }
        }

        container.appendChild(button_group);
        console.log('play_game: Buttons rendered', JSON.stringify({ repeat: !!repeat_button, restart: !!restart_button, next: mode !== '1' && games_played < games_to_play - 1 }));
    } catch (err) {
        console.error('play_game: Error in game execution', err);
        display_feedback('Error en el juego. Por favor, reinicia.', 'red', null, false);
    } finally {
        if (sessionRef) {
            // No need to call off() as onValue handles cleanup
            console.log('play_game: Firebase listeners cleaned up');
        }
        if (mode === '2' && gameType === 'remoto') {
            const connectedRef = ref(database, '.info/connected');
            // No need to call off() as onValue handles cleanup
        }
    }
}

async function main() {
    console.log('main: Starting, Loaded version 2025-06-16-v9.8');
    try {
        const ui = await create_game_ui();
        if (!ui) {
            console.error('main: UI creation failed, aborting');
            return;
        }
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
    }
}

// Start the game
main();