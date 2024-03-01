import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import utils from './utils';

interface ResponseData {
  code: number;
  data: any;
  message: string;
}

interface RequestConfig extends AxiosRequestConfig {
    data?: any;
    headers: any;
}

export default function $axios(options: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const instance = axios.create({
      timeout: 10000,
      withCredentials: false
    });

    // request 请求拦截器
    instance.interceptors.request.use(
      (config: any) => {
        config.data = {
          ...config.data
        };
        const tokenStatus = utils.getToken().status;
        // 发送请求时携带token
        if (tokenStatus) {
        //   config.headers.token = utils.getToken().token;
             config.url += '?token='+tokenStatus;
        }
        return config;
      },
      error => {
        // 请求发生错误时
        console.log('request:', error);
        // 判断请求超时
        if (error.code === 'ECONNABORTED' && error.message.indexOf('timeout') !== -1) {
          console.log('timeout请求超时');
        }
        // 需要重定向到错误页面
        const errorInfo = error.response;
        console.log(errorInfo);
        return Promise.reject(error); // 在调用的那边可以拿到(catch)你想返回的错误信息
      }
    );

    // response 响应拦截器
    instance.interceptors.response.use(
      (response: AxiosResponse<any>) => {
        return response.data;
      },
      err => {
        if (err && err.response) {
          switch (err.response.data.code) {
            case 400:
              err.message = '请求错误';
              break;
            case 403:
              err.message = '拒绝访问';
              break;
            case 404:
              err.message = `请求地址出错: ${err.response.config.url}`;
              break;
            case 408:
              err.message = '请求超时';
              break;
            case 500:
              err.message = '服务器内部错误';
              break;
            case 501:
              err.message = '服务未实现';
              break;
            case 502:
              err.message = '网关错误';
              break;
            case 503:
              err.message = '服务不可用';
              break;
            case 504:
              err.message = '网关超时';
              break;
            case 505:
              err.message = 'HTTP版本不受支持';
              break;
            default:
          }
        }
        console.error(err);
        return Promise.reject(err); // 返回接口返回的错误信息
      }
    );

    // 请求处理
    instance(options)
      .then(res => {
        resolve(res);
        return false;
      })
      .catch(error => {
        reject(error);
      });
  });
}
