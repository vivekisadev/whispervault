"use client";

import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";

// Types
export type AnimationVariant =
  | "circle"
  | "rectangle"
  | "gif"
  | "polygon"
  | "circle-blur";

export type AnimationStart =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"
  | "top-center"
  | "bottom-center"
  | "bottom-up"
  | "top-down"
  | "left-right"
  | "right-left";

interface Animation {
  name: string;
  css: string;
}

// Helper functions for animation generation
const getPositionCoords = (position: AnimationStart) => {
  switch (position) {
    case "top-left":
      return { cx: "0", cy: "0" };
    case "top-right":
      return { cx: "40", cy: "0" };
    case "bottom-left":
      return { cx: "0", cy: "40" };
    case "bottom-right":
      return { cx: "40", cy: "40" };
    case "top-center":
      return { cx: "20", cy: "0" };
    case "bottom-center":
      return { cx: "20", cy: "40" };
    case "bottom-up":
    case "top-down":
    case "left-right":
    case "right-left":
      return { cx: "20", cy: "20" };
  }
};

const generateSVG = (variant: AnimationVariant, start: AnimationStart) => {
  let svgString = "";
  if (variant === "circle-blur") {
    if (start === "center") {
      svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter></defs><circle cx="20" cy="20" r="18" fill="white" filter="url(#blur)"/></svg>`;
    } else {
      const positionCoords = getPositionCoords(start);
      if (!positionCoords) {
        throw new Error(`Invalid start position: ${start}`);
      }
      const { cx, cy } = positionCoords;
      svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter></defs><circle cx="${cx}" cy="${cy}" r="18" fill="white" filter="url(#blur)"/></svg>`;
    }
  } else if (start !== "center" && variant !== "rectangle") {
    const positionCoords = getPositionCoords(start);
    if (!positionCoords) {
      throw new Error(`Invalid start position: ${start}`);
    }
    const { cx, cy } = positionCoords;

    if (variant === "circle") {
      svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="${cx}" cy="${cy}" r="20" fill="white"/></svg>`;
    }
  }

  if (!svgString) return "";
  return `data:image/svg+xml,${encodeURIComponent(svgString)}`;
};

const getTransformOrigin = (start: AnimationStart) => {
  switch (start) {
    case "top-left":
      return "top left";
    case "top-right":
      return "top right";
    case "bottom-left":
      return "bottom left";
    case "bottom-right":
      return "bottom right";
    case "top-center":
      return "top center";
    case "bottom-center":
      return "bottom center";
    case "bottom-up":
    case "top-down":
    case "left-right":
    case "right-left":
      return "center";
  }
};

const createAnimation = (
  variant: AnimationVariant,
  start: AnimationStart = "center",
  blur = false,
  url?: string,
): Animation => {
  const svg = generateSVG(variant, start);
  const transformOrigin = getTransformOrigin(start);

  if (variant === "rectangle") {
    const getClipPath = (direction: AnimationStart) => {
      switch (direction) {
        case "bottom-up":
          return {
            from: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
            to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          };
        case "top-down":
          return {
            from: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
            to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          };
        case "left-right":
          return {
            from: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
            to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          };
        case "right-left":
          return {
            from: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)",
            to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          };
        case "top-left":
          return {
            from: "polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)",
            to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          };
        case "top-right":
          return {
            from: "polygon(100% 0%, 100% 0%, 100% 0%, 100% 0%)",
            to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          };
        case "bottom-left":
          return {
            from: "polygon(0% 100%, 0% 100%, 0% 100%, 0% 100%)",
            to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          };
        case "bottom-right":
          return {
            from: "polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)",
            to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          };
        default:
          return {
            from: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
            to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          };
      }
    };

    const clipPath = getClipPath(start);

    return {
      name: `${variant}-${start}${blur ? "-blur" : ""}`,
      css: `
       ::view-transition-group(root) {
        animation-duration: 0.5s;
        animation-timing-function: var(--expo-out);
      }
      @media (min-width: 768px) {
        ::view-transition-group(root) {
          animation-duration: 1s;
        }
      }
            
      ::view-transition-new(root) {
        animation-name: reveal-light-${start}${blur ? "-blur" : ""};
      }

      ::view-transition-old(root),
      .dark::view-transition-old(root) {
        animation: none;
        z-index: -1;
      }
      .dark::view-transition-new(root) {
        animation-name: reveal-dark-${start}${blur ? "-blur" : ""};
        ${blur ? "filter: blur(2px);" : ""}
      }

      @keyframes reveal-dark-${start}${blur ? "-blur" : ""} {
        from {
          clip-path: ${clipPath.from};
        }
        to {
          clip-path: ${clipPath.to};
        }
      }

      @keyframes reveal-light-${start}${blur ? "-blur" : ""} {
        from {
          clip-path: ${clipPath.from};
        }
        to {
          clip-path: ${clipPath.to};
        }
      }
      `,
    };
  }
  if (variant === "circle" && start == "center") {
    return {
      name: `${variant}-${start}${blur ? "-blur" : ""}`,
      css: `
       ::view-transition-group(root) {
        animation-duration: 0.5s;
        animation-timing-function: var(--expo-out);
      }
            
      ::view-transition-new(root) {
        animation-name: reveal-light${blur ? "-blur" : ""};
        ${blur ? "filter: blur(2px);" : ""}
      }

      ::view-transition-old(root),
      .dark::view-transition-old(root) {
        animation: none;
        z-index: -1;
      }
      .dark::view-transition-new(root) {
        animation-name: reveal-dark${blur ? "-blur" : ""};
        ${blur ? "filter: blur(2px);" : ""}
      }

      @keyframes reveal-dark${blur ? "-blur" : ""} {
        from {
          clip-path: circle(0% at 50% 50%);
        }
        to {
          clip-path: circle(100.0% at 50% 50%);
        }
      }

      @keyframes reveal-light${blur ? "-blur" : ""} {
        from {
           clip-path: circle(0% at 50% 50%);
        }
        to {
          clip-path: circle(100.0% at 50% 50%);
        }
      }
      `,
    };
  }
  if (variant === "gif") {
    return {
      name: `${variant}-${start}`,
      css: `
      ::view-transition-group(root) {
  animation-timing-function: var(--expo-in);
}

::view-transition-new(root) {
  mask: url('${url}') center / 0 no-repeat;
  animation: scale 3s;
}

::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: scale 3s;
}

@keyframes scale {
  0% {
    mask-size: 0;
  }
  10% {
    mask-size: 50vmax;
  }
  90% {
    mask-size: 50vmax;
  }
  100% {
    mask-size: 2000vmax;
  }
}`,
    };
  }

  if (variant === "circle-blur") {
    // Helper for clip-path positions
    const getClipPathPosition = (position: AnimationStart) => {
      switch (position) {
        case "top-left": return "0% 0%";
        case "top-right": return "100% 0%";
        case "bottom-left": return "0% 100%";
        case "bottom-right": return "100% 100%";
        case "top-center": return "50% 0%";
        case "bottom-center": return "50% 100%";
        case "center": return "50% 50%";
        default: return "50% 50%";
      }
    };

    const clipPos = getClipPathPosition(start);

    if (start === "center") {
      return {
        name: `${variant}-${start}`,
        css: `
        /* Mobile - Fast & Clip Path (Performance Optimized) */
        ::view-transition-group(root) {
          animation-duration: 0.4s;
          animation-timing-function: ease-out;
        }

        ::view-transition-new(root) {
          animation: reveal-mobile-center 0.4s forwards;
        }

        ::view-transition-old(root),
        .dark::view-transition-old(root) {
          animation: none;
          z-index: -1;
        }

        @keyframes reveal-mobile-center {
          from { clip-path: circle(0% at 50% 50%); }
          to { clip-path: circle(150% at 50% 50%); }
        }

        /* Desktop - Slower & With Blur & Mask (Premium Feel) */
        @media (min-width: 768px) {
          ::view-transition-group(root) {
            animation-duration: 1s;
            animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1);
          }

          ::view-transition-new(root) {
            mask: url('${svg}') center / 0 no-repeat;
            mask-origin: content-box;
            animation: scale-desktop 1s forwards;
            filter: blur(2px);
            clip-path: none;
          }

          ::view-transition-old(root),
          .dark::view-transition-old(root) {
            transform-origin: center;
          }

          @keyframes scale-desktop {
            from { filter: blur(8px); mask-size: 0; }
            50% { filter: blur(4px); }
            to { mask-size: 350vmax; filter: none; }
          }
        }
        `,
      };
    }

    return {
      name: `${variant}-${start}${blur ? "-blur" : ""}`,
      css: `
      /* Mobile - Fast & Clip Path (Performance Optimized) */
      ::view-transition-group(root) {
        animation-duration: 0.4s;
        animation-timing-function: ease-out;
      }

      ::view-transition-new(root) {
        animation: reveal-mobile-${start} 0.4s forwards;
      }

      ::view-transition-old(root),
      .dark::view-transition-old(root) {
        animation: none;
        z-index: -1;
      }

      @keyframes reveal-mobile-${start} {
        from { clip-path: circle(0% at ${clipPos}); }
        to { clip-path: circle(150% at ${clipPos}); }
      }

      /* Desktop - Slower & With Blur & Mask */
      @media (min-width: 768px) {
        ::view-transition-group(root) {
          animation-duration: 1s;
          animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1);
        }

        ::view-transition-new(root) {
          mask: url('${svg}') ${start.replace("-", " ")} / 0 no-repeat;
          mask-origin: content-box;
          animation: scale-${start}${blur ? "-blur" : ""}-desktop 1s forwards;
          ${blur ? "filter: blur(2px);" : ""}
          transform-origin: ${transformOrigin};
          will-change: mask-size;
          clip-path: none;
        }

        ::view-transition-old(root),
        .dark::view-transition-old(root) {
          animation: none;
          transform-origin: ${transformOrigin};
        }

        @keyframes scale-${start}${blur ? "-blur" : ""}-desktop {
          from {
            mask-size: 0;
            ${blur ? "filter: blur(8px);" : ""}
          }
          ${blur ? "50% { filter: blur(4px); }" : ""}
          to {
            mask-size: 2000vmax;
            ${blur ? "filter: none;" : ""}
          }
        }
      }
      `,
    };
  }

  if (variant === "polygon") {
    const getPolygonClipPaths = (position: AnimationStart) => {
      switch (position) {
        case "top-left":
          return {
            darkFrom: "polygon(50% -71%, -50% 71%, -50% 71%, 50% -71%)",
            darkTo: "polygon(50% -71%, -50% 71%, 50% 171%, 171% 50%)",
            lightFrom: "polygon(171% 50%, 50% 171%, 50% 171%, 171% 50%)",
            lightTo: "polygon(171% 50%, 50% 171%, -50% 71%, 50% -71%)",
          };
        case "top-right":
          return {
            darkFrom: "polygon(150% -71%, 250% 71%, 250% 71%, 150% -71%)",
            darkTo: "polygon(150% -71%, 250% 71%, 50% 171%, -71% 50%)",
            lightFrom: "polygon(-71% 50%, 50% 171%, 50% 171%, -71% 50%)",
            lightTo: "polygon(-71% 50%, 50% 171%, 250% 71%, 150% -71%)",
          };
        default:
          return {
            darkFrom: "polygon(50% -71%, -50% 71%, -50% 71%, 50% -71%)",
            darkTo: "polygon(50% -71%, -50% 71%, 50% 171%, 171% 50%)",
            lightFrom: "polygon(171% 50%, 50% 171%, 50% 171%, 171% 50%)",
            lightTo: "polygon(171% 50%, 50% 171%, -50% 71%, 50% -71%)",
          };
      }
    };

    const clipPaths = getPolygonClipPaths(start);

    return {
      name: `${variant}-${start}${blur ? "-blur" : ""}`,
      css: `
      ::view-transition-group(root) {
        animation-duration: 0.7s;
        animation-timing-function: var(--expo-out);
      }
            
      ::view-transition-new(root) {
        animation-name: reveal-light-${start}${blur ? "-blur" : ""};
      }

      ::view-transition-old(root),
      .dark::view-transition-old(root) {
        animation: none;
        z-index: -1;
      }
      .dark::view-transition-new(root) {
        animation-name: reveal-dark-${start}${blur ? "-blur" : ""};
        ${blur ? "filter: blur(2px);" : ""}
      }

      @keyframes reveal-dark-${start}${blur ? "-blur" : ""} {
        from {
          clip-path: ${clipPaths.darkFrom};
        }
        to {
          clip-path: ${clipPaths.darkTo};
        }
      }

      @keyframes reveal-light-${start}${blur ? "-blur" : ""} {
        from {
          clip-path: ${clipPaths.lightFrom};
        }
        to {
          clip-path: ${clipPaths.lightTo};
        }
      }
      `,
    };
  }

  if (variant === "circle" && start !== "center") {
    const getClipPathPosition = (position: AnimationStart) => {
      switch (position) {
        case "top-left":
          return "0% 0%";
        case "top-right":
          return "100% 0%";
        case "bottom-left":
          return "0% 100%";
        case "bottom-right":
          return "100% 100%";
        case "top-center":
          return "50% 0%";
        case "bottom-center":
          return "50% 100%";
        default:
          return "50% 50%";
      }
    };

    const clipPosition = getClipPathPosition(start);

    return {
      name: `${variant}-${start}${blur ? "-blur" : ""}`,
      css: `
       ::view-transition-group(root) {
        animation-duration: 0.5s;
        animation-timing-function: var(--expo-out);
      }
            
      ::view-transition-new(root) {
        animation-name: reveal-light-${start}${blur ? "-blur" : ""};
        ${blur ? "filter: blur(2px);" : ""}
      }

      ::view-transition-old(root),
      .dark::view-transition-old(root) {
        animation: none;
        z-index: -1;
      }
      .dark::view-transition-new(root) {
        animation-name: reveal-dark-${start}${blur ? "-blur" : ""};
        ${blur ? "filter: blur(2px);" : ""}
      }

      @keyframes reveal-dark-${start}${blur ? "-blur" : ""} {
        from {
          clip-path: circle(0% at ${clipPosition});
        }
        to {
          clip-path: circle(150.0% at ${clipPosition});
        }
      }

      @keyframes reveal-light-${start}${blur ? "-blur" : ""} {
        from {
           clip-path: circle(0% at ${clipPosition});
        }
        to {
          clip-path: circle(150.0% at ${clipPosition});
        }
      }
      `,
    };
  }

  return {
    name: `${variant}-${start}${blur ? "-blur" : ""}`,
    css: `
      ::view-transition-group(root) {
        animation-timing-function: var(--expo-in);
      }
      ::view-transition-new(root) {
        mask: url('${svg}') ${start.replace("-", " ")} / 0 no-repeat;
        mask-origin: content-box;
        animation: scale-${start}${blur ? "-blur" : ""} 0.5s;
        transform-origin: ${transformOrigin};
        will-change: mask-size;
      }
      ::view-transition-old(root),
      .dark::view-transition-old(root) {
        animation: scale-${start}${blur ? "-blur" : ""} 0.5s;
        transform-origin: ${transformOrigin};
        z-index: -1;
      }
      @keyframes scale-${start}${blur ? "-blur" : ""} {
        to {
          mask-size: 2000vmax;
        }
      }
    `,
  };
};

// Hook
const useThemeToggle = ({
  variant = "circle",
  start = "center",
  blur = false,
  gifUrl = "",
}: {
  variant?: AnimationVariant;
  start?: AnimationStart;
  blur?: boolean;
  gifUrl?: string;
} = {}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const styleId = "theme-transition-styles";

  const updateStyles = useCallback((css: string, name: string) => {
    if (typeof window === "undefined") return;

    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = css;
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = isDark ? "light" : "dark";
    // Optimistically update state
    setIsDark(!isDark);

    // Check for mobile or reduced motion preferences
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // If mobile or reduced motion, skip the heavy View Transition
    if (isMobile || shouldReduceMotion || !document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    const animation = createAnimation(variant, start, blur, gifUrl);
    updateStyles(animation.css, animation.name);

    document.startViewTransition(() => {
      // Manually update DOM for synchronous View Transition capture
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      // Sync next-themes state
      setTheme(newTheme);
    });
  }, [isDark, setTheme, variant, start, blur, gifUrl, updateStyles]);

  return {
    isDark,
    toggleTheme,
  };
};

// Component
export default function ThemeToggle({
  className = "",
  variant = "circle-blur",
  start = "top-right",
  blur = true,
  gifUrl = "",
}: {
  className?: string;
  variant?: AnimationVariant;
  start?: AnimationStart;
  blur?: boolean;
  gifUrl?: string;
}) {
  const { isDark, toggleTheme } = useThemeToggle({
    variant,
    start,
    blur,
    gifUrl,
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="size-10" />;

  return (
    <button
      type="button"
      className={cn(
        "size-10 cursor-pointer rounded-full bg-background/50 backdrop-blur-md border border-border shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 flex items-center justify-center overflow-hidden",
        className,
      )}
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <span className="sr-only">Toggle theme</span>
      <div className="relative size-full flex items-center justify-center">
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{
            scale: isDark ? 0 : 1,
            rotate: isDark ? -90 : 0,
            opacity: isDark ? 0 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <Sun className="size-6 text-orange-500 fill-orange-500" />
        </motion.div>
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{
            scale: isDark ? 1 : 0,
            rotate: isDark ? 0 : 90,
            opacity: isDark ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
        >
          <Moon className="size-6 text-blue-500 fill-blue-500" />
        </motion.div>
      </div>
    </button>
  );
}
