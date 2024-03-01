/*
 * @Author: yangyue yangyue@scooper.com.cn
 * @Date: 2023-06-05 16:14:20
 * @LastEditors: yangyue yangyue@scooper.com.cn
 * @LastEditTime: 2024-02-21 09:38:02
 * @FilePath: \scooper-video\src\component\utils.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import Janus from '../../libs/janus';
import api from './api';
import loadConfig from './loadConfig';
import CryptoJS from 'crypto-js';
const isMobile = /mobile/i.test(window.navigator.userAgent);
const utils =  {
    getToken: () => {
        if (sessionStorage.getItem('sc-auth')) {
            const { auth } = JSON.parse(sessionStorage.getItem('sc-auth'));
            return auth.token;
        }
        return '';
    },

    getResolutionName:(value:string)=> {
        switch (value) {
            case 'CIF':
                return '标清';
            case '480P':
                return '高清';
            case '720P':
                return '超清';
            case '1080P':
                return '蓝光';
            case '2160P':
                return '4k';
            default:
                throw Error('当前分辨率不存在');
        }
    },
    /**
     * 公共方法
     * 判断是否为IE
     */
    isIE:() => {
        return !!window.ActiveXObject || 'ActiveXObject' in window;
    },
    /**
     * 公共方法
     * 克隆对象
     * 让新出来的对象是独立的
     */
    // cloneObj: (obj: object) => {
    //     const newObj = {};
    //     let keys = Object.keys(obj);
    //     let key = null;
    //     let data = null;
    //     for (let i = 0; i < keys.length; i++) {
    //         key = keys[i];
    //         data = obj[key];
    //         if (data && typeof data === 'object') {
    //             newObj[key] = utils.cloneObj(data)
    //         } else {
    //             newObj[key] = data;
    //         }
    //     }
    //     return newObj
    // },
    cloneObj: (obj: object) => {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            const newArr = [];
            for (let i = 0; i < obj.length; i++) {
                newArr[i] = utils.cloneObj(obj[i]);
            }
            return newArr;
        }

        const newObj = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = utils.cloneObj(obj[key]);
            }
        }
        return newObj;
    },
      

    /**
     * 闭包
     * 为事件添加唯一标识字符串
     */
    guid :()=> {
        return function () {
            ++this.id
            return 'SCVIDEO_ID_' + (this.id).toString();
        };
    },

    /**
     * 公共方法
     * 判断能否获取本地声卡设备
     */
    // checkUserMediaAvailable: () => {
    //     let whetherMicrophone = false;
    //     if (Janus.isGetUserMediaAvailable()) {
    //         navigator.mediaDevices.getUserMedia({ audio: true })
    //             .then(function (stream) {
    //                 // 麦克风权限已开启
    //                 whetherMicrophone = true;
    //                 console.log('麦克风权限已开启');
    //                 return (
    //                     whetherMicrophone as boolean && window.hasAudioInputDevices ? window.hasAudioInputDevices : false as boolean
    //                 );
    //                 // 在这里可以进行其他操作
    //             })
    //             .catch(function (err) {
    //                 // 麦克风权限未开启
    //                 whetherMicrophone = false;
    //                 if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    //                     // 用户拒绝了麦克风权限
    //                     console.log('用户已拒绝麦克风权限');
    //                 } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    //                     // 未找到麦克风设备
    //                     console.log('未找到麦克风设备');
    //                 } else {
    //                     // 其他错误
    //                     console.error('获取麦克风权限时发生错误：', err);
    //                 }
    //                 return (
    //                     whetherMicrophone as boolean && window.hasAudioInputDevices ? window.hasAudioInputDevices : false as boolean
    //                 );
    //             });
    //     } else {
    //         return false;
    //     }
    // },

    checkUserMediaAvailable: () => {
        return new Promise((resolve, reject) => {
            // 如果浏览器不支持getUserMedia API，则直接reject
            if (!Janus.isGetUserMediaAvailable()) {
                resolve(false);
                return;
            }
    
            // 使用getUserMedia检查麦克风
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then((stream) => {
                    // 成功获取流，表示麦克风权限已开启且设备可用
                    console.log('麦克风权限已开启');
                    // 检查window.hasAudioInputDevices以及我们已有的权限状态
                    resolve(window.hasAudioInputDevices? window.hasAudioInputDevices : true);
                })
                .catch((err) => {
                    // 错误处理
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        console.log('用户已拒绝麦克风权限');
                    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                        console.log('未找到麦克风设备');
                    } else {
                        console.error('获取麦克风权限时发生错误：', err);
                    }
                    resolve(false);
                });
        });
    },
    

     /**
     * 公共方法
     * 是否有声卡设备
     * 异步方法  结果保存在window.hasAudioInputDevices中 true or false
     */
    hasMediaDevices:()=> {
        //参数初始化，防止为空报错
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            console.log('Not support enumerateDevices() .');
            return;
        }
        var startTime = new Date().getTime();
        // 列出相机和麦克风.
        navigator.mediaDevices
            .enumerateDevices()
            .then(function (devices) {
                devices.forEach(function (device) {
                    if (device.kind == 'audioinput') {
                        //判断到1个就返回true
                        window.hasAudioInputDevices = true;
                    }
                });
                window.checkAudioDevicesStatus = true;
                console.log(
                    '检查音频输入设备总计耗时: ' +
                    (new Date().getTime() - startTime) +
                    'ms'
                );
            })
            .catch(function (err) {
                console.log(err.name + ': ' + err.message);
            });
    },

    /**
     * 公共方法
     * 判断是否是http 或者 https
     */
    checkIsHttp :()=> {
        var protocolStr = document.location.protocol;
        if (window.location.hostname === '127.0.0.1') return false;
        if (protocolStr === 'http:' || window.location.hostname === 'localhost')
            return true;
        return false;
    },

    /**
     * 公共方法
     * 判断是否是https 和检测http分开的目的是还有本地打开的情况(前缀为file:)
     * webrtc规定打开摄像头、麦克风需要加密传输  所以需要再https环境下， 本地打开不需要加密 可以正常获取
     * 这也是分开的另一个目的
     */
    checkIsHttps:()=> {
        var protocolStr = document.location.protocol;
        if (protocolStr == 'https:') return true;
        return false;
    },
    /**
         * 检测是否支持H265
         */
    checkIsSupport:()=> {
        let mimeCodec = 'video/mp4; codecs="hvc1.1.2.L93.B0, mp4a.40.2"';
        if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
            console.log('support H265');
            return true;
        } else {
            console.log('not support H265,该浏览器不支持H265');
            return false;
        }
    },
    /**
     * 获取父窗口传入dom的唯一标识
     * @param $dom
     * @return {boolean}
     */
    getDomSelector(dom: Element): string | false {
        let selector: string | false = false;
        if (dom.hasAttribute('id')) {
          selector = '#' + dom.getAttribute('id');
        } else {
          const timestamp = Math.floor(Date.now()).toString().substring(9);
          //创建26个字母数组
            var arr = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
            var idvalue ='';
            var n = 4;//这个值可以改变的，对应的生成多少个字母，根据自己需求所改
            for(var i=0;i<n;i++){
            idvalue+=arr[Math.floor(Math.random()*26)];
            }
          const newString =  idvalue+timestamp;
          dom.setAttribute('id', newString);
          selector = '#' + dom.getAttribute('id');
        }
        return selector;
      },
 
    // 解密
    decryptByDES(encryptedData:string,key:string) {
        var key = CryptoJS.enc.Utf8.parse(key);
        var decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key, {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7
        });
        var decryptedData1 = decryptedBytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedData1);
      },
      
    /**
     * 加載初始化配置參數
     */
    async initConfig(opts: any, func: Function) {
        await loadConfig.importClass();
        const confUrl = loadConfig.getVideoWebServer() + '/scooper-video/data/conf';
        const kiv =  await api.getKiv()
        const el = await api.getConf(kiv.data)
        const isShowAv = await utils.checkUserMediaAvailable() as boolean;
        if (kiv.code!==0||el.code !== 0 ) {
              console.log('配置加载异常！');
          throw new Error('load config error, url:' + confUrl);
        }
        const data = utils.decryptByDES(el.data,kiv.data.key);
        const conf = data.jssetting;
        const videoOpts: any = {
          conf: {
            ip: conf['video.jssetting.server.ip'],
            port: conf['video.jssetting.server.port'],
            janusUrl: conf['video.jssetting.janus.url'],
            janusPlugin: conf['video.jssetting.janus.plugin.name'],
            token: utils.getToken(),
            videoLiveUrl: conf['video.jssetting.videoLive.url']
          },
          windows: parseInt(conf['video.jssetting.show.windows'] || 4),
          windowsNum: parseInt(conf['video.jssetting.show.windowsNum'] || 16),
          streamType: parseInt(conf['video.jssetting.video.stream'] || 0),
          capImage: conf['video.jssetting.cap.image'] === 'true',
          videoCapImagePath: conf['video.jssetting.cap.image.path'],
          pollInterval: parseInt(conf['video.jssetting.poll.time'] || 30),
          showVideoInfo: parseInt(conf['video.jssetting.show.showVideoInfo'] || 1),
          videoTipTimeOut: parseInt(conf['video.jssetting.show.videoTipTimeOut'] || 5),
          openChangeWindowStrategy: conf['video.jssetting.show.openChangeWindowStrategy'] === 'true',
          waitPlayQueueSwitch: conf['video.jssetting.play.queue.switch'] === 'true',
          isVideoTag: true,
          isShowAv
        };
        if (opts.isVideoTag === false) {
            videoOpts['isVideoTag'] = false;
        }
        const windowsStr = conf['video.jssetting.show.windowArr'] || '1,4,9,16';
        videoOpts['windowsArr'] = windowsStr.split(',').map(Number);
        loadConfig.extendConfig(videoOpts, opts);
        if (func) func(videoOpts);
      }
      
    
}

export default utils;