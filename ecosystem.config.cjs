module.exports = {
    apps: [{
        name: 'pdf_generator',
        script: 'npm',
        args: 'run start',
        interpreter: '',
        interpreter_args: '',
        instances: 2,
        exec_mode: 'cluster',
        autorestart: true,
        max_restarts: 5,
        restart_delay: 3000, // 3 second delay between restarts
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production'
        }
    }]
}