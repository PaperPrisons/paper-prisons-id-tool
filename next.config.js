/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  assetPrefix: process.env.DEBUG
    ? null
    : "https://id.paperprisons.org/",
};

module.exports = nextConfig;
