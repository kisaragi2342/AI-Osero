document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements (変更なし) ---
    const titleScreen = document.getElementById('title-screen');
    const gameScreen = document.getElementById('game-screen');
    const boardWidthInput = document.getElementById('board-width-input');
    const boardHeightInput = document.getElementById('board-height-input');
    const sizeErrorMessage = document.getElementById('size-error-message');
    const difficultyButtons = document.querySelectorAll('.difficulty-button');
    const startGameButton = document.getElementById('start-game-button');
    const backToTitleButton = document.getElementById('back-to-title-button');
    const muteButton = document.getElementById('mute-button');
    const currentGameInfoDisplay = document.getElementById('current-game-info-display');
    const boardContainer = document.getElementById('board-container');
    const blackScoreSpan = document.getElementById('black-score');
    const whiteScoreSpan = document.getElementById('white-score');
    const currentTurnIndicator = document.getElementById('current-turn-indicator');
    const resetButton = document.getElementById('reset-button');
    const messageElement = document.getElementById('message');

    // --- Game Constants & Variables (変更なし) ---
    const PLAYER = 1;
    const AI = 2;
    const EMPTY = 0;
    let boardWidth = 8;
    let boardHeight = 8;
    let board = [];
    let currentPlayer = PLAYER;
    let gameRunning = true;
    let selectedDifficulty = 'normal';
    let isMuted = false;

    const directions = [
        [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
    ];

    // --- Sound Effects (変更なし) ---
    const sounds = {
        place: new Audio('sounds/place.wav'),
        flip: new Audio('sounds/flip.wav'),
        pass: new Audio('sounds/pass.wav'),
        win: new Audio('sounds/win.wav'),
        lose: new Audio('sounds/lose.wav'),
        draw: new Audio('sounds/draw.wav'),
        click: new Audio('sounds/click.wav')
    };
    function playSound(soundName) {
        if (!isMuted && sounds[soundName]) {
            sounds[soundName].currentTime = 0;
            sounds[soundName].play().catch(error => console.error("Error playing sound:", soundName, error));
        }
    }

    // --- Title Screen Logic (変更なし) ---
    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            playSound('click');
            difficultyButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedDifficulty = button.dataset.difficulty;
        });
    });

    startGameButton.addEventListener('click', () => {
        playSound('click');
        const width = parseInt(boardWidthInput.value);
        const height = parseInt(boardHeightInput.value);

        if (width % 2 !== 0 || height % 2 !== 0 ||
            width < 6 || width > 16 || height < 6 || height > 16) {
            sizeErrorMessage.textContent = "幅と高さは6～16の偶数を指定してください。";
            return;
        }
        sizeErrorMessage.textContent = "";
        boardWidth = width;
        boardHeight = height;

        titleScreen.style.display = 'none';
        gameScreen.style.display = 'flex';
        
        let difficultyText = "";
        if (selectedDifficulty === "easy") difficultyText = "易しい";
        else if (selectedDifficulty === "normal") difficultyText = "普通";
        else if (selectedDifficulty === "hard") difficultyText = "難しい";
        currentGameInfoDisplay.textContent = `盤面: ${boardWidth}x${boardHeight}, 難易度: ${difficultyText}`;
        
        initializeBoard();
    });

    backToTitleButton.addEventListener('click', () => {
        playSound('click');
        gameScreen.style.display = 'none';
        titleScreen.style.display = 'flex';
    });

    muteButton.addEventListener('click', () => {
        isMuted = !isMuted;
        muteButton.textContent = isMuted ? "ミュート解除" : "ミュート";
        muteButton.classList.toggle('muted', isMuted);
    });

    // --- Game Logic Functions ---
    function initializeBoard() {
        board = Array(boardHeight).fill(null).map(() => Array(boardWidth).fill(EMPTY));
        const midX1 = boardWidth / 2 - 1, midX2 = boardWidth / 2;
        const midY1 = boardHeight / 2 - 1, midY2 = boardHeight / 2;
        board[midY1][midX1] = AI; board[midY1][midX2] = PLAYER;
        board[midY2][midX1] = PLAYER; board[midY2][midX2] = AI;
        
        currentPlayer = PLAYER;
        gameRunning = true;
        messageElement.textContent = '';
        boardContainer.style.gridTemplateColumns = `repeat(${boardWidth}, 1fr)`;
        boardContainer.style.gridTemplateRows = `repeat(${boardHeight}, 1fr)`;
        renderBoard();
        updateScoreAndTurn();
    }

    function renderBoard() {
        boardContainer.innerHTML = '';
        const validMovesForPlayer = (currentPlayer === PLAYER && gameRunning) ? getAllValidMoves(PLAYER) : [];

        for (let row = 0; row < boardHeight; row++) {
            for (let col = 0; col < boardWidth; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = row; cell.dataset.col = col;

                const discData = board[row][col];
                if (discData !== EMPTY) {
                    const disc = document.createElement('div');
                    disc.classList.add('disc');
                    disc.classList.add(discData === PLAYER ? 'black' : 'white');
                    // アニメーションで transform: rotateY(0deg) が初期値になるように調整
                    if (disc.style.transform === '') { // 初回描画時など
                        disc.style.transform = 'rotateY(0deg)';
                    }
                    cell.appendChild(disc);
                } else if (currentPlayer === PLAYER && gameRunning) {
                    if (validMovesForPlayer.some(move => move.row === row && move.col === col)) {
                        cell.classList.add('playable');
                    }
                }
                cell.addEventListener('click', handleCellClick); // handleCellClick は async に変更
                boardContainer.appendChild(cell);
            }
        }
    }

    // *** MODIFIED FUNCTION ***
    async function handleCellClick(event) { // ★ Mark as async
        if (!gameRunning || currentPlayer === AI) return;
        const targetCell = event.currentTarget;
        const row = parseInt(targetCell.dataset.row);
        const col = parseInt(targetCell.dataset.col);

        const flippableDiscs = getFlippableDiscs(row, col, PLAYER);
        if (flippableDiscs.length > 0) {
            playSound('place');
            
            // 1. Update board data for the placed disc
            board[row][col] = PLAYER;
            
            // 2. Visually place the new disc (or let renderBoard handle it after animation)
            // For immediate feedback before animation starts on other discs:
            targetCell.innerHTML = ''; // Clear 'playable' highlight or old content
            const newDiscElement = document.createElement('div');
            newDiscElement.classList.add('disc', 'black');
            newDiscElement.style.transform = 'rotateY(0deg)'; // Ensure correct initial state for CSS
            targetCell.appendChild(newDiscElement);
            targetCell.classList.remove('playable');

            // 3. Animate flips (this will also update board data for flipped discs)
            await animateFlips(flippableDiscs, PLAYER);
            
            messageElement.textContent = '';
            // 4. Re-render the board to ensure visual consistency after all animations
            renderBoard(); 
            // 5. Update score and turn display, and check for game over
            updateScoreAndTurn(); 
            
            // 6. Switch player if game is still running
            if (gameRunning) {
                switchPlayer();
            }
        } else {
            messageElement.textContent = "そこには置けません。";
        }
    }
    
    // *** MODIFIED FUNCTION ***
    async function animateFlips(discsToFlip, newPlayerOwner) {
        let flipSoundPlayedThisTurn = false;
        for (const discCoord of discsToFlip) {
            const cellElement = boardContainer.querySelector(`.cell[data-row='${discCoord.row}'][data-col='${discCoord.col}']`);
            const discElement = cellElement ? cellElement.querySelector('.disc') : null; // Check if cellElement exists

            if (discElement) {
                if (!flipSoundPlayedThisTurn && discsToFlip.length > 0) { // Play sound only if there are discs to flip
                    playSound('flip');
                    flipSoundPlayedThisTurn = true;
                }
                
                const targetColorClass = newPlayerOwner === PLAYER ? 'black' : 'white';
                const animationClass = newPlayerOwner === PLAYER ? 'flipping-to-black' : 'flipping-to-white';
                
                // Ensure the disc is in its initial state before starting animation
                discElement.style.transform = 'rotateY(0deg)'; // Reset transform if it was already flipped
                discElement.classList.remove('white', 'black', 'flipping-to-white', 'flipping-to-black');
                // Set the color it's flipping FROM (opponent's color)
                discElement.classList.add(newPlayerOwner === PLAYER ? 'white' : 'black'); 


                // Force a reflow to ensure the initial state is applied before animation starts
                void discElement.offsetWidth; 

                discElement.classList.add(animationClass); // Start animation

                // Wait for CSS animation to complete (duration is 0.5s in CSS)
                await new Promise(resolve => setTimeout(resolve, 500)); 

                discElement.classList.remove(animationClass);
                // Set final color classes correctly
                discElement.classList.remove('white', 'black'); // Remove old color before adding new
                discElement.classList.add(targetColorClass);
                discElement.style.transform = 'rotateY(0deg)'; // Reset transform after animation completes to be 'face up'
                                                              // Or 'rotateY(180deg)' if your CSS keyframes end there and you want to keep it.
                                                              // The keyframes in previous example end at 180deg, so visually it's correct.
                                                              // To make it ready for another flip, it should be reset or handled.
                                                              // For simplicity, if keyframes handle the final state, this explicit reset might not be needed
                                                              // or should match the final state of the keyframe.
                                                              // Let's assume keyframes set the final visual state.

                // Update board data for this specific flipped disc
                board[discCoord.row][discCoord.col] = newPlayerOwner;
            }
        }
        // No renderBoard() or updateScoreAndTurn() here; to be called by the main move function
    }


    function getFlippableDiscs(row, col, player) { // (変更なし)
        if (board[row][col] !== EMPTY) return [];
        const opponent = player === PLAYER ? AI : PLAYER;
        let allFlippable = [];
        for (const [dr, dc] of directions) {
            let r = row + dr, c = col + dc;
            let line = [];
            while (r >= 0 && r < boardHeight && c >= 0 && c < boardWidth && board[r][c] === opponent) {
                line.push({row: r, col: c});
                r += dr; c += dc;
            }
            if (r >= 0 && r < boardHeight && c >= 0 && c < boardWidth && board[r][c] === player && line.length > 0) {
                allFlippable = allFlippable.concat(line);
            }
        }
        return allFlippable;
    }

    function getAllValidMoves(player) { // (変更なし)
        const validMoves = [];
        for (let r = 0; r < boardHeight; r++) {
            for (let c = 0; c < boardWidth; c++) {
                if (board[r][c] === EMPTY) {
                    const flippable = getFlippableDiscs(r, c, player);
                    if (flippable.length > 0) {
                        validMoves.push({ row: r, col: c, count: flippable.length });
                    }
                }
            }
        }
        return validMoves;
    }

    // *** MODIFIED FUNCTION ***
    function switchPlayer() {
        currentPlayer = (currentPlayer === PLAYER) ? AI : PLAYER;
        // updateScoreAndTurn(); // Moved to after AI move or player pass resolution

        if (!gameRunning) return;

        const validMovesCurrent = getAllValidMoves(currentPlayer);

        if (validMovesCurrent.length === 0) { // Current player must pass
            playSound('pass');
            messageElement.textContent = `${currentPlayer === PLAYER ? "あなた" : "AI"} はパスです。`;
            
            currentPlayer = (currentPlayer === PLAYER) ? AI : PLAYER; // Switch back to the other player
            const validMovesOpponent = getAllValidMoves(currentPlayer);
            
            if (validMovesOpponent.length === 0) { // If other player also has no moves, game over
                updateScoreAndTurn(); // Update scores before announcing winner
                announceWinner(); 
                return;
            }
        }
        
        updateScoreAndTurn(); // Update turn indicator and scores, check game over if not already handled by pass

        if (currentPlayer === AI && gameRunning) {
            currentTurnIndicator.textContent = "AIが思考中です...";
            // ★ Increased delay for AI move to allow player's animation to feel complete
            setTimeout(aiMove, Math.random() * 500 + 1200); // e.g., 1.2s to 1.7s delay
        } else if (gameRunning && currentPlayer === PLAYER) {
             renderBoard(); // Ensure player's valid moves are highlighted
        }
    }

    // *** MODIFIED FUNCTION ***
    async function aiMove() { // ★ Mark as async
        if (!gameRunning) return;
        
        let bestMove = null;
        const validMoves = getAllValidMoves(AI);

        if (validMoves.length === 0) {
            // AI has no moves, switchPlayer will handle the pass message and turn change.
            if (gameRunning) switchPlayer();
            return;
        }

        // AI difficulty logic (変更なし)
        if (selectedDifficulty === 'easy') {
            bestMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        } else { 
            if (selectedDifficulty === 'hard') {
                const corners = [
                    {r:0, c:0}, {r:0, c:boardWidth-1},
                    {r:boardHeight-1, c:0}, {r:boardHeight-1, c:boardWidth-1}
                ];
                let cornerMove = null;
                for (const corner of corners) {
                    const moveAtCorner = validMoves.find(m => m.row === corner.r && m.col === corner.c);
                    if (moveAtCorner) { cornerMove = moveAtCorner; break; }
                }
                if (cornerMove) bestMove = cornerMove;
            }
            if (!bestMove) {
                validMoves.sort((a, b) => b.count - a.count);
                bestMove = validMoves[0];
            }
        }
        
        if (bestMove) {
            playSound('place');
            const flippableDiscs = getFlippableDiscs(bestMove.row, bestMove.col, AI);
            
            // 1. Update board data for the placed disc
            board[bestMove.row][bestMove.col] = AI;

            // 2. Visually place the new disc (or let renderBoard handle it)
            const aiPlacedCell = boardContainer.querySelector(`.cell[data-row='${bestMove.row}'][data-col='${bestMove.col}']`);
            if (aiPlacedCell) {
                aiPlacedCell.innerHTML = ''; // Clear 'playable' if it was (shouldn't be for AI)
                const aiNewDiscElement = document.createElement('div');
                aiNewDiscElement.classList.add('disc', 'white');
                aiNewDiscElement.style.transform = 'rotateY(0deg)';
                aiPlacedCell.appendChild(aiNewDiscElement);
            }

            // 3. Animate flips
            await animateFlips(flippableDiscs, AI);
            
            messageElement.textContent = `AI が (${bestMove.row + 1}, ${bestMove.col + 1}) に置きました。`;
            // 4. Re-render board
            renderBoard();
            // 5. Update score and turn
            updateScoreAndTurn();
            
            // 6. Switch player if game is still running
            if (gameRunning) {
                switchPlayer();
            }
        }
        // If bestMove is null (shouldn't happen if validMoves.length > 0), it means AI passes.
        // This case is now handled by the check pobreza at the beginning of aiMove.
    }

    function updateScoreAndTurn() { // (変更なし、ただし呼び出し箇所に注意)
        let blackCount = 0, whiteCount = 0, emptyCount = 0;
        for (let r = 0; r < boardHeight; r++) {
            for (let c = 0; c < boardWidth; c++) {
                if (board[r][c] === PLAYER) blackCount++;
                else if (board[r][c] === AI) whiteCount++;
                else emptyCount++;
            }
        }
        blackScoreSpan.textContent = blackCount;
        whiteScoreSpan.textContent = whiteCount;

        if (!gameRunning) return;

        currentTurnIndicator.textContent = (currentPlayer === PLAYER) ? "あなたの番です" : "AIの番です";

        // Check for game over condition here, AFTER scores and turn are updated
        if (emptyCount === 0 || (!getAllValidMoves(PLAYER).length && !getAllValidMoves(AI).length)) {
            if (gameRunning) { // Ensure announceWinner is called only once
                // Delay slightly to allow final UI updates to be seen
                setTimeout(announceWinner, 150); 
            }
        }
    }

    function announceWinner() { // (変更なし)
        if (!gameRunning) return;
        gameRunning = false;
        // ... (rest of the function is the same)
        let blackCount = 0, whiteCount = 0;
        for (let r = 0; r < boardHeight; r++) {
            for (let c = 0; c < boardWidth; c++) {
                if (board[r][c] === PLAYER) blackCount++;
                if (board[r][c] === AI) whiteCount++;
            }
        }
        let winMessage = "ゲーム終了！ ";
        if (blackCount > whiteCount) {
            winMessage += `あなたの勝ちです (${blackCount} 対 ${whiteCount})。`;
            playSound('win');
        } else if (whiteCount > blackCount) {
            winMessage += `AIの勝ちです (${whiteCount} 対 ${blackCount})。`;
            playSound('lose');
        } else {
            winMessage += `引き分けです (${blackCount} 対 ${whiteCount})。`;
            playSound('draw');
        }
        messageElement.textContent = winMessage;
        currentTurnIndicator.textContent = "ゲーム終了";
    }

    resetButton.addEventListener('click', () => { // (変更なし)
        playSound('click');
        initializeBoard();
    });

    // Initialize (変更なし)
    titleScreen.style.display = 'flex';
    gameScreen.style.display = 'none';
    muteButton.textContent = isMuted ? "ミュート解除" : "ミュート";
    muteButton.classList.toggle('muted', isMuted);
});