/*
 * @File: 支持H256视频播放
 * @Author: liulian
 * @Date: 2021-12-13 16:54:50
 * @version: V0.0.0.1
 * @LastEditTime: 2024-02-28 09:58:24
 */
// (function (root, factory) {
//     if (typeof define === 'function' && define.amd) {
//         // AMD
//         define([], factory);
//     } else if (typeof exports === 'object') {
//         // Node, CommonJS之类的
//         module.exports = factory(require());
//     } else {
//         // 浏览器全局变量(root 即 window)
//         root.scooper = root.scooper || {};

//         root.VideoWebCast = factory();
//     }
// }(window, function () {

    
// }));

class VideoWebCast {
    // token
    _token = '';
    // 视频连接地址
    _videoLiveWsUrl = '';
    // ws连接对象（一路对应一个连接） videoID:{}
    _vlWsMap = {};
    // 视频流对象
    _mediaSource = {};
    // 心跳间隔 (60s)
    _keepAlivePeriod = 50000;
    _wsKeepaliveMap = {}
/**
         * 连接成功是否开始自动发音频
         */
    // #autoStartRecord = false;
    /**
     * ws连接状态
     */
    #isWsOpen = false;
    /**
     * 拾音器对象
     */
    #recorder = null;
    // 定时器ID
    #recorderIndex = null
    // 播放ID
    videoId = null
    // 位置信息
    playseqId = null
    // 编码格式
    #mimeCodec = {}
    
   

    constructor(config) {
        this.validateConfig(config);
        this._videoLiveWsUrl = config.videoLiveWsUrl;
        this._token = config.token;
        // this.#autoStartRecord = config.autoStartRecord ? config.autoStartRecord:false
    }
    /**
     * 参数校验
     */
    validateConfig(config) {
        if (!config.videoLiveWsUrl || config.videoLiveWsUrl == undefined) {
            console.error("服务地址为空！");
            return;
        }
        if (!config.token || config.token == undefined) {
            console.error("token为空！");
            return;
        }
    }
    /**
     * 检测是否为https
     */
    checkIsHttps = () => {
        return document.location.protocol == "https:";
    }
    /**
     * 心跳 
     */
    async keepAlive(video) {
        let msg = {
            notify: 'heart_beat'
        }
        let data = await this.getCommandBlog(JSON.stringify(msg))
        if (this._vlWsMap[video] && this._vlWsMap[video].websocket) {
            this._vlWsMap[video].websocket.send(data);
            if (this._wsKeepaliveMap[video] && this._wsKeepaliveMap[video] != null) {
                clearTimeout(this._wsKeepaliveMap[video])
            }
            this._wsKeepaliveMap[video] = setTimeout(() => { this.keepAlive(video) }, this._keepAlivePeriod);
        }
    }
    /**
     * 消息格式拼接
     */
    getCommandBlog = async (message) => {
        var msgBlob = new Blob([message], { type: 'application/json' });

        var msgBuffer = await msgBlob.arrayBuffer();
        var msgData = new DataView(msgBuffer);
        var newBuffer = new ArrayBuffer(8 + msgBuffer.byteLength);
        var newData = new DataView(newBuffer);
        var offset = 0;
        // 设置协议头  每个协议包头部都有8个字节的协议头;
        //第1、2字节为包头标识 固定为byte[] = { 0x13, 0x01 }
        //第3字节为包类型 01H 内容为JSON字符串格式的信令、消息等，使用UTF-8编码格式。02H 内容为音频流。 03H 内容为fmp4音频流。 
        // 第4字节为预留 00H   第5~8字节为包内容长度（不包括包头的8个字节），使用大端字节序的32位无符号整数
        newData.setInt8(offset, 19);  //13H
        offset++;
        newData.setInt8(offset, 1);  //01H
        offset++;
        // newData.setInt8(offset, 1);
        newData.setInt8(offset, ['play_audio','recv_audio','stop_audio','send_audio','unsend_audio'].includes(message?.request)? 0x02:1);  //01H ||0x02H
        offset++;
        newData.setInt8(offset, 0); //00H
        offset++;
        // 设置内容长度
        newData.setInt32(offset, msgBuffer.byteLength);
        offset += 4;
        for (var i = 0; i < msgData.byteLength; i++) {
            newData.setInt8(offset, msgData.getInt8(i));
            offset++;
        }
        return new Blob([newData], { type: 'text/plain' })
    }
    /**
     * 发送消息
     */
    sendMessage = async (video, playseq) => {
        let param = {
            request: 'play_video',
            videoidentify: video,
            playseq: playseq,
            userToken: this._token
        }
        let data = await this.getCommandBlog(JSON.stringify(param));
        this._vlWsMap[video].websocket.send(data);
        let _this = this;
        // 视频请求发送成功后，再发送心跳消息
        setTimeout(() => {
            _this.keepAlive(video);
        }, _this._keepAlivePeriod)
    }

