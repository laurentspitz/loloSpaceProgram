module.exports = {
    default: {
        paths: ['features/**/*.feature'],
        import: ['features/**/*.ts'],
        format: ['progress-bar', 'html:cucumber-report.html'],
    }
};
