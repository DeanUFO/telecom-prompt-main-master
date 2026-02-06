import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 載入環境變數 (包含 .env 檔案與系統環境變數)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: '/telecom-prompt-main-master/', // GitHub Pages 子路徑 (倉庫部署)
    server: {
      // 在本機開發時，將 /api 請求代理到本地後端（便於本機整合測試）
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    define: {
      // 在編譯時期將 process.env.API_KEY 替換為實際的字串值 (由 CI 注入)
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
      // 讓 Vite 可以在編譯時注入前端要使用的後端 URL
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || process.env.VITE_API_URL || ''),
    },
  };
});