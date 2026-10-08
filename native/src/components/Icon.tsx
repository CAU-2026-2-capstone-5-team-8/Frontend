import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme/tokens";

export type IconName =
  | "shelf"
  | "account"
  | "book"
  | "map"
  | "sparkles"
  | "arrow"
  | "chevron-down"
  | "info"
  | "contrast"
  | "check";
export function Icon({
  name,
  size = 22,
  color = colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {name === "shelf" && (
        <>
          <Path d="M3 21h18M5 4h4v14H5zM12 4h3v14h-3zM17 5l3-1 3 13-3 1z" />
        </>
      )}
      {name === "account" && (
        <>
          <Circle cx={12} cy={8} r={4} />
          <Path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </>
      )}
      {name === "book" && (
        <>
          <Path d="M12 5.5C9 3.5 5.3 3.7 3 4.5v14c2.4-.8 6-.7 9 1.3 3-2 6.6-2.1 9-1.3v-14c-2.3-.8-6-1-9 1Z" />
          <Path d="M12 5.5v14.3M6 8h3M6 11h3M15 8h3M15 11h3" />
        </>
      )}
      {name === "map" && (
        <>
          <Path d="M7 7.5 10 11M14 13l3 3M7 17l3-4M14 11l3-4" />
          <Circle cx={5} cy={5} r={2.5} />
          <Circle cx={12} cy={12} r={3} />
          <Circle cx={19} cy={5} r={2.5} />
          <Circle cx={5} cy={19} r={2.5} />
          <Circle cx={19} cy={19} r={2.5} />
        </>
      )}
      {name === "sparkles" && (
        <>
          <Path d="m13 3 2.4 6.6L22 12l-6.6 2.4L13 21l-2.4-6.6L4 12l6.6-2.4L13 3ZM5 2v5M2.5 4.5h5M4 18v4M2 20h4" />
        </>
      )}
      {name === "arrow" && <Path d="M5 12h14m-6-6 6 6-6 6" />}
      {name === "chevron-down" && <Path d="m6 9 6 6 6-6" />}
      {name === "info" && (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 11v5M12 7.5v.2" />
        </>
      )}
      {name === "contrast" && (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 3a9 9 0 0 1 0 18V3Z" fill={color} />
        </>
      )}
      {name === "check" && (
        <>
          <Rect x={3} y={3} width={18} height={18} rx={6} />
          <Path d="m7 12 3 3 7-7" />
        </>
      )}
    </Svg>
  );
}
