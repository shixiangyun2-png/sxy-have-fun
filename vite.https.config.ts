import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      basicSsl({
        name: 'have-fun-local-camera',
      }),
    ],
    server: {
      https: {},
      host: true,
      port: 5173,
    },
    preview: {
      https: {},
      host: true,
      port: 4173,
    },
  }),
);
