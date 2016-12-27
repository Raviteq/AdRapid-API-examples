module.exports = function(grunt) {

    require('jit-grunt')(grunt);

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        jade: {
            compile: {
                options: {
                    client: false,
                    pretty: true,
                    // event: 'changed'
                },
                files: [ {
                  cwd: "dev/jade",
                  src: "**/*.jade",
                  dest: "",
                  expand: true,
                  ext: ".html"
                } ]
            }
        },

        stylus: {
            compile: {
                files: {
                  'assets/app.css': 'dev/stylus/app.styl',
                }
            }
        },

        ts: {
            default : {
                src: ["dev/ts/**/*.ts", "!node_modules/**"]
            }
        },

        watch: {
            options: {
                watchTask: true
            },

            jade: {
                files: "dev/jade/**/*.jade",
                tasks: ['newer:jade:compile']
            },

            stylus: {
                files: "dev/stylus/**/*.styl",
                tasks: ['stylus'],
            },

            ts: {
                files: "dev/ts/**/*.ts",
                tasks: ['ts'],
            },
        },

        browserSync: {
            dev: {
                bsFiles: {
                    src : [
                        '**/*.js',
                        '**/*.html',
                        '**/*.css',
                    ]
                },
                options: {
                    server: true,
                    port: 4000,
                    watchTask: true,
                    debugInfo: true,
                    logConnections: true,
                    notify: true,
                    startPath: "/simple/index.html",
                }
            }
        }

    });

    // define tasks
    grunt.registerTask('default', ['browserSync', 'watch']);

};