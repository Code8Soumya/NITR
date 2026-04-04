import { useRef } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from "react-native";

type AnimatedPressableProps = PressableProps & {
  scaleTo?: number;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AnimatedPressable({
  scaleTo = 0.97,
  containerStyle,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn: PressableProps["onPressIn"] = (event) => {
    Animated.spring(scale, {
      toValue: scaleTo,
      speed: 42,
      bounciness: 0,
      useNativeDriver: true
    }).start();

    onPressIn?.(event);
  };

  const handlePressOut: PressableProps["onPressOut"] = (event) => {
    Animated.spring(scale, {
      toValue: 1,
      speed: 42,
      bounciness: 0,
      useNativeDriver: true
    }).start();

    onPressOut?.(event);
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, containerStyle]}>
      <Pressable {...rest} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
