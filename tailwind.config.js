/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c0f14",
        pane: "#12171f",
        line: "#2a3444",
        mute: "#8b97a8",
        bone: "#d7dee8",
        cyanx: "#79d0cb",
        amberx: "#e0a45a",
        magx: "#e08ab4",
        goldx: "#e0b15a",
        okx: "#8fce78",
        dangerx: "#e36a58",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
