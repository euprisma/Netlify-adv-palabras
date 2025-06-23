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
        reject(new Error('Failed to attach input listener'));
        return;
      }
      // Note: No finally block needed here since listener is removed in handleGuess
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

async function create_game_ui(mode, output, container, prompt, input, button, difficulty, games_played, total_scores, wins, gameType, sessionId) {
    console.log('create_game_ui: Starting, Loaded version 2025-06-23-v9.11', JSON.stringify({ mode, difficulty, games_played, gameType, sessionId }));
    try {
        output.innerHTML = '';
        container.innerHTML = '';

        const title = document.createElement('h1');
        title.className = 'game-title';
        title.innerText = 'Juego de Adivinar Palabras';
        container.appendChild(title);

        if (mode === '1') {
            const namePrompt = document.createElement('p');
            namePrompt.className = 'game-prompt';
            namePrompt.innerText = 'Ingresa tu nombre:';
            container.appendChild(namePrompt);

            const nameInput = document.createElement('input');
            nameInput.className = 'game-input';
            nameInput.type = 'text';
            container.appendChild(nameInput);
            focusInput(nameInput);

            const submitButton = document.createElement('button');
            submitButton.className = 'game-button';
            submitButton.innerText = 'Enviar';
            submitButton.style.padding = '8px 16px';
            submitButton.style.fontSize = '16px';
            submitButton.style.cursor = 'pointer';
            submitButton.style.margin = '5px';
            container.appendChild(submitButton);

            submitButton.onclick = async () => {
                const playerName = nameInput.value.trim();
                if (!playerName) {
                    display_feedback('Por favor, ingresa un nombre válido.', 'red', null, false);
                    return;
                }
                console.log('create_game_ui: Starting single-player game', playerName);
                container.innerHTML = '';
                await start_game(mode, [playerName], output, container, prompt, input, button, difficulty, games_played, total_scores, wins, gameType, sessionId);
            };
        } else if (mode === '2') {
            if (gameType === 'local') {
                const namePrompt1 = document.createElement('p');
                namePrompt1.className = 'game-prompt';
                namePrompt1.innerText = 'Jugador 1, ingresa tu nombre:';
                container.appendChild(namePrompt1);

                const nameInput1 = document.createElement('input');
                nameInput1.className = 'game-input';
                nameInput1.type = 'text';
                container.appendChild(nameInput1);
                focusInput(nameInput1);

                const namePrompt2 = document.createElement('p');
                namePrompt2.className = 'game-prompt';
                namePrompt2.innerText = 'Jugador 2, ingresa tu nombre:';
                container.appendChild(namePrompt2);

                const nameInput2 = document.createElement('input');
                nameInput2.className = 'game-input';
                nameInput2.type = 'text';
                container.appendChild(nameInput2);

                const submitButton = document.createElement('button');
                submitButton.className = 'game-button';
                submitButton.innerText = 'Enviar';
                submitButton.style.padding = '8px 16px';
                submitButton.style.fontSize = '16px';
                submitButton.style.cursor = 'pointer';
                submitButton.style.margin = '5px';
                container.appendChild(submitButton);

                submitButton.onclick = async () => {
                    const player1 = nameInput1.value.trim();
                    const player2 = nameInput2.value.trim();
                    if (!player1 || !player2) {
                        display_feedback('Ambos jugadores deben ingresar nombres válidos.', 'red', null, false);
                        return;
                    }
                    console.log('create_game_ui: Starting local multiplayer game', { player1, player2 });
                    container.innerHTML = '';
                    await start_game(mode, [player1, player2], output, container, prompt, input, button, difficulty, games_played, total_scores, wins, gameType, sessionId);
                };
            } else if (gameType === 'remoto') {
                let playerRole = 'creator';
                let playerName, sessionInput;

                const loadingMessage = document.createElement('p');
                loadingMessage.innerText = 'Cargando...';
                container.appendChild(loadingMessage);

                const namePrompt = document.createElement('p');
                namePrompt.className = 'game-prompt';
                namePrompt.innerText = 'Ingresa tu nombre:';
                container.appendChild(namePrompt);

                const nameInput = document.createElement('input');
                nameInput.className = 'game-input';
                nameInput.type = 'text';
                container.appendChild(nameInput);
                focusInput(nameInput);

                const submitNameButton = document.createElement('button');
                submitNameButton.className = 'game-button';
                submitNameButton.innerText = 'Enviar';
                submitNameButton.style.padding = '8px 16px';
                submitNameButton.style.fontSize = '16px';
                submitNameButton.style.cursor = 'pointer';
                submitNameButton.style.margin = '5px';
                container.appendChild(submitNameButton);

                if (!sessionId) {
                    sessionId = Math.random().toString(36).substring(2, 10);
                    console.log('create_game_ui: Generated sessionId', sessionId);
                } else {
                    playerRole = 'joiner';
                    console.log('create_game_ui: Joining existing session', sessionId);
                }

                submitNameButton.onclick = async () => {
                    playerName = nameInput.value.trim();
                    if (!playerName) {
                        display_feedback('Por favor, ingresa un nombre válido.', 'red', null, false);
                        return;
                    }
                    console.log('create_game_ui: Name submitted', { playerName, playerRole });

                    try {
                        const sessionRef = ref(database, `games/${sessionId}`);
                        if (playerRole === 'creator') {
                            await set(sessionRef, {
                                gameType: 'remoto',
                                mode: '2',
                                player1: playerName,
                                status: 'ready'
                            });
                            console.log('create_game_ui: Game created for Player 1', { sessionId, player1: playerName });
                            container.innerHTML = '';
                            container.appendChild(title);
                            container.appendChild(loadingMessage);
                            loadingMessage.innerText = `ID de sesión: ${sessionId}. Esperando al segundo jugador...`;
                            const player2Ref = ref(database, `games/${sessionId}/player2`);
                            onValue(player2Ref, async (snapshot) => {
                                if (snapshot.exists() && snapshot.val()) {
                                    console.log('create_game_ui: Player 2 joined', snapshot.val());
                                    container.innerHTML = '';
                                    await start_game(mode, [playerName, snapshot.val()], output, container, prompt, input, button, difficulty, games_played, total_scores, wins, gameType, sessionId, playerRole);
                                }
                            }, (error) => {
                                console.error('create_game_ui: Error listening for Player 2', error);
                                display_feedback('Error al esperar al segundo jugador.', 'red', null, false);
                            });
                        } else {
                            const snapshot = await get(sessionRef);
                            if (!snapshot.exists()) {
                                display_feedback('Sesión no encontrada. Verifica el ID.', 'red', null, false);
                                return;
                            }
                            const gameData = snapshot.val();
                            if (gameData.player2) {
                                display_feedback('La sesión ya tiene dos jugadores.', 'red', null, false);
                                return;
                            }
                            await update(sessionRef, { player2: playerName });
                            console.log('create_game_ui: Player 2 joined', { sessionId, player2: playerName });
                            container.innerHTML = '';
                            await start_game(mode, [gameData.player1, playerName], output, container, prompt, input, button, difficulty, games_played, total_scores, wins, gameType, sessionId, playerRole);
                        }
                    } catch (err) {
                        console.error('create_game_ui: Error setting up game', err);
                        display_feedback('Error al configurar el juego remoto.', 'red', null, false);
                    }
                };
            }
        } else if (mode === '3') {
            const namePrompt = document.createElement('p');
            namePrompt.className = 'game-prompt';
            namePrompt.innerText = 'Ingresa tu nombre:';
            container.appendChild(namePrompt);

            const nameInput = document.createElement('input');
            nameInput.className = 'game-input';
            nameInput.type = 'text';
            container.appendChild(nameInput);
            focusInput(nameInput);

            const difficultyPrompt = document.createElement('p');
            difficultyPrompt.className = 'game-prompt';
            difficultyPrompt.innerText = 'Selecciona la dificultad:';
            container.appendChild(difficultyPrompt);

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'button-group';
            buttonGroup.style.display = 'inline-block';
            buttonGroup.style.margin = '10px';
            container.appendChild(buttonGroup);

            const difficulties = ['fácil', 'media', 'difícil'];
            difficulties.forEach(diff => {
                const diffButton = document.createElement('button');
                diffButton.className = 'game-button difficulty-button';
                diffButton.innerText = diff.charAt(0).toUpperCase() + diff.slice(1);
                diffButton.style.padding = '8px 16px';
                diffButton.style.fontSize = '16px';
                diffButton.style.cursor = 'pointer';
                diffButton.style.margin = '5px';
                diffButton.onclick = async () => {
                    const playerName = nameInput.value.trim();
                    if (!playerName) {
                        display_feedback('Por favor, ingresa un nombre válido.', 'red', null, false);
                        return;
                    }
                    console.log('create_game_ui: Starting AI game', { playerName, difficulty: diff });
                    container.innerHTML = '';
                    await start_game(mode, [playerName, 'IA'], output, container, prompt, input, button, diff, games_played, total_scores, wins, gameType, sessionId);
                };
                buttonGroup.appendChild(diffButton);
            });
        }
    } catch (err) {
        console.error('create_game_ui: Error', err);
        display_feedback('Error al crear la interfaz del juego.', 'red', null, false);
    }
}