    playback = async (video, playseq,param) => {
        param.userToken = this._token;
        let data = await this.getCommandBlog(JSON.stringify(param));
        this._vlWsMap[video].websocket.send(data);
        let _this = this;
        // 视频请求发送成功后，再发送心跳消息
        setTimeout(() => {
            _this.keepAlive(video);
        }, _this._keepAlivePeriod)
    }

    filePlay = async (video,param) => {
            const params = {
                userToken:this._token,
                file_path: param.file_path,
                playseq:param.playseq*1,
                request: 'file_play',
                videoidentify:param.videoidentify,
                rate:param.rate||1
            }
            let data = await this.getCommandBlog(JSON.stringify(params));
            this._vlWsMap[video].websocket.send(data);
            let _this = this;
            // 视频请求发送成功后，再发送心跳消息
            setTimeout(() => {
                _this.keepAlive(video);
            }, _this._keepAlivePeriod)
        }
    /**
     * 发送开始节流
     */
    sendDiscard = async (videoId,playseq) => {
        let param = {
            request: 'discard_data',
            videoidentify: videoId,
            playseq: playseq,
            userToken: this._token
        }
        let data = await this.getCommandBlog(JSON.stringify(param));
        this._vlWsMap[videoId].websocket.send(data);
    }

    /**
     * 创建websocket连接,发送消息
     */
    createWs(video, playseq, pubsub,callback) {
        if (!video) {
            return;
        }

        let vlWs = new WebSocket(this._videoLiveWsUrl);
        this._vlWsMap[video] = { websocket: vlWs };

        let _this = this;
        _this._vlWsMap[video].websocket.onopen = function () {
            console.log("已连接websocket");
            // 发送请求消息
            if (_this._mediaSource[video].isPlayBack!==null) {
                    _this.playback(video, playseq,_this._mediaSource[video].isPlayBack);
                    _this._mediaSource[video].playType = 'playback'
                }else if(_this._mediaSource[video].filePlay!==null){
                    _this.filePlay(video,_this._mediaSource[video].filePlay)
                    _this._mediaSource[video].playType = 'filePlay'
                }else{
                _this.sendMessage(video, playseq);
                _this._mediaSource[video].playType = 'playLive'

            }
            pubsub.publish('audioWsOpen', "已连接音频采集服务");
        }
        _this._vlWsMap[video].websocket.onclose = function (error) {
            console.log("websocket连接已断开");
            console.log(error);
            let msg;
            if (!error.wasClean) {
                msg = {
                    type: 'closeChange',
                    data: 'websocket连接已断开'
                }
            } else {
                msg = {
                    type: 'close',
                    data: 'websocket连接已断开'
                }
            }
            pubsub.publish('audioWsClose', "音频采集服务连接关闭")
            callback(msg)
            // _this.closeVideo(video)
        }
        _this._vlWsMap[video].websocket.onerror = function () {

            console.log("连接websocket出错");
            let msg = {
                type: 'closeChange',
                data: '连接websocket出错'
            }
            pubsub.publish('audioWsError', msg)

            callback(msg)
        }
        _this._vlWsMap[video].websocket.binaryType = 'arraybuffer';

        _this._vlWsMap[video].websocket.onmessage = function (e) {
            if (e.data) {
                pubsub.publish('audioWsMessage', e.data);
                callback(e.data);
            }
        }
    }

    //判断当前video是否已经存在
    isVideoExist = (video) => {
        if (this._mediaSource[video]) { return true }
        return false;
    }

