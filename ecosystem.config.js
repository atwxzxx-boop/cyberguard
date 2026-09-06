module.exports = {
  apps: [
    {
      name: 'cyberguard',
      script: 'dist/index.js',
      cwd: process.cwd(),
      watch: false,
      instances: 1,
      autorestart: true,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
