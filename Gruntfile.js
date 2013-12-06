module.exports = function(grunt) {

    // Configuration goes here
    grunt.initConfig({
    	pkg: grunt.file.readJSON('package.json'),
    	// lint: {
    	// 	files: ['argenmap.jquery.js']
    	// },
    	// Some typical JSHint options and globals
		jshint: {
			files: ['argenmap.jquery.js'],
			options: {
				curly: true,
				eqeqeq: false,
				immed: true,
				latedef: true,
				newcap: true,
				noarg: true,
				sub: true,
				undef: false,
				boss: false,
				eqnull: true,
				browser: true,
				unused: true,
				// indent: 4,
				jquery: true,
				asi: true,
				smarttabs: true
			},
			globals: {
				jQuery: true,
				OpenLayers: true,
				IGN_CACHES: true
			}
		}
    });

    // Load plugins here
    grunt.loadNpmTasks('grunt-contrib');

    // Define your tasks here
    grunt.registerTask('default', ['jshint']);
};