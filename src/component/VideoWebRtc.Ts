
import utils from "./utils";
import Janus from "../../libs/janus";
import VideoWebCast from "../../libs/scooper.video.webcast";
import CONST_CODE from "./const_code";
import SVideo from "./SVideo";
import api from "./api";
import Listener from "./listener";
import PollTimer from "./polltimer";
import loadConfig from "./loadConfig";
import { VideoOptions,VideoData} from '../scooperVideo.d'



/**
 * Represents a VideoWebRtc class for handling video streaming and communication.
 */
class VideoWebRtc {
    private VIDEO_DATA: any[] = [];
    private _opts: VideoOptions;
    private _windowList: any;
    private _windowsArr: number[];
    private waitPlayQueueSwitch: boolean;
    private _webcast: any; // 添加 _webcast 属性
    videoListener: any; // 视频监听
    reLoginJanusItvIndex: any = -1; // 重新登录Janus定时器
    WAITING_DATA: any[];// 记录等待中的视频
    selector: any; // 选择器
    configOpt: any; // 配置参数
    videoView: any; // 视频视图
    janus: any; // janus对象
    videoCodeType: any; // 视频编码类型
    videoInfoTimer: any; // 视频信息定时器
    videoNameTimers:any;
    openChangeWindowStrategy: any; // 开启切换窗口策略
    recordAvBusinessId: any; // 录像业务id
    _saveList: any; // 保存列表
    _polltimer: any; // 轮询定时器
    _pollArray: any; // 轮询数组
    _onlineArray: any; // 在线数组
    isOpenSpeekFlag:Boolean;
    videoNum: number=0;
    janusInfo: any;
    janusRegistered: { symbole: boolean; sessionId: any; };
    isWsPlay: boolean;
    
    constructor($dom: HTMLElement, opts: VideoOptions) {
        this.VIDEO_DATA = [];
        this.WAITING_DATA = [];
        // this.isOpenSpeekFlag = false;
        this.videoListener = new Listener();
        this.configOpt = (opts && opts.configOpt) || 3;
        utils.initConfig(opts, (videoOpts: any) => {
            //检测声卡设备为异步方法，耗时在几十毫秒左右，因此需要做延迟
            //默认检查次数为40  间隔为20ms
            utils.hasMediaDevices();
            let count = 0;
            const index = setInterval(() => {
                if (count === 40 || window.checkAudioDevicesStatus) {
                    clearInterval(index);
                    this.init($dom, videoOpts);
                }
                count++;
            }, 20);
        });

    }

    /**
     * janus初始化
     * @param $dom dom元素
     * @param opts 初始化配置的 参数对象
     * @private
     */
    private async init($dom: HTMLElement, opts: VideoOptions) {
        if (!$dom|| !utils.getDomSelector($dom)) {
            console.error('父dom元素为空，无法进行视频初始化');
            return;
        }
        this.selector = utils.getDomSelector($dom);
        this._opts = {
            windows: 4,
            conf: {},
            pollInterval: 10,
            windowsNum: 16,
            isVideoTag: true,
            showVideoInfo: 1,
            waitPlayQueueSwitch: false,
            defaultBusinessType: 0,
            videoTipTimeOut: 5,
            isShowChangeResolution: false,
            isShowChangeVideoSource: false,
            showVideoName:false,
            janus: null,
            windowsBeginIndex: 0,
            configOpt: 3,
            freeWindow:false,
            draggable: true,
            isWsPlay: false,
            dbClick: false,
            isShowAv: true,
        };

        Object.assign(this._opts, opts);

        const windowsArr = this._opts.windowsArr;
        if (!windowsArr || windowsArr.length === 0) {
            this._windowList = { 1: {}, 4: {}, 6: {}, 9: {}, 16: {} };
            this._windowsArr = [1, 4, 6, 9, 16];
        } else {
            this._windowList = {};
            for (const item of windowsArr) {
                this._windowList[item] = {};
            }
            this._windowsArr = windowsArr;
        }

        // 保存视频窗口列表对象
        this.VIDEO_DATA = [];

        // 对讲号码初始化
        this.videoListener.dispatch('pocNo', 0);
        // window.pocNo = 0;
        this.isWsPlay = this._opts.isWsPlay;
        // 播放队列开关，默认打开
        this.waitPlayQueueSwitch = this._opts.waitPlayQueueSwitch ?? false;
        // 初始化界面
        this._opts.isVideoTag ? this._initVideoView($dom, this._opts.showVideoInfo,this._opts.isShowAv) : this._initAudioView($dom);
        // 勤指业务下 设备检测
        this._opts.defaultBusinessType == 1 && this._checkDevices();
        this._webcast = null;

        // 初始化Janus
        this._initJanus();

        // 初始化H265
        if (
            this._opts.conf.videoLiveUrl &&
            this._opts.conf.videoLiveUrl !== undefined &&
            this._opts.conf.token
        ) {
            this._initWebcast();
        }
        

        // 初始化按钮点击事件
        this._initBtnEvent();

        // 初始化事件监听
        this._initEventListen();

        // 设置鼠标点击选中窗口
        this._initWindowEvent();

        if (this._opts.showVideoInfo !== 0) {
            // 显示视频信息：名称、分辨率、码率、丢包率
            this._showVideoInfo();
        }
        if (this._opts.showVideoName) {
            // 显示视频信息：名称
            this._showVideoName();
        }
        if (!this._opts.dbClick) {
            //双击某个视频全屏
            this._dbClickFullScreen();

        }
    }

    private _initVideoView ($dom: HTMLElement, infoPosition: number = 0,isShowAv: boolean) {
        // 初始化视频界面的逻辑代码
        const getVideoHtml = (index: number, position: string): string => {
            // style="display: none;
            return `
              <${this._opts.freeWindow?'div':'li'} class="screen screen-${index}" index="${index - 1}" draggable="true"">
                <video muted class="video-box" id="video-${index}" autoplay></video>
                <div class="hide info ${position}" id="info-${index}"></div>
                <div class="hide frame-decoded" id="frame-decoded-${index}"
                  style="position:absolute;float:left;color:#fff;width:67%;z-index:1;top:135px;left:180px">
                  网络信号不佳
                </div>
                <div class="operate-btn">
                  <button index="${index - 1}" class="change-resolution hide">
                    <div class="resolution-wrapper resolution-wrapper_${index - 1} hide">
                      <ul>
                        <li index="${index - 1}" data-value="CIF" name="changeResolution">标清</li>
                        <li index="${index - 1}" data-value="480P" name="changeResolution">高清</li>
                        <li index="${index - 1}" data-value="720P" name="changeResolution">超清</li>
                        <li index="${index - 1}" data-value="1080P" name="changeResolution">蓝光</li>
                        <li index="${index - 1}" data-value="2160P" name="changeResolution">4K</li>
                      </ul>
                    </div>
                    <div class="current-resolution">
                      <span class="resolution-value" name="resolutionValue">标清</span>
                    </div>
                  </button>
                  <button type="button" class="change-video-source hide" name="changeVideoSource"></button>
                  <button type="button" class="unlock-video-btn hide" name="lockVideo"></button>
                  ${isShowAv ? '<button type="button" class="unsend-audio-btn hide" name="sendAudio"></button>' : ''}
                  <button type="button" class="unrecv-audio-btn hide" name="recvAudio"></button>
                  <button type="button" class="close-btn hide" name="closeVideo"></button>
                </div>
              </${this._opts.freeWindow?'div':'li'}>
            `;
        }
        const getPosition = (infoPosition: number): string => {
            switch (infoPosition) {
                case 1:
                    return 'info-bottom';
                case 2:
                    return 'info-top';
                default:
                    return 'info-bottom';
            }
        }
        if (this._opts.freeWindow) {
            return
            // this.setWindowsNum(this._opts.windows, { vertical: this._opts.firstInitVertical }); 
        }else{
            const objClass = (this._opts.windowsNum === 1 ? 'video-main video-main-full mode-' : 'video-main mode-') + this._opts.windows;
            const freeWindow = this._opts.freeWindow?'freeWindow':''
            let videoHtml = `<ul class="${objClass}" id="video-main-web-rtc">`;
            const index = this._opts.windowsBeginIndex + 1;
    
            for (let i = index; i < index + this._opts.windowsNum; i++) {
                videoHtml += getVideoHtml(i, getPosition(infoPosition));
            }
    
            videoHtml += '</ul><div class="canvasBox hide"><canvas id="myCanvas"></canvas></div>';
            $dom.innerHTML = videoHtml;
            this.setWindowsNum(this._opts.windows, { vertical: this._opts.firstInitVertical });
        }
        
    }

    async initVideoNum({$dom,infoPosition: infoPosition = 0,video,opts}: { $dom: HTMLElement,infoPosition?: number,video: any,opts: any}) {
        // 写一个promise注册事件
        // const isShowAv = await utils.checkUserMediaAvailable();

        const getVideoHtml = (index: number, position: string): string => {
            return `
              <div class="screen screen-${index}" index="${index - 1}" draggable="true"">
                <video muted class="video-box" id="video-${index}" autoplay></video>
                <div class="hide info ${position}" id="info-${index}"></div>
                <div class="hide frame-decoded" id="frame-decoded-${index}"
                  style="position:absolute;float:left;color:#fff;width:67%;z-index:1;top:135px;left:180px">
                  网络信号不佳
                </div>
                <div class="operate-btn">
                  <button index="${index - 1}" class="change-resolution hide" >
                    <div class="resolution-wrapper resolution-wrapper_${index - 1} hide">
                      <ul>
                        <li index="${index - 1}" data-value="CIF" name="changeResolution">标清</li>
                        <li index="${index - 1}" data-value="480P" name="changeResolution">高清</li>
                        <li index="${index - 1}" data-value="720P" name="changeResolution">超清</li>
                        <li index="${index - 1}" data-value="1080P" name="changeResolution">蓝光</li>
                        <li index="${index - 1}" data-value="2160P" name="changeResolution">4K</li>
                      </ul>
                    </div>
                    <div class="current-resolution">
                      <span class="resolution-value" name="resolutionValue">标清</span>
                    </div>
                  </button>
                  <button type="button" class="change-video-source hide" name="changeVideoSource"></button>
                  <button type="button" class="unlock-video-btn hide" name="lockVideo"></button>
                  <button type="button" class="unsend-audio-btn hide" name="sendAudio"></button>
                  <button type="button" class="unrecv-audio-btn hide" name="recvAudio"></button>
                  <button type="button" class="close-btn hide" name="closeVideo"></button>
                </div>
              </div>
            `;
        }
        const getPosition = (infoPosition: number): string => {
            switch (infoPosition) {
                case 1:
                    return 'info-bottom';
                case 2:
                    return 'info-top';
                default:
                    return 'info-bottom';
            }
        }

        const getNewSVideo = ()=>{
            const svidoInfo = {
                index: this.videoNum,
                userToken: this.janusInfo['userToken'],
                janus: this._opts.janus,
                webcast: this._webcast,
                windowsNum: this._opts.windowsNum,
                relativeIndex: this.videoNum,
                flag: this._opts.flag,
                isVideoTag: this._opts.isVideoTag,
                janusPlugin: this._opts.conf.janusPlugin,
                videoTipTimeOut: this._opts.videoTipTimeOut,
                isShowChangeResolution: this._opts.isShowChangeResolution,
                isShowChangeVideoSource: this._opts.isShowChangeVideoSource,
                parentSelector: this.selector,
                isWsPlay: this._opts.isWsPlay,
                showVideoName: this._opts.showVideoName,
            }

            this.VIDEO_DATA[this.videoNum] = new SVideo(
                svidoInfo,
                this.videoListener,
                this.janusRegistered,
            );
            this.videoNum++;
        }
        return new Promise((resolve, reject) => {
            if (this.videoNum<=16) {
                $dom.innerHTML = getVideoHtml(this.videoNum+1,getPosition(infoPosition));
                getNewSVideo()
                this.VIDEO_DATA[this.videoNum-1].videoListener.addListener(`initsucc${this.videoNum-1}`, (data: any) => {
                    this.VIDEO_DATA[data.index].videoListener.removeListener(`initsucc${data.index}`);
                    this.newPlayByDom(video,opts, data);
                    this.dispatch('screenchange', { windowNums: this.videoNum-1, flag: 0, extra: {vertical: false}});
                    resolve(data);
                })
            }else{
                reject('无可用窗口')
            }
        })
    }

