'use strict';
const path = require('path');
module.exports = {
  entry : {
    main : ['./index.js']
  },
  output : {
    path : path.resolve(__dirname, 'dist'),
    publicPath : '/dist/',
    filename : '[name].js'
  },
  module : {
    loaders : [
      {
        test : /\.js$/,
        exclude : /node_modules/,
        loader : 'babel-loader'
      }]
  }
};
