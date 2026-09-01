import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Luxury celebration color palette
const CONFETTI_COLORS = [
  '#DEA430', // Luxury Gold
  '#FFD700', // Sparkle Gold
  '#F59E0B', // Warm Amber
  '#10B981', // Emerald
  '#F43F5E', // Rose Coral
  '#38BDF8', // Cyan
  '#A855F7', // Royal Purple
  '#FFFFFF', // Starlight White
  '#FBBF24', // Sunbeam Yellow
  '#EC4899', // Hot Pink
];

interface ConfettiPiece {
  id: number;
  color: string;
  width: number;
  height: number;
  borderRadius: number;
  isDiamond: boolean;
  startX: number;
  startY: number;
  blastX: number;
  blastY: number;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
  anim: Animated.Value;
  spinAnim: Animated.Value;
  flipAnim: Animated.Value;
  delay: number;
  duration: number;
}

export const CelebrationPoppers: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }

    const COUNT = 85;
    const generated: ConfettiPiece[] = [];

    // Modal Card half dimensions (spawn origin is the back edge perimeter of the modal card)
    const CARD_HALF_W = Math.min(160, (SCREEN_WIDTH * 0.85) / 2);
    const CARD_HALF_H = 125;

    for (let i = 0; i < COUNT; i++) {
      // 4 perimeter sides: Top (40%), Left (25%), Right (25%), Bottom/Corners (10%)
      const side = i % 10;
      let startX = 0;
      let startY = 0;
      let angle = 0;

      if (side < 4) {
        // TOP EDGE: Shoots upwards & expands (-155° to -25°)
        startX = (Math.random() * 2 - 1) * CARD_HALF_W * 0.95;
        startY = -CARD_HALF_H - Math.random() * 6;
        angle = (-155 + Math.random() * 130) * (Math.PI / 180);
      } else if (side < 6.5) {
        // LEFT EDGE: Shoots leftwards & upwards
        startX = -CARD_HALF_W - Math.random() * 6;
        startY = (Math.random() * 2 - 1) * CARD_HALF_H * 0.9;
        angle = (-175 + Math.random() * 70) * (Math.PI / 180);
      } else if (side < 9) {
        // RIGHT EDGE: Shoots rightwards & upwards
        startX = CARD_HALF_W + Math.random() * 6;
        startY = (Math.random() * 2 - 1) * CARD_HALF_H * 0.9;
        angle = (-75 + Math.random() * 70) * (Math.PI / 180);
      } else {
        // CORNER / BOTTOM: Shoots downwards & outward
        startX = (Math.random() * 2 - 1) * CARD_HALF_W;
        startY = CARD_HALF_H + Math.random() * 6;
        angle = (35 + Math.random() * 110) * (Math.PI / 180);
      }

      // Distance the piece shoots OUTWARD away from the modal edge
      const blastDist = Math.random() * 150 + 85;
      const blastX = startX + Math.cos(angle) * blastDist;
      const blastY = startY + Math.sin(angle) * blastDist;

      // Mid-flight apex drift (swaying smoothly in the air)
      const midSway = (Math.random() - 0.5) * 40;
      const midX = blastX + midSway;
      const midY = blastY + Math.random() * 30 + 10;

      // Final resting position (slow gentle downward drift)
      const finalSway = (Math.random() - 0.5) * 60;
      const endX = blastX + finalSway;
      const endY = blastY + (Math.random() * 220 + 150);

      // Shapes: Ribbons, Flakes, Dots, Diamonds
      const shapeType = Math.random();
      let width = 7;
      let height = 7;
      let borderRadius = 2;
      let isDiamond = false;

      if (shapeType < 0.35) {
        // Ribbon streamer
        width = Math.random() * 3 + 4;
        height = Math.random() * 10 + 11;
        borderRadius = 2;
      } else if (shapeType < 0.65) {
        // Confetti flake / square
        width = Math.random() * 4 + 6;
        height = Math.random() * 4 + 6;
        borderRadius = 1.5;
        isDiamond = Math.random() > 0.5;
      } else if (shapeType < 0.9) {
        // Round dot
        width = Math.random() * 4 + 5;
        height = width;
        borderRadius = width / 2;
      } else {
        // Sparkle diamond
        width = 6;
        height = 6;
        borderRadius = 0;
        isDiamond = true;
      }

      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      // Staggered launch delays for smooth, cascading wave
      const delay = Math.random() * 300;
      const duration = 5000 + Math.random() * 1000; // 5.0s to 6.0s total

      generated.push({
        id: i,
        color,
        width,
        height,
        borderRadius,
        isDiamond,
        startX,
        startY,
        blastX,
        blastY,
        midX,
        midY,
        endX,
        endY,
        anim: new Animated.Value(0),
        spinAnim: new Animated.Value(0),
        flipAnim: new Animated.Value(0),
        delay,
        duration,
      });
    }

    setPieces(generated);

    // Run parallel physics animations with a gentle, smooth acceleration curve
    const animations = generated.map((p) => {
      return Animated.parallel([
        // Main trajectory: Smooth, gentle outward bloom -> Apex hover -> Slow gentle float down
        Animated.timing(p.anim, {
          toValue: 1,
          duration: p.duration,
          delay: p.delay,
          easing: Easing.bezier(0.2, 0.7, 0.3, 1),
          useNativeDriver: true,
        }),
        // Spin rotation (Smooth, continuous 3D tumbling in Z plane)
        Animated.timing(p.spinAnim, {
          toValue: Math.random() > 0.5 ? 1 : -1,
          duration: p.duration * 0.9,
          delay: p.delay,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        // 3D Flip (Smooth tumbling over X axis)
        Animated.timing(p.flipAnim, {
          toValue: Math.random() > 0.5 ? 1 : -1,
          duration: p.duration * 0.65,
          delay: p.delay,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(5, animations).start();
  }, [active]);

  if (!active || pieces.length === 0) return null;

  return (
    <View style={styles.behindContainer} pointerEvents="none">
      {pieces.map((p) => {
        // Smooth progressive expansion from behind the modal:
        // 0.0 -> 0.36: Smooth, gradual blossoming outward from behind the modal (takes ~1.8s!)
        // 0.36 -> 0.65: Extended apex suspension in mid-air
        // 0.65 -> 1.0: Gentle floating gravity fall
        const translateX = p.anim.interpolate({
          inputRange: [0, 0.36, 0.65, 0.85, 1],
          outputRange: [
            p.startX,
            p.blastX,
            p.midX,
            p.blastX + (p.endX - p.blastX) * 0.75,
            p.endX,
          ],
        });

        const translateY = p.anim.interpolate({
          inputRange: [0, 0.34, 0.62, 0.82, 1],
          outputRange: [
            p.startY,
            p.blastY,
            p.midY,
            p.blastY + (p.endY - p.blastY) * 0.7,
            p.endY,
          ],
        });

        // Scale: Smoothly blooms as it emerges from behind the modal edge
        const scale = p.anim.interpolate({
          inputRange: [0, 0.12, 0.35, 0.85, 1],
          outputRange: [0.2, 0.85, 1.0, 0.95, 0],
        });

        // Opacity: Smooth fade-in as it appears, remains vibrant, gentle fade-out at the end
        const opacity = p.anim.interpolate({
          inputRange: [0, 0.08, 0.8, 1],
          outputRange: [0, 1, 0.95, 0],
        });

        // Slow, hypnotic 3D rotations
        const rotateZ = p.spinAnim.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: ['-540deg', '0deg', '540deg'],
        });

        const rotateX = p.flipAnim.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: ['-360deg', '0deg', '360deg'],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                width: p.width,
                height: p.height,
                backgroundColor: p.color,
                borderRadius: p.borderRadius,
                opacity,
                transform: [
                  { translateX },
                  { translateY },
                  { scale },
                  { rotateZ },
                  { rotateX },
                  ...(p.isDiamond ? [{ rotate: '45deg' }] : []),
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  behindContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // Strictly behind the modal card
    elevation: 1,
  },
  particle: {
    position: 'absolute',
    elevation: 0, // Zero Android elevation so it never overlaps modal card
  },
});
