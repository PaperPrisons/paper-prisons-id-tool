/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  assetPrefix: process.env.DEBUG
    ? null
    : "https://paperprisons.github.io/paper-prisons-id-tool/",
};

module.exports = nextConfig;
