/*
 * @Author: yangyue yangyue@scooper.com.cn
 * @Date: 2023-06-05 14:31:45
 * @LastEditors: yangyue yangyue@scooper.com.cn
 * @LastEditTime: 2023-09-01 18:45:51
 * @FilePath: \scooper-video\webpack.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: ['/node_modules/', '/less/'],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader"
          },
          {
            loader: "less-loader"
          }
        ]
      },
      // {
      //   test: /\.(png|jpg|gif)$/,
      //   use: [
      //     {
      //       loader: 'file-loader',
      //       options: {
      //         name: 'images/[name].[hash].[ext]',
      //       }
      //     }
      //   ]
      // },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        // 表示启动 webpack5 中的 module asset 特性
        type: 'asset',
       // 把图片模块化，其实就是把图片变成base64的字符串，再把字符串注入到bundle当中
        parser: {
          // 超过8kb的图片不会被打包到bundle.js中
          dataUrlCondition: {
            maxSize: 8 * 1024
          }
        },
        // 图片输出的名称
        generator: {
          // 创建一个images目录来保存图片
          // 配置hash主要是为了防止图片重命，比如在不同目录下有两个相同名称的图片，最后打包到一个images目录下必然是重名的
          filename: 'images/[name].[hash:6][ext]'
        }
      }
    ]
  },
  output: {
    publicPath: './',
    filename: 'scooper.video.min.js',
    path: path.resolve(__dirname, './dist'),
    library:'VideoWebRtc',
    libraryTarget: "umd",
  },
};