    /**
     * 检测是否支持
     */
    checkIsSupport = (video) => {
        // 判断MediaSource是否存在
        // let mimeCodec = 'video/mp4; codecs="hvc1.1.2.L93.B0, mp4a.40.2"';
        if ('MediaSource' in window && MediaSource.isTypeSupported(this.#mimeCodec[video])) {
            return true;
        } else {
            // console.error('Unsupported MIME type or codec: ', mimeCodec);
            return false;
        }
    }
    /**
     * 多帧拼接
     */
    concatenate = (arrays) => {
        let totalLen = 0;
        for (let arr of arrays)
            totalLen += arr.byteLength;
        let res = new Uint8Array(totalLen);
        let offset = 0;
        for (let arr of arrays) {
            let uint8Arr = new Uint8Array(arr);
            res.set(uint8Arr, offset);
            offset += arr.byteLength;
        }
        return res.buffer;
    }

    sourceOpen = (video, playseq, element,pubsub, cb,) => {
        // 视频源缓存器
        let count = 0;
        let videoLoadingTmie = 0;
        let writeflag = 1;
        let videofifo = [];  // 视频流数组
        // let videofifos = []; 
        let sourceBuffer;
        
        let _this = this;
        _this.createWs(video, playseq,pubsub, (data)=> {
            if (_this.isStream(data)) { //流消息                    
                let buf = data.slice(8);
                videofifo.push(buf);
                // videofifos.push(buf);
                if ((writeflag == 1) && (videofifo.length >= 10)) {
                    // 如果 videofifo 数组中有足够的数据，将视频数据合并为一个 Buffer，并添加到 SourceBuffer 中，同时将 videofifo 数组清空。
                    writeflag = 0;
                    //sourceBuffer.appendBuffer(buf);
                    let videobuf = _this.concatenate(videofifo);
                    if (sourceBuffer) {
                        sourceBuffer.appendBuffer(videobuf);
                        videofifo = [];
                    }
                } 
                // if(videofifos.length >= 500){
                //     const blob = new Blob(videofifos, { type: 'video/mp4' });

                //     // 创建下载链接
                //     const downloadLink = document.createElement('a');
                //     downloadLink.href = URL.createObjectURL(blob);
                //     downloadLink.download = 'video.mp4';

                //     // 点击下载链接以下载MP4文件
                //     downloadLink.click();
                //     videofifos=[]
                //     // console.log("write ,fifo");
                // }
            } else {  //字符串消息
                if (data && ['text','close','closeChange'].includes(data.type)) {
                    cb(data)
                }  else{
                    let msg = _this.decodeByte(data.slice(8));
                    if (msg) {
                        if (msg &&msg.event == 'send_audio') {
                            this._mediaSource[video].pubsub.publish('sendAudio', msg);
                        }
                        if (msg &&msg.event == 'unsend_audio') {
                            this._mediaSource[video].pubsub.publish('unsend_audio', msg);
                        }
                        if (msg &&msg.event == 'stream_type_notify') {
                            this.initConstCode(msg.stream_type == 1,msg.videoidentify)
                            // this.initConstCode(true,msg.videoidentify)

                                if (this._mediaSource[msg.videoidentify].playType =='filePlay') {
                                    // 录音文件自动放音
                                    this.openAudio(video,playseq)
                                }

                            sourceBuffer = this._mediaSource[msg.videoidentify].addSourceBuffer(this.#mimeCodec[msg.videoidentify]);
                            // 监听当 SourceBuffer 更新结束后，播放视频。 创建 WebSocket 连接，用于接收视频流数据。
                            sourceBuffer.addEventListener('updateend',  (_)=> {
                                if (count == 1) {
                                    console.log("sourceBuffer ,updateend ");
                                    element.play();
                                }
                                count++;
                                writeflag = 1;
                            if (this._mediaSource[msg.videoidentify].playType =='playLive') {
                                let buffered = sourceBuffer.buffered;
                                let currentTime = element.currentTime;
                                let currentBuffered = 0;
                                
                                for (let i = 0; i < buffered.length; i++) {
                                    if (buffered.start(i) <= currentTime && buffered.end(i) >= currentTime) {
                                        currentBuffered = buffered.end(i) - currentTime;
                                        break;
                                    }
                                }
                                if (currentBuffered > 4) {
                                    this.sendDiscard(video,playseq)
                                }
                                if (element.readyState >= 1&&element.readyState != 4) {
                                    videoLoadingTmie++
                                } 
                                if (videoLoadingTmie>50) {
                                    element.currentTime = element.currentTime+currentBuffered
                                    element.play();
                                    videoLoadingTmie = 0
                                }
}
                                });
                                // 监听MediaSource的状态变化
                                this._mediaSource[video].addEventListener('sourceended', function() {
                                    console.log('MediaSource已结束');
                                });
                                
                                this._mediaSource[video].addEventListener('sourceclose', function(e) {
                                    console.log('MediaSource已关闭');
                                    console.log(e);
                                });
                                this._mediaSource[video].addEventListener('error', function(e) {
                                    console.error('发生错误：', e);
                            });
                        }else{
                            if (msg && ['ptz','av_playback','change_resolution','change_videosource','resolution_videosource_notify','ser_reopen_video','ser_notify_notice','start_av_record','stop_av_record','notify_totaltime','notify_seektime'].includes(msg.event)){
                                const typeName={
                                    change_resolution:'分辨率变更',
                                    change_videosource:'摄像头切换成功',
                                    ptz:'云台控制',
                                    av_playback:'回放控制',
                                    resolution_videosource_notify:'分辨率变更通知',
                                    ser_reopen_video:'重新选择编码格式',
                                    ser_notify_notice:'通知视频流断开',
                                    notify_totaltime:'文件总时长',
                                    notify_seektime:  '跳转到某时间'
                                }
                                let msgs = {
                                    type: msg.event,
                                    data: typeName[msg.event]||msg.event,
                                    info: msg
                                }
                                cb(msgs)
                                return
                            }else if (msg?.event ==='play_audio'||!msg?.event) {
                                return
                            }else{
                                cb(msg);
                            }
                        }
                        
                    }
                }
            }
        })
    }
    /**
     * websocket发来的二进制解析为JSON字符串
     */
    decodeByte = (msg) => {
        if (msg) {
            return JSON.parse(new TextDecoder("utf-8").decode(new Uint8Array(msg)))
        } else {
            return ''
        }
    }
    /**
     * 判断返回的数据是否为音视频流
     */
    isStream = (data) => {
        if (data && (data.type == 'text' || data.type == 'close'||data.type == 'closeChange')) {   //普通文字消息
            return false
        } else {
            let symboleBuf = data.slice(2, 3);   //标志位
            let symbole = (Array.prototype.slice.call(new Uint8Array(symboleBuf))).join(",");
            if (symbole && symbole != 1) {  //流   (01H是字符串)
                return true
            } else {
                return false    //字符串   (01H)
            }
        }
    }
    /**
     * 对外提供的播放方法
     * @param {*} video 设备ID
     * @param {*} playseq 位置
     * @param {*} element 对应的videoDom元素
     */
    playVideo = (video, playseq, element, opts,isPlayBack, filePlay,callback) => {
        // 通过 MediaSource 播放视频流的功能，支持播放成功或失败的回调处理
         // 创建一个订阅对象
        let pubsub = new PubSub();
        // this.initConstCode(opts.videoCodeType == 1,video)
        // if (this.checkIsSupport(video)) {
            let mediaSource = new MediaSource;
            if (this._mediaSource[video]) {
                this._mediaSource[video] = null;
                this._mediaSource[video].pubsub = null;
            }
            this._mediaSource[video] = mediaSource;
            this._mediaSource[video].isPlayBack = isPlayBack;
            this._mediaSource[video].filePlay = filePlay;
            this._mediaSource[video].pubsub = pubsub;
            this.bindAudio(video)
            element.src = null;
            element.srcObject = null
            element.src = URL.createObjectURL(this._mediaSource[video]);
            // 将 URL 对象转换为 DOMString指定媒体文件的 URL
            this._mediaSource[video].addEventListener('sourceopen', () => {
                // 当视频源准备好时，调用 sourceOpen 函数，开始播放视频。
                this.sourceOpen(video, playseq, element, pubsub, (msg) => {
                    callback && callback(msg, pubsub);
                    // if (msg && msg.error_code == 0) {
                    // } else if (msg && (msg.type == 'text' || msg.type == 'close' || msg.type == 'closeChange')) {
                    //     callback && callback(msg, pubsub);
                    // } else {
                    //     callback && callback(msg);
                    // }
                });
            });
        // } else {
        //     let msg = '当前浏览器不支持'
        //     callback(msg);
        // }
    }

    bindAudio = (id) => {
        this._mediaSource[id].pubsub.subscribe('sendAudio', (data) => {
                this.startRecorder(id);
        })
        this._mediaSource[id].pubsub.subscribe('unsend_audio', (data) => {
            if (this.#recorder == null) {
                return;
            }
            clearInterval(this.#recorderIndex);
            console.log("停止发送音频流！")
            this.#recorder.stop()
            this.#recorder = null;
        })
    }

    msgSend= async(message)=> {
        message.userToken = this._token;
        let data = await this.getCommandBlog(JSON.stringify(message));
        this._vlWsMap[message.videoidentify].websocket.send(data);
    }
    /**
     * 对外提供的关闭方法
     * @param {*} video 设备ID
     */
    closeVideo = (video) => {
        if (this._vlWsMap[video] != null) {
            this._vlWsMap[video].websocket.close();   //断开连接
            this._vlWsMap[video] = null;
        }
        if (this._mediaSource[video] != null) {
            this._mediaSource[video].pubsub.unsubscribeAll('sendAudio');
            this._mediaSource[video].pubsub.unsubscribeAll('unsend_audio');
            this._mediaSource[video] = null;
        }
        // 清除心跳
        if (this._wsKeepaliveMap[video] && this._wsKeepaliveMap[video] != null) {
            clearTimeout(this._wsKeepaliveMap[video])
            this._wsKeepaliveMap[video] = null;
        }
    }
    /**
     * 获取拾音器
     * @param {*} callback
     * @param {*} config
     */
    getAudioRecorder=(callback, config)=>{
        if (callback) {
            if (navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia(
                    {audio: {
                        sampleRate: 8000
                      }}).then((stream)=>{
                        var recorder = new AudioRecorder(stream, config);
                            callback(recorder);
                    }).catch((error)=>{
                        switch (error.code || error.name) {
                            case 'PERMISSION_DENIED':
                            case 'PermissionDeniedError':
                                console.error("用户拒绝提供信息。");
                                break;
                            case 'NOT_SUPPORTED_ERROR':
                            case 'NotSupportedError':
                                console.error("浏览器不支持硬件设备。");
                                break;
                            case 'MANDATORY_UNSATISFIED_ERROR':
                            case 'MandatoryUnsatisfiedError':
                                console.error("无法发现指定的硬件设备。");
                                break;
                            default:
                                console.error("无法打开麦克风。异常信息: " + (error.code || error.name));
                                break;
                        }
                    });
            } else {
                console.error("当前浏览器不支持录音功能");
            }
        }
    }

    /**
         * 开启拾音
         */
    startRecorder (videoId) {
        var _self = this;
        _self.getAudioRecorder(function(recorder) {
            _self.#recorder = recorder;
            _self.#recorder.start();
            _self.#recorderIndex = setInterval(function() {
                if (!_self.#recorder?.exportWAV||!_self._vlWsMap[videoId]?.websocket) {
                    clearInterval(_self.#recorderIndex)
                }
                _self.#recorder.exportWAV(function(blob) {
                    if(_self._vlWsMap[videoId].websocket.readyState == 1){
                        _self._vlWsMap[videoId].websocket.send(blob);
                    }
                });
            }, 20)
            // var getexportWAV = ()=>{
            //     if (!_self._vlWsMap[videoId].websocket) {
            //         return
            //     }
            //     _self.#recorder.exportWAV((blob)=> {
            //         if(_self._vlWsMap[videoId].websocket.readyState == 1){
            //             _self._vlWsMap[videoId].websocket.send(blob);
            //         }
            //     });
            //     setTimeout(()=>{
            //         getexportWAV()
            //     },100)
            // }
            // console.log("开始发送音频流！8000")
            // if ('requestIdleCallback' in window) {
            //     requestIdleCallback(()=>{
            //         getexportWAV()
            //     },300);
            //   } else {
            //     _self.#recorderIndex = setInterval(function() {
            //         if (!_self.#recorder.exportWAV) {
            //             clearInterval(_self.#recorderIndex)
            //         }
            //         _self.#recorder.exportWAV(function(blob) {
            //             if(_self._vlWsMap[videoId].websocket.readyState == 1){
            //                 _self._vlWsMap[videoId].websocket.send(blob);
            //             }
            //         });
            //     }, 100)
            //   }
            
        })
    }

