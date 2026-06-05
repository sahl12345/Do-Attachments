import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

const COLORS = [
  "#C9A84C", "#E94560", "#C9A84C", "#EAEAEA",
  "#F39C12", "#C9A84C", "#E94560", "#2ECC71",
  "#C9A84C", "#E94560", "#C9A84C", "#F39C12",
  "#EAEAEA", "#C9A84C", "#E94560", "#2ECC71",
  "#C9A84C", "#E94560", "#F39C12", "#EAEAEA",
  "#C9A84C", "#E94560", "#C9A84C", "#F39C12",
];

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
  shape: "rect" | "circle";
}

export function ConfettiBurst({ active }: { active: boolean }) {
  const particles = useRef<Particle[]>(
    COLORS.map((color, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      color,
      size: 8 + (i % 5) * 3,
      shape: i % 3 === 0 ? "circle" : "rect",
    }))
  ).current;

  useEffect(() => {
    if (!active) return;

    particles.forEach((p, i) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.rotate.setValue(0);
      p.opacity.setValue(1);
      p.scale.setValue(0);
    });

    const angle = (i: number) => (i / particles.length) * Math.PI * 2;
    const spread = (i: number) => 120 + (i % 4) * 60;

    const anims = particles.map((p, i) => {
      const a = angle(i) + (Math.random() - 0.5) * 0.8;
      const r = spread(i) + Math.random() * 80;
      const tx = Math.cos(a) * r;
      const ty = Math.sin(a) * r - 80;

      return Animated.sequence([
        Animated.delay(i * 18),
        Animated.parallel([
          Animated.spring(p.scale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 6,
            stiffness: 300,
          }),
          Animated.timing(p.x, {
            toValue: tx,
            duration: 900 + i * 10,
            useNativeDriver: true,
          }),
          Animated.timing(p.y, {
            toValue: ty,
            duration: 900 + i * 10,
            useNativeDriver: true,
          }),
          Animated.timing(p.rotate, {
            toValue: 4 + Math.random() * 8,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(600),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]);
    });

    Animated.parallel(anims).start();
  }, [active, particles]);

  if (!active) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <View style={styles.center}>
        {particles.map((p, i) => {
          const rotateStr = p.rotate.interpolate({
            inputRange: [0, 8],
            outputRange: ["0deg", "720deg"],
          });
          return (
            <Animated.View
              key={i}
              style={[
                p.shape === "circle" ? styles.circle : styles.rect,
                {
                  width: p.size,
                  height: p.shape === "rect" ? p.size * 0.45 : p.size,
                  backgroundColor: p.color,
                  opacity: p.opacity,
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                    { rotate: rotateStr },
                    { scale: p.scale },
                  ],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    top: "40%",
    left: "50%",
    alignItems: "center",
    justifyContent: "center",
  },
  rect: {
    borderRadius: 2,
    position: "absolute",
  },
  circle: {
    borderRadius: 100,
    position: "absolute",
  },
});
