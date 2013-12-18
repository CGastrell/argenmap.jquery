module.exports = function(grunt) {

    // Configuration goes here
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        // lint: {
        //  files: ['argenmap.jquery.js']
        // },
        // Some typical JSHint options and globals
        jshint: {
            files: ['src/LayerSwitcherIGN.js','src/PanZoomBarIGN.js','src/argenmap.jquery.js'],
            options: {
                curly: true,
                eqeqeq: false,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                boss: true,
                eqnull: true,
                browser: true,
                unused: false,
                // indent: 4,
                jquery: true,
                asi: true,
                smarttabs: true,
                globals: {
                    jQuery: true,
                    OpenLayers: true,
                    IGN_CACHES: true,
                    google: true,
                    interval: true //esta es la variable que usa el resized event de jQuery
                }
            }
        },
        uglify: {
            options: {
                report: 'min',
                mangle: {
                    except: ['jQuery', 'OpenLayers', 'google']
                },
                compress: true,
                join_vars: true,
                unsafe: false
            },
            build: {
                src: ['src/LayerSwitcherIGN.js', 'src/PanZoomBarIGN.js', 'src/argenmap.jquery.js'],
                dest: 'src/argenmap.jquery-sinOpenLayers.min.js'
            },
            release: {
                src: ['src/OpenLayers-argenmap-closure.js', 'src/LayerSwitcherIGN.js', 'src/PanZoomBarIGN.js', 'src/argenmap.jquery.js'],
                dest: 'argenmap.jquery.min.js'
            }
        },
        concat: {
            options: {
                banner: '/*! <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today("dd-mm-yyyy") %> <%= pkg.author %> */\n',
                separator: ';'
            },
            dist: {
                src: ['src/OpenLayers-argenmap-closure.js', 'src/argenmap.jquery-sinOpenLayers.min.js'],
                dest: 'argenmap.jquery.min.js'
            },
        },
        cssmin: {
            options: {
                report: 'min'
            },
            minify: {
                expand: true,
                cwd: 'src/',
                src: ['style.css'],
                dest: 'theme/default/',
                ext: '.css'
            }
        }
    });

    // Load plugins here
    grunt.loadNpmTasks('grunt-contrib');

    // Define your tasks here
    grunt.registerTask('default', ['jshint', 'uglify:release', 'cssmin']);
    grunt.registerTask('test', ['jshint']);
};