    /**
     * 停止拾音
     */
    stopRecorder (id,index) {
        this.operateAudio('unsend_audio',id,index)
    }
    
    /**
     * 对外提供的打开音频的方法
     */
    openAudio = async (video, playseq) => {
        if (this.checkIsSupport(video)) {
            // 支持H265的浏览器
            let param = {
                // play_audio
                request: 'play_audio',
                // request: 'recv_audio',
                videoidentify: video,
                playseq: playseq,
                userToken: this._token
            }
            let data = await this.getCommandBlog(JSON.stringify(param));
            if (this._vlWsMap[video] != null) {
                this._vlWsMap[video].websocket.send(data);
            }
        }
    }
    /**
     * 对外提供的关闭音频的方法
     */
    stopAudio = async (video, playseq) => {
        if (this.checkIsSupport(video)) {
            // 支持H265的浏览器
            let param = {
                request: 'stop_audio',
                videoidentify: video,
                playseq: playseq,
                userToken: this._token
            }
            let data = await this.getCommandBlog(JSON.stringify(param));
            if (this._vlWsMap[video] != null) {
                this._vlWsMap[video].websocket.send(data);
            }
        }
    }
    /**
     * 音频流相关操作
     * requstType: send_audio unsend_audio
     */
    operateAudio = (requestType,videoId,playseqId) => {
        var params = {
            request: requestType,
            videoidentify: videoId,
            playseq: playseqId,
            userToken: this._token
        };
        this.getCommandBlog(JSON.stringify(params)).then((data)=>{
            this._vlWsMap[videoId].websocket.send(data);
            if (requestType==='unsend_audio') {
                if (this.#recorder == null) {
                    return;
                }
                clearInterval(this.#recorderIndex);
                console.log("停止发送音频流！")
                this.#recorder.stop()
                this.#recorder = null;
            }
        })
    }

    /**
     * 创建websocket连接,发送消息
     */
    openVcConnect= () => {
        let {pubsub,videoId} = this;
        let vlWs = new WebSocket(this._videoLiveWsUrl);
        this._vlWsMap[videoId] = { websocket: vlWs };
        this._vlWsMap[videoId].websocket.onopen = function(e) {
            console.log(e);
            pubsub.publish('audioWsOpen', "已连接音频采集服务");
        }
        this._vlWsMap[videoId].websocket.onmessage = function(e) {
            pubsub.publish('audioWsMessage', e.data);
        };
        this._vlWsMap[videoId].websocket.onclose = function(){
            pubsub.publish('audioWsClose', "音频采集服务连接关闭")
        }
        this._vlWsMap[videoId].websocket.onerror = function(e){
            console.log(e);
            pubsub.publish('audioWsError', "音频采集服务连接出错")
        }
        this._vlWsMap[videoId].websocket.binaryType = 'arraybuffer';
    }

     /**
     *  对外暴露api 开启语控服务
     */
     startVC =(id,index)=> {
        // if (this.#isWsOpen) {
        //     console.log("ws 已打开！");
        //     return;
        // }
        // this.openVcConnect();
        // send_audio
        this.operateAudio('send_audio',id,index)
    }
    /**
     * 对外暴露api 关闭语控服务
     */
    stopVC=(id,index) => {
        
        // if (!this.#isWsOpen) {
        //     console.log("ws 未打开！");
        //     return;
        // }
        this.stopRecorder(id,index);
        // this.closeVcConnect();
    }
    /**
     *  对外暴露api 
     */
    startAudio =(id,index)=> {
        // if (this.#isWsOpen) {
        //     console.log("ws 已打开！");
        //     return;
        // }
        // this.openVcConnect();
        this.operateAudio('play_audio',id,index)
    }
    /**
     *  对外暴露api 
     */
    closeAudio =(id,index)=> {
        // if (this.#isWsOpen) {
        //     console.log("ws 已打开！");
        //     return;
        // }
        // this.openVcConnect();
        this.operateAudio('stop_audio',id,index)
    }
    /**
         * 关闭语控连接
         */
    closeVcConnect () {
        const {videoId} = this;
        this._vlWsMap[videoId].close()
        this._vlWsMap[videoId] = null;
    }
    
    initConstCode = (el,video) => {
        this.#mimeCodec[video] = el?'video/mp4; codecs="hvc1.1.2.L93.B0, mp4a.40.2"':'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
        // this.#mimeCodec[video] = 'video/mp4; codecs="avc1.64001E, hev1"';
    }
}
// 发布订阅
class PubSub {
    constructor() {
        // 事件中心
        // 存储格式:[]
        // 每种事件(任务)下存放其订阅者的回调函数
        this.events = {}
    }
    // 订阅方法
    subscribe(type, cb) {
        if (!this.events[type]) {
            this.events[type] = [];
        }
        this.events[type].push(cb);
    }
    // 发布方法
    publish(type, ...args) {
        if (this.events[type]) {
            this.events[type].forEach(cb => cb(...args))
        }
    }
    // 取消订阅方法
    unsubscribe(type, cb) {
        if (this.events[type]) {
            const cbIndex = this.events[type].findIndex(e=> e === cb)
            if (cbIndex != -1) {
                this.events[type].splice(cbIndex, 1);
            }
        }
        if (this.events[type].length === 0) {
            delete this.events[type];
        }
    }
    unsubscribeAll(type) {
        if (this.events[type]) {
            delete this.events[type];
        }
    }
}

/**
 * 拾音器
 */
class AudioRecorder {
    constructor(stream, config) {
        var _self = this;
        _self.config = config || {};
        _self.config.sampleBits = _self.config.sampleBits || 16;      // 采样数位 8, 16
        _self.config.sampleRate = 44100;   // 采样率(16000// 44100)
        // _self.context = new (window.webkitAudioContext || window.AudioContext)();
        // _self.audioInput = _self.context.createMediaStreamSource(stream);
        // _self.createScript = _self.context.createScriptProcessor || _self.context.createJavaScriptNode;
        // _self.recorder = _self.createScript.apply(_self.context, [4096, 1, 1]);
        
        let audioContext = window.AudioContext || window.webkitAudioContext
        _self.context = new audioContext()
        // const biquadFilter = _self.context.createBiquadFilter();
        // biquadFilter.type = "lowpass";
        // biquadFilter.frequency.value = 8000;
        // 创建 DelayNode 节点
        const delayNode = _self.context.createDelay();
        delayNode.delayTime.value = 0.5;
        
        let volume = _self.context.createGain() //设置音量节点
        volume.gain.value = 0.5
        
        // const convolver = _self.context.createConvolver();

        // 加载混响音频文件
        // const impulseResponseUrl = 'path/to/impulse-response.wav';
        // fetch(impulseResponseUrl)
        // .then(response => response.arrayBuffer())
        // .then(buffer => audioContext.decodeAudioData(buffer))
        // .then(audioBuffer => convolver.buffer = audioBuffer);
        _self.audioInput = _self.context.createMediaStreamSource(stream) //将声音输入这个对像
        _self.audioInput.connect(delayNode);
        _self.audioInput.connect(volume)
        // volume.connect(_self.audioInput.destination);
        // _self.audioInput.connect(biquadFilter);
        // 将 biquadFilter 连接到 AudioContext 的输出
        // biquadFilter.connect(_self.context.destination);
        _self.recorder = _self.context.createScriptProcessor(512, 2, 1)

        // _self.audioInput.connect(_self.recorder);
        // _self.recorder.connect(_self.context.destination)
        // this.analyserNode = _self.context.createAnalyser();
        // this.analyserNode.fftSize = 4096;
        // _self.audioInput.connect(this.analyserNode);
        // this.analyserNode.connect(_self.context.destination)

        _self.audioData = new AudioData({
            inputSampleRate: _self.config.sampleRate,
            outputSampleRate: _self.config.sampleRate,
            oututSampleBits: _self.config.sampleBits
        });

        // 音频采集
        _self.recorder.onaudioprocess =  (event)=> {
            // const inputBuffer = event.inputBuffer;
            // const outputBuffer = event.outputBuffer;
            // const inputData = inputBuffer.getChannelData(0);
            // const outputData = outputBuffer.getChannelData(0);
            // // 实现降噪算法
            // for (let i = 0; i < inputBuffer.length; i++) {
            //     if (inputData[i] > 0.1) {
            //       outputData[i] = inputData[i];
            //     } else {
            //       outputData[i] = 0;
            //     }
            //   }
            _self.audioData.input(event.inputBuffer.getChannelData(0));
        }
    }
    /**
     * 开始录音
     */
    start () {
        this.audioInput.connect(this.recorder);
        this.recorder.connect(this.context.destination);
    }

