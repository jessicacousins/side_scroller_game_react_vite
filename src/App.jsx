import { useState, useEffect, useCallback } from "react";
import "./App.css";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 32;
const PLATFORM_HEIGHT = 20;
const COIN_SIZE = 20;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const SCROLL_SPEED = 2;

function App() {
  const [gameState, setGameState] = useState("playing"); // 'playing', 'gameOver'
  const [player, setPlayer] = useState({
    x: 100,
    y: 400,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: "right",
    animFrame: 0,
  });
  const [camera, setCamera] = useState({ x: 0 });
  const [score, setScore] = useState(0);
  const [keys, setKeys] = useState({});

  // Generate platforms
  const [platforms] = useState(() => {
    const plats = [];
    // Ground platforms
    for (let i = 0; i < 50; i++) {
      plats.push({
        x: i * 160,
        y: 550,
        width: 160,
        height: PLATFORM_HEIGHT,
        type: "ground",
      });
    }
    // Floating platforms
    for (let i = 0; i < 30; i++) {
      plats.push({
        x: 200 + i * 300 + Math.random() * 100,
        y: 450 - Math.random() * 200,
        width: 120,
        height: PLATFORM_HEIGHT,
        type: "floating",
      });
    }
    return plats;
  });

  // Generate coins
  const [coins, setCoins] = useState(() => {
    const coinList = [];
    for (let i = 0; i < 40; i++) {
      coinList.push({
        id: i,
        x: 150 + i * 200 + Math.random() * 100,
        y: 300 + Math.random() * 200,
        collected: false,
        animFrame: 0,
      });
    }
    return coinList;
  });

  // Generate enemies
  const [enemies] = useState(() => {
    const enemyList = [];
    for (let i = 0; i < 15; i++) {
      enemyList.push({
        id: i,
        x: 400 + i * 400 + Math.random() * 200,
        y: 500,
        vx: -1 + Math.random() * 2,
        animFrame: 0,
      });
    }
    return enemyList;
  });

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

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const gameLoop = setInterval(() => {
      setPlayer((prevPlayer) => {
        let newPlayer = { ...prevPlayer };

        // Handle input
        if (keys.ArrowLeft || keys.KeyA) {
          newPlayer.vx = -MOVE_SPEED;
          newPlayer.facing = "left";
        } else if (keys.ArrowRight || keys.KeyD) {
          newPlayer.vx = MOVE_SPEED;
          newPlayer.facing = "right";
        } else {
          newPlayer.vx *= 0.8; // Friction
        }

        if ((keys.Space || keys.ArrowUp || keys.KeyW) && newPlayer.onGround) {
          newPlayer.vy = JUMP_FORCE;
          newPlayer.onGround = false;
        }

        // Apply gravity
        newPlayer.vy += GRAVITY;

        // Update position
        newPlayer.x += newPlayer.vx;
        newPlayer.y += newPlayer.vy;

        // Platform collision
        newPlayer.onGround = false;
        platforms.forEach((platform) => {
          const playerRect = {
            x: newPlayer.x,
            y: newPlayer.y,
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
          };

          if (checkCollision(playerRect, platform)) {
            // Landing on top of platform
            if (
              prevPlayer.y + PLAYER_SIZE <= platform.y + 10 &&
              newPlayer.vy >= 0
            ) {
              newPlayer.y = platform.y - PLAYER_SIZE;
              newPlayer.vy = 0;
              newPlayer.onGround = true;
            }
          }
        });

        // Animate player
        newPlayer.animFrame = (newPlayer.animFrame + 1) % 60;

        // Check if player fell off the world
        if (newPlayer.y > GAME_HEIGHT + 100) {
          setGameState("gameOver");
        }

        return newPlayer;
      });

      // Update camera to follow player
      setCamera((prevCamera) => ({
        x: Math.max(0, player.x - GAME_WIDTH / 2),
      }));

      // Update coins
      setCoins((prevCoins) =>
        prevCoins.map((coin) => {
          if (coin.collected) return coin;

          // Check collision with player
          const coinRect = {
            x: coin.x,
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

          return { ...coin, animFrame: (coin.animFrame + 1) % 120 };
        })
      );
    }, 16); // 60fps

    return () => clearInterval(gameLoop);
  }, [gameState, keys, player.x, player.y, platforms]);

  const resetGame = () => {
    setPlayer({
      x: 100,
      y: 400,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: "right",
      animFrame: 0,
    });
    setCamera({ x: 0 });
    setScore(0);
    setCoins((prev) => prev.map((coin) => ({ ...coin, collected: false })));
    setGameState("playing");
  };

  return (
    <div className="game-container">
      <div className="hud">
        <div className="score">Score: {score}</div>
        <div className="instructions">
          Use ARROW KEYS or WASD to move and jump!
        </div>
      </div>

      <div
        className="game-world"
        style={{
          transform: `translateX(-${camera.x}px)`,
          width: `${platforms.length * 160}px`,
          height: `${GAME_HEIGHT}px`,
        }}
      >
        {/* Background elements */}
        <div className="clouds">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="cloud"
              style={{
                left: `${i * 400 + Math.random() * 200}px`,
                top: `${50 + Math.random() * 100}px`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            >
              ☁️
            </div>
          ))}
        </div>

        {/* Platforms */}
        {platforms.map((platform, i) => (
          <div
            key={i}
            className={`platform ${platform.type}`}
            style={{
              left: platform.x,
              top: platform.y,
              width: platform.width,
              height: platform.height,
            }}
          />
        ))}

        {/* Coins */}
        {coins.map(
          (coin) =>
            !coin.collected && (
              <div
                key={coin.id}
                className="coin"
                style={{
                  left: coin.x,
                  top: coin.y,
                  transform: `scale(${
                    1 + Math.sin(coin.animFrame * 0.1) * 0.1
                  }) rotate(${coin.animFrame * 3}deg)`,
                }}
              >
                🪙
              </div>
            )
        )}

        {/* Enemies */}
        {enemies.map((enemy) => (
          <div
            key={enemy.id}
            className="enemy"
            style={{
              left: enemy.x,
              top: enemy.y,
              transform: `scaleX(${enemy.vx > 0 ? 1 : -1})`,
            }}
          >
            👾
          </div>
        ))}

        {/* Player */}
        <div
          className={`player ${player.facing} ${
            player.onGround ? "grounded" : "jumping"
          }`}
          style={{
            left: player.x,
            top: player.y,
            transform: `scaleX(${player.facing === "left" ? -1 : 1})`,
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
            <button onClick={resetGame} className="restart-btn">
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
