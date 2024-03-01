/*
 * @Author: yangyue yangyue@scooper.com.cn
 * @Date: 2023-06-06 13:57:55
 * @LastEditors: yangyue yangyue@scooper.com.cn
 * @LastEditTime: 2023-12-13 14:32:10
 * @FilePath: \scooper-video\src\component\api.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import axios from './changeAxios';
import loadConfig from './loadConfig';
// import utils from './utils';



export default {
  // get: (options: { url: any }) => {
  //   return axios.get(options.url);
  // },

  // put: (options: { url: any }) => {
  //   return axios.put(options.url);
  // },

  getConf: (data = {}) => {
    const confUrl = loadConfig.getVideoWebServer() + '/scooper-video/data/conf';
  
    // 将数据附加到 URL 上
    const queryString = Object.keys(data)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
      .join('&');
    const urlWithParams = `${confUrl}?${queryString}`;
  
    return axios({
      url: urlWithParams,
      method: 'GET',
      // 不再需要 data 字段
    });
  },
  getKiv: (data={}) => {
    const confUrl = loadConfig.getVideoWebServer() + '/scooper-video/data/kiv';
    return axios({
      url: confUrl,
      method: 'POST',
      data: data
    })
  },

  send: (options: any) => { },

  read: (options: { url: any; error: (arg0: undefined) => any; success: (arg0: any) => any }) => { },
};
