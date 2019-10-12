const path = require('path');

module.exports = [{
    mode: "development",
    entry: "./src/electron.ts",
    devtool: "source-map",
    target: 'electron-main',

    output: {
        filename: 'electron.js',
        path: path.resolve(__dirname, 'dist')
    },

    resolve: {
        extensions: [".ts", ".tsx", ".js"]
    },

    module: {
        rules: [{
            test: /\.ts(x?)$/,
            exclude: /node_modules/,
            use: [{ loader: "ts-loader" }]
        }, {
            enforce: "pre",
            test: /\.js$/,
            loader: "source-map-loader"
        }
        ]
    }
}, {
    mode: 'development',
    entry: './src/renderer.tsx',
    target: 'electron-renderer',
    devtool: 'source-map',

    resolve: {
        extensions: [".ts", ".tsx", ".js"]
    },
    module: {
        rules: [{
            test: /\.ts(x?)$/,
            include: /src/,
            use: [{ loader: 'ts-loader' }]
        }, {
            test: /\.scss$/,
            use: ['style-loader', 'css-loader', 'sass-loader']
        }]
    },
    output: {
        path: __dirname + '/dist',
        filename: 'renderer.js'
    }
}
];