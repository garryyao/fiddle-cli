module.exports = {
    properties: {
        name: {
            required: true,
            description: 'title of the fiddle',
            'default': 'my-fiddle-name'
        },
        description: {
            required: true,
            description: 'description of the fiddle',
            'default': 'Some description, please keep it in one line'
        },
        authors: {
            type: 'array',
            description: 'Who is the author',
            'default': []
        },
        resources: {
            type: 'array',
            description: 'list of external resources linked into this fiddle',
            'default': ''
        },
        normalize_css: {
            type: 'string',
            default: 'no',
            enum: ['yes', 'no'],
            description: 'should normalize.css be loaded before any CSS declarations?',
        },
        wrap: {
            type: 'string',
            enum: ['l', 'd', 'h', 'b'],
            description: 'set the JS code wrap: \n \
                * l - onLoad  \n \
                * d - domReady  \n  \
                * h - no wrap - in <head>  \n  \
                * b - no wrap - in <body>',
            'default': 'b'
        },
        panel_js: {
            type: 'number',
            enum: [0, 1, 2],
            description: 'choose language choice of javascript panel, 0 - Vanilla, 1 - Coffee, 2 - JS1.7 ',
            'default': 0
        },
        panel_css: {
            type: 'number',
            enum: [0, 1],
            description: 'choose language choice of css panel, 0 - CSS, 1 - SCSS',
            'default': 0
        },
    }
};