    private _initAudioView($dom: HTMLElement): void {
        // 初始化音频界面的逻辑代码
        const generateAudioHtml = (index: number, windowsNum: number, windowsBeginIndex: number): string => {
            const objClass =
                (windowsNum === 1 ? 'video-main video-main-full mode-' : 'video-main mode-') + this._opts.windows;
            let videoHtml = '<ul class="' + objClass + '" id="video-main-web-rtc">';
            const startIndex = windowsBeginIndex + 1;

            for (let i = startIndex; i < startIndex + windowsNum; i++) {
                videoHtml += '<audio id="audio-' + i + '" autoplay ></audio>';
            }

            videoHtml += '</ul>';
            return videoHtml;
        }
        const index = this._opts.windowsBeginIndex + 1;
        const audioHtml = generateAudioHtml(index, this._opts.windowsNum, this._opts.windowsBeginIndex);
        $dom.insertAdjacentHTML('beforeend', audioHtml);
    }

    private _initJanus(): void {
        // 初始化Janus的逻辑代码
        const me = this;
        Janus.init({
            debug: 'error',
            callback: function () {
                if (!Janus.isWebrtcSupported()) {
                    alert('不支持WEB-RTC');
                    return;
                }
                let janusUrl;
                // utils.checkIsHttps() && (janusUrl = janusUrl.replace('ws:', 'wss:'));
                janusUrl = utils.checkIsHttps()?window.origin.replace('https://', 'wss://')+ '/janus/':window.origin.replace('http://', 'ws://') + '/janus/';					
                if(janusUrl.indexOf('127.0.0.1') > 0||janusUrl.indexOf('localhost') > 0){
                    janusUrl = me._opts.conf.janusUrl;
                }
                me._opts.janus = new Janus({
                    server:janusUrl,
                    success: function () {
                        console.log('Janus服务连接成功！');
                        me._initSVideo(me._opts.janus);
                    },
                    error: function (error) {
                        if (!me._opts.isNotFistTip) {
                            console.log('Janus服务连接失败！');
                        }
                        me._opts.isNotFistTip = true;
                        console.error('Janus服务连接失败：' + error);
                        me.closeAll();
                        me._removeAllWaitingVideo();
                        me._initJanus();
                    },
                    destroyed: function () {
                        me._opts.isNotFistTip = true;
                    },
                });
            },
        });
    }


    private _initWebcast(): void {
        let videoLiveUrl = this._opts.conf.videoLiveUrl;
        videoLiveUrl = utils.checkIsHttps()?window.origin.replace('https://', 'wss://')+'/scws/video_livestream':window.origin.replace('http://', 'ws://') +'/scws/video_livestream' 

        if (videoLiveUrl.indexOf('127.0.0.1') > 0||videoLiveUrl.indexOf('localhost') > 0) {
            videoLiveUrl = this._opts.conf.videoLiveUrl;
        }
        const webcastConfig = {
            videoLiveWsUrl: videoLiveUrl,
            token: this._opts.conf.token
        };
        this._webcast = new VideoWebCast(webcastConfig);
    }

    /**
 * 销毁所有资源
 */
    destroy(): void {
        // 停止 Janus 并释放资源
        this.destoryJanus();

        // 清空视频容器
        const videoContainer = document.querySelector(this.selector);
        if (videoContainer) {
            videoContainer.innerHTML = '';
        }

        // 释放其他资源
        this.videoListener = null;
        this.VIDEO_DATA = [];
        this.selector = null;
        // this._opts = null; // Janus 销毁会触发回调，不需要手动释放
    }

    /**
     * 销毁 Janus，释放资源
     */
    private destoryJanus(): void {
        // 假设 this._opts.janus.destroy 是一个异步函数并返回 Promise
        if (this._opts && this._opts.janus && this._opts.janus.destroy) {
            this._opts.janus.destroy({
                success: () => {
                    // Janus 销毁成功后的处理
                    var registered = {
                        symbole: false,
                        sessionId: this._opts.janus.getSessionId(),
                    };

                    this.janusRegistered = registered;
                },
                asyncRequest: true,
                notifyDestroyed: true,
            });
        }

        // 移除所有事件监听器
        this.removeAllListeners();
    }


    private _initSVideo(janus: any): void {
        const me = this;
        janus.attach({
            plugin: me._opts.conf.janusPlugin
                ? me._opts.conf.janusPlugin
                : 'janus.plugin.videoserver',
            opaqueId: 'siptest-' + Janus.randomString(12),
            success: function (pluginHandle: any) {
                console.log('Janus登陆插件初始化成功！');
                const register = {
                    request: 'register',
                    token: me._opts.conf.token || utils.getToken(),
                };
                pluginHandle.send({ message: register });
            },
            error: function (error: any) {
                // promptFailed('Janus登陆插件初始化失败！');
                console.error('Janus登陆插件初始化失败：' + error);
            },
            onmessage:(msg: any, jsep: any)=> {
                if (msg.error_code) {
                    console.error(msg.error);
                    console.error(
                        CONST_CODE.FAILED_CODE[msg.error_code] ||
                        '错误码：' + msg.error_code
                    );
                    return false;
                }
                const result = msg['result'];
                const event = result['event'];
                if (
                    result.error_code &&
                    result.error_code !== 0
                ) {
                    console.error(
                        CONST_CODE.FAILED_CODE[result.error_code] ||
                        '错误码：' + result.error_code
                    );
                }
                if (
                    result !== null &&
                    result !== undefined &&
                    result['event'] !== undefined &&
                    result['event'] !== null
                ) {
                    console.log('result event:' + event);
                    if (event === 'registration_failed') {
                        console.error(
                            'janus登陆失败: ' + result['code'] + ' ' + result['reason']
                        );
                        if (me.reLoginJanusItvIndex === -1) {
                            me.reLoginJanusItvIndex = setInterval(function () {
                                console.log('尝试重新登陆janus！');
                                me._initJanus();
                            }, 5000);
                        }
                        return;
                    }
                    if (event === 'video_server_closed') {
                        if (me.reLoginJanusItvIndex === -1) {
                            me.reLoginJanusItvIndex = setInterval(function () {
                                console.log('尝试重新登陆janus！');
                                me._initJanus();
                            }, 5000);
                        }
                        return;
                    }
                    if (event === 'registered') {
                        console.log(event);
                        const userToken = result['userToken'];
                        this.janusInfo = result;
                        this.janusRegistered = {
                            symbole: true,
                            sessionId: me._opts.janus.getSessionId(),
                        };
                        console.log('janus登陆成功');
                        this.videoListener.dispatch('setRegistered', {
                            symbole: true,
                            sessionId: me._opts.janus.getSessionId(),
                        });
                        const registered = {
                            symbole: true,
                            sessionId: me._opts.janus.getSessionId(),
                        };
                        if (me.reLoginJanusItvIndex !== -1) {
                            clearInterval(me.reLoginJanusItvIndex);
                            me.reLoginJanusItvIndex = -1;
                        }
                        // 自由组合
                        if (me._opts.freeWindow) {
                            return
                        }
                        // 初始化视频
                        let relativeIndex = 0;
                        for (
                            let i = me._opts.windowsBeginIndex;
                            i < me._opts.windowsBeginIndex + me._opts.windowsNum;
                            i++
                        ) {
                            me.VIDEO_DATA[i] = new SVideo(
                                {
                                    index: i,
                                    userToken: userToken,
                                    janus: janus,
                                    webcast: me._webcast,
                                    windowsNum: me._opts.windowsNum,
                                    relativeIndex: relativeIndex++,
                                    flag: me._opts.flag,
                                    isVideoTag: me._opts.isVideoTag,
                                    janusPlugin: me._opts.conf.janusPlugin,
                                    videoTipTimeOut: me._opts.videoTipTimeOut,
                                    isShowChangeResolution: me._opts.isShowChangeResolution,
                                    isShowChangeVideoSource: me._opts.isShowChangeVideoSource,
                                    parentSelector: me.selector,
                                    isWsPlay: me._opts.isWsPlay,
                                    showVideoName: me._opts.showVideoName,
                                },
                                me.videoListener,
                                registered
                            );
                        }
                    }
                }
            },
        });
    }

