/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#1E3A8A", // Xanh đậm ngân hàng
        success: "#10B981",
        danger: "#EF4444",
      },
    },
  },
  plugins: [],
};
