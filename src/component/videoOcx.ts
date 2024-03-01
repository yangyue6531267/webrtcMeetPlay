import utils from "./utils";
import { registered } from '../scooperVideo';
// 定义VideoOcx类
class VideoOcx {
    private videoStatus: { [key: number]: { video: string; id: string; playId: number; opts: any } } = {};
    private _opts: any = {};
    private _obj: any = {};
    private _windowList: any = {}; // 窗口列表
    private _windowsArr: any = []; // 窗口列表
  
    constructor(private dom: HTMLElement, opts: any) {
      if (!utils.isIE()) {
        console.log('视频控件不支持非IE浏览器');
        return this.getTipObj();
      }
      utils.initConfig(opts, (videoOpts: any) => {
        this._init(this.dom, videoOpts);
      });
    }
  
    private _init($dom: HTMLElement, opts: any): void {
      // 初始化逻辑
      // 此处略去具体实现
        const me = this;
    
        // 配置项
        me._opts = {
            windows: 4,
            conf: {},
            extra: false,
            ocxName: '__videoDiv',
            streamType: 0,
            openChangeWindowStrategy: false,
            capImage: false,
            videoCapImagePath: '',
            pollInterval: 10,
        };
    
        Object.assign(me._opts, opts);
    
        const windowsArr = me._opts.windowsArr;
        if (!windowsArr || windowsArr.length === 0) {
            me._windowList = { 1: {}, 4: {}, 6: {}, 9: {}, 16: {} };
            me._windowsArr = [1, 4, 6, 9, 16];
        } else {
            me._windowList = {};
            for (const item of windowsArr) {
                me._windowList[item] = {};
            }
            me._windowsArr = windowsArr;
        }
    
        if (typeof me._opts.pollInterval !== 'number') {
            console.error('pollInterval should be number');
            return;
        }
    
        this.addStopHandler();
        this.addClickHandler();
        this.addHisHandler();
        this.addCapPicHandler();
        this.addHistoryPlayHandler();
        this.beforeUnload();
    
        // ... Continue with the rest of the code
        const conf = me._opts.conf;
        const initResult = me._obj.ScWebDecoderInit(0);
        console.log('init: ' + initResult);

        if (conf.ip == '127.0.0.1') {
            conf.ip = location.hostname;
        }

        let login;
        if (conf.token && conf.token.length > 0 && me._obj.SCWebDecoderLoginInVS_Token) {
            login = me._obj.SCWebDecoderLoginInVS_Token(conf.token, conf.ip, conf.port);
        } else {
            login = me._obj.SCWebDecoderLoginInVs(conf.user, conf.passwd, conf.ip, conf.port);
        }
        console.log('login: ' + login);

        setTimeout(() => {
            if (me._opts.capImage) {
                me._obj.SCWebSetPtzButtonLayout('');
            }
            me._opts.extra
                ? me._obj.SCWebDecoderSetExtraScreenMode(me._opts.windows)
                : me._obj.SCWebDecoderSetScreenMode(me._opts.windows);
        }, 100);
    }
    /**
 * 创建一个带有不支持的方法的提示对象。
 * @returns 包含不支持的方法的提示对象。
 */
  private getTipObj(): any {
    const tipMessage = () => {
      console.log('不支持非IE环境');
    };
  
    const fncName =
      'play playByOrder playAll playInChoice playMulWindows click getWindowsNum setWindowsNum';
    const fncName2 =
      'isPlaying setChoiceWindow close closeAll enableClosede disableClosed addListener removeListener dispatch';
  
    // 创建包含不支持方法的提示对象
    const obj = {
      type: 'disable',
      ...fncName.split(' ').reduce((acc, name) => {
        acc[name] = tipMessage;
        return acc;
      }, {}),
      
      ...[].reduce.call(fncName2.split(' '),(acc, name) => {
          acc[name] = tipMessage;
          return acc;
        },{}),
    };
    return obj;
  }
  

    // 其他方法...
    // 播放视频
    play(index: number, video: string, id: string, opts?: any): boolean {
      /*if (!$.isNumeric(video*1)) {
          throw new Error('video is not number,id = '+id);
      }*/
      console.log('play >>> ' + 'video=' + video + '; id=' + id + '; index=' + index);
      this.dispatch('beforeplay', { index: index, video: video, id: id });
      this._obj.SCWebSetCurrentWindow(index);
      const playId = this._obj.SCWebRealPlay(video, this._opts.streamType);
      console.log('play = ' + playId);
      opts = opts || {};
      if (playId > 0) {
        this.videoStatus[index] = {
          video: video,
          id: id,
          playId: playId,
          opts: opts,
        };
        this.dispatch('playsuccess', this.videoStatus[index]);
      } else if (playId < 0) {
        const name = opts.name || '视频';
        this.promptFailed(name + '播放失败！');
      }
      return playId > 0;
    }
  
    // 修改其他方法，去除jQuery依赖
    // ...
  
    // 定义dispatch和promptFailed方法，去除具体实现
    private dispatch(event: string, data: any): void {}
    private promptFailed(message: string): void {}


    private regEvent(eventName: string, handlerName: string): void {
      window.addScriptFlag = true;
      function createScriptElement(): HTMLScriptElement {
          const script = document.createElement('script');
          script.setAttribute('for', this._opts.ocxName);
          script.setAttribute('event', eventName);
          const scriptText = `
              if (!window.addScriptFlag) {
                  ${handlerName}
              }
              window.addScriptFlag = false;
          `;
  
          script.textContent = scriptText;
          return script;
      }
  
      const scriptElement = createScriptElement();
      document.body.appendChild(scriptElement);
  }
  
  // Usage
  // const yourEventName = 'yourEventName';
  // const yourHandlerFunction = 'yourHandlerFunction()';
  // const yourOcxName = 'yourOcxName';
  
  // regEvent(yourEventName, yourHandlerFunction, yourOcxName);
  
    private addStopHandler() {
      // Add your implementation for _addStopHandler
    }

    private addClickHandler() {
        // Add your implementation for _addClickHandler
    }

    private addHisHandler() {
        // Add your implementation for _addHisHandler
    }

    private addCapPicHandler() {
        // Add your implementation for _addCapPicHandler
    }

    private addHistoryPlayHandler() {
        // Add your implementation for _addHistoryPlayHandler
    }

    private beforeUnload() {
        // Add your implementation for _beforeUnload
    }
  }
  
//   // 使用示例
//   const options = { windowsNum: 16 }; // 假设有16个视频窗口
//   const videoPlayer = new VideoOcx(document.getElementById('video-container'), options);
  
//   // 调用播放方法
//   videoPlayer.play(0, 'video1', 'id1', { name: 'Video 1' });
//   videoPlayer.playByOrder('video2', 'id2', {});
//   videoPlayer.playByOrderExpandWindow('video3', 'id3', {});
//   // 其他调用方法...
  
//   // 关闭语音
//   videoPlayer.closeVoice(0);
  