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
  experimental: {
    allowedDevOrigins: [
        "https://6000-idx-studio-1746216942525.cluster-etsqrqvqyvd4erxx7qq32imrjk.cloudworkstations.dev",
        // You can add more origins here if needed
    ],
  }
};

export default nextConfig;
