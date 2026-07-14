import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHIP_WIDTH = 60;
const SHIP_HEIGHT = 40;
const SHIP_BOTTOM_OFFSET = 120;
const MOVE_STEP = 30;
const ASTEROID_SIZE = 44;
const FALL_SPEED = 5;
const GAME_TICK_MS = 30;
const HIGH_SCORE_KEY = 'SPACE_ESCAPE_HIGH_SCORE';

function getRandomX() {
  return Math.floor(Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE));
}

function getInitialShipX() {
  return SCREEN_WIDTH / 2 - SHIP_WIDTH / 2;
}

export default function App() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [shipX, setShipX] = useState(getInitialShipX());
  const [asteroidX, setAsteroidX] = useState(getRandomX());
  const [asteroidY, setAsteroidY] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const gameLoopRef = useRef(null);

  // Animated values for smooth motion
  const shipAnim = useRef(new Animated.Value(getInitialShipX())).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const flameAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadHighScore();

    // Spinning asteroid, forever
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Flickering thruster flame, forever
    Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, { toValue: 1.4, duration: 220, useNativeDriver: true }),
        Animated.timing(flameAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Smoothly slide the ship to its new X position whenever it changes
  useEffect(() => {
    Animated.timing(shipAnim, {
      toValue: shipX,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [shipX]);

  const loadHighScore = async () => {
    try {
      const savedValue = await AsyncStorage.getItem(HIGH_SCORE_KEY);
      if (savedValue !== null) setHighScore(parseInt(savedValue, 10));
    } catch (error) {
      console.log('Failed to load high score:', error);
    }
  };

  const saveHighScore = async (newHighScore) => {
    try {
      await AsyncStorage.setItem(HIGH_SCORE_KEY, newHighScore.toString());
    } catch (error) {
      console.log('Failed to save high score:', error);
    }
  };

  const handleStartGame = () => {
    setScore(0);
    setShipX(getInitialShipX());
    setAsteroidY(0);
    setAsteroidX(getRandomX());
    setIsGameOver(false);
    setIsPlaying(true);
  };

  const moveLeft = () => {
    setShipX((prevX) => Math.max(0, prevX - MOVE_STEP));
  };

  const moveRight = () => {
    setShipX((prevX) => Math.min(SCREEN_WIDTH - SHIP_WIDTH, prevX + MOVE_STEP));
  };

  useEffect(() => {
    if (!isPlaying) return;

    gameLoopRef.current = setInterval(() => {
      setAsteroidY((prevY) => {
        const shipTopY = SCREEN_HEIGHT - SHIP_BOTTOM_OFFSET - SHIP_HEIGHT;

        const asteroidBottom = prevY + ASTEROID_SIZE;
        const asteroidLeft = asteroidX;
        const asteroidRight = asteroidX + ASTEROID_SIZE;

        const shipLeft = shipX;
        const shipRight = shipX + SHIP_WIDTH;
        const shipTop = shipTopY;
        const shipBottom = shipTopY + SHIP_HEIGHT;

        const isOverlappingX = asteroidRight > shipLeft && asteroidLeft < shipRight;
        const isOverlappingY = asteroidBottom > shipTop && prevY < shipBottom;

        if (isOverlappingX && isOverlappingY) {
          clearInterval(gameLoopRef.current);
          setIsPlaying(false);
          setIsGameOver(true);

          setScore((currentScore) => {
            setHighScore((prevHigh) => {
              if (currentScore > prevHigh) {
                saveHighScore(currentScore);
                return currentScore;
              }
              return prevHigh;
            });
            return currentScore;
          });

          return prevY;
        }

        const nextY = prevY + FALL_SPEED;

        if (nextY > SCREEN_HEIGHT) {
          setScore((prevScore) => prevScore + 1);
          setAsteroidX(getRandomX());
          return 0;
        }

        return nextY;
      });
    }, GAME_TICK_MS);

    return () => clearInterval(gameLoopRef.current);
  }, [isPlaying, shipX, asteroidX]);

  const rotateDeg = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient colors={['#0B0C2A', '#1B1D4D', '#2D1B4E']} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Decorative stars */}
      <View style={[styles.star, { top: 60, left: 40 }]} />
      <View style={[styles.star, { top: 100, left: 300 }]} />
      <View style={[styles.star, { top: 180, left: 90 }]} />
      <View style={[styles.star, { top: 220, left: 260 }]} />
      <View style={[styles.star, { top: 40, left: 200 }]} />

      <Text style={styles.title}>Space Escape Runner</Text>

      <View style={styles.scoreRow}>
        <LinearGradient colors={['#1B1D4D', '#232764']} style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </LinearGradient>

        <LinearGradient colors={['#1B1D4D', '#232764']} style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>High Score</Text>
          <Text style={styles.highScoreValue}>{highScore}</Text>
        </LinearGradient>
      </View>

      {!isPlaying && !isGameOver && (
        <TouchableOpacity onPress={handleStartGame}>
          <LinearGradient colors={['#7B61FF', '#5D5FEF']} style={styles.startButton}>
            <Text style={styles.startButtonText}>Start Game</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {isGameOver && (
        <LinearGradient colors={['#1B1D4D', '#2D1B4E']} style={styles.gameOverBox}>
          <Text style={styles.gameOverText}>💥 Game Over</Text>
          <Text style={styles.finalScoreText}>Final Score: {score}</Text>
          <TouchableOpacity onPress={handleStartGame}>
            <LinearGradient colors={['#7B61FF', '#5D5FEF']} style={styles.startButton}>
              <Text style={styles.startButtonText}>Restart Game</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      )}

      {/* Asteroid */}
      {isPlaying && (
        <View style={[styles.asteroidWrapper, { left: asteroidX, top: asteroidY }]}>
          <Animated.View style={{ transform: [{ rotate: rotateDeg }] }}>
            <LinearGradient colors={['#A67C52', '#5C3E28']} style={styles.asteroid}>
              <View style={[styles.crater, { top: 6, left: 8, width: 8, height: 8 }]} />
              <View style={[styles.crater, { top: 20, left: 22, width: 6, height: 6 }]} />
              <View style={[styles.crater, { top: 28, left: 10, width: 5, height: 5 }]} />
            </LinearGradient>
          </Animated.View>
        </View>
      )}

      {/* Spaceship */}
      <Animated.View style={[styles.shipWrapper, { left: shipAnim }]}>
        {/* Wings */}
        <View style={styles.wingLeft} />
        <View style={styles.wingRight} />

        {/* Body */}
        <LinearGradient colors={['#7DF9FF', '#00D9FF']} style={styles.shipBody}>
          <View style={styles.cockpit} />
        </LinearGradient>

        {/* Nose cone */}
        <View style={styles.noseCone} />

        {/* Thruster flame */}
        <Animated.View style={[styles.flame, { transform: [{ scale: flameAnim }] }]} />
      </Animated.View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={moveLeft}>
          <Text style={styles.controlButtonText}>◀ Left</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={moveRight}>
          <Text style={styles.controlButtonText}>Right ▶</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.6,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 26,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  scoreBox: {
    paddingVertical: 16,
    paddingHorizontal: 26,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(93,95,239,0.4)',
  },
  scoreLabel: {
    color: '#A0A3D8',
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    color: '#FFD700',
    fontSize: 34,
    fontWeight: 'bold',
  },
  highScoreValue: {
    color: '#00D9FF',
    fontSize: 34,
    fontWeight: 'bold',
  },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 30,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  gameOverBox: {
    alignItems: 'center',
    padding: 26,
    borderRadius: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,92,92,0.3)',
  },
  gameOverText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FF5C5C',
    marginBottom: 8,
  },
  finalScoreText: {
    fontSize: 17,
    color: '#FFFFFF',
    marginBottom: 18,
  },

  // Asteroid
  asteroidWrapper: {
    position: 'absolute',
  },
  asteroid: {
    width: ASTEROID_SIZE,
    height: ASTEROID_SIZE,
    borderRadius: ASTEROID_SIZE / 2,
    borderWidth: 2,
    borderColor: '#3E2A1A',
    overflow: 'hidden',
  },
  crater: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // Spaceship
  shipWrapper: {
    position: 'absolute',
    bottom: SHIP_BOTTOM_OFFSET,
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT + 20,
    alignItems: 'center',
  },
  shipBody: {
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noseCone: {
    position: 'absolute',
    top: -14,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#00D9FF',
  },
  wingLeft: {
    position: 'absolute',
    bottom: 4,
    left: -12,
    width: 0,
    height: 0,
    borderTopWidth: 18,
    borderRightWidth: 16,
    borderTopColor: 'transparent',
    borderRightColor: '#3F8FD1',
  },
  wingRight: {
    position: 'absolute',
    bottom: 4,
    right: -12,
    width: 0,
    height: 0,
    borderTopWidth: 18,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderLeftColor: '#3F8FD1',
  },
  cockpit: {
    width: 16,
    height: 16,
    backgroundColor: '#0B0C2A',
    borderRadius: 8,
  },
  flame: {
    width: 14,
    height: 20,
    backgroundColor: '#FF9F45',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    marginTop: -4,
  },

  controls: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '85%',
  },
  controlButton: {
    backgroundColor: 'rgba(27,29,77,0.85)',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#5D5FEF',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
