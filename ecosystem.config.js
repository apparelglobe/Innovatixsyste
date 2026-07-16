// Local dev process manager for Innovatix (survives terminal/session teardown).
// Start:   pm2 start ecosystem.config.js
// Status:  pm2 status   |   Logs: pm2 logs   |   Stop: pm2 delete ecosystem.config.js
const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'inx-api',
      cwd: path.join(root, 'apps/api'),
      script: 'npm',
      args: 'run dev',
      env: { PORT: '4040', NODE_ENV: 'development' },
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'inx-worker',
      cwd: path.join(root, 'apps/api'),
      script: 'npm',
      args: 'run worker',
      env: { NODE_ENV: 'development' },
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'inx-portal',
      cwd: path.join(root, 'apps/platform-web'),
      script: 'npm',
      args: 'run dev',
      env: { PORT: '3001' },
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'inx-web',
      cwd: path.join(root, 'apps/systems-web'),
      script: 'npm',
      args: 'run start',
      env: { PORT: '4030' },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
