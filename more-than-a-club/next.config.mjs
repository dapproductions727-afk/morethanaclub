/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so the game can be dropped on any static host (mobile-friendly).
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
