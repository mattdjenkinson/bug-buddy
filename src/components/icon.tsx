import * as React from "react";

type HexagonIconProps = React.SVGProps<SVGSVGElement>;

export function HexagonIconNegative(props: HexagonIconProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <polygon
        points="256,16 464,144 464,368 256,496 48,368 48,144"
        fill="currentColor"
      />
    </svg>
  );
}
