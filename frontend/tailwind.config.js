/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          950: "#080b10",
          900: "#0d1219",
          850: "#111820",
          800: "#17212b",
          line: "#273442",
          cyan: "#4fd1c5",
          amber: "#f5b94c"
        }
      },
      boxShadow: {
        panel: "0 12px 36px rgba(0, 0, 0, 0.22)"
      }
    }
  },
  plugins: []
};