    /**
     * 停止录音
     */
    stop () {
        this.recorder.disconnect();
    }

    /**
     * 获取音频包
     * @param {*} callback
     */
    exportWAV (callback) {
        if (callback) {
            var blob = this.audioData.encodeWAV();
            if (blob != null) {
                this.audioData.clear();
                callback(blob);
            }
        }
    }

}

/**
 * 音频数据
 */
class AudioData {
    constructor(config)  {
        this.size = 0;   // 录音文件长度
        this.buffer = []; // 录音缓存
        this.inputSampleRate = config.inputSampleRate; // 输入采样率
        this.inputSampleBits = 16; // 输入采样数位 8, 16
        this.outputSampleRate = config.outputSampleRate;   // 输出采样率
        this.oututSampleBits = config.oututSampleBits;   // 输出采样数位 8, 16
    }

    input(data) {
        this.buffer.push(new Float32Array(data));
        this.size += data.length;
    }

    /**
     * 合并压缩
     */
    compress() {
        // 合并
        var data = new Float32Array(this.size);
        var offset = 0;
        for (var i = 0; i < this.buffer.length; i++) {
            data.set(this.buffer[i], offset);
            offset += this.buffer[i].length;
        }
        // 压缩到8000
        // var compression = parseInt(this.inputSampleRate / this.outputSampleRate);
        var compression = parseInt(this.inputSampleRate / 7000);
        var length = data.length / compression;
        // var length = 304;
        var result = new Float32Array(length);
        var index = 0, j = 0;
        while (index < length) {
            result[index] = data[j];
            j += compression;
            index++;
        }
        // const result = this.downsampleBuffer(data,8000)
        return result;
    }

