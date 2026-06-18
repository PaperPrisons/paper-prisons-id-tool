/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  assetPrefix: process.env.DEBUG
    ? null
    : "https://paperprisons.github.io/paper-prisons-id-tool/",
  async rewrites() {
    return [
      {
        source: "/send_email.php",
        destination: "http://127.0.0.1:8888/send_email.php",
      },
    ];
  },
};

module.exports = nextConfig;
