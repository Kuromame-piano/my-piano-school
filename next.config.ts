import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
    /* config options here */
    // @ts-ignore
    turbopack: {},
};

const finalConfig = withPWA(nextConfig);

// Ensure turbopack config is preserved/added to silence the error about missing turbopack config
// when webpack config is present (injected by next-pwa).
// @ts-ignore
if (!finalConfig.turbopack) {
    // @ts-ignore
    finalConfig.turbopack = {};
}

export default finalConfig;