    //  downsampleBuffer(buffer, rate) {
    //     if (rate == 44100) {
    //       return buffer;
    //     }
    //     if (rate > 44100) {
    //       throw "downsampling rate show be smaller than original sample rate";
    //     }
    //     var sampleRateRatio = 44100 / rate;
    //     var newLength = Math.round(buffer.length / sampleRateRatio);
    //     var result = new Int16Array(newLength);
    //     var offsetResult = 0;
    //     var offsetBuffer = 0;
    //     while (offsetResult < result.length) {
    //       var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    //       var accum = 0,
    //         count = 0;
    //       for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
    //         accum += buffer[i];
    //         count++;
    //       }
    //       result[offsetResult] = Math.min(1, accum / count) * 0x7fff;
    //       offsetResult++;
    //       offsetBuffer = nextOffsetBuffer;
    //     }
    //     return result;
    //   }

    clear() {
        this.size = 0;
        this.buffer = [];
    }
    encodeWAV() {
        var sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
        var sampleBits = Math.min(this.inputSampleBits, this.oututSampleBits);
        var bytes = this.compress();

        if (bytes.length == 0) {
            return null;
        }
        var dataLength = bytes.length * (sampleBits / 8);

        var buffer = new ArrayBuffer(8 + dataLength);
        var data = new DataView(buffer);
        var offset = 0;
        // 设置标识内容为音频流的协议头
        data.setInt8(offset, 19);
        offset++;
        data.setInt8(offset, 1);
        offset++;
        data.setInt8(offset, 2);
        offset++;
        data.setInt8(offset, 0);
        offset++;
        // 设置内容长度
        data.setInt32(offset, dataLength);
        offset += 4;
        // 写入采样数据
        // if (sampleBits === 8) {
        //     for (var i = 0; i < bytes.length; i++ , offset++) {
        //         var s = Math.max(-1, Math.min(1, bytes[i]));
        //         var val = s < 0 ? s * 0x8000 : s * 0x7FFF;
        //         val = parseInt(255 / (65535 / (val + 32768)));
        //         data.setInt8(offset, val, true);
        //     }
        // } else {
            for (var i = 0; i < bytes.length; i++ , offset += 2) {
                var s = Math.max(-1, Math.min(1, bytes[i]));
                data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
        // }
        // const url = URL.createObjectURL(new Blob([data]));
        // const link = document.createElement('a');
        // link.href = url;
        // link.download = 'audio.wav'; // 设置下载文件名
        // link.click(); 
        // console.log(data.buffer);
        // const array = Array.from(new Int8Array(data.buffer))
        // return data
        // return new Blob([data], { type: 'audio/wav' });
        return new Blob([data])
    }
}
window.VideoWebCast=VideoWebCast;
export default VideoWebCast;

