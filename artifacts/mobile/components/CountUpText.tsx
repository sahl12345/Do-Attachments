import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextStyle } from "react-native";

interface Props {
  value: number;
  style?: TextStyle | TextStyle[];
  duration?: number;
}

export function CountUpText({ value, style, duration = 600 }: Props) {
  const prevRef = useRef(value);
  const [displayed, setDisplayed] = useState(value);
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    prevRef.current = to;

    const diff = to - from;
    const steps = Math.min(Math.abs(diff), 20);
    const stepSize = diff / steps;
    const stepTime = duration / steps;

    let step = 0;
    const tick = () => {
      step += 1;
      if (step >= steps) {
        setDisplayed(to);
        return;
      }
      setDisplayed(Math.round(from + stepSize * step));
      frameRef.current = setTimeout(tick, stepTime);
    };

    if (frameRef.current) clearTimeout(frameRef.current);
    frameRef.current = setTimeout(tick, stepTime);

    return () => {
      if (frameRef.current) clearTimeout(frameRef.current);
    };
  }, [value, duration]);

  return <Text style={style}>{displayed}</Text>;
}
