import { useState, useEffect, useCallback } from "react";
import "./App.css";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 32;
const PLATFORM_HEIGHT = 20;
const COIN_SIZE = 20;
const ENEMY_SIZE = 32;
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const WORLD_SPEED = 2.5;

function App() {
  const [gameState, setGameState] = useState("playing");
  const [player, setPlayer] = useState({
    x: 100,
    y: 400,
    vy: 0,
    onGround: false,
    animFrame: 0,
  });
  const [worldOffset, setWorldOffset] = useState(0);
  const [score, setScore] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [keys, setKeys] = useState({});

  // Generate initial world elements
  const [platforms, setPlatforms] = useState([]);
  const [coins, setCoins] = useState([]);
  const [enemies, setEnemies] = useState([]);

  // Initialize world on first load
  useEffect(() => {
    generateInitialWorld();
  }, []);

  const generateInitialWorld = () => {
    // Ground platforms - continuous endless ground
    const newPlatforms = [];
    for (let i = 0; i < 300; i++) {
      newPlatforms.push({
        id: `ground-${i}`,
        x: i * 100,
        y: 550,
        width: 100,
        height: 50,
        type: "ground",
      });
    }

    // Floating platforms - much closer together
    for (let i = 0; i < 150; i++) {
      if (Math.random() > 0.3) {
        // 70% chance to spawn platform
        newPlatforms.push({
          id: `floating-${i}`,
          x: 200 + i * 120, 
          y: 300 + Math.random() * 200,
          width: 80,
          height: 20,
          type: "floating",
        });
      }
    }

    setPlatforms(newPlatforms);

    // Coins
    const newCoins = [];
    for (let i = 0; i < 200; i++) {
      newCoins.push({
        id: i,
        x: 150 + i * 80,
        y: 200 + Math.random() * 300,
        collected: false,
        animFrame: 0,
      });
    }
    setCoins(newCoins);

    // Enemies - spread out but active
    const newEnemies = [];
    for (let i = 0; i < 100; i++) {
      newEnemies.push({
        id: i,
        x: 400 + i * 150, //  spacing between enemies
        y: 518, // Ground level
        active: true,
        animFrame: 0,
      });
    }
    setEnemies(newEnemies);
  };

  // Key handlers
  const handleKeyDown = useCallback((e) => {
    setKeys((prev) => ({ ...prev, [e.code]: true }));
  }, []);

  const handleKeyUp = useCallback((e) => {
    setKeys((prev) => ({ ...prev, [e.code]: false }));
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Collision detection
  const checkCollision = (rect1, rect2) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  };

  // Main game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const gameLoop = setInterval(() => {
      // Move world left (endless runner effect)
      setWorldOffset((prev) => prev + WORLD_SPEED * gameSpeed);

      // Increase game speed over time
      setGameSpeed((prev) => Math.min(prev + 0.002, 2.5));

      // Score increases with distance
      setScore((prev) => prev + Math.floor(gameSpeed));

      // Update player
      setPlayer((prevPlayer) => {
        let newPlayer = { ...prevPlayer };

        // Jump input
        if (
          (keys.Space || keys.ArrowUp || keys.KeyW || keys.KeyX) &&
          newPlayer.onGround
        ) {
          newPlayer.vy = JUMP_FORCE;
          newPlayer.onGround = false;
        }

        // Apply gravity
        newPlayer.vy += GRAVITY;
        newPlayer.y += newPlayer.vy;

        // Platform collision
        newPlayer.onGround = false;

        platforms.forEach((platform) => {
          const platformScreenX = platform.x - worldOffset;

          if (
            platformScreenX > -platform.width - 50 &&
            platformScreenX < GAME_WIDTH + 50
          ) {
            const playerRect = {
              x: newPlayer.x,
              y: newPlayer.y,
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
            };

            const platformRect = {
              x: platformScreenX,
              y: platform.y,
              width: platform.width,
              height: platform.height,
            };

            if (checkCollision(playerRect, platformRect)) {
              if (newPlayer.vy >= 0 && newPlayer.y < platform.y) {
                newPlayer.y = platform.y - PLAYER_SIZE;
                newPlayer.vy = 0;
                newPlayer.onGround = true;
              }
            }
          }
        });

        // Death if fall off screen
        if (newPlayer.y > GAME_HEIGHT + 100) {
          setGameState("gameOver");
        }

        newPlayer.animFrame = (newPlayer.animFrame + 1) % 60;
        return newPlayer;
      });

      // Update coins
      setCoins((prevCoins) =>
        prevCoins.map((coin) => {
          if (coin.collected) return coin;

          const coinScreenX = coin.x - worldOffset;

          if (coinScreenX > -50 && coinScreenX < GAME_WIDTH + 50) {
            const coinRect = {
              x: coinScreenX,
              y: coin.y,
              width: COIN_SIZE,
              height: COIN_SIZE,
            };

            const playerRect = {
              x: player.x,
              y: player.y,
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
            };

            if (checkCollision(coinRect, playerRect)) {
              setScore((prev) => prev + 100);
              return { ...coin, collected: true };
            }
          }

          return { ...coin, animFrame: (coin.animFrame + 1) % 120 };
        })
      );

      // Update enemies and check collisions
      setEnemies((prevEnemies) =>
        prevEnemies.map((enemy) => {
          if (!enemy.active) return enemy;

          const enemyScreenX = enemy.x - worldOffset;

          if (enemyScreenX > -50 && enemyScreenX < GAME_WIDTH + 50) {
            const enemyRect = {
              x: enemyScreenX,
              y: enemy.y,
              width: ENEMY_SIZE,
              height: ENEMY_SIZE,
            };

            const playerRect = {
              x: player.x,
              y: player.y,
              width: PLAYER_SIZE,
              height: PLAYER_SIZE,
            };

            if (checkCollision(enemyRect, playerRect)) {
              // Hit enemy - game over!
              setGameState("gameOver");
              return enemy;
            }
          }

          return { ...enemy, animFrame: (enemy.animFrame + 1) % 60 };
        })
      );

      // Generate more world as we progress
      const furthestX = Math.max(...platforms.map((p) => p.x), 0);
      if (worldOffset > furthestX - 3000) {
        setPlatforms((prev) => {
          const newPlatforms = [...prev];

          // Add ground
          for (let i = 0; i < 100; i++) {
            newPlatforms.push({
              id: `ground-${Date.now()}-${i}`,
              x: furthestX + 100 + i * 100,
              y: 550,
              width: 100,
              height: 50,
              type: "ground",
            });
          }

          // Add floating platforms
          for (let i = 0; i < 50; i++) {
            if (Math.random() > 0.3) {
              newPlatforms.push({
                id: `floating-${Date.now()}-${i}`,
                x: furthestX + 200 + i * 120,
                y: 300 + Math.random() * 200,
                width: 80,
                height: 20,
                type: "floating",
              });
            }
          }

          return newPlatforms;
        });

        // Add more coins
        setCoins((prev) => {
          const newCoins = [...prev];
          const lastId = Math.max(...prev.map((c) => c.id), 0);

          for (let i = 0; i < 50; i++) {
            newCoins.push({
              id: lastId + i + 1,
              x: furthestX + 150 + i * 80,
              y: 200 + Math.random() * 300,
              collected: false,
              animFrame: 0,
            });
          }
          return newCoins;
        });

        // Add more enemies
        setEnemies((prev) => {
          const newEnemies = [...prev];
          const lastId = Math.max(...prev.map((e) => e.id), 0);

          for (let i = 0; i < 25; i++) {
            newEnemies.push({
              id: lastId + i + 1,
              x: furthestX + 400 + i * 150,
              y: 518,
              active: true,
              animFrame: 0,
            });
          }
          return newEnemies;
        });
      }
    }, 16); // 60fps

    return () => clearInterval(gameLoop);
  }, [gameState, keys, worldOffset, gameSpeed, player, platforms]);

  const resetGame = () => {
    setPlayer({
      x: 100,
      y: 400,
      vy: 0,
      onGround: false,
      animFrame: 0,
    });
    setWorldOffset(0);
    setGameSpeed(1);
    setScore(0);
    generateInitialWorld();
    setGameState("playing");
  };

  return (
    <div className="game-container">
      <div className="hud">
        <div className="score">Score: {score}</div>
        <div className="instructions">
          SPACE/UP/W to JUMP! Speed: {gameSpeed.toFixed(1)}x
        </div>
      </div>

      <div className="game-world">
        {/* Scrolling background clouds */}
        <div className="clouds">
          {[...Array(30)].map((_, i) => {
            const cloudX = (i * 300 - worldOffset * 0.3) % (GAME_WIDTH + 400);
            return (
              <div
                key={i}
                className="cloud"
                style={{
                  left: `${cloudX}px`,
                  top: `${50 + (i % 3) * 40}px`,
                }}
              >
                ☁️
              </div>
            );
          })}
        </div>

        {/* Render platforms */}
        {platforms.map((platform) => {
          const screenX = platform.x - worldOffset;
          if (screenX > -platform.width - 100 && screenX < GAME_WIDTH + 100) {
            return (
              <div
                key={platform.id}
                className={`platform ${platform.type}`}
                style={{
                  left: screenX,
                  top: platform.y,
                  width: platform.width,
                  height: platform.height,
                }}
              />
            );
          }
          return null;
        })}

        {/* Render coins */}
        {coins.map((coin) => {
          if (coin.collected) return null;
          const screenX = coin.x - worldOffset;
          if (screenX > -50 && screenX < GAME_WIDTH + 50) {
            return (
              <div
                key={coin.id}
                className="coin"
                style={{
                  left: screenX,
                  top: coin.y,
                  transform: `scale(${
                    1 + Math.sin(coin.animFrame * 0.1) * 0.1
                  }) rotate(${coin.animFrame * 3}deg)`,
                }}
              >
                🪙
              </div>
            );
          }
          return null;
        })}

        {/* Render enemies */}
        {enemies.map((enemy) => {
          if (!enemy.active) return null;
          const screenX = enemy.x - worldOffset;
          if (screenX > -50 && screenX < GAME_WIDTH + 50) {
            return (
              <div
                key={enemy.id}
                className="enemy active"
                style={{
                  left: screenX,
                  top: enemy.y,
                }}
              >
                👾
              </div>
            );
          }
          return null;
        })}

        {/* Player at fixed position */}
        <div
          className={`player ${player.onGround ? "grounded" : "jumping"}`}
          style={{
            left: player.x,
            top: player.y,
          }}
        >
          🐸
        </div>
      </div>

      {gameState === "gameOver" && (
        <div className="game-over">
          <div className="game-over-content">
            <h2>Game Over!</h2>
            <p>Final Score: {score}</p>
            <p>Distance: {Math.floor(worldOffset / 10)}m</p>
            <p>Max Speed: {gameSpeed.toFixed(1)}x</p>
            <button onClick={resetGame} className="restart-btn">
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
