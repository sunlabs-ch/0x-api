const defaultConfig = {
  cwd: ".",
  restart_delay: "5000",
  max_restarts: "10",
  max_memory_restart: "2G",
  autorestart: true,
};

module.exports = {
  apps: [
    {
      ...defaultConfig,
      name: "0x API",
      script: "lib/src/index.js",
      args: "",
    },
    {
      ...defaultConfig,
      name: "Redis",
      script: "/usr/bin/redis-server",
      args: "",
    },
    {
      ...defaultConfig,
      name: "Postgres",
      script: "/usr/bin/sudo",
      args: "-E -u postgres postgres -D /var/lib/postgresql/data",
    },
  ],
};
