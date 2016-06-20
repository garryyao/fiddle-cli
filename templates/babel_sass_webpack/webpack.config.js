'use strict';
const path = require('path');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const ExtractCSS = new ExtractTextPlugin("style.css", {allChunks : true});

module.exports = {
  entry : {
    main : ['./index.js']
  },
  output : {
    path : path.resolve(__dirname, 'dist'),
    publicPath : '/dist/',
    filename : '[name].js'
  },
  devtool : 'source-map',
  module : {
    loaders : [
      {
        test : /\.js$/,
        exclude : /node_modules/,
        loader : 'babel-loader'
      },
      {
        test : /\.scss$/,
        exclude : /node_modules/,
        loader : ExtractCSS.extract('css!sass')
      }
    ]
  },
  plugins : [
    ExtractCSS
  ]
};