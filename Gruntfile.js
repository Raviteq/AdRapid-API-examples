module.exports = function(grunt) {

    require('jit-grunt')(grunt);

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        jade: {
            compile: {
                options: {
                    client: false,
                    pretty: true
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