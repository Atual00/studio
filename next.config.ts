import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Ignore handlebars require.extensions warning
    config.ignoreWarnings = [
      {
        module: /handlebars/,
        message: /require\.extensions/,
      },
    ];
    return config;
  },
};

export default nextConfig;