    /**
  * 初始化按钮点击事件
  */
    private _initBtnEvent(): void {
        const me = this;
        const videoFlagObj = document.querySelector(`${me.selector}`);

        if (!videoFlagObj) {
            // 在需要时处理错误或提前返回
            return;
        }

        // 处理分辨率切换
        const handleResolutionSwitch = (index: number): void => {
            const listDom = document.querySelectorAll(`${me.selector} li.screen`);
            for (let i = 0, len = listDom.length; i < len; i++) {
                const dom = listDom[i];
                const className = `.resolution-wrapper_${i}`;
                if (dom.getAttribute('index') !== index.toString()) {
                    dom.querySelector(className)?.classList.add('hide');
                } else {
                    dom.querySelector(className)?.classList.remove('hide');
                }
            }
        };

        // 处理接收音频事件
        const handleRecvAudio = (target: HTMLElement): void => {
            const index = Number(target.parentElement?.parentElement?.getAttribute('index'));
            if (!me.VIDEO_DATA[index].playing) {
                console.log('请选择播放的视频源！');
                return;
            }
            // 根据需要获取相关元素和数据
            const simulateClick = (element):void=> {
                    var event = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    element.dispatchEvent(event);
                }
            var businessType =
                    me.VIDEO_DATA[index].opts.businessType == undefined
                        ? me._opts.defaultBusinessType
                        : me.VIDEO_DATA[index].opts.businessType;

            if (target.getAttribute('class') === 'recv-audio-btn') {
                // 发送停止播放音频的请求
                if (this.isWsPlay||(me.VIDEO_DATA[index] && me.VIDEO_DATA[index].opts && me.VIDEO_DATA[index].opts.videoCodeType === 1 && utils.checkIsSupport() && (me.VIDEO_DATA[index].opts.tsFlag === 0||me.VIDEO_DATA[index].opts.tsFlag === undefined))) {
                    // H265 音频相关操作
                    me.VIDEO_DATA[index].operateWebcastAudio('stop_audio');
                } else {
                    // H264音频相关操作 （未做改动） 
                    me.VIDEO_DATA[index].operateAudio('stop_audio');
                }
                target.setAttribute('class', 'unrecv-audio-btn');
                me.VIDEO_DATA[index].tagBox.muted = true;
                
                var sendAudioBtn = target.parentNode.querySelector('.send-audio-btn');
                // 停止播放音频时 对讲也会关掉 开始
                if (businessType === 0) {
                    // 主线业务
                    if (sendAudioBtn?.getAttribute('class') === 'send-audio-btn') {
                        me.VIDEO_DATA[index].operateAudio('unsend_audio');
                        sendAudioBtn.setAttribute('class', 'unsend-audio-btn');
                        me.VIDEO_DATA[index].stream.getAudioTracks()[0].enabled = false;
                        // this.isOpenSpeekFlag = false;
                    }
                } else if (businessType === 1) {
                    // 勤指业务
                    if (sendAudioBtn?.getAttribute('class') === 'send-audio-btn') {
                        sendAudioBtn.setAttribute('class', 'unsend-audio-btn');
                        // 关闭点对点对讲
                        me.VIDEO_DATA[index].ptopPoc('close_ptop_poc', window.pocNo);
                        // this.isOpenSpeekFlag = false;
                    }
                }
                // 停止播放音频时 对讲也会关掉 结束
            } else {
                if (businessType === 0) {
                    // 发送前先关闭其它音频通道(包括接收和发送音频)
                    var lis = target.parentNode.parentNode.parentNode.children;
                    for (var i = 0; i < lis.length; i++) {
                        var btnIndex = parseInt(lis[i].getAttribute('index'));
                        if (index === btnIndex) {
                            continue;
                        }
                        var recvBtn = lis[i].querySelector('button[name="recvAudio"]');
                        var sendBtn = lis[i].querySelector('button[name="sendAudio"]');
            
                        if (recvBtn.getAttribute('class') === 'recv-audio-btn') {
                            if (me.VIDEO_DATA[btnIndex].playing) {
                                simulateClick(recvBtn); // 触发点击事件
                            }
                        }
                        if (sendBtn.getAttribute('class') === 'send-audio-btn') {
                            if (me.VIDEO_DATA[btnIndex].playing) {
                                simulateClick(sendBtn); // 触发点击事件
                            }
                        }
                    }
                    // 发送播放音频的请求
                    target.setAttribute('class', 'recv-audio-btn');
                    setTimeout(function() {
                        if (this.isWsPlay||(me.VIDEO_DATA[index] && me.VIDEO_DATA[index].opts && me.VIDEO_DATA[index].opts.videoCodeType === 1 && utils.checkIsSupport() && (me.VIDEO_DATA[index].opts.tsFlag === 0||me.VIDEO_DATA[index].opts.tsFlag === undefined))) {
                            me.VIDEO_DATA[index].operateWebcastAudio('play_audio');
                        } else {
                            me.VIDEO_DATA[index].operateAudio('recv_audio');
                        }
                        me.VIDEO_DATA[index].tagBox.muted = false;
                    }, 1000);
                } else if (businessType === 1) {
                    // poc新模式支持回传多个音频，因此不关闭
                    // 发送播放音频的请求
                    target.setAttribute('class', 'recv-audio-btn');
                   if (this.isWsPlay||(me.VIDEO_DATA[index] && me.VIDEO_DATA[index].opts && me.VIDEO_DATA[index].opts.videoCodeType === 1 && utils.checkIsSupport() && (me.VIDEO_DATA[index].opts.tsFlag === 0||me.VIDEO_DATA[index].opts.tsFlag === undefined))) {
                        me.VIDEO_DATA[index].operateWebcastAudio('play_audio');
                    } else {
                        me.VIDEO_DATA[index].operateAudio('recv_audio');
                    }
                    me.VIDEO_DATA[index].tagBox.muted = false;
                }
            }  
        };

        // 处理发送音频事件
        const handleSendAudio = (target: HTMLElement): void => {
            const index = Number(target.parentElement?.parentElement?.getAttribute('index'));
            // 其他发送音频事件的代码...
            var businessType = me.VIDEO_DATA[index].opts.businessType == undefined
                ? me._opts.defaultBusinessType
                : me.VIDEO_DATA[index].opts.businessType;
            if (businessType === 0) {
                // 主线业务
                if (target.getAttribute('class') === 'send-audio-btn') {
                    me.VIDEO_DATA[index].operateAudio('unsend_audio');
                    target.setAttribute('class', 'unsend-audio-btn');
                    if (this.isWsPlay||(me.VIDEO_DATA[index] && me.VIDEO_DATA[index].opts && me.VIDEO_DATA[index].opts.videoCodeType === 1 && utils.checkIsSupport() && (me.VIDEO_DATA[index].opts.tsFlag === 0||me.VIDEO_DATA[index].opts.tsFlag === undefined))) {
                        // me.VIDEO_DATA[index].stream.getAudioTracks()[0].enabled = false;
                    } else {
                        me.VIDEO_DATA[index].stream.getAudioTracks()[0].enabled = false;
                    }
                    // this.isOpenSpeekFlag = false;
                } else {
                    // if (!this.isOpenSpeekFlag) {
                        me.VIDEO_DATA[index].operateAudio('send_audio');
                        target.setAttribute('class', 'send-audio-btn');
                        if (this.isWsPlay||(me.VIDEO_DATA[index] && me.VIDEO_DATA[index].opts && me.VIDEO_DATA[index].opts.videoCodeType === 1 && utils.checkIsSupport() && (me.VIDEO_DATA[index].opts.tsFlag === 0||me.VIDEO_DATA[index].opts.tsFlag === undefined))) {
                            if (me.VIDEO_DATA[index].stream && me.VIDEO_DATA[index].stream !== null) {
                                // me.VIDEO_DATA[index].stream.getAudioTracks()[0].enabled = true;
                            }
                        } else {
                            me.VIDEO_DATA[index].stream.getAudioTracks()[0].enabled = true;
                        }
                }
            } else if (businessType === 1) {
                // 勤指业务
                if (target.getAttribute('class') === 'send-audio-btn') {
                    target.setAttribute('class', 'unsend-audio-btn');
                    // 关闭点对点对讲
                    me.VIDEO_DATA[index].ptopPoc('close_ptop_poc', window.pocNo);
                } else {
                        target.setAttribute('class', 'send-audio-btn');
                        // 发起点对点对讲
                        me.VIDEO_DATA[index].ptopPoc('open_ptop_poc', window.pocNo);
                }
            }
            
        };

        // 处理关闭视频事件
        const handleCloseVideo = (target: HTMLElement): void => {
            const index = Number(target.parentElement?.parentElement?.getAttribute('index'));
            // 通过 index 获取相关元素和数据
            const eleIndex =  Array.prototype.indexOf.call(target.parentNode.parentNode.parentNode.children, target.parentNode.parentNode);
            me.close(index,false,eleIndex);
        };

        // 处理前后摄像头切换事件
        const handleChangeVideoSource = (target: HTMLElement): void => {
            const index = Number(target.parentElement?.parentElement?.getAttribute('index'));
            const videoSource = me.VIDEO_DATA[index].videosource.toString();
            me.changeVideoSource(index, videoSource === '0' ? '1' : '0');
        };

        const handleockVideo = (target): void => {
            const index = Number(target.parentElement?.parentElement?.getAttribute('index'));

            if (!me.VIDEO_DATA[index].playing) {
                console.error('请选择播放的视频源！');
                return;
            }

            if (target.getAttribute('class') === 'lock-video-btn') {
                me.VIDEO_DATA[index].isLockVideo = false;
                target.setAttribute('class', 'unlock-video-btn');
            } else {
                me.VIDEO_DATA[index].isLockVideo = true;
                target.setAttribute('class', 'lock-video-btn');
            }

        };

        // 给相应按钮添加点击事件监听器
        videoFlagObj.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!target || typeof target.getAttribute !== 'function') {
                return;
            }

            const buttonName = target.getAttribute('name');

            if(buttonName==null||buttonName!== 'resolutionValue'){
                document.querySelectorAll(`${me.selector} .resolution-wrapper`).forEach((el) => {
                    el.classList.add('hide');
                });
            }