async function start_game(mode, players, output, container, prompt, input, button, difficulty, games_played, total_scores, wins, gameType, sessionId, playerRole) {
    console.log('start_game: Starting', JSON.stringify({ mode, players, difficulty, games_played, gameType, sessionId, playerRole }));
    await play_game(null, null, mode, players, output, container, prompt, input, button, difficulty, games_played, 3, total_scores, wins, delay, display_feedback, gameType, sessionId, playerRole);
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

        function display_feedback(message, color, player, append = false) {
            const escapedPlayer = player ? escapeHTML(player) : null;
            const formatted_feedback = escapedPlayer ? message.replace(player, `<strong>${escapedPlayer}</strong>`) : message;
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
            console.log('start_game: Showing loading message', { inputAttached: !!input.parentNode, buttonAttached: !!button.parentNode });

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
    difficulty
  });

  // Validate DOM elements
  if (!prompt || !input || !output || !button || !prompt.parentNode || !input.parentNode || !output.parentNode || !button.parentNode) {
    console.error('process_guess: Missing or unattached DOM elements', { prompt, input, output, button });
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
        feedback = `Entrada vacía. Ingresa una adivinanza válida.`;
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
          feedback = `Última oportunidad para ingresar tu adivinanza.`;
          feedback_color = 'orange';
          display_feedback(feedback, feedback_color, player, true);
          focusInput(input);
          return null;
        } else if (timeout_retries < max_timeout_retries) {
          feedback = `Ingresa tu adivinanza. Intentos restantes: ${max_timeout_retries - timeout_retries}.`;
          feedback_color = 'orange';
          display_feedback(feedback, feedback_color, player, true);
          focusInput(input);
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
      console.error('process_guess: Guess input error:', error);
      feedback = `Error al procesar la entrada. Intenta de nuevo.`;
      feedback_color = 'red';
      display_feedback(feedback, feedback_color, player, true);
      focusInput(input);
      return null;
    }
  }

  try {
    // Get initial guess
    if (mode === '3' && player === 'IA') {
      display_feedback(`IA está pensando...`, 'blue', player, true);
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
        feedback = `Adivinanza inválida. Pierdes el turno.`;
        feedback_color = 'red';
        display_feedback(feedback, feedback_color, player, true);
        break;
      }

      console.log('process_guess: Processing guess', { player, guess, normalized_guess: normalizar(guess), normalized_secret });

      if (guess.length === 1 && lastCorrectWasVowel[player] && vowels.has(guess)) {
        display_feedback(`Inválido. Ingrese una consonante.`, 'red', player, true);
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
          if (result === false) return { penalizo, tries, scores, guessed_letters, word_guessed: false };
          guess = result;
        }
        continue;
      }

      if (guess.length === 1 && !secret_word.includes(guess) && used_wrong_letters.has(guess)) {
        if (retried < max_retries - 1) {
          display_feedback(`Advertencia: '${escapeHTML(guess)}' ya intentada. Intenta de nuevo.`, 'orange', player, true);
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
        break;
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
        break;
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
        break;
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
        feedback = feedback_data.join('\n');
        feedback_color = feedback_data.color;
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
        display_feedback(feedback, feedback_color, player, true);
        await delay(500);
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

async function play_game(loadingMessage, secret_word, mode, players, output, container, prompt, input, button, difficulty, games_played, games_to_play, total_scores, wins, delay, display_feedback, gameType, sessionId, playerRole) {
    console.log('play_game: Starting, Loaded version 2025-06-23-v9.14', JSON.stringify({ mode, players, difficulty, games_played, games_to_play, gameType, sessionId, playerRole }));
    
    if (mode === '2' && gameType === 'remoto' && !sessionId) {
        console.error('play_game: Invalid sessionId for remote mode', sessionId);
        display_feedback('Error: ID de sesión no definido. Reinicia el juego.', 'red', null, false);
        return;
    }

    // Validate players array
    if (!Array.isArray(players) || players.some(p => !p || typeof p !== 'string')) {
        console.error('play_game: Invalid players array', players);
        display_feedback('Error: Jugadores no válidos. Reinicia el juego.', 'red', null, false);
        return;
    }
    console.log('play_game: Validated players', players);

    let provided_secret_word = secret_word || await get_secret_word();
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
            const snapshot = await get(sessionRef);
            if (snapshot.exists()) {
                const gameData = snapshot.val();
                console.log('play_game: Retrieved game state', JSON.stringify(gameData));
                if (playerRole === 'creator' && gameData.status === 'ready') {
                    console.log('play_game: Player 1 (creator) initializing game', { sessionId, player1: players[0] });
                    let attempts = 3;
                    while (attempts--) {
                        try {
                            await update(sessionRef, {
                                secretWord: provided_secret_word,
                                guessedLetters: [],
                                tries,
                                scores,
                                currentPlayer: players[current_player_idx],
                                status: 'playing',
                                player1: players[0],
                                player2: gameData.player2 || players[1]
                            });
                            console.log('play_game: Initial Firebase update successful', { sessionId, secretWord: provided_secret_word, currentPlayer: players[current_player_idx] });
                            break;
                        } catch (err) {
                            console.warn(`play_game: Retry ${3 - attempts}/3 for initial Firebase update`, err);
                            await delay(500);
                            if (attempts === 0) {
                                console.error('play_game: Failed to initialize Firebase game state', err);
                                display_feedback('Error al iniciar el juego remoto. Intenta de nuevo.', 'red', null, false);
                                return;
                            }
                        }
                    }
                } else {
                    console.log('play_game: Player 2 (joiner) waiting for game to start', { sessionId, player: players[0] });
                    let attempts = 10;
                    while (attempts--) {
                        const waitSnapshot = await get(sessionRef);
                        if (waitSnapshot.exists() && waitSnapshot.val().status === 'playing') {
                            console.log('play_game: Game state updated to playing', JSON.stringify(waitSnapshot.val()));
                            provided_secret_word = waitSnapshot.val().secretWord || provided_secret_word;
                            current_player_idx = players.indexOf(waitSnapshot.val().currentPlayer);
                            if (current_player_idx === -1) {
                                console.warn('play_game: Invalid currentPlayer from Firebase, defaulting to 0', waitSnapshot.val().currentPlayer);
                                current_player_idx = 0;
                            }
                            console.log('play_game: Set current_player_idx for Player 2', current_player_idx);
                            break;
                        }
                        console.log('play_game: Waiting for status: playing', { attemptsLeft: attempts });
                        await delay(1000);
                        if (attempts === 0) {
                            console.error('play_game: Timeout waiting for game to start', sessionId);
                            display_feedback('Error: El juego no se inició. Reinicia la sesión.', 'red', null, false);
                            return;
                        }
                    }
                }
            } else {
                console.error('play_game: Game session not found', sessionId);
                display_feedback('Error: Sesión no encontrada. Reinicia el juego.', 'red', null, false);
                return;
            }

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
        const player = players[current_player_idx] || 'Jugador 1';
        const other_player = players[(current_player_idx + 1) % players.length] || null;
        console.log('update_ui: Updating with', { player, other_player, current_player_idx, players, playerRole });
        try {
            if (mode === '1') {
                player_info.innerHTML = `<strong>${escapeHTML(player)}</strong>: Intentos: ${tries[player] || 0} | Puntaje: ${scores[player] || 0}`;
            } else {
                player_info.innerHTML = `Turno de <strong>${escapeHTML(player)}</strong>: Intentos: ${tries[player] || 0} | Puntaje: ${scores[player] || 0}` +
                    (other_player ? `<br><strong>${escapeHTML(other_player)}</strong>: Intentos: ${tries[other_player] || 0} | Puntaje: ${scores[other_player] || 0}` : '');
            }
            progress.innerText = `Palabra: ${formato_palabra(normalizar(provided_secret_word).split('').map(l => guessed_letters.has(l) ? l : "_"))}`;
            prompt.innerText = mode === '2' && gameType === 'remoto' && player !== players[current_player_idx] ? 'Esperando el turno del otro jugador...' : 'Ingresa una letra o la palabra completa:';
            if (input.parentNode && (mode !== '2' || gameType !== 'remoto' || player === players[current_player_idx])) {
                input.disabled = false;
                focusInput(input);
            } else if (input.parentNode) {
                input.disabled = true;
            }
            console.log('update_ui: UI updated', JSON.stringify({ player, score: scores[player], player_info: player_info.innerHTML, input_disabled: input.disabled, playerRole }));
        } catch (err) {
            console.error('update_ui: Error updating UI', err);
            display_feedback('Error al actualizar la interfaz del juego.', 'red', null, false);
        }
    }

    async function game_loop() {
        console.log('game_loop: Starting', JSON.stringify({ players, tries, scores, mode, secret_word_length: provided_secret_word.length, gameType, sessionId, playerRole }));

        players.forEach(player => {
            if (tries[player] == null) tries[player] = total_tries;
            if (scores[player] == null) scores[player] = 0;
            if (lastCorrectWasVowel[player] == null) lastCorrectWasVowel[player] = false;
        });

        let unsubscribe;
        if (mode === '2' && gameType === 'remoto') {
            console.log('game_loop: Setting up Firebase listener for', sessionId);
            unsubscribe = onValue(sessionRef, async (snapshot) => {
                const game = snapshot.val();
                console.log('game_loop: Firebase snapshot received', JSON.stringify(game));
                if (!game) {
                    console.log('game_loop: Game session deleted or terminated');
                    display_feedback('El juego ha sido terminado o eliminado por el otro jugador.', 'red', null, false);
                    prompt.innerText = 'El juego ha terminado.';
                    input.style.display = 'inline-block';
                    input.value = '';
                    focusInput(input);
                    button.style.display = 'inline-block';
                    button.onclick = () => main();
                    if (unsubscribe) unsubscribe();
                    return;
                }
                if (game.status !== 'playing' && game.status !== 'ready') {
                    console.log('game_loop: Game not in playing or ready state, exiting', game.status);
                    if (unsubscribe) unsubscribe();
                    return;
                }
                if (!Array.isArray(game.guessedLetters)) {
                    console.warn('game_loop: game.guessedLetters is not an array, initializing as empty', game.guessedLetters);
                    await update(sessionRef, { guessedLetters: [] });
                    game.guessedLetters = [];
                }
                if (!game.tries || typeof game.tries !== 'object') {
                    console.warn('game_loop: game.tries is invalid, initializing', game.tries);
                    await update(sessionRef, { tries: Object.fromEntries(players.map(p => [p, total_tries])) });
                    game.tries = Object.fromEntries(players.map(p => [p, total_tries]));
                }
                if (!game.scores || typeof game.scores !== 'object') {
                    console.warn('game_loop: game.scores is invalid, initializing', game.scores);
                    await update(sessionRef, { scores: Object.fromEntries(players.map(p => [p, 0])) });
                    game.scores = Object.fromEntries(players.map(p => [p, 0]));
                }
                if (!game.currentPlayer || !players.includes(game.currentPlayer)) {
                    console.warn('game_loop: Invalid currentPlayer, resetting to first player', game.currentPlayer);
                    await update(sessionRef, { currentPlayer: players[0] });
                    game.currentPlayer = players[0];
                }
                guessed_letters.clear();
                game.guessedLetters.forEach(l => guessed_letters.add(l));
                Object.assign(tries, game.tries);
                Object.assign(scores, game.scores);
                current_player_idx = players.indexOf(game.currentPlayer);
                if (current_player_idx === -1) {
                    console.warn('game_loop: Invalid currentPlayer after validation, resetting to 0', game.currentPlayer);
                    current_player_idx = 0;
                    await update(sessionRef, { currentPlayer: players[0] });
                }
                console.log('game_loop: State updated from Firebase', { current_player_idx, guessed_letters: Array.from(guessed_letters), tries, scores, playerRole });
                update_ui();
                if (game.status === 'ended') {
                    console.log('game_loop: Game ended via Firebase');
                    if (unsubscribe) unsubscribe();
                }
            }, (error) => {
                console.error('game_loop: Firebase snapshot error:', error);
                display_feedback('Error de sincronización con el servidor remoto.', 'red', null, false);
                if (unsubscribe) unsubscribe();
            });
        }

        while (Object.values(tries).some(t => t > 0) &&
               !normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l))) {
            const player = players[current_player_idx];
            if (tries[player] == null || tries[player] <= 0) {
                console.log('game_loop: Skipping player', JSON.stringify({ player, tries: tries[player] || 'undefined', playerRole }));
                current_player_idx = (current_player_idx + 1) % players.length;
                if (mode === '2' && gameType === 'remoto') {
                    await update(sessionRef, { currentPlayer: players[current_player_idx] });
                    console.log('game_loop: Updated currentPlayer', players[current_player_idx]);
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
                    console.log('game_loop: Firebase updated after guess', { guessedLetters: Array.from(guessed_letters), tries, scores, currentPlayer: players[current_player_idx], playerRole });
                    await delay(500); // Ensure Firebase propagates update
                } catch (err) {
                    console.error('game_loop: Firebase update error after guess', err);
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
                word_guessed: result.word_guessed,
                playerRole
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
                    console.log('game_loop: Firebase updated after out of tries', { tries, scores });
                }
            }

            if (result.word_guessed || normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l))) {
                output.innerHTML = '';
                display_feedback(`¡Felicidades, <strong>${escapeHTML(player)}</strong>! Adivinaste la palabra!`, 'green', player, false);
                if (mode === '2' && gameType === 'remoto') {
                    await update(sessionRef, { status: 'ended' });
                    console.log('game_loop: Firebase updated to ended');
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
                    console.log('game_loop: Updated currentPlayer after turn change', players[current_player_idx]);
                }
            }
            update_ui();
        }

        console.log('game_loop: Ended', JSON.stringify({ players, tries, scores, word_guessed: normalizar(provided_secret_word).split('').every(l => guessed_letters.has(l)), playerRole }));
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
            console.log('play_game: repeat_button: Repeating game series for mode', mode, JSON.stringify({ players, playerRole }));
            output.innerText = '';
            const reset_scores = Object.fromEntries(players.map(p => [p, 0]));
            const reset_wins = Object.fromEntries(players.map(p => [p, 0]));
            if (mode === '2' && gameType === 'remoto') {
                remove(ref(database, `games/${sessionId}`));
            }
            start_game(mode, players, output, container, prompt, input, button, difficulty, 0, reset_scores, reset_wins, gameType, sessionId, playerRole);
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
                start_game(mode, players, output, container, prompt, input, button, difficulty, games_played + 1, total_scores, wins, gameType, sessionId, playerRole);
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
        if (unsubscribe) {
            unsubscribe();
            console.log('play_game: Firebase listeners cleaned up');
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
        if (!players.every(p => p && typeof p === 'string' && p.trim())) {
            console.error('main: Invalid players detected', players);
            output.innerText = 'Error: Jugadores no definidos correctamente.';
            return;
        }
        const total_scores = Object.fromEntries(players.map(p => [p, 0]));
        const wins = Object.fromEntries(players.map(p => [p, 0]));
        await start_game(mode, players, output, container, prompt, input, button, difficulty, 0, total_scores, wins, gameType, sessionId);
        console.log('main: Game started');
    } catch (err) {
        console.error('main: Error in game setup', err);
        output.innerText = 'Error al iniciar el juego. Por favor, recarga la página.';
        output.style.color = 'red';
        return; // Stop execution
    }
}

// Start the game
main();
