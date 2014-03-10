module.exports = function (grunt) {

    grunt.initConfig({
        uglify: {
            my_target: {
                files: {
                    'aufschreib.comps.min.js': [
                        'bower_components/jquery/dist/jquery.min.js',
                        'bower_components/datetimepicker/jquery.datetimepicker.js',
                        'bower_components/jqueryui/ui/jquery-ui.js',
                        'bower_components/jqrangeslider/jQRangeSlider.js',
                        'bower_components/jqrangeslider/jQRangeSliderMouseTouch.js',
                        'bower_components/jqrangeslider/jQRangeSliderDraggable.js',
                        'bower_components/jqrangeslider/jQRangeSliderHandle.js',
                        'bower_components/jqrangeslider/jQRangeSliderBar.js',
                        'bower_components/jqrangeslider/jQRangeSliderLabel.js',
                        'bower_components/jqrangeslider/jQRuler.js',
                        'bower_components/jqrangeslider/jQDateRangeSliderHandle.js',
                        'bower_components/jqrangeslider/jQDateRangeSlider.js',
                        'bower_components/bootstrap/dist/js/bootstrap.min.js',
                        'bower_components/d3/d3.min.js',
                        'bower_components/nvd3/nv.d3.js',
                        'bower_components/socket.io-client/dist/socket.io.min.js',
                        'bower_components/vivagraph/dist/vivagraph.min.js',
                        'bower_components/typeahead.js/dist/typeahead.bundle.min.js',
                        'bower_components/moment/min/moment.min.js',
                        'utils/fontdetect.js',
                        'utils/d3.layout.cloud.min.js',
                        'utils/jquery.form.min.js'
                    ],
                    'aufschreib.min.js': [
                        'aufschreib.js',
                        'stats/stats.js',
                        'stats/pie.js',
                        'stats/bar.js',
                        'stats/graph.js',
                        'stats/hashtags.js',
                        'stats/time.js'
                    ]
                }
            },
            options: {
                compress: {
                    drop_console: true
                }
            }
        },
        cssmin: {
            combine: {
                files: {
                    'aufschreib.comps.min.css': [
                        'bower_components/jqrangeslider/css/iThing.css',
                        'bower_components/datetimepicker/jquery.datetimepicker.css',
                        'bower_components/nvd3/nv.d3.min.css'
                     //   'aufschreib.css'
                    ],
                    'aufschreib.min.css': [
                        'aufschreib.css'
                    ]
                }
            }
        }

    });


    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.registerTask('default', ['uglify', 'cssmin']);


};