            if (buttonName === 'resolutionValue') {
                const index = Number(target.parentElement?.parentElement?.getAttribute('index'));
                handleResolutionSwitch(index);
            }else if (buttonName === 'changeResolution') {
                const index = Number(target.closest('[index]').getAttribute('index'));
                me.changeResolution(index, target.getAttribute('data-value'));
            } else if (buttonName === 'recvAudio') {
                e.stopPropagation();
                handleRecvAudio(target);
            } else if (buttonName === 'sendAudio') {
                e.stopPropagation();
                handleSendAudio(target);
            } else if (buttonName === 'closeVideo') {
                e.stopPropagation();
                handleCloseVideo(target);
            } else if (buttonName === 'changeVideoSource') {
                e.stopPropagation();
                handleChangeVideoSource(target);
            }else if (buttonName === 'lockVideo') {
                e.stopPropagation();
                handleockVideo(target);
            }
        });
    }

    private _initEventListen(): void {
        // 初始化事件监听的逻辑代码
        const _self = this;

        // 打开视频 {index, video, id, opts} index(视频窗口编号，从0开始) video(视频设备id，即devId) id(标识，空的话使用设备id) opts(其他参数)
        _self.addListener('openVideo', (e: { index: number; video: string; id: string; opts: any }) => {
            _self.play(e.index, e.video, e.id, e.opts);
        });

        // janus通知后台已关闭视频
        _self.addListener('notifyCloseVideo', (e: { index: number }) => {
            _self._notifyWaitingVideo(e.index);
        });

        _self.addListener('listChange', (e: { curList: any }) => {
            _self.changeList(e.curList);
        });

        // 通知重新打开视频
        _self.addListener('reOpenVideo', (e: any) => {
            _self._reOpenVideo(e);
        });

        // 通知重新打开视频
        // _self.addListener('changVideocodeType', (e: any) => {
        //     _self._changVideocodeType(e);
        // });

    }

    // _changVideocodeType(e: { index: number; id?: string; opts?: any }): void {
    //     setTimeout(() => {
    //         if (e && e.id) {
    //             e.opts.vi = 1;
    //             this.play(e.index, e.id, e.id, e.opts);
    //         }
    //     }, 1000);
    // }
    /**
 * 重新打开视频
 */
    private _reOpenVideo(e: { index: number; id?: string; opts?: any }): void {
        setTimeout(() => {
            if (e && e.id) {
                this.close(e.index);
                this.play(e.index, e.id, e.id, e.opts);
            }
        }, 1000);
    }

    public changeList(newList: number[]): void {
        const listDom: Element[] = Array.from(document.querySelectorAll(`${this.selector} li.screen`));
        const ul = document.querySelector(`${this.selector} ul.video-main`);
        const oldList: number[] = listDom.map((el) => Number(el.getAttribute('index')));
        const li: Element[] = [];
        for (const newIndex of newList) {
            const findIndex = oldList.findIndex((item) => item + 1 === newIndex);
            if (findIndex > -1) {
                li.push(listDom[findIndex]);
            }
        }
        li.forEach((el) => ul?.appendChild(el));
    }



    /**
   * 在视频界面上显示视频的信息 码率、分辨率、丢包率
   */
    private _showVideoInfo(): void {
        // 显示视频信息的逻辑代码
        const me = this;

        const clock = (): void => {
            if (!me.VIDEO_DATA) return;
            //   const videoDataList = Array.from(me.VIDEO_DATA);
            const videoDataArray = Object.values(me.VIDEO_DATA);
            for (const videoData of videoDataArray) {
                if (!videoData.playing) continue;

                const number = videoData.index + 1;
                const videoElement = document.querySelector(`${me.selector} #video-${number}`) as HTMLVideoElement;
                if (!videoElement) {
                    console.error(`找不到 id 为 [video-${number}] 的视频元素`);
                    videoData.playing = false;
                    continue;
                }

                const width = videoElement.videoWidth;
                const height = videoElement.videoHeight;
                const bitrate = videoData.sipcall.getBitrate();

                if (
                    !width ||
                    !height ||
                    !bitrate ||
                    bitrate.indexOf('kbits') === -1 ||
                    bitrate.indexOf('NaN') !== -1
                ) {
                    continue;
                }

                const config = videoData.sipcall.webrtcStuff;
                me._setPacketsLostRate(videoData.index, config, me);
                me._setFrameDecoded(videoData.index, config, me);

                let resolution = `${width}×${height}`;
                switch (height + '') {
                    case '1080':
                        resolution = '1080P';
                        break;
                    case '720':
                        resolution = '720P';
                        break;
                    case '480':
                        resolution = '480P';
                        break;
                    case '288':
                        resolution = 'CIF';
                        break;
                    default:
                        break;
                }

                const videoInfoElement = document.querySelector(`${me.selector} #info-${number}`) as HTMLVideoElement;

                if (!videoInfoElement) {
                    console.error(`找不到 id 为 [info-${number}] 的视频信息元素`);
                    continue;
                }

                const videoName = videoData.opts?.name || videoData.video;

                videoInfoElement.innerHTML = `${videoName}&nbsp;&nbsp;${resolution}<br>丢包率：${videoData.packetsLostRate}&nbsp;&nbsp;${bitrate.replace('kbits/sec', 'kbps')}`;

                const fontHeightSize = videoElement.clientHeight / 15;
                const fontWidthSize = videoElement.clientWidth / 18;
                let fontSize = fontHeightSize < fontWidthSize ? fontHeightSize : fontWidthSize;
                fontSize = !fontSize || fontSize > 20 ? 20 : fontSize;
                videoInfoElement.style.fontSize = `${fontSize}px`;
            }
        }

        // 如果已经存在定时器，先清除
        if (me.videoInfoTimer) {
            clearInterval(me.videoInfoTimer);
            me.videoInfoTimer = null;
        }

        me.videoInfoTimer = setInterval(clock, 1000);
    }

    private _showVideoName(): void {
        // 显示视频信息的逻辑代码
        const me = this;

        const clock = (): void => {
            if (!me.VIDEO_DATA) return;
            //   const videoDataList = Array.from(me.VIDEO_DATA);
            const videoDataArray = Object.values(me.VIDEO_DATA);
            for (const videoData of videoDataArray) {
                if (!videoData.playing) continue;

                const number = videoData.index + 1;
                
                const videoElement = document.querySelector(`${me.selector} #video-${number}`) as HTMLVideoElement;
                if (!videoElement) {
                    console.error(`找不到 id 为 [video-${number}] 的视频元素`);
                    videoData.playing = false;
                    continue;
                }

                const width = videoElement.videoWidth;
                const height = videoElement.videoHeight;

                if (
                    !width ||
                    !height
                ) {
                    continue;
                }
                const videoBottom = document.querySelector(`${me.selector} #speakName-${number}`) as HTMLVideoElement;
                
                if (!videoBottom) {
                    console.error(`找不到 id 为 [speakName-${number}] 的视频信息元素`);
                    continue;
                }

                const videoName = videoData.opts?.name || videoData.video;
                 videoBottom.innerHTML = `${videoName}`;
            }
        }

        // // 如果已经存在定时器，先清除
        if (me.videoNameTimers) {
            clearInterval(me.videoNameTimers);
            me.videoNameTimers = null;
        }

        me.videoNameTimers = setInterval(clock, 1000);
    }
    /**
  * 获取设置丢包率
  */
    private async _setPacketsLostRate(index: number, config: any, me: any): Promise<void> {
        if (!config.pc || !config.pc.getStats) return;

        try {
            const stats = await config.pc.getStats();
            stats.forEach((res: any) => {
                if (!res) return;

                let inStats = false;
                // Check if these are statistics on incoming media
                if (
                    (res.mediaType === 'video' ||
                        res.id.toLowerCase().indexOf('video') > -1) &&
                    res.type === 'inbound-rtp' &&
                    res.id.indexOf('rtcp') < 0
                ) {
                    inStats = true;
                } else if (
                    res.type == 'ssrc' &&
                    res.bytesReceived &&
                    (res.googCodecName === 'VP8' || res.googCodecName === '')
                ) {
                    // Older Chrome versions
                    inStats = true;
                }

                // Parse stats now
                if (inStats) {
                    if (res.hasOwnProperty('packetsLost')) {
                        if (!res.packetsLost || isNaN(res.packetsLost) || res.packetsLost == '0' || res.packetsLost == 'NaN') {
                            me.VIDEO_DATA[index].packetsLostRate = '0.00%';
                        } else {
                            const packetsLost = Number(res.packetsLost) - Number(me.VIDEO_DATA[index].packetsLostSum);
                            const packetsReceived = Number(res.packetsReceived) - Number(me.VIDEO_DATA[index].packetsReceivedSum);
                            let packetsLostRate = 0;

                            // Prevent division by zero
                            if (packetsLost > 0) {
                                packetsLostRate = (Number(packetsLost) / (Number(packetsLost) + Number(packetsReceived))) * 100;
                            }

                            me.VIDEO_DATA[index].packetsLostRate = packetsLostRate.toFixed(2) + '%';
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching video statistics:', error);
        }
    }
    /**
   * 设置当前网络信号提示
   * @param index 当前打开视频的索引
   * @param config
   * @param me
   * @private
   */
    private async _setFrameDecoded(index: number, config: any, me: any): Promise<void> {
        if (!config.pc || !config.pc.getStats) return;

        try {
            const stats = await config.pc.getStats();
            stats.forEach((res: any) => {
                if (!res) return;

                let inStats = false;
                // Check if these are statistics on incoming media
                if (
                    (res.mediaType === 'video' ||
                        res.id.toLowerCase().indexOf('video') > -1) &&
                    res.type === 'inbound-rtp' &&
                    res.id.indexOf('rtcp') < 0
                ) {
                    inStats = true;
                } else if (
                    res.type === 'ssrc' &&
                    res.bytesReceived &&
                    (res.googCodecName === 'VP8' || res.googCodecName === '')
                ) {
                    // Older Chrome versions
                    inStats = true;
                }

                // Parse stats now
                if (inStats) {
                    if (res.hasOwnProperty('framesDecoded')) {
                        if (res.framesDecoded <= 1) return;

                        if (typeof me.VIDEO_DATA[index].framesDecodedCount === 'undefined') {
                            me.VIDEO_DATA[index].framesDecodedCount = 0;
                        }
                        if (typeof me.VIDEO_DATA[index].framesDecodedLast === 'undefined') {
                            me.VIDEO_DATA[index].framesDecodedLast = res.framesDecoded;
                        }

                        if (res.framesDecoded > me.VIDEO_DATA[index].framesDecodedLast) {
                            if (
                                typeof me.VIDEO_DATA[index].tipDom !== 'undefined' &&
                                me.VIDEO_DATA[index].tipDom.style.display === 'block'
                            ) {
                                me.VIDEO_DATA[index].tipDom.style.display = 'none';
                            }
                        }

                        me.VIDEO_DATA[index].framesDecodedCount++;

                        // 定时检测
                        if (me.VIDEO_DATA[index].framesDecodedCount === me.configOpt) {
                            if (res.framesDecoded - me.VIDEO_DATA[index].framesDecodedLast === 0) {
                                // 卡顿
                                if (typeof me.VIDEO_DATA[index].tipDom === 'undefined') {
                                    const numIndex = index + 1;
                                    // me.VIDEO_DATA[index].tipDom = document.getElementById(
                                    //     `frame-decoded-${numIndex}`
                                    // );
                                    me.VIDEO_DATA[index].tipDom = document.querySelector(`${me.selector} #frame-decoded-${numIndex}`)
                                }

                                if (me.VIDEO_DATA[index].tipDom) {
                                    me.VIDEO_DATA[index].tipDom.style.display = 'block';
                                }
                            }

                            me.VIDEO_DATA[index].framesDecodedCount = 0;
                            me.VIDEO_DATA[index].framesDecodedLast = res.framesDecoded;
                        } else {
                            me.VIDEO_DATA[index].framesDecodedLast = res.framesDecoded;
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching frame decoded statistics:', error);
        }
    }
    /**
* 设备可用性检查（扬声器、麦克风、分辨率、浏览器类型）
* 1. 未检测（status == undefined）询问进入检测界面
* 2. 检测完成按相应结果给予相应提示
* 3. 拒绝检测按所有检测通过处理
* 4. 程序自行检测，并将是否加载声卡结果放入window对象
* 
*/
    private _checkDevices(): void {
        const tipCountKey = 'DEVICES_CHECK_TIP_COUNT';
        const statusKey = 'DEVICES_CHECK_STATUS';
        const checkCompleted = 'completed';
        const checkRejected = 'rejected';
        const microResultKey = 'MICRO_RESULT';
        const speakerResultKey = 'SPEAKER_RESULT';
        const screenResultKey = 'SCREEN_RESULT';
        const resultPass = 'pass';
        const resultNotPass = 'not pass';

        const tipCount = sessionStorage.getItem(tipCountKey);
        const status = localStorage.getItem(statusKey);

        if ((tipCount === undefined || tipCount === '0') && status === undefined) {
            sessionStorage.setItem(tipCountKey, '1');
            // 弹窗讯问是否进入检测界面
            if (confirm('您还没有检测硬件设备，是否先进行检测？')) {
                window.open('/scooper-video/new/checkDevices');
            } else {
                localStorage.setItem(statusKey, checkRejected);
            }
            return;
        }

        if (status === checkCompleted) {
            const microResult = localStorage.getItem(microResultKey) || resultPass;
            const speakerResult = localStorage.getItem(speakerResultKey) || resultPass;
            const screenResult = localStorage.getItem(screenResultKey) || resultPass;
            let msg = '';

            if (speakerResult === resultNotPass) {
                msg += '检测到扬声器异常，可能影响系统某些功能的使用！';
            }

            if (microResult === resultNotPass) {
                msg += '检测到麦克风异常，可能影响系统某些功能的使用！';
            }

            if (screenResult === resultNotPass) {
                msg += '您的屏幕分辨率过低，可能导致页面布局混乱！';
            }

            const userAgent = navigator.userAgent;
            if (
                userAgent.toLowerCase().indexOf('chrome') < 0 &&
                userAgent.toLowerCase().indexOf('firefox') < 0 &&
                userAgent.toLowerCase().indexOf('edge') < 0
            ) {
                msg += '当前浏览器下部分功能可能存在兼容问题，建议使用谷歌浏览器！';
            }

            if (msg !== '') {
                // 提示并派发消息
                console.log(msg);

                // 防止外部未监听消息就派发事件
                setTimeout(() => {
                    this.videoListener.dispatch('msginfo', { msg });
                }, 3000);
            }
        }
    }


    /**
     * 添加事件
     */
    addListener(type: string, handler: (e: any) => void, key?: any): void {
        this.videoListener.addListener(type, handler, key);
    }

    /**
     * 删除事件
     */
    removeListener(type: string, handler: (e: any) => void): void {
        this.videoListener.removeListener(type, handler);
    }

    /**
     * 派发事件
     */
    dispatch(e: any, options?: any): void {
        this.videoListener.dispatch(e, options);
    }

    /**
     * 清空事件
     */
    removeAllListeners(): void {
        this.videoListener.removeAllListeners();
    }

    /* ----------------------------- 播放队列 --------------------------- */

    /**
   * 添加等待视频数据
   * 同一位置再次打开，则覆盖上一次的
   * 参数：index(视频窗口编号，从0开始) video(视频设备id，即devId) id(标识，空的话使用设备id) opts(其他参数)
   */
    private _addWaitingVideo(index: number, video: string, id: string, opts: any): void {
        let isOverride = false;
        for (let i = 0; i < this.WAITING_DATA.length; i++) {
            if (this.WAITING_DATA[i].index === index) {
                console.log(`播放队列中 index = ${index}, video = ${this.WAITING_DATA[i].video} 替换为 video = ${video}`);
                this.WAITING_DATA[i] = { index, video, id, opts };
                isOverride = true;
                break;
            }
        }
        if (!isOverride) {
            this.WAITING_DATA.push({ index, video, id, opts });
            console.log(`index = ${index}, video = ${video} 加入播放队列`);
        }
        this.VIDEO_DATA[index].isWaiting = true;
    }

    /**
     * 删除等待视频数据
     */
    private _removeWaitingVideo(index: number, video: string): void {
        for (let i = 0; i < this.WAITING_DATA.length; i++) {
            if (this.WAITING_DATA[i].index === index && this.WAITING_DATA[i].video === video) {
                this.WAITING_DATA.splice(i, 1);
                this.VIDEO_DATA[index].isWaiting = false;
                console.log(`index = ${index}, video = ${video} 从播放队列移除`);
                break;
            }
        }
    }

    /**
     * 删除所有等待播放视频的数据
     */
    private _removeAllWaitingVideo(): void {
        this.WAITING_DATA = [];
        for (let index = this._opts.windowsBeginIndex; index < this._opts.windowsBeginIndex + this._opts.windows; index++) {
            this.VIDEO_DATA[index].isWaiting = false;
        }
    }

    /**
     * 上一个视频关闭后，如果该位置由等待视频，通知打开新视频
     * @param index
     */
    private _notifyWaitingVideo(index: number): void {
        for (const obj of this.WAITING_DATA) {
            if (obj.index === index) {
                this.play(obj.index, obj.video, obj.id, obj.opts);
                this._removeWaitingVideo(obj.index, obj.video);
                break;
            }
        }
    }
    /* ----------------------------- 窗口事件 --------------------------- */

    /**
         * 关闭所有视频
         * TODO 不可关闭
         */
    closeAll(isSave: boolean = false): void {
        const me = this;
        // 清除所有等待播放队列
        if (me.VIDEO_DATA.length===0) {
            return;
        }
        me._removeAllWaitingVideo();
        for (let i = me._opts.windowsBeginIndex; i < me._opts.windowsBeginIndex + me.VIDEO_DATA.length; i++) {
            me.close(i, isSave);
        }
    }
    /**
     * 关闭指定窗口的视频
     */
    close(index: number, isSave?: boolean, elementIndex?: number): void {
        if (index < 0 || index > this.VIDEO_DATA.length - 1) {
            console.info('index参数错误');
            return;
        }

        const videoData = this.VIDEO_DATA[index];
        const opts = videoData.opts;

        if (this.isWsPlay || (opts && opts.videoCodeType == 1 && this._webcast != null && utils.checkIsSupport() && opts.tsFlag == 0)) {
            videoData.webCastClose(videoData.id); // h265
        } else if (opts && opts.isFilePlay) {
            videoData.fileClose(videoData.id, index);
        } else {
            videoData.close();
        }

        if (!isSave&&videoData.id) {
            videoData.closeType = 'close';
            videoData.elementIndex = elementIndex !== undefined ? elementIndex.toString() : null;
            this.videoListener.dispatch('afterclose', videoData);
        }

        if (this._opts.freeWindow) {
            // 删除视频数据
            this.VIDEO_DATA.splice(index, 1);
        }
    }

    

    /**
     * 获取当前选择窗口的视频video
     */
    private getInChoiceVideo(): VideoData | undefined {
        const selView = document.querySelector(`${this.selector} li.sel`);
        if (selView) {
            const index = selView.getAttribute('index');
            if (index && this.VIDEO_DATA[index].video) {
                return this.VIDEO_DATA[index];
            }
        }
        return undefined;
    }

    /**
         * 设置鼠标选中窗口
         */
    setChoiceWindow(index: number): void {
        const screens = document.querySelectorAll(`${this.selector} li.screen`);
        if (screens[index]) {
            (screens[index] as HTMLElement).click();
        }
    }

    /**
     * 设置窗口数量并进行相应操作。
     * @param num - 窗口数量。
     * @param extra - 额外选项，包括是否竖排样式。
     */
    setWindowsNum(num: number, extra?: { vertical?: boolean }): void {
        const me = this;
        // 切换屏幕后 选中空闲最小的窗口
        if (me._opts.windows !== num && me._getMinIndexFreeWindow() !== -1) {
            me.setChoiceWindow(me._getMinIndexFreeWindow());
        }
        // 如果策略关闭多余窗口的视频，则进行相应操作
        if (!me._opts.openChangeWindowStrategy) {
            const lastWindowNum = Number(me._opts.windows);
            if (lastWindowNum >= Number(num)) {
                for (let closeIndex = num; closeIndex < lastWindowNum; closeIndex++) {
                    // Not sure about the purpose, you can replace this with the correct type
                    const listDom = document.querySelectorAll(`${me.selector} li.screen`);
                    const realCloseIndex = Number(closeIndex);
                    const videoIndex = Number((listDom[realCloseIndex] as HTMLElement).getAttribute('index'));
                    // if (videoIndex > Number(num) - 1) {
                        me.VIDEO_DATA[videoIndex] && me.close(videoIndex);
                    // }
                }
            }
        }
        document.querySelector(`${me.selector} .video-main`)?.classList.remove('mode-4-vertical');
        if (num === 4 && extra && extra.vertical) { // 分屏4 且是竖排样式
            // document.querySelector(`${me.selector} .video-main`)?.classList.remove(`mode-${me._opts.windows}`).add(`mode-${num}-vertical`);
            document.querySelector(`${me.selector} .video-main`)?.classList.replace(`mode-${me._opts.windows}`,`mode-${num}-vertical`);
        } else {
            document.querySelector(`${me.selector} .video-main`)?.classList.replace(`mode-${me._opts.windows}`, `mode-${num}`)
            // document.querySelector(`${me.selector} .video-main`)?.classList.remove(`mode-${me._opts.windows}`).add(`mode-${num}`);
        }
        const _li = document.querySelectorAll(`${me.selector} li.screen`);
        for (let i = 0; i < _li.length; i++) {
            (_li[i] as HTMLElement).style.display = "none";
        }
        me._opts.windows = num;
        for (let i = 0; i < num; i++) {
            (_li[i] as HTMLElement).style.display = "block";
        }
        // 分屏切换事件
        this.dispatch('screenchange', { windowNums: num, flag: me._opts.flag, extra: extra });
    }

    gisSetWindowsNum(num: number,showNumber:number): void {
        const me = this;
        // 如果策略关闭多余窗口的视频，则进行相应操作
        const _li = document.querySelectorAll(`${me.selector} li.screen`);
        (_li[num] as HTMLElement).style.display = "none";
        _li[num].parentNode.insertBefore(_li[num], _li[15].nextSibling);
        const after_li = document.querySelectorAll(`${me.selector} li.screen`);
        me._opts.windows -=1;
        for (let i = 0; i < showNumber; i++) {
            (after_li[i] as HTMLElement).style.display = "block";
        }

    }

    gisRecoverWindowsNum({index,videoId,opts}): void {
        // 如果策略关闭多余窗口的视频，则进行相应操作
        // const _li = document.querySelectorAll(`${me.selector} li.screen`);
        this.setChoiceWindow(index);
        this.playInChoice(videoId,videoId,opts);
        // (_li[index] as HTMLElement).style.display = "block";
    }

    setSpeakType(opts: any): void {
        var playIndex = this.isPlaying(opts.tel);
        if (playIndex==-1) {
            return
        }
        var element = this.VIDEO_DATA[playIndex].tagBox.parentElement.querySelector('.change-bottom-info .speakType');
        if (element) {
            ['speak', 'audience', 'speak_start', 'speak_stop'].forEach(function(className){
                if (element.classList.contains(className)) {
                    element.classList.remove(className)
                }
            });
            element.classList.add(opts.level);
        }
    }

    /**
    * 获取编号最小的空闲窗口的编号， 正在播放或有视频在等待播放标识不是空闲窗口
    * @param index 当前窗口的索引
    * @returns 空闲窗口的编号，若没有空闲窗口则返回-1
    */
    private _getMinIndexFreeWindow(index?: number): number {
        index = index || this._opts.windowsBeginIndex;
        const listDom = document.querySelectorAll(`${this.selector} li.screen`);
        for (let i = 0; i < this._opts.windowsBeginIndex + this._opts.windows; i++) {
            const videoIndex = Number(listDom[i].getAttribute('index'));
            if (!this.VIDEO_DATA[videoIndex].playing && !this.VIDEO_DATA[videoIndex].isWaiting) {
                return videoIndex;
            }
        }
        return -1;
    }

    /**
     * 获取选中的窗口的 index
     * @returns 选中窗口的编号，若未选中窗口则返回-1
     */
    private _getChoiceWindow(): number {
        const selView = document.querySelector(`${this.selector} li.sel`);
        if (selView) {
            return Number(selView.getAttribute('index'));
        }
        return -1;
    }

    /**
     * 获取下一窗口
     * @param old 上一个窗口的编号
     * @returns 下一个窗口的编号，若无下一个窗口则返回undefined
     */
    getNextWindowsNum(old: number): number | undefined {
        const windowsArr = this._windowsArr;
        for (let index = 0; index < windowsArr.length; index++) {
            if (index === windowsArr.length - 1) {
                return windowsArr[index];
            }
            if (old === windowsArr[index]) {
                return windowsArr[index + 1];
            }
        }
        return undefined;
    }

    /**
     * 双击某个视频全屏
     */
    private _dbClickFullScreen(): void {
        const videoBoxes = document.querySelectorAll(`${this.selector} .video-main .video-box`);
        videoBoxes.forEach((el) => {
            el.addEventListener('dblclick', () => this._fullScreenEvent(el));
        });
    }

    /**
     * 全屏事件
     */
    private _fullScreenEvent(el:any): void {
        const isFullscreen = el.fullscreenElement || el.webkitFullscreenElement || el.msFullscreenElement;
        if (!isFullscreen) {
            // 进入全屏,多重短路表达式
            (el.requestFullscreen && el.requestFullscreen()) ||
            (el.mozRequestFullScreen && el.mozRequestFullScreen()) ||
                (el.webkitRequestFullscreen && el.webkitRequestFullscreen()) ||
                (el.msRequestFullscreen && el.msRequestFullscreen());
        }
    }
    /**
 * 设置鼠标选中窗口
 */
    private _initWindowEvent(): void {
        const me = this;
        const screens = document.querySelectorAll<HTMLElement>(`${this.selector} li.screen`);
        let src: HTMLElement | null = null;

        // 视频窗口选中
        screens.forEach((screen) => {
            screen.addEventListener('click', () => {
                screens.forEach((s) => s.classList.remove('sel'));
                screen.classList.add('sel');
                // 如果视频正在播放则分发点击消息
                const inChoiceVideo = me.getInChoiceVideo();
                if (inChoiceVideo) {
                    me.dispatch('click', inChoiceVideo);
                }
            });
            if (!me._opts.draggable) {
                screen.addEventListener('dragstart', (ev) => {
                    src = screen;
                });
    
                screen.addEventListener('dragover', (ev) => {
                    ev.preventDefault();
                });
    
                screen.addEventListener('drop', (ev) => {
                    ev.preventDefault();
                    if (src?.outerHTML === screen.outerHTML) {
                        return;
                    }
                    const target = screen;
                    const srcIndex = Array.from(document.querySelectorAll<HTMLElement>(`${this.selector} li.screen`)).indexOf(src!);
                    const targetIndex = Array.from(document.querySelectorAll<HTMLElement>(`${this.selector} li.screen`)).indexOf(target);
                    
                    // if (srcIndex > targetIndex) {
                    //     target.insertAdjacentElement('beforebegin', src!);
                    //     src?.insertAdjacentElement('afterend', screens[targetIndex-1]);
                    //     me.dispatch('dragEnd', me.VIDEO_DATA);
                    // } else {
                    //     target.insertAdjacentElement('afterend', src!);
                    //     src?.insertAdjacentElement('beforebegin', screens[targetIndex-1]);
                    //     me.dispatch('dragEnd', me.VIDEO_DATA);
                    // }
                    if (srcIndex > targetIndex) {
                        target.parentNode.insertBefore(src, target);
                        var screenElement = document.querySelectorAll(me.selector + ' .video-main li.screen')[srcIndex];
                        screenElement.parentNode.insertBefore(target, screenElement.nextSibling);
                        me.dispatch('dragEnd', { target: target, srcIndex: srcIndex, targetIndex: targetIndex, opt: me.VIDEO_DATA });
                    } else {
                        target.parentNode.insertBefore(src, target.nextSibling);
                        var screenElement = document.querySelectorAll(me.selector + ' .video-main li.screen')[srcIndex];
                        screenElement.parentNode.insertBefore(target, screenElement);
                        me.dispatch('dragEnd', { target: target, srcIndex: srcIndex, targetIndex: targetIndex, opt: me.VIDEO_DATA });
                    }
                    src = null;
                });
            }
            
        });
    }

    /**
* 控制指定视频编号的文件
* @param index 视频编号
* @param opts 控制选项
*/
    fileControl(index: number, opts: any): void {
        this.VIDEO_DATA[index].fileControl(this.VIDEO_DATA[index].id, index, opts);
    }

    /**
     * 关闭指定视频编号正在播放的视频
     * @param video 视频ID
     * @param isSave 是否保存关闭状态
     */
    closeByVideo(video: string, isSave: boolean,iscloseVideoId:boolean): void {
        if (video == undefined) {
            console.info('video参数错误');
            return;
        }

        const videoData = this.VIDEO_DATA;
        if (!videoData || videoData.length == 0) {
            return;
        }

        if (iscloseVideoId) {
            const playIndex = this.isPlaying(video)
            if (playIndex>-1) {
                const listDom = document.querySelectorAll(`${this.selector} .screen`);
                listDom[playIndex].setAttribute('video-id', '');
                listDom[playIndex].setAttribute('video-name', '');
            }
        }
        for (const data of videoData) {
            if (video == data.video) {
                this.close(data.index);
                if (!isSave) {
                    data.closeType = 'close';
                    // this._opts.windows -=1;
                    this.dispatch('afterclose', data);
                }
                
            }
        }
    }

    clearScreen(video: string): void {
        if (video == undefined) {
            console.info('video参数错误');
            return;
        }
        
        const listDom = Array.from(document.querySelectorAll(`${this.selector} .screen`));
        for (const dom of listDom) {
            const videoId = dom.getAttribute('video-id');
            if (videoId === video) {
                dom.setAttribute('video-id', '');
                dom.setAttribute('video-name', '');
            }
        }
    }


    /**
     * 获取视频窗口数
     * @returns 窗口数
     */
    getWindowsNum(): number {
        return this._opts.windows;
    }
    /* -----------------------------播放事件 --------------------------- */
    
    /**
     * 播放视频
     * 参数：index(视频窗口编号，从0开始) video(视频设备id，即devId) id(标识，空的话使用设备id) opts(其他参数)
     * opts.businessType  0:调度业务  1：勤指
     * 返回true/false
     */

    play(index: number, video: string, id: string, opts?: { name?:string,videoCodeType?: number, videopoc?: number, isFilePlay?: true, path?: any, tsFlag?: number,isReplace?:boolean }): boolean {
        const me = this;
        if (me.waitPlayQueueSwitch && me.VIDEO_DATA[index].isClosing) {
            me._addWaitingVideo(index, video, id, opts);
            return false;
        }
        let realIndex: number = 0;
        const listDom = document.querySelectorAll(`${me.selector} .screen`);
        for (let i = 0; i < listDom.length; i++) {
            const videoIndex = Number(listDom[i].getAttribute('index'));
            if (index === videoIndex) {
                realIndex = i;
                break;
            }
        }
        listDom[realIndex].setAttribute('video-id', video);
        listDom[realIndex].setAttribute('video-name', opts?.name);
        console.log(`play >>> video=${video}; id=${id}; index=${index}`);
        console.log(`plays >>> video=${video}; id=${id}; index=${realIndex}`);
        me.videoListener.dispatch('beforeplay', { index: realIndex, video: video, id: id });
        if (index < 0) {
            console.error('index参数错误');
            return false;
        }
        console.log('=======opts', opts);
        if (opts && opts.isFilePlay) {
            // 是否是FilePlay类型，可以逐帧播放
            me.VIDEO_DATA[index].opts = opts;
            me.VIDEO_DATA[index].filePlay(video, opts.path);
        }else if (this.isWsPlay) {
            // h265 tsFlag=0 没有转码
            me.VIDEO_DATA[index].webCastPlay(video, opts, me);
        }else if (opts && opts.videoCodeType === 1 && me._webcast !== null && (opts.tsFlag === 0||opts.tsFlag === undefined)) {
            if (!utils.checkIsSupport()) {
                me.videoListener.dispatch('errorMsg', {msg:'该浏览器不支持H265'});
                return false;
            }else{
                me.VIDEO_DATA[index].webCastPlay(video, opts, me);
            }
            // h265 tsFlag=0 没有转码
        }else if (opts && opts.videopoc?.toString()) {
            me.VIDEO_DATA[index].play(video, opts.videopoc);
        } else {
            me.VIDEO_DATA[index].play(video);
        }
        
        if (me.VIDEO_DATA[index].playing) {
            me.VIDEO_DATA[index].opts = opts;
            me.VIDEO_DATA[index].id = id;
            me.VIDEO_DATA[index].handlePlay = false;
            me.VIDEO_DATA[index].realIndex = realIndex;
            me.VIDEO_DATA[index].playSuccess = function (index: number) {
                me.videoListener.dispatch('playsuccess', me.VIDEO_DATA[index]);
            };
            const data = {
                index: realIndex,
                opts: opts,
                id: id
            };
            console.log(data);
            me.videoListener.dispatch('playsuccessByRealIndex', data);
            return true;
        }
        return false;
    }

    /**
     * 播放所有视频
     */
    playAll(array: { video: string; id: string; opts?: any }[]): void {
        if (array.length > this._opts.windows) {
            throw new Error('windows is not enough');
        }

        const me = this;
        me.closeAll();
        array.forEach((obj, i) => {
            me.play(i, obj.video, obj.id, obj.opts);
        });
    }

    /**
     * 在鼠标选中的窗口中播放视频
     */
    playInChoice(video: string, id: string, opts?: any): void {
        const me = this;
        const selView = document.querySelector(`${me.selector} li.sel`);
        if (selView) {
            const index = selView.getAttribute('index') as any;
            if (me.VIDEO_DATA[index]?.playing) {
                me.close(index);
                //延时打开  禁止同时一关一开
                setTimeout(() => {
                    me.play(index, video, id, opts);
                }, 1000);
            } else {
                me.play(index, video, id, opts);
            }
        }
    }

    /**
  * 检索当前点的视频是否被播放，被播放则返回播放的视频窗口
  */
    isPlaying(id: number|string): number | -1 {
        let index: number | -1 = -1;
        const videoStatus = this.VIDEO_DATA;
    
        for (const key in videoStatus) {
            if (videoStatus.hasOwnProperty(key)) {
                const val = videoStatus[key];
                if (id === val.id&&val.playing) {
                    index = parseInt(key, 10); // 将字符串转换为数字
                    break;
                }
            }
        }
    
        return index;
    }
    
    


    /**
     * 判断指定窗口是否正在播放视频
     */
    isPlayingByIndex(index: number): boolean {
        const me = this;
        const _li = document.querySelectorAll(`${me.selector} li.screen`);
        const videoIndex = Number((_li[index] as HTMLElement).getAttribute('index'));
        // return me.VIDEO_DATA[videoIndex].playing;
        // if (index > me.VIDEO_DATA?.length - 1 || index < 0) return false;
        return me.VIDEO_DATA[videoIndex]?.playing;
    }

    /**
   * 在序号最小的空闲窗口播放视频
   * 参数：index(视频窗口编号，从0开始) video(视频设备id，即devId) opts(其他参数)
   * 返回true/false
   */
    playByOrder(video: string, id: string, opts:any,isReplace=true): any {
        const freeWindow = this._getMinIndexFreeWindow();
        if (freeWindow === -1 && this._opts.windowsNum > 1) {
            if(isReplace){
                if (this.VIDEO_DATA[0]?.playing) {
                    this.close(0);
                    //延时打开  禁止同时一关一开
                    setTimeout(() => {
                        this.play(0, video, id, opts);
                    }, 1000);
                } else {
                    this.play(0, video, id, opts);
                }
            }
            return false;
        }
        return this.play(freeWindow, video, id, opts);
    }

    /**
     * 在序号最小的空闲窗口播放视频 只在当前分屏情况下查找
     * 参数：index(视频窗口编号，从0开始) video(视频设备id，即devId) opts(其他参数)
     * 返回true/false
     */
    playByOrderInSceen(video: string, id: string, opts: any): boolean {
        const freeWindow = this._getMinIndexFreeWindow();
        return this.play(freeWindow, video, id, opts);
    }


    playByOrderAll({ videoArray, isExpand = true}): any {
        if (isExpand) {
            // 自动扩展窗口
            videoArray.forEach((obj) => {
                this.playByOrderExpandWindow(obj.video, obj.video, obj.opt,false);
            });
        } else {
            // 如果不自动扩展窗口，则判断窗口数是否足够
            videoArray.forEach((obj) => {
                this.playByOrder(obj.video, obj.video, obj.opts,false);
            });
        }
    }
    
    /**
     * 扩展视频窗口数的播放方式
     */
    playByOrderExpandWindow(video: string, id: string, opts: any,isReplace=true): any {
        if (this.isPlaying(video)!=-1) {
            this.videoListener.dispatch('playError',{data:this.isPlaying(video),msg:'该视频正在播放'})
            console.log('该视频正在播放')
            return
        }
        let freeWindow = this._getMinIndexFreeWindow();
        const maxWindows = this._opts.windowsNum || 16;
        while (this._opts.windows < maxWindows && freeWindow === -1) {
            const arrIndex = this._opts.windowsArr.indexOf(this._opts.windows * 1)
            if (arrIndex !== -1) {
                if (opts.vertical) {
                    this.setWindowsNum(this._opts.windowsArr[arrIndex + 1], { vertical: opts.vertical });
                } else {
                    this.setWindowsNum(this._opts.windowsArr[arrIndex + 1]);
                }
            }else{
                console.log('no free window');
                return;
            }
            freeWindow = this._getMinIndexFreeWindow();
        }
        if (this._getChoiceWindow() === -1 && this._getMinIndexFreeWindow() !== -1) {
            this.setChoiceWindow(this._getMinIndexFreeWindow());
        }
        if (freeWindow === -1 && this._opts.windowsNum > 1) {
            if(isReplace){
                if (this.VIDEO_DATA[0]?.playing) {
                    this.close(0);
                    //延时打开  禁止同时一关一开
                    setTimeout(() => {
                        this.play(0, video, id, opts);
                    }, 1000);
                } else {
                    this.play(0, video, id, opts);
                }
            }
            return false
        }
        return this.play(freeWindow, video, id, opts);
    }

    newPlayByDom(video: string, opts: any,res:any): any {
        return this.play(res.index, video, video, opts);
    }




    /* ----------------------------- 功能事件 --------------------------- */

    //自定义发送janus消息
    sipCallSendMsg(msg: any): void {
        this.VIDEO_DATA[msg.index].sipCallSend(msg);
    }

    // 更新视频窗口名字的状态
    updateVideoNameStatus(tel:number,peopleName:string) {
        var playIndex = this.isPlaying(tel);
        if (playIndex>-1) {
            this.VIDEO_DATA[playIndex].opts.name = peopleName;
        }
    }
    /**
   * 获取视频数据
   */
    getVideoData() {
        return this.VIDEO_DATA;
    }

    /**
   * 开启对讲预呼叫
   * @param pocNo 对讲号码
   * @param centerTel 调度中心号
   * @returns 返回对讲预呼叫结果
   */
    openPocCall(pocNo: string, centerTel: string): any {
        const index = this._opts.windowsNum === 1 ? this._opts.windowsBeginIndex : this._getMinIndexFreeWindow();
        if (index < 0) {
            this.videoListener.dispatch('errorMsg', {msg:'窗口编号获取失败！'});
            console.error('窗口编号获取失败！');
        }
        // 保存对讲号码
        window.pocNo = pocNo;
        return this.VIDEO_DATA[index].pocCall('open_poccall', pocNo, centerTel);
    }

    /**
     * 关闭对讲预呼叫
     * @param pocNo 对讲号码
     * @param centerTel 调度中心号
     * @returns 返回关闭对讲预呼叫结果
     */
    closePocCall(pocNo: string, centerTel: string): any {
        const index = this._opts.windowsNum === 1 ? this._opts.windowsBeginIndex : this._getMinIndexFreeWindow();
        if (index < 0) {
            this.videoListener.dispatch('errorMsg', {msg:'窗口编号获取失败！'});
            console.error('窗口编号获取失败！');
        }
        this.VIDEO_DATA[index].stream = null;
        window.pocNo = '';
        return this.VIDEO_DATA[index].pocCall('close_poccall', pocNo, centerTel);
    }

    /**
     * 设置录像的businessId
     * @param businessId 业务ID
     */
    setRecordAvBusinessId(businessId: string): void {
        this.recordAvBusinessId = businessId;
    }

    /**
     * 开启音频
     * @param index 窗口编号
     */
    sendAudio(index: number): void {
        index = index != undefined ? index : this._opts.windowsBeginIndex;
        this.VIDEO_DATA[index].stream.getAudioTracks()[0].enabled = true;
    }

    /**
     * 关闭音频
     * @param index 窗口编号
     */
    unSendAudio(index: number): void {
        index = index != undefined ? index : this._opts.windowsBeginIndex;
        this.VIDEO_DATA[index].stream.getAudioTracks()[0].enabled = false;
    }

    /**
    * 切换前后摄像头
    * @param videoSource 0-后置摄像头   1-前置摄像头
    */
    changeVideoSource(index: number, videoSource: string): void {
        var me = this;
        return me.VIDEO_DATA[index].changeVideoSource('change_videosource', videoSource);
    }
    /**
     * 开始录像
     * @param index 窗口编号
     * @returns 返回开始录像的结果
     */
    startAvRecord(index: number): any {
        return this.VIDEO_DATA[index].recordAv('start_av_record', this.recordAvBusinessId);
    }

    /**
     * 结束录像
     * @param index 窗口编号
     * @returns 返回结束录像的结果
     */
    stopAvRecord(index: number): any {
        return this.VIDEO_DATA[index].recordAv('stop_av_record', this.recordAvBusinessId);
    }

    /**
     * 改变分辨率
     * @param index 窗口编号
     * @param resolution 新分辨率
     * @returns 返回改变分辨率的结果
     */
    changeResolution(index: number, resolution: string): any {
        return this.VIDEO_DATA[index].changeResolution('change_resolution', resolution);
    }
    /**
     * 设置全屏
     */
    setFullScreen($dom:any): void {
        this._fullScreenEvent($dom);
    }

    /**
     * 获取当前视频控件的配置项
     * @returns 返回当前视频控件的配置项
     */
    getVideoControllerOpts(): any {
        return this._opts;
    }

    /**
     * 获取截屏数据
     * @param index 窗口编号，可选参数。如果不提供，则使用当前选择窗口的index。
     * @param callback 回调函数
     */
    getScreenCaptureData(index?: number, callback?: (dataUrl: string) => void): void {
        const me = this;
        // 如果index为空则使用选中窗口的index
        const dataObj = me.VIDEO_DATA[index != undefined ? index : me._getChoiceWindow()];
        if (!dataObj.playing) {
            console.log('请选择播放的视频源！');
            return;
        }
        // const canvasObj = document.getElementById('myCanvas') as HTMLCanvasElement;
        const canvasObj = document.querySelector(`${me.selector} #myCanvas`) as HTMLCanvasElement;
        const videoObj = dataObj.tagBox;
        if (videoObj == undefined) {
            console.log('未选中窗口');
            return;
        }
        // 取流中 取视频框尺寸
        // 播放中 取视频画面尺寸
        if (dataObj.tagBox.parentElement?.querySelector('.stream-loading')) {
            canvasObj.width = dataObj.tagBox.offsetWidth;
            canvasObj.height = dataObj.tagBox.offsetHeight;
        } else {
            canvasObj.width = videoObj.videoWidth;
            canvasObj.height = videoObj.videoHeight;
        }
        const ctx = canvasObj.getContext('2d');
        ctx?.drawImage(videoObj, 0, 0, videoObj.videoWidth, videoObj.videoHeight);
        const dataUrl = canvasObj.toDataURL('image/jpeg');
        callback ? callback(dataUrl) : null;
    }

    /**
   * 视频回放
   * @param video 视频对象
   * @param startTime [YYYY-MM-DDTHH:mm:ss]
   * @param endTime 结束时间
   * @param opts 配置选项
   * @return 返回playId
   */
    playHistory(video: any, startTime: string, endTime: string, opts?: any): any {
        const me = this;
        let index;
        // 回放是一分屏的默认使用一个窗口
        if (me._opts.windowsNum == 1) {
            index = me._opts.windowsBeginIndex;
        } else {
            index = me._getMinIndexFreeWindow();
        }
        if (index < 0) {
            this.videoListener.dispatch('errorMsg', {msg:'窗口编号获取失败！'});
            console.error('窗口编号获取失败！');
        }
        me.setChoiceWindow(index);
        me.VIDEO_DATA[index].opts = opts;
        return me.VIDEO_DATA[index].playback(video, startTime, endTime);
    }

    /**
     * 关闭历史流
     * @param video 视频对象
     * @param index 窗口编号，可选参数。如果不提供，则使用当前选择窗口的index。
     */
    closeHistory(video: any, index?: number): any {
        if (!video) return;
        const me = this;
        if (!index) {
            if (me._opts.windowsNum == 1) {
                index = me._opts.windowsBeginIndex;
            } else {
                index = me._getChoiceWindow();
            }
        }
        return me.VIDEO_DATA[index].playbackControl(video, 'stop', 0);
    }

    /**
     * 历史流控制
     * @param video 视频对象
     * @param playType 播放类型（play、pause、stop）
     * @param playSpeed 播放速率
     * @param startTime 回放时间（暂时无用）
     */
    historyControl(video: any, playType: string, playSpeed: number, startTime?: string): any {
        const me = this;
        let index;
        if (me._opts.windowsNum == 1) {
            index = me._opts.windowsBeginIndex;
        } else {
            index = me._getChoiceWindow();
        }
        return me.VIDEO_DATA[index].playbackControl(video, playType, playSpeed, startTime);
    }

    /**
     * 保存视频列表
     */
    saveList(): void {
        this._saveList = utils.cloneObj(this.VIDEO_DATA);
    }

    /**
     * 播放保存的视频列表
     */
    playSaveList(): number {
        if (!this._saveList) {
            return;
        }
        this.closeAll();
        const me = this;
        let num=0;
        this._saveList.forEach((obj) => {
            if (obj.video) {
                me.play(obj.index, obj.video, obj.id, obj.opts);
                num++
            }
        });
        return num
    }
    /**
       * 询问是否无可用窗口
       */
    isUnavailable(): boolean {
        return this._opts.windows == 16 && this._getMinIndexFreeWindow() == -1;
    }
    /**
     * 切换当前屏幕显示
     * @param id 视频ID
     */
    changeCurscreen(id: number): void {
        const me = this;
        const videoMain = document.querySelector(me.selector + ' .video-main') as HTMLElement;
        if (videoMain) {
            videoMain.classList.remove('mode-' + me._opts.windows);
            videoMain.classList.add('mode-1'); //切换到一分屏
            me._opts.windows = 1;
        }
        // 隐藏除当前传入的id对应的视频信息外的其他视频信息
        const index = me.isPlaying(id); //当前index;
        const liElements = document.querySelectorAll(me.selector + ' li.screen') as NodeListOf<HTMLElement>;
        liElements.forEach((li) => {
            const curIndex = li.getAttribute('index') as any;
            if (curIndex == index) {
                li.style.display = 'block';
            } else {
                li.style.display = 'none';
            }
        });
    }


    /* ----------------------------- 轮巡功能事件 --------------------------- */


    /**
   * 执行轮巡
   * @param array 轮巡的视频设备数组 [{video: devId, id: devId, opts: {}}]
   * @param time 轮巡时间间隔（毫秒）
   */
    startPoll(array: any[], time: number): boolean {
        if (!array || array.length == 0) {
            console.log('请选择视频设备！');
            return false;
        }
        time = typeof time === 'number' && !isNaN(time) ? time : this._opts.pollInterval;
        this._pollArray = array;
        const me = this;
        const windowNum = me._opts.windows;
        let maxNum = array.length;
        let nowNum = 0;

        me.saveList();
        this._polltimer = new PollTimer(function (firstRun) {
            me.closeAll();
            if (firstRun) {
                for (let i = 0; i < windowNum; i++) {
                    if (nowNum == maxNum) {
                        nowNum = 0;
                        if (maxNum < windowNum) {
                            break;
                        }
                    }
                    me.playByOrder(array[nowNum].video, array[nowNum].id, array[nowNum].opts);
                    nowNum++;
                }
                me.dispatch('startpoll', array);
            } else {
                setTimeout(function () {
                    for (let i = 0; i < windowNum; i++) {
                        if (nowNum == maxNum) {
                            nowNum = 0;
                            if (maxNum < windowNum) {
                                break;
                            }
                            break;
                        }
                        me.playByOrder(array[nowNum].video, array[nowNum].id, array[nowNum].opts);
                        nowNum++;
                    }
                }, 1500)
            }
        }, time);

        return true;
    }

    /**
     * 根据在线/离线状态开始进行轮询
     * @param array 轮巡的视频设备数组 [{video: devId, id: devId, status: 'offline/online', opts: {}}]
     * @param time 轮巡时间间隔（毫秒）
     */
    startPollByStatus(array: any[], time?: number): boolean {
        if (!array || array.length == 0) {
            console.log('请选择视频设备！');
            return false;
        }
        time = typeof time === 'number' && !isNaN(time) ? time : this._opts.pollInterval;
        this._pollArray = array;

        const onlineArr = array.filter(item => item.video && item.status == 'online');
        this._onlineArray = onlineArr;

        const me = this;
        const windowNum = me._opts.windows;
        let maxNum = me._onlineArray.length;
        let nowNum = 0;

        me.saveList();
        this._polltimer = new PollTimer(function (firstRun) {
            me.closeAll();
            if (firstRun) {
                maxNum = me._onlineArray.length;
                for (let i = 0; i < windowNum; i++) {
                    if (nowNum == maxNum) {
                        nowNum = 0;
                        if (maxNum < windowNum) {
                            break;
                        }
                    }
                    const pollOnlineArr = me._onlineArray; // 循环当前在线的轮询数组
                    me.playByOrder(pollOnlineArr[nowNum].video, pollOnlineArr[nowNum].id, pollOnlineArr[nowNum].opts);
                    nowNum++;
                }
                me.dispatch('startpoll', array);
            } else {
                setTimeout(() => {
                    maxNum = me._onlineArray.length;
                    for (let i = 0; i < windowNum; i++) {
                        if (nowNum == maxNum) {
                            nowNum = 0;
                            if (maxNum < windowNum) {
                                break;
                            }
                            break;
                        }
                        const pollOnlineArr = me._onlineArray; // 循环当前在线的轮询数组
                        me.playByOrder(pollOnlineArr[nowNum].video, pollOnlineArr[nowNum].id, pollOnlineArr[nowNum].opts);
                        nowNum++;
                    }
                }, 1500)

            }
        }, time);

        return true;
    }

    /**
     * 更新轮询状态
     * @param newStatusArr 新的状态数组 [{video: '8001', id: '8001', status: 'online/offline', opts: {}}]
     */
    updatePollStatus(newStatusArr: any[]): void {
        console.log('状态改变了', newStatusArr);
        const _pollArray = this._pollArray;
        const _onlineArray = this._onlineArray;
        const that = this;

        if (newStatusArr && newStatusArr.length > 0) {
            newStatusArr.forEach((item) => {
                if (item.video && _pollArray && _pollArray.length > 0) {
                    _pollArray.forEach((arr) => {
                        if (arr.video && arr.video == item.video) {
                            arr.status = item.status;
                        }
                    });

                    if (item.status == 'offline') {
                        // 设备离线 如果在在线数组中从在线数组中删去
                        _onlineArray.forEach((poll, index) => {
                            if (poll.video == item.video) {
                                _onlineArray.splice(index, 1);
                            }
                        });
                        that._onlineArray = _onlineArray;
                    } else if (item.status == 'online') {
                        // 设备上线 如果在线数组中没有 则需要加入  如果
                        // 在线数组中是否存在该设备
                        const findIndex = _onlineArray.findIndex((poll) => poll.video == item.video);
                        if (findIndex < 0) {
                            // 没找到，说明设备上线了
                            const pollItemInfo = _pollArray.find((pol) => pol.video == item.video);
                            _onlineArray.push(pollItemInfo);
                        }
                        that._onlineArray = _onlineArray;
                    }
                }
            });

            that._pollArray = _pollArray;
        }
    }

    /**
   * 结束轮巡
   */
    stopPoll(): void {
        if (!this._polltimer) {
            return;
        }
        this._polltimer.stop();
        this._polltimer = undefined;
        console.log('------> 轮巡结束 <-------');
        this.dispatch('stoppoll', {});
        this._pollArray = null;
        this.closeAll();
        //恢复之前打开的视频
        //this.playSaveList();
    }

    /**
     * 暂停轮询
     */
    pausePoll(): void {
        if (!this._polltimer) {
            return;
        }
        this._polltimer.pause();
        // this.closeAll();
    }

    /**
     * 继续轮询
     */
    continuePoll(): void {
        if (!this._polltimer) {
            return;
        }
        this.startPollByStatus(this._onlineArray);
    }

    /**
     * 获取是否在轮巡
     */
    isPolling(): boolean {
        return !!this._polltimer;
    }

    /**
     * 对讲控制
     * @param type 控制类型
     * @param opts 控制选项
     * @param isStop 是否停止
     */
    holder(type: string, opts: any, isStop: boolean): boolean {
        const index = this._getChoiceWindow();
        if (index < 0) {
            console.log('请先选中视频');
            return false;
        }
        return this.VIDEO_DATA[index].holder(type, opts, isStop);
    }




}




export default VideoWebRtc;