import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const {API_TARGET} = loadEnv(mode, process.cwd(), 'API_');
  return {
    base: './',
    server: API_TARGET
      ? {proxy: {'/api': {target: API_TARGET, changeOrigin: true}}}
      : {},
  };
});
