/*
 * @Author: yangyue yangyue@scooper.com.cn
 * @Date: 2023-06-06 14:17:29
 * @LastEditors: yangyue yangyue@scooper.com.cn
 * @LastEditTime: 2024-02-28 10:39:11
 * @FilePath: \scooper-video\src\component\user.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import utils from "./utils";
import Janus from "../../libs/janus";
import api from './api';
import loadConfig from './loadConfig';
import { registered } from '../scooperVideo';
import CONST_CODE from "./const_code";

class SVideo {
    [x: string]: any;
    isShowChangeResolution: boolean;
    isShowChangeVideoSource: boolean;
    resolution: string; // 分辨率
    videoFileName: string; // 视频文件名
    _webcast: any; // webcast实例
    janus: any; // janus实例
    userToken: string; // 用户token
    sipcall: any; // sipcall实例
    index: number; // 当前分屏索引
    relativeIndex: number; // 当前分屏相对索引
    tagBox: any; // 当前分屏dom
    windowsNum: number; // 分屏数
    flag: number; // 当前分屏标识
    isVideoTag: boolean; // 是否是video标签
    janusPlugin: any; // janus插件实例
    isClosing: boolean = false; // 当前分屏是否正在关闭视频
    isWaiting: boolean = false; // 当前分屏是否有视频在等待播放
    videosource: number = 0;   // 后置摄像头：0，前置摄像头：1
    playSucTimeOutIndex: NodeJS.Timeout | number= -1; // 超时提示定时器index
    videoTipTimeOut: number; // 超时无首屏时间
    videoListener: any; // 视频监听
    registered: registered; // 注册回调
    video: any; // video实例
    isLockVideo: boolean = false; // 是否锁定视频
    playing: boolean = false; // 是否正在播放
    closeType:string = ''; // 关闭类型
    errorCode:number = null; // 错误码
    errorInfo:any = null; // 错误信息
    opts: any = {}; // 配置项
    fileTotalTime: number = 0; // 文件总时长
    fileCurrentTime: number = 0; // 文件当前时长
    fileSeekTime: number = 0; // 文件跳转时长
    stream: any = null; // 流数据
    packetsLostRate: string = '0.00%'; // 丢包率
    packetsLostSum: number = 0; // 丢包数
    packetsReceivedSum: number = 0; // 收包数
    isPlayBack: boolean = false; // 是否是回放
    framesDecodedLast: number = 0; // 上一次解码帧数
    framesDecodedCount: number = 0; // 解码帧数
    showVideoName:boolean = false;
    
    constructor(opts:any, videoListener: any, registered: registered) {
        this.showVideoName = opts.showVideoName;
        this.isShowChangeResolution = opts.isShowChangeResolution;
        this.isShowChangeVideoSource = opts.isShowChangeVideoSource;
        this.opts = opts;
        this._webcast = opts.webcast;
        this.janus = opts.janus;
        this.userToken = opts.userToken;
        this.sipcall = null;
        this.index = opts.index;
        this.relativeIndex = opts.relativeIndex;
        this.tagBox = opts.isVideoTag
            ? this.tagBox = document.querySelector(opts.parentSelector + ' #video-' + (this.index + 1))
            : this.tagBox = document.querySelector('#audio-' + (this.index + 1));
        if (!this.tagBox) {
            this.tagBox = document.querySelector(opts.parentSelector + ' #video-' + (this.index + 1))
        }
        this.windowsNum = opts.windowsNum;
        this.flag = opts.flag;
        this.isVideoTag = opts.isVideoTag;
        this.janusPlugin = opts.janusPlugin;
        this.videoTipTimeOut = opts.videoTipTimeOut||5; // 超时无首屏时间
        this.videoListener = videoListener;
        this.registered = registered;
        this.init();
    }
    /**
         * 初始化
         */
    init() {
        let me = this;
        this.janus.attach({
            plugin: this.janusPlugin
                ? this.janusPlugin
                : 'janus.plugin.videoserver',
            opaqueId: 'siptest-' + Janus.randomString(12),

            success: (pluginHandle)=> {
                console.log('视频插件初始化成功:' + this.index);
                this.tagBox.addEventListener('canplay', handlePlay);
                this.sipcall = pluginHandle;
                this.videoListener.dispatch('initsucc'+ this.index, this);
                if (this.relativeIndex + 1 >= this.windowsNum) {
                    this.videoListener.dispatch('initsucc', this);
                }
            },

            error: (error)=> {
                console.error('插件初始化失败' + error);
            },

            consentDialog: (on: boolean)=> {
                console.log(
                    'Consent dialog should be ' + (on ? 'on' : 'off') + ' now'
                );
            },

            onmessage: async(msg:any, jsep:any)=> {
                if (
                    !this.registered.symbole &&
                    this.registered.sessionId == this.janus.getSessionId()
                ) {
                    console.log('请先登陆');
                }
                // 新增ice失败重连
                if (msg["reason"]=='ICE Failed') {
                    setTimeout(()=> {
                        this.play(this.video);
                    }, 1500);
                    return;
                }

                const video = this.video;
                const recvAudioBtn = this.tagBox.parentNode.querySelector('.recv-audio-btn');
                const sendAudioBtn = this.tagBox.parentNode.querySelector('.send-audio-btn');
                if (msg.error_code) {
                    console.error(
                        '错误码：' +
                        msg.error_code +
                        ' ' +
                        CONST_CODE.FAILED_CODE[msg.error_code]
                    );
                    if (CONST_CODE.VIDEO_CODE === msg.error_code) {
                        this.videoListener.dispatch('showResult', this, msg.error_code, true, video);
                        // showResult(this, msg.error_code, true, video);
                        // 外面做判断
                    } else {
                        console.log(
                            CONST_CODE.OTHER_CODE[msg.error_code] ||
                            CONST_CODE.FAILED_CODE[msg.error_code] ||
                            '错误码：' + msg.error_code
                        );
                    }
                    this.videoListener.dispatch('errorMsg', {
                        code: msg.error_code,
                        msg:
                            CONST_CODE.OTHER_CODE[msg.error_code] ||
                            CONST_CODE.FAILED_CODE[msg.error_code] ||
                            '错误码：' + msg.error_code,
                    });
                    return false;
                }

                var result = msg['result'];
                if (!result) return;
                if (result.error_code && result.error_code != 0) {
                    const errorCode = result.error_code.toString();
                    const failedCode = CONST_CODE.FAILED_CODE[errorCode] || '错误码：' + errorCode;
                    const otherCode = CONST_CODE.OTHER_CODE[errorCode] || failedCode;
                    console.error(`错误码：${errorCode} ${failedCode}`);
                    // if (errorCode === '4004') {
                        // isOpenSpeekFlag = false;
                        // this.videoListener.dispatch('isOpenSpeekFlag', false);
                        // 外面做判断
                    // }

                    if (!CONST_CODE.STATUS_CODE_ARR.includes(errorCode)) {
                        //播放失败 关闭视频
                        this.close('err');

                        if (this.isLockVideo) {
                            setTimeout(() => {
                                this.play(video);
                            }, 3500);
                        } else {
                            this.closeType = 'error';
                            this.errorCode = errorCode;
                            this.errorInfo = failedCode;
                            this.videoListener.dispatch('afterclose', this);
                        }
                    }

                    this.videoListener.dispatch('errorMsg', {
                        code: errorCode,
                        msg: otherCode
                    });

                    if (CONST_CODE.VIDEO_CODE[errorCode]) {
                        this.videoListener.dispatch('showResult', this, errorCode, true, video);
                        // showResult(this, errorCode, true, video);
                        // 外面做判断
                    } else {
                        console.log(otherCode);
                    }

                    if (errorCode != 4004) {
                        if (recvAudioBtn) {
                            recvAudioBtn.classList.replace('recv-audio-btn', 'unrecv-audio-btn');
                        }
                    }
                    if (sendAudioBtn) {
                        sendAudioBtn.classList.replace('send-audio-btn', 'unsend-audio-btn');
                    }
                }

                //事件响应
                var event = result['event'];
                
                if (!event) return;
                switch (event) {
                    //即将播放视频
                    case 'incomingcall':
                        var videoRecvFlag = true;
                        if (this.isWsPlay||(this && this.opts && this.opts.videoCodeType == 1 && (this.opts.tsFlag == 0||this.opts.tsFlag === undefined) && this._webcast != null)) {
                            videoRecvFlag = false;
                        }
                        const isAvailable = await utils.checkUserMediaAvailable();
                        this.sipcall.createAnswer({
                            jsep: jsep,
                            media: {
                                audioSend: await utils.checkUserMediaAvailable(),
                                videoSend: false,
                                audioRecv: true,
                                // H265改成false
                                videoRecv: videoRecvFlag
                            },
                            success: (jsep)=> {
                                var body = {
                                    request: 'accept',
                                    videoidentify: result['videoidentify'],
                                    playseq: parseInt(result['playseq']),
                                    userToken: this.userToken
                                };
                                this.sipcall.send({ message: body, jsep: jsep });
                                if (this && this.opts && this.opts.videoCodeType == 1 && (this.opts.tsFlag == 0||this.opts.tsFlag === undefined) && this._webcast != null) {
                                    this.stream.getAudioTracks()[0].enabled = true;
                                }

                            },
                            error (error) {
                                console.error(error);
                            }
                        });
                        break;
                    case 'accepted':
                        this.playSucTimeOutIndex = setTimeout(()=> {
                            const parentElement = this.tagBox.parentElement;
                            if (parentElement) {
                                const videoTipDiv = document.createElement('div');
                                videoTipDiv.className = 'video-tip';
                                videoTipDiv.textContent = '网络环境较差，可能无法正常加载视频';
                                
                                parentElement.appendChild(videoTipDiv);
                            }

                        }, this.videoTipTimeOut * 1000);
                        break;
                    //呼叫失败
                    case 'callfaild':
                        //promptFailed(FAILED_CODE[result.error_code] || '错误码：' + result.error_code);
                        break;
                    //云台
                    case 'ptz':
                        break;
                    //历史流控制
                    case 'av_control':
                        break;
                    //录像通知
                    case 'start_av_record':
                        if (result && result.filename) {
                            this.videoFileName = result.filename;
                            this.videoListener.dispatch('startRecordVideo', this);
                            console.log('录像地址：' + result.filename);
                        }
                        break;
                    case 'stop_av_record':
                        if (result && result.filename) {
                            this.videoFileName = result.filename;
                            this.videoListener.dispatch('stopRecordVideo', this);
                            console.log('录像地址：' + result.filename);
                        }
                        break;
                    //修改分辨率
                    case 'ser_notify_resolution':
                        if (result && result.resolution) {
                            this.resolution = result.resolution;
                            this.videosource = result.videosource ? result.videosource : 0;
                            this.resolutionValueInfo = utils.getResolutionName(result.resolution);
                            this.videoListener.dispatch('notifyresolution', this);
                            console.log('接收notifyresolution：' + result.resolution);
                            console.log('接收notifyvideosource：' + result.videosource);
                            if (this.tagBox.parentNode.querySelectorAll('.change-resolution .resolution-value')[0]) {
                                this.tagBox.parentNode.querySelectorAll('.change-resolution .resolution-value')[0].innerHTML = this.resolutionValueInfo;
                                this.tagBox.parentNode.querySelector('.resolution-wrapper').classList.add('hide');
                                console.log('分辨率已调整为：' + this.resolutionValueInfo);
                            }
                        }
                        break;
                    case 'change_resolution':
                        if (result) {
                            // 分辨率
                            this.videoListener.dispatch('notifyResolutionChange', this);
                        }
                        break;
                    case 'change_videosource':
                        if (result) {
                            // 前后置摄像头
                            this.videosource = result.videosource;
                            this.videoListener.dispatch('notifyVideosourceChange', this);
                        }
                        break;
                    //建立预呼叫响应
                    case 'open_poccall':
                        console.log('建立预呼叫');
                        this.sipcall.createAnswer({
                            jsep: jsep,
                            media: {
                                audioSend: await utils.checkUserMediaAvailable(),
                                videoSend: false,
                                audioRecv: true,
                                videoRecv: false
                            },
                            success:(jsep)=> {
                                var body = {
                                    request: 'accept',
                                    userToken: this.userToken
                                };
                                this.sipcall.send({ message: body, jsep: jsep });
                            },
                            error: (error)=> {
                                console.error(error);
                                console.log('发生未知错误，请重试或联系管理员!');
                                this.videoListener.dispatch('errorMsg', {
                                    msg: '发生未知错误，请重试或联系管理员!'
                                });
                            }
                        });
                        break;
                    //预呼叫异常断开
                    case 'ser_close_poccall':
                        console.log('预呼叫异常断开');
                        break;
                    case 'ser_stop_audio':
                        if (result.error_code!=4004) {
                            if (recvAudioBtn) {
                                recvAudioBtn.classList.replace('recv-audio-btn', 'unrecv-audio-btn');
                            }
                        }
                        console.log('音频异常关闭！');
                        break;
                    case 'close_down_audio':
                        sendAudioBtn&&sendAudioBtn.classList.replace('send-audio-btn', 'unsend-audio-btn');
                        console.log('通话时间到！');
                        break;
                    case 'ser_notify_dispatch_close_ptop_poc':
                        sendAudioBtn&&sendAudioBtn.classList.replace('send-audio-btn', 'unsend-audio-btn');
                        console.log('调度通知点对点对讲关闭！');
                        break;
                    case 'ser_close_ptop_poc':
                        sendAudioBtn&&sendAudioBtn.classList.replace('send-audio-btn', 'unsend-audio-btn');
                        console.log('点对点对讲关闭！');
                        break;
                    case 'ser_open_ptop_poc':
                        const unsendAudioBtn = this.tagBox.parentNode.querySelector('.unsend-audio-btn');
                        unsendAudioBtn&&unsendAudioBtn.classList.replace('unsend-audio-btn', 'send-audio-btn');
                        console.log('点对点对讲打开！');
                        break;
                    // 视频关闭通知
                    case 'ser_close_video':
                        console.log('视频框 ' + this.index + ' 视频已关闭');
                        this.isClosing = false;
                        this.videoListener.dispatch('notifyCloseVideo', this);
                        break;
                    // 视频重新打开通知
                    case 'ser_reopen_video':
                        console.log('收到视频重新打开通知：', this);
                        if (result.codetype) {
                            this.changeCodeType = result.codetype==1?0:1;
                            this.playseq = this.index;
                            this.videoId = this.id;
                            this.close();
                            this.videoListener.dispatch('changVideocodeType', this);
                        }else{
                            this.videoListener.dispatch('reOpenVideo', this);
                        }
                        
                        break;
                    case 'notify_totaltime':
                        if (result) {
                            this.fileTotalTime = result.totalTime;
                            this.videoListener.dispatch('notifyTotalTime', this);
                        }
                        break;
                    case 'notify_seektime':
                        if (result) {
                            this.fileSeekTime = result.time;
                            this.videoListener.dispatch('notifySeekTime', this);
                        }
                        break;
                    case 'ser_notify_notice':
                        if (result) {
                            this.videoListener.dispatch('necessaryTips', this);
                        }
                        break;
                    default:
                        console.log('event：' + event);
                        break;
                }
            },

            //处理远程流
            onremotestream:(stream)=> {
                this.videoListener.dispatch('remoteStream', this);
                if (this && this.opts && this.opts.videoCodeType == 1 && (this.opts.tsFlag == 0||this.opts.tsFlag === undefined) && this._webcast != null ) {
                    // H265不处理
                } else {
                    console.log('onremotestream：分屏=' + (this.index + 1) + ', video=' + this.video);
                    Janus.attachMediaStream(this.tagBox, stream);
                }

            },

            //处理本地流
            onlocalstream: (stream)=> {
                stream.getAudioTracks()[0].enabled = false;
                this.stream = stream;
                this.videoListener.dispatch('localStream', this);
            },

            //清理
            oncleanup: () => {
                console.log('oncleanup：分屏=' + (this.index + 1));
            }
        });

        //<video>注册playing/canplay事件，用于判断视频播放成功
        // tagBox.addEventListener('play', handlePlay);
        // tagBox.addEventListener('playing', handlePlay);
        const tagBox = this.tagBox;
        const index = this.index;
        function handlePlay() {
            if (me.video&&!me.handlePlay) {
                // if (tagBox.style.display !== 'none') return;
                // 清除播放监测定时任务，清除内容
                Number(me.playSucTimeOutIndex) > 0 && clearTimeout(me.playSucTimeOutIndex);
                tagBox.parentNode.querySelector('.video-tip')?.remove();
                const listDom = tagBox.parentNode.parentNode.querySelectorAll('li.screen');
                
                let realIndex:Number;
                for (let i = 0; i < listDom.length; i++) {
                    const videoIndex = Number(listDom[i].getAttribute('index'));
                    if (index === videoIndex) {
                        realIndex = i;
                        break;
                    }
                }
                
                console.log(`分屏=${index + 1}, ${me.video} 播放成功`);
                tagBox.style.display = 'block';
                tagBox.parentNode.querySelector('.stream-loading')?.remove();

                // 显示视频信息
                tagBox.parentNode.querySelector('.info').style.display = 'block';

                // 显示音频按钮
                const operateBtns = tagBox.parentNode.querySelectorAll('.operate-btn button');
                for (let i = 0; i < operateBtns.length; i++) {
                    operateBtns[i].style.display = 'block';
                }
                if (me.isPlayBack) {
                    tagBox.parentNode.querySelector('.unrecv-audio-btn').style.display = 'none';
                }
                // 是否显示分辨率切换按钮
                if (!me.isShowChangeResolution) {
                    tagBox.parentNode.querySelector('.operate-btn button.change-resolution').style.display = 'none';
                }
                // 是否显示切换摄像头按钮
                if (!me.isShowChangeVideoSource) {
                    tagBox.parentNode.querySelector('.operate-btn button.change-video-source').style.display = 'none';
                }

                tagBox.parentNode.querySelector('.recv-audio-btn')?.classList.replace('recv-audio-btn', 'unrecv-audio-btn');
                tagBox.parentNode.querySelector('.send-audio-btn')?.classList.replace('send-audio-btn', 'unsend-audio-btn');

                const width = this.videoWidth;
                const height = this.videoHeight;
                me.handlePlay = true;
                // 保持长宽比例填充 video 视频框
                // if (width <= height && width !== '0') {
                //     tagBox.style.objectFit = 'contain';
                // }
                me.playSuccess(index);
            }
        }
    }
    /**
         * 播放视频
         * video：视频编号（ID）
         * videopoc : 视频播放或者视频呼叫
         */
    play (video, videopoc:number=0) {

        if (!video) {
            //alert("请输入视频ID");
            // promptAlarm('视频ID不能为空');
            return;
        }
        var body = {
            request: 'call',
            videoidentify: video,
            playseq: this.index,
            userToken: this.userToken,
            autoack: true,
            videopoc: videopoc
        };
        this.sipcall.send({message: body});
        this.video = video;
        this.isClosing = false;
        this.handlePlay = false;
        this.playing = true;
        this.packetsLostRate = '0.00%';
        this.packetsLostSum = 0;
        this.packetsReceivedSum = 0;
        var numIndex = this.index + 1;
        var framesDecodedDom = document.getElementById(
            'frame-decoded-' + numIndex
        );
        framesDecodedDom.style.display = 'none';
        this.framesDecodedLast = undefined;
        this.framesDecodedCount = 0;
        this.loading(this.tagBox)
        var _li = this.tagBox.parentElement;

        if (!_li.querySelector('.change-bottom-info')&&this.showVideoName) {
            var div = document.createElement('div');
            div.classList.add('change-bottom-info');

            var span1 = document.createElement('span');
            span1.classList.add('speakType', 'speak');

            var span2 = document.createElement('span');
            span2.classList.add('speakName');
            span2.id = 'speakName-' + numIndex;

            div.appendChild(span1);
            div.appendChild(span2);
            
            _li.appendChild(div);
        }

        console.log('视频播放：分屏=' + (this.index + 1) + ',设备ID=' + video);
    }
    loading(el){
        const parentElement = el.parentElement;
        if (parentElement) {
            console.log(parentElement, this);

            if (!parentElement.classList.contains('loading')) {
                parentElement.classList.add('loading');

                const streamLoadingDiv = document.createElement('div');
                streamLoadingDiv.className = 'stream-loading';
                streamLoadingDiv.textContent = '等待数据流传送...';

                parentElement.appendChild(streamLoadingDiv);
            }

            const closeBtn = parentElement.querySelector('.operate-btn .close-btn');
            if (closeBtn) {
                closeBtn.style.display = 'block';
            }
        }
    }

    sipCallSend (params = {}) {
        const body = {
            ...params,
            userToken: this.userToken,
        };
        this.sipcall.send({ message: body });
    }
    /**
     * 播放h265视频
     */
    webCastPlay (video, opts, videoObject,isPlayBack:any =null,filePlay = null) {
        let playseq = this.index;
        let element = this.tagBox;
        this.isClosing = false;
        this.video = video;
        this.playing = true;
        this.handlePlay = false;
        this.packetsLostRate = '0.00%';
        this.packetsLostSum = 0;
        this.packetsReceivedSum = 0;
        var numIndex = this.index + 1;
        var framesDecodedDom = document.getElementById(
            'frame-decoded-' + numIndex
        );
        framesDecodedDom.style.display = 'none';
        this.framesDecodedLast = undefined;
        this.framesDecodedCount = 0;
        this.loading(this.tagBox)
        var _li = this.tagBox.parentElement;

        if (!_li.querySelector('.change-bottom-info')&&this.showVideoName) {
            var div = document.createElement('div');
            div.classList.add('change-bottom-info');

            var span1 = document.createElement('span');
            span1.classList.add('speakType', 'speak');

            var span2 = document.createElement('span');
            span2.classList.add('speakName');
            span2.id = 'speakName-' + numIndex;

            div.appendChild(span1);
            div.appendChild(span2);
            _li.appendChild(div);
        }
        
        console.log('视频播放：分屏=' + (this.index + 1) + ',设备ID=' + video);
        const _webcastPlayType = ['notify_totaltime','notify_seektime','change_resolution','av_playback','ptz','change_videosource','resolution_videosource_notify','ser_reopen_video','ser_notify_notice','start_av_record','stop_av_record']
        this._webcast.playVideo(video, playseq, element, opts, isPlayBack,filePlay,(data) => {
            if (data.event === "play_video" && data.error_code == 0) {
                this.videoListener.dispatch('playsuccess', this);
                this.showWebcastVideoInfo(data, opts, videoObject);
            } else if (data && data.type && data.type == 'text') {
                console.error(data.data);
                this.webCastClose(video);
            }else if (data && data.type && _webcastPlayType.includes(data.type)) {
                if (data.type =='change_resolution') {
                    // promptFailed('分辨率修改成功');
                    this.videoListener.dispatch('notifyResolutionChange', {msg:'分辨率修改成功'});
                    console.log(data.data);
                }else if (data.type =='change_videosource') {
                    // promptFailed('摄像头切换成功');
                    this.videoListener.dispatch('notifyVideosourceChange', {msg:'摄像头切换成功'});
                    console.log(data.data);
                }else if (data.type =='resolution_videosource_notify') {
                    if (data.info.resolution) {
                        this.resolution = data.info.resolution;
                        this.videosource = data.info.videosource ? data.info.videosource : 0;
                        this.resolutionValueInfo = utils.getResolutionName(data.info.resolution);
                        this.videoListener.dispatch('notifyresolution', this);
                        if (this.tagBox.parentNode.querySelectorAll('.change-resolution .resolution-value')[0]) {
                            this.tagBox.parentNode.querySelectorAll('.change-resolution .resolution-value')[0].innerHTML = this.resolutionValueInfo;
                            this.tagBox.parentNode.querySelector('.resolution-wrapper').classList.add('hide');
                            console.log('分辨率已调整为：' + this.resolutionValueInfo);
                        }
                    }
                }else if (data.type =='ser_notify_notice') {
                    this.videoListener.dispatch('necessaryTips', {playseq,data,opts});
                }else if (data.type =='ser_reopen_video') {
                    opts.videoCodeType = 0;
                    this.webCastClose(video);
                    this.videoListener.dispatch('changVideocodeType', {videoId:video, playseq, element, opts, videoObject,changeCodeType:data.info.codetype==1?0:1});
                }else if(data.type =='start_av_record'){
                    this.videoFileName = data.info.filename;
                    this.videoListener.dispatch('startRecordVideo', this);
                }else if(data.type =='stop_av_record'){
                    this.videoFileName = data.info.filename;
                    this.videoListener.dispatch('stopRecordVideo', this);
                }else if (data.type =='notify_totaltime') {
                    this.fileTotalTime = data.info.totaltime;
                    this.videoListener.dispatch('notifyTotalTime', this);
                }else if (data.type =='notify_seektime') {
                    this.fileSeekTime = data.info.seektime;
                    this.videoListener.dispatch('notifySeekTime', this);
                }
            } else if (data && data.type && data.type == 'close') {
                // websocket连接断开
                this.webCastClose(video);
            } else if (data && data.type && data.type == 'closeChange') {
                // websocket连接断开
                this.webCastClose(video);
                this.videoListener.dispatch('tryAgainWs', {video, playseq, element, opts, videoObject});
                if (this.isLockVideo) {
                    setTimeout(()=> {
                        this.webCastPlay(video, opts, videoObject);
                    }, 3500);
                }
            } else if (data && data.error_code != 0) {
                console.error('错误码：' + data.error_code + ' ' + CONST_CODE.FAILED_CODE[data.error_code]);
                const code = data.error_code.toString();
                // promptFailed(CONST_CODE.VIDEO_CODE[data.error_code] || CONST_CODE.OTHER_CODE[data.error_code] || CONST_CODE.FAILED_CODE[data.error_code] || '错误码：' + data.error_code);
                if (!CONST_CODE.STATUS_CODE_ARR.includes(code)) {
                    this.webCastClose(video);
                    if (this.isLockVideo) {
                        setTimeout(()=> {
                            this.webCastPlay(video, opts, videoObject);
                        }, 3500);
                    }
                }
                if([4001,5007].includes(data.error_code)){
                    this.videoListener.dispatch('tryAgainWs', {video, playseq, element, opts, videoObject});
                }
                this.videoListener.dispatch('errorMsg', {
                    'code': data.error_code,
                    'msg': CONST_CODE.VIDEO_CODE[data.error_code] || CONST_CODE.OTHER_CODE[data.error_code] || CONST_CODE.FAILED_CODE[data.error_code] || '错误码：' + data.error_code
                });
            }
        });
    }

    filePlay (video, path) {
        if (!video) {
            console.log('视频ID不能为空');
            return;
        }
        var body = {
            request: 'file_play',
            videoidentify: video,
            playseq: this.index,
            userToken: this.userToken,
            'file_path': path,
            cmd: 'play'
        };
        if (this.opts.videoCodeType==1) {
            this.webCastPlay(video, this.opts, this,null,body);
            this.video = video;
            this.isClosing = false;
            this.playing = true;
        }else{
            this.sipcall.send({message: body});
            setTimeout(()=>{
                this.operateAudio('recv_audio');
            },2000)
            this.video = video;
            this.isClosing = false;
            this.playing = true;
            this.packetsLostRate = '0.00%';
            this.packetsLostSum = 0;
            this.packetsReceivedSum = 0;
            var numIndex = this.index + 1;
            var framesDecodedDom = document.getElementById(
                'frame-decoded-' + numIndex
            );
            framesDecodedDom.style.display = 'none';
            this.framesDecodedLast = undefined;
            this.framesDecodedCount = 0;
            this.loading(this.tagBox)
            console.log('视频播放：分屏=' + (this.index + 1) + ',设备ID=' + video);
        }
        
    }

    fileClose (video, index) {
        /*if (!type) {
            this.isLockVideo = false;
            this.tagBox
                .parent()
                .find('.lock-video-btn')
                .attr('class', 'unlock-video-btn');
        }*/
        //清除结果提示内容
        // console.log(this.tagBox.parent(), this);
        // 清除内容提示
        Number(this.playSucTimeOutIndex) > 0 && clearTimeout(this.playSucTimeOutIndex);
        // this.tagBox.parent().find('.video-tip').remove();
        this.tagBox.parentElement?.querySelector('.video-tip')?.remove();
        var body = {
            request: 'file_control',
            videoidentify: video,
            playseq: index,
            userToken: this.userToken,
            cmd: 'close'
        };
        if (this.opts.videoCodeType==1) {
            this._webcast.msgSend(body);
            this.webCastClose(video)
        }else{
            this.sipcall.send({message: body});
            this.sipcall.hangup();
        }
        if (!this.playing) return;
        this.closeElse();
    }

    fileControl (video, index, opts) {
        var body = {
            request: 'file_control',
            videoidentify: video,
            playseq: index,
            userToken: this.userToken,
            cmd: opts.cmd
        };
        if (opts && opts.fastForward) {
            body['rate'] = opts.fastForward;
        }
        if (opts && opts.start_time) {
            body['start_time'] = opts.start_time;
        }
        if (opts && opts.seekPlay) {
            body['start_time'] = opts.seekPlay;
        }
        if (this.opts.videoCodeType==1) {
            this._webcast.msgSend(body);
            if (opts.cmd ==='close') {
                setTimeout(()=>{
                    this.webCastClose(video)
                },300)
            }
        } else {
            this.sipcall.send({message: body});
        }
    }
    getParent(el){
        const parentElement = el.parentElement;
        const videoTipElement = parentElement?.querySelector('.video-tip');

        if (videoTipElement) {
            videoTipElement.remove();
        }
    }
    /**
     * 关闭h265视频
     */
    webCastClose (video) {
        if (this.playing) {
            this._webcast.closeVideo(video);
            //清除结果提示内容
            // console.log(this.tagBox.parentElement, this);
            this.closeElse();
            if (!this.isLockVideo) {
                this.videoListener.dispatch('afterclose', this);
            }
        }
    }
    close (type=null) {
        if (!type) {
            this.isLockVideo = false;
            // this.tagBox
            //     .parent()
            //     .find('.lock-video-btn')
            //     .attr('class', 'unlock-video-btn');
            const lockVideoBtn = this.tagBox.parentElement?.querySelector('.lock-video-btn') as HTMLElement;
            if (lockVideoBtn) {
                lockVideoBtn.className = 'unlock-video-btn';
            }
        }
        //清除结果提示内容
        // console.log(this.tagBox.parentElement, this);
        // 清除内容提示
        Number(this.playSucTimeOutIndex)>0 && clearTimeout(this.playSucTimeOutIndex);
        // this.tagBox.parent().find('.video-tip').remove();
        if (this.isPlayBack) {
            this.webCastClose(this.video)
        }
        this.tagBox.parentElement?.querySelector('.video-tip')?.remove();
        var _hangup = {
            request: 'hangup',
            videoidentify: this.video||'',
            playseq: this.index,
            userToken: this.userToken
        };
        this.sipcall.send({message: _hangup});
        this.sipcall.hangup();
        if (!this.playing) return;
        this.closeElse();

    }
    closeElse () {
        // this.tagBox.hide();
        this.tagBox.style.display = "none";
        this.isClosing = true;
        this.playing = false;
        this.video = null;
        this.packetsLostRate = '0.00%';
        this.packetsLostSum = 0;
        this.packetsReceivedSum = 0;
        //清除显示的视频信息
        var inner = document.getElementById(
            'info-' + (Number(this.index) + Number(1))
        );
        if(inner !== null) {
          inner.innerHTML = '';
        }
        // //隐藏视频信息
        // this.tagBox.parent().find('.info').hide();
        // //隐藏音频喇叭
        // this.tagBox.parent().find('.operate-btn button').hide();
        // 隐藏视频信息
        const infoElements = this.tagBox.parentElement?.querySelectorAll('.info');
        infoElements?.forEach(infoElement => {
            infoElement.style.display = 'none';
        });

        // 隐藏音频喇叭
        const operateBtn = this.tagBox.parentElement?.querySelector('.operate-btn');
        const buttons = operateBtn?.querySelectorAll('button');
        buttons?.forEach(button => {
            button.style.display = 'none';
        });
        //避免没收到成功时就点击关闭，清除loading框
        if (this.tagBox) {
            var parentElement = this.tagBox.parentElement;
            // 移除 'loading' 类
            parentElement?.classList?.remove('loading');
            // 查找所有类名为 'stream-loading' 的元素并移除它们
            var streamLoadingElements = parentElement.querySelectorAll('.stream-loading');
            streamLoadingElements?.forEach((element)=> {
                element.remove();
            });
        }
        var elementsToRemove = this.tagBox.parentElement?.querySelectorAll('.change-bottom-info');
        // 遍历并删除每个元素
        elementsToRemove.forEach(function(element) {
            element.remove();
        });
        // this.tagBox
        //     .parent()
        //     .removeClass('loading')
        //     .find('.stream-loading')
        //     .remove();
        //清除object-fit
        // this.tagBox.css('object-fit', '');
        // 清除内容提示
        Number(this.playSucTimeOutIndex) > 0 && clearTimeout(this.playSucTimeOutIndex);
        // this.tagBox.parent().find('.video-tip').remove();
        this.tagBox.parentElement?.querySelector('.video-tip')?.remove();
        var numIndex = Number(this.index) + 1;
        var framesDecodedDom = document.getElementById(
            'frame-decoded-' + numIndex
        );
        if(framesDecodedDom !== null) {
            framesDecodedDom.style.display = 'none';
        }
        this.framesDecodedLast = undefined;
        this.framesDecodedCount = 0;
        // this.videoListener.dispatch('isOpenSpeekFlag', false);
        // isOpenSpeekFlag = false;
        // this.tagBox.srcObject=null;
    }
    /**
     * 显示H265视频的信息（）
     */
    showWebcastVideoInfo(data: any, opts: any, videoObject: any): void {
        const videoName = (opts && opts.name) ? opts.name : data.videoidentify;
        if (videoObject._opts.showVideoInfo !== 0) {
        const number = Number(data.playseq) + 1;
    
        // 获取文案显示 DOM 元素
        const videoInfoList = document.querySelectorAll(`${videoObject.selector} #info-${number}`);
        if (!videoInfoList.length) {
            console.error(`can not find dom by id [info-${number}]`);
            return;
        }
        const videoInfoObj = videoInfoList[0] as HTMLElement;
        videoInfoObj.innerHTML = videoName;
        // 根据视频框大小自动计算显示文案的文字大小
        const videoElement = document.querySelector(`${videoObject.selector} #video-${number}`) as HTMLElement;
        const fontHeightSize = videoElement.offsetHeight / 15;
        const fontWidthSize = videoElement.offsetWidth / 18;
        let fontSize = fontHeightSize < fontWidthSize ? fontHeightSize : fontWidthSize;
        fontSize = !fontSize || fontSize > 20 ? 20 : fontSize;
        const infoElement = document.querySelector(`${videoObject.selector} #info-${number}`) as HTMLElement;
        infoElement.style.fontSize = `${fontSize}px`;
        }
    }
    // showWebcastVideoInfo (data, opts, videoObject) {
    //     var videoName = (opts && opts.name) ? opts.name : data.videoidentify;
    //     if (videoObject._opts.showVideoInfo != 0) {
    //         var number = Number(data.playseq) + 1;

    //         //获取文案显示dom元素
    //         var $videoInfoList = $(
    //             videoObject.selector + ' .video-main #info-' + number
    //         );
    //         if (!$videoInfoList.length) {
    //             console.error('can not find dom by id [info-' + number + ']');
    //         }
    //         var videoInfoObj = $videoInfoList[0];
    //         videoInfoObj.innerHTML = videoName;

    //         //根据视频框大小自动计算 显示文案的文字大小
    //         var fontHeightSize = $(videoObject.selector + ' .video-main #video-' + number).height() / 15;
    //         var fontWidthSize = $(videoObject.selector + ' .video-main #video-' + number).width() / 18;
    //         var fontSize = fontHeightSize < fontWidthSize ? fontHeightSize : fontWidthSize;
    //         fontSize = !fontSize || fontSize > 20 ? 20 : fontSize;
    //         $('#info-' + number).css('font-size', fontSize + 'px');
    //     }
    // }

    /**
     * 云台控制
     * up                上
     * down                下
     * left                左
     * right            右
     * upleft            上左
     * upright            上右
     * downleft            下左
     * downright        下右
     * zoomin            倍率变大
     * zoomout            倍率变下
     * focusnear        焦点+
     * focusfar            焦点-
     * irisopen            光圈+
     * irisclose        光圈-
     * pointset            设置预置点
     * pointdel            删除预置点
     * pointgoto        到预置点
     * scansetleft        自动扫描左边界
     * scansetright        自动扫描又边界
     * scansetspeed        设置扫描速度
     * scanrun            自动扫描运行
     * cruiseadd        添加巡航点
     * cruisedel        删除巡航点
     * cruisespeed        设置巡航点速度
     * cruisepausetime    设置巡航滞留时间
     * cruiserun        启动巡航
     */
    // holder (type, opts, isStop) {
    //     if (!this.video || !this.playing) {
    //         console.error('未选中播放的视频！');
    //         // promptAlarm('未选中播放的视频！');
    //         return;
    //     }

    //     var holdType =
    //         'up down left right upleft upright downleft downright zoomin zoomout focusnear focusfar irisopen irisclose pointset pointdel pointgoto ' +
    //         'scansetleft scansetright scansetspeed scanrun cruiseadd cruisedel cruisespeed cruisepausetime cruiserun';
    //     var typeVal = Number(holdType.split(' ').indexOf(type)) + Number(1);

    //     console.log(
    //         'holdType：' + typeVal + ' type：' + type + (isStop ? ' 停止' : '')
    //     );

    //     if (!typeVal || typeVal <= 0) {
    //         console.error('异常PTZ指令：' + typeVal);
    //         return false;
    //     }

    //     var body = {
    //         request: 'ptz',
    //         videoidentify: this.video,
    //         playseq: this.index,
    //         userToken: this.userToken
    //     };

    //     body.cmd = {
    //         speed: opts.speed ? opts.speed : 200,
    //         group: 0,
    //         present: opts.present ? opts.present : 0,
    //         time: 0,
    //         type: typeVal
    //     };

    //     if (isStop) {
    //         console.log('>>>>yuntai control,stop, video=' + this.video);
    //         body.cmd.action = 1;
    //     } else {
    //         body.cmd.action = 0;
    //         console.log('设备号：' + this.video + ', 云台移动-->' + type);
    //     }

    //     this.sipcall.send({message: body});
    // }
    holder(type: string, opts: any, isStop: boolean): boolean {
        if (!this.video || !this.playing) {
            this.videoListener.dispatch('errorMsg', {msg:'未选中播放的视频！'});
          return;
        }

        const holdType =
          'up down left right upleft upright downleft downright zoomin zoomout focusnear focusfar irisopen irisclose pointset pointdel pointgoto ' +
          'scansetleft scansetright scansetspeed scanrun cruiseadd cruisedel cruisespeed cruisepausetime cruiserun';
        const typeVal = Number(holdType.split(' ').indexOf(type)) + Number(1);
      
        console.log(`holdType：${typeVal} type：${type}${isStop ? ' 停止' : ''}`);
      
        if (!typeVal || typeVal <= 0) {
          console.error(`异常 PTZ 指令：${typeVal}`);
          return false;
        }

        if (this.isWsPlay|| (this && this.opts && this.opts.videoCodeType == 1 && (this.opts.tsFlag == 0||this.opts.tsFlag === undefined) && this._webcast != null && this._webcast.checkIsSupport(this.video))){
            const bodys = {
                request: 'ptz',
                videoidentify: this.video,
                playseq: this.index*1,
                userToken: this.userToken,
                speed: opts.speed ? opts.speed*1 : 200,
                action:isStop?1:0,
                group: 0,
                time: 0,
                present: opts.present ? opts.present*1 : 1,
                type: typeVal*1
            };
            this._webcast.msgSend(bodys);
        }else{
            const body: {
                request: string;
                videoidentify: any;
                playseq: number;
                userToken: string;
                cmd: {
                  speed: number;
                  group: number;
                  present: number;
                  time: number;
                  type: number;
                  action?: number;
                };
              } = {
                request: 'ptz',
                videoidentify: this.video,
                playseq: this.index,
                userToken: this.userToken,
                cmd: {
                  speed: opts.speed ? opts.speed : 200,
                  group: 0,
                  present: opts.present ? opts.present : 1,
                  time: 0,
                  type: typeVal
                }
              };
              if (isStop) {
                console.log(`>>>>yuntai control,stop, video=${this.video}`);
                body.cmd.action = 1;
              } else {
                body.cmd.action = 0;
                console.log(`设备号：${this.video}, 云台移动-->${type}`);
              }
            this.sipcall.send({message: body});
        }
      }
    /**
     * 历史回放
     * video设备ID startTime录像开始 stopTime录像结束 例：2015-07-22T12:00:00，注意T隔开
     */
    // playback (video, startTime, stopTime) {
    //     if (!video) {
    //         console.error('视频ID不能为空');
    //         // promptAlarm('视频ID不能为空');
    //         return;
    //     }

    //     var body = {
    //         request: 'av_playback',
    //         videoidentify: video,
    //         playseq: this.index,
    //         userToken: this.userToken,
    //         start_time: startTime,
    //         stop_time: stopTime
    //     };

    //     console.log(
    //         '>>>>playback video=' +
    //         video +
    //         ' startTime=' +
    //         startTime +
    //         ' stopTime=' +
    //         stopTime
    //     );
    //     this.sipcall.send({message: body});
    //     this.video = video;
    //     this.playing = true;
    //     this.packetsLostRate = '0.00%';
    //     this.packetsLostSum = 0;
    //     this.packetsReceivedSum = 0;
    //     this.isPlayBack = true;

    //     //loading
    //     var _li = this.tagBox.parent();
    //     console.log(_li, this);
    //     if (!_li.hasClass('loading')) {
    //         _li
    //             .addClass('loading')
    //             .append('<div class="stream-loading">等待数据流传送...</div>');
    //     }
    //     _li.find('.operate-btn .close-btn').show();
    //     console.log('历史回放：分屏=' + (this.index + 1) + ',视频ID=' + video);
    // }
    playback(video: string, startTime: number, stopTime: number): void {
        if (!video) {
          console.error('视频ID不能为空');
          // promptAlarm('视频ID不能为空');
          return;
        }
      
        console.log(
          `>>>>playback video=${video} startTime=${startTime} stopTime=${stopTime}`
        );
        if (this && this.opts && this.opts.videoCodeType == 1 && this._webcast != null){
            var body = {
                request: 'av_playback',
                videoidentify: video,
                playseq: this.index*1,
                userToken: this.userToken,
                start_time: startTime,
                stop_time: stopTime
            };
            this.webCastPlay(video, this.opts, this, body);
        }else{
            var body = {
                request: 'av_playback',
                videoidentify: video,
                playseq: this.index,
                userToken: this.userToken,
                start_time: startTime,
                stop_time: stopTime
            };
            this.sipcall.send({message: body});
        }
        this.video = video;
        this.playing = true;
        this.packetsLostRate = '0.00%';
        this.packetsLostSum = 0;
        this.packetsReceivedSum = 0;
        this.isPlayBack = true;
      
        //loading
        const li = this.tagBox.parentElement;
        console.log(li, this);
        if (!li.classList.contains('loading')) {
          const loadingDiv = document.createElement('div');
          loadingDiv.classList.add('stream-loading');
          loadingDiv.textContent = '等待数据流传送...';
          li.classList.add('loading');
          li.appendChild(loadingDiv);
        }
        li.querySelector('.operate-btn .close-btn').classList.add('show');
        console.log(`历史回放：分屏=${this.index + 1},视频ID=${video}`);
    }
      

    /**
     * 历史回放控制
     * video设备ID playType类型 playSpeed速率 startTime开始时间
     */
    // playbackControl (video, playType, playSpeed, startTime) {
    //     var self = this;

    //     var body = {
    //         request: 'av_control',
    //         videoidentify: video,
    //         playseq: self.index,
    //         userToken: self.userToken,
    //         start_time: startTime,
    //         rate: String(playSpeed),
    //         cmd: playType
    //     };

    //     console.log(
    //         '>>>>playbackControl video=' +
    //         video +
    //         ' playType=' +
    //         playType +
    //         ' playSpeed=' +
    //         playSpeed
    //     );

    //     //setTimeout(function (){
    //     self.sipcall.send({message: body});
    //     //}, 1000);

    //     if (playType == 'stop') {
    //         self.close();

    //         self.tagBox.hide();
    //         self.playing = false;
    //         self.video = null;
    //         self.packetsLostRate = '0.00%';
    //         self.packetsLostSum = 0;
    //         self.packetsReceivedSum = 0;
    //         self.isPlayBack = false;
    //         //清除显示的视频信息
    //         document.getElementById(
    //             'info-' + (Number(self.index) + Number(1))
    //         ).innerHTML = '';

    //         //隐藏音频喇叭
    //         this.tagBox.parent().find('.operate-btn button').hide();
    //         //避免没收到成功时就点击关闭，清除loading框
    //         self.tagBox
    //             .parent()
    //             .removeClass('loading')
    //             .find('.stream-loading')
    //             .remove();
    //         //清除object-fit
    //         self.tagBox.css('object-fit', '');
    //     }
    // }
    playbackControl(
        video: string,
        playType: string,
        playSpeed: number,
        startTime: number
      ): void {
        
      
        console.log(
          `>>>>playbackControl video=${video} playType=${playType} playSpeed=${playSpeed}`
        );
        if (this && this.opts && this.opts.videoCodeType == 1 && this._webcast != null){
            const body = {
                request: 'av_control',
                videoidentify: video,
                playseq: this.index*1,
                userToken: this.userToken,
                start_time: startTime,
                rate: String(playSpeed),
                cmd: playType
              };
            if (this._webcast.isVideoExist(video)) {
                this._webcast.msgSend(body);
            }else{
                console.log('回放未播放')
            }
        }else{
            const body = {
                request: 'av_control',
                videoidentify: video,
                playseq: this.index,
                userToken: this.userToken,
                start_time: startTime,
                rate: String(playSpeed),
                cmd: playType
              };
            this.sipcall.send({message: body});
        }
      
        if (playType === 'stop') {
          this.close();
          this.tagBox.style.display = 'none';
          this.playing = false;
          this.video = null;
          this.packetsLostRate = '0.00%';
          this.packetsLostSum = 0;
          this.packetsReceivedSum = 0;
          this.isPlayBack = false;
          //清除显示的视频信息
          const infoElement = document.getElementById(
            `info-${Number(this.index) + 1}`
          );
          if (infoElement) {
            infoElement.innerHTML = '';
          }
      
          //隐藏音频喇叭
          const operateBtn = this.tagBox.parentElement.querySelector('.operate-btn');
          if (operateBtn) {
            operateBtn.querySelector('button').style.display = 'none';
          }
          //避免没收到成功时就点击关闭，清除loading框
          this.tagBox.parentElement.classList.remove('loading');
          const loadingDiv = this.tagBox.parentElement.querySelector('.stream-loading');
          if (loadingDiv) {
            loadingDiv.remove();
          }
          //清除object-fit
          this.tagBox.style.objectFit = '';
        }
    }
      

    /**
     * 音频流操作
     * requstType: recv_audio、stop_audio、send_audio、unsend_audio
     */
    operateAudio(requestType: string): void {
        var self = this;
            console.log(self);
            if (self.isWsPlay){
                const actions = {
                    'recv_audio': () => self._webcast.startAudio(self.id, self.index, ),
                    'stop_audio': () => self._webcast.closeAudio(self.id, self.index, ),
                    'send_audio': () => self._webcast.startVC(self.id, self.index, ),
                    'unsend_audio': () => self._webcast.stopVC(self.id, self.index,)
                  };
                  if (requestType in actions) {
                    actions[requestType]();
                  }                
            }else if (self && self.opts && self.opts.videoCodeType == 1 && (self.opts.tsFlag == 0||self.opts.tsFlag== undefined) && self._webcast != null && self._webcast.checkIsSupport(self.video)){
                const actions = {
                    'recv_audio': () => self._webcast.startAudio(self.id, self.index, ),
                    'stop_audio': () => self._webcast.closeAudio(self.id, self.index, ),
                    'send_audio': () => self._webcast.startVC(self.id, self.index, ),
                    'unsend_audio': () => self._webcast.stopVC(self.id, self.index,)
                  };
                  if (requestType in actions) {
                    actions[requestType]();
                  }                
            }else{
                if (!this.video) {
                console.error('视频ID不能为空');
                // promptAlarm('视频ID不能为空');
                return;
                }
            
                const body = {
                    request: requestType,
                    videoidentify: this.video,
                    playseq: this.index,
                    userToken: this.userToken
                };
            
                this.sipcall.send({ message: body });
                console.log(
                `音频操作=${requestType}, 分屏=${this.index + 1},设备ID=${this.video}`
                );
            }
      }
      
    operateWebcastAudio (type) {
        if (!this.video) {
            console.error('视频ID不能为空');
            // promptAlarm('视频ID不能为空');
            return;
        }
        if (type == 'play_audio') {   //打开音频
            console.log(this);
            this._webcast.openAudio(this.video, this.index);
        } else if (type == 'stop_audio') {	//关闭音频
            this._webcast.stopAudio(this.video, this.index);
        }
    }

    /**
     * 录像操作
     * requstType: start_av_record(开启录像)、stop_av_record(停止录像)
     */
    recordAv (requestType:string, businessId,videoSource:number) {
        var self = this;
        
        if (!self.video) {
            console.error('视频ID不能为空');
            // promptAlarm('视频ID不能为空');
            return;
        }

        
        var body = {
            request: requestType,
            videoidentify: self.video,
            playseq: self.index,
            userToken: self.userToken,
            businessid: businessId || ''
        };
        if (self.isWsPlay ||(self && self.opts && self.opts.videoCodeType == 1 && (self.opts.tsFlag == 0||self.opts.tsFlag== undefined) && self._webcast != null && self._webcast.checkIsSupport(self.video))){
            self._webcast.msgSend(body)                 
        }else{
            self.sipcall.send({message: body});
        }
        console.log(
            '录像操作=' +
            requestType +
            ', 分屏=' +
            (self.index + 1) +
            ',设备ID=' +
            self.video +
            ',业务ID=' +
            (businessId || null)
        );
    }

    /**
     * 修改分辨率
     * requstType: change_resolution
     * CIF 480P 720P 1080P
     */
    changeResolution (requestType, resolution) {
        var self = this;

        if (!self.video) {
            console.error('视频ID不能为空');
            // promptAlarm('视频ID不能为空');
            return;
        }

        if (self.isWsPlay || (self && self.opts && self.opts.videoCodeType == 1 && (self.opts.tsFlag == 0||self.opts.tsFlag== undefined) && self._webcast != null && self._webcast.checkIsSupport(self.video))){
            var body = {
                request: requestType,
                videoidentify: self.video,
                playseq: self.index*1,
                resolution: resolution,
                userToken: self.userToken
            };
            self._webcast.msgSend(body);
        }else{
            var body = {
                request: requestType,
                videoidentify: self.video,
                playseq: self.index,
                resolution: resolution,
                userToken: self.userToken
            };
            self.sipcall.send({message: body});
        }
        console.log(
            '修改分辨率操作=' +
            resolution +
            ', 分屏=' +
            (self.index + 1) +
            ',设备ID=' +
            self.video
        );
    }


    /**
     * 切换前后摄像头 change_videosource
     * requstType: videoSource 0-后置摄像头   1-前置摄像头
     *
     */
    changeVideoSource (requestType, videoSource) {
        var self = this;

        if (!self.video) {
            console.error('视频ID不能为空');
            // promptAlarm('视频ID不能为空');
            return;
        }

        if (self.isWsPlay || (self && self.opts && self.opts.videoCodeType == 1 && (self.opts.tsFlag == 0||self.opts.tsFlag== undefined) && self._webcast != null && self._webcast.checkIsSupport(self.video))){
            const body = {
                request: requestType,
                videoidentify: self.video,
                playseq: self.index*1,
                videosource: videoSource*1,
                userToken: self.userToken
            };
            self._webcast.msgSend(body);
        }else{
            const body = {
                request: requestType,
                videoidentify: self.video,
                playseq: self.index,
                videosource: videoSource,
                userToken: self.userToken
            };
            self.sipcall.send({message: body});
        }
        console.log(
            '切换摄像头=' +
            videoSource +
            ', 分屏=' +
            (self.index + 1) +
            ',设备ID=' +
            self.video
        );
    }

    /**
     * 对象预呼叫
     * requstType: open_poccall(开启) close_poccall(关闭)
     * pocno
     * centerTel
     */
    pocCall (requestType, pocNo, centerTel) {
        var self = this;

        var body = {
            request: requestType,
            pocno: pocNo,
            playseq: self.index,
            center_tel: centerTel,
            userToken: self.userToken
        };

        self.sipcall.send({message: body});
        console.log(
            '预呼叫操作=' +
            requestType +
            ', 对讲号码=' +
            pocNo +
            ',调度中心号码=' +
            centerTel
        );
    }

    /**
     * 点对点对讲
     * requstType: open_ptop_poc(开启) close_poc_poc(关闭)
     * pocno
     */
    ptopPoc (requestType, pocNo) {
        var self = this;

        var body = {
            request: requestType,
            pocno: pocNo,
            playseq: self.index,
            pocmember: self.video,
            userToken: self.userToken
        };

        self.sipcall.send({message: body});
        console.log(
            '点对点对讲操作=' +
            requestType +
            ', 主叫号码=' +
            pocNo +
            ',被叫号码=' +
            self.video
        );
    }
}
export default SVideo;